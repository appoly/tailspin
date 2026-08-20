import { ipcMain } from "electron";
import { decryptString } from "../helpers";
import axios, { AxiosInstance } from "axios";

// Forge API v2 (JSON:API format, cursor-paginated, organization-scoped).
// The legacy v1 API is discontinued from 31 Aug 2026.
const BASE_FORGE_URL = "https://forge.laravel.com/api";

const PAGE_SIZE = 100;

function forgeClient(apiKey: string): AxiosInstance {
  return axios.create({
    baseURL: BASE_FORGE_URL,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
  });
}

// Fetch every page of a JSON:API collection, following the cursor.
async function fetchAll(client: AxiosInstance, path: string): Promise<any[]> {
  const items: any[] = [];
  let cursor: string | undefined;

  do {
    const response = await client.get(path, {
      params: { "page[size]": PAGE_SIZE, ...(cursor && { "page[cursor]": cursor }) },
    });
    const body = response.data ?? {};
    items.push(...(body.data ?? []));

    cursor = body.meta?.next_cursor ?? undefined;
    if (!cursor && typeof body.links?.next === "string") {
      cursor = new URL(body.links.next).searchParams.get("page[cursor]") ?? undefined;
    }
  } while (cursor);

  return items;
}

async function getOrganizationSlugs(client: AxiosInstance): Promise<string[]> {
  const orgs = await fetchAll(client, "/orgs");
  return orgs.map((org) => org.attributes?.slug ?? org.id).filter(Boolean);
}

// The renderer still consumes the v1-era shapes ({ servers: [...] } / { sites: [...] }),
// so flatten the JSON:API documents back into those.
async function fetchServersBySlug(client: AxiosInstance): Promise<Map<string, any[]>> {
  const slugs = await getOrganizationSlugs(client);
  const perOrg = await Promise.all(slugs.map((slug) => fetchAll(client, `/orgs/${slug}/servers`)));
  return new Map(slugs.map((slug, i) => [slug, perOrg[i]]));
}

async function listServers(apiKey: string) {
  const client = forgeClient(apiKey);
  const servers = [...(await fetchServersBySlug(client)).values()].flat().map((server) => ({
    id: Number(server.id),
    name: server.attributes?.name,
    ip_address: server.attributes?.ip_address,
  }));

  return { servers };
}

async function listSites(apiKey: string) {
  const client = forgeClient(apiKey);
  const serversBySlug = await fetchServersBySlug(client);

  // Sites are fetched per server so the server association comes from the
  // request path — the org-wide sites document only exposes it as a
  // JSON:API relationship, which is not reliably present.
  const requests: Promise<any[]>[] = [];
  for (const [slug, servers] of serversBySlug) {
    for (const server of servers) {
      requests.push(
        fetchAll(client, `/orgs/${slug}/servers/${server.id}/sites`).then((sites) =>
          sites.map((site) => ({
            id: Number(site.id),
            name: site.attributes?.name,
            username: site.attributes?.user,
            server_id: Number(server.id),
          }))
        )
      );
    }
  }

  return { sites: (await Promise.all(requests)).flat() };
}

function formatError(error: any): { error: string } {
  const status = error?.response?.status;
  if (status === 401) return { error: "Forge rejected the API key. It may be expired or revoked." };
  if (status === 403)
    return { error: "The API key is missing a required scope (needs organization:view and server:view)." };
  return { error: error?.message ?? "Error has occurred" };
}

export default () => {
  ipcMain.handle("get-server-list", async (event, encryptedString) => {
    try {
      return await listServers(decryptString(encryptedString));
    } catch (error) {
      return formatError(error);
    }
  });

  ipcMain.handle("get-site-list", async (event, encryptedString) => {
    try {
      return await listSites(decryptString(encryptedString));
    } catch (error) {
      return formatError(error);
    }
  });
};
