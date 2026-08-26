package com.example.demo.controller;

import com.example.demo.dto.FeedbackReplyDTO;
import com.example.demo.model.DeviceUserEntity;
import com.example.demo.model.FeedbackEntity;
import com.example.demo.service.DeviceService;
import com.example.demo.service.FeedbackService;
import com.example.demo.util.AdminSecurityUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin")
@CrossOrigin(origins = "*")
public class AdminFeedbackController {

    @Autowired
    private FeedbackService feedbackService;

    @Autowired
    private DeviceService deviceService;

    @GetMapping("/feedbacks")
    public ResponseEntity<?> getFeedbacks(
            @RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String category,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        if (!AdminSecurityUtil.isValidAdmin(adminAuth)) {
            return ResponseEntity.status(403).body(Map.of("error", "Security Error: Admin authentication required."));
        }

        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<FeedbackEntity> feedbackPage = feedbackService.getAdminFeedbacks(status, category, pageable);
        return ResponseEntity.ok(feedbackPage);
    }

    @PutMapping("/feedbacks/{id}/reply")
    public ResponseEntity<?> replyFeedback(
            @RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth,
            @PathVariable Long id,
            @RequestBody FeedbackReplyDTO dto) {

        if (!AdminSecurityUtil.isValidAdmin(adminAuth)) {
            return ResponseEntity.status(403).body(Map.of("error", "Security Error: Admin authentication required."));
        }

        try {
            FeedbackEntity updated = feedbackService.replyFeedback(id, dto);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/devices/{deviceId}/block")
    public ResponseEntity<?> setDeviceBlocked(
            @RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth,
            @PathVariable String deviceId,
            @RequestBody Map<String, Boolean> body) {

        if (!AdminSecurityUtil.isValidAdmin(adminAuth)) {
            return ResponseEntity.status(403).body(Map.of("error", "Security Error: Admin authentication required."));
        }

        Boolean isBlocked = body.getOrDefault("isBlocked", true);
        try {
            DeviceUserEntity device = deviceService.setDeviceBlockedStatus(deviceId, isBlocked);
            return ResponseEntity.ok(device);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
