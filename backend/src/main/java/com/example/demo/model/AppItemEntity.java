package com.example.demo.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "apps")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AppItemEntity {

    @Id
    @Column(name = "id", length = 50)
    private String id;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "sub")
    private String sub;

    @Column(name = "icon", columnDefinition = "TEXT")
    private String icon;

    @Column(name = "cls", length = 50)
    private String cls;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @Column(name = "shots", columnDefinition = "TEXT")
    private String shots;

    @Column(name = "download_url", columnDefinition = "TEXT")
    private String downloadUrl;

    @Column(name = "ipa_url", columnDefinition = "TEXT")
    private String ipaUrl;

    @Column(name = "platform", length = 20)
    private String platform; // 'android', 'ios', 'both'

    @Column(name = "allow_sell_key")
    @JsonProperty("allowSellKey")
    private Boolean allowSellKey;

    @Column(name = "allow_free_key")
    @JsonProperty("allowFreeKey")
    private Boolean allowFreeKey;

    @Column(name = "free_key")
    @JsonProperty("freeKey")
    private String freeKey;

    @Column(name = "tags", columnDefinition = "TEXT")
    private String tags;

    @Column(name = "updated_at")
    private String updatedAt;
}