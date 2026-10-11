import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import { brotliCompressSync, constants, gzipSync } from "node:zlib";
import capstone from "../content/capstones/b4";
import { expectDone, terminal, typeCommands } from "./b1-1";

/** ADR-014. Bytes gate CI; timings fail only past TRIPWIRE x budget until PERF_STRICT=1 (T6.19). */
const KB = 1024;
const BUDGET = {
  homeJs: 170 * KB,
  lessonJs: 230 * KB,
  sandboxJs: 100 * KB,
  hubJs: 60 * KB,
  fonts: 150 * KB,
  families: 3,
  lcp: 2500,
  cls: 0.02,
  frame: 50,
};
const TRIPWIRE = process.env.PERF_STRICT ? 1 : 3;

test.skip(
  ({ browserName }) => browserName !== "chromium",
  "Budgets are measured on Chromium.",
);

const chunkUrls = (html: string) => [
  ...new Set(html.match(/\/_next\/static\/chunks\/[\w.-]+\.js/g) ?? []),
];

/** Brotli at the highest quality, the encoding the host serves; gzip is reported alongside. */
async function compressed(request: APIRequestContext, urls: readonly string[]) {
  let br = 0;
  let gz = 0;
  for (const url of urls) {
    const body = await (await request.get(url)).body();
    br += brotliCompressSync(body, {
      params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
    }).length;
    gz += gzipSync(body).length;
  }
  return { br, gz };
}

function report(name: string, value: string) {
  test.info().annotations.push({ type: name, description: value });
  console.log(`${name}: ${value}`);
}

const kb = (bytes: number) => `${(bytes / KB).toFixed(1)} KB`;

for (const [path, budget] of [
  ["/", BUDGET.homeJs],
  ["/learn/b1-1", BUDGET.lessonJs],
  ["/capstones/b1", BUDGET.lessonJs],
  ["/scenarios/s-b1", BUDGET.lessonJs],
] as const) {
  test(`initial JavaScript on ${path} stays within ${kb(budget)}`, async ({
    request,
  }) => {
    const html = await (await request.get(path)).text();
    const { br, gz } = await compressed(request, chunkUrls(html));
    report(`JS ${path}`, `${kb(br)} brotli, ${kb(gz)} gzip`);
    expect(br).toBeLessThanOrEqual(budget);
  });
}

/** JavaScript the page fetches after load, other routes' prefetches blocked. */
async function lateChunks(
  page: Page,
  path: string,
  ready: () => Promise<void>,
) {
  await page.route(
    (url) => url.searchParams.has("_rsc"),
    (route) => route.abort(),
  );
  const response = await page.goto(path);
  const initial = new Set(chunkUrls((await response?.text()) ?? ""));
  await ready();
  await page.waitForLoadState("networkidle");
  const loaded: string[] = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .map((e) => new URL(e.name).pathname)
      .filter(
        (p) => p.startsWith("/_next/static/chunks/") && p.endsWith(".js"),
      ),
  );
  return loaded.filter((p) => !initial.has(p));
}

test("the engine and sandbox load lazily within 100 KB, the Hub within 60 KB more", async ({
  page,
  request,
}) => {
  const sandbox = await lateChunks(page, "/capstones/b1", () =>
    expect(terminal(page)).toBeVisible(),
  );
  const hubPage = await page.context().newPage();
  const withHub = await lateChunks(hubPage, "/capstones/b6", () =>
    expect(hubPage.getByRole("region", { name: /Hub/ }).first()).toBeVisible(),
  );
  const hubOnly = withHub.filter((p) => !sandbox.includes(p));
  const engine = await compressed(request, sandbox);
  const hub = await compressed(request, hubOnly);
  report("JS engine and sandbox", `${kb(engine.br)} brotli`);
  report("JS Hub", `${kb(hub.br)} brotli`);
  expect(sandbox.length).toBeGreaterThan(0);
  expect(engine.br).toBeLessThanOrEqual(BUDGET.sandboxJs);
  expect(hub.br).toBeLessThanOrEqual(BUDGET.hubJs);
});

for (const path of ["/", "/learn/b1-1"]) {
  test(`fonts on ${path} stay within three families and 150 KB`, async ({
    page,
  }) => {
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);
    const { bytes, families } = await page.evaluate(() => ({
      bytes: performance
        .getEntriesByType("resource")
        .filter((e) => e.name.endsWith(".woff2"))
        .reduce(
          (sum, e) => sum + (e as PerformanceResourceTiming).encodedBodySize,
          0,
        ),
      families: [
        ...new Set(
          [...document.fonts]
            .filter((f) => f.status === "loaded" && !/Fallback/.test(f.family))
            .map((f) => f.family),
        ),
      ],
    }));
    report(`Fonts ${path}`, `${kb(bytes)}, ${families.join(", ")}`);
    expect(families.length).toBeLessThanOrEqual(BUDGET.families);
    expect(bytes).toBeLessThanOrEqual(BUDGET.fonts);
  });
}

for (const path of ["/", "/learn/b1-1"]) {
  test(`lab LCP and CLS on ${path} (4x CPU, mobile network)`, async ({
    page,
  }) => {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 150,
      downloadThroughput: (1.6 * 1024 * 1024) / 8,
      uploadThroughput: (750 * 1024) / 8,
    });
    await page.goto(path, { waitUntil: "load" });
    await page.waitForLoadState("networkidle");
    const { lcp, cls } = await page.evaluate(
      () =>
        new Promise<{ lcp: number; cls: number }>((resolve) => {
          let lcp = 0;
          let cls = 0;
          new PerformanceObserver((list) => {
            for (const e of list.getEntries()) lcp = Math.max(lcp, e.startTime);
          }).observe({ type: "largest-contentful-paint", buffered: true });
          new PerformanceObserver((list) => {
            for (const e of list.getEntries() as unknown as {
              value: number;
              hadRecentInput: boolean;
            }[])
              if (!e.hadRecentInput) cls += e.value;
          }).observe({ type: "layout-shift", buffered: true });
          setTimeout(() => resolve({ lcp, cls }), 500);
        }),
    );
    report(`LCP ${path}`, `${Math.round(lcp)} ms`);
    report(`CLS ${path}`, cls.toFixed(3));
    expect(lcp).toBeGreaterThan(0);
    expect(lcp).toBeLessThanOrEqual(BUDGET.lcp * TRIPWIRE);
    if (path !== "/") expect(cls).toBeLessThanOrEqual(BUDGET.cls * TRIPWIRE);
  });
}

test.describe("with motion", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" } });

  test("no frame over 50 ms while commands play", async ({ page }) => {
    await page.goto("/capstones/b4");
    await expect(terminal(page)).toBeVisible();
    await page.waitForLoadState("networkidle");
    const supported = await page.evaluate(() =>
      PerformanceObserver.supportedEntryTypes.includes("long-animation-frame"),
    );
    expect(supported).toBe(true);
    await page.evaluate(() => {
      const w = window as unknown as { frames$: number[] };
      w.frames$ = [];
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) w.frames$.push(e.duration);
      }).observe({ type: "long-animation-frame" });
    });
    await typeCommands(page, capstone.solution);
    await expectDone(page);
    await page.waitForTimeout(1500);
    const frames: number[] = await page.evaluate(
      () => (window as unknown as { frames$: number[] }).frames$,
    );
    const worst = Math.max(0, ...frames);
    report("Longest frame during commands", `${Math.round(worst)} ms`);
    expect(worst).toBeLessThanOrEqual(BUDGET.frame * TRIPWIRE);
  });
});
