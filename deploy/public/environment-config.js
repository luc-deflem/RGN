/**
 * ENVIRONMENT-BASED CONFIGURATION SYSTEM
 * Version 1.0.0
 *
 * Intelligent configuration management for different usage contexts:
 * - Mac Local: Direct file access, zero Firebase image calls
 * - Network Local: Local server access from iPhone/iPad
 * - Shared Local: Shared folder access with minimal Firebase
 * - Remote Firebase: Full cloud access when needed
 */

// Global logging controls
window.DEBUG_LOGS = window.DEBUG_LOGS ?? true; // Master switch for console output
window.SHOW_MISSING_IMAGE_LOGS = window.SHOW_MISSING_IMAGE_LOGS ?? false;

const DEBUG_LOGS = window.DEBUG_LOGS;


const IS_MAC_LOCAL = window.location.protocol === 'file:' && navigator.platform.includes('Mac');
if (IS_MAC_LOCAL && !window.DEBUG_LOGS) {
    console.log = () => {};
    console.warn = () => {};
}

console.log('🔧 Environment Configuration System loading...');

// Enhanced environment detection
function detectUsageContext() {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;
    
    console.log(`🔍 Environment Detection:`, {
        hostname,
        protocol,
        userAgent: userAgent.substring(0, 100) + '...',
        platform
    });
    
    // Mac Local Development (file:// protocol)
    if (protocol === 'file:' && platform.includes('Mac')) {
        return 'MAC_LOCAL';
    }
    
    // Mac localhost HTTP server testing
    if (hostname === 'localhost' && platform.includes('Mac')) {
        return 'MAC_HTTP_LOCAL';
    }
    
    // Shared Local (file:// on other devices via shared folder)
    if (protocol === 'file:' && !platform.includes('Mac')) {
        return 'SHARED_LOCAL';
    }
    
    // Firebase Hosted (production deployment)
    if (hostname.endsWith('.web.app') || hostname.endsWith('.firebaseapp.com') ||
        hostname.includes('firebase') || hostname.includes('.app')) {
        
        // Mobile accessing Firebase
        if (/iPhone|iPad|iPod|Android|Mobile/i.test(userAgent)) {
            return 'MOBILE_FIREBASE';
        }
        return 'REMOTE_FIREBASE';
    }
    
    // GitHub Pages or other hosting
    if (hostname.includes('github.io') || hostname.includes('netlify') || 
        hostname.includes('vercel')) {
        
        // Mobile accessing hosting
        if (/iPhone|iPad|iPod|Android|Mobile/i.test(userAgent)) {
            return 'MOBILE_FIREBASE';
        }
        return 'REMOTE_FIREBASE';
    }
    
    // Default fallback - assume Firebase hosting
    console.warn('⚠️ Unknown environment, defaulting to MOBILE_FIREBASE for mobile, REMOTE_FIREBASE for desktop');
    
    if (/iPhone|iPad|iPod|Android|Mobile/i.test(userAgent)) {
        return 'MOBILE_FIREBASE';
    }
    return 'REMOTE_FIREBASE';
}

