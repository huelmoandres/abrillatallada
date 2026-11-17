export const siteConfig = {
  name: "Abril Latallada D’Elias",
  title: "Abogada en Rocha | Abril Latallada D’Elias",
  description:
    "Prepará tu primera consulta con Abril Latallada D’Elias, abogada en Rocha, Uruguay. Guías por tema y un mensaje que podés revisar antes de compartir.",
  language: "es-UY",
  openGraphLocale: "es_UY",
  city: "Rocha",
  country: "Uruguay",
  role: "Abogada",
  portraitImage: "/images/abril-graduation-original.jpeg",
  socialImage: {
    path: "/opengraph-image",
    width: 1200,
    height: 630,
    alt: "Abril Latallada D’Elias, abogada en Rocha, Uruguay",
  },
} as const;

export type SeoEnvironment = {
  SITE_URL?: string;
  SEO_INDEXABLE?: string;
  VERCEL_ENV?: string;
  VERCEL_URL?: string;
  NODE_ENV?: string;
};

export type SeoConfiguration = {
  siteUrl: URL | null;
  metadataBase: URL | undefined;
  canonicalUrl: string | undefined;
  indexable: boolean;
};

const reservedHosts = [
  "localhost",
  "local",
  "test",
  "invalid",
  "example",
  "example.com",
  "example.net",
  "example.org",
];

export function parsePublicOrigin(value: string | undefined): URL | null {
  if (!value?.trim()) return null;

  try {
    const url = new URL(value.trim());
    const hostname = url.hostname.toLowerCase();
    const reserved = reservedHosts.some(
      (host) => hostname === host || hostname.endsWith(`.${host}`),
    );
    const isIpAddress = /^[\d.]+$/.test(hostname) || hostname.includes(":");

    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      url.pathname !== "/" ||
      url.search ||
      url.hash ||
      !hostname.includes(".") ||
      reserved ||
      isIpAddress
    ) {
      return null;
    }

    return new URL(url.origin);
  } catch {
    return null;
  }
}

export function resolveSeoConfiguration(
  environment: SeoEnvironment = process.env,
): SeoConfiguration {
  const siteUrl = parsePublicOrigin(environment.SITE_URL);
  const deploymentUrl = environment.VERCEL_URL
    ? parsePublicOrigin(`https://${environment.VERCEL_URL}`)
    : null;
  const indexable = Boolean(
    siteUrl &&
      environment.SEO_INDEXABLE?.trim().toLowerCase() === "true" &&
      environment.NODE_ENV === "production" &&
      environment.VERCEL_ENV === "production",
  );

  return {
    siteUrl,
    metadataBase: siteUrl ?? deploymentUrl ?? undefined,
    canonicalUrl: indexable && siteUrl ? siteUrl.href : undefined,
    indexable,
  };
}

export const seoConfiguration = resolveSeoConfiguration();
