import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.danguyuzhe.app",
  appName: "荡游者",
  webDir: "dist/public",
  server: {
    // For development: point to the Replit dev server
    // Remove this block for production APK build
    // url: "http://localhost:5000",
    // cleartext: true,
    androidScheme: "https",
  },
  android: {
    buildOptions: {
      keystorePath: undefined,  // set when signing for release
    },
    minSdkVersion: 22,
    targetSdkVersion: 34,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: "#e8f5f4",
      showSpinner: false,
    },
  },
};

export default config;