// Configuration profiles optimized for Firebase quota efficiency
const USAGE_CONFIGS = {
    MAC_LOCAL: {
        name: "Mac Local Development",
        description: "Direct file access, maximum performance, zero Firebase image calls",
        images: {
            source: "LOCAL_ONLY", 
            localPath: "RGimages/",
            firebaseBypass: true,
            cachingStrategy: "NONE_NEEDED",
            lazyLoading: false
        },
        sync: {
            mode: "PERIODIC_PUSH",
            direction: "MAC_TO_FIREBASE",
            priority: ["shopping", "pantry", "products", "recipes", "mealPlans"],
            frequency: "END_OF_SESSION",
            autoSync: false,
            batchSize: 25,
            syncTrigger: "MANUAL_OR_IDLE"
        },
        features: {
            enabled: "ALL",
            debugMode: true,
            developmentTools: true,
            performanceOptimized: true,
            workflowIndependent: true
        },
        firebase: {
            imageStorage: false,
            dataSync: "push_only",
            realTime: false,
            usage: "minimal"
        }
    },
    
    MAC_HTTP_LOCAL: {
        name: "Mac HTTP Local Development",
        description: "HTTP server testing, local images via web server, Firebase sync available",
        images: {
            source: "LOCAL_ONLY",
            localPath: "RGimages/",  // Symlinked to web server root
            firebaseBypass: true,
            cachingStrategy: "NONE_NEEDED", 
            lazyLoading: false
        },
        sync: {
            mode: "FULL_BIDIRECTIONAL",
            direction: "BIDIRECTIONAL",
            priority: ["shopping", "pantry", "products", "recipes", "mealPlans"],
            frequency: "IMMEDIATE",
            autoSync: true,
            batchSize: 50,
            syncTrigger: "REAL_TIME"
        },
        features: {
            enabled: "ALL",
            debugMode: true,
            developmentTools: true,
            performanceOptimized: true,
            workflowIndependent: false
        },
        firebase: {
            imageStorage: false, // Use local images
            dataSync: "full_bidirectional",
            realTime: true,
            usage: "development_testing"
        }
    },
    
    SHARED_LOCAL: {
        name: "Shared Folder Access",
        description: "Local shared folder with periodic Firebase sync",
        images: {
            source: "SHARED_FOLDER",
            localPath: "RGimages/",
            firebaseBypass: true,
            cachingStrategy: "SESSION_CACHE",
            lazyLoading: true
        },
        sync: {
            mode: "BIDIRECTIONAL",
            direction: "SHARED_COLLABORATIVE",
            priority: ["recipes", "mealPlans", "shopping", "pantry"],
            frequency: "PERIODIC",
            autoSync: true,
            batchSize: 20,
            syncTrigger: "TIME_BASED"
        },
        features: {
            enabled: ["recipes", "mealPlans", "shopping", "pantry", "products"],
            collaborationTools: true,
            recipeCreation: true,
            menuPlanning: true,
            workflowIndependent: true
        },
        firebase: {
            imageStorage: false,
            dataSync: "collaborative",
            realTime: false,
            usage: "moderate"
        }
    },
    
    MOBILE_FIREBASE: {
        name: "iPhone/iPad Firebase",
        description: "Independent mobile access with aggressive caching",
        images: {
            source: "FIREBASE_AGGRESSIVE_CACHE",
            firebaseBypass: false,
            cachingStrategy: "PERSISTENT_AGGRESSIVE",
            lazyLoading: true,
            preloadStrategy: "SHOPPING_ESSENTIALS",
            cacheExpiration: "30_DAYS",
            maxCacheSize: "100MB",
            prefetchOnWifi: true
        },
        sync: {
            mode: "FIREBASE_FIRST",
            direction: "FIREBASE_TO_MOBILE",
            priority: ["shopping", "pantry", "recipes_minimal", "mealPlans"],
            frequency: "ON_APP_OPEN",
            autoSync: true,
            batchSize: 8,
            syncTrigger: "APP_LIFECYCLE"
        },
        features: {
            enabled: ["shopping", "pantry", "recipes_minimal", "mealPlans"],
            mobileOptimized: true,
            offlineFirst: true,
            dataCompression: true,
            workflowIndependent: true,
            instantAccess: true
        },
        firebase: {
            imageStorage: "smart_cached",
            dataSync: "pull_priority",
            realTime: "shopping_only",
            usage: "optimized"
        }
    },
    
    REMOTE_FIREBASE: {
        name: "Remote Firebase Access",
        description: "Full Firebase functionality with intelligent caching for desktop remote access",
        images: {
            source: "FIREBASE_INTELLIGENT_CACHE",
            firebaseBypass: false,
            cachingStrategy: "INTELLIGENT_CACHE",
            lazyLoading: true,
            cacheExpiration: "7_DAYS",
            maxCacheSize: "100MB",
            prefetchOnWifi: true
        },
        sync: {
            mode: "CLOUD_OPTIMIZED",
            direction: "BIDIRECTIONAL",
            priority: ["shopping", "recipes", "pantry", "products", "mealPlans"],
            frequency: "ON_DEMAND",
            autoSync: true,
            batchSize: 15,
            syncTrigger: "USER_ACTION"
        },
        features: {
            enabled: "ALL",
            cloudOptimized: true,
            fullFunctionality: true,
            workflowIndependent: true
        },
        firebase: {
            imageStorage: "intelligent_cached",
            dataSync: "full_bidirectional",
            realTime: "selective",
            usage: "balanced"
        }
    }
};

