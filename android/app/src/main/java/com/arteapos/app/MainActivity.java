package com.arteapos.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

// Import Plugin Custom
import com.arteapos.app.BluetoothPrinterPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // PENTING: Plugin harus didaftarkan di sini agar terbaca oleh Capacitor
        registerPlugin(BluetoothPrinterPlugin.class);
        
        super.onCreate(savedInstanceState);
    }
}