package com.example.demo.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonInclude;

@Entity
@Table(name = "keys_store", indexes = {
    @Index(name = "idx_key_app_status", columnList = "app_id, status"),
    @Index(name = "idx_key_duration_status", columnList = "duration_days, status"),
    @Index(name = "idx_key_app_duration_price", columnList = "app_id, duration_days, price, status")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class LicenseKeyEntity {

    @Id
    private String id;

    @Column(name = "app_id", nullable = false)
    private String appId;

    @Column(name = "key_code", nullable = false)
    private String keyCode;

    @Column(name = "duration_days")
    private Integer durationDays;

    @Column(name = "price")
    private Double price;

    @Column(name = "status")
    private String status; // "AVAILABLE", "SOLD"

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "sold_at")
    private LocalDateTime soldAt;
}
