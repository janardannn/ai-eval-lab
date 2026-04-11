import Docker from "dockerode";

const rawHost = process.env.DOCKER_HOST || "/var/run/docker.sock";
const socketPath = rawHost.replace(/^unix:\/\//, "");

const docker = new Docker({ socketPath, version: "v1.47" });

const KICAD_IMAGE = process.env.KICAD_IMAGE || "ai-eval-lab-kicad";
const BACKEND_URL =
  process.env.CONTAINER_CALLBACK_URL || "http://host.docker.internal:3000";
const PUBLIC_VNC_URL = process.env.PUBLIC_VNC_URL;
const VNC_HOST_PORT = process.env.VNC_HOST_PORT;

interface ContainerInfo {
  containerId: string;
  containerUrl: string;
  internalUrl: string;
}

export async function startKicadContainer(
  sessionId: string
): Promise<ContainerInfo> {
  const container = await docker.createContainer({
    Image: KICAD_IMAGE,
    Env: [
      `SESSION_ID=${sessionId}`,
      `BACKEND_URL=${BACKEND_URL}`,
      `INTERNAL_API_SECRET=${process.env.INTERNAL_API_SECRET || ""}`,
    ],
    ExposedPorts: { "6080/tcp": {} },
    HostConfig: {
      PortBindings: {
        "6080/tcp": [{ HostPort: VNC_HOST_PORT || "" }],
      },
      ExtraHosts: ["host.docker.internal:host-gateway"],
    },
  });

  await container.start();

  const info = await container.inspect();
  const hostPort =
    info.NetworkSettings.Ports["6080/tcp"]?.[0]?.HostPort || "6080";

  const internalUrl = `http://host.docker.internal:${hostPort}`;
  const containerUrl = PUBLIC_VNC_URL || `http://localhost:${hostPort}`;

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
