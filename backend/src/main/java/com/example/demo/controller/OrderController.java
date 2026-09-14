package com.example.demo.controller;

import com.example.demo.model.LicenseKeyEntity;
import com.example.demo.model.OrderEntity;
import com.example.demo.repository.LicenseKeyRepository;
import com.example.demo.repository.OrderRepository;
import com.example.demo.service.OrderService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/orders")
@CrossOrigin(origins = "*")
public class OrderController {

    private final OrderService orderService;

    @Autowired
    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @GetMapping
    public List<OrderEntity> getAllOrders(@RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth) {
        return orderService.getAllOrders(adminAuth);
    }

    @PostMapping("/create")
    public OrderEntity createOrder(
            HttpServletRequest request,
            @RequestBody OrderEntity orderReq) {
        return orderService.createOrder(request, orderReq);
    }

    @GetMapping("/{id}/status")
    public ResponseEntity<OrderEntity> getOrderStatus(@PathVariable String id) {
        return orderService.getOrderStatus(id);
    }

    @PostMapping("/{id}/verify-payment")
    public ResponseEntity<?> verifyCustomerPayment(@PathVariable String id) {
        return orderService.verifyCustomerPayment(id);
    }

    @PostMapping("/{id}/pay")
    public ResponseEntity<?> confirmOrderPayment(
            @RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth,
            @PathVariable String id) {
        return orderService.confirmOrderPayment(adminAuth, id);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteOrder(
            @RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth,
            @PathVariable String id) {
        return orderService.deleteOrder(adminAuth, id);
    }

    @DeleteMapping("/clear-all")
    public ResponseEntity<?> clearAllOrders(
            @RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth) {
        return orderService.clearAllOrders(adminAuth);
    }

    // Static helper backward compatibility wrappers
    public static Optional<LicenseKeyEntity> findMatchingKeyForOrder(
            LicenseKeyRepository licenseKeyRepository,
            String appId,
            Integer durationDays,
            Double amount) {
        return OrderService.findMatchingKeyForOrder(licenseKeyRepository, appId, durationDays, amount);
    }

    public static void fulfillOrderKeyStatic(OrderEntity order, LicenseKeyRepository licenseKeyRepository, OrderRepository orderRepository) {
        OrderService.fulfillOrderKeyStatic(order, licenseKeyRepository, orderRepository);
    }
}
