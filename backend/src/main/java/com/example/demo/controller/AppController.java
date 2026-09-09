package com.example.demo.controller;

import com.example.demo.model.AppItemEntity;
import com.example.demo.repository.AppRepository;
import com.example.demo.repository.LicenseKeyRepository;
import com.example.demo.repository.OrderRepository;
import com.example.demo.util.AdminSecurityUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@RestController
@RequestMapping("/api/apps")
@CrossOrigin(origins = "*")
public class AppController {

    private final AppRepository appRepository;
    private final LicenseKeyRepository licenseKeyRepository;
    private final OrderRepository orderRepository;

    @Autowired
    public AppController(AppRepository appRepository,
                         LicenseKeyRepository licenseKeyRepository,
                         OrderRepository orderRepository) {
        this.appRepository = appRepository;
        this.licenseKeyRepository = licenseKeyRepository;
        this.orderRepository = orderRepository;
    }

    @GetMapping
    @Cacheable(value = "apps")
    public List<AppItemEntity> getAllApps() {
        return appRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<AppItemEntity> getAppById(@PathVariable String id) {
        return appRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @CacheEvict(value = "apps", allEntries = true)
    public ResponseEntity<?> createApp(
            @RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth,
            @RequestBody AppItemEntity app) {
        if (!AdminSecurityUtil.isValidAdmin(adminAuth)) {
            return ResponseEntity.status(403).body("Security Error: Only authenticated Admin can add apps.");
        }

        if (app.getId() == null || app.getId().trim().isEmpty()) {
            app.setId("app-" + UUID.randomUUID().toString().substring(0, 8));
        }
        if (app.getAllowSellKey() == null) {
            app.setAllowSellKey(true);
        }
        if (app.getAllowFreeKey() == null) {
            app.setAllowFreeKey(true);
        }
        if (app.getUpdatedAt() == null || app.getUpdatedAt().trim().isEmpty()) {
            app.setUpdatedAt(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy").format(java.time.LocalDate.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh"))));
        }
        return ResponseEntity.ok(appRepository.save(app));
    }

    @PutMapping("/{id}")
    @CacheEvict(value = "apps", allEntries = true)
    public ResponseEntity<?> updateApp(
            @RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth,
            @PathVariable String id,
            @RequestBody AppItemEntity appDetails) {
        if (!AdminSecurityUtil.isValidAdmin(adminAuth)) {
            return ResponseEntity.status(403).body("Security Error: Only authenticated Admin can edit apps.");
        }

        return appRepository.findById(id).map(app -> {
            app.setName(appDetails.getName());
            app.setSub(appDetails.getSub());
            app.setIcon(appDetails.getIcon());
            app.setCls(appDetails.getCls());
            app.setNote(appDetails.getNote());
            app.setShots(appDetails.getShots());
            app.setDownloadUrl(appDetails.getDownloadUrl());
            app.setIpaUrl(appDetails.getIpaUrl());
            app.setAllowSellKey(appDetails.getAllowSellKey() != null ? appDetails.getAllowSellKey() : (app.getAllowSellKey() != null ? app.getAllowSellKey() : true));
            app.setAllowFreeKey(appDetails.getAllowFreeKey() != null ? appDetails.getAllowFreeKey() : (app.getAllowFreeKey() != null ? app.getAllowFreeKey() : true));
            app.setFreeKey(appDetails.getFreeKey());
            app.setTags(appDetails.getTags());
            app.setUpdatedAt(appDetails.getUpdatedAt() != null && !appDetails.getUpdatedAt().trim().isEmpty()
                ? appDetails.getUpdatedAt()
                : java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy").format(java.time.LocalDate.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh"))));
            return ResponseEntity.ok(appRepository.save(app));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @CacheEvict(value = "apps", allEntries = true)
    public ResponseEntity<?> deleteApp(
            @RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth,
            @PathVariable String id) {
        if (!AdminSecurityUtil.isValidAdmin(adminAuth)) {
            return ResponseEntity.status(403).body("Security Error: Only authenticated Admin can delete apps.");
        }

        if (!appRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        AppItemEntity app = appRepository.findById(id).get();

        // Kiểm tra keys AVAILABLE còn trong kho của app này
        long availableKeyCount = licenseKeyRepository.countByAppIdAndStatus(id, "AVAILABLE");
        if (availableKeyCount > 0) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("blocked", true);
            error.put("reason", "HAS_AVAILABLE_KEYS");
            error.put("availableKeyCount", availableKeyCount);
            error.put("message", String.format(
                "Không thể xóa app \"%s\" vì còn %d key AVAILABLE trong kho. " +
                "Hãy xóa hoặc bán hết các key đó trước.",
                app.getName(), availableKeyCount
            ));
            return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
        }

        // Kiểm tra orders PENDING của app này
        long pendingOrderCount = orderRepository.findByAppId(id).stream()
                .filter(o -> "PENDING".equalsIgnoreCase(o.getStatus()))
                .count();
        if (pendingOrderCount > 0) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("blocked", true);
            error.put("reason", "HAS_PENDING_ORDERS");
            error.put("pendingOrderCount", pendingOrderCount);
            error.put("message", String.format(
                "Không thể xóa app \"%s\" vì còn %d đơn hàng đang PENDING. " +
                "Hãy chờ hoặc hủy các đơn đó trước.",
                app.getName(), pendingOrderCount
            ));
            return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
        }

        try {
            appRepository.deleteById(id);
            Map<String, Object> res = new HashMap<>();
            res.put("success", true);
            res.put("message", "Đã xóa app [" + app.getName() + "] khỏi hệ thống.");
            return ResponseEntity.ok(res);
        } catch (DataIntegrityViolationException e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("blocked", true);
            error.put("message", "Không thể xóa app vì còn dữ liệu liên quan trong hệ thống.");
            return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
        }
    }

    // DTO cho batch-free-key
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BatchFreeKeyRequest {
        private List<String> appIds;
        private String freeKey;
    }

    // DTO cho batch-bypass-link
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BatchBypassLinkRequest {
        private List<String> appIds;
        private String bypassLink; // Will be mapped to ipaUrl
    }

    /**
     * Gán cùng 1 mã Key Free cho nhiều App cùng lúc.
     * Body: { appIds: ["app-001", "app-002", ...], freeKey: "FREE-KEY-CODE" }
     */
    @PostMapping("/batch-free-key")
    @CacheEvict(value = "apps", allEntries = true)
    public ResponseEntity<?> batchSetFreeKey(
            @RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth,
            @RequestBody BatchFreeKeyRequest req) {
        if (!AdminSecurityUtil.isValidAdmin(adminAuth)) {
            return ResponseEntity.status(403).body("Security Error: Only authenticated Admin can edit apps.");
        }
        if (req.getAppIds() == null || req.getAppIds().isEmpty()) {
            return ResponseEntity.badRequest().body("No app IDs provided.");
        }

        String today = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy")
                .format(java.time.LocalDate.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh")));

        List<String> updated = new ArrayList<>();
        List<String> notFound = new ArrayList<>();
        for (String appId : req.getAppIds()) {
            appRepository.findById(appId).ifPresentOrElse(
                app -> {
                    app.setFreeKey(req.getFreeKey() != null ? req.getFreeKey().trim() : "");
                    app.setUpdatedAt(today);
                    appRepository.save(app);
                    updated.add(appId);
                },
                () -> notFound.add(appId)
            );
        }

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("updatedCount", updated.size());
        response.put("updatedApps", updated);
        if (!notFound.isEmpty()) {
            response.put("notFound", notFound);
        }
        response.put("message", "Đã cập nhật Key Free cho " + updated.size() + " app thành công!");
        return ResponseEntity.ok(response);
    }

    /**
     * Gán cùng 1 Link Vượt (Bypass Link) cho nhiều App cùng lúc.
     * Body: { appIds: ["app-001", "app-002", ...], bypassLink: "https://linkvertise.com/..." }
     */
    @PostMapping("/batch-bypass-link")
    @CacheEvict(value = "apps", allEntries = true)
    public ResponseEntity<?> batchSetBypassLink(
            @RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth,
            @RequestBody BatchBypassLinkRequest req) {
        if (!AdminSecurityUtil.isValidAdmin(adminAuth)) {
            return ResponseEntity.status(403).body("Security Error: Only authenticated Admin can edit apps.");
        }
        if (req.getAppIds() == null || req.getAppIds().isEmpty()) {
            return ResponseEntity.badRequest().body("No app IDs provided.");
        }

        String today = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy")
                .format(java.time.LocalDate.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh")));

        List<String> updated = new ArrayList<>();
        List<String> notFound = new ArrayList<>();
        for (String appId : req.getAppIds()) {
            appRepository.findById(appId).ifPresentOrElse(
                app -> {
                    app.setIpaUrl(req.getBypassLink() != null ? req.getBypassLink().trim() : "");
                    app.setUpdatedAt(today);
                    appRepository.save(app);
                    updated.add(appId);
                },
                () -> notFound.add(appId)
            );
        }

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("updatedCount", updated.size());
        response.put("updatedApps", updated);
        if (!notFound.isEmpty()) {
            response.put("notFound", notFound);
        }
        response.put("message", "Đã cập nhật Link Vượt (Bypass Link) cho " + updated.size() + " app thành công!");
        return ResponseEntity.ok(response);
    }
}