// Environment configuration manager
class EnvironmentConfig {
    constructor() {
        this.context = detectUsageContext();
        this.config = USAGE_CONFIGS[this.context];
        this.initialized = false;
        
        console.log(`🎯 Usage Context: ${this.context}`);
        console.log(`⚙️ Configuration:`, this.config.name);
        console.log(`📝 Description:`, this.config.description);
        
        // Log Firebase optimization settings
        console.log(`🔥 Firebase Settings:`, {
            imageStorage: this.config.firebase.imageStorage,
            dataSync: this.config.firebase.dataSync,
            realTime: this.config.firebase.realTime
        });
    }
    
    // Get current usage context
    getContext() {
        return this.context;
    }
    
    // Get full configuration
    getConfig() {
        return this.config;
    }
    
    // Get specific configuration section
    getImages() {
        return this.config.images;
    }
    
    getSync() {
        return this.config.sync;
    }
    
    getFeatures() {
        return this.config.features;
    }
    
    getFirebase() {
        return this.config.firebase;
    }
    
    // Check if feature is enabled
    isFeatureEnabled(feature) {
        const enabled = this.config.features.enabled;
        if (enabled === "ALL") return true;
        if (Array.isArray(enabled)) return enabled.includes(feature);
        return false;
    }
    
    // Check if Firebase images should be bypassed
    shouldBypassFirebaseImages() {
        return this.config.images.firebaseBypass === true;
    }
    
    // Get image loading strategy
    getImageLoadingStrategy() {
        return {
            source: this.config.images.source,
            localPath: this.config.images.localPath,
            bypassFirebase: this.config.images.firebaseBypass,
            caching: this.config.images.cachingStrategy,
            lazyLoading: this.config.images.lazyLoading,
            preload: this.config.images.preloadStrategy
        };
    }
    
    // Get sync strategy
    getSyncStrategy() {
        return {
            mode: this.config.sync.mode,
            priority: this.config.sync.priority,
            frequency: this.config.sync.frequency,
            autoSync: this.config.sync.autoSync,
            batchSize: this.config.sync.batchSize
        };
    }
    
    // Initialize configuration
    initialize() {
        if (this.initialized) return;
        
        // Store config in localStorage for other modules
        localStorage.setItem('environmentConfig', JSON.stringify({
            context: this.context,
            config: this.config,
            timestamp: Date.now()
        }));
        
        // Set global flags for backward compatibility
        window.ENVIRONMENT_CONTEXT = this.context;
        window.FIREBASE_IMAGES_BYPASSED = this.shouldBypassFirebaseImages();
        window.IMAGE_LOADING_STRATEGY = this.getImageLoadingStrategy();
        
        this.initialized = true;
        console.log('✅ Environment configuration initialized');
        
        // Dispatch event for other modules
        window.dispatchEvent(new CustomEvent('environmentConfigReady', {
            detail: { context: this.context, config: this.config }
        }));
    }
    
    // Debug information
    debugInfo() {
        return {
            context: this.context,
            config: this.config.name,
            firebaseImagesBypass: this.shouldBypassFirebaseImages(),
            features: this.config.features.enabled,
            sync: this.config.sync.mode,
            initialized: this.initialized
        };
    }
}

// Create global instance
window.EnvironmentConfig = new EnvironmentConfig();

