package com.example.demo.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "price_presets")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PricePresetEntity {

    @Id
    private String id;

    @Column(name = "name", nullable = false)
    private String name; // e.g. "Gói 7 Ngày"

    @Column(name = "duration_days", nullable = false)
    private Integer durationDays; // e.g. 7

    @Column(name = "price", nullable = false)
    private Double price; // e.g. 35000.0
}
