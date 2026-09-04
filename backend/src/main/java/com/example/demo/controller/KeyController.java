package com.example.demo.controller;

import com.example.demo.model.LicenseKeyEntity;
import com.example.demo.repository.LicenseKeyRepository;
import com.example.demo.util.AdminSecurityUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@RestController
@RequestMapping("/api/keys")
@CrossOrigin(origins = "*")
public class KeyController {

    @Autowired
    private LicenseKeyRepository licenseKeyRepository;



    @GetMapping
    public List<LicenseKeyEntity> getAllKeys(@RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth) {
        List<LicenseKeyEntity> keys = licenseKeyRepository.findAll();

        // Security check: Only return real unmasked key codes if caller is authenticated Admin
        if (AdminSecurityUtil.isValidAdmin(adminAuth)) {
            return keys;
        }

        // For public requests (DevTools inspectors), mask the key codes completely!
        return keys.stream().map(this::maskKeyEntity).collect(Collectors.toList());
    }

    @GetMapping("/available/{appId}")
    public List<LicenseKeyEntity> getAvailableKeysForApp(
            @PathVariable String appId,
            @RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth) {
        List<LicenseKeyEntity> keys = licenseKeyRepository.findByAppIdAndStatus(appId, "AVAILABLE");

        if (AdminSecurityUtil.isValidAdmin(adminAuth)) {
            return keys;
        }

        return keys.stream().map(this::maskKeyEntity).collect(Collectors.toList());
    }

    @PostMapping
    public ResponseEntity<?> createKey(
            @RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth,
            @RequestBody LicenseKeyEntity key) {
        if (!AdminSecurityUtil.isValidAdmin(adminAuth)) {
            return ResponseEntity.status(403).body("Security Error: Only authenticated Admin can import keys.");
        }

        if (key.getId() == null || key.getId().trim().isEmpty()) {
            key.setId("key-" + UUID.randomUUID().toString().substring(0, 8));
        }
        if (key.getStatus() == null) {
            key.setStatus("AVAILABLE");
        }
        return ResponseEntity.ok(licenseKeyRepository.save(key));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateKey(
            @RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth,
            @PathVariable String id,
            @RequestBody LicenseKeyEntity keyReq) {
        if (!AdminSecurityUtil.isValidAdmin(adminAuth)) {
            return ResponseEntity.status(403).body("Security Error: Only authenticated Admin can edit keys.");
        }

        return licenseKeyRepository.findById(id).map(existingKey -> {
            if (keyReq.getAppId() != null) existingKey.setAppId(keyReq.getAppId());
            if (keyReq.getKeyCode() != null) existingKey.setKeyCode(keyReq.getKeyCode());
            if (keyReq.getDurationDays() != null) existingKey.setDurationDays(keyReq.getDurationDays());
            if (keyReq.getPrice() != null) existingKey.setPrice(keyReq.getPrice());
            if (keyReq.getStatus() != null) existingKey.setStatus(keyReq.getStatus());
            return ResponseEntity.ok(licenseKeyRepository.save(existingKey));
        }).orElse(ResponseEntity.notFound().build());
    }



    @PostMapping("/batch-delete")
    public ResponseEntity<?> batchDeleteKeys(
            @RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth,
            @RequestBody List<String> ids) {
        if (!AdminSecurityUtil.isValidAdmin(adminAuth)) {
            return ResponseEntity.status(403).body("Security Error: Only authenticated Admin can delete keys.");
        }
        if (ids == null || ids.isEmpty()) {
            return ResponseEntity.badRequest().body("No key IDs provided.");
        }
        licenseKeyRepository.deleteAllById(ids);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("count", ids.size());
        response.put("message", "Đã xóa thành công " + ids.size() + " key khỏi CSDL!");
        return ResponseEntity.ok(response);
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BatchStatusRequest {
        private List<String> ids;
        private String status;
    }

    @PostMapping("/batch-status")
    public ResponseEntity<?> batchStatusKeys(
            @RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth,
            @RequestBody BatchStatusRequest req) {
        if (!AdminSecurityUtil.isValidAdmin(adminAuth)) {
            return ResponseEntity.status(403).body("Security Error: Only authenticated Admin can edit keys.");
        }
        List<String> ids = req.getIds();
        String status = req.getStatus();
        if (ids == null || ids.isEmpty() || status == null) {
            return ResponseEntity.badRequest().body("Invalid parameters.");
        }

        List<LicenseKeyEntity> keys = licenseKeyRepository.findAllById(ids);
        for (LicenseKeyEntity key : keys) {
            key.setStatus(status);
            if ("SOLD".equals(status) && key.getSoldAt() == null) {
                key.setSoldAt(java.time.LocalDateTime.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh")));
            }
        }
        licenseKeyRepository.saveAll(keys);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("count", keys.size());
        response.put("message", "Đã chuyển trạng thái sang [" + status + "] cho " + keys.size() + " key!");
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteKey(
            @RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth,
            @PathVariable String id) {
        if (!AdminSecurityUtil.isValidAdmin(adminAuth)) {
            return ResponseEntity.status(403).body("Security Error: Only authenticated Admin can delete keys.");
        }

        if (licenseKeyRepository.existsById(id)) {
            licenseKeyRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }

    private LicenseKeyEntity maskKeyEntity(LicenseKeyEntity original) {
        return LicenseKeyEntity.builder()
                .id(original.getId())
                .appId(original.getAppId())
                .keyCode(null) // Completely hide and omit keyCode from public responses
                .durationDays(original.getDurationDays())
                .price(original.getPrice())
                .status(original.getStatus())
                .createdAt(original.getCreatedAt())
                .soldAt(original.getSoldAt())
                .build();
    }
}
