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
}

export interface BaseConnection {
  name: string;
  icon: string;
  path: string;
  type: "local" | "remote";
  ssh?: SshDetails;
  isFavorite?: boolean;
}

export interface Connection extends BaseConnection {
  uid: string;
}
