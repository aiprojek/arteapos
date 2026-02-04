
package com.arteapos.app;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.content.pm.PackageManager;
import android.os.Build;
import android.util.Base64;
import android.util.Log;

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
        @Permission(alias = "bluetooth", strings = {Manifest.permission.BLUETOOTH, Manifest.permission.BLUETOOTH_ADMIN, Manifest.permission.BLUETOOTH_CONNECT, Manifest.permission.BLUETOOTH_SCAN})
    }
)
public class BluetoothPrinterPlugin extends Plugin {

    private static final String TAG = "BluetoothPrinter";
    // Standard Serial Port Profile UUID
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
        if (!checkBluetoothPermission()) {
            call.reject("Izin Bluetooth ditolak.");
            return;
        }

        if (bluetoothAdapter == null || !bluetoothAdapter.isEnabled()) {
            call.reject("Bluetooth mati atau tidak tersedia.");
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
    }

    @PluginMethod
    public void connect(PluginCall call) {
        String address = call.getString("address");
        if (address == null) {
            call.reject("Alamat MAC printer diperlukan.");
            return;
        }

        if (!checkBluetoothPermission()) {
            call.reject("Izin Bluetooth belum diberikan.");
            return;
        }

        // Close existing connection if any
        disconnectInternal();

        try {
            BluetoothDevice device = bluetoothAdapter.getRemoteDevice(address);
            bluetoothSocket = device.createRfcommSocketToServiceRecord(SPP_UUID);
            
            // Cancel discovery as it slows down connection
            bluetoothAdapter.cancelDiscovery();
            
            bluetoothSocket.connect();
            outputStream = bluetoothSocket.getOutputStream();
            
            call.resolve();
        } catch (IOException e) {
            Log.e(TAG, "Connection failed", e);
            disconnectInternal(); // Close socket if open
            call.reject("Gagal terhubung ke printer: " + e.getMessage());
        }
    }

    @PluginMethod
    public void print(PluginCall call) {
        String base64Data = call.getString("data");
        if (base64Data == null || outputStream == null) {
            call.reject("Printer belum terhubung atau data kosong.");
            return;
        }

        try {
            byte[] data = Base64.decode(base64Data, Base64.DEFAULT);
            outputStream.write(data);
            outputStream.flush();
            call.resolve();
        } catch (IOException e) {
            Log.e(TAG, "Print failed", e);
            call.reject("Gagal mengirim data cetak: " + e.getMessage());
        } catch (IllegalArgumentException e) {
            call.reject("Format data base64 salah.");
        }
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        disconnectInternal();
        call.resolve();
    }

    private void disconnectInternal() {
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

    private boolean checkBluetoothPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            return getContext().checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED;
        }
        return true; // Android < 12 permissions handled in manifest
    }
}
