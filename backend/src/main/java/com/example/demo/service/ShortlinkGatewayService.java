package com.example.demo.service;

import com.example.demo.dto.gateway.*;
import com.example.demo.model.AppItemEntity;
import com.example.demo.model.BypassDeviceEntitlementEntity;
import com.example.demo.model.BypassProviderEntity;
import com.example.demo.model.BypassSessionEntity;
import com.example.demo.repository.AppRepository;
import com.example.demo.repository.BypassDeviceEntitlementRepository;
import com.example.demo.repository.BypassProviderRepository;
import com.example.demo.repository.BypassSessionRepository;
import com.example.demo.util.AdminSecurityUtil;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
public class ShortlinkGatewayService {

    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final int MIN_BYPASS_DURATION_SECONDS = 15;
    private static final int DEFAULT_ENTITLEMENT_HOURS = 24;

    private final BypassProviderRepository providerRepository;
    private final BypassSessionRepository sessionRepository;
    private final BypassDeviceEntitlementRepository entitlementRepository;
    private final AppRepository appRepository;
    private final SystemLogService systemLogService;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    @Autowired
    public ShortlinkGatewayService(BypassProviderRepository providerRepository,
                                  BypassSessionRepository sessionRepository,
                                  BypassDeviceEntitlementRepository entitlementRepository,
                                  AppRepository appRepository,
                                  SystemLogService systemLogService) {
        this.providerRepository = providerRepository;
        this.sessionRepository = sessionRepository;
        this.entitlementRepository = entitlementRepository;
        this.appRepository = appRepository;
        this.systemLogService = systemLogService;
        this.objectMapper = new ObjectMapper();

        // Configure RestClient with 6-second timeout
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(5000);
        requestFactory.setReadTimeout(6000);
        this.restClient = RestClient.builder().requestFactory(requestFactory).build();
    }

    // =========================================================================
    // PUBLIC CLIENT APIS
    // =========================================================================

    /**
     * Check if client device currently has active entitlement (already completed bypass)
     */
    public Map<String, Object> checkDeviceEntitlement(String deviceId) {
        if (deviceId == null || deviceId.trim().isEmpty()) {
            return Map.of("isEntitled", false);
        }

        LocalDateTime now = LocalDateTime.now(VN_ZONE);
        Optional<BypassDeviceEntitlementEntity> opt = entitlementRepository.findByDeviceIdAndExpiresAtAfter(deviceId.trim(), now);
        if (opt.isPresent()) {
            BypassDeviceEntitlementEntity ent = opt.get();
            return Map.of(
                    "isEntitled", true,
                    "deviceId", ent.getDeviceId(),
                    "expiresAt", ent.getExpiresAt(),
                    "bypassCount", ent.getBypassCount() != null ? ent.getBypassCount() : 1
            );
        }
        return Map.of("isEntitled", false);
    }

