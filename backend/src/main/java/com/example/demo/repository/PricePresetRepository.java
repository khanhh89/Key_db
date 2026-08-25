package com.example.demo.repository;

import com.example.demo.model.PricePresetEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PricePresetRepository extends JpaRepository<PricePresetEntity, String> {
}
