package com.torserve.pwa;

import android.content.Intent;
import android.os.Bundle;
import org.junit.Test;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;
import static org.mockito.Mockito.*;

/** Result keys and codes as shipped by the players (confirmed against Lampa's decompiled handlers). */
public class PlayerResultTest {
    private static final int RESULT_OK = -1;
    private static final int RESULT_CANCELED = 0;
    private static final int VIMU_RESULT_ENDED = 1;

    private Intent resultIntent(String action, Object... keyValues) {
        Intent intent = mock(Intent.class);
        Bundle extras = mock(Bundle.class);
        when(intent.getAction()).thenReturn(action);
        when(intent.getExtras()).thenReturn(extras);
        for (int i = 0; i < keyValues.length; i += 2) {
            String key = (String) keyValues[i];
            Object value = keyValues[i + 1];
            when(extras.get(key)).thenReturn(value);
            if (value instanceof String) when(intent.getStringExtra(key)).thenReturn((String) value);
        }
        return intent;
    }

    @Test
    public void vlcReportsLongExtraPositionAndDuration() {
        Intent data = resultIntent("org.videolan.vlc.player.result",
                "extra_position", 1_200_000L, "extra_duration", 5_400_000L);

        PlayerResult result = PlayerResult.from(RESULT_OK, data, "org.videolan.vlc");

        assertEquals(1_200_000L, result.position);
        assertEquals(5_400_000L, result.duration);
        assertFalse(result.finished);
    }

    @Test
    public void vlcNearTheEndCountsAsFinished() {
        Intent data = resultIntent("org.videolan.vlc.player.result",
                "extra_position", 5_200_000L, "extra_duration", 5_400_000L);

        assertTrue(PlayerResult.from(RESULT_OK, data, "org.videolan.vlc").finished);
    }

    @Test
    public void vimuEndedResultCodeMeansFinishedEvenWithoutExtras() {
        Intent data = resultIntent("net.gtvbox.videoplayer.result");

        PlayerResult result = PlayerResult.from(VIMU_RESULT_ENDED, data, "net.gtvbox.videoplayer");

        assertTrue(result.finished);
        assertEquals("playback_completion", result.endBy);
    }

    @Test
    public void vimuEndedWithoutResultIntentStillFinishesWhenVimuWasRequested() {
        PlayerResult result = PlayerResult.from(VIMU_RESULT_ENDED, null, "net.gtvbox.vimuhd");

        assertTrue(result.finished);
    }

    @Test
    public void vimuEndedIsRecognisedFromTheResultActionWhenChosenViaChooser() {
        Intent data = resultIntent("net.gtvbox.vimuhd.result");

        assertTrue(PlayerResult.from(VIMU_RESULT_ENDED, data, null).finished);
    }

    @Test
    public void resultCodeOneFromOtherPlayersIsNotTreatedAsCompletion() {
        // MX Player uses result code 1 for "stopped by unknown error".
        Intent data = resultIntent("com.mxtech.intent.result.VIEW");

        assertFalse(PlayerResult.from(VIMU_RESULT_ENDED, data, "com.mxtech.videoplayer.ad").finished);
    }

    @Test
    public void vimuStoppedByUserKeepsIntPosition() {
        Intent data = resultIntent("net.gtvbox.videoplayer.result",
                "position", 600_000, "duration", 5_400_000);

        PlayerResult result = PlayerResult.from(RESULT_CANCELED, data, "net.gtvbox.videoplayer");

        assertEquals(600_000L, result.position);
        assertEquals(5_400_000L, result.duration);
        assertFalse(result.finished);
    }

    @Test
    public void mxPlaybackCompletionIsFinished() {
        Intent data = resultIntent("com.mxtech.intent.result.VIEW",
                "end_by", "playback_completion", "position", 0, "duration", 5_400_000);

        PlayerResult result = PlayerResult.from(RESULT_OK, data, "com.mxtech.videoplayer.ad");

        assertTrue(result.finished);
        assertEquals("playback_completion", result.endBy);
    }

    @Test
    public void fallsBackToCurrentPositionKey() {
        Intent data = resultIntent(null, "current_position", 42_000, "duration", 100_000);

        assertEquals(42_000L, PlayerResult.from(RESULT_OK, data, null).position);
    }

    @Test
    public void noDataAndNoKnownCompletionYieldsNothing() {
        assertNull(PlayerResult.from(RESULT_CANCELED, null, "org.videolan.vlc"));
        assertNull(PlayerResult.from(VIMU_RESULT_ENDED, null, null));
    }
}
