package com.example.demo.service;

import com.example.demo.model.AppItemEntity;
import com.example.demo.model.BankConfigEntity;
import com.example.demo.model.OrderEntity;
import com.example.demo.model.SystemConfigEntity;
import com.example.demo.repository.AppRepository;
import com.example.demo.repository.BankConfigRepository;
import com.example.demo.repository.OrderRepository;
import com.example.demo.repository.SystemConfigRepository;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Properties;
import java.util.concurrent.CompletableFuture;

@Service
public class EmailService {

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private AppRepository appRepository;

    @Autowired
    private SystemConfigRepository systemConfigRepository;

    @Autowired
    private BankConfigRepository bankConfigRepository;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    @Value("${app.mail.sender-name:MOD VIP STORE}")
    private String senderName;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("HH:mm:ss dd/MM/yyyy");
    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    /**
     * Gửi email bất đồng bộ (Non-blocking) để không làm nghẽn tiến trình webhook PayOS hoặc verify order.
     */
    @Async
    public CompletableFuture<Boolean> sendKeyEmailAsync(OrderEntity order) {
        boolean result = sendKeyEmail(order);
        return CompletableFuture.completedFuture(result);
    }

    public JavaMailSender getActiveMailSender() {
        BankConfigEntity bankConfig = bankConfigRepository.findAll().stream().findFirst().orElse(null);
        if (bankConfig != null && bankConfig.getMailUsername() != null && !bankConfig.getMailUsername().isBlank()
                && bankConfig.getMailPassword() != null && !bankConfig.getMailPassword().isBlank()) {
            JavaMailSenderImpl impl = new JavaMailSenderImpl();
            String host = (bankConfig.getMailHost() != null && !bankConfig.getMailHost().isBlank()) ? bankConfig.getMailHost().trim() : "smtp.gmail.com";
            int port = (bankConfig.getMailPort() != null && bankConfig.getMailPort() > 0) ? bankConfig.getMailPort() : 587;
            impl.setHost(host);
            impl.setPort(port);
            impl.setUsername(bankConfig.getMailUsername().trim());
            impl.setPassword(bankConfig.getMailPassword().trim());
            impl.setDefaultEncoding("UTF-8");

            Properties props = impl.getJavaMailProperties();
            props.put("mail.transport.protocol", "smtp");
            props.put("mail.smtp.auth", "true");
            props.put("mail.smtp.starttls.enable", "true");
            props.put("mail.smtp.starttls.required", "true");
            props.put("mail.smtp.ssl.trust", host);
            props.put("mail.smtp.connectiontimeout", "7000");
            props.put("mail.smtp.timeout", "7000");
            props.put("mail.smtp.writetimeout", "7000");
            return impl;
        }

        return this.mailSender;
    }

    public String getActiveFromEmail() {
        BankConfigEntity bankConfig = bankConfigRepository.findAll().stream().findFirst().orElse(null);
        if (bankConfig != null && bankConfig.getMailUsername() != null && !bankConfig.getMailUsername().isBlank()) {
            return bankConfig.getMailUsername().trim();
        }
        return (mailUsername != null && !mailUsername.isBlank()) ? mailUsername.trim() : null;
    }

    public String getActiveSenderName(String defaultBrand) {
        BankConfigEntity bankConfig = bankConfigRepository.findAll().stream().findFirst().orElse(null);
        if (bankConfig != null && bankConfig.getMailSenderName() != null && !bankConfig.getMailSenderName().isBlank()) {
            return bankConfig.getMailSenderName().trim();
        }
        return (defaultBrand != null && !defaultBrand.isBlank()) ? defaultBrand.trim() : senderName;
    }

