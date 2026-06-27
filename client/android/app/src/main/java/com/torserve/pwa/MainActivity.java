package com.torserve.pwa;

import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.os.Build;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String PREFS_NAME = "startup_cache";
    private static final String LAST_CACHE_CLEAR_VERSION_CODE = "last_cache_clear_version_code";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(TVPlayer.class);
        super.onCreate(savedInstanceState);
        clearWebViewCacheAfterUpdate();
    }

    private void clearWebViewCacheAfterUpdate() {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        long currentVersionCode = getCurrentVersionCode();
        long lastClearedVersionCode = prefs.getLong(LAST_CACHE_CLEAR_VERSION_CODE, -1L);

        if (lastClearedVersionCode >= currentVersionCode) {
            return;
        }

        WebView webView = getBridge().getWebView();
        if (webView != null) {
            webView.clearCache(true);
        }

        prefs.edit().putLong(LAST_CACHE_CLEAR_VERSION_CODE, currentVersionCode).apply();
    }

    private long getCurrentVersionCode() {
        try {
            PackageInfo info = getPackageManager().getPackageInfo(getPackageName(), 0);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                return info.getLongVersionCode();
            }
            return info.versionCode;
        } catch (PackageManager.NameNotFoundException e) {
            return -1L;
        }
    }
}
