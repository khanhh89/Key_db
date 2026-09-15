package com.example.demo.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FreeKeyNotePublicDTO {
    private String id;
    private String slug;
    private String title;
    private String description;
    private String appId;
    private String appName;
    private String appIcon;
    private String downloadUrl;
    private String ipaUrl;
    private String keysContent;
    private List<String> keysList;
    private Integer keyCount;
    private Boolean hasPassword;
    private Integer maxViews;
    private Integer viewCount;
    private LocalDateTime expiresAt;
    private LocalDateTime createdAt;
    private String status; // ACTIVE, LOCKED, EXPIRED, LIMIT_REACHED, INACTIVE
    private String message;
}
