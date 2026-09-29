package com.example.demo.controller;

import com.example.demo.dto.gateway.*;
import com.example.demo.service.ShortlinkGatewayService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/gateway")
@CrossOrigin(origins = "*")
public class ShortlinkGatewayController {

    private final ShortlinkGatewayService gatewayService;

    @Autowired
    public ShortlinkGatewayController(ShortlinkGatewayService gatewayService) {
        this.gatewayService = gatewayService;
    }

    // ==========================================
    // PUBLIC CLIENT ENDPOINTS
    // ==========================================

    @GetMapping("/check-device")
    public ResponseEntity<?> checkDeviceEntitlement(@RequestParam("deviceId") String deviceId) {
        try {
            return ResponseEntity.ok(gatewayService.checkDeviceEntitlement(deviceId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("isEntitled", false, "message", e.getMessage()));
        }
    }

    @GetMapping("/redirect")
    public ResponseEntity<Void> nestedRedirect(@RequestParam("url") String base64Url) {
        try {
            String decodedUrl = new String(java.util.Base64.getDecoder().decode(base64Url), java.nio.charset.StandardCharsets.UTF_8);
            return ResponseEntity.status(302).header("Location", decodedUrl).build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/create-session")
    public ResponseEntity<?> createSession(@RequestBody CreateBypassSessionRequestDTO req, HttpServletRequest httpReq) {
        try {
            CreateBypassSessionResponseDTO res = gatewayService.createBypassSession(req, httpReq);
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @PostMapping("/verify-session")
    public ResponseEntity<?> verifySession(@RequestBody VerifyBypassSessionRequestDTO req, HttpServletRequest httpReq) {
        try {
            VerifyBypassSessionResponseDTO res = gatewayService.verifyBypassSession(req, httpReq);
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    // ==========================================
    // ADMIN MANAGEMENT ENDPOINTS
    // ==========================================

    @GetMapping("/admin/providers")
    public ResponseEntity<?> getAllProviders(@RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth) {
        try {
            return ResponseEntity.ok(gatewayService.getAllProviders(adminAuth));
        } catch (Exception e) {
            return ResponseEntity.status(403).body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/admin/providers")
    public ResponseEntity<?> createProvider(
            @RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth,
            @RequestBody BypassProviderDTO dto) {
        try {
            return ResponseEntity.ok(gatewayService.createProvider(adminAuth, dto));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/admin/providers/{id}")
    public ResponseEntity<?> updateProvider(
            @RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth,
            @PathVariable("id") String id,
            @RequestBody BypassProviderDTO dto) {
        try {
            return ResponseEntity.ok(gatewayService.updateProvider(adminAuth, id, dto));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/admin/providers/{id}")
    public ResponseEntity<?> deleteProvider(
            @RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth,
            @PathVariable("id") String id) {
        try {
            return ResponseEntity.ok(gatewayService.deleteProvider(adminAuth, id));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/admin/test-provider")
    public ResponseEntity<?> testProvider(
            @RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth,
            @RequestBody TestProviderRequestDTO req) {
        try {
            return ResponseEntity.ok(gatewayService.testProviderConnection(adminAuth, req));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/admin/stats")
    public ResponseEntity<?> getStats(@RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth) {
        try {
            return ResponseEntity.ok(gatewayService.getGatewayStats(adminAuth));
        } catch (Exception e) {
            return ResponseEntity.status(403).body(Map.of("message", e.getMessage()));
        }
    }
}
