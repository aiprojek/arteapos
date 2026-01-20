
package com.arteapos.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // PENTING: Daftarkan plugin SEBELUM memanggil super.onCreate
        // Ini memastikan plugin tersedia saat Capacitor Bridge dibangun.
        registerPlugin(BluetoothPrinterPlugin.class);
        
        super.onCreate(savedInstanceState);
    }
}
