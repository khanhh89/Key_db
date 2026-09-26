package com.example.demo.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "bypass_device_entitlements", indexes = {
    @Index(name = "idx_entitlement_device", columnList = "device_id", unique = true),
    @Index(name = "idx_entitlement_expires", columnList = "expires_at")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class BypassDeviceEntitlementEntity {

    @Id
    @Column(name = "id", length = 64)
    private String id;

    @Column(name = "device_id", nullable = false, unique = true, length = 100)
    private String deviceId;

    @Column(name = "granted_at")
    private LocalDateTime grantedAt;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "last_session_id", length = 64)
    private String lastSessionId;

    @Column(name = "bypass_count")
    @Builder.Default
    private Integer bypassCount = 1;

    @PrePersist
    public void prePersist() {
        LocalDateTime now = LocalDateTime.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh"));
        if (this.grantedAt == null) this.grantedAt = now;
        if (this.bypassCount == null) this.bypassCount = 1;
    }
}
