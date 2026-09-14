package com.example.demo.controller;

import com.example.demo.model.AppItemEntity;
import com.example.demo.service.AppService;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/apps")
@CrossOrigin(origins = "*")
public class AppController {

    private final AppService appService;

    @Autowired
    public AppController(AppService appService) {
        this.appService = appService;
    }

    @GetMapping
    public List<AppItemEntity> getAllApps() {
        return appService.getAllApps();
    }

    @GetMapping("/{id}")
    public ResponseEntity<AppItemEntity> getAppById(@PathVariable String id) {
        return appService.getAppById(id);
    }

    @PostMapping
    public ResponseEntity<?> createApp(
            @RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth,
            @RequestBody AppItemEntity app) {
        return appService.createApp(adminAuth, app);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateApp(
            @RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth,
            @PathVariable String id,
            @RequestBody AppItemEntity appDetails) {
        return appService.updateApp(adminAuth, id, appDetails);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteApp(
            @RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth,
            @PathVariable String id) {
        return appService.deleteApp(adminAuth, id);
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

    @PostMapping("/batch-free-key")
    public ResponseEntity<?> batchSetFreeKey(
            @RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth,
            @RequestBody BatchFreeKeyRequest req) {
        return appService.batchSetFreeKey(adminAuth, req);
    }

    @PostMapping("/batch-bypass-link")
    public ResponseEntity<?> batchSetBypassLink(
            @RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth,
            @RequestBody BatchBypassLinkRequest req) {
        return appService.batchSetBypassLink(adminAuth, req);
    }
}
