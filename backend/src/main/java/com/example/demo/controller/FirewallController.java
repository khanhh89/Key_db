package com.example.demo.controller;

import com.example.demo.model.IpFilterRuleEntity;
import com.example.demo.repository.IpFilterRuleRepository;
import com.example.demo.service.FirewallService;
import com.example.demo.util.AdminSecurityUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/firewall")
@CrossOrigin(origins = "*")
public class FirewallController {

    @Autowired
    private IpFilterRuleRepository ipFilterRuleRepository;

    @Autowired
    private FirewallService firewallService;

    // Lấy danh sách rules
    @GetMapping("/rules")
    public ResponseEntity<?> getRules(@RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth) {
        if (!AdminSecurityUtil.isValidAdmin(adminAuth)) {
            return ResponseEntity.status(403).body(Map.of("success", false, "message", "Unauthorized"));
        }
        List<IpFilterRuleEntity> rules = ipFilterRuleRepository.findAll();
        return ResponseEntity.ok(Map.of("success", true, "data", rules));
    }

    // Thêm hoặc cập nhật rule
    @PostMapping("/rules")
    public ResponseEntity<?> addRule(@RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth,
                                     @RequestBody Map<String, String> payload) {
        if (!AdminSecurityUtil.isValidAdmin(adminAuth)) {
            return ResponseEntity.status(403).body(Map.of("success", false, "message", "Unauthorized"));
        }
        
        String ip = payload.get("ipAddress");
        String action = payload.get("action");
        String notes = payload.get("notes");
        
        if (ip == null || ip.isEmpty() || action == null || action.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Missing ipAddress or action"));
        }

        firewallService.addRule(ip, action, notes);
        return ResponseEntity.ok(Map.of("success", true, "message", "Cập nhật IP rule thành công"));
    }

    // Xóa rule
    @DeleteMapping("/rules/{id}")
    public ResponseEntity<?> deleteRule(@RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth,
                                        @PathVariable Long id) {
        if (!AdminSecurityUtil.isValidAdmin(adminAuth)) {
            return ResponseEntity.status(403).body(Map.of("success", false, "message", "Unauthorized"));
        }
        
        var ruleOpt = ipFilterRuleRepository.findById(id);
        if (ruleOpt.isPresent()) {
            firewallService.removeRule(ruleOpt.get().getIpAddress());
            return ResponseEntity.ok(Map.of("success", true, "message", "Đã xóa rule"));
        }
        return ResponseEntity.notFound().build();
    }
}
