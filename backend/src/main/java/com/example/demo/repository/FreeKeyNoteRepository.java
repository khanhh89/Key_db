package com.example.demo.repository;

import com.example.demo.model.FreeKeyNoteEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FreeKeyNoteRepository extends JpaRepository<FreeKeyNoteEntity, String> {

    Optional<FreeKeyNoteEntity> findBySlugIgnoreCase(String slug);

    boolean existsBySlugIgnoreCase(String slug);

    boolean existsBySlugIgnoreCaseAndIdNot(String slug, String id);

    List<FreeKeyNoteEntity> findAllByOrderByCreatedAtDesc();
}
