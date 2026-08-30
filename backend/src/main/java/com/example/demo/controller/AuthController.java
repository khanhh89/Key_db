package com.example.demo.controller;

import com.example.demo.model.SystemConfigEntity;
import com.example.demo.repository.SystemConfigRepository;
import com.example.demo.service.SystemLogService;
import com.example.demo.util.AdminSecurityUtil;
import com.example.demo.util.PasswordUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.time.Instant;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.beans.factory.annotation.Value;
import com.example.demo.util.TotpUtil;
import com.warrenstrange.googleauth.GoogleAuthenticatorKey;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    private SystemConfigRepository systemConfigRepository;

    @Autowired
    private SystemLogService systemLogService;

    @Value("${RESCUE_SECRET_KEY:}")
    private String rescueSecretKey;

    private static final ConcurrentHashMap<String, Integer> loginAttempts = new ConcurrentHashMap<>();
    private static final ConcurrentHashMap<String, Long> lockouts = new ConcurrentHashMap<>();
    private static String lastKnownIp = "";

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
        
        String ip = getClientIp(request);
        if (lockouts.containsKey(ip)) {
            if (Instant.now().toEpochMilli() < lockouts.get(ip)) {
                response.put("success", false);
                response.put("message", "IP của bạn đã bị khóa tạm thời do đăng nhập sai quá nhiều lần. Vui lòng thử lại sau 15 phút.");
                return ResponseEntity.status(429).body(response);
            } else {
                lockouts.remove(ip);
                loginAttempts.remove(ip);
            }
        }

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
            loginAttempts.remove(ip);
            
            String totpSecret = config.getTotpSecret();
            String otpCodeStr = payload.get("otpCode");
            String setupSecret = payload.get("setupSecret");

            if (totpSecret == null || totpSecret.isEmpty()) {
                // Not set up yet
                if (setupSecret != null && !setupSecret.isEmpty() && otpCodeStr != null && !otpCodeStr.isEmpty()) {
                    try {
                        int otpCode = Integer.parseInt(otpCodeStr.trim());
                        if (TotpUtil.verifyCode(setupSecret, otpCode)) {
                            config.setTotpSecret(setupSecret);
                            systemConfigRepository.save(config);
                        } else {
                            response.put("success", false);
                            response.put("message", "Mã OTP không chính xác. Vui lòng thử lại.");
                            return ResponseEntity.status(400).body(response);
                        }
                    } catch (NumberFormatException e) {
                        response.put("success", false);
                        response.put("message", "Mã OTP phải là số.");
                        return ResponseEntity.status(400).body(response);
                    }
                } else {
                    GoogleAuthenticatorKey key = TotpUtil.generateSecret();
                    String qrUrl = TotpUtil.getQrUrl("ModLienQuan", username, key);
                    response.put("success", true);
                    response.put("requiresSetup2FA", true);
                    response.put("setupSecret", key.getKey());
                    response.put("qrUrl", qrUrl);
                    response.put("message", "Yêu cầu thiết lập Bảo mật 2 lớp (2FA).");
                    return ResponseEntity.ok(response);
                }
            } else {
                // 2FA is set up
                if (otpCodeStr != null && !otpCodeStr.isEmpty()) {
                    try {
                        int otpCode = Integer.parseInt(otpCodeStr.trim());
                        if (!TotpUtil.verifyCode(totpSecret, otpCode)) {
                            response.put("success", false);
                            response.put("message", "Mã OTP không chính xác.");
                            return ResponseEntity.status(400).body(response);
                        }
                    } catch (NumberFormatException e) {
                        response.put("success", false);
                        response.put("message", "Mã OTP phải là số.");
                        return ResponseEntity.status(400).body(response);
                    }
                } else {
                    response.put("success", true);
                    response.put("requires2FA", true);
                    response.put("message", "Vui lòng nhập mã OTP từ Google Authenticator.");
                    return ResponseEntity.ok(response);
                }
            }

            if (!lastKnownIp.isEmpty() && !lastKnownIp.equals(ip)) {
                systemLogService.log(request, "SECURITY_WARNING", "Phát hiện IP Admin thay đổi từ " + lastKnownIp + " sang " + ip);
            }
            lastKnownIp = ip;
            
            String token = AdminSecurityUtil.getCurrentRollingToken();
            systemLogService.log(request, "ADMIN_LOGIN_SUCCESS", "Admin [" + username + "] đăng nhập thành công vào Bảng điều khiển. IP: " + ip);
            response.put("success", true);
            response.put("token", token);
            response.put("message", "Đăng nhập Admin thành công!");
            return ResponseEntity.ok(response);
        }

        int attempts = loginAttempts.getOrDefault(ip, 0) + 1;
        loginAttempts.put(ip, attempts);
        if (attempts >= 5) {
            lockouts.put(ip, Instant.now().toEpochMilli() + (15 * 60 * 1000)); // 15 minutes lockout
            systemLogService.log(request, "BRUTE_FORCE_LOCK", "Khóa IP " + ip + " do đăng nhập sai 5 lần.");
            response.put("success", false);
            response.put("message", "Nhập sai quá 5 lần. IP bị khóa 15 phút!");
            return ResponseEntity.status(429).body(response);
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

        String newPassword = payload.get("newPassword");

        if (newPassword == null || newPassword.trim().length() < 4) {
            response.put("success", false);
            response.put("message", "Mật khẩu mới phải từ 4 ký tự trở lên.");
            return ResponseEntity.status(400).body(response);
        }

        SystemConfigEntity config = systemConfigRepository.findAll().stream().findFirst().orElseGet(() -> new SystemConfigEntity());

        // Hash new password using BCrypt before storing
        String hashedPassword = PasswordUtil.hashPassword(newPassword.trim());
        config.setAdminPassword(hashedPassword);
        systemConfigRepository.save(config);

        systemLogService.log(request, "ADMIN_CHANGE_PASSWORD_SUCCESS", "Admin đã đổi mật khẩu bảo mật mới và lưu mã hóa thành công.");

        response.put("success", true);
        response.put("message", "Đã mã hóa và cập nhật mật khẩu Admin mới thành công!");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/rescue-reset")
    public ResponseEntity<Map<String, Object>> rescueReset(
            HttpServletRequest request,
            @RequestHeader(value = "X-Rescue-Key", required = false) String rescueKey) {
        Map<String, Object> response = new HashMap<>();

        String expectedKey = (rescueSecretKey != null && !rescueSecretKey.isEmpty()) ? rescueSecretKey : "RescueAdmin2026!";

        if (rescueKey == null || !rescueKey.equals(expectedKey)) {
            systemLogService.log(request, "RESCUE_DENIED", "Nỗ lực reset mật khẩu cứu hộ thất bại do sai mã Key.");
            response.put("success", false);
            response.put("message", "Mã cứu hộ không hợp lệ.");
            return ResponseEntity.status(403).body(response);
        }

        SystemConfigEntity config = systemConfigRepository.findAll().stream().findFirst().orElseGet(() -> new SystemConfigEntity());
        config.setAdminPassword(PasswordUtil.hashPassword("admin123"));
        config.setTotpSecret(null);
        systemConfigRepository.save(config);

        systemLogService.log(request, "RESCUE_SUCCESS", "Mật khẩu Admin đã được khôi phục về mặc định (admin123) và tắt 2FA bằng Rescue Key.");
        response.put("success", true);
        response.put("message", "Mật khẩu đã được reset về 'admin123' thành công.");
        return ResponseEntity.ok(response);
    }

    private String getClientIp(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null) {
            return request.getRemoteAddr();
        }
        return xfHeader.split(",")[0];
    }
}
