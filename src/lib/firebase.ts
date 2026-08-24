import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY
const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID
const appId = import.meta.env.VITE_FIREBASE_APP_ID

if (!apiKey || !authDomain || !projectId || !appId) {
  // eslint-disable-next-line no-console
  console.error("VITE_FIREBASE_* env vars are not set — auth will not work.")
}

const app = initializeApp({
  apiKey: apiKey || "placeholder-api-key",
  authDomain: authDomain || "placeholder.firebaseapp.com",
  projectId: projectId || "placeholder",
  appId: appId || "placeholder-app-id",
})

export const auth = getAuth(app)
