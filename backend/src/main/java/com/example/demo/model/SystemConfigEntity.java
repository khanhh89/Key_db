package com.example.demo.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import com.fasterxml.jackson.annotation.JsonInclude;

@Entity
@Table(name = "system_config")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SystemConfigEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "brand_name")
    private String brandName;

    @Column(name = "domain")
    private String domain;

    @Column(name = "facebook_url", length = 500)
    private String facebookUrl;

    @Column(name = "messenger_url", length = 500)
    private String messengerUrl;

    @Column(name = "zalo_url", length = 500)
    private String zaloUrl;

    @Column(name = "telegram_url", length = 500)
    private String telegramUrl;

    @Column(name = "facebook_logo_url", columnDefinition = "TEXT")
    private String facebookLogoUrl;

    @Column(name = "messenger_logo_url", columnDefinition = "TEXT")
    private String messengerLogoUrl;

    @Column(name = "zalo_logo_url", columnDefinition = "TEXT")
    private String zaloLogoUrl;

    @Column(name = "telegram_logo_url", columnDefinition = "TEXT")
    private String telegramLogoUrl;

    @Column(name = "social_channels", columnDefinition = "TEXT")
    private String socialChannels;

    @Column(name = "specialties", columnDefinition = "TEXT")
    private String specialties;



    @Column(name = "favicon_url", columnDefinition = "TEXT")
    private String faviconUrl;

    @Column(name = "cloudinary_cloud_name")
    private String cloudinaryCloudName;

    @Column(name = "cloudinary_upload_preset")
    private String cloudinaryUploadPreset;

    @Column(name = "cloudinary_api_key")
    private String cloudinaryApiKey;

    @Column(name = "cloudinary_api_secret")
    private String cloudinaryApiSecret;

    @Column(name = "admin_username")
    private String adminUsername;

    @Column(name = "admin_password")
    private String adminPassword;

    @Column(name = "totp_secret")
    private String totpSecret;

    @Column(name = "gemini_api_key", columnDefinition = "TEXT")
    private String geminiApiKey;

    @Column(name = "ai_model", length = 100)
    private String aiModel;

    @Column(name = "ai_custom_prompt", columnDefinition = "TEXT")
    private String aiCustomPrompt;

    @Column(name = "bypass_link_pool", columnDefinition = "TEXT")
    private String bypassLinkPool;

    @Column(name = "bypass_rotation_mode", length = 50)
    private String bypassRotationMode;

    @Column(name = "bypass_target_app_ids", columnDefinition = "TEXT")
    private String bypassTargetAppIds;

    @Column(name = "bypass_current_index")
    private Integer bypassCurrentIndex;

    @Column(name = "bypass_current_active_link", columnDefinition = "TEXT")
    private String bypassCurrentActiveLink;

    @Column(name = "bypass_last_rotated_date", length = 30)
    private String bypassLastRotatedDate;

    @Column(name = "bypass_auto_rotate_enabled")
    private Boolean bypassAutoRotateEnabled;

    @Column(name = "bypass_nested_steps")
    private Integer bypassNestedSteps;
}
