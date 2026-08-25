<p align="center">
  <img src="public/tailspin-min.png" alt="Tailspin" width="96" />
</p>

# Tailspin — Log Viewer for Laravel

A desktop app for reading Laravel logs without SSHing into servers and squinting at `storage/logs`. Point Tailspin at a local log file or a server over SSH and it parses everything into a searchable, filterable list — with severity filters, auto-refresh while you debug, and one-click downloads of remote logs.

Built by Nathan James and Calum Chamberlain at [Appoly](https://www.appoly.co.uk).

![Tailspin viewing a Laravel log](docs/media/log-viewer.png)

<p align="center">
  <img src="docs/media/tour.gif" alt="Opening a connection, filtering to errors and expanding an entry" width="900" />
</p>

Light and dark, same screen:

![Light and dark themes](docs/media/themes.png)

## Features

- **Local & remote logs** — open log files on disk, or connect over SSH (password or private key, passphrase supported) and browse a server's `.log` files
- **Proper log parsing** — multi-line Laravel log entries become structured entries with timestamp, severity and environment; filter by severity or search the text
- **Auto-fetch** — poll a remote log on an interval while debugging and see new entries appear at the top
- **Laravel Forge integration** — add a Forge API token and pull in all servers and sites, then open any site's logs in a couple of clicks
- **Saved connections** — favourites, drag-to-reorder, custom icons/colours, and multiple connections open at once in tabs
- **Safe credential storage** — SSH passwords and the Forge token are encrypted with the OS keychain (Electron `safeStorage`); nothing is stored in plain text
- **Command palette** — quick-switch between connections and pages

## Install

Grab the latest release from the [releases page](https://github.com/appoly/tailspin/releases/latest):

- **macOS** — `…_arm64.dmg` (Apple Silicon) or `…_x64.dmg` (Intel). Builds are signed and notarized, so they open without Gatekeeper warnings
- **Windows** — `…​.exe` NSIS installer
- **Linux** — `…​.AppImage`

## Development

Requires Node 22+.

```bash
npm install
npm run dev        # vite dev server + electron with hot reload
npm run pre-build  # type-check (vue-tsc) + production build
npm run build      # pre-build + package installers with electron-builder
```

Stack: Electron, Vue 3 + Pinia, Tailwind CSS 4 with [reka-ui](https://reka-ui.com) components, `ssh2-promise` for remote log access. The renderer talks to the main process through a context-isolated preload bridge (`electron/preload/ipc-api`).

## Releasing

Releases are built by CI — never locally. Push a version tag and GitHub Actions builds all
three platforms, signs and notarizes the macOS builds, and uploads everything to a draft
GitHub release; a final job generates the release notes and publishes it once every platform
has finished.

```bash
npm version 0.0.x --no-git-tag-version   # bump package.json, commit it
git tag v0.0.x
git push origin main v0.0.x
```

Signing needs these repository secrets: `CSC_LINK`, `CSC_KEY_PASSWORD`, `CSC_NAME`, `APPLE_ID`,
`APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` (see `electron-builder.env.example` for what each
one is). `GITHUB_TOKEN` is provided by Actions. Forks without a certificate still build — the
macOS job drops to an unsigned, unnotarized app rather than failing.

## Auto-updates

The app checks this repository's GitHub releases through `electron-updater`: a check runs a few
seconds after launch and on demand from Settings, downloads only happen when you ask, and a
downloaded update installs on quit. CI publishes the `latest-mac.yml` / `latest.yml` /
`latest-linux.yml` manifests alongside the installers, which is what the updater actually reads.

Because the repository is public, no token is needed for update checks. `publish.owner` and
`publish.repo` in `electron-builder.json5` must match the repository name — installed builds keep
asking for the name they shipped with, so renaming the repository breaks updates for anyone
already running it.

## Demo data and screenshots

The screenshots above are generated, not hand-captured, so they never contain real hostnames:

```bash
node scripts/demo-data.mjs --out /Users/Shared   # fake Laravel logs + a demo config
node scripts/capture.mjs --seed --config /Users/Shared/tailspin-demo-config.json
TAILSPIN_CAPTURE=1 npm run dev                   # app with a DevTools endpoint
node scripts/capture.mjs                         # writes docs/media
```

`--seed` writes to the dev config only — dev and the installed app keep separate `userData`
directories, so nothing you do in `npm run dev` can touch your real connections.
`scripts/capture.mjs --only <scene>` re-cuts a single shot; the storyboard is in
`scripts/scenes.mjs`.

## Licence

MIT — see [LICENSE](LICENSE) and [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md). The software is
provided as-is, without warranty of any kind; Appoly does not offer support for it and accepts no
liability for its use.
