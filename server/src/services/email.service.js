import nodemailer from "nodemailer";
import { env } from "../config/env.js";

let transporter = null;

export function getEmailTransporter() {
  if (transporter) return transporter;

  const user = env.SMTP_USER || env.ADMIN_EMAIL || "admin@theeditingtable.com";
  const pass = env.SMTP_PASS || env.GMAIL_APP_PASSWORD || "btvcziekfcdrtguj";

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user,
      pass
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  return transporter;
}

export async function sendEmail({ to, subject, html, text }) {
  try {
    const t = getEmailTransporter();
    const from = env.EMAIL_FROM || `The Editing Table <${env.SMTP_USER || env.ADMIN_EMAIL || "admin@theeditingtable.com"}>`;
    const info = await t.sendMail({
      from,
      to,
      subject,
      text,
      html
    });
    console.log(`[EMAIL] Message sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[EMAIL] Failed to send email to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
}
