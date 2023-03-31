/**
 * I'm not too happy with this file and the one inside src being so similar, but it works for now.
 */
export interface SshDetails {
  host: string;
  port: number;
  username: string;
  passwordType: "password" | "key";
  password: string;
}
