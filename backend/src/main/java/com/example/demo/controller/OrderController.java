package com.example.demo.controller;

import com.example.demo.model.BankConfigEntity;
import com.example.demo.model.LicenseKeyEntity;
import com.example.demo.model.OrderEntity;
import com.example.demo.repository.BankConfigRepository;
import com.example.demo.repository.LicenseKeyRepository;
import com.example.demo.repository.OrderRepository;
import com.example.demo.service.SystemLogService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/orders")
@CrossOrigin(origins = "*")
public class OrderController {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private LicenseKeyRepository licenseKeyRepository;

    @Autowired
    private BankConfigRepository bankConfigRepository;

    @Autowired
    private SystemLogService systemLogService;

    @Autowired
    private com.example.demo.service.EmailService emailService;

    @Value("${payos.client-id:}")
    private String clientId;

    @Value("${payos.api-key:}")
    private String apiKey;

    private final RestTemplate restTemplate = new RestTemplate();
    public static final String ADMIN_AUTH_TOKEN = "admin-secret-key-2026";

    @GetMapping
    public List<OrderEntity> getAllOrders(@RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth) {
        List<OrderEntity> orders = orderRepository.findAll();
        if (com.example.demo.util.AdminSecurityUtil.isValidAdmin(adminAuth)) {
            return orders;
        }
        // Omit deliveredKey for public API security
        List<OrderEntity> maskedList = new ArrayList<>();
        for (OrderEntity o : orders) {
            maskedList.add(maskOrder(o));
        }
        return maskedList;
    }

    private OrderEntity maskOrder(OrderEntity original) {
        if (original == null) return null;
        return OrderEntity.builder()
                .id(original.getId())
                .appId(original.getAppId())
                .appName(original.getAppName())
                .keyId(original.getKeyId())
                .amount(original.getAmount())
                .originalAmount(original.getOriginalAmount() != null ? original.getOriginalAmount() : original.getAmount())
                .couponCode(original.getCouponCode())
                .discountAmount(original.getDiscountAmount())
                .durationDays(original.getDurationDays())
                .paymentCode(original.getPaymentCode())
                .status(original.getStatus())
                .deliveredKey(null) // Mask and omit delivered keys in public API calls
                .customerEmail(original.getCustomerEmail())
                .createdAt(original.getCreatedAt())
                .paidAt(original.getPaidAt())
                .build();
    }

