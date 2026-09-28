# Vehicle Safety Application

A vehicle safety and emergency response application built with React Native (Expo) and Node.js. The application collects vehicle, motion, location, device, and driver-state data, detects safety anomalies, and manages an emergency response workflow.

## Tech Stack

### Mobile
- React Native
- Expo SDK 54
- TypeScript
- Expo Router

### Backend
- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT Authentication

## Project Structure

```text
SafetyApp/
├── backend/
│   ├── src/
│   ├── .env.example
│   ├── index.js
│   ├── server.js
│   └── package.json
│
├── mobile-app/
│   ├── app/
│   ├── src/
│   ├── app.json
│   └── package.json
│
└── README.md

How to Start the Project
1. Clone the Repository
git clone https://github.com/vaishnavi310804/driveShield.git
cd driveShield

2. Start the Backend
cd backend
npm install
npm run dev

3. Start the Mobile App
Open a new terminal from the project root:
cd mobile-app
npm install
npx expo start