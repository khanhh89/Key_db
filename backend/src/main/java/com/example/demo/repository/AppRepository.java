package com.example.demo.repository;

import com.example.demo.model.AppItemEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AppRepository extends JpaRepository<AppItemEntity, String> {
}
