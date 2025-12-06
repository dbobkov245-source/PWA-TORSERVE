package com.torserve.pwa;

import android.content.Intent;
import android.net.Uri;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "TVPlayer")
public class TVPlayer extends Plugin {

    @PluginMethod
    public void play(PluginCall call) {
        String url = call.getString("url");
        String packageName = call.getString("package");

        if (url == null) {
            call.reject("URL is required");
            return;
        }

        try {
            // Создаем чистое системное намерение (Intent)
            Intent intent = new Intent(Intent.ACTION_VIEW);
            
            // Жестко задаем тип видео и URL. Это критично для Vimu/VLC.
            intent.setDataAndType(Uri.parse(url), "video/*");
            
            // Если указан пакет (например, Vimu), запускаем конкретно его
            if (packageName != null && !packageName.isEmpty()) {
                intent.setPackage(packageName);
            }

            // Запускаем!
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Error launching player: " + e.getMessage());
        }
    }
}
