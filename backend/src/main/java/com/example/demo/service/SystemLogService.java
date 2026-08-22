package com.example.demo.service;

import com.example.demo.model.SystemLogEntity;
import com.example.demo.repository.SystemLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class SystemLogService {

    private static final Logger logger = LoggerFactory.getLogger(SystemLogService.class);

    @Autowired
    private SystemLogRepository systemLogRepository;

    /**
     * Record user activity audit log into system storage & server logger
     */
    public void log(HttpServletRequest request, String action, String details) {
        try {
            String clientIp = extractClientIp(request);
            String userAgent = request != null ? request.getHeader("User-Agent") : "Unknown";

            LocalDateTime now = LocalDateTime.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh"));
            logger.info("AUDIT LOG [{}] | IP: {} | Action: {} | Details: {}",
                    now, clientIp, action, details);

            SystemLogEntity logEntity = SystemLogEntity.builder()
                    .action(action)
                    .clientIp(clientIp)
                    .userAgent(userAgent != null && userAgent.length() > 500 ? userAgent.substring(0, 497) + "..." : userAgent)
                    .details(details)
                    .createdAt(now)
                    .build();

            systemLogRepository.save(logEntity);
        } catch (Exception e) {
            logger.warn("Failed to record system activity log", e);
        }
    }

    public List<SystemLogEntity> getAllLogs() {
        return systemLogRepository.findAllByOrderByIdDesc();
    }

    public void clearAllLogs() {
        systemLogRepository.deleteAll();
    }

    private String extractClientIp(HttpServletRequest request) {
        if (request == null) return "127.0.0.1";
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("WL-Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        return ip != null ? ip : "127.0.0.1";
    }
}
