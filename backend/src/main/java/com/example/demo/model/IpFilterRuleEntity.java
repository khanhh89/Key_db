package com.example.demo.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "ip_filter_rules")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IpFilterRuleEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ip_address", nullable = false, unique = true)
    private String ipAddress;

    @Column(name = "action", nullable = false)
    // "ALLOW" or "BLOCK"
    private String action;

    @Column(name = "notes")
    private String notes;
}
