package com.cams.modules.common.service;

import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:no-reply@cam.local}")
    private String fromEmail;

    public EmailService(@Autowired(required = false) JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    /**
     * Dispatches a 6-digit email verification OTP code with HTML template.
     * In environments without active SMTP, falls back gracefully to structured server logging.
     */
    public void sendVerificationEmail(String toEmail, String username, String otpCode) {
        String greetingName = (username != null && !username.isBlank()) ? username : "Member";

        String htmlContent = """
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b; }
                .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
                .header { background: linear-gradient(165deg, #074320 0%, #063519 60%, #042411 100%); padding: 28px 24px; text-align: center; color: #ffffff; }
                .brand-title { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; margin: 0; }
                .brand-sub { font-size: 12px; color: #86efac; font-weight: 600; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
                .body-content { padding: 32px 28px; text-align: center; }
                .greeting { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 8px; }
                .instruction { font-size: 14px; color: #64748b; line-height: 1.5; margin-bottom: 24px; }
                .otp-container { background-color: #f0fdf4; border: 2px dashed #86efac; border-radius: 8px; padding: 18px 24px; margin: 0 auto 24px; display: inline-block; }
                .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #166534; margin: 0; }
                .expiry { font-size: 12px; color: #64748b; margin-top: 8px; }
                .footer { background-color: #f8fafc; padding: 16px 24px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; }
              </style>
            </head>
            <body>
              <div class="card">
                <div class="header">
                  <h1 class="brand-title">CAM</h1>
                  <div class="brand-sub">Club Accounting & Management</div>
                </div>
                <div class="body-content">
                  <div class="greeting">Hello {{greetingName}},</div>
                  <div class="instruction">
                    What ra? you want some nice mssg here aa? chumma just copy the code and paste!! 
                  </div>
                  <div class="otp-container">
                    <div class="otp-code">{{otpCode}}</div>
                  </div>
                  <div class="expiry">
                    ⏱️ This verification code is valid for <strong>10 minutes</strong>.
                  </div>
                </div>
                <div class="footer">
                  CAM Financial Operations • Secure Digital Ledgers & Governance<br>
                  If you did not request this registration, please disregard this email.
                </div>
              </div>
            </body>
            </html>
            """
            .replace("{{greetingName}}", greetingName)
            .replace("{{otpCode}}", otpCode);

        boolean emailSent = false;
        if (mailSender != null) {
            try {
                MimeMessage message = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
                helper.setFrom(fromEmail, "CAM - Club Accounting & Management");
                helper.setTo(toEmail);
                helper.setSubject("CAM Account Verification Code: " + otpCode);
                helper.setText(htmlContent, true);
                mailSender.send(message);
                emailSent = true;
                log.info("Email verification OTP successfully sent to: {}", toEmail);
            } catch (Exception ex) {
                log.warn("Failed to dispatch email via SMTP to {}: {}. Falling back to console log.", toEmail, ex.getMessage());
            }
        }

        // Always print visual banner to server log for developer convenience and fallback
        log.info("""
            \n================================================================================
            [CAM EMAIL SERVICE - VERIFICATION CODE DISPATCH]
            To: {}
            Subject: CAM Account Verification Code: {}
            Code: [{}]
            Recipient: {}
            Validity: 10 Minutes
            SMTP Dispatched: {}
            ================================================================================""",
            toEmail, otpCode, otpCode, greetingName, emailSent);
    }
}
