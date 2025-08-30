/**
 * SECURE FIREBASE CONFIGURATION
 * 
 * Environment-based configuration with API key protection
 */

// Environment detection
function detectEnvironment() 
{
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1' || protocol === 'file:') 
    {
        return 'development';
    } 
    else if (
      hostname.includes('github.io') ||
      hostname.includes('netlify') ||
      hostname.includes('vercel') ||
      hostname.endsWith('.web.app') ||
      hostname.endsWith('.firebaseapp.com')
    ) 
    {
      return 'production';
    }
    return 'development';
}

// Secure configuration object (API keys will be loaded separately)
const firebaseConfigs = {
    development: {
        // Local development settings
        storageBucket: "recipesgroceriesapp.firebasestorage.app",
        projectId: "recipesgroceriesapp",
        // API keys loaded from environment or secure file
    },
    production: {
        // Production settings with domain restrictions
        storageBucket: "recipesgroceriesapp.firebasestorage.app", 
        projectId: "recipesgroceriesapp",
        // API keys loaded from environment variables
    }
};

// Load API keys securely (never commit to git)
async function loadSecureConfig() {
    const env = detectEnvironment();
    const baseConfig = firebaseConfigs[env];
    
    // Check if secure config is available (loaded from firebase-keys.js)
    if (window.SECURE_FIREBASE_CONFIG) {
        console.log('✅ Using secure local configuration');
        return { ...baseConfig, ...window.SECURE_FIREBASE_CONFIG };
    }
    
    // Fallback for development
    if (env === 'development') {
        console.log('⚠️ Using development fallback - set up firebase-keys.js for security');
        return {
            ...baseConfig,
            apiKey: promptForApiKey(),
            authDomain: `${baseConfig.projectId}.firebaseapp.com`,
            messagingSenderId: promptForSenderId(),
            appId: promptForAppId()
        };
    }
    
    throw new Error('No secure Firebase configuration found');
}

function promptForApiKey() {
    // In development, allow manual entry (not for production)
    if (detectEnvironment() === 'development') {
        const key = localStorage.getItem('dev_firebase_api_key');
        if (key) return key;
        
        const userKey = prompt('Enter Firebase API Key for development (will be stored locally):');
        if (userKey) {
            localStorage.setItem('dev_firebase_api_key', userKey);
            return userKey;
        }
    }
    throw new Error('Firebase API key not configured');
}

function promptForSenderId() {
    if (detectEnvironment() === 'development') {
        const senderId = localStorage.getItem('dev_firebase_sender_id');
        if (senderId) return senderId;
        
        const userSenderId = prompt('Enter Firebase Sender ID for development:');
        if (userSenderId) {
            localStorage.setItem('dev_firebase_sender_id', userSenderId);
            return userSenderId;
        }
    }
    return "794662117523"; // Default fallback
}

function promptForAppId() {
    // Similar pattern for App ID
    if (detectEnvironment() === 'development') {
        const appId = localStorage.getItem('dev_firebase_app_id');
        if (appId) return appId;
        
        const userAppId = prompt('Enter Firebase App ID for development:');
        if (userAppId) {
            localStorage.setItem('dev_firebase_app_id', userAppId);
            return userAppId;
        }
    }
    throw new Error('Firebase App ID not configured');
}

// Initialize Firebase with secure configuration
async function initializeSecureFirebase() {
    // Prevent multiple initializations
    if (window._firebaseInitialized) {
        console.log('🔥 Firebase already initialized - skipping');
        return {
            config: window.firebaseConfig,
            db: window.db,
            storage: window.storage,
            auth: window.auth
        };
    }
    
    try {
        const config = await loadSecureConfig();
        const env = detectEnvironment();
        
        window.debugLog('firebase', `🔐 Initializing Firebase in ${env} mode`);
        window.debugLog('firebase', `📍 Project: ${config.projectId}`);
        window.debugLog('firebase', `🪣 Storage: ${config.storageBucket}`);
        
        // Robust Firebase app initialization with proper error handling
        let app;
        try {
            // Check if we already have apps
            if (firebase.apps && firebase.apps.length > 0) {
                // Get the default (first) app
                app = firebase.apps[0];
                window.debugLog('firebase', '🔥 Using existing Firebase app');
            } else {
                // No apps exist - initialize new one
                app = firebase.initializeApp(config);
                window.debugLog('firebase', '🔥 Firebase app initialized (first time)');
            }
        } catch (error) {
            console.warn('⚠️ Firebase app initialization error, attempting recovery:', error.code);
            
            // Handle various Firebase initialization errors
            if (error.code === 'app/duplicate-app') {
                // App already exists - get it
                try {
                    app = firebase.apps[0];
                    console.log('🔥 Retrieved existing Firebase app after duplicate error');
                } catch (getError) {
                    // Fallback to creating new app with different name
                    app = firebase.initializeApp(config, 'backup-' + Date.now());
                    console.log('🔥 Created backup Firebase app');
                }
            } else if (error.code === 'app/no-app') {
                // No app found - force create one
                app = firebase.initializeApp(config);
                console.log('🔥 Force-created Firebase app after no-app error');
            } else {
                // Unknown error - try once more
                try {
                    app = firebase.initializeApp(config, 'fallback-' + Date.now());
                    console.log('🔥 Fallback Firebase app created');
                } catch (fallbackError) {
                    console.error('❌ All Firebase initialization attempts failed:', fallbackError);
                    throw fallbackError;
                }
            }
        }
        
        // Initialize services with error handling using the app instance
        const db = firebase.firestore(app);
        const storage = firebase.storage(app);
        const auth = firebase.auth(app);
        
        // Make globally available (PERSISTENT)
        window.firebaseConfig = config;
        window.db = db;
        window.storage = storage;
        window.auth = auth;
        window.firebase = firebase;
        
        // Also set for app compatibility
        if (window.app) {
            window.app.db = db;
            window.app.storage = storage;
        }
        
        // Mark as initialized to prevent re-initialization
        window._firebaseInitialized = true;
        
        window.debugLog('firebase', '🔥 Secure Firebase initialization complete');
        window.debugLog('firebase', '✅ Global variables set:', {
            db: !!window.db,
            storage: !!window.storage,
            auth: !!window.auth,
            firebase: !!window.firebase,
            firebaseApp: !!firebase.app()
        });
        
        // Verify Firebase app is actually available
        try {
            const app = firebase.app();
            window.debugLog('firebase', '🔥 Firebase app verified:', app.name, app.options.projectId);
        } catch (error) {
            console.error('🚨 CRITICAL: Firebase app verification failed:', error);
        }
        
        return { config, db, storage, auth };
        
    } catch (error) {
        console.error('❌ Secure Firebase initialization failed:', error);
        throw error;
    }
}

// Export for use
window.initializeSecureFirebase = initializeSecureFirebase;
window.detectEnvironment = detectEnvironment;

window.debugLog('firebase', '🔐 Secure Firebase configuration loaded');
window.debugLog('firebase', '📋 Usage: await initializeSecureFirebase()');
