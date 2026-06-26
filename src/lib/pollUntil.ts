export interface PollUntilOptions {
  timeout?: number;
  interval?: number;
}

/**
 * Interroge une condition jusqu'à succès ou expiration du délai.
 */
export async function pollUntil(
  condition: () => Promise<boolean> | boolean,
  options: PollUntilOptions = {},
): Promise<boolean> {
  const { timeout = 5000, interval = 500 } = options;
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    const result = await condition();
    if (result) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  return false;
}
