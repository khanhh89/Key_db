package com.example.demo.dto.gateway;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class BypassGatewayStatsDTO {
    private Long totalSessions;
    private Long completedSessions;
    private Long pendingSessions;
    private Long blockedSessions;
    private Double overallConversionRate;
    private Long todaySessions;
    private Long todayCompleted;
    private Integer activeProvidersCount;
    private List<BypassProviderDTO> providers;
}
