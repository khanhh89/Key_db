package com.example.demo.controller;

import com.example.demo.model.AppItemEntity;
import com.example.demo.repository.AppRepository;
import com.example.demo.util.AdminSecurityUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/apps")
@CrossOrigin(origins = "*")
public class AppController {

    @Autowired
    private AppRepository appRepository;

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
            app.setUpdatedAt(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy").format(java.time.LocalDate.now()));
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
            app.setUpdatedAt(appDetails.getUpdatedAt() != null && !appDetails.getUpdatedAt().trim().isEmpty()
                ? appDetails.getUpdatedAt()
                : java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy").format(java.time.LocalDate.now()));
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

        if (appRepository.existsById(id)) {
            appRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}
