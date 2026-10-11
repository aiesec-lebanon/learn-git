import type { MetadataRoute } from "next";
import { sitePaths } from "@/content/site-map";
import { SITE_URL } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  return sitePaths().map((path) => ({ url: new URL(path, SITE_URL).href }));
}
