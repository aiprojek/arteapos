package com.arteapos.app;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.content.pm.PackageManager;
import android.os.Build;
import android.util.Base64;
import android.util.Log;

import androidx.core.app.ActivityCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

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
                Manifest.permission.BLUETOOTH,
                Manifest.permission.BLUETOOTH_ADMIN,
                Manifest.permission.BLUETOOTH_SCAN,
                Manifest.permission.BLUETOOTH_CONNECT
            }
        )
    }
)
public class BluetoothPrinterPlugin extends Plugin {

    private static final String TAG = "BluetoothPrinter";
    // UUID Standar untuk Printer Thermal (SPP)
    private static final UUID SPP_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");

    private BluetoothAdapter bluetoothAdapter;
    private BluetoothSocket bluetoothSocket;
    private OutputStream outputStream;

    @Override
    public void load() {
        bluetoothAdapter = BluetoothAdapter.getDefaultAdapter();
    }

    @PluginMethod
    public void listPairedDevices(PluginCall call) {
        if (!hasRequiredPermissions()) {
            requestPermissionForAlias("bluetooth", call, "listPairedDevicesCallback");
        } else {
            doListPairedDevices(call);
        }
    }

    @PermissionCallback
    private void listPairedDevicesCallback(PluginCall call) {
        if (hasRequiredPermissions()) {
            doListPairedDevices(call);
        } else {
            call.reject("Izin Bluetooth ditolak. Aplikasi butuh izin 'Nearby Devices' di Android 12+.");
        }
    }

    private void doListPairedDevices(PluginCall call) {
        if (bluetoothAdapter == null) {
            call.reject("Perangkat tidak memiliki Bluetooth.");
            return;
        }

        if (!bluetoothAdapter.isEnabled()) {
            call.reject("Bluetooth mati. Mohon nyalakan Bluetooth.");
            return;
        }

        try {
            // Permission check double (untuk linter Android)
            if (ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED && Build.VERSION.SDK_INT >= 31) {
                 call.reject("Izin Connect belum diberikan.");
                 return;
            }

            Set<BluetoothDevice> pairedDevices = bluetoothAdapter.getBondedDevices();
            JSArray devices = new JSArray();

            if (pairedDevices.size() > 0) {
                for (BluetoothDevice device : pairedDevices) {
                    JSObject deviceObj = new JSObject();
                    deviceObj.put("name", device.getName());
                    deviceObj.put("address", device.getAddress());
                    devices.put(deviceObj);
                }
            }

            JSObject ret = new JSObject();
            ret.put("devices", devices);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Gagal scan perangkat: " + e.getMessage());
        }
    }

    @PluginMethod
    public void connect(PluginCall call) {
        if (!hasRequiredPermissions()) {
            requestPermissionForAlias("bluetooth", call, "connectCallback");
        } else {
            doConnect(call);
        }
    }

    @PermissionCallback
    private void connectCallback(PluginCall call) {
        if (hasRequiredPermissions()) {
            doConnect(call);
        } else {
            call.reject("Izin Bluetooth ditolak.");
        }
    }

    private void doConnect(PluginCall call) {
        String address = call.getString("address");
        if (address == null) {
            call.reject("Alamat MAC printer kosong.");
            return;
        }

        try {
            // Tutup koneksi lama jika ada
            closeSocket();

            BluetoothDevice device = bluetoothAdapter.getRemoteDevice(address);
            
            // Cancel discovery agar koneksi lebih cepat
            if (ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.BLUETOOTH_SCAN) == PackageManager.PERMISSION_GRANTED || Build.VERSION.SDK_INT < 31) {
                bluetoothAdapter.cancelDiscovery();
            }

            // Buat socket insecure (kadang lebih kompatibel dengan printer china murah)
            try {
                bluetoothSocket = device.createRfcommSocketToServiceRecord(SPP_UUID);
            } catch (Exception e) {
                 // Fallback method
                 bluetoothSocket = device.createInsecureRfcommSocketToServiceRecord(SPP_UUID);
            }

            if (ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED && Build.VERSION.SDK_INT >= 31) {
                 call.reject("Izin connect ditolak sistem.");
                 return;
            }
            
            bluetoothSocket.connect();
            outputStream = bluetoothSocket.getOutputStream();

            call.resolve();
        } catch (IOException e) {
            closeSocket();
            call.reject("Gagal Konek ke Printer: " + e.getMessage());
        } catch (Exception e) {
            call.reject("Error tidak diketahui: " + e.getMessage());
        }
    }

    @PluginMethod
    public void print(PluginCall call) {
        String base64Data = call.getString("data");
        if (base64Data == null) {
            call.reject("Data cetak kosong.");
            return;
        }
        
        if (outputStream == null || bluetoothSocket == null || !bluetoothSocket.isConnected()) {
            call.reject("Printer belum terhubung. Lakukan koneksi ulang.");
            return;
        }

        try {
            byte[] data = Base64.decode(base64Data, Base64.DEFAULT);
            outputStream.write(data);
            outputStream.flush();
            call.resolve();
        } catch (IOException e) {
            closeSocket();
            call.reject("Gagal kirim data (Koneksi putus): " + e.getMessage());
        }
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        closeSocket();
        call.resolve();
    }

    private void closeSocket() {
        try {
            if (outputStream != null) {
                outputStream.close();
                outputStream = null;
            }
            if (bluetoothSocket != null) {
                bluetoothSocket.close();
                bluetoothSocket = null;
            }
        } catch (IOException e) {
            Log.e(TAG, "Error closing connection", e);
        }
    }

    private boolean hasRequiredPermissions() {
        if (Build.VERSION.SDK_INT >= 31) {
            return getPermissionState("bluetooth") == PermissionState.GRANTED;
        }
        // Untuk Android 11 ke bawah, izin normal diurus oleh Manifest
        return true;
    }
}