    /**
     * Create a new secure bypass session with auto-shortened link
     */
    @Transactional
    public CreateBypassSessionResponseDTO createBypassSession(CreateBypassSessionRequestDTO req, HttpServletRequest httpReq) {
        String deviceId = (req.getDeviceId() != null && !req.getDeviceId().trim().isEmpty())
                ? req.getDeviceId().trim()
                : "dev_" + UUID.randomUUID().toString().substring(0, 12);

        LocalDateTime now = LocalDateTime.now(VN_ZONE);

        // Check if device already entitled
        Optional<BypassDeviceEntitlementEntity> activeEnt = entitlementRepository.findByDeviceIdAndExpiresAtAfter(deviceId, now);
        if (activeEnt.isPresent()) {
            return CreateBypassSessionResponseDTO.builder()
                    .success(true)
                    .alreadyEntitled(true)
                    .expiresAt(activeEnt.get().getExpiresAt())
                    .message("Thiết bị của bạn đã được mở khóa hợp lệ!")
                    .build();
        }

        List<BypassProviderEntity> activeProviders = providerRepository.findByIsActiveTrueOrderByPriorityAsc();
        if (activeProviders.isEmpty()) {
            throw new RuntimeException("Chưa có nhà mạng link vượt nào được kích hoạt trong hệ thống. Vui lòng liên hệ Admin!");
        }

        // Pick provider (either requested or weighted random)
        BypassProviderEntity selectedProvider = null;
        if (req.getProviderId() != null && !req.getProviderId().trim().isEmpty()) {
            selectedProvider = activeProviders.stream()
                    .filter(p -> p.getId().equals(req.getProviderId().trim()))
                    .findFirst()
                    .orElse(null);
        }

        if (selectedProvider == null) {
            selectedProvider = selectWeightedProvider(activeProviders);
        }

        // Generate session ID
        String sessionId = "sess_" + UUID.randomUUID().toString().replace("-", "").substring(0, 20);
        String clientIp = extractClientIp(httpReq);
        String userAgent = httpReq != null ? httpReq.getHeader("User-Agent") : "Unknown";

        // Determine base callback url
        String baseUrl = req.getBaseUrl();
        if (baseUrl == null || baseUrl.trim().isEmpty()) {
            baseUrl = "https://" + (httpReq != null ? httpReq.getServerName() : "modlienquan.com");
        }
        if (baseUrl.endsWith("/")) {
            baseUrl = baseUrl.substring(0, baseUrl.length() - 1);
        }
        String callbackUrl = baseUrl + "/verify-bypass?session=" + sessionId;

        // Call Shortlink API with auto-failover
        String shortenedUrl = callProviderApiWithFailover(selectedProvider, activeProviders, callbackUrl);

        // Lookup App details
        String targetAppName = "All VIP Apps";
        if (req.getAppId() != null && !req.getAppId().trim().isEmpty()) {
            Optional<AppItemEntity> appOpt = appRepository.findById(req.getAppId().trim());
            if (appOpt.isPresent()) {
                targetAppName = appOpt.get().getName();
            }
        }

        LocalDateTime expiresAt = now.plusMinutes(25);

        BypassSessionEntity session = BypassSessionEntity.builder()
                .id(sessionId)
                .providerId(selectedProvider.getId())
                .providerName(selectedProvider.getName())
                .deviceId(deviceId)
                .clientIp(clientIp)
                .userAgent(userAgent)
                .targetAppId(req.getAppId())
                .targetAppName(targetAppName)
                .shortenedUrl(shortenedUrl)
                .callbackUrl(callbackUrl)
                .status("PENDING")
                .startedAt(now)
                .expiresAt(expiresAt)
                .build();

        sessionRepository.save(session);

        // Update provider click count
        selectedProvider.setTotalClicks(selectedProvider.getTotalClicks() + 1);
        providerRepository.save(selectedProvider);

        return CreateBypassSessionResponseDTO.builder()
                .success(true)
                .alreadyEntitled(false)
                .sessionId(sessionId)
                .providerId(selectedProvider.getId())
                .providerName(selectedProvider.getName())
                .shortenedUrl(shortenedUrl)
                .callbackUrl(callbackUrl)
                .expiresAt(expiresAt)
                .message("Đã tạo link vượt thành công!")
                .build();
    }

