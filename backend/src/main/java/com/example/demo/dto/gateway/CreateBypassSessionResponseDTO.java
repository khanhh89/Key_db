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
public class CreateBypassSessionResponseDTO {
    private Boolean success;
    private Boolean alreadyEntitled;
    private String sessionId;
    private String providerId;
    private String providerName;
    private String shortenedUrl;
    private String callbackUrl;
    private LocalDateTime expiresAt;
    private String message;
}
