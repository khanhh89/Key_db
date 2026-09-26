package com.example.demo.repository;

import com.example.demo.model.BypassProviderEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BypassProviderRepository extends JpaRepository<BypassProviderEntity, String> {

    List<BypassProviderEntity> findByIsActiveTrueOrderByPriorityAsc();

    List<BypassProviderEntity> findAllByOrderByPriorityAscCreatedAtDesc();
}
