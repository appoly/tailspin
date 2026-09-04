#!/usr/bin/env node
/**
 * Generates a self-contained demo dataset: fake Laravel log files plus a
 * Tailspin config that points at them. Import the config from
 * Settings → Backup → Import config to get a screenshot-safe app state with no
 * real hostnames, keys or customer data in it.
 *
 *   node scripts/demo-data.mjs                    # writes ./demo
 *   node scripts/demo-data.mjs --out /Users/Shared # writes elsewhere
 *
 * Screenshots show the log's full path, so for public captures write the data
 * somewhere without your username in it (e.g. --out /Users/Shared).
 *
 * Output is deterministic, so regenerating gives byte-identical logs.
 */
import { mkdirSync, utimesSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outIndex = process.argv.indexOf("--out");
const outDir = outIndex === -1 ? join(repoRoot, "demo") : resolve(process.argv[outIndex + 1]);
// Mirrors a real Laravel layout so screenshots of the path look authentic.
const appDir = join(outDir, "acme-widgets");
const logsDir = join(appDir, "storage", "logs");

// Deterministic PRNG (mulberry32) so the demo data never churns between runs.
let seed = 0x7a1157;
const rand = () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = (items) => items[Math.floor(rand() * items.length)];

const APP_PATH = "/home/forge/acme-widgets.example";

const stack = (frames) =>
  frames.map((frame, i) => `#${i} ${frame}`).join("\n") + `\n#${frames.length} {main}`;

const trace = (exception, message, frames) =>
  ` {"exception":"[object] (${exception}(code: 0): ${message} at ${frames[0].split("(")[0]})\n[stacktrace]\n${stack(frames)}\n"} `;

const INFO = [
  "User logged in {\"user_id\":4821,\"ip\":\"198.51.100.34\"}",
  "Order placed {\"order_id\":\"ORD-20418\",\"total\":149.99,\"currency\":\"GBP\"}",
  "Invoice emailed {\"invoice\":\"INV-9931\",\"to\":\"ada@example.com\"}",
  "Stripe webhook handled {\"type\":\"payment_intent.succeeded\",\"id\":\"pi_3QeXaMPLe\"}",
  "Nightly stock sync finished {\"skus\":1284,\"duration_ms\":8421}",
  "Cache warmed {\"keys\":312}",
  "Password reset requested {\"email\":\"grace@example.com\"}",
  "Scheduled command ran {\"command\":\"reports:daily\",\"exit\":0}",
  "Search index rebuilt {\"documents\":9042}",
  "Sitemap regenerated {\"urls\":1873}",
];

const DEBUG = [
  "Executed query {\"sql\":\"select * from `products` where `active` = 1 limit 24\",\"time\":3.41}",
  "Cache hit {\"key\":\"products.featured\"}",
  "Queue job dispatched {\"job\":\"App\\\\Jobs\\\\SyncInventory\",\"queue\":\"default\"}",
  "Mailable rendered {\"view\":\"emails.order-shipped\",\"time\":18.2}",
  "Feature flag resolved {\"flag\":\"new-checkout\",\"value\":true}",
];

const WARNING = [
  "Slow query detected {\"sql\":\"select count(*) from `order_items`\",\"time\":2841.7}",
  "Rate limit reached {\"key\":\"api|198.51.100.34\",\"limit\":60}",
  "Deprecated route hit {\"route\":\"/api/v1/orders\",\"successor\":\"/api/v2/orders\"}",
  "Queue backlog growing {\"queue\":\"emails\",\"pending\":842}",
  "Disk usage high {\"mount\":\"/\",\"used_percent\":87}",
  "Retrying failed webhook {\"attempt\":3,\"endpoint\":\"https://hooks.example.com/orders\"}",
];

const ERRORS = [
  () =>
    "SQLSTATE[23000]: Integrity constraint violation: 1062 Duplicate entry 'ada@example.com' for key 'users_email_unique' (Connection: mysql, SQL: insert into `users` (`email`, `name`) values (ada@example.com, Ada Lovelace))" +
    trace("Illuminate\\Database\\QueryException", "SQLSTATE[23000]: Integrity constraint violation", [
      `${APP_PATH}/vendor/laravel/framework/src/Illuminate/Database/Connection.php(825): Illuminate\\Database\\Connection->runQueryCallback()`,
      `${APP_PATH}/app/Http/Controllers/RegisterController.php(48): Illuminate\\Database\\Eloquent\\Model::create()`,
      `${APP_PATH}/vendor/laravel/framework/src/Illuminate/Routing/Controller.php(54): App\\Http\\Controllers\\RegisterController->store()`,
      `${APP_PATH}/public/index.php(51): Illuminate\\Foundation\\Http\\Kernel->handle()`,
    ]),
  () =>
    "Call to a member function format() on null" +
    trace("Error", "Call to a member function format() on null", [
      `${APP_PATH}/app/Support/InvoiceFormatter.php(112): App\\Support\\InvoiceFormatter->dueDate()`,
      `${APP_PATH}/app/Jobs/GenerateInvoice.php(37): App\\Support\\InvoiceFormatter->render()`,
      `${APP_PATH}/vendor/laravel/framework/src/Illuminate/Queue/CallQueuedHandler.php(49): App\\Jobs\\GenerateInvoice->handle()`,
    ]),
  () =>
    "cURL error 28: Operation timed out after 10001 milliseconds with 0 bytes received (see https://curl.haxx.se/libcurl/c/libcurl-errors.html) for https://api.shipping.example/v2/rates" +
    trace("GuzzleHttp\\Exception\\ConnectException", "cURL error 28: Operation timed out", [
      `${APP_PATH}/vendor/guzzlehttp/guzzle/src/Handler/CurlFactory.php(210): GuzzleHttp\\Handler\\CurlFactory::createRejection()`,
      `${APP_PATH}/app/Services/ShippingRates.php(64): GuzzleHttp\\Client->request()`,
      `${APP_PATH}/app/Http/Controllers/CheckoutController.php(91): App\\Services\\ShippingRates->quote()`,
    ]),
  () =>
    "Undefined array key \"variant_id\"" +
    trace("ErrorException", 'Undefined array key "variant_id"', [
      `${APP_PATH}/app/Http/Requests/AddToBasketRequest.php(29): Illuminate\\Foundation\\Bootstrap\\HandleExceptions->handleError()`,
      `${APP_PATH}/app/Http/Controllers/BasketController.php(55): App\\Http\\Requests\\AddToBasketRequest->validated()`,
    ]),
];

const CRITICAL = [
  () =>
    "SQLSTATE[HY000] [2002] Connection refused (Connection: mysql, SQL: select * from `sessions` where `id` = 8oQ1)" +
    trace("Illuminate\\Database\\QueryException", "SQLSTATE[HY000] [2002] Connection refused", [
      `${APP_PATH}/vendor/laravel/framework/src/Illuminate/Database/Connectors/Connector.php(70): PDO->__construct()`,
      `${APP_PATH}/vendor/laravel/framework/src/Illuminate/Session/DatabaseSessionHandler.php(94): Illuminate\\Database\\Connection->select()`,
    ]),
];

const NOTICE = [
  "Maintenance mode disabled",
  "Config cache cleared {\"by\":\"deploy\"}",
  "Horizon supervisor restarted {\"supervisor\":\"supervisor-1\"}",
];

/** Builds a log file as newline-joined Laravel entries starting at `start`. */
function buildLog({ env, start, count, stepSeconds, mix }) {
  const lines = [];
  let time = new Date(start).getTime();

  for (let i = 0; i < count; i++) {
    time += Math.floor((0.4 + rand() * 1.6) * stepSeconds * 1000);
    const stamp = new Date(time).toISOString().replace("T", " ").slice(0, 19);
    const roll = rand();
    let severity, body;
    let cumulative = 0;
    for (const [level, weight] of Object.entries(mix)) {
      cumulative += weight;
      if (roll <= cumulative) {
        severity = level;
        break;
      }
    }
    severity ??= "info";

    switch (severity) {
      case "error":
        body = pick(ERRORS)();
        break;
      case "critical":
        body = pick(CRITICAL)();
        break;
      case "warning":
        body = pick(WARNING);
        break;
      case "debug":
        body = pick(DEBUG);
        break;
      case "notice":
        body = pick(NOTICE);
        break;
      default:
        body = pick(INFO);
    }

    lines.push(`[${stamp}] ${env}.${severity.toUpperCase()}: ${body}`);
  }

  return lines.join("\n") + "\n";
}

const files = {
  "laravel.log": buildLog({
    env: "production",
    start: "2026-08-23T07:12:04Z",
    count: 220,
    stepSeconds: 420,
    mix: { info: 0.42, debug: 0.2, warning: 0.18, error: 0.14, notice: 0.03, critical: 0.03 },
  }),
  "laravel-2026-08-24.log": buildLog({
    env: "staging",
    start: "2026-08-24T06:02:11Z",
    count: 90,
    stepSeconds: 600,
    mix: { info: 0.5, debug: 0.28, warning: 0.14, error: 0.08 },
  }),
  "queue-worker.log": buildLog({
    env: "local",
    start: "2026-08-25T09:00:00Z",
    count: 60,
    stepSeconds: 90,
    mix: { info: 0.46, debug: 0.34, warning: 0.12, error: 0.08 },
  }),
};

// What logrotate leaves behind on a real box: older days gzipped, plus the
// most recent rotation still uncompressed. Same generator, smaller files.
const rotated = {};
for (const day of [18, 19, 20, 21, 22]) {
  rotated[`laravel-2026-08-${day}.log.gz`] = gzipSync(
    buildLog({
      env: "production",
      start: `2026-08-${day}T06:00:00Z`,
      count: 40,
      stepSeconds: 1200,
      mix: { info: 0.5, debug: 0.2, warning: 0.16, error: 0.12, notice: 0.02 },
    })
  );
}
rotated["laravel.log.1"] = buildLog({
  env: "production",
  start: "2026-08-22T00:10:00Z",
  count: 120,
  stepSeconds: 600,
  mix: { info: 0.44, debug: 0.2, warning: 0.18, error: 0.14, notice: 0.02, critical: 0.02 },
});

/** Last timestamp in a log, so the file's mtime matches what it contains. */
function lastEntryTime(contents) {
  if (Buffer.isBuffer(contents)) return null;
  const stamps = [...contents.matchAll(/^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\]/gm)];
  const last = stamps.at(-1)?.[1];
  return last ? new Date(last.replace(" ", "T") + "Z") : null;
}

