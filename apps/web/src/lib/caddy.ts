const CADDY_ADMIN = process.env.CADDY_ADMIN_URL || "http://caddy:2019";
const VNC_BASE_DOMAIN = process.env.VNC_DOMAIN || "vnc.localhost";

export function vncHostForSession(sessionId: string): string {
  return `s_${sessionId}.${VNC_BASE_DOMAIN}`;
}

interface CaddyRoute {
  "@id": string;
  match: Array<{ host: string[] }>;
  handle: Array<{
    handler: string;
    upstreams: Array<{ dial: string }>;
  }>;
}

export async function addVncRoute(sessionId: string, hostPort: string) {
  const host = vncHostForSession(sessionId);
  const route: CaddyRoute = {
    "@id": `vnc-${sessionId}`,
    match: [{ host: [host] }],
    handle: [
      {
        handler: "reverse_proxy",
        upstreams: [{ dial: `host.docker.internal:${hostPort}` }],
      },
    ],
  };

  const res = await fetch(
    `${CADDY_ADMIN}/config/apps/http/servers/srv0/routes/0`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(route),
    }
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`caddy add route failed: ${res.status} ${body}`);
  }
}

export async function removeVncRoute(sessionId: string) {
  const res = await fetch(`${CADDY_ADMIN}/id/vnc-${sessionId}`, {
    method: "DELETE",
  });
  if (!res.ok && res.status !== 404) {
    const body = await res.text().catch(() => "");
    throw new Error(`caddy remove route failed: ${res.status} ${body}`);
  }
}
