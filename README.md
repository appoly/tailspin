<p align="center">
  <img src="public/tailspin-min.png" alt="Tailspin" width="96" />
</p>

# Tailspin — Log Viewer for Laravel

A desktop app for reading Laravel logs without SSHing into servers and squinting at `storage/logs`. Point Tailspin at a local log file or a server over SSH and it parses everything into a searchable, filterable list — with severity filters, auto-refresh while you debug, and one-click downloads of remote logs.

Built by Nathan James and Calum Chamberlain at [Appoly](https://www.appoly.co.uk).

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

Releases are built by CI — never locally. Push a version tag and GitHub Actions builds all platforms, signs and notarizes the macOS builds, and publishes a GitHub release:

```bash
npm version 0.0.x --no-git-tag-version   # bump package.json, commit it
git tag v0.0.x
git push origin main v0.0.x
```

Signing needs these repository secrets (see the shared credential store for the shared values): `CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`. The optional S3 upload steps (auto-update feed) also want `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_DEFAULT_REGION` and `AWS_S3_BUCKET`, and skip themselves when those are absent.

## Auto-updates

The app ships with `electron-updater` wired in (update banner in-app, plus a check in Settings). It reads a generic update feed that will be served by the upcoming `appoly-updater` service; until that's deployed, update checks fail quietly and installs simply don't self-update.
