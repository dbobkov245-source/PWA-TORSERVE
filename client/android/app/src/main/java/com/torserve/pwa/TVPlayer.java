package com.torserve.pwa;

import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.activity.result.ActivityResult;
import androidx.core.content.FileProvider;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.JSObject;
import java.io.File;
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
            // AND-01: Prevent double chooser and activity stacking
            intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
            intent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);

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
            // AND-01: Prevent double chooser
            intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
            intent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
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

    /**
     * Get the current app version (versionName + versionCode)
     * Used by the auto-updater to compare with remote version.json
     */
    @PluginMethod
    public void getAppVersion(PluginCall call) {
        try {
            PackageInfo pInfo = getContext().getPackageManager()
                    .getPackageInfo(getContext().getPackageName(), 0);
            JSObject result = new JSObject();
            result.put("versionName", pInfo.versionName);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                result.put("versionCode", pInfo.getLongVersionCode());
            } else {
                result.put("versionCode", pInfo.versionCode);
            }
            call.resolve(result);
        } catch (PackageManager.NameNotFoundException e) {
            call.reject("Cannot read package info: " + e.getMessage());
        }
    }

    /**
     * Install an APK file from the given path.
     * Uses FileProvider to expose the file safely (Android 7+).
     * The OS will prompt the user to confirm installation.
     */
    @PluginMethod
    public void installApk(PluginCall call) {
        String path = call.getString("path");
        if (path == null || path.isEmpty()) {
            call.reject("Path is required");
            return;
        }

        // Strip file:// prefix if present
        if (path.startsWith("file://")) {
            path = path.substring(7);
        }

        File file = new File(path);
        if (!file.exists()) {
            call.reject("APK file not found: " + path);
            return;
        }

        try {
            // Android 8+: app-level "install unknown apps" gate can block installer launch.
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
                    !getContext().getPackageManager().canRequestPackageInstalls()) {
                Intent settingsIntent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
                settingsIntent.setData(Uri.parse("package:" + getContext().getPackageName()));
                settingsIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(settingsIntent);
                call.reject("Install permission not granted. Enable 'Install unknown apps' for this app.");
                return;
            }

            Uri contentUri = FileProvider.getUriForFile(
                    getContext(),
                    getContext().getPackageName() + ".fileprovider",
                    file);

            Intent installIntent = new Intent(Intent.ACTION_INSTALL_PACKAGE);
            installIntent.setData(contentUri);
            installIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            installIntent.putExtra(Intent.EXTRA_NOT_UNKNOWN_SOURCE, true);
            installIntent.putExtra(Intent.EXTRA_RETURN_RESULT, true);

            if (installIntent.resolveActivity(getContext().getPackageManager()) != null) {
                getContext().startActivity(installIntent);
                call.resolve();
                return;
            }

            // Fallback for OEMs that don't expose ACTION_INSTALL_PACKAGE
            Intent viewIntent = new Intent(Intent.ACTION_VIEW);
            viewIntent.setDataAndType(contentUri, "application/vnd.android.package-archive");
            viewIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            viewIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            getContext().startActivity(viewIntent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Error installing APK: " + e.getMessage());
        }
    }
}
