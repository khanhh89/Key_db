package com.example.demo.controller;

import com.example.demo.model.SystemConfigEntity;
import com.example.demo.repository.SystemConfigRepository;
import com.example.demo.util.AdminSecurityUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/cloudinary")
@CrossOrigin(origins = "*")
public class CloudinaryController {

    private static final List<String> ALLOWED_CONTENT_TYPES = Arrays.asList(
            "image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"
    );
    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

    @Autowired
    private SystemConfigRepository systemConfigRepository;

    private final RestTemplate restTemplate = new RestTemplate();

    @PostMapping("/upload")
    public ResponseEntity<Map<String, String>> uploadImage(
            @RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth,
            @RequestParam("file") MultipartFile file) {
        Map<String, String> response = new HashMap<>();

        if (!AdminSecurityUtil.isValidAdmin(adminAuth)) {
            response.put("error", "Security Error: Only authenticated Admin can upload image assets.");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
        }

        if (file == null || file.isEmpty()) {
            response.put("error", "File tải lên không được để trống!");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            response.put("error", "Kích thước file tối đa là 5MB!");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase())) {
            response.put("error", "Định dạng file không hợp lệ! Chỉ chấp nhận file hình ảnh (JPG, PNG, WEBP, GIF, SVG).");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        try {
            SystemConfigEntity config = systemConfigRepository.findAll().stream().findFirst().orElse(null);

            String cloudName = (config != null && config.getCloudinaryCloudName() != null && !config.getCloudinaryCloudName().trim().isEmpty())
                    ? config.getCloudinaryCloudName().trim() : "demo";
            String uploadPreset = (config != null && config.getCloudinaryUploadPreset() != null && !config.getCloudinaryUploadPreset().trim().isEmpty())
                    ? config.getCloudinaryUploadPreset().trim() : null;
            String apiKey = (config != null && config.getCloudinaryApiKey() != null && !config.getCloudinaryApiKey().trim().isEmpty())
                    ? config.getCloudinaryApiKey().trim() : null;
            String apiSecret = (config != null && config.getCloudinaryApiSecret() != null && !config.getCloudinaryApiSecret().trim().isEmpty())
                    ? config.getCloudinaryApiSecret().trim() : null;

            String cloudinaryUrl = "https://api.cloudinary.com/v1_1/" + cloudName + "/image/upload";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();

            ByteArrayResource fileResource = new ByteArrayResource(file.getBytes()) {
                @Override
                public String getFilename() {
                    return file.getOriginalFilename() != null ? file.getOriginalFilename() : "upload.jpg";
                }
            };
            body.add("file", fileResource);

            // If API Key and API Secret are configured, use Signed Upload (SHA-1 Signature)
            if (apiKey != null && apiSecret != null) {
                long timestamp = System.currentTimeMillis() / 1000L;
                String stringToSign = "timestamp=" + timestamp + apiSecret;
                String signature = sha1Hex(stringToSign);

                body.add("api_key", apiKey);
                body.add("timestamp", String.valueOf(timestamp));
                body.add("signature", signature);
            } else if (uploadPreset != null) {
                body.add("upload_preset", uploadPreset);
            } else {
                body.add("upload_preset", "docs_upload_example_us_preset");
            }

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);
            @SuppressWarnings("unchecked")
            ResponseEntity<Map<String, Object>> res = restTemplate.postForEntity(cloudinaryUrl, requestEntity, (Class<Map<String, Object>>) (Class<?>) Map.class);

            if (res.getStatusCode() == HttpStatus.OK && res.getBody() != null) {
                Object secureUrl = res.getBody().get("secure_url");
                if (secureUrl != null) {
                    response.put("url", secureUrl.toString());
                    return ResponseEntity.ok(response);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        response.put("error", "Cloudinary upload failed");
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    private String sha1Hex(String input) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-1");
        byte[] result = md.digest(input.getBytes(StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder();
        for (byte b : result) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }
}
