import { expect, test } from "@playwright/test";

const BASE_ID = process.env.PW_STRESS_BASE_ID;
const TEST_EMAIL = process.env.PW_TEST_EMAIL ?? "codex.stress@example.com";
const TEST_PASSWORD = process.env.PW_TEST_PASSWORD ?? "Passw0rd!";

test.describe("100k grid preload", () => {
  test("loads fully, scrolls stably, and does not relock on cell edit", async ({ page }) => {
    if (!BASE_ID) {
      test.skip(true, "Set PW_STRESS_BASE_ID to run this stress test.");
    }

    test.setTimeout(10 * 60 * 1000);

    await page.goto(`/sign-in?callbackUrl=${encodeURIComponent(`/base/${BASE_ID}`)}`);
    await page.waitForLoadState("domcontentloaded");

    const emailInput = page.getByTestId("emailInput");
    if (await emailInput.isVisible()) {
      await emailInput.fill(TEST_EMAIL);
      await page.getByRole("button", { name: /^Continue$/ }).click();
      await page.waitForURL(/\/sign-in\/password/, { timeout: 60_000 });
      await page.locator("#password").fill(TEST_PASSWORD);
      await page.getByRole("button", { name: "Sign in" }).click();
    }

    await page.waitForURL(new RegExp(`/base/${BASE_ID}`), { timeout: 60_000 });

    const scroller = page.getByTestId("grid-scroll-container");
    await expect(scroller).toBeVisible();

    const readVisibleRowRange = async () =>
      scroller.evaluate((el) => {
        const values = Array.from(
          el.querySelectorAll("tbody tr td:first-child span.pointer-events-none"),
        )
          .map((node) => Number.parseInt((node.textContent ?? "").trim(), 10))
          .filter((n) => Number.isFinite(n) && n > 0);
        if (values.length === 0) return { min: 0, max: 0 };
        return { min: Math.min(...values), max: Math.max(...values) };
      });

    await expect
      .poll(async () => (await readVisibleRowRange()).min, {
        timeout: 120_000,
      })
      .toBeGreaterThan(0);

    await scroller.evaluate((el) => {
      el.scrollTop = 0;
    });
    await page.waitForTimeout(500);
    const topRange = await readVisibleRowRange();
    expect(topRange.min).toBe(1);

    await scroller.evaluate((el) => {
      el.scrollTop = el.scrollHeight * 0.5;
    });
    await page.waitForTimeout(800);
    const middleRange = await readVisibleRowRange();
    expect(middleRange.max).toBeGreaterThan(45_000);
    expect(middleRange.max).toBeLessThan(55_500);

    await scroller.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await page.waitForTimeout(900);
    const bottomRange = await readVisibleRowRange();
    expect(bottomRange.max).toBeGreaterThan(99_800);

    const bottomCell = page.getByText("row-99999").first();
    await expect(bottomCell).toBeVisible();
    await bottomCell.click();

    const editor = page.locator("td input.border-2").first();
    await expect(editor).toBeVisible();
    await editor.fill("row-99999-updated");
    await editor.press("Enter");

    await page.waitForTimeout(1500);
    await expect(page.getByText("row-99999-updated").first()).toBeVisible();
  });
});
