package com.example.demo.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiAnalysisResponseDTO {

    private Long reportId;
    private String timeframe;
    private Integer uxHealthScore;
    private String healthStatus;
    private String summary;
    private String userBehaviorAnalysis;
    private String painPointsAnalysis;
    private String recommendations;
    private String aiModelUsed;
    private LocalDateTime createdAt;
    private AiMetricsDTO metrics;
}