// Mode management for Mac local usage
class MacModeManager {
    constructor() {
        this.currentMode = localStorage.getItem('macMode') || 'dev';
        this.modeToggleBtn = null;
        this.firebaseToggleBtn = null;
        this.firebaseEnabled = !window.FIREBASE_DISABLED;
    }
    
    initialize() {
        // Only initialize for Mac local usage
        if (window.EnvironmentConfig.getContext() === 'MAC_LOCAL') {
            console.log('🔧 Initializing Mac Mode Manager...');
            this.setupModeToggle();
            this.setupFirebaseToggle();
            this.updateUI();
            console.log(`🎯 Mac Mode Manager initialized - Current mode: ${this.currentMode.toUpperCase()}`);
        } else {
            console.log('⚠️ Mac Mode Manager skipped - Not MAC_LOCAL context');
        }
    }
    
    setupModeToggle() {
        // First check if button exists in HTML source
        const headerHTML = document.querySelector('header');
        if (headerHTML) {
            console.log('🔍 Header HTML contains modeToggleBtn?', headerHTML.innerHTML.includes('modeToggleBtn'));
        }
        
        this.modeToggleBtn = document.getElementById('modeToggleBtn');
        if (this.modeToggleBtn) {
            this.modeToggleBtn.addEventListener('click', () => this.toggleMode());
            console.log('✅ Mode toggle button found and event listener attached');
        } else {
            console.log('❌ Mode toggle button not found - checking DOM...');
            console.log('Header HTML:', headerHTML ? headerHTML.innerHTML : 'No header found');
            
            // Try to create the button dynamically (fallback)
            if (headerHTML && headerHTML.querySelector('h1')) {
                console.log('🔧 Button missing - likely destroyed by app.js header update');
                console.log('🔧 Attempting to create button dynamically...');
                this.createModeToggleButton();
            }
        }
    }
    
    setupFirebaseToggle() {
        // Create Firebase toggle button (only shown in Dev mode)
        const h1 = document.querySelector('header h1');
        if (h1) {
            const button = document.createElement('button');
            button.id = 'firebaseToggleBtn';
            button.className = 'firebase-toggle disabled';
            button.title = 'Toggle Firebase for testing in Dev mode';
            button.innerHTML = '🔥 OFF';
            button.style.display = this.currentMode === 'dev' ? 'inline-block' : 'none';
            button.addEventListener('click', () => this.toggleFirebase());
            
            // Insert after mode toggle button
            const modeBtn = h1.querySelector('#modeToggleBtn');
            if (modeBtn) {
                h1.insertBefore(button, modeBtn.nextSibling);
            } else {
                h1.appendChild(button);
            }
            
            this.firebaseToggleBtn = button;
            console.log('✅ Firebase toggle button created');
        }
    }
    
    createModeToggleButton() {
        const h1 = document.querySelector('header h1');
        if (h1) {
            // Remove any existing button first to prevent duplicates
            const existingBtn = document.getElementById('modeToggleBtn');
            if (existingBtn) {
                existingBtn.remove();
                console.log('🔄 Removed existing mode toggle button');
            }
            
            const button = document.createElement('button');
            button.id = 'modeToggleBtn';
            button.className = 'mode-toggle dev-mode';
            button.title = 'Click to switch between Development and Production modes';
            button.innerHTML = '🔧 DEV';
            button.addEventListener('click', () => this.toggleMode());
            
            // Insert after the "Grocery Manager" text but before version span
            const versionSpan = h1.querySelector('span');
            if (versionSpan) {
                h1.insertBefore(button, versionSpan);
            } else {
                h1.appendChild(button);
            }
            
            this.modeToggleBtn = button;
            console.log('✅ Mode toggle button created dynamically');
            this.updateUI();
        } else {
            console.warn('❌ Could not create mode toggle button - header h1 not found');
        }
    }
    
