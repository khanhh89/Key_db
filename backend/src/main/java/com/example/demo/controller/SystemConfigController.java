package com.example.demo.controller;

import com.example.demo.model.SystemConfigEntity;
import com.example.demo.repository.SystemConfigRepository;
import com.example.demo.util.AdminSecurityUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/config")
@CrossOrigin(origins = "*")
public class SystemConfigController {

    @Autowired
    private SystemConfigRepository systemConfigRepository;

    @GetMapping
    public ResponseEntity<SystemConfigEntity> getConfig(@RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth) {
        SystemConfigEntity config = systemConfigRepository.findAll().stream().findFirst()
                .orElseGet(() -> {
                    SystemConfigEntity defaultConfig = SystemConfigEntity.builder()
                            .brandName("")
                            .domain("")
                            .facebookUrl("")
                            .messengerUrl("")
                            .zaloUrl("")
                            .telegramUrl("")
                            .specialties("")
                            .build();
                    return systemConfigRepository.save(defaultConfig);
                });

        boolean isAdmin = AdminSecurityUtil.isValidAdmin(adminAuth);
        if (!isAdmin) {
            // Strip and hide Cloudinary sensitive credentials from public client API response
            SystemConfigEntity publicConfig = SystemConfigEntity.builder()
                    .id(config.getId())
                    .brandName(config.getBrandName())
                    .domain(config.getDomain())
                    .facebookUrl(config.getFacebookUrl())
                    .messengerUrl(config.getMessengerUrl())
                    .zaloUrl(config.getZaloUrl())
                    .telegramUrl(config.getTelegramUrl())
                    .facebookLogoUrl(config.getFacebookLogoUrl())
                    .messengerLogoUrl(config.getMessengerLogoUrl())
                    .zaloLogoUrl(config.getZaloLogoUrl())
                    .telegramLogoUrl(config.getTelegramLogoUrl())
                    .socialChannels(config.getSocialChannels())
                    .specialties(config.getSpecialties())
                    .faviconUrl(config.getFaviconUrl())
                    .cloudinaryCloudName(null)
                    .cloudinaryUploadPreset(null)
                    .cloudinaryApiKey(null)
                    .cloudinaryApiSecret(null)
                    .build();
            return ResponseEntity.ok(publicConfig);
        }

        return ResponseEntity.ok(config);
    }

    @PutMapping
    public ResponseEntity<?> updateConfig(
            @RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth,
            @RequestBody SystemConfigEntity configDetails) {
        if (!AdminSecurityUtil.isValidAdmin(adminAuth)) {
            return ResponseEntity.status(403).body("Security Error: Only authenticated Admin can update System configuration.");
        }

        SystemConfigEntity config = systemConfigRepository.findAll().stream().findFirst().orElseGet(() -> new SystemConfigEntity());
        config.setBrandName(configDetails.getBrandName());
        config.setDomain(configDetails.getDomain());
        config.setFacebookUrl(configDetails.getFacebookUrl());
        config.setMessengerUrl(configDetails.getMessengerUrl());
        config.setZaloUrl(configDetails.getZaloUrl());
        config.setTelegramUrl(configDetails.getTelegramUrl());
        config.setFacebookLogoUrl(configDetails.getFacebookLogoUrl());
        config.setMessengerLogoUrl(configDetails.getMessengerLogoUrl());
        config.setZaloLogoUrl(configDetails.getZaloLogoUrl());
        config.setTelegramLogoUrl(configDetails.getTelegramLogoUrl());
        config.setSocialChannels(configDetails.getSocialChannels());
        config.setSpecialties(configDetails.getSpecialties());
        config.setFaviconUrl(configDetails.getFaviconUrl());
        config.setCloudinaryCloudName(configDetails.getCloudinaryCloudName());
        config.setCloudinaryUploadPreset(configDetails.getCloudinaryUploadPreset());
        config.setCloudinaryApiKey(configDetails.getCloudinaryApiKey());
        config.setCloudinaryApiSecret(configDetails.getCloudinaryApiSecret());

        if (configDetails.getAdminUsername() != null && !configDetails.getAdminUsername().isEmpty()) {
            config.setAdminUsername(configDetails.getAdminUsername());
        }
        if (configDetails.getAdminPassword() != null && !configDetails.getAdminPassword().isEmpty()) {
            config.setAdminPassword(com.example.demo.util.PasswordUtil.hashPassword(configDetails.getAdminPassword()));
        }
        return ResponseEntity.ok(systemConfigRepository.save(config));
    }
}
