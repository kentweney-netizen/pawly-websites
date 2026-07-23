import React from "react";

export default function PawlyLogo() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        marginBottom: "28px",
        marginTop: "8px",
      }}
    >
      <div
        style={{
          position: "relative",
          maxWidth: "680px",
          width: "100%",
          borderRadius: "20px",
          overflow: "hidden",
          boxShadow: "0 0 35px rgba(0, 255, 157, 0.3)",
          border: "2px solid #00ff9d",
        }}
      >
        <img
          src="/pawly-logo.png.jpg"
          alt="PAWLY - Payment • Charity"
          style={{
            width: "100%",
            height: "auto",
            display: "block",
          }}
        />

        {/* 轻微暗角，增强科技感 */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at center, transparent 55%, rgba(0,0,0,0.28) 100%)",
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );
}
