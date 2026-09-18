# MCP demo: three prompts against the demo logs

A real, unedited session: Claude Code talking to Tailspin's MCP server over the demo data from
`scripts/demo-data.mjs`, with two connections exposed ("Acme Widgets — Production", a single file,
and "Acme Widgets — All logs", a directory of rotated and gzipped logs). Each tool call the agent made
is shown as it happened, followed by its reply verbatim. Nothing here was typed by a human except the
three prompts.

The point to notice is that the agent never sees a raw log: every call comes back parsed and
filtered, and the full stack trace is fetched only for the one entry that mattered.

## 1. "Which log connections can you see?"

I'll load the tailspin connections tool and query it.

```
▶ list_connections {}
```
<sub>↳ 2 connections</sub>

Two Tailspin connections exposed to MCP:

| ID | Name | Type | Path |
|---|---|---|---|
| `demo-production-0001` | Acme Widgets — Production | local | `/Users/Shared/tailspin-demo/acme-widgets/storage/logs/laravel.log` |
| `demo-all-logs-0006` | Acme Widgets — All logs | local | `/Users/Shared/tailspin-demo/acme-widgets/storage/logs` |

Both are local demo connections. Only connections with "Expose to MCP" ticked in Tailspin show up here, so any others you have configured are hidden from me.

<sub>3 turns, 20s</sub>

## 2. "Show me the errors from Acme Widgets — All logs"

I'll load the log reading tools and pull error entries from that connection.

```
▶ list_log_files {"connection":"demo-all-logs-0006"}
```
<sub>↳ 9 files</sub>

```
▶ read_log {"connection":"demo-all-logs-0006","severity":"error,critical,alert,emergency","limit":50}
```
<sub>↳ 4 of 60 entries matched, 4 returned, 8308 bytes read</sub>

```
▶ read_log {"connection":"demo-all-logs-0006","file":"laravel-2026-08-24.log","severity":"error,critical,alert,emergency","limit":50}
```
<sub>↳ 11 of 90 entries matched, 11 returned, 16853 bytes read</sub>

```
▶ read_log {"connection":"demo-all-logs-0006","file":"laravel.log","severity":"error,critical,alert,emergency","limit":50}
```
<sub>↳ 40 of 220 entries matched, 40 returned, 47404 bytes read</sub>

```
▶ read_log {"connection":"demo-all-logs-0006","file":"laravel.log.1","severity":"error,critical,alert,emergency","limit":50}
```
<sub>↳ 19 of 120 entries matched, 19 returned, 22514 bytes read</sub>

```
▶ read_log {"connection":"demo-all-logs-0006","file":"laravel-2026-08-22.log.gz","severity":"error,critical,alert,emergency","limit":50}
```
<sub>↳ 5 of 40 entries matched, 5 returned, 7044 bytes read</sub>

```
▶ read_log {"connection":"demo-all-logs-0006","file":"laravel-2026-08-21.log.gz","severity":"error,critical,alert,emergency","limit":50}
```
<sub>↳ 3 of 40 entries matched, 3 returned, 5759 bytes read</sub>

```
▶ read_log {"connection":"demo-all-logs-0006","file":"laravel-2026-08-20.log.gz","severity":"error,critical,alert,emergency","limit":50}
```
<sub>↳ 7 of 40 entries matched, 7 returned, 7654 bytes read</sub>

```
▶ read_log {"connection":"demo-all-logs-0006","file":"laravel-2026-08-19.log.gz","severity":"error,critical,alert,emergency","limit":50}
```
<sub>↳ 3 of 40 entries matched, 3 returned, 5957 bytes read</sub>

```
▶ read_log {"connection":"demo-all-logs-0006","file":"laravel-2026-08-18.log.gz","severity":"error,critical,alert,emergency","limit":50}
```
<sub>↳ 4 of 40 entries matched, 4 returned, 6605 bytes read</sub>

All 9 files read. 96 error/critical entries, 18–25 Aug 2026, nothing newer. Only 5 distinct problems, all repeating:

| # | Count | Sev | Error | Where |
|---|---|---|---|---|
| 1 | 28 | ERROR | `Call to a member function format() on null` | `app/Support/InvoiceFormatter.php` |
| 2 | 25 | ERROR | cURL 28 timeout (10s, 0 bytes) hitting `https://api.shipping.example/v2/rates` | Guzzle ConnectException |
| 3 | 17 | ERROR | `Undefined array key "variant_id"` | `app/Http/Requests/AddToBasketRequest.php` |
| 4 | 15 | ERROR | SQLSTATE 23000 duplicate `ada@example.com` on `users_email_unique` | `insert into users` |
| 5 | 11 | **CRITICAL** | SQLSTATE HY000 [2002] MySQL connection refused on `select * from sessions` | production only, 22–24 Aug |

Per file:

