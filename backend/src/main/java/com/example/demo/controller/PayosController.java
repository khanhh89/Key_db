package com.example.demo.controller;

import com.example.demo.model.BankConfigEntity;
import com.example.demo.model.LicenseKeyEntity;
import com.example.demo.model.OrderEntity;
import com.example.demo.repository.BankConfigRepository;
import com.example.demo.repository.LicenseKeyRepository;
import com.example.demo.repository.OrderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping({"/api/payos", "/api/payments/payos"})
@CrossOrigin(origins = "*")
public class PayosController {

    @Value("${payos.client-id:}")
    private String clientId;

    @Value("${payos.api-key:}")
    private String apiKey;

    @Value("${payos.checksum-key:}")
    private String checksumKey;

    @Autowired
    private BankConfigRepository bankConfigRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private LicenseKeyRepository licenseKeyRepository;

    @Autowired
    private com.example.demo.service.EmailService emailService;

    private final RestTemplate restTemplate = new RestTemplate();

    @PostMapping("/create-payment-link")
    public ResponseEntity<Map<String, Object>> createPaymentLink(@RequestBody Map<String, Object> req) {
        String orderId = (String) req.get("orderId");
        Optional<OrderEntity> orderOpt = orderRepository.findById(orderId);
        if (orderOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        OrderEntity order = orderOpt.get();

        BankConfigEntity bankConfig = bankConfigRepository.findAll().stream().findFirst()
                .orElseGet(() -> BankConfigEntity.builder()
                        .bankId("")
                        .accountNo("")
                        .accountName("")
                        .build());

        // Extract integer order code for PayOS
        long numericOrderCode;
        try {
            numericOrderCode = Long.parseLong(order.getPaymentCode().replaceAll("[^0-9]", ""));
        } catch (Exception e) {
            numericOrderCode = System.currentTimeMillis() % 1000000;
        }

        // Determine active PayOS credentials (MySQL DB saved from Admin UI has higher priority)
        String activeClientId = (bankConfig.getPayosClientId() != null && !bankConfig.getPayosClientId().isBlank() && !bankConfig.getPayosClientId().contains("payosdemo"))
                ? bankConfig.getPayosClientId().trim()
                : (clientId != null && !clientId.contains("YOUR_") ? clientId.trim() : null);

        String activeApiKey = (bankConfig.getPayosApiKey() != null && !bankConfig.getPayosApiKey().isBlank() && !bankConfig.getPayosApiKey().contains("payos-demo"))
                ? bankConfig.getPayosApiKey().trim()
                : (apiKey != null && !apiKey.contains("YOUR_") ? apiKey.trim() : null);

        String activeChecksumKey = (bankConfig.getPayosChecksumKey() != null && !bankConfig.getPayosChecksumKey().isBlank() && !bankConfig.getPayosChecksumKey().contains("checksumkeydemo"))
                ? bankConfig.getPayosChecksumKey().trim()
                : (checksumKey != null && !checksumKey.contains("YOUR_") ? checksumKey.trim() : "");

        Boolean isPayosEnabled = bankConfig.getPayosEnabled() != null ? bankConfig.getPayosEnabled() : true;

        Map<String, Object> response = new HashMap<>();
        response.put("orderId", order.getId());
        response.put("paymentCode", order.getPaymentCode());
        response.put("amount", order.getAmount());
        response.put("status", order.getStatus());

        // Call real PayOS API if PayOS is enabled and active credentials exist
        if (Boolean.TRUE.equals(isPayosEnabled) && activeClientId != null && !activeClientId.isBlank()
                && activeApiKey != null && !activeApiKey.isBlank()) {
            Map<String, Object> payosData = createPayosRequestWithRetry(order, numericOrderCode, activeClientId, activeApiKey, activeChecksumKey);
            if (payosData != null) {
                if (payosData.containsKey("checkoutUrl")) response.put("checkoutUrl", payosData.get("checkoutUrl"));
                if (payosData.containsKey("qrCode")) response.put("qrCode", payosData.get("qrCode"));
                if (payosData.containsKey("rawQrCode")) response.put("rawQrCode", payosData.get("rawQrCode"));
                if (payosData.containsKey("orderCode")) response.put("orderCode", payosData.get("orderCode"));
                return ResponseEntity.ok(response);
            }
        }

        // Only fallback to static VietQR if PayOS is disabled or unconfigured
        boolean hasBankDetails = bankConfig.getBankId() != null && !bankConfig.getBankId().isBlank()
                && bankConfig.getAccountNo() != null && !bankConfig.getAccountNo().isBlank();

        if (hasBankDetails) {
            String staticQr = "https://img.vietqr.io/image/"
                    + bankConfig.getBankId().trim() + "-"
                    + bankConfig.getAccountNo().trim()
                    + "-compact2.png?amount=" + order.getAmount().longValue()
                    + "&addInfo=" + order.getPaymentCode()
                    + "&accountName=" + (bankConfig.getAccountName() != null ? bankConfig.getAccountName().trim().replace(" ", "%20") : "");
            response.put("qrCode", staticQr);
        }

        return ResponseEntity.ok(response);
    }

    private Map<String, Object> createPayosRequestWithRetry(
            OrderEntity order,
            long initialOrderCode,
            String activeClientId,
            String activeApiKey,
            String activeChecksumKey) {

        long currentOrderCode = initialOrderCode;

        for (int attempt = 0; attempt < 3; attempt++) {
            try {
                String cancelUrl = "http://localhost:5173";
                String returnUrl = "http://localhost:5173";
                String description = order.getPaymentCode();
                int amountInt = order.getAmount().intValue();

                String signature = generatePayosSignature(currentOrderCode, amountInt, description, cancelUrl, returnUrl, activeChecksumKey);

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                headers.set("x-client-id", activeClientId);
                headers.set("x-api-key", activeApiKey);

                Map<String, Object> payosReqBody = new HashMap<>();
                payosReqBody.put("orderCode", currentOrderCode);
                payosReqBody.put("amount", amountInt);
                payosReqBody.put("description", description);
                payosReqBody.put("cancelUrl", cancelUrl);
                payosReqBody.put("returnUrl", returnUrl);
                if (signature != null && !signature.isBlank()) {
                    payosReqBody.put("signature", signature);
                }

                HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payosReqBody, headers);
                ResponseEntity<Map> payosRes = restTemplate.postForEntity(
                        "https://api-merchant.payos.vn/v2/payment-requests",
                        entity,
                        Map.class
                );

                if (payosRes.getStatusCode().is2xxSuccessful() && payosRes.getBody() != null) {
                    Map<String, Object> resMap = payosRes.getBody();
                    if ("00".equals(resMap.get("code"))) {
                        Map<String, Object> dataMap = (Map<String, Object>) resMap.get("data");
                        if (dataMap != null) {
                            Map<String, Object> result = new HashMap<>();
                            result.put("orderCode", currentOrderCode);
                            if (dataMap.containsKey("checkoutUrl") && dataMap.get("checkoutUrl") != null) {
                                result.put("checkoutUrl", dataMap.get("checkoutUrl"));
                            }
                            if (dataMap.containsKey("qrCode") && dataMap.get("qrCode") != null) {
                                String rawQr = String.valueOf(dataMap.get("qrCode"));
                                result.put("rawQrCode", rawQr);
                                if (rawQr.startsWith("http://") || rawQr.startsWith("https://") || rawQr.startsWith("data:image/")) {
                                    result.put("qrCode", rawQr);
                                } else {
                                    String encodedQr = java.net.URLEncoder.encode(rawQr, java.nio.charset.StandardCharsets.UTF_8);
                                    result.put("qrCode", "https://api.qrserver.com/v1/create-qr-code/?data=" + encodedQr + "&size=300x300");
                                }
                            }
                            System.out.println(">>> [PayOS API Success] Created PayOS payment link for amount " + amountInt + " with orderCode: " + currentOrderCode);
                            return result;
                        }
                    } else {
                        System.err.println(">>> [PayOS API Code " + resMap.get("code") + "] Desc: " + resMap.get("desc") + " (attempt " + attempt + ")");
                    }
                }
            } catch (Exception e) {
                System.err.println(">>> [PayOS API Call Exception] " + e.getMessage() + " (attempt " + attempt + ")");
            }

            // Generate fresh unique numeric orderCode if previous orderCode was already registered on PayOS
            currentOrderCode = System.currentTimeMillis() % 1000000000L;
        }

        return null;
    }

