package com.example.demo.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import com.fasterxml.jackson.annotation.JsonInclude;

@Entity
@Table(name = "bank_config")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class BankConfigEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "bank_id")
    private String bankId;

    @Column(name = "account_no")
    private String accountNo;

    @Column(name = "account_name")
    private String accountName;

    // PAYOS API CREDENTIALS
    @Column(name = "payos_client_id")
    private String payosClientId;

    @Column(name = "payos_api_key")
    private String payosApiKey;

    @Column(name = "payos_checksum_key")
    private String payosChecksumKey;

    @Column(name = "payos_enabled")
    private Boolean payosEnabled;

    @Column(name = "enable_static_qr")
    private Boolean enableStaticQr;
}
