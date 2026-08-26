package com.example.demo.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "feedbacks", indexes = {
    @Index(name = "idx_feedback_device_id", columnList = "device_id"),
    @Index(name = "idx_feedback_status_created", columnList = "status, created_at")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FeedbackEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "device_id", nullable = false, length = 64)
    private String deviceId;

    @Column(name = "category", length = 32)
    private String category; // BUG_REPORT, FEATURE_REQUEST, GENERAL_FEEDBACK, COMPLAINT

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "content", columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column(name = "rating")
    private Integer rating; // 1 to 5 stars

    @Column(name = "contact_info", length = 100)
    private String contactInfo; // Optional email/phone

    @Column(name = "attachment_urls", columnDefinition = "TEXT")
    private String attachmentUrls; // Comma separated URLs

    @Column(name = "status", length = 32)
    @Builder.Default
    private String status = "PENDING"; // PENDING, IN_PROGRESS, RESOLVED, REJECTED

    @Column(name = "admin_reply", columnDefinition = "TEXT")
    private String adminReply;

    @Column(name = "is_approved_for_home")
    @Builder.Default
    private Boolean isApprovedForHome = false;

    @Column(name = "replied_at")
    private LocalDateTime repliedAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        LocalDateTime now = LocalDateTime.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh"));
        if (this.createdAt == null) {
            this.createdAt = now;
        }
        if (this.updatedAt == null) {
            this.updatedAt = now;
        }
        if (this.status == null) {
            this.status = "PENDING";
        }
        if (this.isApprovedForHome == null) {
            this.isApprovedForHome = false;
        }
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh"));
    }
}
