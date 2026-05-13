import 'dotenv/config';

export default {
  "expo": {
    "name": "ArticulateMobile",
    "slug": "ArticulateMobile",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      }
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      "expo-router"
    ],
    "scheme": "articulatemobile",
    "extra": {
      "eas": {
        "projectId": "your-eas-project-id" // Можно оставить или удалить
      }
    },
    "updates": {
      "url": "https://u.expo.dev/your-eas-project-id" // Можно оставить или удалить
    },
    "runtimeVersion": {
      "policy": "appVersion"
    },
    "jsEngine": "hermes",
    // Здесь мы прокидываем ENV переменную
    "extra": {
      "EXPO_PUBLIC_GROQ_API_KEY": process.env.EXPO_PUBLIC_GROQ_API_KEY
    }
  }
}