    /**
     * Gửi key bản quyền VIP về email khách hàng với giao diện Cyber/Gaming siêu xịn xò.
     */
    public boolean sendKeyEmail(OrderEntity order) {
        if (order == null || order.getCustomerEmail() == null || order.getCustomerEmail().isBlank()) {
            System.out.println(">>> [EmailService] Skipped: No customer email provided for order: " + (order != null ? order.getId() : "null"));
            return false;
        }

        BankConfigEntity bankConfig = bankConfigRepository.findAll().stream().findFirst().orElse(null);
        if (bankConfig != null && Boolean.FALSE.equals(bankConfig.getMailEnabled())) {
            System.out.println(">>> [EmailService DISABLED] Tự động gửi mail đang bị TẮT trong Cài đặt Hệ thống/Admin.");
            return false;
        }

        String toEmail = order.getCustomerEmail().trim();
        String key = order.getDeliveredKey() != null ? order.getDeliveredKey() : "N/A";
        String appName = order.getAppName() != null ? order.getAppName() : "MOD VIP KEY";

        // Tra cứu thêm thông tin app (link tải APK/IPA) và system config (brand, support)
        AppItemEntity appEntity = null;
        if (order.getAppId() != null && !order.getAppId().isBlank()) {
            appEntity = appRepository.findById(order.getAppId()).orElse(null);
        }

        SystemConfigEntity configEntity = systemConfigRepository.findAll().stream().findFirst().orElse(null);
        String brandTitle = (configEntity != null && configEntity.getBrandName() != null && !configEntity.getBrandName().isBlank())
                ? configEntity.getBrandName().trim()
                : senderName;

        String activeSenderTitle = getActiveSenderName(brandTitle);
        String subject = "🔑 [" + activeSenderTitle + "] Key bản quyền " + appName + " - Đơn hàng #" + order.getId();
        String htmlContent = buildKeyEmailHtml(order, appEntity, configEntity, activeSenderTitle);

        JavaMailSender activeSender = getActiveMailSender();
        String fromAddress = getActiveFromEmail();

        if (activeSender != null && fromAddress != null && !fromAddress.isBlank()) {
            try {
                MimeMessage mimeMessage = activeSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");

                helper.setFrom(new InternetAddress(fromAddress, activeSenderTitle, "UTF-8"));
                helper.setTo(toEmail);
                helper.setSubject(subject);
                helper.setText(htmlContent, true);

                activeSender.send(mimeMessage);

                // Cập nhật trạng thái thành công vào DB
                order.setEmailSent(true);
                order.setEmailSentAt(LocalDateTime.now(VN_ZONE));
                order.setEmailError(null);
                orderRepository.save(order);

                System.out.println(">>> [EmailService SUCCESS] Successfully delivered VIP Key email to: " + toEmail + " for order #" + order.getId());
                return true;
            } catch (Exception e) {
                String errMsg = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
                order.setEmailSent(false);
                order.setEmailError("SMTP Error: " + errMsg);
                orderRepository.save(order);

                System.err.println(">>> [EmailService ERROR] Failed to send email via JavaMailSender: " + errMsg);
                return false;
            }
        } else {
            String note = "Chưa gắn tài khoản Gmail gửi đi (vào Admin > Cấu hình Gmail SMTP hoặc điền .env MAIL_USERNAME/MAIL_PASSWORD). Key: " + key;
            order.setEmailSent(false);
            order.setEmailError(note);
            orderRepository.save(order);

            System.out.println(">>> [EmailService NOT CONFIGURED] " + note + " (Target: " + toEmail + ")");
            return false;
        }
    }

