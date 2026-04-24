export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV !== "production") return;

  const { pruneStaleVncRoutes } = await import("@/lib/caddy-reconcile");
  for (let i = 0; i < 8; i++) {
    try {
      await pruneStaleVncRoutes();
      return;
    } catch (e) {
      if (i === 7) {
        console.error("[instrumentation] pruneStaleVncRoutes failed", e);
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
}
