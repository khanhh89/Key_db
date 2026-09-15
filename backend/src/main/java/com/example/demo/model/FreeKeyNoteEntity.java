package com.example.demo.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Index;
import java.time.LocalDateTime;

@Entity
@Table(name = "free_key_notes", indexes = {
    @Index(name = "idx_note_slug", columnList = "slug", unique = true),
    @Index(name = "idx_note_app_id", columnList = "app_id"),
    @Index(name = "idx_note_active", columnList = "active")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FreeKeyNoteEntity {

    @Id
    private String id;

    @Column(name = "slug", nullable = false, unique = true, length = 100)
    private String slug;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "app_id")
    private String appId;

    @Column(name = "keys_content", nullable = false, columnDefinition = "TEXT")
    private String keysContent;

    @Column(name = "key_count")
    private Integer keyCount;

    @Column(name = "password")
    private String password;

    @Column(name = "max_views")
    private Integer maxViews;

    @Column(name = "view_count")
    private Integer viewCount;

    @Column(name = "active")
    private Boolean active;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @jakarta.persistence.PrePersist
    public void prePersist() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh"));
        }
        if (this.updatedAt == null) {
            this.updatedAt = this.createdAt;
        }
        if (this.viewCount == null) {
            this.viewCount = 0;
        }
        if (this.active == null) {
            this.active = true;
        }
        if (this.keyCount == null && this.keysContent != null) {
            this.keyCount = (int) java.util.Arrays.stream(this.keysContent.split("\\r?\\n"))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .count();
        }
    }

    @jakarta.persistence.PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh"));
        if (this.keysContent != null) {
            this.keyCount = (int) java.util.Arrays.stream(this.keysContent.split("\\r?\\n"))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .count();
        }
    }
}
