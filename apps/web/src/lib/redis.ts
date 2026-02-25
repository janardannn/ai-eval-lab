import Redis from "ioredis";

const globalForRedis = globalThis as unknown as { redis: Redis };

export const redis =
  globalForRedis.redis || new Redis(process.env.REDIS_URL!);

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;

// Session state helpers

const SESSION_TTL = 7200; // 2 hours

export interface SessionState {
  userId: string;
  assessmentId: string;
  phase: "queued" | "intro" | "domain" | "lab" | "grading" | "graded";
  status: "queued" | "provisioning" | "ready" | "active" | "completed";
  startTime: string;
  containerId?: string;
  containerUrl?: string;
}

export async function getSessionState(
  sessionId: string
): Promise<SessionState | null> {
  const data = await redis.hgetall(`session:${sessionId}`);
  if (!data || !data.userId) return null;
  return data as unknown as SessionState;
}

export async function setSessionState(
  sessionId: string,
  state: Partial<SessionState>
) {
  const key = `session:${sessionId}`;
  await redis.hmset(key, state as Record<string, string>);
  await redis.expire(key, SESSION_TTL);
}

export async function getQueuePosition(sessionId: string): Promise<number> {
  const rank = await redis.zrank("queue", sessionId);
  return rank === null ? -1 : rank;
}

export async function addToQueue(sessionId: string) {
  await redis.zadd("queue", Date.now(), sessionId);
}

export async function popFromQueue(): Promise<string | null> {
  const result = await redis.zpopmin("queue");
  return result && result.length > 0 ? result[0] : null;
}

export async function getActiveContainerCount(): Promise<number> {
  const keys = await redis.keys("container:*");
  return keys.length;
}

export async function setContainerMapping(
  containerId: string,
  sessionId: string
) {
  await redis.set(`container:${containerId}`, sessionId, "EX", SESSION_TTL);
}

export async function removeContainerMapping(containerId: string) {
  await redis.del(`container:${containerId}`);
}

export async function setPendingQuestion(sessionId: string, question: string) {
  await redis.set(`pending_q:${sessionId}`, question, "EX", 600);
}

export async function getPendingQuestion(
  sessionId: string
): Promise<string | null> {
  return redis.get(`pending_q:${sessionId}`);
}

// Q&A position tracking — where we are in the question sequence per phase
// qi = main question index, fi = follow-up index (-1 means the main question itself)
export interface QAPosition { qi: number; fi: number }

export async function getQAPosition(sessionId: string, phase: string): Promise<QAPosition> {
  const val = await redis.get(`qa_pos:${sessionId}:${phase}`);
  return val ? JSON.parse(val) : { qi: 0, fi: -1 };
}

export async function setQAPosition(sessionId: string, phase: string, pos: QAPosition) {
  await redis.set(`qa_pos:${sessionId}:${phase}`, JSON.stringify(pos), "EX", SESSION_TTL);
}
