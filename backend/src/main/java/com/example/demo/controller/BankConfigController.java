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
                    .build();
            return ResponseEntity.ok(publicConfig);
        }

        if (config.getPayosEnabled() == null) {
            config.setPayosEnabled(false);
        }
        if (config.getEnableStaticQr() == null) {
            config.setEnableStaticQr(true);
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

        return ResponseEntity.ok(bankConfigRepository.save(config));
    }
}