mkdirSync(logsDir, { recursive: true });
for (const [name, contents] of Object.entries({ ...files, ...rotated })) {
  const target = join(logsDir, name);
  writeFileSync(target, contents);
  // Gzipped files take the day in their name; plain logs take their last entry.
  const fromName = name.match(/(\d{4}-\d{2}-\d{2})/)?.[1];
  const mtime = lastEntryTime(contents) ?? (fromName ? new Date(`${fromName}T23:59:00Z`) : new Date());
  utimesSync(target, mtime, mtime);
}

// Fictional hosts use the RFC 5737 documentation ranges, so nothing here can
// point at a real server even by accident.
const config = {
  app: {
    sshKeyPath: "~/.ssh/id_ed25519",
  },
  forge: {
    servers: [
      { id: 100001, name: "acme-web-eu", ipAddress: "203.0.113.24" },
      { id: 100002, name: "acme-api-eu", ipAddress: "203.0.113.25" },
      { id: 100003, name: "acme-workers", ipAddress: "198.51.100.7" },
    ],
    sites: [
      { id: 200001, name: "acme-widgets.example", username: "forge", serverId: 100001 },
      { id: 200002, name: "shop.acme-widgets.example", username: "forge", serverId: 100001 },
      { id: 200003, name: "api.acme-widgets.example", username: "forge", serverId: 100002 },
      { id: 200004, name: "staging.acme-widgets.example", username: "forge", serverId: 100003 },
    ],
  },
  connections: [
    {
      uid: "demo-production-0001",
      name: "Acme Widgets — Production",
      icon: "rocket",
      iconColor: "#f97316",
      type: "local",
      path: join(logsDir, "laravel.log"),
      isFavorite: true,
    },
    {
      uid: "demo-all-logs-0006",
      name: "Acme Widgets — All logs",
      icon: "folder",
      iconColor: "#fbbf24",
      type: "local",
      path: logsDir,
      isFavorite: true,
    },
    {
      uid: "demo-staging-0002",
      name: "Acme Widgets — Staging",
      icon: "layers",
      iconColor: "#38bdf8",
      type: "local",
      path: join(logsDir, "laravel-2026-08-24.log"),
      isFavorite: true,
    },
    {
      uid: "demo-worker-0003",
      name: "Queue Worker",
      icon: "zap",
      iconColor: "#a78bfa",
      type: "local",
      path: join(logsDir, "queue-worker.log"),
    },
    {
      uid: "demo-remote-web-0004",
      name: "acme-web-eu",
      icon: "server",
      iconColor: "#34d399",
      type: "remote",
      path: `${APP_PATH}/storage/logs`,
      ssh: { host: "203.0.113.24", port: 22, username: "forge", passwordType: "key", password: "" },
    },
    {
      uid: "demo-remote-api-0005",
      name: "acme-api-eu",
      icon: "database",
      iconColor: "#fbbf24",
      type: "remote",
      path: "/home/forge/api.acme-widgets.example/storage/logs",
      ssh: { host: "203.0.113.25", port: 22, username: "forge", passwordType: "key", password: "" },
    },
  ],
};

const configPath = join(outDir, "tailspin-demo-config.json");
writeFileSync(configPath, JSON.stringify(config, null, "\t") + "\n");

console.log(`Sample logs:  ${logsDir}`);
console.log(`Demo config:  ${configPath}`);
console.log("Import it from Settings → Backup → Import config.");
