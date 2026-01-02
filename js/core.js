// Party Nation Core - Firebase & Auth
// This module initializes Firebase and provides auth/db access

(function() {
    'use strict';
    
    // Initialize Firebase
    if (!firebase.apps.length) {
        firebase.initializeApp(FIREBASE_CONFIG);
    }
    
    const db = firebase.firestore();
    const auth = firebase.auth();
    
    // Enable offline persistence
    db.enablePersistence({ synchronizeTabs: true }).catch(err => {
        if (err.code === 'failed-precondition') {
            console.log('Persistence failed: Multiple tabs open');
        } else if (err.code === 'unimplemented') {
            console.log('Persistence not supported');
        }
    });
    
    // Auth state observer
    let currentUser = null;
    let authReadyResolve;
    const authReady = new Promise(resolve => { authReadyResolve = resolve; });
    
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            // User signed in - load profile data
            try {
                const userDoc = await db.collection('artifacts')
                    .doc(APP_CONFIG.appId)
                    .collection('users')
                    .doc(user.uid)
                    .get();
                
                if (userDoc.exists) {
                    currentUser = {
                        ...user,
                        ...userDoc.data(),
                        uid: user.uid
                    };
                } else {
                    // Check guests collection
                    const guestDoc = await db.collection('artifacts')
                        .doc(APP_CONFIG.appId)
                        .collection('guests')
                        .doc(user.uid)
                        .get();
                    
                    if (guestDoc.exists) {
                        currentUser = {
                            ...user,
                            ...guestDoc.data(),
                            uid: user.uid
                        };
                    } else {
                        currentUser = user;
                    }
                }
            } catch (err) {
                console.error('Error loading user data:', err);
                currentUser = user;
            }
        } else {
            currentUser = null;
        }
        
        authReadyResolve(currentUser);
        
        // Dispatch event for components to react
        window.dispatchEvent(new CustomEvent('authStateChanged', { 
            detail: { user: currentUser } 
        }));
    });
    
    // Auth methods
    const signInWithGoogle = async () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        return auth.signInWithPopup(provider);
    };
    
    const signInAnonymously = async () => {
        return auth.signInAnonymously();
    };
    
    const signOut = async () => {
        return auth.signOut();
    };
    
    // User lookup by username/userTag
    const findUserByUsername = async (username) => {
        const cacheKey = `user_${username.toLowerCase()}`;
        const cached = utils.userCache.get(cacheKey);
        if (cached) return cached;
        
        try {
            // Search users collection
            let snapshot = await db.collection('artifacts')
                .doc(APP_CONFIG.appId)
                .collection('users')
                .where('userTag', '==', username.toLowerCase())
                .limit(1)
                .get();
            
            if (snapshot.empty) {
                // Try guests collection
                snapshot = await db.collection('artifacts')
                    .doc(APP_CONFIG.appId)
                    .collection('guests')
                    .where('userTag', '==', username.toLowerCase())
                    .limit(1)
                    .get();
            }
            
            if (!snapshot.empty) {
                const userData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
                utils.userCache.set(cacheKey, userData);
                return userData;
            }
            
            return null;
        } catch (err) {
            console.error('Error finding user:', err);
            return null;
        }
    };
    
    // Get user by ID
    const getUserById = async (userId) => {
        const cacheKey = `userId_${userId}`;
        const cached = utils.userCache.get(cacheKey);
        if (cached) return cached;
        
        try {
            let userDoc = await db.collection('artifacts')
                .doc(APP_CONFIG.appId)
                .collection('users')
                .doc(userId)
                .get();
            
            if (!userDoc.exists) {
                userDoc = await db.collection('artifacts')
                    .doc(APP_CONFIG.appId)
                    .collection('guests')
                    .doc(userId)
                    .get();
            }
            
            if (userDoc.exists) {
                const userData = { id: userDoc.id, ...userDoc.data() };
                utils.userCache.set(cacheKey, userData);
                return userData;
            }
            
            return null;
        } catch (err) {
            console.error('Error getting user:', err);
            return null;
        }
    };
    
    // Expose core API
    window.PartyNation = {
        db,
        auth,
        appId: APP_CONFIG.appId,
        
        // Auth
        get currentUser() { return currentUser; },
        authReady,
        signInWithGoogle,
        signInAnonymously,
        signOut,
        
        // Users
        findUserByUsername,
        getUserById,
        
        // Collections helpers
        drops: () => db.collection('artifacts').doc(APP_CONFIG.appId).collection('krushDrops'),
        users: () => db.collection('artifacts').doc(APP_CONFIG.appId).collection('users'),
        guests: () => db.collection('artifacts').doc(APP_CONFIG.appId).collection('guests'),
        events: () => db.collection('artifacts').doc(APP_CONFIG.appId).collection('events'),
        quickflix: () => db.collection('artifacts').doc(APP_CONFIG.appId).collection('quickflix'),
        comments: () => db.collection('artifacts').doc(APP_CONFIG.appId).collection('comments'),
        
        // Timestamp helper
        serverTimestamp: () => firebase.firestore.FieldValue.serverTimestamp(),
        increment: (n) => firebase.firestore.FieldValue.increment(n)
    };
    
    console.log('🎉 Party Nation Core initialized');
})();
