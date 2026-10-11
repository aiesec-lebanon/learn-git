type Env = Readonly<Record<string, string | undefined>>;

/** The site's origin: Vercel's production domain (or this deployment's) at build time, else localhost. */
export function siteOrigin(env: Env): URL {
  const host = env.VERCEL_PROJECT_PRODUCTION_URL || env.VERCEL_URL;
  return new URL(host ? `https://${host}` : "http://localhost:3000");
}

/** The one place the public URL comes from (metadataBase, sitemap, robots). */
export const SITE_URL = siteOrigin(process.env);