    /**
     * Thử nghiệm kết nối SMTP và gửi email test trực tiếp từ trang Admin.
     */
    public Map<String, Object> testSendEmail(String targetEmail) {
        Map<String, Object> res = new HashMap<>();
        if (targetEmail == null || targetEmail.isBlank() || !targetEmail.contains("@")) {
            res.put("success", false);
            res.put("message", "Vui lòng nhập địa chỉ email nhận thư thử nghiệm hợp lệ!");
            return res;
        }

        JavaMailSender activeSender = getActiveMailSender();
        String fromEmail = getActiveFromEmail();

        if (activeSender == null || fromEmail == null || fromEmail.isBlank()) {
            res.put("success", false);
            res.put("message", "Chưa có tài khoản Gmail gửi đi! Vui lòng điền 'Tài khoản Gmail' và 'Mật khẩu ứng dụng 16 ký tự' trước khi thử nghiệm.");
            return res;
        }

        try {
            MimeMessage message = activeSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            String sender = getActiveSenderName(senderName);
            helper.setFrom(new InternetAddress(fromEmail, sender, "UTF-8"));
            helper.setTo(targetEmail.trim());
            helper.setSubject("⚡ [KẾT NỐI THÀNH CÔNG] Thử nghiệm gửi Gmail tự động - " + sender);

            String testHtml = "<div style=\"font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; background: #0f172a; color: #ffffff; border-radius: 14px; border: 1px solid #38bdf8;\">" +
                    "<h2 style=\"color: #38bdf8; margin-top: 0;\">🎉 KẾT NỐI GMAIL SMTP THÀNH CÔNG!</h2>" +
                    "<p style=\"color: #cbd5e1; font-size: 14px;\">Hệ thống gửi email tự động của <strong>" + sender + "</strong> đã được liên kết chính xác.</p>" +
                    "<div style=\"background: #1e293b; padding: 14px; border-radius: 8px; font-size: 13px; color: #94a3b8; line-height: 1.6;\">" +
                    "<div>• <strong>Tài khoản gửi:</strong> " + fromEmail + "</div>" +
                    "<div>• <strong>Hộp thư nhận test:</strong> " + targetEmail + "</div>" +
                    "<div>• <strong>Thời gian kiểm tra:</strong> " + LocalDateTime.now(VN_ZONE).format(DATE_FORMATTER) + "</div>" +
                    "</div>" +
                    "<p style=\"color: #4ade80; font-size: 13px; margin-top: 14px;\">✓ Các đơn hàng mua Key VIP trong tương lai sẽ tự động được gửi về Gmail của khách hàng.</p>" +
                    "</div>";

            helper.setText(testHtml, true);
            activeSender.send(message);

            res.put("success", true);
            res.put("message", "✅ Kết nối thành công! Đã gửi email thử nghiệm đến [" + targetEmail.trim() + "]. Hãy kiểm tra hộp thư!");
        } catch (Exception e) {
            String err = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
            res.put("success", false);
            res.put("message", "❌ Gửi email thất bại: " + err + ". (Mẹo: Kiểm tra xem đã dùng đúng Mật khẩu ứng dụng 16 ký tự của Google chưa!)");
        }
        return res;
    }

    /**
     * Cho phép khách hàng hoặc Admin gửi lại email key bất cứ lúc nào.
     */
    public Map<String, Object> resendKeyEmail(String orderId, String overrideEmail) {
        Map<String, Object> response = new HashMap<>();

        Optional<OrderEntity> orderOpt = orderRepository.findById(orderId)
                .or(() -> orderRepository.findByPaymentCode(orderId));

        if (orderOpt.isEmpty()) {
            response.put("success", false);
            response.put("message", "Không tìm thấy đơn hàng: " + orderId);
            return response;
        }

        OrderEntity order = orderOpt.get();

        if (!"PAID".equals(order.getStatus()) || order.getDeliveredKey() == null) {
            response.put("success", false);
            response.put("message", "Đơn hàng chưa hoàn tất thanh toán hoặc chưa có key để gửi!");
            return response;
        }

        if (overrideEmail != null && !overrideEmail.isBlank()) {
            String cleanEmail = overrideEmail.trim().toLowerCase();
            if (!cleanEmail.matches("^[A-Za-z0-9+_.-]+@(.+)$")) {
                response.put("success", false);
                response.put("message", "Địa chỉ email không đúng định dạng: " + cleanEmail);
                return response;
            }
            order.setCustomerEmail(cleanEmail);
            orderRepository.save(order);
        }

        if (order.getCustomerEmail() == null || order.getCustomerEmail().isBlank()) {
            response.put("success", false);
            response.put("message", "Đơn hàng chưa có email nhận key. Vui lòng nhập email của bạn!");
            return response;
        }

        boolean sent = sendKeyEmail(order);
        response.put("success", sent);
        response.put("order", order);

        if (sent) {
            response.put("message", "Đã gửi mã Key VIP về Gmail [" + order.getCustomerEmail() + "] thành công! Vui lòng kiểm tra Hộp thư đến hoặc mục Spam.");
        } else {
            String err = order.getEmailError() != null ? order.getEmailError() : "Hệ thống SMTP chưa sẵn sàng";
            response.put("message", "Gửi email chưa hoàn tất: " + err + ". Bạn vẫn có thể sao chép key trực tiếp trên màn hình!");
        }

        return response;
    }

