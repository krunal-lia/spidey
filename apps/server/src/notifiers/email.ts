import nodemailer from "nodemailer";

interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  from: string;
  to: string;
}

export async function sendEmail(
  config: EmailConfig,
  monitorName: string,
  url: string,
  message: string
): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass,
    },
  });

  await transporter.sendMail({
    from: config.from,
    to: config.to,
    subject: `Spidey alert: ${monitorName}`,
    text: `${message}\n\nURL: ${url}`,
    html: `<p>${message}</p><p><a href="${url}">${url}</a></p>`,
  });
}
