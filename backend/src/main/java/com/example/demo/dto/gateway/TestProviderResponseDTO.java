package com.example.demo.dto.gateway;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class TestProviderResponseDTO {
    private Boolean success;
    private Integer httpStatus;
    private String shortenedUrl;
    private Long responseTimeMs;
    private String rawResponse;
    private String message;
}
