package com.example.demo.controller;

import com.example.demo.model.BankConfigEntity;
import com.example.demo.repository.BankConfigRepository;
import com.example.demo.util.AdminSecurityUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/bank-config")
@CrossOrigin(origins = "*")
public class BankConfigController {

    @Autowired
    private BankConfigRepository bankConfigRepository;

    @Autowired
    private com.example.demo.service.EmailService emailService;

    @GetMapping
    public ResponseEntity<BankConfigEntity> getBankConfig(@RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth) {
        BankConfigEntity config = bankConfigRepository.findAll().stream().findFirst()
                .orElseGet(() -> {
                    BankConfigEntity defaultConfig = BankConfigEntity.builder()
                            .bankId("")
                            .accountNo("")
                            .accountName("")
                            .payosClientId("")
                            .payosApiKey("")
                            .payosChecksumKey("")
                            .payosEnabled(false)
                            .enableStaticQr(true)
                            .mailHost("smtp.gmail.com")
                            .mailPort(587)
                            .mailUsername("")
                            .mailPassword("")
                            .mailSenderName("MOD VIP STORE")
                            .mailEnabled(true)
                            .build();
                    return bankConfigRepository.save(defaultConfig);
                });

        boolean isAdmin = AdminSecurityUtil.isValidAdmin(adminAuth);
        if (!isAdmin) {
            BankConfigEntity publicConfig = BankConfigEntity.builder()
                    .id(config.getId())
                    .bankId(config.getBankId())
                    .accountNo(config.getAccountNo())
                    .accountName(config.getAccountName())
                    .payosEnabled(config.getPayosEnabled() != null ? config.getPayosEnabled() : false)
                    .enableStaticQr(config.getEnableStaticQr() != null ? config.getEnableStaticQr() : true)
                    .payosClientId(null)
                    .payosApiKey(null)
                    .payosChecksumKey(null)
                    .mailUsername(null)
                    .mailPassword(null)
                    .mailSenderName(config.getMailSenderName())
                    .mailEnabled(config.getMailEnabled())
                    .build();
            return ResponseEntity.ok(publicConfig);
        }

        if (config.getPayosEnabled() == null) {
            config.setPayosEnabled(false);
        }
        if (config.getEnableStaticQr() == null) {
            config.setEnableStaticQr(true);
        }
        if (config.getMailEnabled() == null) {
            config.setMailEnabled(true);
        }
        return ResponseEntity.ok(config);
    }

    @PutMapping
    public ResponseEntity<?> updateBankConfig(
            @RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth,
            @RequestBody BankConfigEntity bankDetails) {
        if (!AdminSecurityUtil.isValidAdmin(adminAuth)) {
            return ResponseEntity.status(403).body("Security Error: Only authenticated Admin can update Bank configuration.");
        }

        BankConfigEntity config = bankConfigRepository.findAll().stream().findFirst()
                .orElseGet(() -> new BankConfigEntity());

        if (bankDetails.getBankId() != null) config.setBankId(bankDetails.getBankId());
        if (bankDetails.getAccountNo() != null) config.setAccountNo(bankDetails.getAccountNo());
        if (bankDetails.getAccountName() != null) config.setAccountName(bankDetails.getAccountName());

        // Protect PayOS credentials from being wiped out by empty strings
        if (bankDetails.getPayosClientId() != null && !bankDetails.getPayosClientId().isBlank()) {
            config.setPayosClientId(bankDetails.getPayosClientId().trim());
        }
        if (bankDetails.getPayosApiKey() != null && !bankDetails.getPayosApiKey().isBlank()) {
            config.setPayosApiKey(bankDetails.getPayosApiKey().trim());
        }
        if (bankDetails.getPayosChecksumKey() != null && !bankDetails.getPayosChecksumKey().isBlank()) {
            config.setPayosChecksumKey(bankDetails.getPayosChecksumKey().trim());
        }

        if (bankDetails.getPayosEnabled() != null) config.setPayosEnabled(bankDetails.getPayosEnabled());
        if (bankDetails.getEnableStaticQr() != null) config.setEnableStaticQr(bankDetails.getEnableStaticQr());

        // Update Gmail SMTP credentials
        if (bankDetails.getMailHost() != null && !bankDetails.getMailHost().isBlank()) {
            config.setMailHost(bankDetails.getMailHost().trim());
        }
        if (bankDetails.getMailPort() != null && bankDetails.getMailPort() > 0) {
            config.setMailPort(bankDetails.getMailPort());
        }
        if (bankDetails.getMailUsername() != null) {
            config.setMailUsername(bankDetails.getMailUsername().trim());
        }
        if (bankDetails.getMailPassword() != null && !bankDetails.getMailPassword().isBlank()) {
            config.setMailPassword(bankDetails.getMailPassword().trim());
        }
        if (bankDetails.getMailSenderName() != null) {
            config.setMailSenderName(bankDetails.getMailSenderName().trim());
        }
        if (bankDetails.getMailEnabled() != null) {
            config.setMailEnabled(bankDetails.getMailEnabled());
        }

        return ResponseEntity.ok(bankConfigRepository.save(config));
    }

    @PostMapping("/test-email")
    public ResponseEntity<?> testMailConnection(
            @RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth,
            @RequestBody java.util.Map<String, String> body) {
        if (!AdminSecurityUtil.isValidAdmin(adminAuth)) {
            return ResponseEntity.status(403).body("Security Error: Only authenticated Admin can test email connection.");
        }
        String targetEmail = body != null ? body.get("targetEmail") : null;
        return ResponseEntity.ok(emailService.testSendEmail(targetEmail));
    }
}
