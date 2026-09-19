package com.example.demo.service;

import com.example.demo.dto.*;
import com.example.demo.model.*;
import com.example.demo.repository.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AiAnalyticsService {

    private static final Logger logger = LoggerFactory.getLogger(AiAnalyticsService.class);
    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private SystemLogRepository systemLogRepository;

    @Autowired
    private FeedbackRepository feedbackRepository;

    @Autowired
    private DeviceUserRepository deviceUserRepository;

    @Autowired
    private LicenseKeyRepository licenseKeyRepository;

    @Autowired
    private AppRepository appRepository;

    @Autowired
    private SystemConfigRepository systemConfigRepository;

    @Autowired
    private AiAnalysisReportRepository aiAnalysisReportRepository;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Compute comprehensive user behavior & friction metrics based on real database records
     */
    public AiMetricsDTO computeMetrics(String timeframe) {
        String tf = (timeframe == null || timeframe.trim().isEmpty()) ? "ALL" : timeframe.trim().toUpperCase();
        LocalDateTime cutoff = getCutoffDateTime(tf);

        // 1. Orders processing
        List<OrderEntity> allOrders = orderRepository.findAll().stream()
                .filter(o -> o.getCreatedAt() != null && !o.getCreatedAt().isBefore(cutoff))
                .collect(Collectors.toList());

        long totalOrders = allOrders.size();
        long paidOrders = allOrders.stream().filter(o -> "PAID".equalsIgnoreCase(o.getStatus())).count();
        long pendingOrders = allOrders.stream().filter(o -> "PENDING".equalsIgnoreCase(o.getStatus())).count();
        long cancelledOrders = allOrders.stream().filter(o -> "CANCELLED".equalsIgnoreCase(o.getStatus())).count();

        double totalRevenue = allOrders.stream()
                .filter(o -> "PAID".equalsIgnoreCase(o.getStatus()) && o.getAmount() != null)
                .mapToDouble(OrderEntity::getAmount)
                .sum();

        double conversionRate = totalOrders > 0 ? ((double) paidOrders / totalOrders) * 100.0 : 0.0;
        double abandonmentRate = totalOrders > 0 ? ((double) pendingOrders / totalOrders) * 100.0 : 0.0;

        // Group paid orders by app
        Map<String, Long> appPaidMap = allOrders.stream()
                .filter(o -> "PAID".equalsIgnoreCase(o.getStatus()))
                .collect(Collectors.groupingBy(o -> o.getAppName() != null ? o.getAppName() : (o.getAppId() != null ? o.getAppId() : "Khác"), Collectors.counting()));

        List<Map<String, Object>> topAppsPerformance = appPaidMap.entrySet().stream()
                .sorted((e1, e2) -> Long.compare(e2.getValue(), e1.getValue()))
                .limit(5)
                .map(e -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("name", e.getKey());
                    map.put("sales", e.getValue());
                    return map;
                })
                .collect(Collectors.toList());

        // 2. System Logs & Friction Signals
        List<SystemLogEntity> allLogs = systemLogRepository.findAll().stream()
                .filter(l -> l.getCreatedAt() != null && !l.getCreatedAt().isBefore(cutoff))
                .collect(Collectors.toList());

        long totalPageViews = allLogs.stream()
                .filter(l -> l.getAction() != null && l.getAction().contains("PAGE_VIEW"))
                .count();

        long keyStockoutIncidents = allLogs.stream()
                .filter(l -> l.getAction() != null && l.getAction().contains("KEY_OUT_OF_STOCK"))
                .count();

        long lookupNotFoundIncidents = allLogs.stream()
                .filter(l -> l.getAction() != null && l.getAction().contains("LOOKUP_NOT_FOUND"))
                .count();

        long couponFailureIncidents = allLogs.stream()
                .filter(l -> l.getAction() != null && (l.getAction().contains("COUPON_FAIL") || l.getAction().contains("COUPON_INVALID")))
                .count();

        long paymentTimeoutIncidents = allLogs.stream()
                .filter(l -> l.getAction() != null && l.getAction().contains("PAYMENT_TIMEOUT"))
                .count();

        long checkoutAbandonedIncidents = allLogs.stream()
                .filter(l -> l.getAction() != null && (l.getAction().contains("CHECKOUT_ABANDONED") || l.getAction().contains("PAYMENT_CANCEL")))
                .count();

        // Also check actual zero-stock available keys in database right now
        long currentAvailableKeys = licenseKeyRepository.countByStatus("AVAILABLE");
        long currentTotalApps = appRepository.count();

        // 3. Feedbacks & Customer Sentiment
        List<FeedbackEntity> allFeedbacks = feedbackRepository.findAll().stream()
                .filter(f -> f.getCreatedAt() != null && !f.getCreatedAt().isBefore(cutoff))
                .collect(Collectors.toList());

        long totalFeedbacks = allFeedbacks.size();
        double avgRating = allFeedbacks.stream()
                .filter(f -> f.getRating() != null && f.getRating() > 0)
                .mapToInt(FeedbackEntity::getRating)
                .average()
                .orElse(5.0);

        long bugReportsCount = allFeedbacks.stream()
                .filter(f -> "BUG_REPORT".equalsIgnoreCase(f.getCategory()))
                .count();

        long complaintsCount = allFeedbacks.stream()
                .filter(f -> "COMPLAINT".equalsIgnoreCase(f.getCategory()))
                .count();

        long negativeFeedbacksCount = allFeedbacks.stream()
                .filter(f -> f.getRating() != null && f.getRating() <= 2)
                .count();

        List<String> recentComplaints = allFeedbacks.stream()
                .filter(f -> (f.getRating() != null && f.getRating() <= 2) || "BUG_REPORT".equalsIgnoreCase(f.getCategory()) || "COMPLAINT".equalsIgnoreCase(f.getCategory()))
                .limit(5)
                .map(f -> "[" + f.getCategory() + " - " + (f.getRating() != null ? f.getRating() + "★" : "") + "] " + f.getTitle() + ": " + (f.getContent().length() > 80 ? f.getContent().substring(0, 80) + "..." : f.getContent()))
                .collect(Collectors.toList());

        // 4. Devices & Clients
        List<DeviceUserEntity> allDevices = deviceUserRepository.findAll().stream()
                .filter(d -> d.getLastSeenAt() != null && !d.getLastSeenAt().isBefore(cutoff))
                .collect(Collectors.toList());

        long uniqueDevices = allDevices.isEmpty() ? (totalOrders > 0 ? totalOrders : 1) : allDevices.size();
        long mobileDevices = allDevices.stream()
                .filter(d -> d.getUserAgent() != null && (d.getUserAgent().contains("Mobile") || d.getUserAgent().contains("Android") || d.getUserAgent().contains("iPhone")))
                .count();
        long desktopDevices = uniqueDevices - mobileDevices;
        if (desktopDevices < 0) desktopDevices = 0;

        // 5. Calculate UX Health Score (10 to 100)
        int score = 100;

        // Penalty for high abandonment rate
        if (abandonmentRate > 60.0) {
            score -= 22;
        } else if (abandonmentRate > 40.0) {
            score -= 12;
        } else if (abandonmentRate > 20.0) {
            score -= 6;
        }

        // Penalty for out of stock incidents
        score -= (int) Math.min(keyStockoutIncidents * 5, 20);

        // Penalty for lookup failures
        score -= (int) Math.min(lookupNotFoundIncidents * 3, 15);

        // Penalty for bug reports and complaints
        score -= (int) Math.min((bugReportsCount + complaintsCount) * 4, 18);

        // Penalty for low rating
        if (avgRating < 3.5) {
            score -= 15;
        } else if (avgRating < 4.2) {
            score -= 7;
        }

        // Ensure clamped range
        score = Math.max(15, Math.min(100, score));

        String healthStatus = "EXCELLENT";
        if (score < 50) {
            healthStatus = "CRITICAL";
        } else if (score < 70) {
            healthStatus = "NEEDS_ATTENTION";
        } else if (score < 85) {
            healthStatus = "GOOD";
        }

        // Top friction points list
        List<Map<String, Object>> frictionPoints = new ArrayList<>();
        if (abandonmentRate > 30.0 || pendingOrders > 0) {
            Map<String, Object> fp = new HashMap<>();
            fp.put("title", "Đơn hàng thanh toán chưa hoàn tất (Bỏ dở giữa chừng)");
            fp.put("count", pendingOrders);
            fp.put("severity", abandonmentRate > 50 ? "HIGH" : "MEDIUM");
            fp.put("desc", "Có " + pendingOrders + " đơn hàng chưa thanh toán thành công (chiếm " + String.format("%.1f", abandonmentRate) + "% tổng đơn).");
            frictionPoints.add(fp);
        }
        if (keyStockoutIncidents > 0 || currentAvailableKeys == 0) {
            Map<String, Object> fp = new HashMap<>();
            fp.put("title", "Khách hàng gặp tình trạng hết key trong kho");
            fp.put("count", keyStockoutIncidents);
            fp.put("severity", "HIGH");
            fp.put("desc", "Ghi nhận " + keyStockoutIncidents + " lượt người dùng bấm mua nhưng kho hết key khả dụng.");
            frictionPoints.add(fp);
        }
        if (lookupNotFoundIncidents > 0) {
            Map<String, Object> fp = new HashMap<>();
            fp.put("title", "Tra cứu đơn hàng / mã thanh toán không tìm thấy");
            fp.put("count", lookupNotFoundIncidents);
            fp.put("severity", "MEDIUM");
            fp.put("desc", "Có " + lookupNotFoundIncidents + " lượt khách tra cứu không ra kết quả (nhập sai mã hoặc chưa lưu cache).");
            frictionPoints.add(fp);
        }
        if (couponFailureIncidents > 0) {
            Map<String, Object> fp = new HashMap<>();
            fp.put("title", "Áp dụng mã giảm giá thất bại");
            fp.put("count", couponFailureIncidents);
            fp.put("severity", "LOW");
            fp.put("desc", "Có " + couponFailureIncidents + " lần nhập mã giảm giá sai cú pháp hoặc hết hạn.");
            frictionPoints.add(fp);
        }
        if (bugReportsCount + complaintsCount > 0) {
            Map<String, Object> fp = new HashMap<>();
            fp.put("title", "Khiếu nại & Báo lỗi từ khách hàng");
            fp.put("count", bugReportsCount + complaintsCount);
            fp.put("severity", negativeFeedbacksCount > 0 ? "HIGH" : "MEDIUM");
            fp.put("desc", "Ghi nhận " + (bugReportsCount + complaintsCount) + " lượt phản hồi khiếu nại hoặc báo lỗi kỹ thuật.");
            frictionPoints.add(fp);
        }

        return AiMetricsDTO.builder()
                .timeframe(tf)
                .totalPageViews(totalPageViews)
                .uniqueDevices(uniqueDevices)
                .mobileDevices(mobileDevices)
                .desktopDevices(desktopDevices)
                .totalOrders(totalOrders)
                .paidOrders(paidOrders)
                .pendingOrders(pendingOrders)
                .cancelledOrders(cancelledOrders)
                .totalRevenue(totalRevenue)
                .conversionRate(Math.round(conversionRate * 10.0) / 10.0)
                .abandonmentRate(Math.round(abandonmentRate * 10.0) / 10.0)
                .keyStockoutIncidents(keyStockoutIncidents)
                .lookupNotFoundIncidents(lookupNotFoundIncidents)
                .couponFailureIncidents(couponFailureIncidents)
                .paymentTimeoutIncidents(paymentTimeoutIncidents)
                .checkoutAbandonedIncidents(checkoutAbandonedIncidents)
                .totalFeedbacks(totalFeedbacks)
                .avgRating(Math.round(avgRating * 10.0) / 10.0)
                .bugReportsCount(bugReportsCount)
                .complaintsCount(complaintsCount)
                .negativeFeedbacksCount(negativeFeedbacksCount)
                .calculatedUxHealthScore(score)
                .healthStatus(healthStatus)
                .topFrictionPoints(frictionPoints)
                .topAppsPerformance(topAppsPerformance)
                .recentCustomerComplaints(recentComplaints)
                .build();
    }

    /**
     * Run full AI analysis: Calls Google Gemini API if configured; otherwise executes smart built-in heuristic analysis
     */
    @Transactional
    public AiAnalysisResponseDTO runAnalysis(AiAnalysisRequestDTO request) {
        String timeframe = (request != null && request.getTimeframe() != null) ? request.getTimeframe() : "ALL";
        AiMetricsDTO metrics = computeMetrics(timeframe);

        SystemConfigEntity config = systemConfigRepository.findAll().stream().findFirst().orElse(null);
        String apiKey = config != null ? config.getGeminiApiKey() : null;
        if (apiKey == null || apiKey.trim().isEmpty()) {
            apiKey = System.getenv("GEMINI_API_KEY");
        }

        String model = (config != null && config.getAiModel() != null && !config.getAiModel().trim().isEmpty())
                ? config.getAiModel().trim()
                : "gemini-3.5-flash";

        String customPrompt = (config != null && config.getAiCustomPrompt() != null) ? config.getAiCustomPrompt() : "";
        if (request != null && request.getCustomFocus() != null && !request.getCustomFocus().trim().isEmpty()) {
            customPrompt += "\n[Yêu cầu tập trung từ Admin]: " + request.getCustomFocus().trim();
        }

        AiAnalysisResult analysisResult;
        String modelUsed = "Smart-Heuristic-Engine";

        if (apiKey != null && !apiKey.trim().isEmpty()) {
            try {
                logger.info("Calling Google Gemini AI ({}) for user behavior & UX friction analysis...", model);
                analysisResult = callGeminiApi(apiKey.trim(), model, metrics, customPrompt);
                modelUsed = model;
            } catch (Exception e) {
                logger.warn("Google Gemini AI API call failed, falling back to Built-in Smart Heuristic Engine: {}", e.getMessage());
                analysisResult = generateSmartHeuristicAnalysis(metrics, customPrompt);
                modelUsed = "Smart-Heuristic-Fallback";
            }
        } else {
            logger.info("No Gemini API key found. Using Built-in Smart Heuristic Engine.");
            analysisResult = generateSmartHeuristicAnalysis(metrics, customPrompt);
        }

        // Save report to database
        String rawMetricsJson = "";
        try {
            rawMetricsJson = objectMapper.writeValueAsString(metrics);
        } catch (Exception e) {
            logger.warn("Could not serialize raw metrics JSON", e);
        }

        AiAnalysisReportEntity reportEntity = AiAnalysisReportEntity.builder()
                .scope(timeframe)
                .uxHealthScore(metrics.getCalculatedUxHealthScore())
                .healthStatus(metrics.getHealthStatus())
                .summary(analysisResult.summary)
                .userBehaviorAnalysis(analysisResult.userBehavior)
                .painPointsAnalysis(analysisResult.painPoints)
                .recommendations(analysisResult.recommendations)
                .rawMetricsJson(rawMetricsJson)
                .aiModelUsed(modelUsed)
                .createdAt(LocalDateTime.now(VIETNAM_ZONE))
                .build();

        reportEntity = aiAnalysisReportRepository.save(reportEntity);

        return AiAnalysisResponseDTO.builder()
                .reportId(reportEntity.getId())
                .timeframe(timeframe)
                .uxHealthScore(reportEntity.getUxHealthScore())
                .healthStatus(reportEntity.getHealthStatus())
                .summary(reportEntity.getSummary())
                .userBehaviorAnalysis(reportEntity.getUserBehaviorAnalysis())
                .painPointsAnalysis(reportEntity.getPainPointsAnalysis())
                .recommendations(reportEntity.getRecommendations())
                .aiModelUsed(reportEntity.getAiModelUsed())
                .createdAt(reportEntity.getCreatedAt())
                .metrics(metrics)
                .build();
    }

    /**
     * Call Google Gemini API (generateContent)
     */
    private AiAnalysisResult callGeminiApi(String apiKey, String model, AiMetricsDTO metrics, String customPrompt) throws Exception {
        String primaryModel = (model != null && !model.trim().isEmpty()) ? model.trim() : "gemini-3.5-flash";
        String prompt = buildGeminiPrompt(metrics, customPrompt);

        Map<String, Object> textPart = new HashMap<>();
        textPart.put("text", prompt);

        Map<String, Object> contentObj = new HashMap<>();
        contentObj.put("parts", List.of(textPart));

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("contents", List.of(contentObj));

        String cleanKey = (apiKey != null) ? apiKey.trim().replaceAll("^[\"']|[\"']$", "") : "";
        if (cleanKey.startsWith("Bearer ")) cleanKey = cleanKey.substring(7).trim();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-goog-api-key", cleanKey);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        ResponseEntity<String> response = null;
        List<String> modelCandidates = new ArrayList<>();
        modelCandidates.add(primaryModel);
        if (!primaryModel.equals("gemini-3.5-flash")) modelCandidates.add("gemini-3.5-flash");
        if (!primaryModel.equals("gemini-2.0-flash")) modelCandidates.add("gemini-2.0-flash");
        if (!primaryModel.equals("gemini-1.5-flash")) modelCandidates.add("gemini-1.5-flash");

        Exception lastException = null;
        for (String m : modelCandidates) {
            try {
                String encodedKey = URLEncoder.encode(cleanKey, StandardCharsets.UTF_8);
                String url = "https://generativelanguage.googleapis.com/v1beta/models/" + m + ":generateContent?key=" + encodedKey;
                response = restTemplate.postForEntity(url, entity, String.class);
                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                    logger.info("Successfully received Gemini response using model: {}", m);
                    break;
                }
            } catch (Exception ex) {
                lastException = ex;
                logger.warn("Gemini call for model [{}] encountered error: {}. Trying next candidate...", m, ex.getMessage());
            }
        }

        if (response == null || !response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
            throw (lastException != null ? lastException : new RuntimeException("Gemini API call failed."));
        }

        JsonNode root = objectMapper.readTree(response.getBody());
        JsonNode candidates = root.path("candidates");
        if (candidates.isEmpty()) {
            throw new RuntimeException("No candidates returned from Gemini API");
        }

        String rawText = candidates.get(0).path("content").path("parts").get(0).path("text").asText();
        return parseAiResponseSections(rawText, metrics);
    }

    private String buildGeminiPrompt(AiMetricsDTO m, String customPrompt) {
        StringBuilder sb = new StringBuilder();
        sb.append("Bạn là Giám đốc Phân tích Trải nghiệm Người Dùng (Chief UX & Product Analytics Officer) cho hệ thống thương mại bán License Key bản quyền phần mềm và ứng dụng game.\n");
        sb.append("Nhiệm vụ của bạn: Dựa trên số liệu thống kê vận hành thực tế dưới đây, hãy phân tích sâu về HÀNH VI NGƯỜI DÙNG, phát hiện các ĐIỂM NGHẼN/KHÓ KHĂN (PAIN POINTS & FRICTION) mà khách gặp phải, và đưa ra CÁC ĐỀ XUẤT CẢI TIẾN HỆ THỐNG CỤ THỂ theo độ ưu tiên.\n\n");

        sb.append("=== SỐ LIỆU VẬN HÀNH THỰC TẾ (PHẠM VI: ").append(m.getTimeframe()).append(") ===\n");
        sb.append("- Điểm sức khỏe UX: ").append(m.getCalculatedUxHealthScore()).append("/100 (Trạng thái: ").append(m.getHealthStatus()).append(")\n");
        sb.append("- Lưu lượng: ").append(m.getTotalPageViews()).append(" lượt xem, ").append(m.getUniqueDevices()).append(" thiết bị độc nhất (Mobile: ").append(m.getMobileDevices()).append(", Desktop: ").append(m.getDesktopDevices()).append(")\n");
        sb.append("- Đơn hàng & Doanh thu: ").append(m.getTotalOrders()).append(" đơn tạo, ").append(m.getPaidOrders()).append(" đơn thành công (PAID), ").append(m.getPendingOrders()).append(" đơn chưa trả tiền/bỏ dở (PENDING), ").append(m.getCancelledOrders()).append(" đơn hủy.\n");
        sb.append("- Doanh thu ghi nhận: ").append(String.format("%,.0f", m.getTotalRevenue())).append(" VNĐ\n");
        sb.append("- Tỉ lệ hoàn tất (Conversion Rate): ").append(m.getConversionRate()).append("% | Tỉ lệ bỏ dở (Abandonment Rate): ").append(m.getAbandonmentRate()).append("%\n");
        sb.append("- Tín hiệu ma sát/khó khăn:\n");
        sb.append("  + Khách bấm mua khi kho hết key: ").append(m.getKeyStockoutIncidents()).append(" lần\n");
        sb.append("  + Khách tra cứu đơn hàng không tìm thấy: ").append(m.getLookupNotFoundIncidents()).append(" lần\n");
        sb.append("  + Khách áp dụng mã giảm giá thất bại: ").append(m.getCouponFailureIncidents()).append(" lần\n");
        sb.append("  + Đơn hàng quá hạn 15 phút không thanh toán: ").append(m.getPaymentTimeoutIncidents()).append(" lần\n");
        sb.append("- Phản hồi khách hàng: ").append(m.getTotalFeedbacks()).append(" đánh giá, Điểm TB: ").append(m.getAvgRating()).append("/5★ (Báo lỗi: ").append(m.getBugReportsCount()).append(", Khiếu nại: ").append(m.getComplaintsCount()).append(", Đánh giá tiêu cực <= 2★: ").append(m.getNegativeFeedbacksCount()).append(")\n");
        if (m.getRecentCustomerComplaints() != null && !m.getRecentCustomerComplaints().isEmpty()) {
            sb.append("- Trích đoạn phản ánh gần đây của khách: \n");
            for (String c : m.getRecentCustomerComplaints()) {
                sb.append("  * ").append(c).append("\n");
            }
        }
        if (customPrompt != null && !customPrompt.trim().isEmpty()) {
            sb.append("\n=== YÊU CẦU ĐẶC BIỆT TỪ QUẢN TRỊ VIÊN ===\n").append(customPrompt).append("\n");
        }

        sb.append("\n=== QUY ĐỊNH ĐỊNH DẠNG ĐẦU RA (RẤT QUAN TRỌNG) ===\n");
        sb.append("Vui lòng trả về bằng tiếng Việt chuẩn, sử dụng Markdown sinh động với các tiêu đề mục rõ ràng bắt đầu bằng các thẻ sau:\n");
        sb.append("[SECTION_SUMMARY]\n(Viết 1 đoạn tóm tắt điều hành 3-5 câu về tình hình sử dụng và điểm mấu chốt)\n\n");
        sb.append("[SECTION_BEHAVIOR]\n(Phân tích hành vi: Khách hàng vào trang tìm kiếm gì, luồng chuyển đổi từ xem app -> chọn gói -> thanh toán VietQR ra sao, thiết bị mobile vs pc ảnh hưởng thế nào, các sản phẩm bán chạy)\n\n");
        sb.append("[SECTION_PAIN_POINTS]\n(Phân tích sâu các điểm nghẽn & khó khăn: Tại sao khách hàng bỏ dở đơn, vì sao tra cứu không thấy mã, tác động của việc hết key kho, phân tích tâm lý khách hàng qua khiếu nại)\n\n");
        sb.append("[SECTION_RECOMMENDATIONS]\n(Đưa ra các giải pháp cải tiến hệ thống cụ thể, phân nhóm theo 3 cấp độ:\n");
        sb.append("### 🔴 Khẩn Cấp (High Priority)\n### 🟡 Trung Bình (Medium Priority)\n### 🟢 Tiềm Năng (Low Priority)\nMỗi đề xuất cần chỉ rõ: Vấn đề -> Giải pháp kỹ thuật/giao diện -> Hiệu quả dự kiến mang lại)\n");

        return sb.toString();
    }

    /**
     * Smart Built-in Heuristic Analysis (Zero external dependency, runs 100% locally and fast)
     */
    private AiAnalysisResult generateSmartHeuristicAnalysis(AiMetricsDTO m, String customPrompt) {
        StringBuilder summary = new StringBuilder();
        summary.append("Điểm Sức Khỏe Trải Nghiệm (UX Health Score) hiện tại đạt **").append(m.getCalculatedUxHealthScore()).append("/100** (Phân loại: **").append(m.getHealthStatus()).append("**). ");
        if (m.getTotalOrders() > 0) {
            summary.append("Hệ thống ghi nhận **").append(m.getPaidOrders()).append(" giao dịch hoàn tất** trên tổng số **").append(m.getTotalOrders()).append(" đơn hàng**, mang lại doanh thu **").append(String.format("%,.0f", m.getTotalRevenue())).append(" VNĐ**. ");
        } else {
            summary.append("Hiện chưa phát sinh đơn hàng trong phạm vi thời gian này. ");
        }
        if (m.getAbandonmentRate() > 40.0) {
            summary.append("⚠️ Tỉ lệ bỏ dở thanh toán ở mức cao (**").append(m.getAbandonmentRate()).append("%**), đòi hỏi tối ưu quy trình hướng dẫn chuyển khoản và tự động đối soát.");
        } else {
            summary.append("Quy trình thanh toán hoạt động ổn định với tỉ lệ hoàn tất đạt **").append(m.getConversionRate()).append("%**.");
        }

        StringBuilder behavior = new StringBuilder();
        behavior.append("#### 1. Hành Vi & Luồng Di Chuyển Của Người Dùng\n");
        behavior.append("- **Cơ cấu thiết bị truy cập**: Ghi nhận **").append(m.getUniqueDevices()).append(" thiết bị độc nhất**, trong đó người dùng di động (Mobile) chiếm **")
                .append(m.getUniqueDevices() > 0 ? (int)((double)m.getMobileDevices() / m.getUniqueDevices() * 100) : 0).append("%** (")
                .append(m.getMobileDevices()).append(" lượt), máy tính (Desktop) chiếm **").append(m.getDesktopDevices()).append(" lượt**.\n");
        behavior.append("- **Quy trình mua hàng (Conversion Funnel)**: Người dùng chủ yếu vào Catalog ứng dụng để xem chi tiết tính năng MOD, mở modal thanh toán chọn thời hạn (ngày/tháng/vĩnh viễn). Tỉ lệ tạo đơn chuyển đổi thành công đạt **").append(m.getConversionRate()).append("%**.\n");
        if (m.getTopAppsPerformance() != null && !m.getTopAppsPerformance().isEmpty()) {
            behavior.append("- **Sản phẩm dẫn đầu nhu cầu**: ");
            List<String> topList = m.getTopAppsPerformance().stream().map(a -> "**" + a.get("name") + "** (" + a.get("sales") + " lượt bán)").collect(Collectors.toList());
            behavior.append(String.join(", ", topList)).append(".\n");
        }

        StringBuilder painPoints = new StringBuilder();
        painPoints.append("#### 2. Các Khó Khăn & Điểm Nghẽn Trải Nghiệm Phát Hiện (Pain Points)\n");
        if (m.getPendingOrders() > 0) {
            painPoints.append("- ⚠️ **Bỏ dở thanh toán (Checkout Drop-off)**: Có **").append(m.getPendingOrders()).append(" đơn hàng** rơi vào trạng thái chờ (Pending) và quá hạn. Nguyên nhân chính: Khách hàng chưa nắm rõ việc cần chuyển khoản đúng mã nội dung VietQR, hoặc ứng dụng ngân hàng bị ngắt kết nối.\n");
        }
        if (m.getKeyStockoutIncidents() > 0) {
            painPoints.append("- 🚨 **Sự cố hết Key bản quyền trong kho**: Phát hiện **").append(m.getKeyStockoutIncidents()).append(" lượt** người dùng bấm mua nhưng app đã hết key khả dụng. Điều này trực tiếp gây thất thoát doanh thu và giảm niềm tin khách hàng.\n");
        }
        if (m.getLookupNotFoundIncidents() > 0) {
            painPoints.append("- 🔍 **Khó khăn khi tra cứu nhận lại Key**: Ghi nhận **").append(m.getLookupNotFoundIncidents()).append(" lần** tra cứu không tìm thấy đơn hàng. Phần lớn do khách hàng gõ thiếu tiền tố `MK...` hoặc quên lưu mã chuyển khoản sau khi đóng tab thanh toán.\n");
        }
        if (m.getCouponFailureIncidents() > 0) {
            painPoints.append("- 🏷️ **Trở ngại khi dùng mã giảm giá**: **").append(m.getCouponFailureIncidents()).append(" lần** áp dụng thất bại do mã đã hết hạn hoặc không đủ điều kiện tối thiểu.\n");
        }
        if (m.getBugReportsCount() + m.getComplaintsCount() > 0) {
            painPoints.append("- 💬 **Ý kiến phản ánh từ khách hàng**: Có **").append(m.getBugReportsCount() + m.getComplaintsCount()).append(" phản hồi tiêu cực/báo lỗi**. Điểm đánh giá bình quân đạt **").append(m.getAvgRating()).append("/5★**.\n");
        }
        if (painPoints.indexOf("-") == -1) {
            painPoints.append("- ✅ Hiện tại hệ thống vận hành trơn tru, không phát hiện điểm nghẽn hoặc lỗi nghiêm trọng từ phía người dùng.\n");
        }

        StringBuilder rec = new StringBuilder();
        rec.append("#### 3. Kế Hoạch & Đề Xuất Cải Tiến Hệ Thống Phân Tầng Ưu Tiên\n\n");
        rec.append("### 🔴 Khẩn Cấp (High Priority)\n");
        if (m.getKeyStockoutIncidents() > 0) {
            rec.append("1. **Bổ sung kho Key tự động**: Cần nhập thêm License Key cho các ứng dụng đang có lượng xem cao nhưng hết hàng, tránh lãng phí chuyển đổi.\n");
        }
        rec.append("2. **Tối ưu hiển thị mã VietQR PayOS**: Bổ sung nút 'Mở App Ngân Hàng' (Deeplink) nổi bật hơn trên di động để giảm 60% tỉ lệ khách chuyển khoản sai nội dung hoặc gõ nhầm số tiền.\n");

        rec.append("\n### 🟡 Trung Bình (Medium Priority)\n");
        rec.append("1. **Tự động lưu lịch sử đơn hàng vào LocalStorage**: Giúp khách hàng khi quay lại trang web có thể bấm 'Xem đơn hàng vừa mua' ngay lập tức mà không cần nhớ mã `MK...`.\n");
        rec.append("2. **Thêm thông báo đẩy (Toast/Notification) khi hết hạn**: Nhắc nhở người dùng khi đồng hồ đếm ngược 15 phút còn 2 phút để kịp thanh toán.\n");

        rec.append("\n### 🟢 Tiềm Năng (Low Priority)\n");
        rec.append("1. **Chương trình mã giảm giá tự động**: Gợi ý các mã coupon ngay trên giao diện mua hàng cho khách mới để kích cầu mua sắm.\n");
        rec.append("2. **Tối ưu tốc độ tải trang trên mạng 4G/5G**: Nén ảnh banner và ảnh thumbnail catalog ứng dụng để đạt điểm hiệu năng cao nhất.\n");

        AiAnalysisResult res = new AiAnalysisResult();
        res.summary = summary.toString();
        res.userBehavior = behavior.toString();
        res.painPoints = painPoints.toString();
        res.recommendations = rec.toString();
        return res;
    }

    private AiAnalysisResult parseAiResponseSections(String rawText, AiMetricsDTO metrics) {
        AiAnalysisResult result = new AiAnalysisResult();
        if (rawText == null || rawText.trim().isEmpty()) {
            return generateSmartHeuristicAnalysis(metrics, "");
        }

        String summary = "";
        String behavior = "";
        String painPoints = "";
        String recommendations = "";

        if (rawText.contains("[SECTION_SUMMARY]")) {
            String[] parts = rawText.split("\\[SECTION_SUMMARY\\]");
            if (parts.length > 1) {
                String afterSummary = parts[1];
                if (afterSummary.contains("[SECTION_BEHAVIOR]")) {
                    String[] bParts = afterSummary.split("\\[SECTION_BEHAVIOR\\]");
                    summary = bParts[0].trim();
                    if (bParts.length > 1) {
                        String afterBehavior = bParts[1];
                        if (afterBehavior.contains("[SECTION_PAIN_POINTS]")) {
                            String[] pParts = afterBehavior.split("\\[SECTION_PAIN_POINTS\\]");
                            behavior = pParts[0].trim();
                            if (pParts.length > 1) {
                                String afterPain = pParts[1];
                                if (afterPain.contains("[SECTION_RECOMMENDATIONS]")) {
                                    String[] rParts = afterPain.split("\\[SECTION_RECOMMENDATIONS\\]");
                                    painPoints = rParts[0].trim();
                                    recommendations = rParts.length > 1 ? rParts[1].trim() : "";
                                } else {
                                    painPoints = afterPain.trim();
                                }
                            }
                        } else {
                            behavior = afterBehavior.trim();
                        }
                    }
                } else {
                    summary = afterSummary.trim();
                }
            }
        }

        if (summary.isEmpty()) {
            summary = rawText.length() > 300 ? rawText.substring(0, 300) + "..." : rawText;
            recommendations = rawText;
        }

        result.summary = summary;
        result.userBehavior = behavior.isEmpty() ? "Phân tích tự động ghi nhận luồng tương tác người dùng ổn định." : behavior;
        result.painPoints = painPoints.isEmpty() ? "Không ghi nhận điểm nghẽn nghiêm trọng." : painPoints;
        result.recommendations = recommendations.isEmpty() ? rawText : recommendations;
        return result;
    }

    public List<AiAnalysisReportEntity> getRecentReports() {
        return aiAnalysisReportRepository.findAllByOrderByCreatedAtDesc();
    }

    public Optional<AiAnalysisReportEntity> getReportById(Long id) {
        return aiAnalysisReportRepository.findById(id);
    }

    public boolean deleteReport(Long id) {
        if (aiAnalysisReportRepository.existsById(id)) {
            aiAnalysisReportRepository.deleteById(id);
            return true;
        }
        return false;
    }

    public AiConfigDTO getAiConfig() {
        SystemConfigEntity config = systemConfigRepository.findAll().stream().findFirst().orElse(null);
        String rawKey = config != null ? config.getGeminiApiKey() : null;
        if (rawKey == null || rawKey.trim().isEmpty()) {
            rawKey = System.getenv("GEMINI_API_KEY");
        }

        boolean hasKey = rawKey != null && !rawKey.trim().isEmpty();
        String maskedKey = "";
        if (hasKey) {
            String trimmed = rawKey.trim();
            if (trimmed.length() > 8) {
                maskedKey = trimmed.substring(0, 6) + "••••••••" + trimmed.substring(trimmed.length() - 4);
            } else {
                maskedKey = "••••••••";
            }
        }

        String model = config != null && config.getAiModel() != null && !config.getAiModel().trim().isEmpty()
                ? config.getAiModel()
                : "gemini-3.5-flash";

        String prompt = config != null ? config.getAiCustomPrompt() : "";

        return AiConfigDTO.builder()
                .geminiApiKey(maskedKey)
                .hasApiKey(hasKey)
                .aiModel(model)
                .aiCustomPrompt(prompt)
                .activeProvider(hasKey ? "GEMINI_AI" : "BUILTIN_HEURISTIC")
                .build();
    }

    @Transactional
    public AiConfigDTO updateAiConfig(AiConfigDTO dto) {
        SystemConfigEntity config = systemConfigRepository.findAll().stream().findFirst().orElse(null);
        if (config == null) {
            config = new SystemConfigEntity();
        }

        if (dto.getGeminiApiKey() != null) {
            String key = dto.getGeminiApiKey().trim();
            if (!key.contains("••••")) { // Only update if not the masked placeholder
                config.setGeminiApiKey(key);
            }
        }

        if (dto.getAiModel() != null && !dto.getAiModel().trim().isEmpty()) {
            config.setAiModel(dto.getAiModel().trim());
        }

        if (dto.getAiCustomPrompt() != null) {
            config.setAiCustomPrompt(dto.getAiCustomPrompt().trim());
        }

        systemConfigRepository.save(config);
        return getAiConfig();
    }

    public Map<String, Object> testGeminiApiKey(String apiKey, String model) {
        String cleanKey = apiKey != null ? apiKey.trim().replaceAll("^[\"']|[\"']$", "") : "";
        if (cleanKey.startsWith("Bearer ")) cleanKey = cleanKey.substring(7).trim();

        if (cleanKey.isEmpty() || cleanKey.contains("••••")) {
            SystemConfigEntity config = systemConfigRepository.findAll().stream().findFirst().orElse(null);
            if (config != null && config.getGeminiApiKey() != null) {
                cleanKey = config.getGeminiApiKey().trim().replaceAll("^[\"']|[\"']$", "");
            }
        }
        if (cleanKey.isEmpty()) {
            cleanKey = System.getenv("GEMINI_API_KEY");
            if (cleanKey != null) cleanKey = cleanKey.trim().replaceAll("^[\"']|[\"']$", "");
        }
        if (cleanKey == null || cleanKey.isEmpty() || cleanKey.length() < 10) {
            return Map.of("success", false, "message", "API Key không hợp lệ hoặc đang để trống. Vui lòng nhập key lấy từ Google AI Studio.");
        }

        String primaryModel = (model != null && !model.trim().isEmpty()) ? model.trim() : "gemini-3.5-flash";
        List<String> candidates = new ArrayList<>();
        candidates.add(primaryModel);
        if (!primaryModel.equals("gemini-3.5-flash")) candidates.add("gemini-3.5-flash");
        if (!primaryModel.equals("gemini-2.0-flash")) candidates.add("gemini-2.0-flash");
        if (!primaryModel.equals("gemini-1.5-flash")) candidates.add("gemini-1.5-flash");

        Map<String, Object> textPart = Map.of("text", "Trả lời 1 từ duy nhất: OK");
        Map<String, Object> requestBody = Map.of("contents", List.of(Map.of("parts", List.of(textPart))));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-goog-api-key", cleanKey);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        String lastError = "";
        for (String m : candidates) {
            try {
                String encodedKey = URLEncoder.encode(cleanKey, StandardCharsets.UTF_8);
                String url = "https://generativelanguage.googleapis.com/v1beta/models/" + m + ":generateContent?key=" + encodedKey;
                ResponseEntity<String> res = restTemplate.postForEntity(url, entity, String.class);
                if (res.getStatusCode().is2xxSuccessful() && res.getBody() != null) {
                    return Map.of("success", true, "message", "Kết nối Google Gemini thành công với model [" + m + "]! Key hoạt động tốt.", "modelUsed", m);
                }
            } catch (Exception ex) {
                lastError = ex.getMessage();
                logger.warn("Test Gemini key with model [{}] failed: {}", m, lastError);
            }
        }

        if (lastError.contains("unregistered callers") || lastError.contains("without established identity")) {
            return Map.of("success", false, "message", "Google từ chối: API Key chưa kích hoạt Generative Language API hoặc bị giới hạn IP/HTTP referrers trong Google Cloud Console. Hãy tạo API Key mới từ https://aistudio.google.com/app/apikey.");
        } else if (lastError.contains("API key not valid")) {
            return Map.of("success", false, "message", "API Key không hợp lệ. Vui lòng kiểm tra và dán chính xác API Key lấy từ Google AI Studio.");
        }

        return Map.of("success", false, "message", "Không thể kết nối Google Gemini: " + lastError);
    }

    private LocalDateTime getCutoffDateTime(String timeframe) {
        LocalDateTime now = LocalDateTime.now(VIETNAM_ZONE);
        if ("TODAY".equalsIgnoreCase(timeframe)) {
            return now.minusHours(24);
        } else if ("7DAYS".equalsIgnoreCase(timeframe)) {
            return now.minusDays(7);
        } else if ("30DAYS".equalsIgnoreCase(timeframe)) {
            return now.minusDays(30);
        }
        return LocalDateTime.of(2020, 1, 1, 0, 0);
    }

    private static class AiAnalysisResult {
        String summary;
        String userBehavior;
        String painPoints;
        String recommendations;
    }
}
