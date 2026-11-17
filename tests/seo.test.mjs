import assert from "node:assert/strict";
import test from "node:test";
import { parsePublicOrigin, resolveSeoConfiguration } from "../src/lib/site-config.ts";

const production = {
  NODE_ENV: "production",
  VERCEL_ENV: "production",
  SITE_URL: "https://firma-de-prueba.uy",
  SEO_INDEXABLE: "true",
};

test("production indexing requires a real configured origin and explicit opt-in", () => {
  const configured = resolveSeoConfiguration(production);
  assert.equal(configured.indexable, true);
  assert.equal(configured.canonicalUrl, "https://firma-de-prueba.uy/");
  assert.equal(resolveSeoConfiguration({ ...production, SITE_URL: "" }).indexable, false);
  assert.equal(resolveSeoConfiguration({ ...production, SEO_INDEXABLE: "false" }).indexable, false);
  assert.equal(resolveSeoConfiguration({ ...production, SEO_INDEXABLE: undefined }).indexable, false);
});

test("preview and local builds stay noindex even with a production URL", () => {
  for (const environment of ["preview", "development", undefined]) {
    const configured = resolveSeoConfiguration({ ...production, VERCEL_ENV: environment });
    assert.equal(configured.indexable, false);
    assert.equal(configured.canonicalUrl, undefined);
  }
  assert.equal(resolveSeoConfiguration({ ...production, NODE_ENV: "development" }).indexable, false);
  assert.equal(resolveSeoConfiguration({}).indexable, false);
});

test("invalid, local, credential-bearing, and non-origin URLs never become canonical", () => {
  for (const origin of [
    "not-a-url",
    "http://firma-de-prueba.uy",
    "https://localhost",
    "https://127.0.0.1",
    "https://[::1]",
    "https://example.com",
    "https://app.test",
    "https://user:secret@firma-de-prueba.uy",
    "https://firma-de-prueba.uy/consulta",
    "https://firma-de-prueba.uy?preview=true",
    "https://firma-de-prueba.uy#inicio",
  ]) {
    assert.equal(parsePublicOrigin(origin), null, origin);
    assert.equal(resolveSeoConfiguration({ ...production, SITE_URL: origin }).indexable, false, origin);
  }
});

test("a deployment origin supports social metadata without declaring a canonical domain", () => {
  const configured = resolveSeoConfiguration({
    NODE_ENV: "production",
    VERCEL_ENV: "preview",
    VERCEL_URL: "preview-fixture.vercel.app",
  });
  assert.equal(configured.metadataBase.href, "https://preview-fixture.vercel.app/");
  assert.equal(configured.canonicalUrl, undefined);
  assert.equal(configured.indexable, false);
  assert.equal(resolveSeoConfiguration({ VERCEL_URL: "localhost:3000" }).metadataBase, undefined);
});
