package com.example.demo.task;

import com.example.demo.repository.OrderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
public class OrderCleanupTask {

    @Autowired
    private OrderRepository orderRepository;

    // Automatic background cleanup task running every 30 seconds to purge unpaid pending orders >15 minutes
    @Scheduled(fixedRate = 30000)
    public void cleanupExpiredOrders() {
        try {
            LocalDateTime cutoffTime = LocalDateTime.now().minusMinutes(15);
            int deletedCount = orderRepository.deleteExpiredPendingOrders(cutoffTime);
            if (deletedCount > 0) {
                System.out.println(">>> [OrderCleanupTask] Automatically purged " + deletedCount + " expired pending orders (>15m) from DB!");
            }
        } catch (Exception e) {
            System.err.println(">>> [OrderCleanupTask] Error during expired order cleanup: " + e.getMessage());
        }
    }
}
