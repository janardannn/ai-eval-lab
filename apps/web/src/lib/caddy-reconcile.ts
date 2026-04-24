import Docker from "dockerode";
import { removeVncRoute } from "./caddy";

const CADDY_ADMIN = process.env.CADDY_ADMIN_URL || "http://caddy:2019";
const CADDY_ORIGIN = process.env.CADDY_ADMIN_ORIGIN || "http://web";
const rawHost = process.env.DOCKER_HOST || "/var/run/docker.sock";
const socketPath = rawHost.replace(/^unix:\/\//, "");

/** After EC2/compose restarts, Caddy reloads saved routes that still point at dead container IPs. Remove orphan vnc routes. */
export async function pruneStaleVncRoutes() {
  const res = await fetch(`${CADDY_ADMIN}/config/apps/http/servers/srv0/routes`, {
    headers: { Origin: CADDY_ORIGIN, Accept: "application/json" },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`caddy list routes failed: ${res.status} ${body}`);
  }
  const routes = (await res.json()) as Array<{ "@id"?: string }>;
  if (!Array.isArray(routes)) return;

  const docker = new Docker({ socketPath, version: "v1.47" });
  const containers = await docker.listContainers({ all: true });
  const runningNames = new Set(
    containers.flatMap((c) => c.Names.map((n) => n.replace(/^\//, "")))
  );

  for (const route of routes) {
    const id = route["@id"];
    if (!id || !id.startsWith("vnc-")) continue;
    const sessionId = id.slice(4);
    const name = `kicad-${sessionId}`;
    if (!runningNames.has(name)) {
      await removeVncRoute(sessionId);
    }
  }
}