    @PostMapping("/create")
    public OrderEntity createOrder(
            HttpServletRequest request,
            @RequestBody OrderEntity orderReq) {
        String orderId = "ORD-" + (10000 + new Random().nextInt(90000));
        String paymentCode = "MK" + (10000 + new Random().nextInt(90000));
        double initialAmount = orderReq.getAmount() > 0 ? orderReq.getAmount() : 50000.0;

        OrderEntity newOrder = OrderEntity.builder()
                .id(orderId)
                .appId(orderReq.getAppId())
                .appName(orderReq.getAppName() != null ? orderReq.getAppName() : "MOD VIP KEY")
                .amount(initialAmount)
                .originalAmount(initialAmount)
                .durationDays(orderReq.getDurationDays() != null ? orderReq.getDurationDays() : 30)
                .customerEmail(orderReq.getCustomerEmail())
                .paymentCode(paymentCode)
                .status("PENDING")
                .createdAt(LocalDateTime.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh")))
                .build();

        OrderEntity savedOrder = orderRepository.save(newOrder);

        systemLogService.log(request, "ORDER_CREATE", "Người dùng tạo đơn hàng [" + savedOrder.getId() + "] mua key [" + savedOrder.getAppName() + "] số tiền " + String.format("%,.0f", savedOrder.getAmount()) + "đ, mã nội dung [" + savedOrder.getPaymentCode() + "].");

        return savedOrder;
    }

    private Optional<OrderEntity> findOrder(String key) {
        if (key == null || key.isBlank()) return Optional.empty();
        String cleaned = key.trim();
        return orderRepository.findById(cleaned)
                .or(() -> orderRepository.findByPaymentCode(cleaned))
                .or(() -> orderRepository.findByPaymentCode("MK" + cleaned))
                .or(() -> orderRepository.findAll().stream()
                        .filter(o -> o.getPaymentCode().contains(cleaned) || o.getId().contains(cleaned))
                        .findFirst());
    }

    @GetMapping("/{id}/status")
    public ResponseEntity<OrderEntity> getOrderStatus(@PathVariable String id) {
        Optional<OrderEntity> orderOpt = findOrder(id);
        if (orderOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        OrderEntity order = orderOpt.get();

        // Immediate check & delete from DB if PENDING order is older than 15 minutes
        if ("PENDING".equalsIgnoreCase(order.getStatus())
                && order.getCreatedAt() != null
                && order.getCreatedAt().isBefore(LocalDateTime.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh")).minusMinutes(15))) {
            orderRepository.delete(order);
            System.out.println(">>> [OrderController] Instantly deleted expired order (>15m) from DB: " + order.getId());
            return ResponseEntity.notFound().build();
        }

        if (!"PAID".equals(order.getStatus())) {
            checkAndUpdatePayosStatus(order);
        }

        return ResponseEntity.ok(order);
    }

    // CUSTOMER VERIFY PAYMENT ENDPOINT (Queries PayOS API in real-time or checks MySQL DB)
    @PostMapping("/{id}/verify-payment")
    public ResponseEntity<?> verifyCustomerPayment(@PathVariable String id) {
        Optional<OrderEntity> orderOpt = findOrder(id);
        if (orderOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        OrderEntity order = orderOpt.get();

        // Immediate check & delete from DB if PENDING order is older than 15 minutes
        if ("PENDING".equalsIgnoreCase(order.getStatus())
                && order.getCreatedAt() != null
                && order.getCreatedAt().isBefore(LocalDateTime.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh")).minusMinutes(15))) {
            orderRepository.delete(order);
            System.out.println(">>> [OrderController] Instantly deleted expired order (>15m) on verify: " + order.getId());
            return ResponseEntity.notFound().build();
        }

        if ("PAID".equals(order.getStatus()) || checkAndUpdatePayosStatus(order)) {
            return ResponseEntity.ok(order);
        }

        Map<String, Object> errResponse = new HashMap<>();
        errResponse.put("paid", false);
        errResponse.put("message", "⏳ Hệ thống chưa nhận được tiền cho nội dung [" + order.getPaymentCode() + "]. Vui lòng chuyển khoản đúng số tiền (" + String.format("%,.0f", order.getAmount()) + "đ) và nội dung!");
        return ResponseEntity.status(400).body(errResponse);
    }

    // AUTOMATED / ADMIN MANUAL APPROVAL ENDPOINT
    @PostMapping("/{id}/pay")
    public ResponseEntity<?> confirmOrderPayment(
            @RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth,
            @PathVariable String id) {
        if (!com.example.demo.util.AdminSecurityUtil.isValidAdmin(adminAuth)) {
            return ResponseEntity.status(403).body("Security Error: Only authenticated Admin can manually approve payments.");
        }

        Optional<OrderEntity> orderOpt = findOrder(id);
        if (orderOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        OrderEntity order = orderOpt.get();
        fulfillOrderKey(order);
        return ResponseEntity.ok(order);
    }

    private boolean checkAndUpdatePayosStatus(OrderEntity order) {
        if ("PAID".equals(order.getStatus())) {
            return true;
        }

        try {
            BankConfigEntity bankConfig = bankConfigRepository.findAll().stream().findFirst().orElse(null);
            String activeClientId = (bankConfig != null && bankConfig.getPayosClientId() != null && !bankConfig.getPayosClientId().isBlank() && !bankConfig.getPayosClientId().contains("payosdemo"))
                    ? bankConfig.getPayosClientId().trim()
                    : (clientId != null && !clientId.contains("YOUR_") ? clientId.trim() : null);

            String activeApiKey = (bankConfig != null && bankConfig.getPayosApiKey() != null && !bankConfig.getPayosApiKey().isBlank() && !bankConfig.getPayosApiKey().contains("payos-demo"))
                    ? bankConfig.getPayosApiKey().trim()
                    : (apiKey != null && !apiKey.contains("YOUR_") ? apiKey.trim() : null);

            Boolean isPayosEnabled = bankConfig != null && bankConfig.getPayosEnabled() != null ? bankConfig.getPayosEnabled() : true;

            if (Boolean.TRUE.equals(isPayosEnabled) && activeClientId != null && !activeClientId.isBlank() && activeApiKey != null && !activeApiKey.isBlank()) {
                long numericOrderCode;
                if (order.getPayosOrderCode() != null && order.getPayosOrderCode() > 0) {
                    numericOrderCode = order.getPayosOrderCode();
                } else {
                    try {
                        numericOrderCode = Long.parseLong(order.getPaymentCode().replaceAll("[^0-9]", ""));
                    } catch (Exception e) {
                        numericOrderCode = System.currentTimeMillis() % 1000000;
                    }
                }

                HttpHeaders headers = new HttpHeaders();
                headers.set("x-client-id", activeClientId);
                headers.set("x-api-key", activeApiKey);

                HttpEntity<Void> entity = new HttpEntity<>(headers);
                ResponseEntity<Map> payosRes = restTemplate.exchange(
                        "https://api-merchant.payos.vn/v2/payment-requests/" + numericOrderCode,
                        HttpMethod.GET,
                        entity,
                        Map.class
                );

                if (payosRes.getStatusCode().is2xxSuccessful() && payosRes.getBody() != null) {
                    Map<String, Object> resMap = payosRes.getBody();
                    if ("00".equals(resMap.get("code"))) {
                        Map<String, Object> dataMap = (Map<String, Object>) resMap.get("data");
                        if (dataMap != null && "PAID".equals(dataMap.get("status"))) {
                            System.out.println(">>> [PayOS Active Verification SUCCESS] Verified order " + order.getId() + " via PayOS API!");
                            fulfillOrderKey(order);
                            return true;
                        }
                    }
                }
            }
        } catch (Exception e) {
            System.err.println(">>> [PayOS Active Check Error] Could not query PayOS status for order " + order.getId() + ": " + e.getMessage());
        }
        return false;
    }

    public static Optional<LicenseKeyEntity> findMatchingKeyForOrder(
            LicenseKeyRepository licenseKeyRepository,
            String appId,
            Integer durationDays,
            Double amount) {

        if (appId == null || appId.isBlank()) {
            return Optional.empty();
        }

        // 1. Try exact match by App ID, Duration Days, Price/Amount, and Status = AVAILABLE
        if (durationDays != null && amount != null && amount > 0) {
            Optional<LicenseKeyEntity> exactMatch = licenseKeyRepository
                    .findFirstByAppIdAndDurationDaysAndPriceAndStatus(appId, durationDays, amount, "AVAILABLE");
            if (exactMatch.isPresent()) {
                return exactMatch;
            }
        }

        // 2. Try match by App ID, Duration Days, and Status = AVAILABLE
        if (durationDays != null) {
            Optional<LicenseKeyEntity> durationMatch = licenseKeyRepository
                    .findFirstByAppIdAndDurationDaysAndStatus(appId, durationDays, "AVAILABLE");
            if (durationMatch.isPresent()) {
                return durationMatch;
            }
        }

        // 3. Try match by App ID, Price/Amount, and Status = AVAILABLE (when durationDays is null)
        if (amount != null && amount > 0) {
            Optional<LicenseKeyEntity> priceMatch = licenseKeyRepository
                    .findFirstByAppIdAndPriceAndStatus(appId, amount, "AVAILABLE");
            if (priceMatch.isPresent()) {
                return priceMatch;
            }
        }

        // Strict rule: DO NOT pick a random key of a wrong package/duration/price!
        return Optional.empty();
    }

    public static void fulfillOrderKeyStatic(OrderEntity order, LicenseKeyRepository licenseKeyRepository, OrderRepository orderRepository) {
        if ("PAID".equals(order.getStatus())) return;

        Optional<LicenseKeyEntity> availableKeyOpt = findMatchingKeyForOrder(
                licenseKeyRepository,
                order.getAppId(),
                order.getDurationDays(),
                order.getAmount()
        );

        String deliveredKeyCode;
        if (availableKeyOpt.isPresent()) {
            LicenseKeyEntity keyEntity = availableKeyOpt.get();
            keyEntity.setStatus("SOLD");
            keyEntity.setSoldAt(LocalDateTime.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh")));
            licenseKeyRepository.save(keyEntity);
            deliveredKeyCode = keyEntity.getKeyCode();
            order.setKeyId(keyEntity.getId());
        } else {
            int days = order.getDurationDays() != null ? order.getDurationDays() : 30;
            deliveredKeyCode = "VIP-" + order.getAppName().replaceAll("\\s+", "").toUpperCase() + "-" + days + "D-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        }

        order.setStatus("PAID");
        order.setDeliveredKey(deliveredKeyCode);
        order.setPaidAt(LocalDateTime.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh")));
        orderRepository.save(order);
    }

    private void fulfillOrderKey(OrderEntity order) {
        fulfillOrderKeyStatic(order, licenseKeyRepository, orderRepository);
        try {
            emailService.sendKeyEmail(order);
        } catch (Exception e) {
            System.err.println(">>> Failed to send email in OrderController: " + e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteOrder(
            @RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth,
            @PathVariable String id) {
        if (!com.example.demo.util.AdminSecurityUtil.isValidAdmin(adminAuth)) {
            return ResponseEntity.status(403).body("Security Error: Only authenticated Admin can delete orders.");
        }
        if (orderRepository.existsById(id)) {
            orderRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/clear-all")
    public ResponseEntity<?> clearAllOrders(
            @RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth) {
        if (!com.example.demo.util.AdminSecurityUtil.isValidAdmin(adminAuth)) {
            return ResponseEntity.status(403).body("Security Error: Only authenticated Admin can clear all orders.");
        }
        orderRepository.deleteAll();
        return ResponseEntity.noContent().build();
    }
}

