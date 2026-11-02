package com.example.demo.controller;

import com.example.demo.dto.chat.AiChatConfigDTO;
import com.example.demo.dto.chat.ChatRequestDTO;
import com.example.demo.dto.chat.ChatResponseDTO;
import com.example.demo.model.SystemConfigEntity;
import com.example.demo.repository.SystemConfigRepository;
import com.example.demo.service.AiChatService;
import com.example.demo.util.AdminSecurityUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/chat")
@CrossOrigin(origins = "*")
public class AiChatController {

    @Autowired
    private AiChatService aiChatService;

    @Autowired
    private SystemConfigRepository systemConfigRepository;

    /**
     * Public endpoint to get chatbot configuration (UI display, quick prompts, status)
     */
    @GetMapping("/config")
    public ResponseEntity<AiChatConfigDTO> getPublicConfig() {
        return ResponseEntity.ok(aiChatService.getPublicChatConfig());
    }

    /**
     * Public endpoint for sending a message to AI Assistant
     */
    @PostMapping("/message")
    public ResponseEntity<ChatResponseDTO> sendMessage(
            HttpServletRequest request,
            @RequestBody ChatRequestDTO chatRequest) {

        String clientIp = getClientIp(request);
        ChatResponseDTO response = aiChatService.processMessage(chatRequest, clientIp);
        return ResponseEntity.ok(response);
    }

    /**
     * Admin endpoint: get complete chatbot configuration including custom instruction
     */
    @GetMapping("/admin/config")
    public ResponseEntity<?> getAdminChatConfig(
            @RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth) {

        if (!AdminSecurityUtil.isValidAdmin(adminAuth)) {
            return ResponseEntity.status(403).body(Map.of("error", "Lỗi bảo mật: Quyền truy cập bị từ chối."));
        }

        SystemConfigEntity config = aiChatService.getSystemConfig();
        AiChatConfigDTO dto = aiChatService.getPublicChatConfig();
        dto.setSystemInstruction(config.getChatbotSystemInstruction());

        return ResponseEntity.ok(dto);
    }

    /**
     * Admin endpoint: update chatbot settings
     */
    @PutMapping("/admin/config")
    public ResponseEntity<?> updateAdminChatConfig(
            @RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth,
            @RequestBody AiChatConfigDTO updateDTO) {

        if (!AdminSecurityUtil.isValidAdmin(adminAuth)) {
            return ResponseEntity.status(403).body(Map.of("error", "Lỗi bảo mật: Quyền truy cập bị từ chối."));
        }

        SystemConfigEntity config = aiChatService.getSystemConfig();
        if (updateDTO.getEnabled() != null) {
            config.setChatbotEnabled(updateDTO.getEnabled());
        }
        if (updateDTO.getBotName() != null) {
            config.setChatbotBotName(updateDTO.getBotName().trim());
        }
        if (updateDTO.getWelcomeMessage() != null) {
            config.setChatbotWelcomeMessage(updateDTO.getWelcomeMessage().trim());
        }
        if (updateDTO.getQuickPrompts() != null) {
            config.setChatbotQuickPrompts(String.join("\n", updateDTO.getQuickPrompts()));
        }
        if (updateDTO.getSystemInstruction() != null) {
            config.setChatbotSystemInstruction(updateDTO.getSystemInstruction().trim());
        }

        systemConfigRepository.save(config);

        return ResponseEntity.ok(Map.of("success", true, "message", "Cập nhật cấu hình Trợ lý AI thành công!"));
    }

    private String getClientIp(HttpServletRequest request) {
        String xf = request.getHeader("X-Forwarded-For");
        if (xf != null && !xf.isBlank()) {
            return xf.split(",")[0].trim();
        }
        String cr = request.getHeader("CF-Connecting-IP");
        if (cr != null && !cr.isBlank()) {
            return cr.trim();
        }
        return request.getRemoteAddr();
    }
}

