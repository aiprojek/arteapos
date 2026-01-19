
package com.arteapos.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Mendaftarkan Plugin Lokal kita
        registerPlugin(BluetoothPermissionPlugin.class);
    }
}
