import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mysplitwise.app',
  appName: 'mysplitwise',
  webDir: 'public',
  // The app talks to our live Vercel-hosted backend (auth, admin API, etc.),
  // so the native shell loads the real site rather than a bundled static copy.
  server: {
    url: 'https://mysplitwise.com',
    cleartext: false,
  },
  ios: {
    contentInset: 'automatic',
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
