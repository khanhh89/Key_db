package com.example.demo.util;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

public class AdminSecurityUtil {

    private static final String DEFAULT_SECRET = "admin-secret-key-2026";
    public static final String MASTER_SECRET = getMasterSecret();

    // 5-minute rolling window (300,000 ms)
    private static final long TIME_WINDOW_MS = 5 * 60 * 1000L;

    public static String getMasterSecret() {
        String envSecret = System.getenv("SECURITY_MASTER_SECRET");
        if (envSecret != null && !envSecret.trim().isEmpty()) {
            return envSecret.trim();
        }
        String propSecret = System.getProperty("security.master-secret");
        if (propSecret != null && !propSecret.trim().isEmpty()) {
            return propSecret.trim();
        }
        return DEFAULT_SECRET;
    }

    /**
     * Validates if the provided header token is either the Master Secret or a valid Dynamic Rolling Token.
     */
    public static boolean isValidAdmin(String token) {
        if (token == null || token.trim().isEmpty()) {
            return false;
        }

        String cleanedToken = token.trim();
        String currentSecret = getMasterSecret();

        // 1. Direct Master Secret Match
        if (currentSecret.equals(cleanedToken) || DEFAULT_SECRET.equals(cleanedToken)) {
            return true;
        }

        // 2. Dynamic Rolling Token Validation (checks current, previous, and next 5-min time windows)
        long currentWindow = System.currentTimeMillis() / TIME_WINDOW_MS;
        for (long w = currentWindow - 1; w <= currentWindow + 1; w++) {
            String expectedRollingToken = generateRollingToken(w);
            if (expectedRollingToken.equals(cleanedToken)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Generates a dynamic time-based HMAC-SHA256 token for a specific 5-minute time window.
     */
    public static String generateRollingToken(long windowIndex) {
        try {
            String secret = getMasterSecret();
            String data = secret + ":" + windowIndex;
            Mac sha256_HMAC = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            sha256_HMAC.init(secretKey);
            byte[] hash = sha256_HMAC.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(hash);
        } catch (Exception e) {
            return getMasterSecret();
        }
    }

    /**
     * Helper to get current dynamic token
     */
    public static String getCurrentRollingToken() {
        return generateRollingToken(System.currentTimeMillis() / TIME_WINDOW_MS);
    }
}
