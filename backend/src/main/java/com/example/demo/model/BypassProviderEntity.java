package com.example.demo.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "bypass_providers", indexes = {
    @Index(name = "idx_provider_active_weight", columnList = "is_active, weight")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class BypassProviderEntity {

    @Id
    @Column(name = "id", length = 50)
    private String id;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "api_url", nullable = false, length = 255)
    private String apiUrl;

    @Column(name = "api_token", nullable = false, length = 255)
    private String apiToken;

    @Column(name = "param_token_name", length = 50)
    @Builder.Default
    private String paramTokenName = "api";

    @Column(name = "param_url_name", length = 50)
    @Builder.Default
    private String paramUrlName = "url";

    @Column(name = "request_type", length = 20)
    @Builder.Default
    private String requestType = "GET";

    @Column(name = "weight")
    @Builder.Default
    private Integer weight = 1;

    @Column(name = "priority")
    @Builder.Default
    private Integer priority = 1;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "bypass_steps")
    @Builder.Default
    private Integer bypassSteps = 1;

    @Column(name = "total_clicks")
    @Builder.Default
    private Integer totalClicks = 0;

    @Column(name = "total_completed")
    @Builder.Default
    private Integer totalCompleted = 0;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        LocalDateTime now = LocalDateTime.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh"));
        if (this.createdAt == null) this.createdAt = now;
        if (this.updatedAt == null) this.updatedAt = now;
        if (this.paramTokenName == null) this.paramTokenName = "api";
        if (this.paramUrlName == null) this.paramUrlName = "url";
        if (this.requestType == null) this.requestType = "GET";
        if (this.weight == null) this.weight = 1;
        if (this.priority == null) this.priority = 1;
        if (this.isActive == null) this.isActive = true;
        if (this.bypassSteps == null) this.bypassSteps = 1;
        if (this.totalClicks == null) this.totalClicks = 0;
        if (this.totalCompleted == null) this.totalCompleted = 0;
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh"));
    }
}
