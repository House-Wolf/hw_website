import { ImageResponse } from "next/og";
import fs from "fs";
import path from "path";
import { getInvitation } from "@/lib/invitations";

export const runtime = "nodejs";
export const alt = "House Wolf — Invitation to the Pack";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = { params: Promise<{ code: string }> };

export default async function Image({ params }: Props) {
  const { code } = await params;
  const invitation = getInvitation(code);

  const iconBuffer = fs.readFileSync(
    path.join(process.cwd(), "public/images/global/HWiconnew.png"),
  );
  const iconSrc = `data:image/png;base64,${iconBuffer.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background: "linear-gradient(180deg, #020607 0%, #071012 50%, #020607 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* Red glow — top-left */}
        <div
          style={{
            position: "absolute",
            top: -60,
            left: -60,
            width: 520,
            height: 400,
            display: "flex",
            background: "radial-gradient(circle, rgba(138,0,0,0.52) 0%, transparent 70%)",
          }}
        />

        {/* Cyan glow — top-right */}
        <div
          style={{
            position: "absolute",
            top: -60,
            right: -60,
            width: 520,
            height: 400,
            display: "flex",
            background: "radial-gradient(circle, rgba(17,78,98,0.58) 0%, transparent 70%)",
          }}
        />

        {/* Corner — top-left (cyan) */}
        <div style={{ position: "absolute", top: 36, left: 36, display: "flex", width: 64, height: 64 }}>
          <div style={{ position: "absolute", top: 0, left: 0, width: 64, height: 2, display: "flex", background: "rgba(96,210,230,0.78)" }} />
          <div style={{ position: "absolute", top: 0, left: 0, width: 2, height: 64, display: "flex", background: "rgba(96,210,230,0.78)" }} />
        </div>

        {/* Corner — top-right (cyan) */}
        <div style={{ position: "absolute", top: 36, right: 36, display: "flex", width: 64, height: 64 }}>
          <div style={{ position: "absolute", top: 0, right: 0, width: 64, height: 2, display: "flex", background: "rgba(96,210,230,0.78)" }} />
          <div style={{ position: "absolute", top: 0, right: 0, width: 2, height: 64, display: "flex", background: "rgba(96,210,230,0.78)" }} />
        </div>

        {/* Corner — bottom-left (red) */}
        <div style={{ position: "absolute", bottom: 36, left: 36, display: "flex", width: 64, height: 64 }}>
          <div style={{ position: "absolute", bottom: 0, left: 0, width: 64, height: 2, display: "flex", background: "rgba(164,0,0,0.88)" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, width: 2, height: 64, display: "flex", background: "rgba(164,0,0,0.88)" }} />
        </div>

        {/* Corner — bottom-right (red) */}
        <div style={{ position: "absolute", bottom: 36, right: 36, display: "flex", width: 64, height: 64 }}>
          <div style={{ position: "absolute", bottom: 0, right: 0, width: 64, height: 2, display: "flex", background: "rgba(164,0,0,0.88)" }} />
          <div style={{ position: "absolute", bottom: 0, right: 0, width: 2, height: 64, display: "flex", background: "rgba(164,0,0,0.88)" }} />
        </div>

        {/* Main content row */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 88px",
            gap: 60,
          }}
        >
          {/* HW Crest with aura */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              width: 240,
              height: 240,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                position: "absolute",
                width: 300,
                height: 300,
                borderRadius: "50%",
                display: "flex",
                background:
                  "radial-gradient(circle, rgba(138,0,0,0.65) 0%, rgba(17,78,98,0.38) 38%, transparent 68%)",
              }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={iconSrc} width={220} height={220} alt="" style={{ position: "relative" }} />
          </div>

          {/* Vertical separator */}
          <div
            style={{
              width: 1,
              height: 340,
              display: "flex",
              flexShrink: 0,
              background:
                "linear-gradient(180deg, transparent, rgba(255,255,255,0.12) 25%, rgba(255,255,255,0.12) 75%, transparent)",
            }}
          />

          {/* Text panel */}
          <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>

            {/* Eyebrow */}
            <div
              style={{
                display: "flex",
                color: "rgba(96,210,230,0.82)",
                fontSize: 11,
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                marginBottom: 14,
              }}
            >
              HOUSE WOLF COMMAND · KAMPOSIAN DRAGOON MERCENARIES
            </div>

            {/* Headline */}
            <div
              style={{
                display: "flex",
                color: "#ffffff",
                fontSize: 76,
                fontWeight: 900,
                textTransform: "uppercase",
                lineHeight: 0.94,
                letterSpacing: "-0.01em",
              }}
            >
              INVITATION
            </div>
            <div
              style={{
                display: "flex",
                color: "#ffffff",
                fontSize: 76,
                fontWeight: 900,
                textTransform: "uppercase",
                lineHeight: 0.94,
                letterSpacing: "-0.01em",
              }}
            >
              TO THE PACK
            </div>

            {/* Divider */}
            <div
              style={{
                marginTop: 22,
                marginBottom: 18,
                height: 2,
                display: "flex",
                background:
                  "linear-gradient(90deg, rgba(164,0,0,1) 0%, rgba(96,210,230,0.7) 55%, transparent 100%)",
              }}
            />

            {/* Citizen handle — template literal avoids multi-node text children */}
            <div
              style={{
                display: "flex",
                color: "rgba(96,210,230,0.95)",
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 22,
              }}
            >
              {`Citizen · ${invitation.rsiHandle}`}
            </div>

            {/* CTA row */}
            <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 24 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: "linear-gradient(135deg, #a40000 0%, #6b0000 100%)",
                  border: "1px solid rgba(255,175,175,0.5)",
                  color: "#ffffff",
                  fontSize: 13,
                  fontWeight: 900,
                  textTransform: "uppercase",
                  letterSpacing: "0.2em",
                  padding: "11px 26px",
                  borderRadius: 5,
                }}
              >
                JOIN THE PACK
              </div>
              <div
                style={{
                  display: "flex",
                  color: "rgba(215,225,227,0.52)",
                  fontSize: 13,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                }}
              >
                HOUSEWOLF.CO
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
