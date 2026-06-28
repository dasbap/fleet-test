package com.esamba.flotte;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;

import android.content.Context;
import android.content.pm.PackageManager;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Test;
import org.junit.runner.RunWith;

/**
 * Tests instrumentés minimaux — lancement et identité package Flotte E-Samba.
 */
@RunWith(AndroidJUnit4.class)
public class FlotteAppInstrumentedTest {

    @Test
    public void packageNameIsFlotteEsamba() {
        Context appContext = InstrumentationRegistry.getInstrumentation().getTargetContext();
        assertEquals("com.esamba.flotte", appContext.getPackageName());
    }

    @Test
    public void mainActivityIsDeclared() throws Exception {
        Context appContext = InstrumentationRegistry.getInstrumentation().getTargetContext();
        PackageManager pm = appContext.getPackageManager();
        assertNotNull(
            pm.getLaunchIntentForPackage("com.esamba.flotte")
        );
    }
}
