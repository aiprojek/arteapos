
package com.arteapos.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Mendaftarkan Plugin Custom kita dengan nama class yang BENAR
        registerPlugin(BluetoothPrinterPlugin.class);
    }
}
