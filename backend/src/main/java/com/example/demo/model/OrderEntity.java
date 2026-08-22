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

@Entity
@Table(name = "orders", indexes = {
    @Index(name = "idx_order_payment_code", columnList = "payment_code"),
    @Index(name = "idx_order_status_created", columnList = "status, created_at")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderEntity {

    @Id
    private String id;

    @Column(name = "app_id", nullable = false)
    private String appId;

    @Column(name = "app_name")
    private String appName;

    @Column(name = "key_id")
    private String keyId;

    @Column(name = "amount", nullable = false)
    private Double amount;

    @Column(name = "duration_days")
    private Integer durationDays;

    @Column(name = "payment_code", nullable = false)
    private String paymentCode; // MK88219

    @Column(name = "status")
    private String status; // "PENDING", "PAID", "CANCELLED"

    @Column(name = "delivered_key")
    private String deliveredKey;

    @Column(name = "customer_email")
    private String customerEmail;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @jakarta.persistence.PrePersist
    public void prePersist() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh"));
        }
    }
}
