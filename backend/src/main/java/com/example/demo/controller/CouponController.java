package com.example.demo.controller;

import com.example.demo.model.CouponEntity;
import com.example.demo.repository.CouponRepository;
import com.example.demo.util.AdminSecurityUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/coupons")
@CrossOrigin(origins = "*")
public class CouponController {

    @Autowired
    private CouponRepository couponRepository;

    @GetMapping
    public List<CouponEntity> getAllCoupons() {
        return couponRepository.findAll();
    }

    @PostMapping
    public ResponseEntity<?> createCoupon(
            @RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth,
            @RequestBody CouponEntity coupon) {
        if (!AdminSecurityUtil.isValidAdmin(adminAuth)) {
            return ResponseEntity.status(403).body("Security Error: Only authenticated Admin can manage coupons.");
        }

        if (coupon.getCode() == null || coupon.getCode().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Coupon code cannot be empty.");
        }

        String cleanCode = coupon.getCode().trim().toUpperCase();
        if (couponRepository.findByCodeIgnoreCase(cleanCode).isPresent()) {
            return ResponseEntity.badRequest().body("Mã giảm giá [" + cleanCode + "] đã tồn tại!");
        }

        if (coupon.getId() == null || coupon.getId().trim().isEmpty()) {
            coupon.setId("cpn-" + UUID.randomUUID().toString().substring(0, 8));
        }

        coupon.setCode(cleanCode);
        return ResponseEntity.ok(couponRepository.save(coupon));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateCoupon(
            @RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth,
            @PathVariable String id,
            @RequestBody CouponEntity couponReq) {
        if (!AdminSecurityUtil.isValidAdmin(adminAuth)) {
            return ResponseEntity.status(403).body("Security Error: Only authenticated Admin can manage coupons.");
        }

        return couponRepository.findById(id).map(existing -> {
            if (couponReq.getCode() != null) existing.setCode(couponReq.getCode().trim().toUpperCase());
            if (couponReq.getDiscountType() != null) existing.setDiscountType(couponReq.getDiscountType());
            if (couponReq.getDiscountValue() != null) existing.setDiscountValue(couponReq.getDiscountValue());
            if (couponReq.getMinOrderAmount() != null) existing.setMinOrderAmount(couponReq.getMinOrderAmount());
            if (couponReq.getMaxDiscountAmount() != null) existing.setMaxDiscountAmount(couponReq.getMaxDiscountAmount());
            if (couponReq.getMaxUses() != null) existing.setMaxUses(couponReq.getMaxUses());
            if (couponReq.getAppId() != null) existing.setAppId(couponReq.getAppId());
            if (couponReq.getActive() != null) existing.setActive(couponReq.getActive());
            if (couponReq.getValidUntil() != null) existing.setValidUntil(couponReq.getValidUntil());

            return ResponseEntity.ok(couponRepository.save(existing));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteCoupon(
            @RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth,
            @PathVariable String id) {
        if (!AdminSecurityUtil.isValidAdmin(adminAuth)) {
            return ResponseEntity.status(403).body("Security Error: Only authenticated Admin can delete coupons.");
        }

        if (couponRepository.existsById(id)) {
            couponRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }

    // PUBLIC REAL-TIME COUPON VALIDATION & REDEMPTION API
    @PostMapping("/apply")
    public synchronized ResponseEntity<?> applyCoupon(@RequestBody Map<String, Object> req) {
        String code = req.get("code") != null ? req.get("code").toString().trim() : "";
        double orderAmount = 0.0;
        if (req.get("orderAmount") != null) {
            try {
                orderAmount = Double.parseDouble(req.get("orderAmount").toString());
            } catch (Exception ignored) {}
        }
        String appId = req.get("appId") != null ? req.get("appId").toString() : "ALL";

        if (code.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("valid", false, "message", "Vui lòng nhập mã giảm giá!"));
        }

        Optional<CouponEntity> couponOpt = couponRepository.findByCodeIgnoreCaseAndActiveTrue(code);
        if (couponOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("valid", false, "message", "❌ Mã giảm giá [" + code.toUpperCase() + "] không tồn tại hoặc đã bị khóa!"));
        }

        CouponEntity coupon = couponOpt.get();

        // 1. Check expiration date
        if (coupon.getValidUntil() != null && coupon.getValidUntil().isBefore(LocalDateTime.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh")))) {
            return ResponseEntity.badRequest().body(Map.of("valid", false, "message", "⏳ Mã giảm giá [" + coupon.getCode() + "] đã hết hạn sử dụng!"));
        }

        // 2. Check total max usages
        if (coupon.getMaxUses() != null && coupon.getMaxUses() > 0 && coupon.getUsedCount() != null && coupon.getUsedCount() >= coupon.getMaxUses()) {
            return ResponseEntity.badRequest().body(Map.of("valid", false, "message", "⛔ Mã giảm giá [" + coupon.getCode() + "] đã hết số lượt sử dụng!"));
        }

        // 3. Check min order amount requirement
        if (coupon.getMinOrderAmount() != null && coupon.getMinOrderAmount() > 0 && orderAmount < coupon.getMinOrderAmount()) {
            return ResponseEntity.badRequest().body(Map.of("valid", false, "message", "⚠️ Đơn hàng tối thiểu để dùng mã này là " + String.format("%,.0f", coupon.getMinOrderAmount()) + "đ!"));
        }

        // 4. Check specific app restriction
        if (coupon.getAppId() != null && !"ALL".equalsIgnoreCase(coupon.getAppId()) && !coupon.getAppId().equalsIgnoreCase(appId)) {
            return ResponseEntity.badRequest().body(Map.of("valid", false, "message", "⚠️ Mã giảm giá này không áp dụng cho ứng dụng được chọn!"));
        }

        // Deduct 1 usage count immediately on successful application
        int currentUses = coupon.getUsedCount() != null ? coupon.getUsedCount() : 0;
        coupon.setUsedCount(currentUses + 1);
        couponRepository.save(coupon);

        // Calculate discount amount
        double discountAmount = 0.0;
        if ("PERCENTAGE".equalsIgnoreCase(coupon.getDiscountType())) {
            discountAmount = (orderAmount * coupon.getDiscountValue()) / 100.0;
            if (coupon.getMaxDiscountAmount() != null && coupon.getMaxDiscountAmount() > 0 && discountAmount > coupon.getMaxDiscountAmount()) {
                discountAmount = coupon.getMaxDiscountAmount();
            }
        } else {
            // FIXED_AMOUNT
            discountAmount = coupon.getDiscountValue();
        }

        if (discountAmount > orderAmount) {
            discountAmount = orderAmount;
        }

        double finalAmount = Math.max(0.0, orderAmount - discountAmount);

        Map<String, Object> res = new HashMap<>();
        res.put("valid", true);
        res.put("code", coupon.getCode());
        res.put("discountType", coupon.getDiscountType());
        res.put("discountValue", coupon.getDiscountValue());
        res.put("discountAmount", discountAmount);
        res.put("finalAmount", finalAmount);
        res.put("usedCount", coupon.getUsedCount());
        res.put("message", "🎉 Áp dụng mã [" + coupon.getCode() + "] thành công! (Giảm -" + String.format("%,.0f", discountAmount) + "đ)");

        return ResponseEntity.ok(res);
    }

    // RELEASE / RECOVER COUPON USAGE API (WHEN REMOVED OR ORDER CANCELLED/CLOSED)
    @PostMapping("/release")
    public synchronized ResponseEntity<?> releaseCoupon(@RequestBody Map<String, String> req) {
        String code = req.get("code") != null ? req.get("code").toString().trim() : "";
        if (code.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Mã giảm giá không hợp lệ!"));
        }

        Optional<CouponEntity> couponOpt = couponRepository.findByCodeIgnoreCase(code);
        if (couponOpt.isPresent()) {
            CouponEntity coupon = couponOpt.get();
            int currentUses = coupon.getUsedCount() != null ? coupon.getUsedCount() : 0;
            if (currentUses > 0) {
                coupon.setUsedCount(currentUses - 1);
                couponRepository.save(coupon);
            }
            return ResponseEntity.ok(Map.of(
                "success", true,
                "code", coupon.getCode(),
                "usedCount", coupon.getUsedCount(),
                "message", "Đã hoàn trả lượt sử dụng cho mã [" + coupon.getCode() + "]"
            ));
        }
        return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Mã giảm giá không tồn tại!"));
    }
}
