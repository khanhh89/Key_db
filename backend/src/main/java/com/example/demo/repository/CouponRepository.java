package com.example.demo.repository;

import com.example.demo.model.CouponEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CouponRepository extends JpaRepository<CouponEntity, String> {
    Optional<CouponEntity> findByCodeIgnoreCase(String code);
    Optional<CouponEntity> findByCodeIgnoreCaseAndActiveTrue(String code);
}
