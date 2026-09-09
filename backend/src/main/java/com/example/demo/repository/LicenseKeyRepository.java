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

    List<LicenseKeyEntity> findByAppId(String appId);
    long countByAppId(String appId);

    /**
     * Bulk update price for ALL keys (AVAILABLE + SOLD) with a given durationDays.
     * Called when admin edits a price preset to keep all key prices in sync.
     */
    @Modifying
    @Transactional
    @Query("UPDATE LicenseKeyEntity k SET k.price = :newPrice WHERE k.durationDays = :durationDays")
    int updatePriceByDurationDays(@Param("durationDays") Integer durationDays, @Param("newPrice") Double newPrice);

    /**
     * Tìm key nhóm đầu tiên mà groupAppIds chứa appId và status = AVAILABLE.
     * Dùng LIKE để tìm appId trong chuỗi phân tách bằng dấu phẩy.
     */
    @Query("SELECT k FROM LicenseKeyEntity k WHERE k.status = :status AND k.groupAppIds IS NOT NULL AND k.groupAppIds <> '' AND (" +
           "k.groupAppIds = :appId OR " +
           "k.groupAppIds LIKE CONCAT(:appId, ',%') OR " +
           "k.groupAppIds LIKE CONCAT('%,', :appId, ',%') OR " +
           "k.groupAppIds LIKE CONCAT('%,', :appId))")
    List<LicenseKeyEntity> findByGroupContainingAppIdAndStatus(@Param("appId") String appId, @Param("status") String status);

    /**
     * Tìm key nhóm đầu tiên mà groupAppIds chứa appId, đúng durationDays và status = AVAILABLE.
     */
    @Query("SELECT k FROM LicenseKeyEntity k WHERE k.status = :status AND k.durationDays = :durationDays AND k.groupAppIds IS NOT NULL AND k.groupAppIds <> '' AND (" +
           "k.groupAppIds = :appId OR " +
           "k.groupAppIds LIKE CONCAT(:appId, ',%') OR " +
           "k.groupAppIds LIKE CONCAT('%,', :appId, ',%') OR " +
           "k.groupAppIds LIKE CONCAT('%,', :appId))")
    List<LicenseKeyEntity> findByGroupContainingAppIdAndDurationDaysAndStatus(
            @Param("appId") String appId,
            @Param("durationDays") Integer durationDays,
            @Param("status") String status);
}

