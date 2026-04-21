import nodemailer from "nodemailer";

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export class EmailService {
  private static transporter = nodemailer.createTransport({
    host: process.env.EMAIL_SMTP_HOST,
    port: parseInt(process.env.EMAIL_SMTP_PORT || "587"),
    secure: process.env.EMAIL_SMTP_SECURE === "true", // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_SMTP_USER,
      pass: process.env.EMAIL_SMTP_PASS,
    },
  });

  /**
   * Send an email
   */
  static async sendEmail({ to, subject, text, html }: EmailOptions) {
    try {
      // Create a test account if no SMTP host is provided (for dev/testing)
      if (!process.env.EMAIL_SMTP_HOST) {
        console.warn("[EmailService] !!! NO SMTP CONFIG FOUND !!!");
        console.log("------------------------------------------");
        console.log(`[RESET LINK] To: ${to}`);
        console.log(`[RESET LINK] Link: ${text.match(/http[^\s]+/)?.[0] || text}`);
        console.log("------------------------------------------");
        return { message: "Email logged to console" };
      }

      const info = await this.transporter.sendMail({
        from: `"SmartRack Support" <${process.env.EMAIL_SMTP_USER}>`,
        to,
        subject,
        text,
        html: html || text.replace(/\n/g, "<br>"),
      });

      console.log("[EmailService] Email sent: %s", info.messageId);
      return info;
    } catch (error) {
      console.error("[EmailService] Error sending email:", error);
      throw error;
    }
  }

  /**
   * Send password reset email
   */
  static async sendResetPasswordEmail(email: string, resetLink: string) {
    const subject = "Reset Your SmartRack Password";
    const text = `Hello,\n\nYou requested a password reset for your SmartRack account. Please click the link below to reset your password:\n\n${resetLink}\n\nThis link will expire in 1 hour.\n\nIf you did not request this, please ignore this email.`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #2563eb; text-align: center;">SmartRack Password Reset</h2>
        <p>Hello,</p>
        <p>You requested a password reset for your SmartRack account. Please click the button below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p>If the button doesn't work, you can copy and paste the following link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${resetLink}</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #999;">This link will expire in 1 hour. If you did not request this reset, please ignore this email.</p>
      </div>
    `;

    return this.sendEmail({ to: email, subject, text, html });
  }
}
