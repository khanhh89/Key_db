package com.example.demo.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "coupons")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CouponEntity {

    @Id
    private String id;

    @Column(name = "code", nullable = false, unique = true)
    private String code; // e.g., "MODVIP10", "KHANH89"

    @Column(name = "discount_type", nullable = false)
    private String discountType; // "PERCENTAGE" or "FIXED_AMOUNT"

    @Column(name = "discount_value", nullable = false)
    private Double discountValue; // e.g. 10 (for 10%) or 20000 (for 20,000 VND)

    @Column(name = "min_order_amount")
    private Double minOrderAmount; // Minimum order value to apply

    @Column(name = "max_discount_amount")
    private Double maxDiscountAmount; // Cap max discount for percentage

    @Column(name = "max_uses")
    private Integer maxUses; // Maximum total redemptions (null or 0 = unlimited)

    @Column(name = "used_count")
    private Integer usedCount; // Current redemption count

    @Column(name = "app_id")
    private String appId; // "ALL" or specific app ID

    @Column(name = "active")
    private Boolean active; // Enabled/disabled toggle

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "valid_until")
    private LocalDateTime validUntil;

    @jakarta.persistence.PrePersist
    public void prePersist() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.usedCount == null) {
            this.usedCount = 0;
        }
        if (this.active == null) {
            this.active = true;
        }
        if (this.discountType == null) {
            this.discountType = "PERCENTAGE";
        }
    }
}
