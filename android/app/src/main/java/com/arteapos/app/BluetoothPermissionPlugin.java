
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
            alias = "nearby",
            strings = {
                Manifest.permission.BLUETOOTH_SCAN,
                Manifest.permission.BLUETOOTH_CONNECT
            }
        ),
        @Permission(
            alias = "location",
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
            // Android 12 ke atas: Minta izin Nearby Devices (Scan & Connect)
            if (getPermissionState("nearby") != com.getcapacitor.PermissionState.GRANTED) {
                requestPermissionForAlias("nearby", call, "permissionCallback");
            } else {
                call.resolve();
            }
        } else {
            // Android 11 ke bawah: Minta izin Lokasi
            if (getPermissionState("location") != com.getcapacitor.PermissionState.GRANTED) {
                requestPermissionForAlias("location", call, "permissionCallback");
            } else {
                call.resolve();
            }
        }
    }

    @PermissionCallback
    private void permissionCallback(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 31) {
            if (getPermissionState("nearby") == com.getcapacitor.PermissionState.GRANTED) {
                call.resolve();
            } else {
                call.reject("Permission denied: Nearby Devices required for Android 12+");
            }
        } else {
            if (getPermissionState("location") == com.getcapacitor.PermissionState.GRANTED) {
                call.resolve();
            } else {
                call.reject("Permission denied: Location required for Bluetooth scanning");
            }
        }
    }
}
