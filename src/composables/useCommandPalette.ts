import { computed, ref, type Component, type Ref } from 'vue'
import type { Connection } from '@/types/interfaces'
import { useApplicationStore } from '@/stores/useApplicationStore'
import { useConnectionStore } from '@/stores/useConnectionStore'
import { useUserStore } from '@/stores/useUserStore'
import { copySshCommand, openInTerminal } from '@/lib/sshCommand'
import { getConnectionIcon } from '@/lib/connectionIcons'
import { BookOpen, Clipboard, Download, Hammer, HardDrive, Monitor, Moon, Plus, Settings, Sun, Terminal, X } from 'lucide-vue-next'

export interface PaletteItem {
  id: string
  title: string
  subtitle?: string
  icon: Component
  /** Only set for connections, so their custom colour carries into the palette */
  iconColor?: string
  badges?: string[]
  /** Extra text the search should match but the row does not show */
  keywords?: string
  run: () => void
}

export interface PaletteGroup {
  heading: string
  items: PaletteItem[]
}

const CONNECTION_PAGE_PREFIX = 'connections.page.'
const RECENT_STORAGE_KEY = 'commandPalette.recentConnections'
const RECENT_LIMIT = 10

/** Accent-insensitive so "gonçalves" is reachable by typing "goncalves". */
function normalise(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

/** "Copy SSH command" -> "csc", so the row is reachable by its initials. */
function initials(title: string): string {
  return normalise(title).split(/[^a-z0-9]+/).filter(Boolean).map((word) => word[0]).join('')
}

function searchableText(item: PaletteItem): string {
  return normalise([item.title, item.subtitle, item.keywords, ...(item.badges ?? [])].filter(Boolean).join(' '))
}

/**
 * Every whitespace-separated token has to land somewhere, so "prod ssh" narrows
 * rather than widens. A token is either a plain substring of the whole row
 * (title, subtitle, badges, hidden keywords) or the start of the title's
 * initials. A looser subsequence match was tried and dragged in nonsense —
 * "sett" found "Close this tab" before it found "Settings".
 */
function itemMatches(item: PaletteItem, term: string): boolean {
  const tokens = normalise(term).split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return true

  const haystack = searchableText(item)
  const acronym = initials(item.title)
  return tokens.every((token) => haystack.includes(token) || acronym.startsWith(token))
}

function readRecent(): string[] {
  try {
    const stored = JSON.parse(window.localStorage.getItem(RECENT_STORAGE_KEY) ?? '[]')
    return Array.isArray(stored) ? stored.filter((uid): uid is string => typeof uid === 'string') : []
  } catch {
    return []
  }
}

// Mirrored in a ref because localStorage on its own would not re-order the list
// until something else happened to invalidate the computed.
const recentUids = ref<string[]>(readRecent())

function rememberRecent(uid: string) {
  recentUids.value = [uid, ...recentUids.value.filter((existing) => existing !== uid)].slice(0, RECENT_LIMIT)
  try {
    window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(recentUids.value))
  } catch {
    // A full or blocked storage only costs us the ordering hint, so carry on.
  }
}

function connectionSubtitle(connection: Connection): string {
  if (connection.type === 'remote' && connection.ssh) {
    return `${connection.ssh.username}@${connection.ssh.host} · ${connection.path}`
  }
  return connection.path
}

function connectionKeywords(connection: Connection): string {
  const ssh = connection.ssh
  return [connection.type === 'remote' ? 'ssh remote' : 'local', ssh?.host, ssh?.username, connection.path]
    .filter(Boolean)
    .join(' ')
}

/** A row before its `run` is attached. */
type PaletteRow = Omit<PaletteItem, 'run'>

/** A "Go to" row before its `run` is built from the page id. */
type NavigationDraft = PaletteRow & { page: string }