    /**
     * Tạo template HTML Email phong cách Dark Cyber/Gaming cực kỳ sang trọng & chuyên nghiệp.
     */
    private String buildKeyEmailHtml(OrderEntity order, AppItemEntity app, SystemConfigEntity config, String brandTitle) {
        String key = order.getDeliveredKey() != null ? order.getDeliveredKey() : "N/A";
        String appName = order.getAppName() != null ? order.getAppName() : "MOD VIP KEY";

        int days = order.getDurationDays() != null ? order.getDurationDays() : 30;
        String durationText = days >= 365 ? "1 Năm (Vĩnh Viễn)" : (days + " Ngày VIP");

        String formattedAmount = String.format("%,.0f", order.getAmount()) + " đ";

        String paidTimeStr;
        if (order.getPaidAt() != null) {
            paidTimeStr = order.getPaidAt().format(DATE_FORMATTER);
        } else if (order.getCreatedAt() != null) {
            paidTimeStr = order.getCreatedAt().format(DATE_FORMATTER);
        } else {
            paidTimeStr = LocalDateTime.now(VN_ZONE).format(DATE_FORMATTER);
        }

        // Tải app buttons
        StringBuilder downloadButtons = new StringBuilder();
        if (app != null) {
            if (app.getIpaUrl() != null && !app.getIpaUrl().isBlank()) {
                downloadButtons.append("<a href=\"").append(app.getIpaUrl()).append("\" target=\"_blank\" style=\"display: inline-block; margin: 6px; padding: 12px 22px; background: linear-gradient(135deg, #0284c7 0%, #38bdf8 100%); color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 13.5px; box-shadow: 0 4px 14px rgba(2, 132, 199, 0.4);\">🍎 TẢI BẢN MOD iOS (.IPA) ➔</a>");
            }
            if (app.getDownloadUrl() != null && !app.getDownloadUrl().isBlank()) {
                downloadButtons.append("<a href=\"").append(app.getDownloadUrl()).append("\" target=\"_blank\" style=\"display: inline-block; margin: 6px; padding: 12px 22px; background: linear-gradient(135deg, #059669 0%, #34d399 100%); color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 13.5px; box-shadow: 0 4px 14px rgba(5, 150, 105, 0.4);\">🤖 TẢI BẢN MOD ANDROID (.APK) ➔</a>");
            }
        }

        // Hỗ trợ buttons
        StringBuilder supportLinks = new StringBuilder();
        if (config != null) {
            if (config.getTelegramUrl() != null && !config.getTelegramUrl().isBlank()) {
                supportLinks.append("<a href=\"").append(config.getTelegramUrl()).append("\" target=\"_blank\" style=\"color: #38bdf8; text-decoration: none; font-weight: 600; margin: 0 8px;\">✈️ Telegram Hỗ Trợ</a>");
            }
            if (config.getZaloUrl() != null && !config.getZaloUrl().isBlank()) {
                supportLinks.append("<a href=\"").append(config.getZaloUrl()).append("\" target=\"_blank\" style=\"color: #38bdf8; text-decoration: none; font-weight: 600; margin: 0 8px;\">💬 Zalo Chăm Sóc</a>");
            }
        }

        return "<!DOCTYPE html>" +
                "<html>" +
                "<head>" +
                "<meta charset=\"UTF-8\" />" +
                "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />" +
                "<title>Key Bản Quyền VIP #" + order.getId() + "</title>" +
                "</head>" +
                "<body style=\"margin: 0; padding: 20px 10px; background-color: #070b14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9; -webkit-font-smoothing: antialiased;\">" +
                "<table role=\"presentation\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" style=\"max-width: 620px; margin: 0 auto; background: #0f172a; border-radius: 18px; border: 1px solid #1e293b; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6);\">" +
                
                // Top Glowing Neon Gradient Bar
                "<tr>" +
                "<td style=\"height: 5px; background: linear-gradient(90deg, #00f2fe 0%, #4facfe 50%, #10b981 100%);\"></td>" +
                "</tr>" +

                // Header
                "<tr>" +
                "<td style=\"padding: 30px 24px 20px 24px; text-align: center; background: radial-gradient(circle at top, rgba(56, 189, 248, 0.12) 0%, transparent 70%);\">" +
                "<div style=\"display: inline-block; padding: 6px 16px; border-radius: 30px; background: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.3); color: #38bdf8; font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 12px;\">⚡ " + brandTitle + "</div>" +
                "<h1 style=\"margin: 0; font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: 0.5px;\">KÍCH HOẠT THÀNH CÔNG!</h1>" +
                "<p style=\"margin: 8px 0 0 0; font-size: 14px; color: #94a3b8;\">Đơn hàng <strong style=\"color: #38bdf8;\">#" + order.getId() + "</strong> đã hoàn tất thanh toán. Dưới đây là mã Key VIP bản quyền của bạn.</p>" +
                "</td>" +
                "</tr>" +

                // VIP Key Centerpiece Box
                "<tr>" +
                "<td style=\"padding: 0 24px 20px 24px;\">" +
                "<div style=\"background: linear-gradient(180deg, #131d31 0%, #0c1220 100%); border: 2px solid #0284c7; border-radius: 16px; padding: 24px 18px; text-align: center; box-shadow: 0 0 25px rgba(2, 132, 199, 0.25);\">" +
                "<div style=\"font-size: 11.5px; font-weight: 800; color: #38bdf8; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px;\">🔑 KEY BẢN QUYỀN VIP CỦA BẠN:</div>" +
                "<div style=\"background: #030712; border: 1.5px dashed rgba(56, 189, 248, 0.6); padding: 14px 12px; border-radius: 12px; font-size: 22px; font-weight: 800; color: #00f2fe; font-family: 'Consolas', 'Courier New', monospace; letter-spacing: 2px; word-break: break-all; margin: 12px 0;\">" + key + "</div>" +
                "<div style=\"font-size: 12.5px; color: #94a3b8;\">💡 <strong>Mẹo:</strong> Ấn giữ hoặc sao chép toàn bộ chuỗi trên và dán vào game để kích hoạt tức thì.</div>" +
                "</div>" +
                "</td>" +
                "</tr>" +

                // Order Details Breakdown Card
                "<tr>" +
                "<td style=\"padding: 0 24px 20px 24px;\">" +
                "<div style=\"background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; padding: 18px 20px;\">" +
                "<div style=\"font-size: 13px; font-weight: 800; color: #cbd5e1; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 8px;\">📋 Chi Tiết Hóa Đơn Đơn Hàng</div>" +
                
                "<table role=\"presentation\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" style=\"font-size: 13.5px;\">" +
                "<tr>" +
                "<td style=\"padding: 6px 0; color: #94a3b8;\">Ứng Dụng:</td>" +
                "<td style=\"padding: 6px 0; text-align: right; color: #ffffff; font-weight: bold;\">" + appName + "</td>" +
                "</tr>" +
                "<tr>" +
                "<td style=\"padding: 6px 0; color: #94a3b8;\">Gói Thời Hạn:</td>" +
                "<td style=\"padding: 6px 0; text-align: right; color: #4ade80; font-weight: bold;\">" + durationText + "</td>" +
                "</tr>" +
                "<tr>" +
                "<td style=\"padding: 6px 0; color: #94a3b8;\">Số Tiền Thanh Toán:</td>" +
                "<td style=\"padding: 6px 0; text-align: right; color: #38bdf8; font-weight: bold; font-size: 15px;\">" + formattedAmount + "</td>" +
                "</tr>" +
                "<tr>" +
                "<td style=\"padding: 6px 0; color: #94a3b8;\">Mã Chuyển Khoản:</td>" +
                "<td style=\"padding: 6px 0; text-align: right; color: #cbd5e1; font-family: monospace; font-weight: bold;\">" + order.getPaymentCode() + "</td>" +
                "</tr>" +
                "<tr>" +
                "<td style=\"padding: 6px 0; color: #94a3b8;\">Thời Gian Kích Hoạt:</td>" +
                "<td style=\"padding: 6px 0; text-align: right; color: #cbd5e1;\">" + paidTimeStr + "</td>" +
                "</tr>" +
                "<tr>" +
                "<td style=\"padding: 6px 0; color: #94a3b8;\">Trạng Thái:</td>" +
                "<td style=\"padding: 6px 0; text-align: right; color: #10b981; font-weight: bold;\">✓ ĐÃ THANH TOÁN THÀNH CÔNG</td>" +
                "</tr>" +
                "</table>" +

                "</div>" +
                "</td>" +
                "</tr>" +

                // Direct Download Action Buttons (if available)
                (downloadButtons.length() > 0 ?
                "<tr>" +
                "<td style=\"padding: 0 24px 20px 24px; text-align: center;\">" +
                "<div style=\"font-size: 12.5px; color: #94a3b8; margin-bottom: 8px; font-weight: bold; text-transform: uppercase;\">📥 Tải Bộ Cài Đặt Bản Hack / MOD:</div>" +
                downloadButtons.toString() +
                "</td>" +
                "</tr>" : "") +

                // 3-Step Activation Guide
                "<tr>" +
                "<td style=\"padding: 0 24px 20px 24px;\">" +
                "<div style=\"background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 14px; padding: 16px 20px;\">" +
                "<div style=\"font-size: 13px; font-weight: 800; color: #34d399; margin-bottom: 8px;\">🚀 3 Bước Kích Hoạt Nhanh:</div>" +
                "<ol style=\"margin: 0; padding-left: 20px; font-size: 13px; color: #cbd5e1; line-height: 1.7;\">" +
                "<li>Cài đặt ứng dụng theo link tải bên trên (hoặc tải từ trang chủ).</li>" +
                "<li>Mở game / ứng dụng, chọn mục <strong>Đăng Nhập / Kích Hoạt Key VIP</strong>.</li>" +
                "<li>Dán chính xác mã Key VIP bên trên để nhận trọn vẹn đặc quyền VIP 24/7.</li>" +
                "</ol>" +
                "</div>" +
                "</td>" +
                "</tr>" +

                // Security & Guarantee Notice
                "<tr>" +
                "<td style=\"padding: 0 24px 24px 24px;\">" +
                "<div style=\"background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 12px; padding: 12px 16px; font-size: 12px; color: #fca5a5; line-height: 1.5;\">" +
                "🛡️ <strong>Chính sách Bảo hành & An toàn:</strong> Mã Key của bạn được bảo hành full thời hạn sử dụng. Vui lòng bảo mật email này và tuyệt đối không chia sẻ mã Key cho người khác để tránh bị khóa tài khoản." +
                "</div>" +
                "</td>" +
                "</tr>" +

                // Support & Footer
                "<tr>" +
                "<td style=\"padding: 24px; text-align: center; border-top: 1px solid rgba(255,255,255,0.08); background: #0a0f1d; font-size: 12.5px; color: #64748b;\">" +
                (supportLinks.length() > 0 ? "<div style=\"margin-bottom: 12px;\">" + supportLinks.toString() + "</div>" : "") +
                "<p style=\"margin: 4px 0;\">Email tự động gửi từ hệ thống " + brandTitle + ".</p>" +
                "<p style=\"margin: 0; font-size: 11px; color: #475569;\">Nếu bạn không thực hiện giao dịch này, vui lòng bỏ qua email hoặc liên hệ CSKH.</p>" +
                "</td>" +
                "</tr>" +

                "</table>" +
                "</body>" +
                "</html>";
    }
}
