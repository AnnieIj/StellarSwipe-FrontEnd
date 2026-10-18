import { ImageResponse } from "next/og";

export const alt = "StellarSwipe";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-50%",
            right: "-20%",
            width: "800px",
            height: "800px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-30%",
            left: "-10%",
            width: "600px",
            height: "600px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
            zIndex: 1,
          }}
        >
          <div
            style={{
              fontSize: "80px",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              color: "#f8fafc",
              fontFamily: "system-ui, sans-serif",
              textAlign: "center",
            }}
          >
            StellarSwipe
          </div>
          <div
            style={{
              fontSize: "28px",
              color: "#94a3b8",
              fontWeight: 500,
              fontFamily: "system-ui, sans-serif",
              textAlign: "center",
              maxWidth: "600px",
            }}
          >
            Discover top signal providers, trade tokens, and track performance
            on the Stellar network.
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
