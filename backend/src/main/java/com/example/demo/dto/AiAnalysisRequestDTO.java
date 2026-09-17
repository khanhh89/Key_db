package com.example.demo.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiAnalysisRequestDTO {

    @Builder.Default
    private String timeframe = "ALL"; // TODAY, 7DAYS, 30DAYS, ALL

    private String customFocus; // Optional custom focus topic from Admin
}
