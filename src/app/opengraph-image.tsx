import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { siteConfig } from "@/lib/site-config";

export const alt = siteConfig.socialImage.alt;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const [bodoniFont, dmSansFont] = await Promise.all([
  readFile(join(process.cwd(), "src/app/fonts/bodoni-moda.ttf")),
  readFile(join(process.cwd(), "src/app/fonts/dm-sans.ttf")),
]);

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: "58px 66px 46px",
          color: "#35443c",
          background: "#fbfaf7",
          fontFamily: "DM Sans",
          fontWeight: 400,
          border: "18px solid #ffffff",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            color: "#7d6a4b",
            fontSize: 20,
          }}
        >
          <div style={{ display: "flex", width: 36, height: 2, background: "#a1ad96" }} />
          Abogada en Rocha, Uruguay
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 55 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              fontFamily: "Bodoni",
              fontSize: 73,
              lineHeight: 1.16,
              letterSpacing: -2.5,
            }}
          >
            <div style={{ display: "flex" }}>Abril Latallada</div>
            <div style={{ display: "flex" }}>D’Elias.</div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: 365,
              padding: "34px 30px",
              background: "#eaf0e8",
              borderRadius: 8,
              fontFamily: "Bodoni",
              fontSize: 42,
              lineHeight: 1.22,
              letterSpacing: -1,
            }}
          >
            <div style={{ display: "flex" }}>Hablemos de</div>
            <div style={{ display: "flex" }}>lo que necesitás</div>
            <div style={{ display: "flex" }}>resolver.</div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            paddingTop: 24,
            borderTop: "1px solid #dadfd6",
            fontSize: 20,
            color: "#5c685f",
          }}
        >
          Asesoramiento jurídico, de persona a persona.
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Bodoni", data: bodoniFont, style: "normal", weight: 400 },
        { name: "DM Sans", data: dmSansFont, style: "normal", weight: 400 },
      ],
    },
  );
}
