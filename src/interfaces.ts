export interface LogEntry {
  timestamp: string;
  severity: string;
  environment: string;
  text: string;
}

export interface Connection {
  uid: string;
  name: string;
  icon: string;
  path: string;
  type: "local" | "remote";
}
