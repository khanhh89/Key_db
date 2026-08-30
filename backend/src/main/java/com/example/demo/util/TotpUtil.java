package com.example.demo.util;

import com.warrenstrange.googleauth.GoogleAuthenticator;
import com.warrenstrange.googleauth.GoogleAuthenticatorKey;
import com.warrenstrange.googleauth.GoogleAuthenticatorQRGenerator;

public class TotpUtil {
    private static final GoogleAuthenticator gAuth = new GoogleAuthenticator();

    public static GoogleAuthenticatorKey generateSecret() {
        return gAuth.createCredentials();
    }

    public static String getQrUrl(String issuer, String accountName, GoogleAuthenticatorKey key) {
        return GoogleAuthenticatorQRGenerator.getOtpAuthURL(issuer, accountName, key);
    }

    public static boolean verifyCode(String secret, int code) {
        return gAuth.authorize(secret, code);
    }
}
