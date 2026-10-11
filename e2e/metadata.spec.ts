import { sitePaths } from "../content/site-map";
import { expect, test } from "./fixtures";

test("sitemap, robots and the social image are served", async ({
  request,
  page,
}) => {
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBe(true);
  const xml = await sitemap.text();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    ([, url = ""]) => new URL(url).pathname,
  );
  expect(locs).toEqual(sitePaths());

  const robots = await request.get("/robots.txt");
  expect(await robots.text()).toMatch(
    /Sitemap: https?:\/\/[^\s]+\/sitemap\.xml/,
  );

  await page.goto("/learn/b1-1");
  const image = page.locator('meta[property="og:image"]');
  const url = await image.getAttribute("content");
  expect(url).toMatch(/\/opengraph-image/);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    /interactive Git lesson/,
  );
  const png = await request.get(new URL(url ?? "").pathname);
  expect(png.headers()["content-type"]).toBe("image/png");
});