    /**
     * Verify completed session and grant 24h entitlement
     */
    @Transactional
    public VerifyBypassSessionResponseDTO verifyBypassSession(VerifyBypassSessionRequestDTO req, HttpServletRequest httpReq) {
        if (req.getSessionId() == null || req.getSessionId().trim().isEmpty()) {
            return VerifyBypassSessionResponseDTO.builder()
                    .success(false)
                    .status("INVALID_SESSION")
                    .message("Mã phiên vượt link không được để trống!")
                    .build();
        }

        String sessionId = req.getSessionId().trim();
        Optional<BypassSessionEntity> optSession = sessionRepository.findById(sessionId);
        if (optSession.isEmpty()) {
            return VerifyBypassSessionResponseDTO.builder()
                    .success(false)
                    .status("NOT_FOUND")
                    .message("Mã phiên vượt link không tồn tại hoặc đã bị hủy!")
                    .build();
        }

        BypassSessionEntity session = optSession.get();
        LocalDateTime now = LocalDateTime.now(VN_ZONE);

        // Check if already completed
        if ("COMPLETED".equalsIgnoreCase(session.getStatus())) {
            return buildSuccessVerificationResponse(session, "Phiên vượt link này đã được xác nhận hoàn tất trước đó.");
        }

        // Check expired
        if (now.isAfter(session.getExpiresAt())) {
            session.setStatus("EXPIRED");
            sessionRepository.save(session);
            return VerifyBypassSessionResponseDTO.builder()
                    .success(false)
                    .status("EXPIRED")
                    .message("Phiên vượt link đã hết hạn (quá 25 phút). Vui lòng lấy link mới!")
                    .build();
        }

        // ANTI-BYPASS VELOCITY CHECK: Minimum duration threshold
        long secondsElapsed = Duration.between(session.getStartedAt(), now).getSeconds();
        if (secondsElapsed < MIN_BYPASS_DURATION_SECONDS) {
            log.warn("[AntiBypass] Nghi vấn Bot Bypass: sessionId={}, elapsed={}s < {}s, IP={}",
                    sessionId, secondsElapsed, session.getClientIp());
            session.setStatus("BLOCKED");
            sessionRepository.save(session);

            return VerifyBypassSessionResponseDTO.builder()
                    .success(false)
                    .status("BLOCKED")
                    .message("Phát hiện tốc độ vượt bất thường (" + secondsElapsed + " giây). Hệ thống từ chối các công cụ bypass tự động. Vui lòng vượt lại bằng trình duyệt!")
                    .build();
        }

        // Mark COMPLETED
        session.setStatus("COMPLETED");
        session.setCompletedAt(now);
        sessionRepository.save(session);

        // Increment provider completed count
        if (session.getProviderId() != null) {
            providerRepository.findById(session.getProviderId()).ifPresent(p -> {
                p.setTotalCompleted(p.getTotalCompleted() + 1);
                providerRepository.save(p);
            });
        }

        // Grant 24h Entitlement to Device
        grantDeviceEntitlement(session.getDeviceId(), sessionId, DEFAULT_ENTITLEMENT_HOURS);

        systemLogService.log(httpReq, "BYPASS_VERIFIED_SUCCESS",
                String.format("Khách hàng vượt link [%s] thành công trong %ds. Cấp quyền 24h cho thiết bị [%s].",
                        session.getProviderName(), secondsElapsed, session.getDeviceId()));

        return buildSuccessVerificationResponse(session, "🎉 Chúc mừng! Bạn đã vượt link thành công và được mở khóa quyền sử dụng 24h.");
    }

    // =========================================================================
    // ADMIN MANAGEMENT APIS
    // =========================================================================

    public List<BypassProviderDTO> getAllProviders(String adminAuth) {
        if (!AdminSecurityUtil.isValidAdmin(adminAuth)) {
            throw new RuntimeException("Unauthorized admin request");
        }
        return providerRepository.findAllByOrderByPriorityAscCreatedAtDesc()
                .stream()
                .map(p -> BypassProviderDTO.fromEntity(p, false))
                .collect(Collectors.toList());
    }

    @Transactional
    public BypassProviderDTO createProvider(String adminAuth, BypassProviderDTO dto) {
        if (!AdminSecurityUtil.isValidAdmin(adminAuth)) {
            throw new RuntimeException("Unauthorized admin request");
        }
        if (dto.getName() == null || dto.getName().trim().isEmpty()) {
            throw new RuntimeException("Tên nhà mạng không được để trống!");
        }
        if (dto.getApiUrl() == null || dto.getApiUrl().trim().isEmpty()) {
            throw new RuntimeException("API URL không được để trống!");
        }
        if (dto.getApiToken() == null || dto.getApiToken().trim().isEmpty()) {
            throw new RuntimeException("API Token không được để trống!");
        }

        String id = "prov-" + UUID.randomUUID().toString().substring(0, 8);
        BypassProviderEntity entity = BypassProviderEntity.builder()
                .id(id)
                .name(dto.getName().trim())
                .apiUrl(dto.getApiUrl().trim())
                .apiToken(dto.getApiToken().trim())
                .paramTokenName(dto.getParamTokenName() != null ? dto.getParamTokenName().trim() : "api")
                .paramUrlName(dto.getParamUrlName() != null ? dto.getParamUrlName().trim() : "url")
                .requestType(dto.getRequestType() != null ? dto.getRequestType().trim() : "GET")
                .weight(dto.getWeight() != null && dto.getWeight() > 0 ? dto.getWeight() : 1)
                .priority(dto.getPriority() != null ? dto.getPriority() : 1)
                .isActive(dto.getIsActive() != null ? dto.getIsActive() : true)
                .totalClicks(0)
                .totalCompleted(0)
                .build();

        BypassProviderEntity saved = providerRepository.save(entity);
        return BypassProviderDTO.fromEntity(saved, false);
    }

