package com.example.demo.controller;

import com.example.demo.model.PricePresetEntity;
import com.example.demo.repository.LicenseKeyRepository;
import com.example.demo.repository.PricePresetRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/price-presets")
@CrossOrigin(origins = "*")
public class PricePresetController {

    private final PricePresetRepository pricePresetRepository;
    private final LicenseKeyRepository licenseKeyRepository;

    @Autowired
    public PricePresetController(PricePresetRepository pricePresetRepository,
                                 LicenseKeyRepository licenseKeyRepository) {
        this.pricePresetRepository = pricePresetRepository;
        this.licenseKeyRepository = licenseKeyRepository;
    }

    @GetMapping
    public List<PricePresetEntity> getAllPresets() {
        List<PricePresetEntity> list = pricePresetRepository.findAll();
        if (list.isEmpty()) {
            // Auto seed default presets into DB if table is empty
            List<PricePresetEntity> defaults = Arrays.asList(
                    PricePresetEntity.builder().id("preset-1").name("Gói 1 Ngày").durationDays(1).price(15000.0).build(),
                    PricePresetEntity.builder().id("preset-3").name("Gói 3 Ngày").durationDays(3).price(25000.0).build(),
                    PricePresetEntity.builder().id("preset-7").name("Gói 7 Ngày").durationDays(7).price(35000.0).build(),
                    PricePresetEntity.builder().id("preset-15").name("Gói 15 Ngày").durationDays(15).price(65000.0).build(),
                    PricePresetEntity.builder().id("preset-30").name("Gói 1 Tháng (30 Ngày)").durationDays(30).price(100000.0).build(),
                    PricePresetEntity.builder().id("preset-90").name("Gói 3 Tháng (90 Ngày)").durationDays(90).price(250000.0).build(),
                    PricePresetEntity.builder().id("preset-365").name("Gói 1 Năm (365 Ngày)").durationDays(365).price(500000.0).build(),
                    PricePresetEntity.builder().id("preset-9999").name("Gói Vĩnh Viễn").durationDays(9999).price(1000000.0).build()
            );
            return pricePresetRepository.saveAll(defaults);
        }
        return list;
    }

    @PostMapping
    public ResponseEntity<?> savePreset(@RequestBody PricePresetEntity preset) {
        if (preset.getName() == null || preset.getName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Tên gói giá không được để trống!");
        }
        if (preset.getDurationDays() == null || preset.getDurationDays() <= 0) {
            return ResponseEntity.badRequest().body("Số ngày thời hạn phải lớn hơn 0!");
        }
        if (preset.getPrice() == null || preset.getPrice() < 2000) {
            return ResponseEntity.badRequest().body("Giá bán phải tối thiểu 2,000 VNĐ!");
        }

        if (preset.getId() == null || preset.getId().trim().isEmpty()) {
            preset.setId("preset-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 4));
        }

        PricePresetEntity saved = pricePresetRepository.save(preset);

        // Sync price across all keys with same durationDays (AVAILABLE + SOLD)
        int updatedKeyCount = licenseKeyRepository.updatePriceByDurationDays(saved.getDurationDays(), saved.getPrice());
        System.out.println("[PricePreset] Updated price=" + saved.getPrice() + " for " + updatedKeyCount
                + " keys with durationDays=" + saved.getDurationDays());

        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletePreset(@PathVariable String id) {
        if (!pricePresetRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        PricePresetEntity preset = pricePresetRepository.findById(id).get();

        // Kiểm tra keys AVAILABLE đang dùng durationDays này
        long availableKeyCount = licenseKeyRepository
                .findByDurationDaysAndStatus(preset.getDurationDays(), "AVAILABLE")
                .size();

        if (availableKeyCount > 0) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("blocked", true);
            error.put("availableKeyCount", availableKeyCount);
            error.put("durationDays", preset.getDurationDays());
            error.put("message", String.format(
                "Không thể xóa gói \"%s\" vì còn %d key AVAILABLE đang dùng thời hạn %d ngày này. " +
                "Hãy xóa hoặc bán hết các key đó trước.",
                preset.getName(), availableKeyCount, preset.getDurationDays()
            ));
            return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
        }

        try {
            pricePresetRepository.deleteById(id);
            Map<String, Object> res = new HashMap<>();
            res.put("success", true);
            res.put("message", "Đã xóa gói giá mẫu [" + preset.getName() + "] khỏi cơ sở dữ liệu!");
            return ResponseEntity.ok(res);
        } catch (DataIntegrityViolationException e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("blocked", true);
            error.put("message", "Không thể xóa gói giá vì còn dữ liệu liên quan trong hệ thống.");
            return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
        }
    }
}
