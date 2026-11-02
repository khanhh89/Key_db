package com.example.demo.service;

import com.example.demo.dto.chat.*;
import com.example.demo.model.AppItemEntity;
import com.example.demo.model.OrderEntity;
import com.example.demo.model.PricePresetEntity;
import com.example.demo.model.SystemConfigEntity;
import com.example.demo.repository.AppRepository;
import com.example.demo.repository.LicenseKeyRepository;
import com.example.demo.repository.OrderRepository;
import com.example.demo.repository.PricePresetRepository;
import com.example.demo.repository.SystemConfigRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class AiChatService {

    private static final Logger logger = LoggerFactory.getLogger(AiChatService.class);
    private static final Pattern ORDER_CODE_PATTERN = Pattern.compile("(?i)\\b(?:MK)?(\\d{5,8})\\b|\\b(MK[A-Z0-9]{4,10})\\b");

    @Autowired
    private SystemConfigRepository systemConfigRepository;

    @Autowired
    private AppRepository appRepository;

    @Autowired
    private PricePresetRepository pricePresetRepository;

    @Autowired
    private LicenseKeyRepository licenseKeyRepository;

    @Autowired
    private OrderRepository orderRepository;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    // Simple IP-based rate limiting (max 25 requests per minute)
    private final Map<String, RateLimitTracker> rateLimitMap = new ConcurrentHashMap<>();

    private static class RateLimitTracker {
        long windowStart;
        AtomicInteger count;

        RateLimitTracker(long now) {
            this.windowStart = now;
            this.count = new AtomicInteger(1);
        }
    }

    /**
     * Process an incoming chat message from a customer
     */
    public ChatResponseDTO processMessage(ChatRequestDTO request, String clientIp) {
        // 1. Rate limiting check
        if (isRateLimited(clientIp)) {
            return ChatResponseDTO.builder()
                    .reply("⚠️ Bạn đang gửi tin nhắn hơi nhanh. Vui lòng chờ vài giây rồi thử lại nhé!")
                    .isFallback(true)
                    .modelUsed("RATE_LIMITER")
                    .quickSuggestions(List.of("Bảng giá key", "Hướng dẫn cài đặt iOS", "Lấy key Free"))
                    .build();
        }

        String userMessage = request != null && request.getMessage() != null ? request.getMessage().trim() : "";
        if (userMessage.isEmpty()) {
            return ChatResponseDTO.builder()
                    .reply("Xin chào! Mình có thể giúp gì cho bạn về game mod, cách cài đặt hoặc mua key bản quyền hôm nay?")
                    .isFallback(false)
                    .modelUsed("DEFAULT")
                    .quickSuggestions(getDefaultQuickPrompts())
                    .build();
        }

        SystemConfigEntity config = getSystemConfig();
        boolean chatbotEnabled = config.getChatbotEnabled() == null || Boolean.TRUE.equals(config.getChatbotEnabled());
        if (!chatbotEnabled) {
            return ChatResponseDTO.builder()
                    .reply("Hệ thống Trợ lý ảo hiện đang tạm bảo trì để nâng cấp. Vui lòng liên hệ Admin qua kênh hỗ trợ Zalo/Telegram nhé!")
                    .isFallback(true)
                    .modelUsed("OFFLINE")
                    .build();
        }

        // 2. Scan for Order Code
        OrderEntity detectedOrder = detectOrder(userMessage);

        // 3. Prepare real-time store database context
        List<AppItemEntity> activeApps = appRepository.findAll().stream()
                .filter(a -> !Boolean.TRUE.equals(a.getHidden()))
                .collect(Collectors.toList());
        List<PricePresetEntity> pricePresets = pricePresetRepository.findAll();
        long availableKeysCount = licenseKeyRepository.countByStatus("AVAILABLE");

        // 4. Try Gemini API if key is present
        String apiKey = config.getGeminiApiKey();
        if (apiKey == null || apiKey.trim().isEmpty()) {
            apiKey = System.getenv("GEMINI_API_KEY");
        }

        String primaryModel = config.getAiModel() != null && !config.getAiModel().trim().isEmpty()
                ? config.getAiModel().trim()
                : "gemini-2.5-flash";

        List<ChatActionCardDTO> actionCards = new ArrayList<>();

        if (apiKey != null && !apiKey.trim().isEmpty()) {
            try {
                String reply = callGemini(apiKey.trim(), primaryModel, userMessage, request.getConversationHistory(),
                        config, activeApps, pricePresets, availableKeysCount, detectedOrder);

                actionCards.addAll(detectActionCards(userMessage, reply, activeApps, detectedOrder));

                return ChatResponseDTO.builder()
                        .reply(reply)
                        .actionCards(actionCards)
                        .modelUsed(primaryModel)
                        .isFallback(false)
                        .quickSuggestions(generateQuickSuggestions(userMessage, activeApps))
                        .build();
            } catch (Exception e) {
                logger.warn("Gemini Chat call failed ({}), falling back to Built-in Smart Knowledge Engine: {}",
                        e.getClass().getSimpleName(), e.getMessage());
            }
        }

        // 5. Smart Built-in Fallback Engine
        String fallbackReply = buildSmartFallbackResponse(userMessage, config, activeApps, pricePresets, availableKeysCount, detectedOrder);
        actionCards.addAll(detectActionCards(userMessage, fallbackReply, activeApps, detectedOrder));

        return ChatResponseDTO.builder()
                .reply(fallbackReply)
                .actionCards(actionCards)
                .modelUsed("Smart-Builtin-Engine")
                .isFallback(true)
                .quickSuggestions(generateQuickSuggestions(userMessage, activeApps))
                .build();
    }

    /**
     * Call Google Gemini API with system instructions and chat conversation history
     */
    private String callGemini(String apiKey, String model, String userMessage,
                              List<ChatMessageDTO> history,
                              SystemConfigEntity config,
                              List<AppItemEntity> apps,
                              List<PricePresetEntity> prices,
                              long stockCount,
                              OrderEntity detectedOrder) throws Exception {

        String systemInstruction = buildSystemPrompt(config, apps, prices, stockCount, detectedOrder);

        // List candidates for fallback
        List<String> models = new ArrayList<>();
        if (model != null && !model.isBlank()) models.add(model);
        if (!models.contains("gemini-2.5-flash")) models.add("gemini-2.5-flash");
        if (!models.contains("gemini-2.0-flash")) models.add("gemini-2.0-flash");
        if (!models.contains("gemini-1.5-flash")) models.add("gemini-1.5-flash");

        Exception lastException = null;

        for (String m : models) {
            try {
                String cleanKey = apiKey.replaceAll("^[\"']|[\"']$", "");
                String encodedKey = URLEncoder.encode(cleanKey, StandardCharsets.UTF_8);
                String url = "https://generativelanguage.googleapis.com/v1beta/models/" + m + ":generateContent?key=" + encodedKey;

                Map<String, Object> requestBody = new HashMap<>();

                // System Instruction
                Map<String, Object> sysInstructionMap = new HashMap<>();
                sysInstructionMap.put("parts", List.of(Map.of("text", systemInstruction)));
                requestBody.put("system_instruction", sysInstructionMap);

                // Contents (multi-turn conversation)
                List<Map<String, Object>> contentsList = new ArrayList<>();

                if (history != null && !history.isEmpty()) {
                    // Take last 8 messages for context
                    int startIdx = Math.max(0, history.size() - 8);
                    for (int i = startIdx; i < history.size(); i++) {
                        ChatMessageDTO msg = history.get(i);
                        if (msg.getContent() != null && !msg.getContent().trim().isEmpty()) {
                            String role = "user".equalsIgnoreCase(msg.getRole()) ? "user" : "model";
                            contentsList.add(Map.of(
                                    "role", role,
                                    "parts", List.of(Map.of("text", msg.getContent()))
                            ));
                        }
                    }
                }

                // Add current user message
                contentsList.add(Map.of(
                        "role", "user",
                        "parts", List.of(Map.of("text", userMessage))
                ));

                requestBody.put("contents", contentsList);

                // Generation Config
                Map<String, Object> genConfig = new HashMap<>();
                genConfig.put("temperature", 0.7);
                genConfig.put("maxOutputTokens", 1200);
                requestBody.put("generationConfig", genConfig);

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);

                HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
                ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);

                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                    JsonNode root = objectMapper.readTree(response.getBody());
                    JsonNode candidates = root.path("candidates");
                    if (candidates.isArray() && candidates.size() > 0) {
                        JsonNode textNode = candidates.get(0).path("content").path("parts").get(0).path("text");
                        if (!textNode.isMissingNode()) {
                            return textNode.asText().trim();
                        }
                    }
                }
            } catch (Exception ex) {
                lastException = ex;
                logger.warn("Gemini chat attempt on model [{}] failed: {}. Trying next candidate...", m, ex.getMessage());
            }
        }

        throw (lastException != null ? lastException : new RuntimeException("All Gemini models failed"));
    }

    /**
     * Build rich, up-to-date system instructions containing the store's full database context
     */
    private String buildSystemPrompt(SystemConfigEntity config,
                                     List<AppItemEntity> apps,
                                     List<PricePresetEntity> prices,
                                     long stockCount,
                                     OrderEntity detectedOrder) {
        StringBuilder sb = new StringBuilder();
        String brand = config.getBrandName() != null && !config.getBrandName().isBlank() ? config.getBrandName() : "Shop Game Mod & VIP Key";
        String botName = config.getChatbotBotName() != null && !config.getChatbotBotName().isBlank() ? config.getChatbotBotName() : "Trợ Lý AI " + brand;

        sb.append("Bạn là ").append(botName).append(" - Trợ lý ảo tư vấn bán hàng và hỗ trợ kỹ thuật thông minh 24/7 của ").append(brand).append(".\n");
        sb.append("Phong cách: Thân thiện, nhiệt tình, chuyên nghiệp, ngôn ngữ tự nhiên như game thủ (dùng 'mình' - 'bạn'), hướng dẫn từng bước rõ ràng.\n\n");

        if (config.getChatbotSystemInstruction() != null && !config.getChatbotSystemInstruction().isBlank()) {
            sb.append("CHỈ DẪN ĐẶC BIỆT TỪ ADMIN:\n").append(config.getChatbotSystemInstruction()).append("\n\n");
        }

        sb.append("THÔNG TIN SHOP & KÊNH LIÊN HỆ:\n");
        sb.append("- Tên Shop: ").append(brand).append("\n");
        if (config.getZaloUrl() != null && !config.getZaloUrl().isBlank()) sb.append("- Zalo hỗ trợ: ").append(config.getZaloUrl()).append("\n");
        if (config.getTelegramUrl() != null && !config.getTelegramUrl().isBlank()) sb.append("- Telegram: ").append(config.getTelegramUrl()).append("\n");
        if (config.getFacebookUrl() != null && !config.getFacebookUrl().isBlank()) sb.append("- Fanpage Facebook: ").append(config.getFacebookUrl()).append("\n");
        sb.append("- Kho key khả dụng: ").append(stockCount).append(" key sẵn sàng kích hoạt tức thì.\n\n");

        sb.append("DANH MỤC ỨNG DỤNG & GAME HIỆN CÓ TRÊN HỆ THỐNG:\n");
        for (AppItemEntity app : apps) {
            sb.append("• ").append(app.getName()).append(" (ID: ").append(app.getId()).append(")\n");
            sb.append("  - Mô tả: ").append(app.getSub() != null ? app.getSub() : "").append("\n");
            sb.append("  - Nền tảng: ").append(app.getPlatform() != null ? app.getPlatform() : "Cả iOS & Android").append("\n");
            sb.append("  - Bán Key VIP: ").append(Boolean.TRUE.equals(app.getAllowSellKey()) ? "Có" : "Không").append("\n");
            sb.append("  - Tặng Key Free: ").append(Boolean.TRUE.equals(app.getAllowFreeKey()) ? "Có (vượt link an toàn)" : "Không").append("\n");
            if (app.getNote() != null && !app.getNote().isBlank()) {
                sb.append("  - Ghi chú: ").append(app.getNote()).append("\n");
            }
        }
        sb.append("\n");

        sb.append("BẢNG GIÁ KEY THAM KHẢO:\n");
        NumberFormat nf = NumberFormat.getInstance(new Locale("vi", "VN"));
        for (PricePresetEntity p : prices) {
            sb.append("• ").append(p.getName()).append(" (").append(p.getDurationDays()).append(" ngày): ")
                    .append(nf.format(p.getPrice())).append("đ\n");
        }
        sb.append("\n");

        sb.append("QUY TRÌNH THANH TOÁN & NHẬN KEY VIP:\n");
        sb.append("1. Khách bấm 'Mua Key' trên app muốn mua, chọn gói ngày mong muốn.\n");
        sb.append("2. Nhập Email (tùy chọn) để nhận backup key, có thể nhập mã giảm giá nếu có.\n");
        sb.append("3. Quét mã VietQR trên màn hình bằng bất kỳ app ngân hàng nào (chuyển đúng số tiền và nội dung chuyển khoản MK...).\n");
        sb.append("4. Hệ thống VietQR tự động khớp lệnh trong 5-15 giây, hiển thị Key VIP ngay trên màn hình và gửi qua Email!\n\n");

        sb.append("HƯỚNG DẪN CÀI ĐẶT:\n");
        sb.append("• Cho iOS (iPhone / iPad):\n");
        sb.append("  1. Tải file IPA trực tiếp từ nút Tải IPA trên web.\n");
        sb.append("  2. Cài đặt thông qua Scarlet (trực tiếp trên Safari), TrollStore (vĩnh viễn không thu hồi), hoặc Esign.\n");
        sb.append("  3. Quan trọng: Sau khi cài xong, vào Cài đặt máy -> Cài đặt chung -> Quản lý VPN & Thiết bị -> Bấm Tin cậy chứng chỉ nhà phát triển.\n");
        sb.append("• Cho Android:\n");
        sb.append("  1. Tải file APK về máy.\n");
        sb.append("  2. Bật 'Cho phép cài đặt từ nguồn không xác định' trong Cài đặt bảo mật.\n");
        sb.append("  3. Cài đặt và mở game, cấp quyền 'Xuất hiện trên cùng / Vẽ trên ứng dụng khác' (Overlay) để menu mod hoạt động.\n\n");

        sb.append("HƯỚNG DẪN LẤY KEY FREE:\n");
        sb.append("1. Bấm nút 'Lấy Key Free' ở app hỗ trợ.\n");
        sb.append("2. Làm theo hướng dẫn vượt qua link rút gọn an toàn (thường là tìm mã trên Google theo từ khóa yêu cầu).\n");
        sb.append("3. Nhập mã xác minh vào cổng xác thực -> Hệ thống cấp ngay Key miễn phí dán vào game.\n\n");

        if (detectedOrder != null) {
            sb.append("THÔNG TIN ĐƠN HÀNG KHÁCH HÀNG ĐANG TRA CỨU:\n");
            sb.append("- Mã thanh toán: ").append(detectedOrder.getPaymentCode()).append("\n");
            sb.append("- Ứng dụng: ").append(detectedOrder.getAppName()).append("\n");
            sb.append("- Số tiền: ").append(nf.format(detectedOrder.getAmount())).append("đ\n");
            sb.append("- Thời hạn: ").append(detectedOrder.getDurationDays()).append(" ngày\n");
            sb.append("- Trạng thái: ").append(detectedOrder.getStatus()).append("\n");
            if ("PAID".equalsIgnoreCase(detectedOrder.getStatus())) {
                sb.append("- KEY BẢN QUYỀN ĐÃ GIAO: ").append(detectedOrder.getDeliveredKey()).append("\n");
                sb.append("- Hãy đọc key này cho khách và dặn khách copy dán vào game!\n");
            } else if ("PENDING".equalsIgnoreCase(detectedOrder.getStatus())) {
                sb.append("- Đơn hàng đang chờ thanh toán. Dặn khách quét đúng mã QR hoặc chuyển khoản đúng nội dung: ")
                        .append(detectedOrder.getPaymentCode()).append("\n");
            }
            sb.append("\n");
        }

        sb.append("LƯU Ý QUAN TRỌNG KHI TRẢ LỜI:\n");
        sb.append("- Định dạng Markdown đẹp mắt (dùng gạch đầu dòng, in đậm tên app/bước làm).\n");
        sb.append("- Khi khách hỏi mua key app nào, hãy giới thiệu ngắn gọn các gói giá và nói khách có thể bấm nút mua ngay bên dưới tin nhắn.\n");
        sb.append("- Nếu khách tra cứu mã đơn hàng, hãy kiểm tra và thông báo rõ ràng tình trạng đơn hàng cho khách.\n");

        return sb.toString();
    }

    /**
     * Smart Built-in Fallback Knowledge Engine (Runs when Gemini API is unavailable)
     */
    private String buildSmartFallbackResponse(String query, SystemConfigEntity config,
                                              List<AppItemEntity> apps,
                                              List<PricePresetEntity> prices,
                                              long stockCount,
                                              OrderEntity order) {
        String lower = query.toLowerCase();
        NumberFormat nf = NumberFormat.getInstance(new Locale("vi", "VN"));
        String brand = config.getBrandName() != null ? config.getBrandName() : "Shop";

        // 1. Order Lookup query
        if (order != null) {
            StringBuilder sb = new StringBuilder();
            sb.append("🔍 **Thông tin đơn hàng `").append(order.getPaymentCode()).append("`:**\n\n");
            sb.append("• **Sản phẩm:** ").append(order.getAppName()).append(" (").append(order.getDurationDays()).append(" ngày)\n");
            sb.append("• **Số tiền:** `").append(nf.format(order.getAmount())).append("đ`\n");
            sb.append("• **Trạng thái:** ");
            if ("PAID".equalsIgnoreCase(order.getStatus())) {
                sb.append("✅ **Đã thanh toán thành công**\n\n");
                sb.append("🔑 **Key Bản Quyền của bạn:**\n```\n").append(order.getDeliveredKey()).append("\n```\n");
                sb.append("💡 *Bạn hãy sao chép mã Key trên và dán vào game để kích hoạt nhé!*");
            } else if ("PENDING".equalsIgnoreCase(order.getStatus())) {
                sb.append("⏳ **Đang chờ chuyển khoản thanh toán**\n\n");
                sb.append("👉 Vui lòng chuyển khoản đúng số tiền `").append(nf.format(order.getAmount()))
                        .append("đ` với nội dung chuyển khoản chính xác là: `").append(order.getPaymentCode()).append("`.\n");
                sb.append("Sau 5-15 giây hệ thống VietQR sẽ tự động giao Key cho bạn!");
            } else {
                sb.append("❌ Đã hủy hoặc hết hạn.\nBạn có thể tạo lại đơn hàng mới trên web nhé!");
            }
            return sb.toString();
        }

        // 2. iOS / IPA installation
        if (lower.contains("ios") || lower.contains("ipa") || lower.contains("iphone") || lower.contains("ipad") || lower.contains("scarlet") || lower.contains("trollstore")) {
            return "📱 **Hướng dẫn cài đặt trên iOS (iPhone / iPad):**\n\n" +
                    "1. **Tải file IPA:** Bấm nút **'Tải IPA'** tại App bạn muốn chơi trên web.\n" +
                    "2. **Cài đặt qua các công cụ Sideload:**\n" +
                    "   • **Scarlet:** Mở Safari vào usescarlet.com để cài trực tiếp.\n" +
                    "   • **TrollStore (Khuyên dùng):** Dành cho iOS 14.0 - 16.6.1, vĩnh viễn không lo bị thu hồi chứng chỉ.\n" +
                    "   • **Esign / Gbox:** Ký trực tiếp file IPA bằng chứng chỉ doanh nghiệp.\n" +
                    "3. ⚠️ **Bước quan trọng để mở app:**\n" +
                    "   Vào **Cài đặt** máy ➔ **Cài đặt chung** ➔ **Quản lý VPN & Thiết bị** ➔ Bấm vào tên Chứng chỉ ➔ Chọn **'Tin cậy'**.\n\n" +
                    "Chúc bạn cài đặt thành công! Cần thêm hỗ trợ gì cứ nhắn mình nhé.";
        }

        // 3. Android / APK installation
        if (lower.contains("android") || lower.contains("apk") || lower.contains("samsung") || lower.contains("xiaomi") || lower.contains("oppo")) {
            return "🤖 **Hướng dẫn cài đặt trên Android:**\n\n" +
                    "1. Bấm nút **'Tải Bản Cài'** để tải trực tiếp file APK về máy.\n" +
                    "2. Mở file APK vừa tải -> Nếu máy hỏi, bật **'Cho phép cài đặt từ nguồn này'** (Cài ứng dụng ngoài CH Play).\n" +
                    "3. Sau khi cài xong, mở game lên và cấp quyền **'Hiển thị trên ứng dụng khác'** (Overlay / Vẽ trên màn hình) để menu hiển thị trong trận.\n\n" +
                    "Tất cả file APK của shop đều đã được quét sạch virus & kiểm định chống ban an toàn!";
        }

        // 4. Free Key / Bypass
        if (lower.contains("free") || lower.contains("miễn phí") || lower.contains("bypass") || lower.contains("vượt link") || lower.contains("kẹt")) {
            return "🎁 **Cách lấy Key Miễn Phí (Free Key):**\n\n" +
                    "1. Chọn app có hỗ trợ Key Free trên trang chủ và bấm **'Lấy Key Free'**.\n" +
                    "2. Cổng vượt link sẽ mở ra. Bạn làm theo hướng dẫn (thường là mở Google, tìm từ khóa yêu cầu và cuộn xuống chân trang để lấy mã 6 số).\n" +
                    "3. Dán mã vào trang xác minh ➔ Hệ thống sẽ mở khóa và cấp ngay Key miễn phí cho bạn dán vào game!\n\n" +
                    "💡 *Mẹo: Vượt link hoàn toàn miễn phí 100%, không bắt tải app rác hay đăng ký SMS.*";
        }

        // 5. Prices & Buying
        if (lower.contains("giá") || lower.contains("bao nhiêu") || lower.contains("mua key") || lower.contains("bảng giá") || lower.contains("gói")) {
            StringBuilder sb = new StringBuilder("💎 **Bảng giá Key VIP tại " + brand + ":**\n\n");
            for (PricePresetEntity p : prices) {
                sb.append("• **").append(p.getName()).append("** (").append(p.getDurationDays()).append(" ngày): `")
                        .append(nf.format(p.getPrice())).append("đ`\n");
            }
            sb.append("\n⚡ **Ưu điểm Key VIP:** Kích hoạt lập tức, Full tính năng cao cấp, Tự động giao key 24/7 qua VietQR trong 10 giây, An toàn leo rank!\n\n")
                    .append("Bạn muốn mua cho game nào? Bạn có thể bấm thẳng vào nút **'Mua Key'** của game đó trên web nhé.");
            return sb.toString();
        }

        // 6. Contact Admin
        if (lower.contains("admin") || lower.contains("zalo") || lower.contains("telegram") || lower.contains("liên hệ") || lower.contains("hỗ trợ")) {
            StringBuilder sb = new StringBuilder("📞 **Kênh hỗ trợ chính thức của " + brand + ":**\n\n");
            if (config.getZaloUrl() != null && !config.getZaloUrl().isBlank()) sb.append("• **Zalo:** [Bấm vào đây để chat](").append(config.getZaloUrl()).append(")\n");
            if (config.getTelegramUrl() != null && !config.getTelegramUrl().isBlank()) sb.append("• **Telegram:** [Bấm vào đây để chat](").append(config.getTelegramUrl()).append(")\n");
            if (config.getFacebookUrl() != null && !config.getFacebookUrl().isBlank()) sb.append("• **Fanpage Facebook:** [Truy cập Fanpage](").append(config.getFacebookUrl()).append(")\n");
            sb.append("\nAdmin luôn trực tuyến hỗ trợ nhiệt tình từ 8:00 sáng đến 24:00 đêm!");
            return sb.toString();
        }

        // Default greeting
        return "👋 Xin chào! Mình là **" + (config.getChatbotBotName() != null ? config.getChatbotBotName() : "Trợ Lý AI Shop") + "**.\n\n" +
                "Mình có thể hỗ trợ bạn:\n" +
                "• 🛒 Tư vấn mua key VIP tự động & tra cứu bảng giá\n" +
                "• 📱 Hướng dẫn chi tiết cài đặt iOS (IPA/Scarlet/TrollStore) & Android (APK)\n" +
                "• 🎁 Hướng dẫn lấy Key Free qua cổng vượt link an toàn\n" +
                "• 🔍 Tra cứu trạng thái đơn hàng (bạn chỉ cần gửi mã đơn dạng `MK12345`)\n\n" +
                "Bạn cần hỗ trợ điều gì cứ nhắn cho mình nhé!";
    }

    /**
     * Detect order from message
     */
    private OrderEntity detectOrder(String message) {
        if (message == null) return null;
        Matcher m = ORDER_CODE_PATTERN.matcher(message);
        while (m.find()) {
            String code = m.group();
            // Try paymentCode
            Optional<OrderEntity> opt = orderRepository.findByPaymentCode(code.toUpperCase());
            if (opt.isPresent()) return opt.get();

            // Try with MK prefix if digits only
            if (!code.toUpperCase().startsWith("MK")) {
                Optional<OrderEntity> opt2 = orderRepository.findByPaymentCode("MK" + code);
                if (opt2.isPresent()) return opt2.get();
            }

            // Try by ID
            Optional<OrderEntity> opt3 = orderRepository.findById(code);
            if (opt3.isPresent()) return opt3.get();
        }
        return null;
    }

    /**
     * Generate Action Cards based on conversation context
     */
    private List<ChatActionCardDTO> detectActionCards(String userMsg, String botReply,
                                                     List<AppItemEntity> apps,
                                                     OrderEntity order) {
        List<ChatActionCardDTO> cards = new ArrayList<>();

        // 1. Order Status Card
        if (order != null) {
            NumberFormat nf = NumberFormat.getInstance(new Locale("vi", "VN"));
            cards.add(ChatActionCardDTO.builder()
                    .type("ORDER_STATUS")
                    .title("Đơn Hàng " + order.getPaymentCode())
                    .subtitle(order.getAppName() + " - " + nf.format(order.getAmount()) + "đ (" + order.getStatus() + ")")
                    .appId(order.getAppId())
                    .data(Map.of(
                            "paymentCode", order.getPaymentCode(),
                            "status", order.getStatus(),
                            "appName", order.getAppName() != null ? order.getAppName() : "",
                            "amount", order.getAmount(),
                            "durationDays", order.getDurationDays() != null ? order.getDurationDays() : 0,
                            "deliveredKey", order.getDeliveredKey() != null ? order.getDeliveredKey() : ""
                    ))
                    .build());
        }

        // 2. App Cards
        String combined = (userMsg + " " + botReply).toLowerCase();
        for (AppItemEntity app : apps) {
            String appNameLower = app.getName().toLowerCase();
            String appIdLower = app.getId().toLowerCase();

            if (combined.contains(appNameLower) || combined.contains(appIdLower)) {
                if (Boolean.TRUE.equals(app.getAllowSellKey())) {
                    cards.add(ChatActionCardDTO.builder()
                            .type("APP_BUY")
                            .title(app.getName())
                            .subtitle(app.getSub() != null ? app.getSub() : "Bản quyền VIP")
                            .appId(app.getId())
                            .data(Map.of(
                                    "id", app.getId(),
                                    "name", app.getName(),
                                    "icon", app.getIcon() != null ? app.getIcon() : "⚡",
                                    "platform", app.getPlatform() != null ? app.getPlatform() : "both"
                            ))
                            .build());
                }
                if (Boolean.TRUE.equals(app.getAllowFreeKey()) && !Boolean.TRUE.equals(app.getAllowSellKey())) {
                    cards.add(ChatActionCardDTO.builder()
                            .type("APP_FREE")
                            .title(app.getName())
                            .subtitle("Nhận Key Free qua cổng vượt link")
                            .appId(app.getId())
                            .data(Map.of(
                                    "id", app.getId(),
                                    "name", app.getName()
                            ))
                            .build());
                }
                if (cards.size() >= 3) break; // Limit cards
            }
        }

        return cards;
    }

    private List<String> generateQuickSuggestions(String userMsg, List<AppItemEntity> apps) {
        String lower = userMsg.toLowerCase();
        if (lower.contains("ios") || lower.contains("ipa")) {
            return List.of("Bị lỗi Untrusted Developer?", "Cách cài TrollStore", "Bảng giá key iOS");
        }
        if (lower.contains("giá") || lower.contains("mua")) {
            return List.of("Cách thanh toán VietQR", "Lấy Key Free thế nào?", "Hướng dẫn cài đặt iOS");
        }
        if (lower.contains("free") || lower.contains("bypass")) {
            return List.of("Bảng giá Key VIP", "Link bypass bị lỗi?", "Cài đặt Android APK");
        }
        return getDefaultQuickPrompts();
    }

    public List<String> getDefaultQuickPrompts() {
        return List.of(
                "Bảng giá Key VIP?",
                "Hướng dẫn cài đặt iOS (IPA)?",
                "Cách lấy Key Free?",
                "Kiểm tra đơn hàng"
        );
    }

    /**
     * Get or create system configuration
     */
    public SystemConfigEntity getSystemConfig() {
        return systemConfigRepository.findAll().stream().findFirst()
                .orElseGet(() -> SystemConfigEntity.builder()
                        .brandName("MOD LIÊN QUÂN")
                        .chatbotEnabled(true)
                        .chatbotBotName("Trợ Lý AI Shop")
                        .chatbotWelcomeMessage("Xin chào! Mình là Trợ lý ảo của shop. Mình có thể giúp gì cho bạn hôm nay?")
                        .build());
    }

    /**
     * Get public config for frontend Chatbot Widget
     */
    public AiChatConfigDTO getPublicChatConfig() {
        SystemConfigEntity config = getSystemConfig();
        boolean hasKey = (config.getGeminiApiKey() != null && !config.getGeminiApiKey().isBlank())
                || (System.getenv("GEMINI_API_KEY") != null && !System.getenv("GEMINI_API_KEY").isBlank());

        List<String> quickPrompts = getDefaultQuickPrompts();
        if (config.getChatbotQuickPrompts() != null && !config.getChatbotQuickPrompts().isBlank()) {
            try {
                String[] parts = config.getChatbotQuickPrompts().split("\\r?\\n|,");
                List<String> customList = Arrays.stream(parts)
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .collect(Collectors.toList());
                if (!customList.isEmpty()) quickPrompts = customList;
            } catch (Exception ignored) {}
        }

        return AiChatConfigDTO.builder()
                .enabled(config.getChatbotEnabled() == null || Boolean.TRUE.equals(config.getChatbotEnabled()))
                .botName(config.getChatbotBotName() != null && !config.getChatbotBotName().isBlank() ? config.getChatbotBotName() : "Trợ Lý AI Shop")
                .welcomeMessage(config.getChatbotWelcomeMessage() != null && !config.getChatbotWelcomeMessage().isBlank() ? config.getChatbotWelcomeMessage() : "Xin chào! Mình là Trợ lý ảo AI của shop. Mình có thể giúp gì cho bạn hôm nay?")
                .quickPrompts(quickPrompts)
                .aiModel(config.getAiModel() != null ? config.getAiModel() : "gemini-2.5-flash")
                .hasApiKey(hasKey)
                .build();
    }

    /**
     * Simple rate limiter per client IP
     */
    private boolean isRateLimited(String clientIp) {
        if (clientIp == null || clientIp.isBlank()) return false;
        long now = System.currentTimeMillis();
        RateLimitTracker tracker = rateLimitMap.compute(clientIp, (k, v) -> {
            if (v == null || (now - v.windowStart) > 60000) {
                return new RateLimitTracker(now);
            }
            v.count.incrementAndGet();
            return v;
        });
        return tracker.count.get() > 25; // max 25 msg per minute
    }
}

