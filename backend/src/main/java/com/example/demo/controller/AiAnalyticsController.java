package com.example.demo.controller;

import com.example.demo.dto.*;
import com.example.demo.model.AiAnalysisReportEntity;
import com.example.demo.service.AiAnalyticsService;
import com.example.demo.util.AdminSecurityUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/admin/ai")
@CrossOrigin(origins = "*")
public class AiAnalyticsController {

    @Autowired
    private AiAnalyticsService aiAnalyticsService;

    @GetMapping("/metrics")
    public ResponseEntity<?> getMetrics(
            @RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth,
            @RequestParam(defaultValue = "ALL") String timeframe) {

        if (!AdminSecurityUtil.isValidAdmin(adminAuth)) {
            return ResponseEntity.status(403).body(Map.of("error", "Lỗi bảo mật: Chỉ Admin mới có quyền truy cập chỉ số phân tích AI."));
        }

        AiMetricsDTO metrics = aiAnalyticsService.computeMetrics(timeframe);
        return ResponseEntity.ok(metrics);
    }

    @PostMapping("/analyze")
    public ResponseEntity<?> triggerAnalysis(
            @RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth,
            @RequestBody(required = false) AiAnalysisRequestDTO request) {

        if (!AdminSecurityUtil.isValidAdmin(adminAuth)) {
            return ResponseEntity.status(403).body(Map.of("error", "Lỗi bảo mật: Chỉ Admin mới có quyền kích hoạt phân tích AI."));
        }

        if (request == null) {
            request = new AiAnalysisRequestDTO("ALL", null);
        }

        try {
            AiAnalysisResponseDTO response = aiAnalyticsService.runAnalysis(request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Phân tích AI thất bại: " + e.getMessage()));
        }
    }

    @GetMapping("/reports")
    public ResponseEntity<?> getReports(
            @RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth) {

        if (!AdminSecurityUtil.isValidAdmin(adminAuth)) {
            return ResponseEntity.status(403).body(Map.of("error", "Lỗi bảo mật: Chỉ Admin mới có quyền xem lịch sử báo cáo AI."));
        }

        List<AiAnalysisReportEntity> reports = aiAnalyticsService.getRecentReports();
        return ResponseEntity.ok(reports);
    }

    @GetMapping("/reports/{id}")
    public ResponseEntity<?> getReportDetail(
            @RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth,
            @PathVariable Long id) {

        if (!AdminSecurityUtil.isValidAdmin(adminAuth)) {
            return ResponseEntity.status(403).body(Map.of("error", "Lỗi bảo mật: Quyền truy cập bị từ chối."));
        }

        Optional<AiAnalysisReportEntity> reportOpt = aiAnalyticsService.getReportById(id);
        if (reportOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(reportOpt.get());
    }

    @DeleteMapping("/reports/{id}")
    public ResponseEntity<?> deleteReport(
            @RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth,
            @PathVariable Long id) {

        if (!AdminSecurityUtil.isValidAdmin(adminAuth)) {
            return ResponseEntity.status(403).body(Map.of("error", "Lỗi bảo mật: Quyền truy cập bị từ chối."));
        }

        boolean deleted = aiAnalyticsService.deleteReport(id);
        if (deleted) {
            return ResponseEntity.ok(Map.of("success", true, "message", "Đã xóa báo cáo AI thành công."));
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/config")
    public ResponseEntity<?> getAiConfig(
            @RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth) {

        if (!AdminSecurityUtil.isValidAdmin(adminAuth)) {
            return ResponseEntity.status(403).body(Map.of("error", "Lỗi bảo mật: Quyền truy cập bị từ chối."));
        }

        AiConfigDTO config = aiAnalyticsService.getAiConfig();
        return ResponseEntity.ok(config);
    }

    @PutMapping("/config")
    public ResponseEntity<?> updateAiConfig(
            @RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth,
            @RequestBody AiConfigDTO dto) {

        if (!AdminSecurityUtil.isValidAdmin(adminAuth)) {
            return ResponseEntity.status(403).body(Map.of("error", "Lỗi bảo mật: Quyền truy cập bị từ chối."));
        }

        AiConfigDTO updated = aiAnalyticsService.updateAiConfig(dto);
        return ResponseEntity.ok(updated);
    }
}
