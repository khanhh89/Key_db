package com.example.demo.repository;

import com.example.demo.model.BypassDeviceEntitlementEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface BypassDeviceEntitlementRepository extends JpaRepository<BypassDeviceEntitlementEntity, String> {

    Optional<BypassDeviceEntitlementEntity> findByDeviceId(String deviceId);

    Optional<BypassDeviceEntitlementEntity> findByDeviceIdAndExpiresAtAfter(String deviceId, LocalDateTime now);
}