    @Transactional
    public BypassProviderDTO updateProvider(String adminAuth, String id, BypassProviderDTO dto) {
        if (!AdminSecurityUtil.isValidAdmin(adminAuth)) {
            throw new RuntimeException("Unauthorized admin request");
        }
        Optional<BypassProviderEntity> opt = providerRepository.findById(id);
        if (opt.isEmpty()) {
            throw new RuntimeException("Không tìm thấy nhà mạng cần cập nhật!");
        }

        BypassProviderEntity existing = opt.get();
        if (dto.getName() != null && !dto.getName().trim().isEmpty()) existing.setName(dto.getName().trim());
        if (dto.getApiUrl() != null && !dto.getApiUrl().trim().isEmpty()) existing.setApiUrl(dto.getApiUrl().trim());
        if (dto.getApiToken() != null && !dto.getApiToken().trim().isEmpty() && !dto.getApiToken().contains("••••")) {
            existing.setApiToken(dto.getApiToken().trim());
        }
        if (dto.getParamTokenName() != null) existing.setParamTokenName(dto.getParamTokenName().trim());
        if (dto.getParamUrlName() != null) existing.setParamUrlName(dto.getParamUrlName().trim());
        if (dto.getRequestType() != null) existing.setRequestType(dto.getRequestType().trim());
        if (dto.getWeight() != null && dto.getWeight() > 0) existing.setWeight(dto.getWeight());
        if (dto.getPriority() != null) existing.setPriority(dto.getPriority());
        if (dto.getIsActive() != null) existing.setIsActive(dto.getIsActive());

        BypassProviderEntity saved = providerRepository.save(existing);
        return BypassProviderDTO.fromEntity(saved, false);
    }

    @Transactional
    public Map<String, Object> deleteProvider(String adminAuth, String id) {
        if (!AdminSecurityUtil.isValidAdmin(adminAuth)) {
            throw new RuntimeException("Unauthorized admin request");
        }
        if (!providerRepository.existsById(id)) {
            throw new RuntimeException("Không tìm thấy nhà mạng!");
        }
        providerRepository.deleteById(id);
        return Map.of("success", true, "message", "Đã xóa nhà mạng thành công!");
    }

    /**
     * Test API connection with a live provider endpoint
     */
    public TestProviderResponseDTO testProviderConnection(String adminAuth, TestProviderRequestDTO req) {
        if (!AdminSecurityUtil.isValidAdmin(adminAuth)) {
            throw new RuntimeException("Unauthorized admin request");
        }

        String apiUrl = req.getApiUrl();
        String apiToken = req.getApiToken();

        // If editing existing, retrieve token if masked
        if ((apiToken == null || apiToken.contains("••••")) && req.getId() != null) {
            Optional<BypassProviderEntity> opt = providerRepository.findById(req.getId());
            if (opt.isPresent()) {
                apiToken = opt.get().getApiToken();
            }
        }

        if (apiUrl == null || apiUrl.trim().isEmpty() || apiToken == null || apiToken.trim().isEmpty()) {
            return TestProviderResponseDTO.builder()
                    .success(false)
                    .message("Vui lòng nhập API URL và API Token để test!")
                    .build();
        }

        String testTargetUrl = req.getTestUrl() != null && !req.getTestUrl().trim().isEmpty()
                ? req.getTestUrl().trim()
                : "https://google.com?test=" + System.currentTimeMillis();

        long start = System.currentTimeMillis();
        try {
            String tokenParam = req.getParamTokenName() != null ? req.getParamTokenName() : "api";
            String urlParam = req.getParamUrlName() != null ? req.getParamUrlName() : "url";

            String encodedTarget = URLEncoder.encode(testTargetUrl, StandardCharsets.UTF_8);
            String fullUrl = apiUrl + (apiUrl.contains("?") ? "&" : "?")
                    + tokenParam + "=" + apiToken.trim()
                    + "&" + urlParam + "=" + encodedTarget;

            String responseBody = restClient.get()
                    .uri(fullUrl)
                    .retrieve()
                    .body(String.class);

            long elapsed = System.currentTimeMillis() - start;
            String shortened = parseShortenedUrlFromResponse(responseBody);

            if (shortened != null && !shortened.isEmpty()) {
                return TestProviderResponseDTO.builder()
                        .success(true)
                        .httpStatus(200)
                        .shortenedUrl(shortened)
                        .responseTimeMs(elapsed)
                        .rawResponse(responseBody)
                        .message("✅ Kết nối API thành công! Đã rút gọn link mẫu trong " + elapsed + "ms.")
                        .build();
            } else {
                return TestProviderResponseDTO.builder()
                        .success(false)
                        .httpStatus(200)
                        .responseTimeMs(elapsed)
                        .rawResponse(responseBody)
                        .message("⚠️ API trả về thành công nhưng không tìm thấy trường shortenedUrl trong response.")
                        .build();
            }

        } catch (Exception e) {
            long elapsed = System.currentTimeMillis() - start;
            return TestProviderResponseDTO.builder()
                    .success(false)
                    .responseTimeMs(elapsed)
                    .message("❌ Lỗi kết nối API: " + e.getMessage())
                    .build();
        }
    }

