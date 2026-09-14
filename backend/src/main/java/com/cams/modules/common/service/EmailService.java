package com.cams.modules.common.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class EmailService {

    @Value("${app.mail.resend-api-key:${RESEND_API_KEY:}}")
    private String resendApiKey;

    @Value("${app.mail.brevo-api-key:${BREVO_API_KEY:}}")
    private String brevoApiKey;

    @Value("${app.mail.from-email:${CAMS_FROM_EMAIL:${spring.mail.username:onboarding@resend.dev}}}")
    private String fromEmail;

    @Value("${app.mail.from-name:${CAMS_FROM_NAME:CAM - Club Accounting & Management}}")
    private String fromName;

    private final JavaMailSender mailSender;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public EmailService(
            @Autowired(required = false) JavaMailSender mailSender,
            @Autowired(required = false) ObjectMapper objectMapper
    ) {
        this.mailSender = mailSender;
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    /**
     * Dispatches a 6-digit email verification OTP code with HTML template.
     * Supports:
     * 1. Resend HTTP API (Port 443 - works everywhere, including Render free tier)
     * 2. Brevo HTTP API (Port 443 - works everywhere, including Render free tier)
     * 3. Traditional JavaMailSender SMTP (Port 587 - local dev)
     * 4. Resilient Fallback to Structured Server Console Banner
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
                    Please use the following 6-digit verification code to complete your registration on the CAM financial portal.
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
        String dispatchChannel = "CONSOLE_LOG_ONLY";

        // 1. Try Resend HTTP API (Port 443 HTTPS)
        if (resendApiKey != null && !resendApiKey.isBlank()) {
            emailSent = sendViaResend(toEmail, "CAM Account Verification Code: " + otpCode, htmlContent);
            if (emailSent) {
                dispatchChannel = "RESEND_HTTP";
            }
        }

        // 2. Try Brevo HTTP API (Port 443 HTTPS)
        if (!emailSent && brevoApiKey != null && !brevoApiKey.isBlank()) {
            emailSent = sendViaBrevo(toEmail, "CAM Account Verification Code: " + otpCode, htmlContent);
            if (emailSent) {
                dispatchChannel = "BREVO_HTTP";
            }
        }

        // 3. Try traditional SMTP (Port 587)
        if (!emailSent && mailSender != null) {
            emailSent = sendViaSmtp(toEmail, "CAM Account Verification Code: " + otpCode, htmlContent);
            if (emailSent) {
                dispatchChannel = "SMTP";
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
            Channel: {}
            Dispatched: {}
            ================================================================================""",
            toEmail, otpCode, otpCode, greetingName, dispatchChannel, emailSent);
    }

    private boolean sendViaResend(String toEmail, String subject, String htmlContent) {
        try {
            String sender = fromEmail != null && !fromEmail.isBlank() ? fromEmail : "onboarding@resend.dev";
            if (!sender.contains("<")) {
                sender = fromName + " <" + sender + ">";
            }
            Map<String, Object> payload = Map.of(
                "from", sender,
                "to", List.of(toEmail),
                "subject", subject,
                "html", htmlContent
            );
            String json = objectMapper.writeValueAsString(payload);

            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.resend.com/emails"))
                .header("Authorization", "Bearer " + resendApiKey.trim())
                .header("Content-Type", "application/json")
                .timeout(Duration.ofSeconds(15))
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                log.info("[EMAIL] Verification email sent successfully to {} via Resend HTTP API. Response: {}", toEmail, response.body());
                return true;
            } else {
                log.warn("[EMAIL] Resend HTTP API returned status {}: {}", response.statusCode(), response.body());
                return false;
            }
        } catch (Exception e) {
            log.warn("[EMAIL] Failed to dispatch email via Resend HTTP API to {}: {}", toEmail, e.getMessage());
            return false;
        }
    }

    private boolean sendViaBrevo(String toEmail, String subject, String htmlContent) {
        try {
            String senderEmail = fromEmail != null && !fromEmail.isBlank() ? fromEmail : "no-reply@cams.local";
            Map<String, Object> payload = Map.of(
                "sender", Map.of("name", fromName, "email", senderEmail),
                "to", List.of(Map.of("email", toEmail)),
                "subject", subject,
                "htmlContent", htmlContent
            );
            String json = objectMapper.writeValueAsString(payload);

            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.brevo.com/v3/smtp/email"))
                .header("api-key", brevoApiKey.trim())
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .timeout(Duration.ofSeconds(15))
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                log.info("[EMAIL] Verification email sent successfully to {} via Brevo HTTP API. Response: {}", toEmail, response.body());
                return true;
            } else {
                log.warn("[EMAIL] Brevo HTTP API returned status {}: {}", response.statusCode(), response.body());
                return false;
            }
        } catch (Exception e) {
            log.warn("[EMAIL] Failed to dispatch email via Brevo HTTP API to {}: {}", toEmail, e.getMessage());
            return false;
        }
    }

    private boolean sendViaSmtp(String toEmail, String subject, String htmlContent) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            String sender = fromEmail != null && !fromEmail.isBlank() ? fromEmail : "no-reply@cam.local";
            helper.setFrom(sender, fromName);
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);
            mailSender.send(message);
            log.info("[EMAIL] Verification email sent successfully to {} via SMTP", toEmail);
            return true;
        } catch (Exception ex) {
            log.warn("[EMAIL] Failed to dispatch email via SMTP to {}: {}. Falling back to next channel.", toEmail, ex.getMessage());
            return false;
        }
    }
}
