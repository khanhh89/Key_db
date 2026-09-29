package com.example.demo.dto.gateway;

import com.example.demo.model.BypassProviderEntity;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class BypassProviderDTO {
    private String id;
    private String name;
    private String apiUrl;
    private String apiToken;
    private String paramTokenName;
    private String paramUrlName;
    private String requestType;
    private Integer weight;
    private Integer priority;
    private Boolean isActive;
    private Integer bypassSteps;
    private Integer totalClicks;
    private Integer totalCompleted;
    private Double conversionRate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static BypassProviderDTO fromEntity(BypassProviderEntity e, boolean maskToken) {
        if (e == null) return null;
        String token = e.getApiToken();
        if (maskToken && token != null && token.length() > 6) {
            token = token.substring(0, 3) + "••••••••" + token.substring(token.length() - 3);
        }
        double rate = 0.0;
        if (e.getTotalClicks() != null && e.getTotalClicks() > 0 && e.getTotalCompleted() != null) {
            rate = Math.round(((double) e.getTotalCompleted() / e.getTotalClicks()) * 1000.0) / 10.0;
        }

        return BypassProviderDTO.builder()
                .id(e.getId())
                .name(e.getName())
                .apiUrl(e.getApiUrl())
                .apiToken(token)
                .paramTokenName(e.getParamTokenName() != null ? e.getParamTokenName() : "api")
                .paramUrlName(e.getParamUrlName() != null ? e.getParamUrlName() : "url")
                .requestType(e.getRequestType() != null ? e.getRequestType() : "GET")
                .weight(e.getWeight() != null ? e.getWeight() : 1)
                .priority(e.getPriority() != null ? e.getPriority() : 1)
                .isActive(e.getIsActive() != null ? e.getIsActive() : true)
                .bypassSteps(e.getBypassSteps() != null ? e.getBypassSteps() : 1)
                .totalClicks(e.getTotalClicks() != null ? e.getTotalClicks() : 0)
                .totalCompleted(e.getTotalCompleted() != null ? e.getTotalCompleted() : 0)
                .conversionRate(rate)
                .createdAt(e.getCreatedAt())
                .updatedAt(e.getUpdatedAt())
                .build();
    }
}