    async toggleMode() {
        const oldMode = this.currentMode;
        this.currentMode = this.currentMode === 'dev' ? 'prod' : 'dev';
        localStorage.setItem('macMode', this.currentMode);
        
        // Auto-activate Firebase when switching to Prod mode
        if (this.currentMode === 'prod' && !this.firebaseEnabled) {
            console.log('🔄 Auto-activating Firebase for Production mode...');
            await this.toggleFirebase(true);
        }
        
        this.updateUI();
        this.logModeChange();
    }
    
    async toggleFirebase(forceEnable = null) {
        const shouldEnable = forceEnable !== null ? forceEnable : !this.firebaseEnabled;
        
        if (shouldEnable && !this.firebaseEnabled) {
            // Enable Firebase
            try {
                console.log('🔥 Enabling Firebase...');
                await window.loadFirebaseDynamically();
                // Wait a moment for Firebase to be fully loaded
                setTimeout(() => {
                    window.initializeFirebaseAfterLoad();
                    this.firebaseEnabled = true;
                    this.updateUI();
                    console.log('✅ Firebase enabled successfully');
                }, 500);
            } catch (error) {
                console.error('❌ Failed to enable Firebase:', error);
                alert('Failed to load Firebase. Check console for details.');
                return;
            }
        } else if (!shouldEnable && this.firebaseEnabled) {
            // Disable Firebase (requires page refresh for clean state)
            console.log('🚫 Disabling Firebase (requires refresh for clean state)...');
            window.FIREBASE_DISABLED = true;
            this.firebaseEnabled = false;
            this.updateUI();
            
            const shouldRefresh = confirm('Firebase disabled. Refresh page for clean state?');
            if (shouldRefresh) {
                window.location.reload();
            }
        }
    }
    
    updateUI() {
        // Update mode toggle button
        if (this.modeToggleBtn) {
            if (this.currentMode === 'dev') {
                this.modeToggleBtn.className = 'mode-toggle dev-mode';
                this.modeToggleBtn.innerHTML = '🔧 DEV';
                this.modeToggleBtn.title = 'Development Mode: Local-only workflow. Click to switch to Production Mode.';
            } else {
                this.modeToggleBtn.className = 'mode-toggle prod-mode';
                this.modeToggleBtn.innerHTML = '✅ PROD';
                this.modeToggleBtn.title = 'Production Mode: Smart sync enabled. Click to switch to Development Mode.';
            }
        }
        
        // Update Firebase toggle button
        if (this.firebaseToggleBtn) {
            // Show/hide based on mode
            this.firebaseToggleBtn.style.display = this.currentMode === 'dev' ? 'inline-block' : 'none';
            
            if (this.firebaseEnabled) {
                this.firebaseToggleBtn.className = 'firebase-toggle enabled';
                this.firebaseToggleBtn.innerHTML = '🔥 ON';
                this.firebaseToggleBtn.title = 'Firebase testing enabled. Click to disable.';
            } else {
                this.firebaseToggleBtn.className = 'firebase-toggle disabled';
                this.firebaseToggleBtn.innerHTML = '🔥 OFF';
                this.firebaseToggleBtn.title = 'Firebase testing disabled. Click to enable.';
            }
        }
        
        // Update dev tools section visibility
        const devToolsSection = document.getElementById('devToolsSection');
        if (devToolsSection) {
            devToolsSection.style.display = this.currentMode === 'dev' ? 'block' : 'none';
        }
    }
    
    logModeChange() {
        const firebaseStatus = window.FIREBASE_DISABLED ? 'DISABLED' : 'ENABLED';
        
        if (this.currentMode === 'dev') {
            console.log('🔧 Switched to DEVELOPMENT MODE');
            console.log(`   • Firebase: ${firebaseStatus} (set at startup)`);
            console.log('   • Sync: Minimal/Testing only');
            console.log('   • Images: LOCAL ONLY');
            console.log('   • Perfect for: Testing, browsing, debugging');
            
            if (!window.FIREBASE_DISABLED) {
                console.log('   💡 Tip: Refresh without Firebase to save quota during development');
            }
        } else {
            console.log('✅ Switched to PRODUCTION MODE');
            console.log(`   • Firebase: ${firebaseStatus} (set at startup)`);
            console.log('   • Sync: Smart sync of changed records only');
            console.log('   • Images: LOCAL ONLY');  
            console.log('   • Perfect for: Meal planning, recipe creation, grocery prep');
            
            if (window.FIREBASE_DISABLED) {
                console.log('   ⚠️ Note: Firebase disabled - changes won\'t sync. Refresh to enable.');
            }
        }
    }
    
