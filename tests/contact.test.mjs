import assert from "node:assert/strict";
import test from "node:test";
import {
  CONTACT_EMAIL,
  CONTACT_EMAIL_URL,
  INSTAGRAM_URL,
  LINKEDIN_URL,
  WHATSAPP_MESSAGE,
  normalizeWhatsAppNumber,
  resolveContactConfiguration,
} from "../src/lib/contact.ts";

test("confirmed business channels include the owner's WhatsApp number by default", () => {
  const contact = resolveContactConfiguration();
  assert.equal(CONTACT_EMAIL, "dra.latallada@gmail.com");
  assert.equal(CONTACT_EMAIL_URL, "mailto:dra.latallada@gmail.com");
  assert.equal(contact.emailUrl, CONTACT_EMAIL_URL);
  assert.equal(contact.instagramUrl, "https://www.instagram.com/dra.latalladadelias/");
  assert.equal(contact.instagramUrl, INSTAGRAM_URL);
  assert.equal(contact.linkedinUrl, "https://www.linkedin.com/in/abril-latallada-d%E2%80%99el%C3%ADas-356727272/");
  assert.equal(contact.linkedinUrl, LINKEDIN_URL);
  const whatsapp = new URL(contact.whatsappUrl);
  assert.equal(whatsapp.origin, "https://wa.me");
  assert.equal(whatsapp.pathname, "/59891958662");
  assert.equal(whatsapp.searchParams.get("text"), WHATSAPP_MESSAGE);
  assert.equal(resolveContactConfiguration({ WHATSAPP_NUMBER: undefined }).whatsappUrl, contact.whatsappUrl);
});

test("international numbers accept a plus sign, spaces, or dashes", () => {
  for (const number of ["59898142637", "+59898142637", "  +598 98 142 637  ", "+598-98-142-637"]) {
    assert.equal(normalizeWhatsAppNumber(number), "59898142637", number);
  }
  assert.equal(normalizeWhatsAppNumber("+34 612 345 678"), "34612345678");
});

test("explicitly blank, local, malformed, and placeholder overrides never produce a WhatsApp URL", () => {
  for (const number of [
    "", "   ", "despues lo coloco", "YOUR_NUMBER", "099 142 637", "98 142 637",
    "+598", "00000000000", "+59800000000", "99999999999", "1234567890", "1234567890123456",
    "https://wa.me/59898142637", "++59898142637", "59898142637?text=otro", "59898142637&text=otro",
  ]) {
    assert.equal(normalizeWhatsAppNumber(number), null, String(number));
    assert.equal(resolveContactConfiguration({ WHATSAPP_NUMBER: number }).whatsappUrl, null, String(number));
  }
  assert.equal(normalizeWhatsAppNumber(undefined), null);
});

test("the WhatsApp link preserves one encoded professional message without extra parameters", () => {
  const { whatsappUrl } = resolveContactConfiguration({ WHATSAPP_NUMBER: "+598 98 142 637" });
  const url = new URL(whatsappUrl);
  assert.equal(url.origin, "https://wa.me");
  assert.equal(url.pathname, "/59898142637");
  assert.deepEqual([...url.searchParams.keys()], ["text"]);
  assert.equal(url.searchParams.get("text"), WHATSAPP_MESSAGE);
  assert.match(whatsappUrl, /consulta%20jur%C3%ADdica/);
  assert.equal(url.hash, "");
});
