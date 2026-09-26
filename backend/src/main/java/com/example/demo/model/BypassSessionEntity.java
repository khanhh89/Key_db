package com.example.demo.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "bypass_sessions", indexes = {
    @Index(name = "idx_session_status_expires", columnList = "status, expires_at"),
    @Index(name = "idx_session_device_started", columnList = "device_id, started_at"),
    @Index(name = "idx_session_provider", columnList = "provider_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class BypassSessionEntity {

    @Id
    @Column(name = "id", length = 64)
    private String id;

    @Column(name = "provider_id", length = 50)
    private String providerId;

    @Column(name = "provider_name", length = 100)
    private String providerName;

    @Column(name = "device_id", nullable = false, length = 100)
    private String deviceId;

    @Column(name = "client_ip", length = 50)
    private String clientIp;

    @Column(name = "user_agent", columnDefinition = "TEXT")
    private String userAgent;

    @Column(name = "target_app_id", length = 50)
    private String targetAppId;

    @Column(name = "target_app_name", length = 100)
    private String targetAppName;

    @Column(name = "shortened_url", columnDefinition = "TEXT", nullable = false)
    private String shortenedUrl;

    @Column(name = "callback_url", columnDefinition = "TEXT")
    private String callbackUrl;

    @Column(name = "status", length = 30)
    @Builder.Default
    private String status = "PENDING"; // PENDING, COMPLETED, EXPIRED, BLOCKED

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @PrePersist
    public void prePersist() {
        LocalDateTime now = LocalDateTime.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh"));
        if (this.startedAt == null) this.startedAt = now;
        if (this.status == null) this.status = "PENDING";
        if (this.expiresAt == null) this.expiresAt = now.plusMinutes(25);
    }
}
