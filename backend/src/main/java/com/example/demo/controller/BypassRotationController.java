package com.example.demo.controller;

import com.example.demo.dto.bypass.BypassRotationConfigDTO;
import com.example.demo.dto.bypass.BypassRotationStatusDTO;
import com.example.demo.service.BypassRotationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/bypass-rotation")
@CrossOrigin(origins = "*")
public class BypassRotationController {

    private final BypassRotationService bypassRotationService;

    @Autowired
    public BypassRotationController(BypassRotationService bypassRotationService) {
        this.bypassRotationService = bypassRotationService;
    }

    @GetMapping("/status")
    public ResponseEntity<?> getStatus(@RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth) {
        try {
            BypassRotationStatusDTO status = bypassRotationService.getStatus(adminAuth);
            return ResponseEntity.ok(status);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/config")
    public ResponseEntity<?> saveConfig(
            @RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth,
            @RequestBody BypassRotationConfigDTO payload) {
        try {
            BypassRotationStatusDTO status = bypassRotationService.saveConfig(adminAuth, payload);
            return ResponseEntity.ok(status);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/rotate-now")
    public ResponseEntity<?> rotateNow(@RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth) {
        try {
            BypassRotationStatusDTO status = bypassRotationService.forceRotateNow(adminAuth);
            return ResponseEntity.ok(status);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
