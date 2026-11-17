import type { MetadataRoute } from "next";
import { seoConfiguration } from "@/lib/site-config";

export default function sitemap(): MetadataRoute.Sitemap {
  if (!seoConfiguration.indexable || !seoConfiguration.canonicalUrl) return [];

  return [{ url: seoConfiguration.canonicalUrl }];
}
