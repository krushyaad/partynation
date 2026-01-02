// Firebase Configuration
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyDtUMfqGjv0tgYrkwcAUbyPk5UuhMM1lF8",
    authDomain: "bottleserviceapp.firebaseapp.com",
    projectId: "bottleserviceapp",
    storageBucket: "bottleserviceapp.firebasestorage.app",
    messagingSenderId: "317908998044",
    appId: "1:317908998044:web:21b363882fc3b7b9615a59"
};

// App Configuration
const APP_CONFIG = {
    appId: 'bottle-service-app',
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
