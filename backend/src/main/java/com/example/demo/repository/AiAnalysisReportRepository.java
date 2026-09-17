package com.example.demo.repository;

import com.example.demo.model.AiAnalysisReportEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AiAnalysisReportRepository extends JpaRepository<AiAnalysisReportEntity, Long> {

    List<AiAnalysisReportEntity> findAllByOrderByCreatedAtDesc();

    Page<AiAnalysisReportEntity> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Optional<AiAnalysisReportEntity> findFirstByOrderByCreatedAtDesc();
}
