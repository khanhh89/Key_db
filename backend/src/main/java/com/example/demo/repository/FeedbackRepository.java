package com.example.demo.repository;

import com.example.demo.model.FeedbackEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface FeedbackRepository extends JpaRepository<FeedbackEntity, Long> {

    List<FeedbackEntity> findByDeviceIdOrderByCreatedAtDesc(String deviceId);

    Page<FeedbackEntity> findByStatus(String status, Pageable pageable);

    Page<FeedbackEntity> findByCategory(String category, Pageable pageable);

    Page<FeedbackEntity> findByStatusAndCategory(String status, String category, Pageable pageable);

    Page<FeedbackEntity> findAllByOrderByCreatedAtDesc(Pageable pageable);

    List<FeedbackEntity> findByIsApprovedForHomeTrueOrderByCreatedAtDesc();

    long countByDeviceIdAndCreatedAtAfter(String deviceId, LocalDateTime after);
}
