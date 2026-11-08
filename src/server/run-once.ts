const globalForRunOnce = globalThis as typeof globalThis & {
  homeErpRunOnce?: Map<string, Promise<unknown>>;
};

const operations = globalForRunOnce.homeErpRunOnce ?? new Map<string, Promise<unknown>>();

if (process.env.NODE_ENV !== "production") {
  globalForRunOnce.homeErpRunOnce = operations;
}

export function runOnce<T>(key: string, operation: () => Promise<T>) {
  const existing = operations.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const pending = operation().catch((error) => {
    if (operations.get(key) === pending) operations.delete(key);
    throw error;
  });
  operations.set(key, pending);
  return pending;
}
