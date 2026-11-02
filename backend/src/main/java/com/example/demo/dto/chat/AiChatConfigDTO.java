package com.example.demo.dto.chat;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiChatConfigDTO {
    private Boolean enabled;
    private String botName;
    private String welcomeMessage;
    private List<String> quickPrompts;
    private String systemInstruction;
    private String aiModel;
    private Boolean hasApiKey;
}

