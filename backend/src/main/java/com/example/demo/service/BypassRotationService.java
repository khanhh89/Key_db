package com.example.demo.service;

import com.example.demo.dto.bypass.BypassRotationConfigDTO;
import com.example.demo.dto.bypass.BypassRotationStatusDTO;
import com.example.demo.model.AppItemEntity;
import com.example.demo.model.SystemConfigEntity;
import com.example.demo.repository.AppRepository;
import com.example.demo.repository.SystemConfigRepository;
import com.example.demo.util.AdminSecurityUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
public class BypassRotationService {

    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter DISPLAY_DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final SystemConfigRepository systemConfigRepository;
    private final AppRepository appRepository;
    private final SystemLogService systemLogService;

    @Autowired
    public BypassRotationService(SystemConfigRepository systemConfigRepository,
                                 AppRepository appRepository,
                                 SystemLogService systemLogService) {
        this.systemConfigRepository = systemConfigRepository;
        this.appRepository = appRepository;
        this.systemLogService = systemLogService;
    }

    /**
     * Get the current bypass link rotation status & config
     */
    public BypassRotationStatusDTO getStatus(String adminAuth) {
        boolean isAdmin = AdminSecurityUtil.isValidAdmin(adminAuth);
        SystemConfigEntity config = getOrCreateConfig();

        List<String> pool = parseLinkPool(config.getBypassLinkPool());
        String activeLink = config.getBypassCurrentActiveLink();
        Integer currentIndex = config.getBypassCurrentIndex();
        if (currentIndex == null) currentIndex = 0;

        if ((activeLink == null || activeLink.isEmpty()) && !pool.isEmpty()) {
            activeLink = pool.get(0);
        }

        BypassRotationStatusDTO.BypassRotationStatusDTOBuilder builder = BypassRotationStatusDTO.builder()
                .activeLink(activeLink != null ? activeLink : "")
                .currentIndex(currentIndex)
                .totalLinks(pool.size())
                .lastRotatedDate(config.getBypassLastRotatedDate())
                .autoRotateEnabled(config.getBypassAutoRotateEnabled() != null ? config.getBypassAutoRotateEnabled() : true)
                .rotationMode(config.getBypassRotationMode() != null ? config.getBypassRotationMode() : "DAILY_SEQUENTIAL");

        if (isAdmin) {
            builder.pool(pool)
                    .poolRaw(config.getBypassLinkPool() != null ? config.getBypassLinkPool() : "")
                    .targetAppIds(parseTargetAppIds(config.getBypassTargetAppIds()))
                    .isAllApps(isTargetingAllApps(config.getBypassTargetAppIds()));
        }

        return builder.build();
    }

