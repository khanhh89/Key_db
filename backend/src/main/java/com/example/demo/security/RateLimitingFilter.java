package com.example.demo.security;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;


@Component
public class RateLimitingFilter implements Filter {

    private static final int MAX_REQUESTS_PER_MINUTE = 60;
    private final Map<String, ClientRateLimit> rateLimitMap = new ConcurrentHashMap<>();

    private static class ClientRateLimit {
        long windowStartTimestamp;
        AtomicInteger requestCount;

        ClientRateLimit(long now) {
            this.windowStartTimestamp = now;
            this.requestCount = new AtomicInteger(1);
        }
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;

        // Apply state-of-the-art security HTTP response headers
        httpResponse.setHeader("X-Content-Type-Options", "nosniff");
        httpResponse.setHeader("X-Frame-Options", "DENY");
        httpResponse.setHeader("X-XSS-Protection", "1; mode=block");
        httpResponse.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
        httpResponse.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");

        String path = httpRequest.getRequestURI();

        // Rate limit public write & lookup APIs (Order Creation, Payment Verification, Key Queries, Auth)
        if (path.startsWith("/api/orders") || path.startsWith("/api/keys") || path.startsWith("/api/auth") || path.startsWith("/api/payos") || path.startsWith("/api/cloudinary")) {
            String clientIp = getClientIp(httpRequest);
            long currentTimeMs = System.currentTimeMillis();

            ClientRateLimit rateLimit = rateLimitMap.compute(clientIp, (ip, existing) -> {
                if (existing == null || currentTimeMs - existing.windowStartTimestamp > 60000) {
                    return new ClientRateLimit(currentTimeMs);
                } else {
                    existing.requestCount.incrementAndGet();
                    return existing;
                }
            });

            if (rateLimit.requestCount.get() > MAX_REQUESTS_PER_MINUTE) {
                System.err.println(">>> [RateLimitingFilter] Rate limit exceeded for IP: " + clientIp + " on path: " + path);
                httpResponse.setStatus(429); // HTTP 429 Too Many Requests
                httpResponse.setContentType("application/json;charset=UTF-8");
                httpResponse.getWriter().write(
                    "{\"error\":\"Quá nhiều yêu cầu. Vui lòng thử lại sau 1 phút!\",\"code\":429}"
                );
                return;
            }
        }

        chain.doFilter(request, response);
    }

    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            String candidate = xForwardedFor.split(",")[0].trim();
            if (isValidIp(candidate)) {
                return candidate;
            }
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank() && isValidIp(realIp.trim())) {
            return realIp.trim();
        }
        return request.getRemoteAddr();
    }

    private boolean isValidIp(String ip) {
        if (ip == null || ip.length() < 7 || ip.length() > 45) return false;
        // Simple validation check for IPv4 / IPv6 structure
        return ip.matches("^[0-9a-fA-F:.]+$");
    }
}
