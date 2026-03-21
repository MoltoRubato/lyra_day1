import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const RUN_SUFFIX = Date.now().toString(36);
const TEST_EMAIL = process.env.PW_TEST_EMAIL ?? `codex.base.delete.${RUN_SUFFIX}@example.com`;
const TEST_PASSWORD = process.env.PW_TEST_PASSWORD ?? "Passw0rd!";
const TEST_NAME = process.env.PW_TEST_NAME ?? `Codex Base Delete ${RUN_SUFFIX}`;

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

async function createFreshBaseAndOpen(page: Page): Promise<{ basePath: string; baseId: string }> {
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

  if (!page.url().includes("/base/")) {
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

  await page.waitForLoadState("domcontentloaded");
  const basePath = new URL(page.url()).pathname;
  const baseId = basePath.split("/").at(-1) ?? "";
  expect(basePath.startsWith("/base/")).toBeTruthy();
  expect(baseId.length).toBeGreaterThan(0);
  return { basePath, baseId };
}

test.describe("Homepage base deletion", () => {
  test("deleting a 100k-row base stays deleted", async ({ page }) => {
    test.setTimeout(16 * 60 * 1000);

    await ensureSignedIn(page);
    const { basePath } = await createFreshBaseAndOpen(page);

    const addRowsButton = page.getByRole("button", { name: "+100k rows" });
    await expect(addRowsButton).toBeVisible({ timeout: 30_000 });
    await expect(addRowsButton).toBeEnabled({ timeout: 30_000 });
    await addRowsButton.click();
    await expect(addRowsButton).toBeEnabled({ timeout: 10 * 60 * 1000 });

    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const baseLink = page.locator(`a[href="${basePath}"]`).first();
    await expect(baseLink).toBeVisible({ timeout: 60_000 });

    const row = baseLink.locator("xpath=ancestor::div[contains(@class,'group')][1]");
    await row.hover();
    const moreOptionsButton = row.getByTitle("More options");
    await expect(moreOptionsButton).toBeVisible({ timeout: 15_000 });

    const deleteResponse = page.waitForResponse(
      (response) =>
        response.url().includes("base.delete") &&
        response.request().method() === "POST",
      { timeout: 5 * 60 * 1000 },
    );

    await moreOptionsButton.click();
    await page.getByRole("button", { name: /^Delete$/ }).first().click();
    const response = await deleteResponse;
    expect(response.ok()).toBeTruthy();

    await expect(baseLink).toBeHidden({ timeout: 30_000 });
    await page.waitForTimeout(3_000);
    await page.reload();
    await expect(page.locator(`a[href="${basePath}"]`)).toHaveCount(0, { timeout: 30_000 });
  });
});

