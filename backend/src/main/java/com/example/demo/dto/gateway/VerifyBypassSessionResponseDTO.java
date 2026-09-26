package com.example.demo.dto.gateway;

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
public class VerifyBypassSessionResponseDTO {
    private Boolean success;
    private String status; // COMPLETED, ALREADY_VERIFIED, EXPIRED, BLOCKED
    private String message;
    private LocalDateTime entitlementExpiresAt;
    private String targetAppId;
    private String targetAppName;
    private String freeKey;
    private String downloadUrl;
}
