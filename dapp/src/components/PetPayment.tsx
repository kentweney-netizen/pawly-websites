export default function PetPayment() {
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
        💳 PAWLY 宠物支付系统 / Pet Payment
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
          <strong>中文：</strong>未来你可以用 PAWLY
          直接支付宠物相关消费，包括宠物店购物、兽医诊所、宠物美容寄宿等。
        </p>
        <p>
          <strong>English：</strong>In the future, you can use PAWLY to pay for
          pet-related expenses, including pet store shopping, veterinary
          clinics, grooming & boarding services.
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
        PAWLY 支付系统-PAWLY PetPayment
      </p>
    </div>
  );
}
