package com.example.demo.controller;

import com.example.demo.model.ServiceItemEntity;
import com.example.demo.repository.ServiceRepository;
import com.example.demo.util.AdminSecurityUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/services")
@CrossOrigin(origins = "*")
public class ServiceController {

    @Autowired
    private ServiceRepository serviceRepository;

    @GetMapping
    @Cacheable(value = "services")
    public List<ServiceItemEntity> getAllServices() {
        return serviceRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<ServiceItemEntity> getServiceById(@PathVariable String id) {
        return serviceRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @CacheEvict(value = "services", allEntries = true)
    public ResponseEntity<?> createService(
            @RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth,
            @RequestBody ServiceItemEntity service) {
        if (!AdminSecurityUtil.isValidAdmin(adminAuth)) {
            return ResponseEntity.status(403).body("Security Error: Only authenticated Admin can add services.");
        }

        if (service.getId() == null || service.getId().trim().isEmpty()) {
            service.setId("srv-" + UUID.randomUUID().toString().substring(0, 8));
        }
        return ResponseEntity.ok(serviceRepository.save(service));
    }

    @PutMapping("/{id}")
    @CacheEvict(value = "services", allEntries = true)
    public ResponseEntity<?> updateService(
            @RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth,
            @PathVariable String id,
            @RequestBody ServiceItemEntity srvDetails) {
        if (!AdminSecurityUtil.isValidAdmin(adminAuth)) {
            return ResponseEntity.status(403).body("Security Error: Only authenticated Admin can edit services.");
        }

        return serviceRepository.findById(id).map(srv -> {
            srv.setTitle(srvDetails.getTitle());
            srv.setText(srvDetails.getText());
            srv.setIcon(srvDetails.getIcon());
            srv.setCls(srvDetails.getCls());
            srv.setUrl(srvDetails.getUrl());
            return ResponseEntity.ok(serviceRepository.save(srv));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @CacheEvict(value = "services", allEntries = true)
    public ResponseEntity<?> deleteService(
            @RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth,
            @PathVariable String id) {
        if (!AdminSecurityUtil.isValidAdmin(adminAuth)) {
            return ResponseEntity.status(403).body("Security Error: Only authenticated Admin can delete services.");
        }

        if (serviceRepository.existsById(id)) {
            serviceRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}
