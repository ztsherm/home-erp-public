export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startWorkflowScheduler } = await import("@/server/workflows/scheduler");
    startWorkflowScheduler();
  }
}
