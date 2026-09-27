# SafetyApp - Project Documentation

Welcome to **SafetyApp**, a personal safety and emergency alert system. This repository contains both the mobile client application and the backend API server.

---

## 📂 Repository Overview

```
SafetyApp/
├── backend/                  # Express & MongoDB backend API server
└── mobile-app/               # Expo & React Native mobile client application
```

---

## 📁 Detailed Folder Structure

### 1. `backend/` (Node.js / Express API Server)

The `backend` directory contains the server-side REST API built with Node.js, Express 5, and Mongoose for MongoDB data persistence.

```
backend/
├── src/                      # Source code directory for modular server logic
│   ├── config/               # Database and environment configurations (recommended)
│   ├── controllers/          # Route controller handlers (logic per endpoint)
│   ├── middlewares/          # Custom Express middlewares (auth, error handler, etc.)
│   ├── models/               # Mongoose schemas & data models (User, EmergencyAlert, etc.)
│   ├── routes/               # Express API route declarations
│   └── services/             # Business logic and external service integrations
├── .gitignore                # Git ignore rules for node_modules and .env files
├── index.js                  # Main server entry point (Express app initialization)
├── package.json              # Backend package manifest and npm scripts
└── package-lock.json         # Dependency lock file
```

#### 🛠️ Tech Stack & Key Dependencies
- **Runtime & Framework:** Node.js (ES Modules `"type": "module"`), Express (`v5.2.1`)
- **Database:** MongoDB via Mongoose (`v9.10.2`)
- **Security & Authentication:** `bcrypt` (`v6.0.0`) for password hashing, `cors` (`v2.8.6`)
- **Utilities:** `axios` (`v1.20.0`) for HTTP requests, `dotenv` (`v18.0.4`) for environment variable management
- **Development Tooling:** `nodemon` (`v3.1.14`) for live reloading during development

#### 🚀 Getting Started (Backend)
```bash
cd backend
npm install
npm run dev      # Start dev server with nodemon
# or
npm start        # Start production server
```

---

### 2. `mobile-app/` (React Native / Expo Client App)

The `mobile-app` directory contains the cross-platform (iOS, Android, Web) mobile application built with Expo SDK 54 and React Native.

```
mobile-app/
├── app/                      # Expo Router file-based routes & screen layouts
│   ├── _layout.tsx           # Root navigation layout (<Stack /> provider)
│   └── index.tsx             # Main entry screen / home screen component
├── assets/                   # Static app assets and images
│   └── images/               # App icons, splash screens, and logos
│       ├── android-icon-background.png
│       ├── android-icon-foreground.png
│       ├── android-icon-monochrome.png
│       ├── favicon.png
│       ├── icon.png
│       ├── partial-react-logo.png
│       ├── react-logo.png
│       ├── react-logo@2x.png
│       ├── react-logo@3x.png
│       └── splash-icon.png
├── .claude/                  # Claude IDE project configuration
│   └── settings.json
├── .vscode/                  # VS Code workspace settings & recommended extensions
│   ├── extensions.json
│   └── settings.json
├── .gitignore                # Git ignore rules for mobile-app
├── AGENTS.md                 # Development & guidelines document for AI coding assistants
├── app.json                  # Expo project metadata, navigation plugins & app configs
├── CLAUDE.md                 # References AGENTS.md for IDE context
├── eslint.config.js          # ESLint flat config extending `eslint-config-expo`
├── package.json              # Mobile app package manifest and scripts
├── package-lock.json         # Dependency lock file
├── README.md                 # Mobile app specific README
└── tsconfig.json             # TypeScript config with `@/*` path aliases
```

#### 🛠️ Tech Stack & Key Dependencies
- **Framework:** Expo SDK 54 (`expo ~54.0.36`), React Native (`0.81.5`), React 19 (`19.1.0`)
- **Navigation:** Expo Router (`v6.0.24`) with file-based routing and `@react-navigation/*`
- **UI & Animations:** `react-native-reanimated`, `react-native-gesture-handler`, `react-native-safe-area-context`, `@expo/vector-icons`, `expo-symbols`, `expo-haptics`, `expo-image`
- **Language & Tooling:** TypeScript (`~5.9.2`), ESLint (`^9.25.0`)

#### 🚀 Getting Started (Mobile App)
```bash
cd mobile-app
npm install
npx expo start     # Start Expo development server

# Target-specific startup:
npx expo start --android   # Run on Android emulator/device
npx expo start --ios       # Run on iOS simulator/device
npx expo start --web       # Run on web browser
```

---

## 🛠️ Summary Table

| Module | Primary Tech | Role | Entry Point |
|---|---|---|---|
| **`backend/`** | Node.js, Express, Mongoose | REST API, Auth, Database Operations | `backend/index.js` |
| **`mobile-app/`** | React Native, Expo, TypeScript | User Interface, Mobile App | `mobile-app/app/index.tsx` |

---

## 🔒 Recommended Future Project Structure Enhancements

- **`backend/src/`**: Populate with `controllers/`, `models/`, `routes/`, `middlewares/`, and `config/db.js`.
- **`mobile-app/`**: Add components (`src/components/`), hooks (`src/hooks/`), services (`src/services/`), and state management directories outside of `app/` as the UI grows.
