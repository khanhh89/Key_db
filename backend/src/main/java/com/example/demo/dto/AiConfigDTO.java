package com.example.demo.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiConfigDTO {

    private String geminiApiKey;
    private Boolean hasApiKey;
    private String aiModel;
    private String aiCustomPrompt;
    private String activeProvider; // "GEMINI_AI" or "BUILTIN_HEURISTIC"
}
