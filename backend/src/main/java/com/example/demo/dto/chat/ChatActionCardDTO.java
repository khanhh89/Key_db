package com.example.demo.dto.chat;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatActionCardDTO {
    /**
     * Card type: "APP_BUY", "APP_FREE", "ORDER_STATUS", "EXTERNAL_LINK"
     */
    private String type;
    private String title;
    private String subtitle;
    private String appId;
    private String actionUrl;
    private Map<String, Object> data;
}

