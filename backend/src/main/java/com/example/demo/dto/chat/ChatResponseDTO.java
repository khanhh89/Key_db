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
public class ChatResponseDTO {
    private String reply;
    private List<ChatActionCardDTO> actionCards;
    private String modelUsed;
    private List<String> quickSuggestions;
    private Boolean isFallback;
}

