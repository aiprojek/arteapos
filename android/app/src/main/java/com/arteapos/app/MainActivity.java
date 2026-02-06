package com.arteapos.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

// PENTING: Import Plugin class
import com.arteapos.app.BluetoothPrinterPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Mendaftarkan plugin custom sebelum onCreate parent
        registerPlugin(BluetoothPrinterPlugin.class);
        
        super.onCreate(savedInstanceState);
    }
}