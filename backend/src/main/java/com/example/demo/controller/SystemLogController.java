package com.example.demo.controller;

import com.example.demo.model.SystemLogEntity;
import com.example.demo.service.SystemLogService;
import com.example.demo.util.AdminSecurityUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/logs")
@CrossOrigin(origins = "*")
public class SystemLogController {

    @Autowired
    private SystemLogService systemLogService;

    @GetMapping
    public ResponseEntity<?> getSystemLogs(
            @RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth) {
        if (!AdminSecurityUtil.isValidAdmin(adminAuth)) {
            return ResponseEntity.status(403).body("Lỗi bảo mật: Chỉ Admin mới có quyền xem nhật ký hoạt động.");
        }
        List<SystemLogEntity> logs = systemLogService.getAllLogs();
        return ResponseEntity.ok(logs);
    }

    @PostMapping("/track-event")
    public ResponseEntity<?> trackClientEvent(
            HttpServletRequest request,
            @RequestBody Map<String, String> payload) {
        String action = payload.getOrDefault("action", "CLIENT_ACTIVITY");
        String details = payload.getOrDefault("details", "Khách hàng thao tác trên trang web.");
        
        systemLogService.log(request, action, details);
        return ResponseEntity.ok().body("{\"success\": true}");
    }

    @DeleteMapping("/clear")
    public ResponseEntity<?> clearLogs(
            @RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth) {
        if (!AdminSecurityUtil.isValidAdmin(adminAuth)) {
            return ResponseEntity.status(403).body("Lỗi bảo mật: Chỉ Admin mới có quyền xóa nhật ký hoạt động.");
        }
        systemLogService.clearAllLogs();
        return ResponseEntity.ok().body("{\"message\": \"Đã xóa toàn bộ nhật ký hoạt động thành công!\"}");
    }
}