    /**
     * Save new bypass links pool & settings, and immediately sync the active link
     */
    @Transactional
    @CacheEvict(value = "apps", allEntries = true)
    public BypassRotationStatusDTO saveConfig(String adminAuth, BypassRotationConfigDTO req) {
        if (!AdminSecurityUtil.isValidAdmin(adminAuth)) {
            throw new RuntimeException("Unauthorized admin request");
        }

        SystemConfigEntity config = getOrCreateConfig();

        String rawPool = req.getLinkPool();
        if (rawPool == null) rawPool = "";
        List<String> pool = parseLinkPool(rawPool);

        String mode = req.getRotationMode();
        if (mode == null || (!mode.equals("DAILY_RANDOM") && !mode.equals("DAILY_SEQUENTIAL"))) {
            mode = "DAILY_SEQUENTIAL";
        }

        Boolean autoRotate = req.getAutoRotateEnabled() != null ? req.getAutoRotateEnabled() : true;

        List<String> targetAppIds = req.getTargetAppIds();
        String targetAppsStr = "ALL";
        if (targetAppIds != null && !targetAppIds.isEmpty()) {
            targetAppsStr = String.join(",", targetAppIds);
        }

        config.setBypassLinkPool(String.join("\n", pool));
        config.setBypassRotationMode(mode);
        config.setBypassAutoRotateEnabled(autoRotate);
        config.setBypassTargetAppIds(targetAppsStr);

        // Pick current active link
        int currentIndex = 0;
        String activeLink = "";
        if (!pool.isEmpty()) {
            Integer prevIndex = config.getBypassCurrentIndex();
            if (prevIndex != null && prevIndex >= 0 && prevIndex < pool.size()) {
                currentIndex = prevIndex;
            } else {
                currentIndex = 0;
            }
            activeLink = pool.get(currentIndex);
        }

        LocalDate today = LocalDate.now(VN_ZONE);
        config.setBypassCurrentIndex(currentIndex);
        config.setBypassCurrentActiveLink(activeLink);
        config.setBypassLastRotatedDate(today.format(DATE_FMT));
        systemConfigRepository.save(config);

        // Apply active link to selected apps
        int updatedCount = applyLinkToApps(activeLink, targetAppsStr);

        systemLogService.log(null, "ADMIN_UPDATE_BYPASS_CONFIG",
                String.format("Cập nhật danh sách %d link vượt xoay vòng. Link đang chạy: [%s], áp dụng cho %d app.",
                        pool.size(), activeLink, updatedCount));

        BypassRotationStatusDTO result = getStatus(adminAuth);
        result.setMessage("Đã lưu cấu hình xoay link vượt và đồng bộ cho " + updatedCount + " app thành công!");
        result.setUpdatedAppsCount(updatedCount);
        return result;
    }

    /**
     * Manually switch to next link immediately
     */
    @Transactional
    @CacheEvict(value = "apps", allEntries = true)
    public BypassRotationStatusDTO forceRotateNow(String adminAuth) {
        if (!AdminSecurityUtil.isValidAdmin(adminAuth)) {
            throw new RuntimeException("Unauthorized admin request");
        }

        SystemConfigEntity config = getOrCreateConfig();
        List<String> pool = parseLinkPool(config.getBypassLinkPool());

        if (pool.isEmpty()) {
            throw new RuntimeException("Danh sách link vượt đang trống! Hãy dán 2-3 link trước.");
        }

        int prevIndex = config.getBypassCurrentIndex() != null ? config.getBypassCurrentIndex() : 0;
        int nextIndex;
        if ("DAILY_RANDOM".equalsIgnoreCase(config.getBypassRotationMode()) && pool.size() > 1) {
            Random rand = new Random();
            do {
                nextIndex = rand.nextInt(pool.size());
            } while (nextIndex == prevIndex && pool.size() > 1);
        } else {
            nextIndex = (prevIndex + 1) % pool.size();
        }

        String nextLink = pool.get(nextIndex);
        LocalDate today = LocalDate.now(VN_ZONE);

        config.setBypassCurrentIndex(nextIndex);
        config.setBypassCurrentActiveLink(nextLink);
        config.setBypassLastRotatedDate(today.format(DATE_FMT));
        systemConfigRepository.save(config);

        int updatedCount = applyLinkToApps(nextLink, config.getBypassTargetAppIds());

        systemLogService.log(null, "ADMIN_FORCE_ROTATE_BYPASS",
                String.format("Ép buộc chuyển sang link vượt [%d/%d]: %s. Áp dụng cho %d app.",
                        nextIndex + 1, pool.size(), nextLink, updatedCount));

        BypassRotationStatusDTO result = getStatus(adminAuth);
        result.setMessage(String.format("Đã chuyển sang Link #%d/%d thành công! Áp dụng cho %d app.",
                nextIndex + 1, pool.size(), updatedCount));
        result.setUpdatedAppsCount(updatedCount);
        return result;
    }

