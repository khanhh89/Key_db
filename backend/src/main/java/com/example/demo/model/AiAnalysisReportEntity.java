package com.example.demo.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "ai_analysis_reports", indexes = {
    @Index(name = "idx_ai_reports_created", columnList = "created_at DESC")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiAnalysisReportEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "scope", length = 32, nullable = false)
    private String scope; // TODAY, 7DAYS, 30DAYS, ALL

    @Column(name = "ux_health_score", nullable = false)
    private Integer uxHealthScore; // 0 to 100

    @Column(name = "health_status", length = 32, nullable = false)
    private String healthStatus; // EXCELLENT, GOOD, NEEDS_ATTENTION, CRITICAL

    @Column(name = "summary", columnDefinition = "TEXT")
    private String summary;

    @Column(name = "user_behavior_analysis", columnDefinition = "TEXT")
    private String userBehaviorAnalysis;

    @Column(name = "pain_points_analysis", columnDefinition = "TEXT")
    private String painPointsAnalysis;

    @Column(name = "recommendations", columnDefinition = "TEXT")
    private String recommendations;

    @Column(name = "raw_metrics_json", columnDefinition = "TEXT")
    private String rawMetricsJson;

    @Column(name = "ai_model_used", length = 100)
    private String aiModelUsed;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh"));
        }
        if (this.scope == null) {
            this.scope = "ALL";
        }
        if (this.healthStatus == null) {
            this.healthStatus = "GOOD";
        }
    }
}
