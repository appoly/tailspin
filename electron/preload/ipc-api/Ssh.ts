import { ipcRenderer } from "electron";
import { SshDetails } from "../../interfaces";

export function testSshCredentials(options: SshDetails): Promise<boolean> {
  return ipcRenderer.invoke("test-ssh-credentials", options);
}
