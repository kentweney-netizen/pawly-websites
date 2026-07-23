export default function PawlyStaking() {
    return (
      <div
        style={{
          background: "#0f0f23",
          border: "2px solid #333",
          borderRadius: "20px",
          padding: "40px",
          textAlign: "center",
        }}
      >
        <h2 style={{ color: "#00ff9d", marginBottom: "20px" }}>
          🐾 PAWLY 质押挖矿
        </h2>
  
        <div
          style={{
            background: "rgba(255,255,255,0.05)",
            padding: "25px",
            borderRadius: "16px",
            marginBottom: "30px",
            textAlign: "left",
            lineHeight: "1.7",
          }}
        >
          <p>
            <strong>中文：</strong>质押 PAWLY 即可获得额外奖励。Staking 功能将在
            PAWLY 正式上线并达到一定社区规模后开放。
          </p>
          <p>
            <strong>English：</strong>Stake your PAWLY tokens to earn additional
            rewards. Staking feature will be enabled after PAWLY launches and
            reaches sufficient community size.
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
  
        <p style={{ color: "#888", fontSize: "0.9em", marginTop: "25px" }}>
          PAWLY 正式上线的质押系统
        </p>
      </div>
    );
  }