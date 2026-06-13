// ============================================================
// FICHIERS DE CONFIGURATION — Vite + Capacitor + Tailwind
// ============================================================
//
// Référence greenfield (esamba-app/). Pour écrire ces fichiers :
//   npm run greenfield:write-configs -- ./esamba-app
// Sources exécutables : greenfield-config-contents.ts

// ============================================================
// FICHIER 1 : vite.config.ts
// ============================================================

/*
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  base: './',   // Capacitor WebView — chemins relatifs
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor':    ['react','react-dom','react-router-dom'],
          'supabase-vendor': ['@supabase/supabase-js'],
          'ui-vendor':       ['recharts','lucide-react'],
          'query-vendor':    ['@tanstack/react-query'],
        },
      },
    },
  },
  server: {
    port: 3000,
    host: true,   // nécessaire pour Capacitor dev
  },
})
*/

// ============================================================
// FICHIER 2 : capacitor.config.ts
// ============================================================

/*
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
*/

// ============================================================
// FICHIER 3 : tailwind.config.ts
// ============================================================

/*
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        border:      'hsl(var(--border))',
        input:       'hsl(var(--input))',
        ring:        'hsl(var(--ring))',
        background:  'hsl(var(--background))',
        foreground:  'hsl(var(--foreground))',
        primary: {
          DEFAULT:    'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT:    'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT:    'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT:    'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT:    'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        card: {
          DEFAULT:    'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
*/

// ============================================================
// FICHIER 4 : src/index.css  (variables shadcn/ui + Tailwind)
// ============================================================

/*
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background:   0 0% 100%;
    --foreground:   222.2 84% 4.9%;
    --card:         0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover:      0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary:      221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary:    210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted:        210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent:       210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive:  0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border:       214.3 31.8% 91.4%;
    --input:        214.3 31.8% 91.4%;
    --ring:         221.2 83.2% 53.3%;
    --radius:       0.75rem;
  }

  * { @apply border-border; }
  body {
    @apply bg-background text-foreground;
    font-family: 'Inter', sans-serif;
    -webkit-tap-highlight-color: transparent;
    -webkit-font-smoothing: antialiased;
  }

  .safe-top    { padding-top:    env(safe-area-inset-top); }
  .safe-bottom { padding-bottom: env(safe-area-inset-bottom); }
}
*/

// ============================================================
// FICHIER 5 : src/lib/supabase.ts
// Client Supabase unique (web + Capacitor)
// ============================================================

/*
import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY manquantes')
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken:  true,
    persistSession:    true,
    storage:           localStorage,
    storageKey:        'esamba-auth-token',
    flowType:          'pkce',
    detectSessionInUrl: true,
  },
})

export type { User, Session } from '@supabase/supabase-js'
*/

// ============================================================
// FICHIER 6 : .env  (variables Vite — VITE_ prefix obligatoire)
// ============================================================

/*
# Copier en .env et remplir les valeurs
# Supabase
VITE_SUPABASE_URL=https://XXXXXXXX.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# NotchPay
VITE_NOTCHPAY_PUBLIC_KEY=pub_live_...

# Fapshi
VITE_FAPSHI_API_USER=...
VITE_FAPSHI_API_KEY=...

# Firebase
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=e-samba-prod.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=e-samba-prod
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123

# App
VITE_APP_URL=https://e-samba.com
VITE_APP_NAME=E-Samba.com
*/

export {}