export function useCommandPalette(searchTerm: Ref<string>, close: () => void) {
  const applicationStore = useApplicationStore()
  const connectionStore = useConnectionStore()
  const userStore = useUserStore()

  const activeConnection = computed(() => {
    if (!applicationStore.page.startsWith(CONNECTION_PAGE_PREFIX)) return undefined
    return connectionStore.getById(applicationStore.page.slice(CONNECTION_PAGE_PREFIX.length))
  })

  function run(action: () => void) {
    action()
    close()
  }

  function closeTab(connection: Connection) {
    applicationStore.closeConnection(connection.uid)
    // Land on a tab that still exists rather than a page rendering nothing.
    const remaining = applicationStore.openConnections.at(-1)
    applicationStore.changePage(remaining ? CONNECTION_PAGE_PREFIX + remaining : 'connections')
  }

  async function openTerminal(connection: Connection) {
    const result = await openInTerminal(connection)
    // No ssh:// handler on this machine, so leave the user something to paste.
    if (!result.success) await copySshCommand(connection)
  }

  function connectionRow(connection: Connection, prefix: string, title: string, extraBadge?: string): PaletteRow {
    return {
      id: `${prefix}:${connection.uid}`,
      title,
      subtitle: connectionSubtitle(connection),
      icon: getConnectionIcon(connection.icon),
      iconColor: connection.iconColor,
      badges: [connection.type === 'remote' ? 'SSH' : 'Local', ...(extraBadge ? [extraBadge] : [])],
      keywords: connectionKeywords(connection),
    }
  }

  const currentTabItems = computed<PaletteItem[]>(() => {
    const connection = activeConnection.value
    if (!connection) return []

    const items: PaletteItem[] = [{
      id: 'tab:close',
      title: 'Close this tab',
      subtitle: connection.name,
      icon: X,
      keywords: 'close tab connection current',
      run: () => run(() => closeTab(connection)),
    }]

    if (connection.type === 'remote') {
      items.push({
        id: 'tab:copy-ssh',
        title: 'Copy SSH command',
        subtitle: connection.name,
        icon: Clipboard,
        keywords: 'copy ssh command clipboard current tab',
        run: () => run(() => { copySshCommand(connection) }),
      }, {
        id: 'tab:open-terminal',
        title: 'Open in Terminal',
        subtitle: connection.name,
        icon: Terminal,
        keywords: 'open terminal ssh shell current tab',
        run: () => run(() => { openTerminal(connection) }),
      })
    }

    return items
  })

  const openTabItems = computed<PaletteItem[]>(() =>
    connectionStore.openConnections.map((connection) => ({
      ...connectionRow(connection, 'switch', `Switch to ${connection.name}`, 'open'),
      keywords: `${connectionKeywords(connection)} switch tab open`,
      run: () => run(() => applicationStore.changePage(CONNECTION_PAGE_PREFIX + connection.uid)),
    }))
  )

  /** Favourites, then whatever was opened from here most recently, then A-Z. */
  const closedConnections = computed<Connection[]>(() => {
    const closed = connectionStore.connections.filter(
      (connection) => !applicationStore.openConnections.includes(connection.uid)
    )
    const favourites = closed.filter((connection) => connection.isFavorite)
    const recent = recentUids.value
      .map((uid) => closed.find((connection) => connection.uid === uid && !connection.isFavorite))
      .filter((connection): connection is Connection => Boolean(connection))
    const seen = new Set([...favourites, ...recent].map((connection) => connection.uid))
    const rest = closed
      .filter((connection) => !seen.has(connection.uid))
      .sort((a, b) => a.name.localeCompare(b.name))

    return [...favourites, ...recent, ...rest]
  })

  const connectionItems = computed<PaletteItem[]>(() =>
    closedConnections.value.map((connection) => ({
      ...connectionRow(connection, 'open', connection.name),
      run: () => run(() => {
        rememberRecent(connection.uid)
        applicationStore.goToConnection(connection.uid)
      }),
    }))
  )

  const navigationItems = computed<PaletteItem[]>(() => {
    const items: NavigationDraft[] = [
      { id: 'go:connections', title: 'Connections', subtitle: 'All saved connections', icon: HardDrive, keywords: 'go to list', page: 'connections' },
    ]
    if (applicationStore.forgeSectionEnabled) {
      items.push({ id: 'go:forge', title: 'Forge', subtitle: 'Laravel Forge servers and sites', icon: Hammer, keywords: 'go to laravel', page: 'connections.forge' })
    }
    items.push(
      { id: 'go:downloads', title: 'Downloads', subtitle: 'Files pulled from servers', icon: Download, keywords: 'go to files', page: 'downloads' },
      { id: 'go:settings', title: 'Settings', subtitle: 'Preferences and stored data', icon: Settings, keywords: 'go to preferences options', page: 'settings' },
      { id: 'go:log-viewer', title: 'Log Viewer', subtitle: 'Open a log file from this machine', icon: BookOpen, keywords: 'go to local file view by file', page: 'log-viewer' },
      { id: 'go:new-connection', title: 'New connection', subtitle: 'Add a local or SSH connection', icon: Plus, keywords: 'create add server', page: 'connections.add' },
    )

    return items.map(({ page, ...item }) => ({
      ...item,
      run: () => run(() => applicationStore.changePage(page)),
    }))
  })

  const themeItems = computed<PaletteItem[]>(() =>
    ([
      { value: 'light', label: 'Light', icon: Sun, keywords: 'day bright' },
      { value: 'dark', label: 'Dark', icon: Moon, keywords: 'night' },
      { value: 'auto', label: 'Auto', icon: Monitor, keywords: 'system follow os' },
    ] as const).map((theme) => ({
      id: `theme:${theme.value}`,
      title: `Theme: ${theme.label}`,
      icon: theme.icon,
      badges: userStore.theme === theme.value ? ['current'] : undefined,
      keywords: `appearance colour color scheme mode ${theme.keywords}`,
      run: () => run(() => userStore.changeTheme(theme.value)),
    }))
  )

  const groups = computed<PaletteGroup[]>(() => {
    const all: PaletteGroup[] = [
      { heading: 'Current tab', items: currentTabItems.value },
      { heading: 'Open tabs', items: openTabItems.value },
      { heading: 'Connections', items: connectionItems.value },
      { heading: 'Go to', items: navigationItems.value },
      { heading: 'Appearance', items: themeItems.value },
    ]

    return all
      .map((group) => ({ ...group, items: group.items.filter((item) => itemMatches(item, searchTerm.value)) }))
      .filter((group) => group.items.length > 0)
  })

  return { groups }
}
