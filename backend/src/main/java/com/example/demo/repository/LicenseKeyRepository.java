package com.example.demo.repository;

import com.example.demo.model.LicenseKeyEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface LicenseKeyRepository extends JpaRepository<LicenseKeyEntity, String> {
    List<LicenseKeyEntity> findByAppIdAndStatus(String appId, String status);
    Optional<LicenseKeyEntity> findFirstByAppIdAndStatus(String appId, String status);
    Optional<LicenseKeyEntity> findFirstByAppIdAndDurationDaysAndStatus(String appId, Integer durationDays, String status);
    Optional<LicenseKeyEntity> findFirstByAppIdAndDurationDaysAndPriceAndStatus(String appId, Integer durationDays, Double price, String status);
    Optional<LicenseKeyEntity> findFirstByAppIdAndPriceAndStatus(String appId, Double price, String status);
    long countByAppIdAndStatus(String appId, String status);
    List<LicenseKeyEntity> findByDurationDays(Integer durationDays);
    List<LicenseKeyEntity> findByDurationDaysAndStatus(Integer durationDays, String status);
    List<LicenseKeyEntity> findByAppIdAndDurationDays(String appId, Integer durationDays);
    List<LicenseKeyEntity> findByAppIdAndDurationDaysAndStatus(String appId, Integer durationDays, String status);

}
