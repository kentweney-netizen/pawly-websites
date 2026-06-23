// =====================================================
// PAWLY Pets - Email Sending Function (使用 Resend)
// 文件路径: netlify/functions/send-email.js
// =====================================================

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async (req, context) => {
  // 只允许 POST 请求
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const body = await req.json();
    const { email, subject, message } = body;

    // 验证必填字段
    if (!email || !subject || !message) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required fields: email, subject, message" 
        }),
        { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // 调用 Resend 发送邮件
    const { data, error } = await resend.emails.send({
      from: "PAWLY Pets <onboarding@resend.dev>", 
      to: [email],
      subject: subject,
      text: message,
    });

    if (error) {
      console.error("Resend 发送失败:", error);
      return new Response(
        JSON.stringify({ 
          error: error.message || "Failed to send email via Resend" 
        }),
        { 
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    console.log("✅ 邮件发送成功:", data);
    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: data?.id || null 
      }),
      { 
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );

  } catch (err) {
    console.error("Send-email Function 内部错误:", err);
    return new Response(
      JSON.stringify({ 
        error: "Internal Server Error" 
      }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
};
