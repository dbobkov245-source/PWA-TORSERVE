package com.torserve.pwa;

import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
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
        int position = call.getInt("position", 0); // Resume position

        if (url == null) {
            call.reject("URL is required");
            return;
        }

        try {
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(Uri.parse(url), "video/*");

            if (packageName != null && !packageName.isEmpty()) {
                intent.setPackage(packageName);

                // Common extras for result
                intent.putExtra("return_result", true);

                // Vimu Player extras (net.gtvbox.videoplayer)
                if (packageName.contains("gtvbox")) {
                    intent.putExtra("forcename", title); // Show title instead of URL
                    intent.putExtra("forcedirect", true); // Direct access without buffering
                    if (position > 0)
                        intent.putExtra("startfrom", position); // Resume Vimu
                }

                // MX Player extras (com.mxtech.videoplayer)
                if (packageName.contains("mxtech")) {
                    intent.putExtra("title", title);
                    intent.putExtra("sticky", false);
                    if (position > 0)
                        intent.putExtra("position", position); // Resume MX
                }

                // VLC extras
                if (packageName.contains("videolan")) {
                    intent.putExtra("title", title);
                    if (position > 0)
                        intent.putExtra("from_start", false); // VLC specific?
                    // VLC doesn't support standard position extra well, depends on version
                }
            }

            startActivityForResult(call, intent, "playerResult");
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
        int position = call.getInt("position", 0);

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
            intent.putExtra("return_result", true); // Request result

            if (packageName != null && packageName.contains("gtvbox")) {
                // Vimu playlist format (from Vimu.kt)
                intent.setPackage(packageName);
                intent.setDataAndType(Uri.parse(urls.get(startIndex)),
                        "application/vnd.gtvbox.filelist");
                intent.putExtra("forcename", title);
                intent.putStringArrayListExtra("asusfilelist", urls);
                intent.putStringArrayListExtra("asusnamelist", names);
                intent.putExtra("startindex", startIndex);
                if (position > 0 && startIndex >= 0)
                    intent.putExtra("startfrom", position);
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
                if (position > 0)
                    intent.putExtra("position", position);
            } else {
                // Fallback: play single file from startIndex
                intent.setDataAndType(Uri.parse(urls.get(startIndex)), "video/*");
                if (packageName != null) {
                    intent.setPackage(packageName);
                }
            }

            startActivityForResult(call, intent, "playerResult");
        } catch (Exception e) {
            call.reject("Error launching playlist: " + e.getMessage());
        }
    }

    @ActivityCallback
    private void playerResult(PluginCall call, ActivityResult result) {
        if (call == null)
            return;

        Intent data = result.getData();
        JSObject ret = new JSObject();

        if (data != null) {
            // MX Player / Vimu standard return keys
            int position = data.getIntExtra("position", -1);
            int duration = data.getIntExtra("duration", -1);
            String endBy = data.getStringExtra("end_by"); // user, playback_completion

            // Try distinct known keys if standard fail
            if (position == -1)
                position = data.getIntExtra("current_position", -1);

            ret.put("position", position);
            ret.put("duration", duration);
            ret.put("endBy", endBy);

            // Mark as finished if endBy is completion OR position is near duration (95%)
            boolean finished = "playback_completion".equals(endBy);
            if (!finished && duration > 0 && position > duration * 0.95) {
                finished = true;
            }
            ret.put("finished", finished);
        } else {
            ret.put("position", -1);
            ret.put("message", "No data returned");
        }

        call.resolve(ret);
    }
}
