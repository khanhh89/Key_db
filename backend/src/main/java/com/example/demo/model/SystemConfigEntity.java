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
}