    /**
     * Automatic Cron: runs at 00:00:05 every day in Asia/Ho_Chi_Minh timezone
     */
    @Scheduled(cron = "5 0 0 * * ?", zone = "Asia/Ho_Chi_Minh")
    @Transactional
    @CacheEvict(value = "apps", allEntries = true)
    public void scheduledDailyRotation() {
        try {
            SystemConfigEntity config = getOrCreateConfig();
            if (Boolean.FALSE.equals(config.getBypassAutoRotateEnabled())) {
                log.info("[BypassRotation] Tự động đổi link đang TẮT. Bỏ qua cron.");
                return;
            }

            List<String> pool = parseLinkPool(config.getBypassLinkPool());
            if (pool.isEmpty()) {
                log.info("[BypassRotation] Danh sách link trống. Bỏ qua cron.");
                return;
            }

            LocalDate today = LocalDate.now(VN_ZONE);
            String todayStr = today.format(DATE_FMT);

            int prevIndex = config.getBypassCurrentIndex() != null ? config.getBypassCurrentIndex() : 0;
            int nextIndex;

            if ("DAILY_RANDOM".equalsIgnoreCase(config.getBypassRotationMode()) && pool.size() > 1) {
                Random rand = new Random();
                do {
                    nextIndex = rand.nextInt(pool.size());
                } while (nextIndex == prevIndex && pool.size() > 1);
            } else {
                nextIndex = (prevIndex + 1) % pool.size();
            }

            String activeLink = pool.get(nextIndex);
            config.setBypassCurrentIndex(nextIndex);
            config.setBypassCurrentActiveLink(activeLink);
            config.setBypassLastRotatedDate(todayStr);
            systemConfigRepository.save(config);

            int count = applyLinkToApps(activeLink, config.getBypassTargetAppIds());

            log.info("[BypassRotation] ⏰ Tự động đổi link ngày mới [{}]: Link #{} ({}) cho {} app.",
                    todayStr, nextIndex + 1, activeLink, count);

            systemLogService.log(null, "SYSTEM_AUTO_ROTATE_BYPASS",
                    String.format("Tự động chuyển sang link mới ngày %s: [Link %d/%d - %s] cho %d app.",
                            today.format(DISPLAY_DATE_FMT), nextIndex + 1, pool.size(), activeLink, count));

        } catch (Exception e) {
            log.error("[BypassRotation] Lỗi khi thực thi scheduledDailyRotation", e);
        }
    }

    // ============================================================
    // Helper Methods
    // ============================================================

    private int applyLinkToApps(String linkToApply, String targetAppIdsStr) {
        String todayDisplay = LocalDate.now(VN_ZONE).format(DISPLAY_DATE_FMT);
        List<AppItemEntity> allApps = appRepository.findAll();
        boolean isAll = isTargetingAllApps(targetAppIdsStr);
        Set<String> targetSet = new HashSet<>(parseTargetAppIds(targetAppIdsStr));

        int count = 0;
        for (AppItemEntity app : allApps) {
            if (isAll || targetSet.contains(app.getId())) {
                app.setIpaUrl(linkToApply != null ? linkToApply.trim() : "");
                app.setUpdatedAt(todayDisplay);
                appRepository.save(app);
                count++;
            }
        }
        return count;
    }

    private SystemConfigEntity getOrCreateConfig() {
        return systemConfigRepository.findAll().stream().findFirst()
                .orElseGet(() -> systemConfigRepository.save(SystemConfigEntity.builder().build()));
    }

    private List<String> parseLinkPool(String raw) {
        if (raw == null || raw.trim().isEmpty()) {
            return Collections.emptyList();
        }
        return Arrays.stream(raw.split("\\r?\\n"))
                .map(String::trim)
                .filter(s -> !s.isEmpty() && (s.startsWith("http://") || s.startsWith("https://") || s.startsWith("//")))
                .collect(Collectors.toList());
    }

    private List<String> parseTargetAppIds(String targetAppsStr) {
        if (targetAppsStr == null || targetAppsStr.trim().isEmpty() || "ALL".equalsIgnoreCase(targetAppsStr.trim())) {
            return Collections.emptyList();
        }
        return Arrays.stream(targetAppsStr.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());
    }

    private boolean isTargetingAllApps(String targetAppsStr) {
        return targetAppsStr == null || targetAppsStr.trim().isEmpty() || "ALL".equalsIgnoreCase(targetAppsStr.trim());
    }
}
