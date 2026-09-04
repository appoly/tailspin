import { ipcMain, dialog, safeStorage, app, shell } from "electron";
import * as fs from "fs";
import * as path from "path";
import * as zlib from "zlib";
import type { LocalLogRead, LocalLogTailRead, LogFile } from "../../../shared/interfaces";

// Mirrors src/constants/Ssh.ts, same as the SSH handler does.
const MaxFileSizeToLoadBytes = 1024 * 250 * 1024;
const MaxCompressedUncompressedBytes = 512 * 1024 * 1024;

// Editor scratch files live alongside logs and are never worth listing.
const IgnoredSuffixes = [".swp", ".swo", ".swn", ".tmp", "~"];

export default () => {
  ipcMain.handle("open-file-dialog", (event, options) => {
    return dialog.showOpenDialog(options);
  });
  ipcMain.handle("read-file-from-path", (event, path) => {
    return fs.readFileSync(path, "utf-8");
  });
  ipcMain.handle("read-log-file-from-path", (event, filePath: string, maxBytes: number) => {
    return readLogFile(filePath, maxBytes);
  });
  ipcMain.handle("read-log-file-from-offset", (event, filePath: string, offset: number) => {
    return readLogFileFromOffset(filePath, offset);
  });
  ipcMain.handle("is-file-or-directory", (event, path) => {
    if (!fs.existsSync) {
      return null;
    }
    return fs.lstatSync(path).isDirectory() ? "directory" : "file";
  });
  ipcMain.handle("get-files-in-directory", (event, directory: string) => {
    return listLogFiles(directory);
  });
  ipcMain.handle("encrypt-string", (event, string) => {
    return safeStorage.encryptString(string).toString("base64");
  });
  ipcMain.handle("can-use-safe-storage", (event) => {
    return safeStorage.isEncryptionAvailable();
  });
  ipcMain.handle("open-folder-to-file", (event, fileName) => {
    let path = app.getPath("downloads") + "/" + fileName;
    return shell.showItemInFolder(path);
  });
  ipcMain.handle("open-downloads-folder", (event) => {
    return shell.openPath(app.getPath("downloads"));
  });
  ipcMain.handle("open-folder-from-path", (event, path) => {
    return shell.openPath(path);
  });
};

/** "*.log*", so rotated and gzipped logs count, minus the obvious scratch files. */
function isLogFileName(name: string): boolean {
  if (name.startsWith(".") || !name.includes(".log")) {
    return false;
  }
  return !IgnoredSuffixes.some((suffix) => name.endsWith(suffix));
}

function listLogFiles(directory: string): LogFile[] {
  const files: LogFile[] = [];

  for (const name of fs.readdirSync(directory)) {
    if (!isLogFileName(name)) {
      continue;
    }
    const fullPath = path.join(directory, name);
    try {
      const stats = fs.statSync(fullPath);
      if (!stats.isFile()) {
        continue;
      }
      files.push({
        name,
        path: fullPath,
        size: stats.size,
        modified: Math.floor(stats.mtimeMs / 1000),
        compressed: name.toLowerCase().endsWith(".gz"),
      });
    } catch {
      // A broken symlink or a file rotated out from under us; skip it.
    }
  }

  return files.sort((a, b) => b.modified - a.modified);
}

/**
 * The gzip trailer carries the uncompressed size in its last four bytes. It is
 * modulo 2^32 and only describes the final member, so treat it as a hint good
 * enough to refuse on, not as a number to trust while decompressing.
 */
function gzipUncompressedSize(filePath: string): number {
  const { size } = fs.statSync(filePath);
  if (size < 4) {
    return 0;
  }
  const trailer = Buffer.alloc(4);
  const fd = fs.openSync(filePath, "r");
  try {
    fs.readSync(fd, trailer, 0, 4, size - 4);
  } finally {
    fs.closeSync(fd);
  }
  return trailer.readUInt32LE(0);
}

/**
 * Stream the file through gunzip keeping only the last `budget` bytes, and stop
 * dead if it expands past `limit`. Bounded memory whatever the trailer claimed.
 */
