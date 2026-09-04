import type { Component } from 'vue'
import {
  Activity, Box, Briefcase, Cloud, Code, Coffee, Compass, Cpu, Database, File,
  Folder, Globe, HardDrive, Hash, Heart, Home, Key, Layers, Lock, Monitor,
  Network, Radio, Rocket, Server, Shield, Star, Tag, Terminal, Wifi, Wrench, Zap,
} from 'lucide-vue-next'

// The one place the connection icon names in config are resolved to components.
// The card, the picker, the tab strip, the connection header and the palette
// all read from here, so adding an icon is a single edit.
export const connectionIcons: Record<string, Component> = {
  terminal: Terminal, server: Server, database: Database, globe: Globe,
  cloud: Cloud, monitor: Monitor, 'hard-drive': HardDrive, folder: Folder,
  file: File, shield: Shield, zap: Zap, code: Code, wifi: Wifi, lock: Lock,
  key: Key, box: Box, cpu: Cpu, layers: Layers, network: Network,
  radio: Radio, rocket: Rocket, star: Star, tag: Tag, wrench: Wrench,
  activity: Activity, briefcase: Briefcase, coffee: Coffee, compass: Compass,
  hash: Hash, heart: Heart, home: Home,
}

/** Older configs stored PascalCase names, so the lookup is case-insensitive. */
export function getConnectionIcon(name: string | undefined | null): Component {
  if (!name) return Terminal
  return connectionIcons[name] ?? connectionIcons[name.toLowerCase()] ?? Terminal
}
