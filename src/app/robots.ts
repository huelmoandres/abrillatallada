import type { MetadataRoute } from "next";
import { seoConfiguration } from "@/lib/site-config";

export default function robots(): MetadataRoute.Robots {
  return {
    // Crawlers must reach the page to read its noindex metadata.
    rules: { userAgent: "*", allow: "/" },
    ...(seoConfiguration.indexable && seoConfiguration.siteUrl
      ? { sitemap: new URL("/sitemap.xml", seoConfiguration.siteUrl).href }
      : {}),
  };
}
