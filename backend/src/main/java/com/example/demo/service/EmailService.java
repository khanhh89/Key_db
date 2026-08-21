package com.example.demo.service;

import com.example.demo.model.OrderEntity;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;

@Service
public class EmailService {

    @Autowired(required = false)
    private JavaMailSender mailSender;

    public void sendKeyEmail(OrderEntity order) {
        if (order == null || order.getCustomerEmail() == null || order.getCustomerEmail().isBlank()) {
            return;
        }

        String toEmail = order.getCustomerEmail().trim();
        String key = order.getDeliveredKey() != null ? order.getDeliveredKey() : "N/A";
        String appName = order.getAppName() != null ? order.getAppName() : "MOD VIP KEY";
        Integer days = order.getDurationDays() != null ? order.getDurationDays() : 30;

        String subject = "🔑 [MOD VIP STORE] Key bản quyền " + appName + " của đơn hàng #" + order.getId();

        String htmlContent = "<div style=\"font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #0f172a; color: #ffffff; border-radius: 16px;\">" +
                "<h2 style=\"color: #38bdf8; text-align: center; margin-top: 0;\">⚡ CẢM ƠN BẠN ĐÃ MUA HÀNG!</h2>" +
                "<p style=\"font-size: 14px; color: #cbd5e1;\">Đơn hàng <strong>#" + order.getId() + "</strong> mua gói VIP <strong>" + appName + " (" + days + " ngày)</strong> đã được thanh toán thành công.</p>" +
                "<div style=\"background: #1e293b; border: 1.5px solid #38bdf8; padding: 18px; border-radius: 12px; text-align: center; margin: 20px 0;\">" +
                "<div style=\"font-size: 12px; color: #94a3b8; margin-bottom: 6px;\">KEY BẢN QUYỀN VIP CỦA BẠN:</div>" +
                "<div style=\"font-size: 22px; font-weight: bold; color: #00f2fe; letter-spacing: 2px; font-family: monospace;\">" + key + "</div>" +
                "</div>" +
                "<p style=\"font-size: 13px; color: #94a3b8;\">Vui lòng sao chép Key và nhập vào ứng dụng để kích hoạt bản quyền VIP 24/7.</p>" +
                "<hr style=\"border: 0; border-top: 1px solid rgba(255,255,255,0.1); margin: 20px 0;\" />" +
                "<p style=\"font-size: 12px; color: #64748b; text-align: center;\">Email tự động gửi từ hệ thống Cửa hàng MOD VIP Store.</p>" +
                "</div>";

        if (mailSender != null) {
            try {
                MimeMessage mimeMessage = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
                helper.setTo(toEmail);
                helper.setSubject(subject);
                helper.setText(htmlContent, true);
                mailSender.send(mimeMessage);
                System.out.println(">>> [EmailService] Successfully sent VIP Key email to: " + toEmail);
            } catch (Exception e) {
                System.err.println(">>> [EmailService] Failed to send email via JavaMailSender: " + e.getMessage());
            }
        } else {
            System.out.println(">>> [EmailService] JavaMailSender is not configured. Logged email notification for: " + toEmail + " | Key: " + key);
        }
    }
}
