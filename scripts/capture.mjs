#!/usr/bin/env node
/**
 * Drives the app in dev over the DevTools protocol and writes the README
 * screenshots and GIF. Nothing is captured from the screen, so this needs no
 * macOS Screen Recording permission and produces identical framing every run.
 *
 *   node scripts/demo-data.mjs                 # fake logs + demo config
 *   node scripts/capture.mjs --seed            # load that config into dev's store
 *   node scripts/capture.mjs --seed --config /Users/Shared/tailspin-demo-config.json
 *   TAILSPIN_CAPTURE=1 npm run dev             # app with a CDP endpoint
 *   node scripts/capture.mjs                   # capture everything
 *   node scripts/capture.mjs --only log-viewer # capture one scene
 *
 * --seed overwrites the *dev* config only (see electron/main/user-data.ts); the
 * installed app's real connections are never touched.
 */
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir, platform } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Cdp, sleep } from "./lib/cdp.mjs";
import { encodeGif } from "./lib/gif.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const mediaDir = join(repoRoot, "docs", "media");
const defaultDemoConfig = join(repoRoot, "demo", "tailspin-demo-config.json");

const args = process.argv.slice(2);
const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;
const demoConfig = args.includes("--config") ? resolve(args[args.indexOf("--config") + 1]) : defaultDemoConfig;
const port = Number(process.env.TAILSPIN_CAPTURE_PORT ?? 9222);

/** Where electron-store writes in dev — mirrors electron/main/user-data.ts. */
function devUserDataDir() {
  const name = "Tailspin (dev)";
  if (platform() === "darwin") return join(homedir(), "Library", "Application Support", name);
  if (platform() === "win32") return join(process.env.APPDATA ?? join(homedir(), "AppData", "Roaming"), name);
  return join(process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config"), name);
}

if (args.includes("--seed")) {
  if (!existsSync(demoConfig)) {
    console.error("No demo config found — run: node scripts/demo-data.mjs");
    process.exit(1);
  }
  const target = devUserDataDir();
  mkdirSync(target, { recursive: true });
  copyFileSync(demoConfig, join(target, "config.json"));
  console.log(`Seeded ${join(target, "config.json")}`);
  if (!only) process.exit(0);
}

const cdp = await Cdp.attach({ port });
await cdp.send("Page.enable");
await cdp.send("Runtime.enable");
// Chromium throttles animation frames in unfocused windows, which leaves Vue's
// page transitions half-finished in captures.
await cdp.send("Page.bringToFront");
// Clear anything a previous session left behind: a stale device-metrics
// override silently shifts where clicks land.
await cdp.send("Emulation.clearDeviceMetricsOverride").catch(() => {});
await cdp.disableAnimations();

mkdirSync(mediaDir, { recursive: true });

async function shot(name) {
  await sleep(400);
  const png = await cdp.screenshot({ density: 2 });
  writeFileSync(join(mediaDir, `${name}.png`), png);
  console.log(`  → docs/media/${name}.png`);
}

/** Captures frames at `fps` while `steps` runs, then encodes a GIF. */
async function record(name, steps, { fps = 10, maxWidth = 1000 } = {}) {
  await sleep(400);

  const frames = [];
  let recording = true;
  const loop = (async () => {
    while (recording) {
      frames.push(await cdp.screenshot({ density: 1 }));
      await sleep(1000 / fps);
    }
  })();

  await steps();
  recording = false;
  await loop;

  writeFileSync(join(mediaDir, `${name}.gif`), encodeGif(frames, { fps, maxWidth }));
  console.log(`  → docs/media/${name}.gif (${frames.length} frames)`);
}

/** Resets to a known state. The app keeps page state in pinia (no router), so
 * a reload is the only reliable way to clear open tabs, filters and theme. */
async function reset() {
  await cdp.send("Page.reload");
  await sleep(2200);
  await cdp.disableAnimations();
  await cdp.setTheme("dark");
  await cdp.waitFor(() => cdp.centreOfText("Connections"), { what: "connections page" });
}

function write(name, buffer) {
  writeFileSync(join(mediaDir, name), buffer);
  console.log(`  → docs/media/${name}`);
}

const scenes = {};

// Scene definitions live in a separate module so tweaking the storyboard
// doesn't mean touching the capture plumbing.
const { defineScenes } = await import("./scenes.mjs");
defineScenes({ scenes, cdp, shot, record, reset, sleep, write });

const names = only ? [only] : Object.keys(scenes);
for (const name of names) {
  if (!scenes[name]) throw new Error(`Unknown scene "${name}". Known: ${Object.keys(scenes).join(", ")}`);
  console.log(`▶ ${name}`);
  await reset();
  await scenes[name]();
}

cdp.close();
console.log("Done.");
process.exit(0);
