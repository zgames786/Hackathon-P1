const firebaseConfig = {
  apiKey: "AIzaSyDDaOx0GXBrDOx_-NBUWQVQXbYfutuclWQ",
  authDomain: "thna-school-app.firebaseapp.com",
  projectId: "thna-school-app",
  storageBucket: "thna-school-app.appspot.com",
  messagingSenderId: "777172524006",
  appId: "1:777172524006:web:7284bdc57050df287bd427",
  measurementId: "G-B1E8WXYR9V"
};
    
    firebase.initializeApp(firebaseConfig);
    
    window.auth = firebase.auth();
    window.db = firebase.firestore();
    
    console.log("Firebase initialized");