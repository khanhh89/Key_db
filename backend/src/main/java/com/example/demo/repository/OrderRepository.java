package com.example.demo.repository;

import com.example.demo.model.OrderEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<OrderEntity, String> {
    Optional<OrderEntity> findByPaymentCode(String paymentCode);
    List<OrderEntity> findByStatusAndCreatedAtBefore(String status, LocalDateTime cutoffTime);

    @Modifying
    @Transactional
    @Query("DELETE FROM OrderEntity o WHERE UPPER(o.status) = 'PENDING' AND o.createdAt <= :cutoffTime")
    int deleteExpiredPendingOrders(@Param("cutoffTime") LocalDateTime cutoffTime);
}
