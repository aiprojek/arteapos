
package com.arteapos.app;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.os.Build;
import android.util.Base64;
import android.util.Log;

// PENTING: Gunakan import ini untuk Capacitor 3/4/5/6
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

import java.io.IOException;
import java.io.OutputStream;
import java.util.Set;
import java.util.UUID;

@CapacitorPlugin(
    name = "BluetoothPrinter",
    permissions = {
        @Permission(
            alias = "bluetooth",
            strings = {
                Manifest.permission.BLUETOOTH_CONNECT,
                Manifest.permission.BLUETOOTH_SCAN
            }
        )
    }
)
public class BluetoothPrinterPlugin extends Plugin {

    private static final String TAG = "BluetoothPrinter";
    private static final UUID SPP_UUID = UUID.fromString("00001101-0000-1000-8000-00805f9b34fb");
    
    private BluetoothAdapter bluetoothAdapter;
    private BluetoothSocket socket;
    private OutputStream outputStream;

    @Override
    public void load() {
        try {
            bluetoothAdapter = BluetoothAdapter.getDefaultAdapter();
            Log.d(TAG, "BluetoothPrinterPlugin loaded. Adapter found: " + (bluetoothAdapter != null));
        } catch (Exception e) {
            Log.e(TAG, "Error initializing Bluetooth adapter", e);
        }
    }

    @PluginMethod
    public void listPairedDevices(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 31) {
            if (getPermissionState("bluetooth") != com.getcapacitor.PermissionState.GRANTED) {
                requestPermissionForAlias("bluetooth", call, "listPairedDevicesCallback");
                return;
            }
        }
        doListDevices(call);
    }

    @PluginMethod
    public void listPairedDevicesCallback(PluginCall call) {
        if (getPermissionState("bluetooth") == com.getcapacitor.PermissionState.GRANTED) {
            doListDevices(call);
        } else {
            call.reject("Izin Bluetooth ditolak. Mohon izinkan 'Nearby Devices' di pengaturan.");
        }
    }

    private void doListDevices(PluginCall call) {
        if (bluetoothAdapter == null) {
            call.reject("Bluetooth tidak tersedia di perangkat ini.");
            return;
        }

        if (!bluetoothAdapter.isEnabled()) {
            call.reject("Bluetooth mati. Mohon nyalakan Bluetooth.");
            return;
        }

        try {
            Set<BluetoothDevice> pairedDevices = bluetoothAdapter.getBondedDevices();
            JSArray devicesArray = new JSArray();

            if (pairedDevices != null && pairedDevices.size() > 0) {
                for (BluetoothDevice device : pairedDevices) {
                    JSObject deviceObj = new JSObject();
                    deviceObj.put("name", device.getName());
                    deviceObj.put("address", device.getAddress());
                    devicesArray.put(deviceObj);
                }
            }
            
            JSObject ret = new JSObject();
            ret.put("devices", devicesArray);
            call.resolve(ret);
        } catch (SecurityException e) {
            call.reject("Security Exception: " + e.getMessage());
        } catch (Exception e) {
            call.reject("Error listing devices: " + e.getMessage());
        }
    }

    @PluginMethod
    public void connect(PluginCall call) {
        String address = call.getString("address");
        if (address == null) {
            call.reject("Alamat MAC address kosong.");
            return;
        }

        if (bluetoothAdapter == null) {
            call.reject("Bluetooth Adapter error.");
            return;
        }

        disconnectInternal();

        try {
            BluetoothDevice device = bluetoothAdapter.getRemoteDevice(address);
            socket = device.createRfcommSocketToServiceRecord(SPP_UUID);
            socket.connect();
            outputStream = socket.getOutputStream();
            call.resolve();
        } catch (IOException e) {
            disconnectInternal();
            call.reject("Gagal terhubung ke printer. Pastikan printer nyala dan dekat.");
        } catch (SecurityException e) {
            call.reject("Izin Bluetooth ditolak saat koneksi.");
        } catch (Exception e) {
            call.reject("Error koneksi: " + e.getMessage());
        }
    }

    @PluginMethod
    public void print(PluginCall call) {
        if (socket == null || outputStream == null || !socket.isConnected()) {
            call.reject("Printer belum terhubung.");
            return;
        }

        String data = call.getString("data");
        String type = call.getString("type", "text"); 

        if (data == null) {
            call.reject("Data cetak kosong.");
            return;
        }

        try {
            byte[] bytes;
            if ("base64".equals(type)) {
                bytes = Base64.decode(data, Base64.DEFAULT);
            } else {
                bytes = data.getBytes("UTF-8");
            }
            
            outputStream.write(bytes);
            outputStream.flush();
            call.resolve();
        } catch (Exception e) {
            call.reject("Gagal mencetak: " + e.getMessage());
            disconnectInternal();
        }
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        disconnectInternal();
        call.resolve();
    }

    private void disconnectInternal() {
        try {
            if (outputStream != null) outputStream.close();
            if (socket != null) socket.close();
        } catch (Exception e) { }
        outputStream = null;
        socket = null;
    }
}
