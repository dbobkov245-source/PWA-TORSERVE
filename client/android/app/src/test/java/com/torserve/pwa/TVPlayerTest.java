package com.torserve.pwa;

import android.content.Intent;
import android.net.Uri;
import com.getcapacitor.PluginCall;
import org.junit.Test;
import org.mockito.MockedConstruction;
import org.mockito.MockedStatic;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertSame;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/** Exercise the real bridge method while intercepting the external activity boundary. */
public class TVPlayerTest {
    private static class CapturingPlayer extends TVPlayer {
        Intent launched;
        PluginCall pending;
        String callback;

        @Override
        public void startActivityForResult(PluginCall call, Intent intent, String callbackName) {
            launched = intent;
            pending = call;
            callback = callbackName;
        }
    }

    @Test
    public void chooserRequestsProgressAndResumeWithoutForcingPackage() {
        verifyPlayback(null);
        verifyPlayback("");
    }

    @Test
    public void explicitPlayersKeepTheirResumeExtras() {
        verifyPlayback("net.gtvbox.videoplayer");
        verifyPlayback("com.mxtech.videoplayer");
        verifyPlayback("org.videolan.vlc");
    }

    private void verifyPlayback(String packageName) {
        PluginCall call = mock(PluginCall.class);
        when(call.getString("url")).thenReturn("http://localhost/stream/movie.mkv");
        when(call.getString("package")).thenReturn(packageName);
        when(call.getString("title", "Video")).thenReturn("Test movie");
        when(call.getInt("position", 0)).thenReturn(600000);
        Uri uri = mock(Uri.class);

        try (MockedStatic<Uri> uris = mockStatic(Uri.class);
             MockedConstruction<Intent> intents = mockConstruction(Intent.class)) {
            uris.when(() -> Uri.parse("http://localhost/stream/movie.mkv")).thenReturn(uri);
            CapturingPlayer player = new CapturingPlayer();
            player.play(call);
            assertEquals(1, intents.constructed().size());
            Intent intent = intents.constructed().get(0);
            assertSame(intent, player.launched);
            assertSame(call, player.pending);
            assertEquals("playerResult", player.callback);
            verify(call, never()).resolve();
            verify(intent).setDataAndType(uri, "video/*");
            verify(intent).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            verify(intent).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
            verify(intent).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
            verify(intent).putExtra("return_result", true);
            boolean chooser = packageName == null || packageName.isEmpty();
            if (chooser) verify(intent, never()).setPackage(anyString());
            else verify(intent).setPackage(packageName);
            if (chooser || packageName.contains("gtvbox")) {
                verify(intent).putExtra("forcename", "Test movie");
                verify(intent).putExtra("forcedirect", true);
                verify(intent).putExtra("startfrom", 600000);
            }
            if (chooser || packageName.contains("mxtech")) {
                verify(intent).putExtra("title", "Test movie");
                verify(intent).putExtra("sticky", false);
                verify(intent).putExtra("position", 600000);
            }
            if (chooser || packageName.contains("videolan")) {
                verify(intent).putExtra("from_start", false);
            }
        }
    }
}
