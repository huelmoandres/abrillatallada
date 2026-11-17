import assert from "node:assert/strict";
import test from "node:test";
import { renderConsultationEmail } from "../src/lib/email/consultation-template.ts";

const input = {
  name: "Una persona",
  contact: "+59891383578",
  topicLabel: "Derecho civil",
  message: "Quisiera coordinar una consulta.\nTengo algunas preguntas.",
  siteUrl: "https://abrillatallada.uy",
};

test("branded email includes the absolute logo, actual fields and a plain-text version", () => {
  const { html, text, subject } = renderConsultationEmail(input);
  assert.match(html, /https:\/\/abrillatallada\.uy\/brand\/logo-dark\.png/);
  assert.match(html, /alt="Abril Latallada D’Elias · Abogada"/);
  assert.match(html, /Quisiera coordinar una consulta\.<br \/>Tengo algunas preguntas\./);
  assert.match(text, /Teléfono: \+59891383578/);
  assert.match(text, /Quisiera coordinar una consulta\.\nTengo algunas preguntas\./);
  assert.match(subject, /Derecho civil/);
});

test("all visitor-provided HTML is escaped, including quotes and links", () => {
  const { html } = renderConsultationEmail({ ...input, name: '<img src=x onerror="alert(1)">', contact: '" & <a href="https://bad.invalid">x</a>', message: "<script>alert('test')</script>\n<a>Texto</a>" });
  assert.doesNotMatch(html, /<script|onerror="|href="https:\/\/bad\.invalid/);
  assert.match(html, /&lt;script&gt;alert\(&#39;test&#39;\)&lt;\/script&gt;/);
  assert.match(html, /&quot; &amp; &lt;a/);
});

test("email assets require an HTTPS origin without credentials or injected paths", () => {
  for (const siteUrl of ["http://abrillatallada.uy", "https://user:password@abrillatallada.uy", "https://abrillatallada.uy/path", "https://abrillatallada.uy/?x=1"]) {
    assert.throws(() => renderConsultationEmail({ ...input, siteUrl }));
  }
});