    /**
     * Get real-time stats and metrics
     */
    public BypassGatewayStatsDTO getGatewayStats(String adminAuth) {
        if (!AdminSecurityUtil.isValidAdmin(adminAuth)) {
            throw new RuntimeException("Unauthorized admin request");
        }

        List<BypassProviderEntity> providers = providerRepository.findAllByOrderByPriorityAscCreatedAtDesc();
        long totalSessions = sessionRepository.count();
        long completedSessions = sessionRepository.countByStatus("COMPLETED");
        long pendingSessions = sessionRepository.countByStatus("PENDING");
        long blockedSessions = sessionRepository.countByStatus("BLOCKED");

        LocalDateTime todayStart = LocalDate.now(VN_ZONE).atStartOfDay();
        long todaySessions = sessionRepository.countByStartedAtAfter(todayStart);
        long todayCompleted = sessionRepository.countByStatusAndStartedAtAfter("COMPLETED", todayStart);

        double rate = totalSessions > 0 ? Math.round(((double) completedSessions / totalSessions) * 1000.0) / 10.0 : 0.0;
        int activeCount = (int) providers.stream().filter(p -> Boolean.TRUE.equals(p.getIsActive())).count();

        List<BypassProviderDTO> providerDTOs = providers.stream()
                .map(p -> BypassProviderDTO.fromEntity(p, false))
                .collect(Collectors.toList());

        return BypassGatewayStatsDTO.builder()
                .totalSessions(totalSessions)
                .completedSessions(completedSessions)
                .pendingSessions(pendingSessions)
                .blockedSessions(blockedSessions)
                .overallConversionRate(rate)
                .todaySessions(todaySessions)
                .todayCompleted(todayCompleted)
                .activeProvidersCount(activeCount)
                .providers(providerDTOs)
                .build();
    }

    // =========================================================================
    // INTERNAL HELPER METHODS
    // =========================================================================

    private BypassProviderEntity selectWeightedProvider(List<BypassProviderEntity> activeProviders) {
        int totalWeight = activeProviders.stream().mapToInt(p -> p.getWeight() != null && p.getWeight() > 0 ? p.getWeight() : 1).sum();
        if (totalWeight <= 0) return activeProviders.get(0);

        int randomVal = new Random().nextInt(totalWeight);
        int currentSum = 0;
        for (BypassProviderEntity provider : activeProviders) {
            int w = provider.getWeight() != null && provider.getWeight() > 0 ? provider.getWeight() : 1;
            currentSum += w;
            if (randomVal < currentSum) {
                return provider;
            }
        }
        return activeProviders.get(0);
    }

    private String callProviderApiWithFailover(BypassProviderEntity primary, List<BypassProviderEntity> allActive, String targetUrl) {
        // Try primary first
        try {
            String shortUrl = callSingleProviderApi(primary, targetUrl);
            if (shortUrl != null && !shortUrl.isEmpty()) {
                return shortUrl;
            }
        } catch (Exception e) {
            log.warn("Lỗi gọi API của provider chính [{}] ({}): {}. Đang thử failover sang provider dự phòng...",
                    primary.getName(), primary.getApiUrl(), e.getMessage());
        }

        // Try other active providers as failover
        for (BypassProviderEntity backup : allActive) {
            if (backup.getId().equals(primary.getId())) continue;
            try {
                String shortUrl = callSingleProviderApi(backup, targetUrl);
                if (shortUrl != null && !shortUrl.isEmpty()) {
                    log.info("Failover sang backup provider [{}] thành công!", backup.getName());
                    return shortUrl;
                }
            } catch (Exception ex) {
                log.warn("Backup provider [{}] cũng lỗi: {}", backup.getName(), ex.getMessage());
            }
        }

        // Fallback: If all APIs fail, return targetUrl directly so customer is not broken
        log.error("Tất cả API rút gọn đều gặp lỗi! Trả về callbackUrl trực tiếp.");
        return targetUrl;
    }

