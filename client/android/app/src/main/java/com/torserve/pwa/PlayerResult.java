package com.torserve.pwa;

import android.content.Intent;
import android.os.Bundle;

/**
 * Parses what an external player hands back when it closes.
 * Keys and result codes per player (confirmed against Lampa's decompiled handlers):
 * - VLC: "extra_position" / "extra_duration" as long ms.
 * - MX: "position" / "duration" as int ms, "end_by" = user | playback_completion.
 * - Vimu: "position" / "duration" as int ms; result code 1 = playback ended,
 *   usually without any position extras.
 */
final class PlayerResult {
    static final int VIMU_RESULT_ENDED = 1;
    private static final double FINISHED_RATIO = 0.95;

    final long position;
    final long duration;
    final String endBy;
    final boolean finished;

    private PlayerResult(long position, long duration, String endBy, boolean finished) {
        this.position = position;
        this.duration = duration;
        this.endBy = endBy;
        this.finished = finished;
    }

    /**
     * @param requestedPackage the package play() targeted, or null for the system chooser
     * @return null when the player returned nothing usable
     */
    static PlayerResult from(int resultCode, Intent data, String requestedPackage) {
        if (resultCode == VIMU_RESULT_ENDED && isVimu(data, requestedPackage)) {
            long position = data != null ? numberExtra(data, "position") : -1;
            long duration = data != null ? numberExtra(data, "duration") : -1;
            return new PlayerResult(position, duration, "playback_completion", true);
        }
        if (data == null) return null;

        long position;
        long duration;
        if (numberExtra(data, "extra_position") >= 0) {
            position = numberExtra(data, "extra_position");
            duration = numberExtra(data, "extra_duration");
        } else {
            position = numberExtra(data, "position");
            if (position == -1) position = numberExtra(data, "current_position");
            duration = numberExtra(data, "duration");
        }
        String endBy = data.getStringExtra("end_by");

        boolean finished = "playback_completion".equals(endBy)
                || (duration > 0 && position > duration * FINISHED_RATIO);
        return new PlayerResult(position, duration, endBy, finished);
    }

    private static boolean isVimu(Intent data, String requestedPackage) {
        String action = data != null ? data.getAction() : null;
        if (action != null) return action.startsWith("net.gtvbox.");
        return requestedPackage != null && requestedPackage.contains("gtvbox");
    }

    /** Reads an int or long extra; players disagree on the type. -1 when absent. */
    private static long numberExtra(Intent data, String key) {
        Bundle extras = data.getExtras();
        Object value = extras != null ? extras.get(key) : null;
        return value instanceof Number ? ((Number) value).longValue() : -1;
    }
}
