package com.example.demo.controller;

import com.example.demo.service.I18nService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/api/i18n")
@CrossOrigin(origins = "*")
public class I18nController {

    @Autowired
    private I18nService i18nService;

    @GetMapping("/lang")
    public ResponseEntity<Map<String, String>> getCurrentLanguage() {
        Locale locale = LocaleContextHolder.getLocale();
        Map<String, String> response = new HashMap<>();
        response.put("locale", locale.toString());
        response.put("language", locale.getLanguage());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/messages")
    public ResponseEntity<Map<String, String>> getLocalizedMessages() {
        Locale locale = LocaleContextHolder.getLocale();
        Map<String, String> messages = new HashMap<>();
        messages.put("api.security.error", i18nService.getMessage("api.security.error", null, locale));
        messages.put("api.app.deleted", i18nService.getMessage("api.app.deleted", null, locale));
        messages.put("api.app.saved", i18nService.getMessage("api.app.saved", null, locale));
        messages.put("api.service.deleted", i18nService.getMessage("api.service.deleted", null, locale));
        messages.put("api.service.saved", i18nService.getMessage("api.service.saved", null, locale));
        messages.put("api.key.deleted", i18nService.getMessage("api.key.deleted", null, locale));
        messages.put("api.key.saved", i18nService.getMessage("api.key.saved", null, locale));
        messages.put("api.coupon.invalid", i18nService.getMessage("api.coupon.invalid", null, locale));
        messages.put("api.coupon.valid", i18nService.getMessage("api.coupon.valid", null, locale));
        messages.put("api.order.created", i18nService.getMessage("api.order.created", null, locale));
        messages.put("api.order.payment_pending", i18nService.getMessage("api.order.payment_pending", null, locale));
        messages.put("api.order.paid", i18nService.getMessage("api.order.paid", null, locale));
        messages.put("api.config.saved", i18nService.getMessage("api.config.saved", null, locale));
        return ResponseEntity.ok(messages);
    }
}
