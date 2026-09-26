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
public class CreateBypassSessionRequestDTO {
    private String deviceId;
    private String appId;
    private String providerId; // optional override
    private String baseUrl;    // client domain/origin
}
