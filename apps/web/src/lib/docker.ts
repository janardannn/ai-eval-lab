import Docker from "dockerode";
import { addVncRoute, vncHostForSession } from "./caddy";

const rawHost = process.env.DOCKER_HOST || "/var/run/docker.sock";
const socketPath = rawHost.replace(/^unix:\/\//, "");

const docker = new Docker({ socketPath, version: "v1.47" });

const KICAD_IMAGE = process.env.KICAD_IMAGE || "ai-eval-lab-kicad";
const BACKEND_URL =
  process.env.CONTAINER_CALLBACK_URL || "http://host.docker.internal:3000";
const COMPOSE_NETWORK = process.env.COMPOSE_NETWORK || "docker_default";

interface ContainerInfo {
  containerId: string;
  containerUrl: string;
  internalUrl: string;
}

export async function startKicadContainer(
  sessionId: string
): Promise<ContainerInfo> {
  const isProd = process.env.NODE_ENV === "production";
  const containerName = `kicad-${sessionId}`;

  const container = await docker.createContainer({
    name: containerName,
    Image: KICAD_IMAGE,
    Env: [
      `SESSION_ID=${sessionId}`,
      `BACKEND_URL=${BACKEND_URL}`,
      `INTERNAL_API_SECRET=${process.env.INTERNAL_API_SECRET || ""}`,
    ],
    ExposedPorts: { "6080/tcp": {} },
    HostConfig: {
      PortBindings: isProd ? {} : { "6080/tcp": [{ HostPort: "" }] },
      ExtraHosts: ["host.docker.internal:host-gateway"],
      NetworkMode: isProd ? COMPOSE_NETWORK : undefined,
    },
  });

  await container.start();

  const info = await container.inspect();

  let containerUrl: string;
  let internalUrl: string;

  if (isProd) {
    const networks = info.NetworkSettings.Networks;
    if (!networks[COMPOSE_NETWORK]) {
      throw new Error(`container not attached to network ${COMPOSE_NETWORK}`);
    }
    await addVncRoute(sessionId, `${containerName}:6080`);
    containerUrl = `https://${vncHostForSession(sessionId)}`;
    internalUrl = `http://${containerName}:6080`;
  } else {
    const hostPort = info.NetworkSettings.Ports["6080/tcp"]?.[0]?.HostPort;
    if (!hostPort) {
      throw new Error("container started but no host port assigned");
    }
    containerUrl = `http://localhost:${hostPort}`;
    internalUrl = `http://host.docker.internal:${hostPort}`;
  }

  return {
    containerId: container.id,
    containerUrl,
    internalUrl,
  };
}

export async function stopContainer(containerId: string) {
  const container = docker.getContainer(containerId);
  await container.remove({ force: true });
}

export async function extractFile(
  containerId: string,
  filePath: string
): Promise<Buffer> {
  const container = docker.getContainer(containerId);
  const stream = await container.getArchive({ path: filePath });

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

export async function waitForContainer(
  containerUrl: string,
  maxRetries = 20,
  intervalMs = 500
): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(`${containerUrl}/vnc.html`);
      if (res.ok) return true;
    } catch {
      // container not ready yet
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}
