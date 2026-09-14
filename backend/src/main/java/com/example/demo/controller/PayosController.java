package com.example.demo.controller;

import com.example.demo.service.PayosService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping({"/api/payos", "/api/payments/payos"})
@CrossOrigin(origins = "*")
public class PayosController {

    private final PayosService payosService;

    @Autowired
    public PayosController(PayosService payosService) {
        this.payosService = payosService;
    }

    @PostMapping("/create-payment-link")
    public ResponseEntity<Map<String, Object>> createPaymentLink(@RequestBody Map<String, Object> req) {
        return payosService.createPaymentLink(req);
    }

    @GetMapping({"/check-status/{orderId}", "/verify/{orderId}"})
    public ResponseEntity<Map<String, Object>> checkPayosStatus(@PathVariable String orderId) {
        return payosService.checkPayosStatus(orderId);
    }

    @PostMapping("/webhook")
    public ResponseEntity<Map<String, Object>> payosWebhook(@RequestBody Map<String, Object> webhookPayload) {
        return payosService.payosWebhook(webhookPayload);
    }
}
