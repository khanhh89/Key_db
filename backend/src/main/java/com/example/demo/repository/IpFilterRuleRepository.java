package com.example.demo.repository;

import com.example.demo.model.IpFilterRuleEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface IpFilterRuleRepository extends JpaRepository<IpFilterRuleEntity, Long> {
    Optional<IpFilterRuleEntity> findByIpAddress(String ipAddress);
}