    getCurrentMode() {
        return this.currentMode;
    }
    
    isDevMode() {
        return this.currentMode === 'dev';
    }
    
    isProdMode() {
        return this.currentMode === 'prod';
    }
}

// Create global mode manager
window.MacModeManager = new MacModeManager();

// Auto-initialize
document.addEventListener('DOMContentLoaded', () => {
    window.EnvironmentConfig.initialize();
    window.MacModeManager.initialize();
    
    // FIX: Re-initialize MacModeManager after app loads to ensure toggle button works
    setTimeout(() => {
        console.log('🔄 Re-initializing MacModeManager after app load...');
        if (window.MacModeManager && !document.getElementById('modeToggleBtn')) {
            console.log('🔧 Mode toggle button missing after app load - recreating...');
            window.MacModeManager.initialize();
        }
    }, 2000);
});

console.log('✅ Environment Configuration System loaded - v3.3.4-clean-logging');
console.log('🔧 Context:', window.EnvironmentConfig.getContext());
console.log('⚡ Firebase Images Bypassed:', window.EnvironmentConfig.shouldBypassFirebaseImages());

// EMERGENCY: Monitor Firebase calls (only if Firebase loaded)
if (typeof firebase !== 'undefined' && firebase.storage) {
    const originalRef = firebase.storage().ref;
    firebase.storage().ref = function(...args) {
        console.log('🚨 FIREBASE STORAGE CALL DETECTED:', args);
        // console.trace('Call stack:'); // Disabled - can cause debugger pausing
        return originalRef.apply(this, args);
    };
    console.log('🔍 Firebase monitoring enabled');
} else if (window.FIREBASE_DISABLED) {
    console.log('🚫 Firebase monitoring skipped - Firebase disabled for Mac Dev Mode');
}

// Debug: Check if button exists + re-initialize if needed
setTimeout(() => {
    const btn = document.getElementById('modeToggleBtn');
    console.log('🔍 Debug - Mode toggle button found:', btn ? 'YES' : 'NO');
    if (btn) {
        console.log('🔍 Button classes:', btn.className);
        console.log('🔍 Button text:', btn.innerHTML);
    } else {
        console.log('❌ Button with id "modeToggleBtn" not found in DOM');
        console.log('🔄 Re-initializing Mac Mode Manager...');
        if (window.MacModeManager) {
            window.MacModeManager.initialize();
        }
    }
}, 2000);

// Also try after app fully loads
setTimeout(() => {
    if (!document.getElementById('modeToggleBtn') && window.MacModeManager) {
        console.log('🔄 Final attempt - Re-initializing Mac Mode Manager...');
        window.MacModeManager.initialize();
    }
}, 5000);

// Debug: Monitor for dynamic style changes that might affect scrolling
function debugTabScrolling() {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                const target = mutation.target;
                if (target.classList.contains('tab-content') && target.classList.contains('active')) {
                    console.log('🔍 Tab style changed:', target.id, 'New style:', target.getAttribute('style'));
                }
            }
        });
    });
    
    document.querySelectorAll('.tab-content').forEach(tab => {
        observer.observe(tab, {
            attributes: true,
            attributeFilter: ['style', 'class']
        });
    });
    
    console.log('🔍 Tab scrolling monitor active');
}

// Start monitoring after DOM loads
setTimeout(() => {
    if (window.EnvironmentConfig?.getContext() === 'MAC_LOCAL') {
        debugTabScrolling();
    }
}, 3000);

// Export for ES6 modules if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EnvironmentConfig, USAGE_CONFIGS, detectUsageContext };
}