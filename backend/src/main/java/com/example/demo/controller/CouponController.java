package com.example.demo.controller;

import com.example.demo.model.CouponEntity;
import com.example.demo.service.CouponService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/coupons")
@CrossOrigin(origins = "*")
public class CouponController {

    private final CouponService couponService;

    @Autowired
    public CouponController(CouponService couponService) {
        this.couponService = couponService;
    }

    @GetMapping
    public List<CouponEntity> getAllCoupons() {
        return couponService.getAllCoupons();
    }

    @PostMapping
    public ResponseEntity<?> createCoupon(
            @RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth,
            @RequestBody CouponEntity coupon) {
        return couponService.createCoupon(adminAuth, coupon);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateCoupon(
            @RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth,
            @PathVariable String id,
            @RequestBody CouponEntity couponReq) {
        return couponService.updateCoupon(adminAuth, id, couponReq);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteCoupon(
            @RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth,
            @PathVariable String id) {
        return couponService.deleteCoupon(adminAuth, id);
    }

    @PostMapping("/apply")
    public ResponseEntity<?> applyCoupon(@RequestBody Map<String, Object> req) {
        return couponService.applyCoupon(req);
    }

    @PostMapping("/release")
    public ResponseEntity<?> releaseCoupon(@RequestBody Map<String, String> req) {
        return couponService.releaseCoupon(req);
    }
}
