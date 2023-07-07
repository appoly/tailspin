import { ipcMain } from "electron";
import { decryptString } from "../helpers";
import axios from "axios";

const BASE_FORGE_URL = "https://forge.laravel.com/api/v1";

const forgeAxios = axios.create({
  baseURL: BASE_FORGE_URL,
  headers: {
    Accept: "application/json",
  },
});

export default () => {
  ipcMain.handle("get-server-list", async (event, encryptedString) => {
    try {
      const apiKey = decryptString(encryptedString);
      const response = await forgeAxios.get("/servers", { headers: { Authorization: `Bearer ${apiKey}` } });

      return response.data;
    } catch (error) {
      return { error: error.message ?? "Error has occurred" };
    }
  });

  ipcMain.handle("get-site-list", async (event, encryptedString) => {
    try {
      const apiKey = decryptString(encryptedString);
      const response = await forgeAxios.get("/sites", { headers: { Authorization: `Bearer ${apiKey}` } });
      return response.data;
    } catch (error) {
      return { error: error.message ?? "Error has occurred" };
    }
  });
};
