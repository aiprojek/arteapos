
package com.arteapos.app;

import android.Manifest;
import android.os.Build;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
// import android.bluetooth.*; // Disabled to prevent build errors
// import androidx.core.app.ActivityCompat; // Disabled

@CapacitorPlugin(
    name = "BluetoothPrinter",
    permissions = {
        @Permission(
            alias = "bluetooth",
            strings = {
                // Keep permissions in manifest for Intent safety, but don't use them here to avoid build errors if SDK missing
                Manifest.permission.BLUETOOTH,
                Manifest.permission.BLUETOOTH_ADMIN
            }
        )
    }
)
public class BluetoothPrinterPlugin extends Plugin {

    // private BluetoothAdapter bluetoothAdapter; // Disabled

    @Override
    public void load() {
        // bluetoothAdapter = BluetoothAdapter.getDefaultAdapter(); // Disabled
    }

    @PluginMethod
    public void listPairedDevices(PluginCall call) {
        // Mock Response to prevent crash
        call.reject("Native Bluetooth disabled in this build. Please use Raw Thermal driver.");
    }

    @PluginMethod
    public void connect(PluginCall call) {
        call.reject("Please use Raw Thermal application for connection.");
    }

    @PluginMethod
    public void print(PluginCall call) {
        call.reject("Please use Raw Thermal application for printing.");
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        call.resolve();
    }
}
