export interface LogEntry {
  timestamp: string;
  severity: string;
  environment: string;
  text: string;
}

export interface SshDetails {
  host: string;
  port: number;
  username: string;
  passwordType: "password" | "key";
  password: string;
  passphraseRequired?: boolean;
}

export interface BaseConnection {
  name: string;
  icon: string;
  path: string;
  type: "local" | "remote";
  ssh?: SshDetails;
  isFavorite?: boolean;
  iconColor?: string;
}

export interface Connection extends BaseConnection {
  uid: string;
}

export interface ForgeSite {
  id: number;
  name: string;
  username: string;
  serverId: number;
}

export interface ForgeServer {
  id: number;
  name: string;
  ipAddress: string;
}

export interface Download {
  type: "inProgress" | "completed" | "failed";
  name: string;
  date: Date;
}
