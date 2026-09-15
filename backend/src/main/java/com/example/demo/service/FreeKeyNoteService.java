package com.example.demo.service;

import com.example.demo.dto.FreeKeyNotePublicDTO;
import com.example.demo.model.AppItemEntity;
import com.example.demo.model.FreeKeyNoteEntity;
import com.example.demo.repository.AppRepository;
import com.example.demo.repository.FreeKeyNoteRepository;
import com.example.demo.util.AdminSecurityUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class FreeKeyNoteService {

    private final FreeKeyNoteRepository noteRepository;
    private final AppRepository appRepository;

    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    @Autowired
    public FreeKeyNoteService(FreeKeyNoteRepository noteRepository, AppRepository appRepository) {
        this.noteRepository = noteRepository;
        this.appRepository = appRepository;
    }

    // ==========================================
    // PUBLIC APIS
    // ==========================================

    @Transactional
    public ResponseEntity<?> getPublicNoteBySlug(String slug, String password) {
        if (slug == null || slug.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Mã đường dẫn không hợp lệ."));
        }

        Optional<FreeKeyNoteEntity> optNote = noteRepository.findBySlugIgnoreCase(slug.trim());
        if (optNote.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("status", "NOT_FOUND", "message", "Trang ghi chú này không tồn tại hoặc đã bị xóa."));
        }

        FreeKeyNoteEntity note = optNote.get();
        LocalDateTime now = LocalDateTime.now(VN_ZONE);

        // Fetch Linked Apps info (supports multiple comma-separated app IDs)
        List<FreeKeyNotePublicDTO.LinkedAppDTO> linkedApps = new ArrayList<>();
        if (note.getAppId() != null && !note.getAppId().trim().isEmpty()) {
            List<String> appIds = Arrays.stream(note.getAppId().split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .collect(Collectors.toList());

            if (!appIds.isEmpty()) {
                List<AppItemEntity> appList = appRepository.findAllById(appIds);
                for (AppItemEntity a : appList) {
                    String dUrl = null;
                    String iUrl = null;
                    String pForm = a.getPlatform();

                    if ("ios".equalsIgnoreCase(pForm)) {
                        iUrl = a.getIpaUrl();
                    } else if ("android".equalsIgnoreCase(pForm)) {
                        dUrl = a.getDownloadUrl();
                    } else {
                        dUrl = a.getDownloadUrl();
                        iUrl = a.getIpaUrl();
                    }

                    linkedApps.add(FreeKeyNotePublicDTO.LinkedAppDTO.builder()
                            .id(a.getId())
                            .name(a.getName())
                            .icon(a.getIcon())
                            .downloadUrl(dUrl)
                            .ipaUrl(iUrl)
                            .platform(pForm)
                            .build());
                }
            }
        }

        // Base DTO builder
        FreeKeyNotePublicDTO.FreeKeyNotePublicDTOBuilder dtoBuilder = FreeKeyNotePublicDTO.builder()
                .id(note.getId())
                .slug(note.getSlug())
                .title(note.getTitle())
                .appId(note.getAppId())
                .linkedApps(linkedApps)
                .keyCount(note.getKeyCount())
                .hasPassword(note.getPassword() != null && !note.getPassword().trim().isEmpty())
                .maxViews(note.getMaxViews())
                .viewCount(note.getViewCount())
                .expiresAt(note.getExpiresAt())
                .createdAt(note.getCreatedAt());

        if (!linkedApps.isEmpty()) {
            FreeKeyNotePublicDTO.LinkedAppDTO first = linkedApps.get(0);
            dtoBuilder.appName(first.getName())
                    .appIcon(first.getIcon())
                    .downloadUrl(first.getDownloadUrl())
                    .ipaUrl(first.getIpaUrl())
                    .platform(first.getPlatform());
        }

        // 1. Check Active
        if (Boolean.FALSE.equals(note.getActive())) {
            dtoBuilder.status("INACTIVE")
                    .message("Trang ghi chú này đang tạm thời bị khóa hoặc tạm dừng chia sẻ.");
            return ResponseEntity.ok(dtoBuilder.build());
        }

        // 2. Check Expiration
        if (note.getExpiresAt() != null && note.getExpiresAt().isBefore(now)) {
            dtoBuilder.status("EXPIRED")
                    .message("Trang ghi chú này đã hết hạn sử dụng vào lúc: " + note.getExpiresAt());
            return ResponseEntity.ok(dtoBuilder.build());
        }

        // 3. Check Max Views
        if (note.getMaxViews() != null && note.getMaxViews() > 0 && note.getViewCount() >= note.getMaxViews()) {
            dtoBuilder.status("LIMIT_REACHED")
                    .message("Trang ghi chú này đã đạt giới hạn số lượt xem tối đa (" + note.getMaxViews() + " lượt).");
            return ResponseEntity.ok(dtoBuilder.build());
        }

        // 4. Check Password Protection
        boolean hasPass = note.getPassword() != null && !note.getPassword().trim().isEmpty();
        if (hasPass) {
            if (password == null || !password.trim().equals(note.getPassword().trim())) {
                dtoBuilder.status("LOCKED")
                        .message("Trang ghi chú này được bảo vệ bằng mật khẩu. Vui lòng nhập mật khẩu để xem.");
                // Notice: DO NOT set keysContent or description here
                return ResponseEntity.ok(dtoBuilder.build());
            }
        }

        // Valid access! Increment view count
        int updatedViews = (note.getViewCount() == null ? 0 : note.getViewCount()) + 1;
        note.setViewCount(updatedViews);
        noteRepository.save(note);

        // Parse keys into clean list
        List<String> keysList = parseKeysContent(note.getKeysContent());

        dtoBuilder.status("ACTIVE")
                .viewCount(updatedViews)
                .description(note.getDescription())
                .keysContent(note.getKeysContent())
                .keysList(keysList)
                .keyCount(keysList.size());

        return ResponseEntity.ok(dtoBuilder.build());
    }

    @Transactional
    public ResponseEntity<?> verifyPassword(String slug, Map<String, String> body) {
        String password = body != null ? body.get("password") : null;
        if (password == null || password.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Vui lòng nhập mật khẩu."));
        }

        Optional<FreeKeyNoteEntity> optNote = noteRepository.findBySlugIgnoreCase(slug.trim());
        if (optNote.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("status", "NOT_FOUND", "message", "Trang ghi chú không tồn tại."));
        }

        FreeKeyNoteEntity note = optNote.get();
        if (note.getPassword() == null || !note.getPassword().trim().equals(password.trim())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("status", "INVALID_PASSWORD", "message", "Mật khẩu không chính xác! Vui lòng thử lại."));
        }

        // Correct password -> return note with full content
        return getPublicNoteBySlug(slug, password);
    }

    // ==========================================
    // ADMIN APIS
    // ==========================================

    public ResponseEntity<?> getAllAdminNotes(String adminAuth) {
        if (!AdminSecurityUtil.isValidAdmin(adminAuth)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        List<FreeKeyNoteEntity> notes = noteRepository.findAllByOrderByCreatedAtDesc();
        Map<String, AppItemEntity> appMap = appRepository.findAll().stream()
                .collect(Collectors.toMap(AppItemEntity::getId, a -> a, (k1, k2) -> k1));

        List<Map<String, Object>> result = notes.stream().map(n -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", n.getId());
            map.put("slug", n.getSlug());
            map.put("title", n.getTitle());
            map.put("description", n.getDescription());
            map.put("appId", n.getAppId());
            map.put("keysContent", n.getKeysContent());
            map.put("keyCount", n.getKeyCount());
            map.put("password", n.getPassword());
            map.put("hasPassword", n.getPassword() != null && !n.getPassword().trim().isEmpty());
            map.put("maxViews", n.getMaxViews());
            map.put("viewCount", n.getViewCount());
            map.put("active", n.getActive());
            map.put("expiresAt", n.getExpiresAt());
            map.put("createdAt", n.getCreatedAt());
            map.put("updatedAt", n.getUpdatedAt());

            if (n.getAppId() != null && !n.getAppId().trim().isEmpty()) {
                List<String> appIds = Arrays.stream(n.getAppId().split(","))
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .collect(Collectors.toList());
                List<String> names = appIds.stream()
                        .map(id -> appMap.containsKey(id) ? appMap.get(id).getName() : id)
                        .collect(Collectors.toList());
                map.put("appName", String.join(", ", names));
                map.put("appIds", appIds);
                if (!appIds.isEmpty() && appMap.containsKey(appIds.get(0))) {
                    map.put("appIcon", appMap.get(appIds.get(0)).getIcon());
                }
            }

            return map;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    @Transactional
    public ResponseEntity<?> createNote(String adminAuth, FreeKeyNoteEntity noteReq) {
        if (!AdminSecurityUtil.isValidAdmin(adminAuth)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        if (noteReq.getTitle() == null || noteReq.getTitle().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Tiêu đề ghi chú không được để trống."));
        }

        if (noteReq.getKeysContent() == null || noteReq.getKeysContent().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Danh sách mã key không được để trống."));
        }

        // Sanitize or generate slug
        String slug = sanitizeSlug(noteReq.getSlug());
        if (slug.isEmpty()) {
            slug = "free-" + UUID.randomUUID().toString().substring(0, 8);
        }

        if (noteRepository.existsBySlugIgnoreCase(slug)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Đường dẫn slug '" + slug + "' đã tồn tại! Vui lòng chọn slug khác."));
        }

        List<String> keys = parseKeysContent(noteReq.getKeysContent());

        FreeKeyNoteEntity entity = FreeKeyNoteEntity.builder()
                .id(UUID.randomUUID().toString())
                .slug(slug)
                .title(noteReq.getTitle().trim())
                .description(noteReq.getDescription())
                .appId(noteReq.getAppId() != null && !noteReq.getAppId().trim().isEmpty() ? noteReq.getAppId().trim() : null)
                .keysContent(String.join("\n", keys))
                .keyCount(keys.size())
                .password(noteReq.getPassword() != null && !noteReq.getPassword().trim().isEmpty() ? noteReq.getPassword().trim() : null)
                .maxViews(noteReq.getMaxViews() != null && noteReq.getMaxViews() > 0 ? noteReq.getMaxViews() : null)
                .viewCount(0)
                .active(noteReq.getActive() != null ? noteReq.getActive() : true)
                .expiresAt(noteReq.getExpiresAt())
                .build();

        FreeKeyNoteEntity saved = noteRepository.save(entity);
        return ResponseEntity.ok(saved);
    }

    @Transactional
    public ResponseEntity<?> updateNote(String adminAuth, String id, FreeKeyNoteEntity noteReq) {
        if (!AdminSecurityUtil.isValidAdmin(adminAuth)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        Optional<FreeKeyNoteEntity> optExisting = noteRepository.findById(id);
        if (optExisting.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Không tìm thấy ghi chú cần cập nhật."));
        }

        FreeKeyNoteEntity existing = optExisting.get();

        if (noteReq.getTitle() != null && !noteReq.getTitle().trim().isEmpty()) {
            existing.setTitle(noteReq.getTitle().trim());
        }

        if (noteReq.getSlug() != null && !noteReq.getSlug().trim().isEmpty()) {
            String slug = sanitizeSlug(noteReq.getSlug());
            if (!slug.equalsIgnoreCase(existing.getSlug())) {
                if (noteRepository.existsBySlugIgnoreCaseAndIdNot(slug, id)) {
                    return ResponseEntity.badRequest().body(Map.of("message", "Đường dẫn slug '" + slug + "' đã được sử dụng!"));
                }
                existing.setSlug(slug);
            }
        }

        if (noteReq.getKeysContent() != null && !noteReq.getKeysContent().trim().isEmpty()) {
            List<String> keys = parseKeysContent(noteReq.getKeysContent());
            existing.setKeysContent(String.join("\n", keys));
            existing.setKeyCount(keys.size());
        }

        existing.setDescription(noteReq.getDescription());
        existing.setAppId(noteReq.getAppId() != null && !noteReq.getAppId().trim().isEmpty() ? noteReq.getAppId().trim() : null);
        existing.setPassword(noteReq.getPassword() != null && !noteReq.getPassword().trim().isEmpty() ? noteReq.getPassword().trim() : null);
        existing.setMaxViews(noteReq.getMaxViews() != null && noteReq.getMaxViews() > 0 ? noteReq.getMaxViews() : null);
        existing.setExpiresAt(noteReq.getExpiresAt());

        if (noteReq.getActive() != null) {
            existing.setActive(noteReq.getActive());
        }

        FreeKeyNoteEntity saved = noteRepository.save(existing);
        return ResponseEntity.ok(saved);
    }

    @Transactional
    public ResponseEntity<?> deleteNote(String adminAuth, String id) {
        if (!AdminSecurityUtil.isValidAdmin(adminAuth)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        if (!noteRepository.existsById(id)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Không tìm thấy ghi chú cần xóa."));
        }

        noteRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Đã xóa ghi chú thành công.", "id", id));
    }

    @Transactional
    public ResponseEntity<?> toggleActive(String adminAuth, String id) {
        if (!AdminSecurityUtil.isValidAdmin(adminAuth)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        Optional<FreeKeyNoteEntity> opt = noteRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Không tìm thấy ghi chú."));
        }

        FreeKeyNoteEntity note = opt.get();
        boolean nextState = note.getActive() == null || !note.getActive();
        note.setActive(nextState);
        noteRepository.save(note);

        return ResponseEntity.ok(Map.of("id", id, "active", nextState));
    }

    // ==========================================
    // UTILS
    // ==========================================

    private String sanitizeSlug(String raw) {
        if (raw == null) return "";
        return raw.trim()
                .toLowerCase()
                .replaceAll("[^a-z0-9-_]", "-")
                .replaceAll("-+", "-")
                .replaceAll("^-|-$", "");
    }

    private List<String> parseKeysContent(String raw) {
        if (raw == null) return Collections.emptyList();
        return Arrays.stream(raw.split("\\r?\\n"))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());
    }
}
