import nodemailer from "nodemailer";
import { env } from "../config/env.js";

let transporter = null;

export function getEmailTransporter() {
  if (transporter) return transporter;

  const user = (env.SMTP_USER || env.ADMIN_EMAIL || "").trim();
  const rawPass = env.SMTP_PASS || env.GMAIL_APP_PASSWORD || "";
  // Strip any spaces from the app password (e.g., "dkss udrq duul etjp" -> "dkssudrqduuletjp")
  const pass = String(rawPass).replace(/\s+/g, "").trim();

  // If host/port are provided and not standard gmail, use SMTP config, otherwise use gmail service
  if (env.SMTP_HOST && env.SMTP_HOST !== "smtp.gmail.com") {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: Number(env.SMTP_PORT) || 587,
      secure: Number(env.SMTP_PORT) === 465,
      auth: {
        user,
        pass
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  } else {
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
  }

  return transporter;
}

export async function sendEmail({ to, subject, html, text }) {
  try {
    const t = getEmailTransporter();
    const defaultSender = env.SMTP_USER || env.ADMIN_EMAIL || "admin@theeditingtable.com";
    const from = env.EMAIL_FROM || `The Editing Table <${defaultSender}>`;
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

export async function sendOtpEmail({ to, otp, name = "Administrator" }) {
  const subject = `Your Admin 2FA Verification Code: ${otp} — The Editing Table`;
  const text = `Hello ${name},\n\nYour Two-Factor Authentication (2FA) verification code is: ${otp}\n\nThis single-use code will expire in 5 minutes.\n\nIf you did not initiate this login attempt to The Editing Table Admin Suite, please immediately review your account security.\n\n— The Editing Table Team`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your 2FA Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FBF7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #2F3A2F; line-height: 1.6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FBF7; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #FFFFFF; border-radius: 20px; border: 1px solid #E3EBDD; overflow: hidden; box-shadow: 0 4px 24px rgba(47, 58, 47, 0.06);">
          <!-- Header -->
          <tr>
            <td style="padding: 36px 36px 24px 36px; text-align: center; border-bottom: 1px solid #F0F4ED;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; color: #2F3A2F;">
                The Editing Table
              </h1>
              <p style="margin: 6px 0 0 0; font-size: 11px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; color: #8FAE7B;">
                Admin Control Authentication
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px 36px;">
              <p style="margin: 0 0 16px 0; font-size: 14px; color: #2F3A2F;">
                Hello <strong>${name}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 13px; color: #687567; line-height: 1.6;">
                Use the single-use 6-digit verification code below to complete your sign-in to the CMS Master Control Suite:
              </p>

              <!-- OTP Code Display Card -->
              <div style="background-color: #F6F8F4; border: 1px solid #E3EBDD; border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <span style="display: block; font-size: 10px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: #8FAE7B; margin-bottom: 8px;">
                  Your Verification Code
                </span>
                <span style="display: inline-block; font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 0.35em; color: #2F3A2F; text-indent: 0.35em;">
                  ${otp}
                </span>
                <p style="margin: 12px 0 0 0; font-size: 11px; color: #8F9E8E;">
                  Valid for <strong>5 minutes</strong> &bull; Single-use only
                </p>
              </div>

              <div style="background-color: #FFFDF9; border-left: 3px solid #C8D8BE; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 12px; color: #687567;">
                  <strong>Security Note:</strong> Never share this code with anyone. The Editing Table team will never request your verification code.
                </p>
              </div>

              <p style="margin: 0; font-size: 11px; color: #9AA898; line-height: 1.5;">
                If you did not attempt to sign in to your administrator account, you can safely ignore this email. Someone may have mistyped their credentials.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 36px; background-color: #FAFBF9; border-top: 1px solid #F0F4ED; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #A3B1A2;">
                &copy; ${new Date().getFullYear()} The Editing Table. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  return sendEmail({ to, subject, html, text });
}
