import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId:     'com.esamba.app',
  appName:   'E-Samba',
  webDir:    'dist',
  bundledWebRuntime: false,

  server: {
    // En développement : pointer vers le serveur Vite local
    // À commenter pour la production
    // url: 'http://192.168.1.X:3000',
    // cleartext: true,
  },

  android: {
    buildOptions: {
      keystorePath:    'esamba-release.keystore',
      keystoreAlias:   'esamba',
    },
    backgroundColor: '#ffffff',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false, // true en dev
  },

  ios: {
    contentInset: 'automatic',
    scrollEnabled: false,
    backgroundColor: '#ffffff',
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#1d4ed8',  // blue-700
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ['badge','sound','alert'],
    },
    FirebaseMessaging: {
      presentationOptions: ['badge','sound','alert'],
    },
  },
}

export default config
