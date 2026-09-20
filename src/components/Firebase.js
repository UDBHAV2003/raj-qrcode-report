import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyBKE-2qr2Kwqf9i8qfq6kmcwUYIkBj2bKQ',
  authDomain: 'lab-report-pdf.firebaseapp.com',
  projectId: 'lab-report-pdf',
  storageBucket: 'lab-report-pdf.firebasestorage.app',
  messagingSenderId: '433511884056',
  appId: '1:433511884056:web:e4a135dd8ede76c4e6aa6d',
}

const app = initializeApp(firebaseConfig)

// Firestore is what makes the QR code work from ANY phone — it's a
// small cloud database, so a patient's report is reachable from
// anywhere, not just the browser/device it was created on (unlike
// localStorage, which never leaves that one browser).
export const db = getFirestore(app)