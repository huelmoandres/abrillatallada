export type ConsultationEmailInput = Readonly<{
  name: string;
  contact: string;
  topicLabel: string;
  message: string;
  siteUrl: string;
}>;

export type ConsultationEmail = Readonly<{ html: string; text: string; subject: string }>;

export function escapeEmailHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]!);
}

function publicOrigin(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.port || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("Email assets require a public HTTPS origin.");
  }
  return url;
}

export function renderConsultationEmail(input: ConsultationEmailInput): ConsultationEmail {
  const origin = publicOrigin(input.siteUrl);
  const siteUrl = escapeEmailHtml(origin.href);
  const hostname = escapeEmailHtml(origin.hostname);
  const logoUrl = escapeEmailHtml(new URL("/brand/logo-dark.png", origin).href);
  const name = escapeEmailHtml(input.name.trim());
  const contact = escapeEmailHtml(input.contact.trim());
  const topic = escapeEmailHtml(input.topicLabel.trim());
  const message = escapeEmailHtml(input.message.trim()).replace(/\r\n?|\n/g, "<br />");
  const subject = `Nueva consulta desde la web · ${input.topicLabel.replace(/[\r\n]/g, " ").trim()}`;
  const text = [
    "Abril Latallada D’Elias · Abogada",
    `Nueva consulta desde ${origin.hostname}`,
    "",
    `Nombre: ${input.name.trim()}`,
    `Teléfono: ${input.contact.trim()}`,
    `Tema: ${input.topicLabel.trim()}`,
    "",
    "Mensaje:",
    input.message.trim(),
    "",
    "La persona autorizó el envío de esta consulta desde el formulario de la web.",
    origin.href,
  ].join("\n");

  const html = `<!doctype html>
<html lang="es-UY">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><meta name="color-scheme" content="light" /><title>Nueva consulta · Abril Latallada</title></head>
<body style="margin:0;padding:0;background-color:#f1f3ec;color:#35443c;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;">
  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all;">${name} envió una consulta desde ${hostname}.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;background-color:#f1f3ec;">
    <tr><td align="center" style="padding:32px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;border-collapse:separate;background-color:#ffffff;border:1px solid #dce2d6;border-radius:12px;overflow:hidden;">
        <tr><td align="center" style="padding:30px 28px 24px;border-bottom:1px solid #e4e8df;">
          <a href="${siteUrl}" style="text-decoration:none;"><img src="${logoUrl}" width="170" height="88" alt="Abril Latallada D’Elias · Abogada" border="0" style="display:block;width:170px;max-width:100%;height:auto;margin:0 auto;color:#35443c;font:16px Georgia,serif;" /></a>
          <p style="margin:14px 0 0;color:#67735f;font-size:11px;line-height:1.6;">Abril Latallada D’Elias · Abogada en Rocha</p>
        </td></tr>
        <tr><td style="padding:32px 28px 30px;background-color:#eaf0e8;">
          <p style="margin:0 0 14px;font-size:12px;line-height:1.5;color:#637557;">Formulario de contacto</p>
          <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:35px;line-height:1.16;font-weight:400;color:#35443c;">Una nueva consulta,<br />Abril.</h1>
          <p style="margin:18px 0 0;font-size:14px;line-height:1.8;color:#53634c;">${name} se puso en contacto desde tu web. Estos son los datos y el mensaje que compartió.</p>
        </td></tr>
        <tr><td style="padding:28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;font-size:14px;line-height:1.7;">
            <tr><td colspan="2" style="padding:0 0 7px;font-size:11px;color:#6d7965;">Nombre</td></tr>
            <tr><td colspan="2" style="padding:0 0 17px;border-bottom:1px solid #e5e9e0;color:#35443c;word-break:break-word;">${name}</td></tr>
            <tr><td colspan="2" style="padding:17px 0 7px;font-size:11px;color:#6d7965;">Teléfono de contacto</td></tr>
            <tr><td colspan="2" style="padding:0 0 17px;border-bottom:1px solid #e5e9e0;color:#35443c;word-break:break-word;">${contact}</td></tr>
            <tr><td colspan="2" style="padding:17px 0 7px;font-size:11px;color:#6d7965;">Tema de la consulta</td></tr>
            <tr><td colspan="2" style="padding:0 0 22px;color:#35443c;">${topic}</td></tr>
          </table>
          <h2 style="margin:4px 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:25px;line-height:1.3;font-weight:400;color:#35443c;">Lo que quiere consultar.</h2>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:separate;background-color:#f8f7f2;border:1px solid #e8e6dc;border-radius:7px;">
            <tr><td style="padding:20px;font-size:14px;line-height:1.9;color:#43503c;word-break:break-word;overflow-wrap:anywhere;">${message}</td></tr>
          </table>
          <p style="margin:20px 0 0;font-size:12px;line-height:1.8;color:#66725e;">Para continuar la conversación, usá el teléfono que indicó la persona.</p>
        </td></tr>
        <tr><td style="padding:22px 28px;background-color:#fbfaf7;border-top:1px solid #e4e8df;">
          <p style="margin:0;font-size:11px;line-height:1.8;color:#6c7664;">Este correo reúne los datos que la persona autorizó a compartir desde el formulario de tu web.</p>
          <p style="margin:13px 0 0;font-size:12px;line-height:1.6;"><a href="${siteUrl}" style="color:#52664a;text-decoration:underline;">${hostname}</a></p>
        </td></tr>
      </table>
      <p style="margin:20px 0 0;font-size:11px;line-height:1.7;color:#76816d;">Asesoramiento jurídico, de persona a persona.</p>
    </td></tr>
  </table>
</body></html>`;

  return { html, text, subject };
}
