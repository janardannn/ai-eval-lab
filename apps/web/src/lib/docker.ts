import Docker from "dockerode";

const docker = new Docker({
  socketPath: process.env.DOCKER_HOST || "/var/run/docker.sock",
});

const KICAD_IMAGE = process.env.KICAD_IMAGE || "ai-eval-lab-kicad";
const BACKEND_URL = process.env.NEXT_PUBLIC_APP_URL || "http://web:8080";

interface ContainerInfo {
  containerId: string;
  containerUrl: string;
}

export async function startKicadContainer(
  sessionId: string
): Promise<ContainerInfo> {
  const container = await docker.createContainer({
    Image: KICAD_IMAGE,
    Env: [`SESSION_ID=${sessionId}`, `BACKEND_URL=${BACKEND_URL}`],
    ExposedPorts: { "6080/tcp": {} },
    HostConfig: {
      PortBindings: { "6080/tcp": [{ HostPort: "" }] }, // dynamic port
    },
  });

  await container.start();

  const info = await container.inspect();
  const hostPort =
    info.NetworkSettings.Ports["6080/tcp"]?.[0]?.HostPort || "6080";

  return {
    containerId: container.id,
    containerUrl: `http://localhost:${hostPort}`,
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
