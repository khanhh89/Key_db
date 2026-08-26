package com.example.demo.controller;

import com.example.demo.dto.DeviceSyncDTO;
import com.example.demo.dto.FeedbackCreateDTO;
import com.example.demo.model.DeviceUserEntity;
import com.example.demo.model.FeedbackEntity;
import com.example.demo.service.DeviceService;
import com.example.demo.service.FeedbackService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
@CrossOrigin(origins = "*")
public class FeedbackController {

    @Autowired
    private DeviceService deviceService;

    @Autowired
    private FeedbackService feedbackService;

    @PostMapping("/device/sync")
    public ResponseEntity<?> syncDevice(
            @RequestHeader(value = "X-Device-Id", required = false) String deviceIdHeader,
            @RequestBody(required = false) DeviceSyncDTO syncDTO,
            HttpServletRequest request) {

        if (deviceIdHeader == null || deviceIdHeader.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing X-Device-Id header"));
        }

        String ip = getClientIp(request);
        String userAgent = request.getHeader("User-Agent");

        try {
            DeviceUserEntity device = deviceService.syncDevice(deviceIdHeader, ip, userAgent, syncDTO);
            return ResponseEntity.ok(device);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/feedbacks")
    public ResponseEntity<?> createFeedback(
            @RequestHeader(value = "X-Device-Id", required = false) String deviceIdHeader,
            @RequestBody FeedbackCreateDTO dto,
            HttpServletRequest request) {

        if (deviceIdHeader == null || deviceIdHeader.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing X-Device-Id header"));
        }

        String ip = getClientIp(request);
        String userAgent = request.getHeader("User-Agent");

        try {
            FeedbackEntity created = feedbackService.createFeedback(deviceIdHeader, dto, ip, userAgent);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/feedbacks/my-feedbacks")
    public ResponseEntity<?> getMyFeedbacks(
            @RequestHeader(value = "X-Device-Id", required = false) String deviceIdHeader) {

        if (deviceIdHeader == null || deviceIdHeader.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing X-Device-Id header"));
        }

        List<FeedbackEntity> list = feedbackService.getFeedbacksByDevice(deviceIdHeader);
        return ResponseEntity.ok(list);
    }

    @GetMapping("/feedbacks/public-approved")
    public ResponseEntity<?> getPublicApprovedFeedbacks() {
        List<FeedbackEntity> list = feedbackService.getApprovedPublicFeedbacks();
        return ResponseEntity.ok(list);
    }

    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
