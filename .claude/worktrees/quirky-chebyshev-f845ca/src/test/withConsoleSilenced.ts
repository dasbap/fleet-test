type ConsoleMethod = "error" | "warn" | "log";

type ConsoleFilter = (method: ConsoleMethod, args: unknown[]) => boolean;

/**
 * Helper pour exécuter du code en silence partiel sur la console :
 * on peut ignorer certains logs attendus (par prédicat) sans masquer le reste.
 */
export async function withConsoleSilenced<T>(
  filter: ConsoleFilter,
  run: () => Promise<T> | T,
): Promise<T> {
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalLog = console.log;

  console.error = (...args: unknown[]) => {
    if (filter("error", args)) return;
    originalError(...args);
  };
  console.warn = (...args: unknown[]) => {
    if (filter("warn", args)) return;
    originalWarn(...args);
  };
  console.log = (...args: unknown[]) => {
    if (filter("log", args)) return;
    originalLog(...args);
  };

  try {
    return await run();
  } finally {
    console.error = originalError;
    console.warn = originalWarn;
    console.log = originalLog;
  }
}

