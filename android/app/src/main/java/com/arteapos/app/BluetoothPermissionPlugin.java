
package com.arteapos.app;

import android.Manifest;
import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "BluetoothPermission",
    permissions = {
        @Permission(
            alias = "combined", 
            strings = {
                // Di Android 12+ (SDK 31), kita minta SEMUANYA.
                // SCAN & CONNECT untuk akses OS baru.
                // LOCATION untuk memuaskan plugin lama yang punya hardcode check lokasi.
                Manifest.permission.BLUETOOTH_SCAN,
                Manifest.permission.BLUETOOTH_CONNECT,
                Manifest.permission.ACCESS_FINE_LOCATION
            }
        ),
        @Permission(
            alias = "location_only",
            strings = {
                Manifest.permission.ACCESS_FINE_LOCATION
            }
        )
    }
)
public class BluetoothPermissionPlugin extends Plugin {

    @PluginMethod
    public void request(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 31) {
            // Android 12+: Minta paket lengkap (Bluetooth + Lokasi)
            if (getPermissionState("combined") != com.getcapacitor.PermissionState.GRANTED) {
                requestPermissionForAlias("combined", call, "permissionCallback");
            } else {
                call.resolve();
            }
        } else {
            // Android 11-: Cukup Lokasi
            if (getPermissionState("location_only") != com.getcapacitor.PermissionState.GRANTED) {
                requestPermissionForAlias("location_only", call, "permissionCallback");
            } else {
                call.resolve();
            }
        }
    }

    @PermissionCallback
    private void permissionCallback(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 31) {
            // Cek apakah 'combined' permissions disetujui
            if (getPermissionState("combined") == com.getcapacitor.PermissionState.GRANTED) {
                call.resolve();
            } else {
                // Jangan reject dulu, karena kadang user menolak lokasi tapi menerima bluetooth (atau sebaliknya).
                // Kita biarkan resolve agar plugin printer mencoba scan (best effort).
                // Jika gagal, error asli plugin printer akan muncul di UI.
                call.resolve(); 
            }
        } else {
            if (getPermissionState("location_only") == com.getcapacitor.PermissionState.GRANTED) {
                call.resolve();
            } else {
                call.reject("Izin Lokasi (Wajib untuk Bluetooth Android Lama) ditolak.");
            }
        }
    }
}
