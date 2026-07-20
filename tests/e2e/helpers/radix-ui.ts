import type { Locator, Page } from "@playwright/test";

/** Ouvre un Select Radix (shadcn) et choisit une option par texte visible. */
export async function selectRadixOption(
  page: Page,
  trigger: Locator,
  optionLabel: string | RegExp,
): Promise<void> {
  await trigger.click();
  const option = page.getByRole("option", { name: optionLabel });
  await option.waitFor({ state: "visible", timeout: 10_000 });
  await option.click();
}