function readGzipTail(
  filePath: string,
  budget: number,
  limit: number
): Promise<{ content: string; expanded: number; hitLimit: boolean }> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let held = 0;
    let expanded = 0;
    let hitLimit = false;

    const source = fs.createReadStream(filePath);
    const gunzip = zlib.createGunzip();
    const stream = source.pipe(gunzip);

    const finish = () => {
      const content = Buffer.concat(chunks);
      const tail = budget > 0 && content.length > budget ? content.subarray(content.length - budget) : content;
      resolve({ content: tail.toString("utf-8"), expanded, hitLimit });
    };

    stream.on("data", (chunk: Buffer) => {
      expanded += chunk.length;
      if (expanded > limit) {
        hitLimit = true;
        source.destroy();
        gunzip.destroy();
        finish();
        return;
      }
      chunks.push(chunk);
      held += chunk.length;
      // Drop whole chunks off the front once they can no longer be part of the tail.
      while (budget > 0 && chunks.length > 1 && held - chunks[0].length >= budget) {
        held -= chunks.shift()!.length;
      }
    });
    stream.on("error", (err) => (hitLimit ? finish() : reject(err)));
    stream.on("end", finish);
  });
}

/** Read the last `budget` bytes of a file without pulling the whole thing into memory. */
function readTail(filePath: string, size: number, budget: number): string {
  if (budget === 0 || size <= budget) {
    return fs.readFileSync(filePath, "utf-8");
  }
  const buffer = Buffer.alloc(budget);
  const fd = fs.openSync(filePath, "r");
  try {
    fs.readSync(fd, buffer, 0, budget, size - budget);
  } finally {
    fs.closeSync(fd);
  }
  return buffer.toString("utf-8");
}

/**
 * Everything appended since `offset`, plus the size it was read at. Only the
 * delta is ever buffered, so an auto-fetch tick on a gigabyte log costs the few
 * lines that arrived rather than a re-read. A file shorter than the offset was
 * truncated or rotated: report the size and let the renderer start over.
 */
function readLogFileFromOffset(filePath: string, offset: number): LocalLogTailRead {
  try {
    const { size } = fs.statSync(filePath);
    const from = Math.max(0, Math.floor(offset) || 0);

    if (size <= from) {
      return { success: true, content: "", fileSize: size };
    }

    // A delta this large means the log was rewritten rather than appended to;
    // keep the tail so the read stays bounded either way.
    const delta = size - from;
    const length = Math.min(delta, MaxFileSizeToLoadBytes);
    const start = size - length;

    const buffer = Buffer.alloc(length);
    const fd = fs.openSync(filePath, "r");
    try {
      const read = fs.readSync(fd, buffer, 0, length, start);
      return { success: true, content: buffer.subarray(0, read).toString("utf-8"), fileSize: size };
    } finally {
      fs.closeSync(fd);
    }
  } catch (err: any) {
    return {
      success: false,
      message: typeof err === "string" ? err : err?.message ?? "Could not read the file",
      content: "",
      fileSize: 0,
    };
  }
}

async function readLogFile(filePath: string, maxBytes: number): Promise<LocalLogRead> {
  const budget = Number.isFinite(maxBytes) && maxBytes > 0 ? Math.floor(maxBytes) : 0;
  const compressed = filePath.toLowerCase().endsWith(".gz");

  try {
    // With no budget, fall back to the largest read the app considers sane.
    const cap = budget > 0 ? budget : MaxFileSizeToLoadBytes;

    if (!compressed) {
      const { size } = fs.statSync(filePath);
      // Plain files still load whole, as they always have, unless they are past
      // the point where the renderer could do anything with them anyway.
      const content = size > MaxFileSizeToLoadBytes ? readTail(filePath, size, cap) : readTail(filePath, size, 0);
      return { success: true, content, fileSize: size, compressed: false };
    }

    const claimedSize = gzipUncompressedSize(filePath);
    if (claimedSize > MaxCompressedUncompressedBytes) {
      return {
        success: false,
        message: `This file expands to ${formatBytes(claimedSize)}, too large to open. Decompress it yourself first.`,
        content: "",
        fileSize: claimedSize,
        compressed: true,
      };
    }

    // A gz always gets tailed: a rotated log that expands to a few hundred
    // megabytes would otherwise lock up the renderer for the whole parse.
    const { content, expanded, hitLimit } = await readGzipTail(filePath, cap, MaxCompressedUncompressedBytes);

    if (hitLimit) {
      return {
        success: false,
        message: `This file expands past ${formatBytes(MaxCompressedUncompressedBytes)}. Decompress it yourself first.`,
        content: "",
        fileSize: expanded,
        compressed: true,
      };
    }

    return { success: true, content, fileSize: expanded, compressed: true };
  } catch (err: any) {
    return {
      success: false,
      message: typeof err === "string" ? err : err?.message ?? "Could not read the file",
      content: "",
      fileSize: 0,
      compressed,
    };
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
