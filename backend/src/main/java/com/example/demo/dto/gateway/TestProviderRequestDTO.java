package com.example.demo.dto.gateway;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TestProviderRequestDTO {
    private String id;
    private String name;
    private String apiUrl;
    private String apiToken;
    private String paramTokenName;
    private String paramUrlName;
    private String requestType;
    private String testUrl;
}
