// Firebase Configuration
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyD-5sHMkJONrrVo3u03X8mOAi6GF6MH9a8",
    authDomain: "party-nation-app.firebaseapp.com",
    projectId: "party-nation-app",
    storageBucket: "party-nation-app.firebasestorage.app",
    messagingSenderId: "665651077498",
    appId: "1:665651077498:web:9d7e8a0e5e2c1f3a4b5c6d"
};

// App Configuration
const APP_CONFIG = {
    appId: 'party-nation-live',
    version: '5.0.0',
    name: 'Party Nation',
    
    // Features toggles
    features: {
        quickFlix: true,
        music: true,
        coins: true,
        events: true,
        boost: true,
        verification: true
    },
    
    // Pagination
    postsPerPage: 15,
    commentsPerPage: 20,
    
    // Timeouts
    cacheTimeout: 5 * 60 * 1000, // 5 minutes
    
    // PayPal
    paypalClientId: 'AX9zNNV-VLY5iE7qcp7XOfKsqnLRBR5bG-PtBmO4sH58zYSwRTHvXDF_yVMdus0unfbwsJHhNeyt0l5',
    
    // Support email
    supportEmail: 'krushyaad.biz@gmail.com'
};

// Deezer Music API (no auth required)
const MUSIC_CONFIG = {
    corsProxies: [
        (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
        (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    ],
    searchLimit: 15,
    cacheTimeout: 5 * 60 * 1000
};

// Export for modules
window.FIREBASE_CONFIG = FIREBASE_CONFIG;
window.APP_CONFIG = APP_CONFIG;
window.MUSIC_CONFIG = MUSIC_CONFIG;
