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
public class CoachSessionService {
    private static final long TTL_SECONDS = 8 * 60 * 60; // 8 hours
    private final byte[] secret;
    private final SecureRandom random = new SecureRandom();
    private final Base64.Encoder encoder = Base64.getUrlEncoder().withoutPadding();
    private final Base64.Decoder decoder = Base64.getUrlDecoder();

    public CoachSessionService(@Value("${COACH_TOKEN_SECRET:}") String value) {
        // Fail closed: token issuance/verification is disabled until a secure secret exists.
        secret = value.length() >= 32 ? value.getBytes(StandardCharsets.UTF_8) : null;
    }

    public String issue(String participantId) {
        if (secret == null) return ""; // Legacy login continues to work until coaching is configured.
        long now = Instant.now().getEpochSecond();
        byte[] nonce = new byte[16];
        random.nextBytes(nonce);
        String body = encoder.encodeToString(participantId.getBytes(StandardCharsets.UTF_8))
            + "." + now + "." + (now + TTL_SECONDS) + "." + encoder.encodeToString(nonce);
        return body + "." + sign(body);
    }

    public String requireParticipant(String header) {
        if (secret == null) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Coaching session service unavailable");
        if (header == null || !header.startsWith("Bearer "))
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sign in again to use Pip");
        String token = header.substring(7).trim();
        String[] fields = token.split("\\.", -1);
        if (fields.length != 5 || token.length() > 2048)
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid coaching session");
        try {
            String body = String.join(".", fields[0], fields[1], fields[2], fields[3]);
            byte[] received = decoder.decode(fields[4]);
            byte[] expected = decoder.decode(sign(body));
            if (!MessageDigest.isEqual(received, expected)) throw new IllegalArgumentException("Signature mismatch");
            long issued = Long.parseLong(fields[1]);
            long expiry = Long.parseLong(fields[2]);
            long now = Instant.now().getEpochSecond();
            if (issued > now + 60 || expiry <= now || expiry > issued + TTL_SECONDS)
                throw new IllegalArgumentException("Expired or invalid session");
            String participantId = new String(decoder.decode(fields[0]), StandardCharsets.UTF_8);
            if (!participantId.matches("P-\\d{4,12}")) throw new IllegalArgumentException("Invalid participant");
            return participantId;
        } catch (RuntimeException error) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Coaching session expired or invalid");
        }
    }

    private String sign(String text) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret, "HmacSHA256"));
            return encoder.encodeToString(mac.doFinal(text.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception failure) { throw new IllegalStateException("Cannot sign coaching session", failure); }
    }
}
