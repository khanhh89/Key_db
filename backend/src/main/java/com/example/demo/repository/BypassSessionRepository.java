package com.example.demo.repository;

import com.example.demo.model.BypassSessionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface BypassSessionRepository extends JpaRepository<BypassSessionEntity, String> {

    Optional<BypassSessionEntity> findByIdAndDeviceId(String id, String deviceId);

    List<BypassSessionEntity> findByDeviceIdOrderByStartedAtDesc(String deviceId);

    long countByStatus(String status);

    long countByStartedAtAfter(LocalDateTime after);

    long countByStatusAndStartedAtAfter(String status, LocalDateTime after);
}
