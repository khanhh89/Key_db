package com.example.demo.service;

import com.example.demo.model.OrderEntity;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.CompletableFuture;

/**
 * Dịch vụ Email đã được tắt hoàn toàn theo yêu cầu hệ thống.
 * Toàn bộ mã Key VIP được hiển thị trực tiếp và sao chép ngay trên màn hình của khách hàng.
 */
@Service
public class EmailService {

    @Async
    public CompletableFuture<Boolean> sendKeyEmailAsync(OrderEntity order) {
        return CompletableFuture.completedFuture(false);
    }

    public boolean sendKeyEmail(OrderEntity order) {
        return false;
    }

    public Map<String, Object> resendKeyEmail(String orderId, String overrideEmail) {
        return Map.of("success", false, "message", "Tính năng gửi email đã được tắt trên hệ thống. Khách hàng nhận key trực tiếp trên màn hình.");
    }

    public Map<String, Object> testSendEmail(String targetEmail) {
        return Map.of("success", false, "message", "Tính năng gửi email đã được tắt trên toàn hệ thống.");
    }
}
