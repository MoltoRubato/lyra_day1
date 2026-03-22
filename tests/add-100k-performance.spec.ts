import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

const RUN_SUFFIX = Date.now().toString(36);
const TEST_EMAIL = process.env.PW_TEST_EMAIL ?? `codex.perf.${RUN_SUFFIX}@example.com`;
const TEST_PASSWORD = process.env.PW_TEST_PASSWORD ?? "Passw0rd!";
const TEST_NAME = process.env.PW_TEST_NAME ?? `Codex Perf ${RUN_SUFFIX}`;

async function ensureSignedIn(page: Page) {
  const registerResponse = await page.request.post("/api/auth/register", {
    data: {
      email: TEST_EMAIL,
      name: TEST_NAME,
      password: TEST_PASSWORD,
    },
  });
  expect([201, 409]).toContain(registerResponse.status());

  await page.goto(`/sign-in?callbackUrl=${encodeURIComponent("/")}`);
  await page.waitForLoadState("domcontentloaded");

  const emailInput = page.getByTestId("emailInput");
  const needsLogin = await emailInput.isVisible().catch(() => false);

  if (needsLogin) {
    await emailInput.fill(TEST_EMAIL);
    await page.getByRole("button", { name: /^Continue$/ }).click();
    await page.waitForURL(/\/sign-in\/password/, { timeout: 60_000 });
    await page.locator("#password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
  }

  await page.waitForURL((url) => !url.pathname.startsWith("/sign-in"), {
    timeout: 60_000,
  });
}

async function createFreshBaseAndOpen(page: Page) {
  await page.goto("/");
  await page.waitForLoadState("domcontentloaded");

  const existingBaseHrefs = new Set(
    await page.locator('a[href^="/base/"]').evaluateAll((links) =>
      links.reduce<string[]>((acc, link) => {
        const href = link.getAttribute("href");
        if (typeof href === "string" && !href.startsWith("/base/temp-base-")) {
          acc.push(href);
        }
        return acc;
      }, []),
    ),
  );

  const createButton = page.getByRole("button", { name: /^Create$/ }).first();
  await expect(createButton).toBeVisible({ timeout: 60_000 });
  await createButton.click();

  await expect(page.getByText("How do you want to start?")).toBeVisible({
    timeout: 15_000,
  });
  await page
    .getByRole("button", { name: /Build an app on your own/i })
    .click();
  await expect(page.getByText("How do you want to start?")).toBeHidden({
    timeout: 20_000,
  });

  if (page.url().includes("/base/")) {
    await page.waitForLoadState("domcontentloaded");
    return;
  }

  let newBaseHref: string | null = null;
  await expect
    .poll(
      async () => {
        const hrefs = await page.locator('a[href^="/base/"]').evaluateAll((links) =>
          links.reduce<string[]>((acc, link) => {
            const href = link.getAttribute("href");
            if (typeof href === "string" && !href.startsWith("/base/temp-base-")) {
              acc.push(href);
            }
            return acc;
          }, []),
        );
        newBaseHref = hrefs.find((href) => !existingBaseHrefs.has(href)) ?? null;
        return newBaseHref;
      },
      {
        timeout: 60_000,
        message: "Timed out waiting for the newly created base link to appear.",
      },
    )
    .not.toBeNull();

  const freshBaseLink = page.locator(`a[href="${newBaseHref!}"]`).first();
  await expect(freshBaseLink).toBeVisible({ timeout: 60_000 });
  await freshBaseLink.click();
  await page.waitForURL(new RegExp(`${newBaseHref!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`), {
    timeout: 60_000,
  });
}

async function scrollToRatio(scroller: Locator, ratio: number) {
  await scroller.evaluate(
    (el, r) => {
      el.scrollTop = Math.max(0, Math.floor((el.scrollHeight - el.clientHeight) * r));
    },
    ratio,
  );
}

async function scrollToRowNumber(scroller: Locator, rowNumber: number) {
  await scroller.evaluate(
    (el, targetRow) => {
      const estimatedRowHeight = 30;
      const nextScrollTop = Math.max(0, (targetRow - 1) * estimatedRowHeight);
      el.scrollTop = Math.min(nextScrollTop, Math.max(0, el.scrollHeight - el.clientHeight));
    },
    rowNumber,
  );
}

async function findVisibleRowIndexByNumber(
  scroller: Locator,
  rowNumber: number,
): Promise<number> {
  return scroller.evaluate(
    (el, target) => {
      const rows = Array.from(el.querySelectorAll("tbody tr"));
      return rows.findIndex((row) => {
        const numberText = row
          .querySelector("td:first-child span.pointer-events-none")
          ?.textContent?.trim();
        return Number.parseInt(numberText ?? "", 10) === target;
      });
    },
    rowNumber,
  );
}

async function readVisibleRowCellsByNumber(scroller: Locator, rowNumber: number) {
  return scroller.evaluate(
    (el, target) => {
      const rows = Array.from(el.querySelectorAll("tbody tr"));
      const row = rows.find((candidate) => {
        const numberText = candidate
          .querySelector("td:first-child span.pointer-events-none")
          ?.textContent?.trim();
        return Number.parseInt(numberText ?? "", 10) === target;
      });
      if (!row) return null;

      const cells = Array.from(row.querySelectorAll("td"));
      const read = (cellIndex: number) => {
        const cell = cells[cellIndex];
        if (!cell) return "";
        const text = cell.textContent ?? "";
        return text.trim();
      };

      return {
        name: read(1),
        notes: read(2),
        assignee: read(3),
        status: read(4),
      };
    },
    rowNumber,
  );
}

async function performCellUpdate(page: Page, action: () => Promise<void>) {
  const updateCellResponse = page.waitForResponse(
    (response) =>
      response.url().includes("table.updateCell") &&
      response.request().method() === "POST",
    { timeout: 30_000 },
  );
  await action();
  const updateResult = await updateCellResponse;
  expect(updateResult.ok()).toBeTruthy();
}

async function waitForFreeScrollReady(page: Page): Promise<{
  elapsedMs: number;
  unlockedMs: number;
  topRange: { min: number; max: number };
  middleRange: { min: number; max: number };
  bottomRange: { min: number; max: number };
}> {
  return page.evaluate(
    async () => {
      const nextFrame = () =>
        new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const sleep = (ms: number) =>
        new Promise<void>((resolve) => window.setTimeout(resolve, ms));
      const deadline = performance.now() + 10 * 60 * 1000;
      let firstUnlockedMs: number | null = null;

      while (performance.now() < deadline) {
        const start = (window as Window & { __add100kStart?: number }).__add100kStart;
        const scroller = document.querySelector('[data-testid="grid-scroll-container"]');
        if (!(scroller instanceof HTMLElement) || typeof start !== "number") {
          await sleep(100);
          continue;
        }

        const overlay = document.querySelector('[data-testid="grid-loading-overlay"]');
        const overlayVisible =
          overlay instanceof HTMLElement &&
          overlay.offsetParent !== null &&
          getComputedStyle(overlay).visibility !== "hidden";

        if (overlayVisible || getComputedStyle(scroller).overflowY === "hidden") {
          await sleep(100);
          continue;
        }
        firstUnlockedMs ??= performance.now() - start;

        const readVisibleRowRange = () => {
          const values = Array.from(
            scroller.querySelectorAll("tbody tr td:first-child span.pointer-events-none"),
          )
            .map((node) => Number.parseInt((node.textContent ?? "").trim(), 10))
            .filter((n) => Number.isFinite(n) && n > 0);

          if (values.length === 0) return { min: 0, max: 0 };
          return { min: Math.min(...values), max: Math.max(...values) };
        };

        const hasVisibleDataCells = () => {
          const values = Array.from(
            scroller.querySelectorAll("tbody tr td:nth-child(3) span"),
          )
            .map((node) => (node.textContent ?? "").trim())
            .filter((value) => value.length > 0);
          return values.length > 0;
        };

        const verifyAtRatio = async (ratio: number) => {
          scroller.scrollTop = Math.max(
            0,
            Math.floor((scroller.scrollHeight - scroller.clientHeight) * ratio),
          );
          await nextFrame();
          await nextFrame();
          return {
            range: readVisibleRowRange(),
            hasData: hasVisibleDataCells(),
          };
        };

        const top = await verifyAtRatio(0);
        if (top.range.min !== 1 || !top.hasData) {
          await sleep(100);
          continue;
        }

        const middle = await verifyAtRatio(0.5);
        if (middle.range.max <= 45_000 || middle.range.max >= 55_500 || !middle.hasData) {
          await sleep(100);
          continue;
        }

        const bottom = await verifyAtRatio(1);
        if (bottom.range.max <= 99_800 || !bottom.hasData) {
          await sleep(100);
          continue;
        }

        return {
          elapsedMs: performance.now() - start,
          unlockedMs: firstUnlockedMs ?? performance.now() - start,
          topRange: top.range,
          middleRange: middle.range,
          bottomRange: bottom.range,
        };
      }

      throw new Error("Timed out waiting for full free-scroll readiness.");
    },
  );
}

async function waitForDeleteReady(page: Page): Promise<{
  elapsedMs: number;
  maxScrollTop: number;
  footerCount: number;
}> {
  return page.evaluate(async () => {
    const nextFrame = () =>
      new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const sleep = (ms: number) =>
      new Promise<void>((resolve) => window.setTimeout(resolve, ms));
    const deadline = performance.now() + 10 * 60 * 1000;

    while (performance.now() < deadline) {
      const start = (window as Window & { __delete100kStart?: number }).__delete100kStart;
      const scroller = document.querySelector('[data-testid="grid-scroll-container"]');
      if (!(scroller instanceof HTMLElement) || typeof start !== "number") {
        await sleep(100);
        continue;
      }

      const overlay = document.querySelector('[data-testid="grid-loading-overlay"]');
      const overlayVisible =
        overlay instanceof HTMLElement &&
        overlay.offsetParent !== null &&
        getComputedStyle(overlay).visibility !== "hidden";
      if (overlayVisible || getComputedStyle(scroller).overflowY === "hidden") {
        await sleep(100);
        continue;
      }

      const rowNumbers = Array.from(
        scroller.querySelectorAll("tbody tr td:first-child span.pointer-events-none"),
      )
        .map((node) => Number.parseInt((node.textContent ?? "").trim(), 10))
        .filter((n) => Number.isFinite(n) && n > 0);
      if (rowNumbers.length > 0) {
        await sleep(100);
        continue;
      }

      const footerText =
        scroller.querySelector("tfoot td:first-child div div")?.textContent?.trim() ?? "";
      const footerMatch = footerText.match(/([\d,]+)/);
      const footerCount = footerMatch
        ? Number.parseInt(footerMatch[1]!.replaceAll(",", ""), 10)
        : Number.NaN;
      if (!Number.isFinite(footerCount) || footerCount !== 0) {
        await sleep(100);
        continue;
      }

      scroller.scrollTop = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
      await nextFrame();
      await nextFrame();
      const maxScrollTop = scroller.scrollTop;

      scroller.scrollTop = 0;
      await nextFrame();
      await nextFrame();
      if (scroller.scrollTop !== 0) {
        await sleep(100);
        continue;
      }

      return {
        elapsedMs: performance.now() - start,
        maxScrollTop,
        footerCount,
      };
    }

    throw new Error("Timed out waiting for delete-all readiness.");
  });
}

test.describe("Add 100k rows performance", () => {
  test("click-to-free-scroll stays below 20s", async ({ page }) => {
    test.setTimeout(12 * 60 * 1000);
    const preloadStarts = new WeakMap<object, number>();
    const preloadDurations: number[] = [];

    page.on("request", (request) => {
      if (!request.url().includes("table.loadRowsAfterOrder")) return;
      preloadStarts.set(request as unknown as object, Date.now());
    });

    page.on("response", (response) => {
      if (!response.url().includes("table.loadRowsAfterOrder")) return;
      const request = response.request() as unknown as object;
      const startedAt = preloadStarts.get(request);
      if (typeof startedAt !== "number") return;
      preloadDurations.push(Date.now() - startedAt);
    });

    await ensureSignedIn(page);
    await createFreshBaseAndOpen(page);

    const addRowsButton = page.getByRole("button", { name: "+100k rows" });
    await expect(addRowsButton).toBeVisible({ timeout: 30_000 });
    await expect(addRowsButton).toBeEnabled({ timeout: 30_000 });

    const scroller = page.getByTestId("grid-scroll-container");
    await expect(scroller).toBeVisible({ timeout: 30_000 });

    await page.evaluate(() => {
      (window as Window & { __add100kStart?: number }).__add100kStart = performance.now();
    });
    await addRowsButton.click();
    await expect(addRowsButton).toBeEnabled({ timeout: 10 * 60 * 1000 });
    const mutationElapsedMs = await page.evaluate(() => {
      const start = (window as Window & { __add100kStart?: number }).__add100kStart;
      return typeof start === "number" ? performance.now() - start : -1;
    });
    console.log(`[perf] +100k click-to-mutation-complete: ${mutationElapsedMs}ms`);

    const readiness = await waitForFreeScrollReady(page);
    const elapsedMs = readiness.elapsedMs;
    console.log(`[perf] +100k unlock-to-scroll-check: ${readiness.unlockedMs}ms`);

    await scrollToRowNumber(scroller, 1001);
    await expect
      .poll(() => findVisibleRowIndexByNumber(scroller, 1001), { timeout: 20_000 })
      .not.toBe(-1);

    await expect
      .poll(async () => {
        const row = await readVisibleRowCellsByNumber(scroller, 1001);
        if (!row) return false;
        return (
          row.name.length > 0 &&
          row.notes.length > 0 &&
          row.assignee.length > 0 &&
          row.status.length > 0
        );
      }, { timeout: 20_000 })
      .toBeTruthy();

    const targetRowIndex = await findVisibleRowIndexByNumber(scroller, 1001);
    expect(targetRowIndex).toBeGreaterThanOrEqual(0);
    const targetRow = scroller.locator("tbody tr").nth(targetRowIndex);
    const nameCell = targetRow.locator("td").nth(1);
    const editedName = `Edited ${Date.now().toString(36)}`;
    await nameCell.click();
    const nameInput = nameCell.locator("input");
    await expect(nameInput).toBeVisible({ timeout: 10_000 });
    await nameInput.fill(editedName);
    await performCellUpdate(page, async () => {
      await nameInput.press("Enter");
    });
    await expect(nameCell.locator("span")).toHaveText(editedName, { timeout: 15_000 });

    const statusCell = targetRow.locator("td").nth(4);
    const normalizedStatus = async () => ((await statusCell.textContent()) ?? "").trim();
    const initialStatus = await normalizedStatus();
    const firstStatusLabel = initialStatus === "Todo" ? "In progress" : "Todo";

    await statusCell.click();
    await expect(page.getByRole("combobox", { name: "Find an option" })).toBeVisible({
      timeout: 10_000,
    });
    await performCellUpdate(page, async () => {
      await page.getByRole("option", { name: new RegExp(`^${firstStatusLabel}$`) }).first().click();
    });
    await expect(statusCell).toContainText(firstStatusLabel, { timeout: 15_000 });

    await statusCell.click();
    await expect(page.getByRole("combobox", { name: "Find an option" })).toBeVisible({
      timeout: 10_000,
    });
    await performCellUpdate(page, async () => {
      await page.getByRole("option", { name: new RegExp(`^${firstStatusLabel}$`) }).first().click();
    });
    await expect.poll(async () => normalizedStatus(), {
      timeout: 15_000,
    }).toBe("");

    await statusCell.click();
    await expect(page.getByRole("combobox", { name: "Find an option" })).toBeVisible({
      timeout: 10_000,
    });
    await performCellUpdate(page, async () => {
      await page.getByRole("option", { name: /^Todo$/ }).first().click();
    });
    await expect(statusCell).toContainText("Todo", { timeout: 15_000 });

    await scrollToRatio(scroller, 0.5);
    if (preloadDurations.length > 0) {
      const totalMs = preloadDurations.reduce((sum, value) => sum + value, 0);
      const avgMs = totalMs / preloadDurations.length;
      const maxMs = Math.max(...preloadDurations);
      console.log(
        `[perf] loadRowsAfterOrder calls=${preloadDurations.length} avg=${avgMs.toFixed(1)}ms max=${maxMs.toFixed(1)}ms total=${totalMs.toFixed(1)}ms`,
      );
    } else {
      console.log("[perf] loadRowsAfterOrder calls=0");
    }
    console.log(`[perf] +100k click-to-free-scroll: ${elapsedMs}ms`);
    expect(preloadDurations.length).toBe(0);
    expect(elapsedMs).toBeLessThan(20_000);
  });

  test("select-all delete 100k stays below 20s", async ({ page }) => {
    test.setTimeout(12 * 60 * 1000);

    await ensureSignedIn(page);
    await createFreshBaseAndOpen(page);

    const addRowsButton = page.getByRole("button", { name: "+100k rows" });
    await expect(addRowsButton).toBeVisible({ timeout: 30_000 });
    await expect(addRowsButton).toBeEnabled({ timeout: 30_000 });

    await page.evaluate(() => {
      (window as Window & { __add100kStart?: number }).__add100kStart = performance.now();
    });
    await addRowsButton.click();
    await expect(addRowsButton).toBeEnabled({ timeout: 10 * 60 * 1000 });

    const addReadiness = await waitForFreeScrollReady(page);
    console.log(`[perf] +100k prep complete in ${addReadiness.elapsedMs}ms`);

    const selectAll = page.getByRole("checkbox", { name: "Select all rows" });
    await expect(selectAll).toBeVisible({ timeout: 30_000 });
    await selectAll.click();
    await expect(selectAll).toHaveAttribute("aria-checked", "true");

    const scroller = page.getByTestId("grid-scroll-container");
    const firstDataRow = scroller
      .locator("tbody tr")
      .filter({ has: page.locator("td:first-child span.pointer-events-none") })
      .first();
    await expect(firstDataRow).toBeVisible({ timeout: 30_000 });
    await firstDataRow.click({ button: "right" });

    const deleteResponse = page.waitForResponse(
      (response) =>
        response.url().includes("table.bulkDeleteRows") &&
        response.request().method() === "POST",
      { timeout: 10 * 60 * 1000 },
    );
    await page.evaluate(() => {
      (window as Window & { __delete100kStart?: number }).__delete100kStart = performance.now();
    });
    await page.getByRole("button", { name: "Delete all selected records" }).click();
    const deleteResult = await deleteResponse;
    expect(deleteResult.ok()).toBeTruthy();

    const deleteReadiness = await waitForDeleteReady(page);
    console.log(
      `[perf] delete 100k click-to-ready: ${deleteReadiness.elapsedMs}ms (maxScrollTop=${deleteReadiness.maxScrollTop})`,
    );

    expect(deleteReadiness.footerCount).toBe(0);
    expect(deleteReadiness.elapsedMs).toBeLessThan(20_000);
  });
});