    private String callSingleProviderApi(BypassProviderEntity provider, String targetUrl) {
        String tokenParam = provider.getParamTokenName() != null ? provider.getParamTokenName() : "api";
        String urlParam = provider.getParamUrlName() != null ? provider.getParamUrlName() : "url";
        String encodedTarget = URLEncoder.encode(targetUrl, StandardCharsets.UTF_8);

        String fullUrl = provider.getApiUrl() + (provider.getApiUrl().contains("?") ? "&" : "?")
                + tokenParam + "=" + provider.getApiToken().trim()
                + "&" + urlParam + "=" + encodedTarget;

        String responseBody = restClient.get()
                .uri(fullUrl)
                .retrieve()
                .body(String.class);

        return parseShortenedUrlFromResponse(responseBody);
    }

    private String parseShortenedUrlFromResponse(String rawJson) {
        if (rawJson == null || rawJson.trim().isEmpty()) return null;
        try {
            JsonNode root = objectMapper.readTree(rawJson);
            if (root.has("shortenedUrl")) return root.get("shortenedUrl").asText();
            if (root.has("url")) return root.get("url").asText();
            if (root.has("short_url")) return root.get("short_url").asText();
            if (root.has("shortlink")) return root.get("shortlink").asText();
            if (root.has("link")) return root.get("link").asText();
            if (root.has("data") && root.get("data").isObject()) {
                JsonNode data = root.get("data");
                if (data.has("shortenedUrl")) return data.get("shortenedUrl").asText();
                if (data.has("url")) return data.get("url").asText();
            }
        } catch (Exception e) {
            // Not json, check if raw response is a url
            if (rawJson.startsWith("http://") || rawJson.startsWith("https://")) {
                return rawJson.trim();
            }
        }
        return null;
    }

    private void grantDeviceEntitlement(String deviceId, String sessionId, int hours) {
        LocalDateTime now = LocalDateTime.now(VN_ZONE);
        LocalDateTime expires = now.plusHours(hours);

        BypassDeviceEntitlementEntity ent = entitlementRepository.findByDeviceId(deviceId)
                .orElseGet(() -> BypassDeviceEntitlementEntity.builder()
                        .id("ent_" + UUID.randomUUID().toString().replace("-", "").substring(0, 16))
                        .deviceId(deviceId)
                        .bypassCount(0)
                        .build());

        ent.setGrantedAt(now);
        ent.setExpiresAt(expires);
        ent.setLastSessionId(sessionId);
        ent.setBypassCount((ent.getBypassCount() != null ? ent.getBypassCount() : 0) + 1);
        entitlementRepository.save(ent);
    }

    private VerifyBypassSessionResponseDTO buildSuccessVerificationResponse(BypassSessionEntity session, String msg) {
        LocalDateTime now = LocalDateTime.now(VN_ZONE);
        LocalDateTime exp = now.plusHours(DEFAULT_ENTITLEMENT_HOURS);

        String freeKey = "";
        String downloadUrl = "";

        if (session.getTargetAppId() != null && !session.getTargetAppId().trim().isEmpty()) {
            Optional<AppItemEntity> appOpt = appRepository.findById(session.getTargetAppId().trim());
            if (appOpt.isPresent()) {
                AppItemEntity app = appOpt.get();
                freeKey = app.getFreeKey();
                downloadUrl = app.getDownloadUrl() != null ? app.getDownloadUrl() : app.getIpaUrl();
            }
        }

        return VerifyBypassSessionResponseDTO.builder()
                .success(true)
                .status("COMPLETED")
                .message(msg)
                .entitlementExpiresAt(exp)
                .targetAppId(session.getTargetAppId())
                .targetAppName(session.getTargetAppName())
                .freeKey(freeKey)
                .downloadUrl(downloadUrl)
                .build();
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
