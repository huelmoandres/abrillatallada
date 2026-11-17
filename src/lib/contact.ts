export const CONTACT_EMAIL = "dra.latallada@gmail.com";
export const CONTACT_EMAIL_URL = `mailto:${CONTACT_EMAIL}`;
export const OFFICE_ADDRESS = {
  streetAddress: "Avenida Monterroso y Manuel Freire",
  locality: "Rocha",
  region: "Rocha",
  country: "Uruguay",
  countryCode: "UY",
} as const;
export const OFFICE_LOCALITY = `${OFFICE_ADDRESS.locality}, ${OFFICE_ADDRESS.region}, ${OFFICE_ADDRESS.country}`;
export const OFFICE_MAP_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${OFFICE_ADDRESS.streetAddress}, ${OFFICE_LOCALITY}`)}`;
export const INSTAGRAM_HANDLE = "@dra.latalladadelias";
export const INSTAGRAM_URL = "https://www.instagram.com/dra.latalladadelias/";
export const LINKEDIN_URL = "https://www.linkedin.com/in/abril-latallada-d%E2%80%99el%C3%ADas-356727272/";
export const WHATSAPP_NUMBER = "59891958662";
export const WHATSAPP_MESSAGE = "Hola, Abril. Quisiera coordinar una consulta jurídica. ¿Podrías indicarme tu disponibilidad y la modalidad de atención? Muchas gracias.";

export type ContactEnvironment = Readonly<{ WHATSAPP_NUMBER?: string }>;

export type ContactConfiguration = Readonly<{
  emailUrl: string;
  instagramUrl: string;
  linkedinUrl: string;
  whatsappUrl: string | null;
}>;

export function normalizeWhatsAppNumber(value: string | undefined): string | null {
  const candidate = value?.trim();
  if (!candidate || !/^\+?[1-9][\d -]*$/.test(candidate)) return null;

  const digits = candidate.replace(/[ -]/g, "").replace(/^\+/, "");
  if (digits.length < 10 || digits.length > 15) return null;

  // Reject obvious placeholders while requiring an international number.
  if (/(\d)\1{6}$/.test(digits)) return null;
  if ("12345678901234567890".includes(digits) || "98765432109876543210".includes(digits)) return null;

  return digits;
}

export function resolveContactConfiguration(environment: ContactEnvironment = {}): ContactConfiguration {
  const number = normalizeWhatsAppNumber(environment.WHATSAPP_NUMBER ?? WHATSAPP_NUMBER);

  return {
    emailUrl: CONTACT_EMAIL_URL,
    instagramUrl: INSTAGRAM_URL,
    linkedinUrl: LINKEDIN_URL,
    whatsappUrl: number ? `https://wa.me/${number}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}` : null,
  };
}
