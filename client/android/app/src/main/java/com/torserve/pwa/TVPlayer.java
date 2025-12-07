package com.torserve.pwa;

import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.JSObject;
import java.util.ArrayList;
import org.json.JSONArray;

@CapacitorPlugin(name = "TVPlayer")
public class TVPlayer extends Plugin {

    /**
     * Check if a package (player app) is installed
     */
    @PluginMethod
    public void isPackageInstalled(PluginCall call) {
        String packageName = call.getString("package");
        if (packageName == null) {
            call.reject("Package name required");
            return;
        }
        try {
            getContext().getPackageManager().getPackageInfo(packageName, 0);
            JSObject result = new JSObject();
            result.put("installed", true);
            call.resolve(result);
        } catch (PackageManager.NameNotFoundException e) {
            JSObject result = new JSObject();
            result.put("installed", false);
            call.resolve(result);
        }
    }

    /**
     * Play a single video file with player-specific extras
     * Based on MatriX Vimu.kt and MX.kt implementations
     */
    @PluginMethod
    public void play(PluginCall call) {
        String url = call.getString("url");
        String packageName = call.getString("package");
        String title = call.getString("title", "Video");

        if (url == null) {
            call.reject("URL is required");
            return;
        }

        try {
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(Uri.parse(url), "video/*");

            if (packageName != null && !packageName.isEmpty()) {
                intent.setPackage(packageName);

                // Vimu Player extras (net.gtvbox.videoplayer)
                if (packageName.contains("gtvbox")) {
                    intent.putExtra("forcename", title); // Show title instead of URL
                    intent.putExtra("forcedirect", true); // Direct access without buffering
                    intent.putExtra("forceresume", true); // Resume from last position
                }

                // MX Player extras (com.mxtech.videoplayer)
                if (packageName.contains("mxtech")) {
                    intent.putExtra("title", title);
                    intent.putExtra("sticky", false);
                }
            }

            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Error launching player: " + e.getMessage());
        }
    }

    /**
     * Play a playlist of video files (for series/multi-file torrents)
     * Vimu uses: asusfilelist, asusnamelist, startindex
     * MX uses: video_list, video_list.name
     */
    @PluginMethod
    public void playList(PluginCall call) {
        String packageName = call.getString("package");
        String title = call.getString("title", "Playlist");
        JSONArray urlsJson = call.getArray("urls");
        JSONArray namesJson = call.getArray("names");
        int startIndex = call.getInt("startIndex", 0);

        if (urlsJson == null || urlsJson.length() == 0) {
            call.reject("URLs array is required");
            return;
        }

        try {
            ArrayList<String> urls = new ArrayList<>();
            ArrayList<String> names = new ArrayList<>();

            for (int i = 0; i < urlsJson.length(); i++) {
                urls.add(urlsJson.getString(i));
                names.add(namesJson != null && i < namesJson.length()
                        ? namesJson.getString(i)
                        : "File " + (i + 1));
            }

            Intent intent = new Intent(Intent.ACTION_VIEW);

            if (packageName != null && packageName.contains("gtvbox")) {
                // Vimu playlist format (from Vimu.kt)
                intent.setPackage(packageName);
                intent.setDataAndType(Uri.parse(urls.get(startIndex)),
                        "application/vnd.gtvbox.filelist");
                intent.putExtra("forcename", title);
                intent.putStringArrayListExtra("asusfilelist", urls);
                intent.putStringArrayListExtra("asusnamelist", names);
                intent.putExtra("startindex", startIndex);
            } else if (packageName != null && packageName.contains("mxtech")) {
                // MX Player playlist format (from MX.kt)
                intent.setPackage(packageName);
                intent.setDataAndType(Uri.parse(urls.get(startIndex)), "video/*");
                intent.putExtra("title", title);
                Uri[] uriArray = new Uri[urls.size()];
                for (int i = 0; i < urls.size(); i++) {
                    uriArray[i] = Uri.parse(urls.get(i));
                }
                intent.putExtra("video_list", uriArray);
                intent.putExtra("video_list.name", names.toArray(new String[0]));
                intent.putExtra("video_list.filename", names.toArray(new String[0]));
                intent.putExtra("video_list_is_explicit", true);
            } else {
                // Fallback: play single file from startIndex
                intent.setDataAndType(Uri.parse(urls.get(startIndex)), "video/*");
                if (packageName != null) {
                    intent.setPackage(packageName);
                }
            }

            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Error launching playlist: " + e.getMessage());
        }
    }
}
