package com.behaviourchange.backend.security;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

/** Per-instance limits. For multi-instance production use a shared store or gateway limit. */
@Service
public class CoachRateLimiter {
    private static final int MAX_PER_MINUTE = 12;
    private static final int MAX_PER_DAY = 150;
    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();
    private static final class Window { long minute; int minuteCount; long day; int dayCount; }

    public void requireCapacity(String participantId) {
        long now = Instant.now().getEpochSecond();
        Window window = windows.computeIfAbsent(participantId, id -> new Window());
        synchronized (window) {
            long minute = now / 60;
            long day = now / 86400;
            if (window.minute != minute) { window.minute = minute; window.minuteCount = 0; }
            if (window.day != day) { window.day = day; window.dayCount = 0; }
            if (window.minuteCount >= MAX_PER_MINUTE || window.dayCount >= MAX_PER_DAY)
                throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many coaching requests. Please try later.");
            window.minuteCount++;
            window.dayCount++;
        }
    }
}
