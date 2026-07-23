import React, { useState } from "react";
import StablecoinStaking from "./StablecoinStaking";
import PawlyStaking from "./PawlyStaking";
import PawlyLogo from "./PawlyLogo";

export default function Staking() {
  const [activeTab, setActiveTab] = useState<"stablecoin" | "pawly">(
    "stablecoin"
  );

  return (
    <div style={{ maxWidth: "920px", margin: "0 auto", padding: "20px" }}>
      {/* ==================== Logo ==================== */}
      <PawlyLogo />

      {/* Tab 切换按钮 */}
      <div
        style={{
          display: "flex",
          borderBottom: "2px solid #333",
          marginBottom: "25px",
        }}
      >
        <button
          onClick={() => setActiveTab("stablecoin")}
          style={{
            flex: 1,
            padding: "16px",
            background: activeTab === "stablecoin" ? "#00ff9d" : "transparent",
            color: activeTab === "stablecoin" ? "black" : "#fff",
            border: "none",
            fontSize: "16px",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          Stake Stablecoins (USDC / USDT)
        </button>
        <button
          onClick={() => setActiveTab("pawly")}
          style={{
            flex: 1,
            padding: "16px",
            background: activeTab === "pawly" ? "#00ff9d" : "transparent",
            color: activeTab === "pawly" ? "black" : "#fff",
            border: "none",
            fontSize: "16px",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          Stake PAWLY
        </button>
      </div>

      {/* 内容区域 */}
      <div>
        {activeTab === "stablecoin" && <StablecoinStaking />}
        {activeTab === "pawly" && <PawlyStaking />}
      </div>
    </div>
  );
}
