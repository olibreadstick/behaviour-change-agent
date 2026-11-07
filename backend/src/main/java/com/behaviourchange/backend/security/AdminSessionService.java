package com.behaviourchange.backend.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;

@Service
public class AdminSessionService {
    private static final long TTL_SECONDS = 8 * 60 * 60;
    private final byte[] key;
    private final SecureRandom random = new SecureRandom();
    private final Base64.Encoder encoder = Base64.getUrlEncoder().withoutPadding();
    private final Base64.Decoder decoder = Base64.getUrlDecoder();

    public AdminSessionService(@Value("${COACH_TOKEN_SECRET:}") String secret) {
        // Domain-separated key: participant signatures cannot authenticate as administrators.
        key = secret.length() >= 32 ? derive(secret) : null;
    }

    private byte[] derive(String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return mac.doFinal("behaviour-change-admin-session-v1".getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) { throw new IllegalStateException("Unable to configure admin authentication", e); }
    }

    public String issue(String username) {
        if (key == null) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Administrator sessions unavailable");
        long issued = Instant.now().getEpochSecond();
        byte[] nonce = new byte[16];
        random.nextBytes(nonce);
        String body = "admin." + encoder.encodeToString(username.getBytes(StandardCharsets.UTF_8))
            + "." + issued + "." + (issued + TTL_SECONDS) + "." + encoder.encodeToString(nonce);
        return body + "." + sign(body);
    }

    public String requireAdmin(String authorization) {
        if (key == null) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Administrator sessions unavailable");
        if (authorization == null || !authorization.startsWith("Bearer "))
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Administrator sign in required");
        String token = authorization.substring(7).trim();
        if (token.length() > 2048) throw unauthorized();
        String[] fields = token.split("\\.", -1);
        if (fields.length != 6 || !"admin".equals(fields[0])) throw unauthorized();
        try {
            String body = String.join(".", fields[0], fields[1], fields[2], fields[3], fields[4]);
            if (!MessageDigest.isEqual(decoder.decode(fields[5]), decoder.decode(sign(body)))) throw new IllegalArgumentException();
            long issued = Long.parseLong(fields[2]);
            long expires = Long.parseLong(fields[3]);
            long now = Instant.now().getEpochSecond();
            if (issued > now + 60 || expires <= now || expires > issued + TTL_SECONDS) throw new IllegalArgumentException();
            String username = new String(decoder.decode(fields[1]), StandardCharsets.UTF_8);
            if (username.isBlank() || username.length() > 255) throw new IllegalArgumentException();
            return username;
        } catch (RuntimeException ex) { throw unauthorized(); }
    }

    private ResponseStatusException unauthorized() {
        return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Administrator session expired or invalid");
    }
    private String sign(String body) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(key, "HmacSHA256"));
            return encoder.encodeToString(mac.doFinal(body.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) { throw new IllegalStateException("Cannot sign administrator session", e); }
    }
}