    @GetMapping({"/check-status/{orderId}", "/verify/{orderId}"})
    public ResponseEntity<Map<String, Object>> checkPayosStatus(@PathVariable String orderId) {
        Map<String, Object> response = new HashMap<>();
        Optional<OrderEntity> orderOpt = orderRepository.findById(orderId)
                .or(() -> orderRepository.findByPaymentCode(orderId));
        if (orderOpt.isEmpty()) {
            response.put("error", 1);
            response.put("message", "Order not found: " + orderId);
            return ResponseEntity.status(404).body(response);
        }

        OrderEntity order = orderOpt.get();
        if ("PAID".equals(order.getStatus())) {
            response.put("error", 0);
            response.put("paid", true);
            response.put("message", "Order is already PAID");
            response.put("order", order);
            return ResponseEntity.ok(response);
        }

        BankConfigEntity bankConfig = bankConfigRepository.findAll().stream().findFirst()
                .orElseGet(() -> BankConfigEntity.builder().build());

        String activeClientId = (bankConfig.getPayosClientId() != null && !bankConfig.getPayosClientId().isBlank() && !bankConfig.getPayosClientId().contains("payosdemo"))
                ? bankConfig.getPayosClientId().trim()
                : (clientId != null && !clientId.contains("YOUR_") ? clientId.trim() : null);

        String activeApiKey = (bankConfig.getPayosApiKey() != null && !bankConfig.getPayosApiKey().isBlank() && !bankConfig.getPayosApiKey().contains("payos-demo"))
                ? bankConfig.getPayosApiKey().trim()
                : (apiKey != null && !apiKey.contains("YOUR_") ? apiKey.trim() : null);

        if (activeClientId == null || activeApiKey == null) {
            response.put("error", 1);
            response.put("paid", false);
            response.put("message", "PayOS API credentials not set in DB or application.properties");
            return ResponseEntity.ok(response);
        }

        long numericOrderCode;
        try {
            numericOrderCode = Long.parseLong(order.getPaymentCode().replaceAll("[^0-9]", ""));
        } catch (Exception e) {
            numericOrderCode = System.currentTimeMillis() % 1000000;
        }

        try {
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
                    String payosStatus = dataMap != null ? (String) dataMap.get("status") : null;
                    if ("PAID".equals(payosStatus)) {
                        // Fulfill order key from MySQL CSDL strictly matching package and price
                        OrderController.fulfillOrderKeyStatic(order, licenseKeyRepository, orderRepository);

                        response.put("error", 0);
                        response.put("paid", true);
                        response.put("message", "PayOS payment verified successfully & Key pushed!");
                        response.put("order", order);
                        return ResponseEntity.ok(response);
                    } else {
                        response.put("error", 0);
                        response.put("paid", false);
                        response.put("payosStatus", payosStatus);
                        response.put("message", "PayOS status: " + payosStatus);
                        return ResponseEntity.ok(response);
                    }
                } else {
                    response.put("error", 1);
                    response.put("message", "PayOS API returned code: " + resMap.get("code") + " desc: " + resMap.get("desc"));
                    return ResponseEntity.ok(response);
                }
            }
        } catch (Exception e) {
            response.put("error", 1);
            response.put("message", "Error calling PayOS API: " + e.getMessage());
            return ResponseEntity.ok(response);
        }

        response.put("error", 0);
        response.put("paid", false);
        response.put("message", "Awaiting payment");
        return ResponseEntity.ok(response);
    }

    private String generatePayosSignature(long orderCode, int amount, String description, String cancelUrl, String returnUrl, String checksumKey) {
        if (checksumKey == null || checksumKey.isBlank()) return "";
        try {
            String rawData = "amount=" + amount
                    + "&cancelUrl=" + cancelUrl
                    + "&description=" + description
                    + "&orderCode=" + orderCode
                    + "&returnUrl=" + returnUrl;

            javax.crypto.Mac hmac = javax.crypto.Mac.getInstance("HmacSHA256");
            javax.crypto.spec.SecretKeySpec secretKey = new javax.crypto.spec.SecretKeySpec(checksumKey.getBytes(java.nio.charset.StandardCharsets.UTF_8), "HmacSHA256");
            hmac.init(secretKey);
            byte[] hash = hmac.doFinal(rawData.getBytes(java.nio.charset.StandardCharsets.UTF_8));

            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            return "";
        }
    }

    @PostMapping("/webhook")
    public ResponseEntity<Map<String, Object>> payosWebhook(@RequestBody Map<String, Object> webhookPayload) {
        Map<String, Object> res = new HashMap<>();
        try {
            String code = (String) webhookPayload.get("code");
            Map<String, Object> data = (Map<String, Object>) webhookPayload.get("data");

            if ("00".equals(code) && data != null) {
                Object orderCodeObj = data.get("orderCode");
                String orderCodeStr = String.valueOf(orderCodeObj);

                // Find matching order in MySQL Database
                Optional<OrderEntity> matchedOrder = orderRepository.findAll().stream()
                        .filter(o -> o.getPaymentCode().contains(orderCodeStr) || o.getId().contains(orderCodeStr))
                        .findFirst();

                if (matchedOrder.isPresent()) {
                    OrderEntity order = matchedOrder.get();
                    if (!"PAID".equals(order.getStatus())) {
                        // Release key from CSDL MySQL strictly matching package and price
                        OrderController.fulfillOrderKeyStatic(order, licenseKeyRepository, orderRepository);
                        try {
                            emailService.sendKeyEmail(order);
                        } catch (Exception mailErr) {
                            System.err.println(">>> [Webhook Mail Error] " + mailErr.getMessage());
                        }
                    }
                    res.put("error", 0);
                    res.put("message", "Payment processed & Key pushed from MySQL CSDL successfully!");
                    return ResponseEntity.ok(res);
                }
            }
        } catch (Exception e) {
            res.put("error", 1);
            res.put("message", "Error processing webhook: " + e.getMessage());
            return ResponseEntity.badRequest().body(res);
        }

        res.put("error", 0);
        res.put("message", "Webhook received");
        return ResponseEntity.ok(res);
    }
}