| File | Env | Errors |
|---|---|---|
| `queue-worker.log` | local | 4 (one of each of #1–4) |
| `laravel-2026-08-24.log` | staging | 11 |
| `laravel.log` | production | 40 (incl. 10 CRITICAL) |
| `laravel.log.1` | production | 19 (incl. 1 CRITICAL) |
| `laravel-2026-08-22.log.gz` | production | 5 |
| `laravel-2026-08-21.log.gz` | production | 3 |
| `laravel-2026-08-20.log.gz` | production | 7 |
| `laravel-2026-08-19.log.gz` | production | 3 |
| `laravel-2026-08-18.log.gz` | production | 4 |

Observations:
- **#5 is the only CRITICAL** and clusters in prod 22–24 Aug, roughly every 1–3h. Session lookups failing means users get logged out. DB flapping or connection-pool exhaustion, not an app bug.
- **#1 and #3 are plain code bugs.** Null date on invoice, missing request validation for `variant_id`. Both present every day in the range.
- **#4 looks like a seeder/test** (Ada Lovelace, example.com) running against real DBs, incl. production. Worth checking what's inserting it.
- **#2** consistent 10s timeout to shipping API. Either the vendor is slow or the timeout needs a retry/circuit breaker.

Messages are truncated. Say which one and I'll pull the full stack trace.

<sub>12 turns, 51s</sub>

## 3. "I think we had an outage around 11:20 on 24 August, can you check the production logs?"

Pulling everything (all severities) from the production log between 10:45 and 11:45 on 24 Aug, plus the full text of the CRITICAL entry at 11:23:57.

```
▶ read_log {"connection":"demo-all-logs-0006","file":"laravel.log","since":"2026-08-24T10:45:00","until":"2026-08-24T11:45:00","limit":200}
```
<sub>↳ 8 of 220 entries matched, 8 returned, 47404 bytes read</sub>

```
▶ get_log_entry {"read_id":"Ojw2t2sg","entry_id":17}
```
<sub>↳ full entry, 650 chars</sub>

Log activity 10:45–11:45, 24 Aug, production (`laravel.log`):

| Time | Sev | Entry |
|---|---|---|
| 10:45:39 | ERROR | cURL 28 shipping API timeout (recurring, unrelated) |
| 10:59:25 | INFO | Invoice emailed INV-9931 |
| 11:08:33 | INFO | Nightly stock sync finished |
| 11:19:55 | INFO | Cache warmed (312 keys) |
| **11:23:57** | **CRITICAL** | **MySQL connection refused** on `select * from sessions where id = 8oQ1` |
| 11:29:24 | ERROR | InvoiceFormatter `format()` on null (recurring, unrelated) |
| 11:35:43 | INFO | Sitemap regenerated (1873 urls) |
| 11:39:03 | INFO | Stripe webhook handled |

Full trace of the CRITICAL:

```
SQLSTATE[HY000] [2002] Connection refused
#0 Illuminate/Database/Connectors/Connector.php(70): PDO->__construct()
#1 Illuminate/Session/DatabaseSessionHandler.php(94): Connection->select()
```

Assessment:

- **Yes, DB was unreachable at 11:23:57.** `[2002] Connection refused` at `PDO->__construct` means MySQL wasn't accepting TCP connections at all, not a slow query. Every request would fail at session load, so the site would have been fully down, not degraded.
- **Bounded to roughly 11:20–11:35.** Cache warm succeeded at 11:19:55, sitemap regen (DB-backed) succeeded at 11:35:43. Real window is probably narrower.
- **Only one log line, which is odd for an outage.** Laravel logs per failing request. Either traffic was near zero, the blip lasted seconds, or requests during the outage never reached PHP (e.g. LB health check pulled the node). Can't tell from app logs alone.
- **Not a one-off.** Same CRITICAL fired 10 more times in prod 22–24 Aug: 01:36, 02:41, 07:24, 08:24, 09:49, 11:23 on the 24th; 08:33, 16:53, 17:44, 21:12 on the 23rd; 04:07 on the 22nd. Roughly every 1–3h. That pattern reads as MySQL restarting/OOM-killing or a connection limit being hit periodically, not a single incident.
- **Nothing in the app log explains the cause.** Need MySQL error log, `dmesg`/OOM killer, or Forge/server monitoring for the 24th around 11:20 to pin it.

Nothing between 11:20 and 11:23 either, so if the outage started at ~11:20 the first ~4 mins produced no PHP-side log at all.

<sub>4 turns, 44s</sub>

## Running it yourself

1. `node scripts/demo-data.mjs` then `node scripts/capture.mjs --seed` to load the demo config into the dev store.
2. `npm run dev`, then in Settings enable the MCP server and turn on "Expose to MCP" for the two Acme connections.
3. Register the server with your client using the snippet or command from Settings, and ask.
