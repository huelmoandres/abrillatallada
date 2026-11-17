import type { Metadata } from "next";
import { CONTACT_EMAIL, INSTAGRAM_URL, LINKEDIN_URL } from "@/lib/contact";
import { seoConfiguration, siteConfig } from "./site-config";

export const siteMetadata: Metadata = {
  metadataBase: seoConfiguration.metadataBase,
  applicationName: siteConfig.name,
  title: {
    default: siteConfig.title,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  authors: [{ name: siteConfig.name }],
  creator: siteConfig.name,
  category: "Servicios jurídicos",
  alternates: seoConfiguration.canonicalUrl
    ? { canonical: seoConfiguration.canonicalUrl }
    : undefined,
  openGraph: {
    type: "website",
    title: siteConfig.title,
    description: siteConfig.description,
    siteName: siteConfig.name,
    locale: siteConfig.openGraphLocale,
    url: seoConfiguration.canonicalUrl,
    images: [
      {
        url: siteConfig.socialImage.path,
        width: siteConfig.socialImage.width,
        height: siteConfig.socialImage.height,
        alt: siteConfig.socialImage.alt,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
    images: [
      {
        url: siteConfig.socialImage.path,
        alt: siteConfig.socialImage.alt,
      },
    ],
  },
  robots: {
    index: seoConfiguration.indexable,
    follow: seoConfiguration.indexable,
    googleBot: {
      index: seoConfiguration.indexable,
      follow: seoConfiguration.indexable,
      "max-image-preview": "large",
    },
  },
};

export function buildStructuredData() {
  const canonicalUrl = seoConfiguration.canonicalUrl;
  const personId = canonicalUrl
    ? new URL("#abril-latallada", canonicalUrl).href
    : "#abril-latallada";
  const websiteId = canonicalUrl
    ? new URL("#website", canonicalUrl).href
    : "#website";

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": personId,
        name: siteConfig.name,
        jobTitle: siteConfig.role,
        email: CONTACT_EMAIL,
        sameAs: [INSTAGRAM_URL, LINKEDIN_URL],
        workLocation: {
          "@type": "Place",
          name: `${siteConfig.city}, ${siteConfig.country}`,
        },
        ...(canonicalUrl
          ? {
              url: canonicalUrl,
              image: new URL(siteConfig.portraitImage, canonicalUrl).href,
            }
          : {}),
      },
      {
        "@type": "WebSite",
        "@id": websiteId,
        name: siteConfig.name,
        description: siteConfig.description,
        inLanguage: siteConfig.language,
        about: { "@id": personId },
        ...(canonicalUrl ? { url: canonicalUrl } : {}),
      },
    ],
  };
}
