import { ipcRenderer } from "electron";

/**
 * I'm not too happy with this interface and the one inside the interfaces file in src being so similar, but it works for now.
 */
interface SshDetails {
  host: string;
  port: number;
  username: string;
  passwordType: "password" | "key";
  password: string;
}

export function testSshCredentials(options: SshDetails): Promise<{ success: boolean; error?: any }> {
  return ipcRenderer.invoke("test-ssh-credentials", options);
}
