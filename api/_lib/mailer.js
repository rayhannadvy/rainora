import nodemailer from 'nodemailer';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }
  return transporter;
}

export async function sendOtpEmail(toEmail, otp, purpose) {
  const isProd = process.env.NODE_ENV === 'production';
  const purposeTitles = {
    'forgot-password': 'Password Reset Code',
    'change-password': 'Change Password Verification Code',
    'change-email': 'Email Verification Code',
  };

  const title = purposeTitles[purpose] || 'Verification Code';

  console.log('\n==================================================');
  console.log(`[RAINORA SECURITY] ${title}`);
  console.log(`To:      ${toEmail}`);
  console.log(`OTP:     ${otp}`);
  console.log(`Expires: 10 minutes`);
  console.log('==================================================\n');

  // If Resend API key is provided
  if (process.env.RESEND_API_KEY) {
    try {
      const fromEmail = process.env.EMAIL_FROM || 'security@rainora.com';
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: toEmail,
          subject: `${title}: ${otp} - RAINORA Admin`,
          html: `
            <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #333; background: #111; color: #eee; border-radius: 8px;">
              <h2 style="color: #f97316; margin-top: 0;">RAINORA Security</h2>
              <p>Your one-time verification code is:</p>
              <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #fff; background: #222; padding: 15px; text-align: center; border-radius: 6px; margin: 20px 0;">
                ${otp}
              </div>
              <p style="color: #888; font-size: 13px;">This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
            </div>
          `,
        }),
      });
      if (res.ok) {
        console.log(`[Email] Successfully sent OTP to ${toEmail} via Resend`);
        return true;
      }
    } catch (e) {
      console.error('[Email] Resend error:', e.message);
    }
  }

  // If SMTP is provided
  const mailer = getTransporter();
  if (mailer) {
    try {
      const from = process.env.EMAIL_FROM || process.env.SMTP_USER;
      await mailer.sendMail({
        from: `"RAINORA Admin" <${from}>`,
        to: toEmail,
        subject: `${title}: ${otp} - RAINORA Admin`,
        text: `Your RAINORA verification code is: ${otp}. It will expire in 10 minutes.`,
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #333; background: #111; color: #eee; border-radius: 8px;">
            <h2 style="color: #f97316; margin-top: 0;">RAINORA Security</h2>
            <p>Your one-time verification code is:</p>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #fff; background: #222; padding: 15px; text-align: center; border-radius: 6px; margin: 20px 0;">
              ${otp}
            </div>
            <p style="color: #888; font-size: 13px;">This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
          </div>
        `,
      });
      console.log(`[Email] Successfully sent OTP to ${toEmail} via SMTP`);
      return true;
    } catch (e) {
      console.error('[Email] SMTP sending error:', e.message);
    }
  }

  return true;
}
