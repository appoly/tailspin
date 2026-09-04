export const FileSizesInKb = [10, 500, 1024, 1024 * 10, 1024 * 100, 1024 * 200] as const
export const MaxFileSizeToLoadKb = 1024 * 250

// Default tail budget, matching the store default for `ssh.numberOfBytes`.
export const DefaultNumberOfBytes = 500 * 1024

// A gzipped log expands on the server (or in the main process) before we ever see
// a byte of it, so refuse anything whose uncompressed size is silly. Mirrored in
// electron/main/ipc-handlers/ssh.ts and application.ts.
export const MaxCompressedUncompressedBytes = 512 * 1024 * 1024
