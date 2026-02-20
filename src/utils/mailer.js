import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;

if (
  !process.env.SMTP_HOST ||
  !process.env.SMTP_USER ||
  !process.env.SMTP_PASS
) {
  console.warn('SMTP configuration is missing');
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: smtpPort,
  secure: smtpPort === 465, // true only for port 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendMail = async ({ to, subject, html }) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SMTP credentials not configured');
    }

    console.log('[DEV MAILER] Email payload:');
    console.log({ to, subject, html });
    return;
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject,
      html,
    });

    console.log('[MAILER] Email sent successfully to', to);
  } catch (error) {
    console.error('[MAILER] Failed to send email:', error);
    throw error;
  }
};
