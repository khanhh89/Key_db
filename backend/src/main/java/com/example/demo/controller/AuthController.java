package com.example.demo.controller;

import com.example.demo.model.SystemConfigEntity;
import com.example.demo.repository.SystemConfigRepository;
import com.example.demo.service.SystemLogService;
import com.example.demo.util.AdminSecurityUtil;
import com.example.demo.util.PasswordUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    private SystemConfigRepository systemConfigRepository;

    @Autowired
    private SystemLogService systemLogService;

    @GetMapping("/rolling-token")
    public ResponseEntity<Map<String, Object>> getRollingToken(
            @RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth) {
        Map<String, Object> response = new HashMap<>();

        if (AdminSecurityUtil.isValidAdmin(adminAuth)) {
            String currentRollingToken = AdminSecurityUtil.getCurrentRollingToken();
            response.put("success", true);
            response.put("token", currentRollingToken);
            response.put("expiresInSeconds", 300);
            response.put("message", "Token Admin được tự động làm mới thành công (Xoay tua 5 phút).");
            return ResponseEntity.ok(response);
        }

        response.put("success", false);
        response.put("message", "Unauthorized: Mã xác thực Admin không hợp lệ.");
        return ResponseEntity.status(401).body(response);
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(
            HttpServletRequest request,
            @RequestBody Map<String, String> payload) {
        Map<String, Object> response = new HashMap<>();
        String username = payload.get("username");
        String password = payload.get("password");

        SystemConfigEntity config = systemConfigRepository.findAll().stream().findFirst().orElse(null);
        String expectedUsername = (config != null && config.getAdminUsername() != null && !config.getAdminUsername().isEmpty())
                ? config.getAdminUsername()
                : "admin";

        String storedPasswordHash = (config != null && config.getAdminPassword() != null && !config.getAdminPassword().isEmpty())
                ? config.getAdminPassword()
                : null;

        if (expectedUsername.equals(username) && PasswordUtil.verifyPassword(password, storedPasswordHash)) {
            String token = AdminSecurityUtil.getCurrentRollingToken();
            systemLogService.log(request, "ADMIN_LOGIN_SUCCESS", "Admin [" + username + "] đăng nhập thành công vào Bảng điều khiển.");
            response.put("success", true);
            response.put("token", token);
            response.put("message", "Đăng nhập Admin thành công!");
            return ResponseEntity.ok(response);
        }

        systemLogService.log(request, "ADMIN_LOGIN_FAIL", "Thất bại đăng nhập Admin với tài khoản [" + username + "]. Mật khẩu không chính xác.");
        response.put("success", false);
        response.put("message", "Tên đăng nhập hoặc mật khẩu không chính xác!");
        return ResponseEntity.status(400).body(response);
    }

    @PostMapping("/change-password")
    public ResponseEntity<Map<String, Object>> changePassword(
            HttpServletRequest request,
            @RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth,
            @RequestBody Map<String, String> payload) {
        Map<String, Object> response = new HashMap<>();

        if (!AdminSecurityUtil.isValidAdmin(adminAuth)) {
            systemLogService.log(request, "ADMIN_CHANGE_PASSWORD_DENIED", "Cố gắng đổi mật khẩu không hợp lệ từ phiên làm việc chưa xác thực.");
            response.put("success", false);
            response.put("message", "Lỗi bảo mật: Chỉ Admin đã xác thực mới có quyền đổi mật khẩu.");
            return ResponseEntity.status(403).body(response);
        }

        String currentPassword = payload.get("currentPassword");
        String newPassword = payload.get("newPassword");

        if (newPassword == null || newPassword.trim().length() < 4) {
            response.put("success", false);
            response.put("message", "Mật khẩu mới phải từ 4 ký tự trở lên.");
            return ResponseEntity.status(400).body(response);
        }

        SystemConfigEntity config = systemConfigRepository.findAll().stream().findFirst().orElseGet(() -> new SystemConfigEntity());
        String storedPasswordHash = config.getAdminPassword();

        if (!PasswordUtil.verifyPassword(currentPassword, storedPasswordHash)) {
            systemLogService.log(request, "ADMIN_CHANGE_PASSWORD_FAIL", "Lỗi đổi mật khẩu Admin: Mật khẩu hiện tại nhập sai.");
            response.put("success", false);
            response.put("message", "Mật khẩu hiện tại không chính xác!");
            return ResponseEntity.status(400).body(response);
        }

        // Hash new password using BCrypt before storing
        String hashedPassword = PasswordUtil.hashPassword(newPassword.trim());
        config.setAdminPassword(hashedPassword);
        systemConfigRepository.save(config);

        systemLogService.log(request, "ADMIN_CHANGE_PASSWORD_SUCCESS", "Admin đã đổi mật khẩu bảo mật mới và lưu mã hóa thành công.");

        response.put("success", true);
        response.put("message", "Đã mã hóa và cập nhật mật khẩu Admin mới thành công!");
        return ResponseEntity.ok(response);
    }
}
