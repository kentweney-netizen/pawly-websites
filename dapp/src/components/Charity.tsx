export default function Charity() {
  return (
    <div
      style={{
        background: "rgba(0, 255, 157, 0.06)",
        border: "2px solid #00ff9d",
        borderRadius: "20px",
        padding: "30px",
        maxWidth: "700px",
        margin: "0 auto",
        textAlign: "center",
      }}
    >
      <h2 style={{ color: "#00ff9d", marginBottom: "20px" }}>
        ❤️ PAWLY 宠物慈善基金 / Charity
      </h2>

      <div
        style={{
          background: "rgba(255,255,255,0.05)",
          padding: "25px",
          borderRadius: "16px",
          marginBottom: "25px",
          textAlign: "left",
          lineHeight: "1.7",
        }}
      >
        <p>
          <strong>中文：</strong>PAWLY
          将设立宠物慈善基金，用于帮助流浪动物、支持动物保护组织，以及推动宠物福利事业。
        </p>
        <p>
          <strong>English：</strong>PAWLY will establish a pet charity fund to
          help stray animals, support animal protection organizations, and
          promote pet welfare.
        </p>
      </div>

      <button
        disabled
        style={{
          background: "#333",
          color: "#888",
          padding: "16px 50px",
          border: "none",
          borderRadius: "14px",
          fontSize: "1.1em",
          cursor: "not-allowed",
        }}
      >
        即将开放 / Coming Soon
      </button>

      <p style={{ color: "#888", fontSize: "0.9em", marginTop: "20px" }}>
        Pawly 慈善功能-Pawly Charity
      </p>
    </div>
  );
}
