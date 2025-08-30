/* smart-image-system.js — v7.2.0 - Mac Environment Fix & Image Deduplication */
window.debugLog('smartImages', "📱 Smart Image System loading with controlled logging...");

const smartImages = {
    // Initialize with automatic environment detection
    init() {
        window.debugLog('smartImages', "🎯 Smart Image System initializing...");
        
        this.envContext = this.detectEnvironment();
        this.config = this.getEnvironmentConfig();
        
        // Image loading deduplication to prevent multiple simultaneous requests
        this.loadingPromises = new Map();
        this.lastCallTime = new Map();
        
        // Image loading statistics for summary reporting
        this.imageStats = {
            requested: 0,
            cached: 0,
            loaded: 0,
            failed: 0,
            deduplicated: 0
        };
        
        window.debugLog('smartImages', `🎯 Image system configured for: ${this.envContext}`);
        window.debugLog('smartImages', `📸 Image strategy:`, this.config);
    },

    // Enhanced environment detection with proper Mac handling
    detectEnvironment() {
        const isMac = navigator.platform.includes('Mac') || navigator.userAgent.includes('Macintosh');
        const isiPhone = /iPhone|iPad|iPod/.test(navigator.userAgent);
        const isiPad = /iPad/.test(navigator.userAgent);
        
        const isLocalhost = location.hostname === "localhost" || location.hostname === "127.0.0.1";
        const isFileProtocol = location.protocol === 'file:';
        const isLocalPort = location.port === '8080' || location.port === '3000';
        const isFirebaseHosted = location.hostname.includes('firebaseapp.com') || 
                                location.hostname.includes('web.app') ||
                                location.hostname.includes('netlify.app');

        window.debugLog('smartImages', `🔍 Environment Detection Details:`);
        window.debugLog('smartImages', `   Platform: ${navigator.platform}`);
        window.debugLog('smartImages', `   User Agent: ${navigator.userAgent.substring(0, 100)}...`);
        window.debugLog('smartImages', `   Location: ${location.protocol}//${location.hostname}:${location.port}`);
        window.debugLog('smartImages', `   isMac: ${isMac}, isiPhone: ${isiPhone}, isiPad: ${isiPad}`);
        window.debugLog('smartImages', `   isLocalhost: ${isLocalhost}, isFileProtocol: ${isFileProtocol}, isLocalPort: ${isLocalPort}`);
        window.debugLog('smartImages', `   isFirebaseHosted: ${isFirebaseHosted}`);

        // Priority-based detection (most specific first)
        if (isMac && (isFileProtocol || isLocalhost || isLocalPort)) {
            window.debugLog('smartImages', `✅ Detected: MAC_LOCAL (Mac with local/file access)`);
            return 'MAC_LOCAL';
        } else if (isiPhone && isFirebaseHosted) {
            window.debugLog('smartImages', `✅ Detected: IPHONE_FIREBASE (iPhone on Firebase hosting)`);
            return 'IPHONE_FIREBASE';
        } else if (isMac && isFirebaseHosted) {
            window.debugLog('smartImages', `⚠️ Detected: MAC_ON_FIREBASE (Mac accessing Firebase - no local image access)`);
            return 'MAC_ON_FIREBASE';  // New context for Mac accessing Firebase
        } else if (isFirebaseHosted) {
            window.debugLog('smartImages', `✅ Detected: WEB_FIREBASE (Web browser on Firebase hosting)`);
            return 'WEB_FIREBASE';
        } else {
            window.debugLog('smartImages', `⚠️ Detected: LEGACY (fallback mode)`);
            return 'LEGACY';
        }
    },

    // Environment-specific configuration with connection awareness
    getEnvironmentConfig() {
        const connectionType = this.detectConnectionType();
        
        switch (this.envContext) {
            case 'MAC_LOCAL':
                return {
                    source: "LOCAL_ONLY",
                    localPath: "RGimages/",
                    bypassFirebase: true,
                    description: "Mac local development - use RGimages symlink"
                };
            
            case 'IPHONE_FIREBASE':
                // Connection-aware folder selection for iPhone
                const iPhoneConfig = {
                    source: "FIREBASE_OPTIMIZED",
                    bypassLocal: true,
                    caching: "AGGRESSIVE",
                    connection: connectionType,
                    description: `iPhone - Firebase images (${connectionType.type})`
                };
                
                if (connectionType.isSlowConnection) {
                    // Slow connection: prioritize optimized images
                    iPhoneConfig.primaryFolder = "recipe-images";
                    iPhoneConfig.fallbackFolder = "images";
                    iPhoneConfig.description += " - optimized images prioritized";
                } else {
                    // Fast connection: can use full-size images
                    iPhoneConfig.primaryFolder = "images";
                    iPhoneConfig.fallbackFolder = "recipe-images";
                    iPhoneConfig.description += " - full-size images preferred";
                }
                
                return iPhoneConfig;
            
            case 'MAC_ON_FIREBASE':
                // Mac accessing Firebase - cannot access local RGimages, must use Firebase Storage
                return {
                    source: "FIREBASE_ONLY",
                    primaryFolder: connectionType.isSlowConnection ? "recipe-images" : "images",
                    fallbackFolder: connectionType.isSlowConnection ? "images" : "recipe-images",
                    connection: connectionType,
                    bypassLocal: true,
                    caching: "AGGRESSIVE",
                    description: `Mac on Firebase - Firebase Storage only (${connectionType.type})`
                };
            
            case 'WEB_FIREBASE':
                return {
                    source: "FIREBASE_HOSTED",
                    primaryPath: "RGimages/",       // Try hosted folder first
                    fallbackFolder: connectionType.isSlowConnection ? "recipe-images" : "images",
                    connection: connectionType,
                    description: `Web - Firebase hosted with ${connectionType.isSlowConnection ? 'optimized' : 'full-size'} fallback (${connectionType.type})`
                };
            
            default:
                return {
                    source: "LEGACY_FALLBACK",
                    description: "Legacy fallback mode"
                };
        }
    },

    // Detect connection type for smart image selection
    detectConnectionType() {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        let connectionInfo = {
            type: 'unknown',
            isSlowConnection: false,
            effectiveType: 'unknown'
        };

        if (connection) {
            connectionInfo = {
                type: connection.type || connection.effectiveType || 'unknown',
                effectiveType: connection.effectiveType || 'unknown',
                downlink: connection.downlink,
                rtt: connection.rtt,
                saveData: connection.saveData || false
            };

            // Determine if connection is slow
            // Slow connection indicators:
            // - effectiveType is 'slow-2g' or '2g' 
            // - saveData mode is enabled
            // - type is 'cellular' with low downlink
            connectionInfo.isSlowConnection = 
                connectionInfo.effectiveType === 'slow-2g' ||
                connectionInfo.effectiveType === '2g' ||
                connectionInfo.saveData ||
                (connectionInfo.type === 'cellular' && connectionInfo.downlink && connectionInfo.downlink < 1.5);
        } else {
            // Fallback: assume slow connection on mobile devices
            const isMobile = /iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent);
            connectionInfo.isSlowConnection = isMobile;
            connectionInfo.type = isMobile ? 'cellular' : 'wifi';
        }

        // Silent connection detection - only log once during init
        if (!this.connectionLogged) {
            window.debugLog('smartImages', `🌐 Connection detected:`, connectionInfo);
            this.connectionLogged = true;
        }
        return connectionInfo;
    },

    async getImageUrl(filename) {
        // Only log if debugging is specifically enabled for smartImages
        // Reduces noise when images are working correctly
        if (window.DEBUG_MODULES?.smartImages) {
            window.debugLog('smartImages', "🔍 getImageUrl called with:", filename);
        }
        if (!filename) return null;

        // Initialize if not done yet
        if (!this.config) {
            this.init();
        }

        // Track image request statistics
        this.imageStats.requested++;
        
        // Deduplication: prevent multiple simultaneous requests for same image
        if (this.loadingPromises.has(filename)) {
            this.imageStats.deduplicated++;
            return await this.loadingPromises.get(filename);
        }

        // Rate limiting: prevent excessive calls (max 1 per second per image)
        const lastCall = this.lastCallTime.get(filename);
        const now = Date.now();
        if (lastCall && (now - lastCall) < 1000) {
            // Silent rate limiting - no logging
            return null;
        }
        this.lastCallTime.set(filename, now);

        // Create loading promise for deduplication
        const loadingPromise = this.loadImageInternal(filename);
        this.loadingPromises.set(filename, loadingPromise);

        try {
            const result = await loadingPromise;
            
            // Track success/failure statistics
            if (result) {
                this.imageStats.loaded++;
            } else {
                this.imageStats.failed++;
            }
            
            // Show periodic summary instead of per-image logging
            const total = this.imageStats.requested;
            if (total > 0 && total % 50 === 0) {
                window.debugLog('smartImages', `📊 Image Loading Summary: ${this.imageStats.loaded} loaded, ${this.imageStats.failed} failed, ${this.imageStats.cached} cached, ${this.imageStats.deduplicated} deduplicated (${total} total)`);
            }
            
            return result;
        } finally {
            // Clean up loading promise
            this.loadingPromises.delete(filename);
        }
    },

    async loadImageInternal(filename) {
        const strategy = this.config;
        // console.log(`🔍 Loading image: ${filename} with ${this.envContext} strategy`);

        switch (this.envContext) {
            case 'MAC_LOCAL':
                return this.getMacLocalImage(filename);
            
            case 'MAC_ON_FIREBASE':
                return await this.getMacOnFirebaseImage(filename);
            
            case 'IPHONE_FIREBASE':
                return await this.getiPhoneFirebaseImage(filename);
            
            case 'WEB_FIREBASE':
                return await this.getWebFirebaseImage(filename);
            
            default:
                return await this.getLegacyImage(filename);
        }
    },

    // Mac Local: Direct RGimages folder access
    getMacLocalImage(filename) {
        const localPath = `RGimages/${filename}`;
        
        // Silent local access - no console spam
        // Track Firebase call avoidance for optimization metrics only
        if (window.firebaseSimulator) {
            window.firebaseSimulator.trackLocalOperation(`mac local image: ${filename}`, {
                localPath,
                strategy: 'MAC_LOCAL',
                firebaseCallAvoided: true,
                silent: true  // Don't log individual image accesses
            });
        }
        
        return localPath;
    },

    // Mac on Firebase: Cannot access local RGimages, Firebase Storage only
    async getMacOnFirebaseImage(filename) {
        // Check cache first for performance (silent)
        const cached = this.getCachedUrl(filename);
        if (cached) {
            this.imageStats.cached++;
            return cached;
        }

        // Connection-aware folder selection for Mac on Firebase (silent)
        const connectionType = this.detectConnectionType();
        
        let url = null;
        if (connectionType.isSlowConnection) {
            // Slow connection: prioritize optimized images
            url = await this.tryFirebaseWithSimulation("recipe-images", filename);
            if (!url) {
                url = await this.tryFirebaseWithSimulation("images", filename);
            }
        } else {
            // Fast connection: can use full-size images
            url = await this.tryFirebaseWithSimulation("images", filename);
            if (!url) {
                url = await this.tryFirebaseWithSimulation("recipe-images", filename);
            }
        }
        
        // Cache successful results (silent)
        if (url) {
            this.cacheUrl(filename, url, { cacheExpiration: "7" }); // 7 days for Mac
        } else {
            // Only log failures if debugging is enabled to reduce noise
            window.debugLog('smartImages', `❌ Image not found in Firebase Storage: ${filename}`);
        }
        
        return url;
    },

    // iPhone: Connection-aware Firebase Storage with aggressive caching
    async getiPhoneFirebaseImage(filename) {
        console.log(`📱 iPhone Firebase: ${filename}`);
        
        // Check cache first for mobile performance
        const cached = this.getCachedUrl(filename);
        if (cached) {
            console.log(`💾 iPhone Cache Hit: ${filename}`);
            return cached;
        }

        // Connection-aware folder selection for iPhone
        const connectionType = this.detectConnectionType();
        console.log(`📱 iPhone connection: ${connectionType.type} (slow: ${connectionType.isSlowConnection})`);
        
        let url = null;
        if (connectionType.isSlowConnection) {
            // Slow connection: prioritize optimized images
            console.log(`🐌 iPhone slow connection: trying recipe-images/ first`);
            url = await this.tryFirebaseWithSimulation("recipe-images", filename);
            
            // Fallback to full-size if optimized not found
            if (!url) {
                console.log(`🔄 iPhone fallback to full-size: ${filename}`);
                url = await this.tryFirebaseWithSimulation("images", filename);
            }
        } else {
            // Fast connection: can use full-size images
            console.log(`🚀 iPhone fast connection: trying images/ first`);
            url = await this.tryFirebaseWithSimulation("images", filename);
            
            // Fallback to optimized if full-size not found
            if (!url) {
                console.log(`🔄 iPhone fallback to optimized: ${filename}`);
                url = await this.tryFirebaseWithSimulation("recipe-images", filename);
            }
        }
        
        // Cache successful results aggressively on iPhone
        if (url) {
            this.cacheUrl(filename, url, { cacheExpiration: "30" }); // 30 days
            console.log(`✅ iPhone Firebase: ${filename} (connection: ${connectionType.type})`);
        } else {
            console.error(`❌ iPhone Firebase failed: ${filename} (tried both folders)`);
            console.error(`📱 iPhone Firebase diagnostics:`);
            console.error(`   Connection: ${connectionType.type} (${connectionType.effectiveType})`);
            console.error(`   Slow connection: ${connectionType.isSlowConnection}`);
            console.error(`   Firebase available: ${typeof firebase !== 'undefined' && firebase.storage ? 'YES' : 'NO'}`);
            console.error(`   Firebase disabled: ${window.FIREBASE_DISABLED ? 'YES' : 'NO'}`);
        }
        
        return url;
    },

    // Web: Try hosted RGimages first, then connection-aware Firebase Storage fallback
    async getWebFirebaseImage(filename) {
        console.log(`🌐 Web Firebase: ${filename}`);
        
        // Try hosted static files first (fastest)
        const hostedPath = `RGimages/${filename}`;
        if (await this.testHostedImage(hostedPath)) {
            console.log(`✅ Web hosted: ${hostedPath}`);
            return hostedPath;
        }
        
        // Connection-aware Firebase Storage fallback
        console.log(`🔄 Web fallback to Firebase Storage: ${filename}`);
        const connectionType = this.detectConnectionType();
        
        let url = null;
        if (connectionType.isSlowConnection) {
            // Slow connection: try optimized images first
            console.log(`🐌 Slow connection detected, trying recipe-images/ first`);
            url = await this.tryFirebaseWithSimulation("recipe-images", filename);
            
            // Fallback to full-size if optimized not found
            if (!url) {
                console.log(`🔄 recipe-images/ not found, trying images/ fallback`);
                url = await this.tryFirebaseWithSimulation("images", filename);
            }
        } else {
            // Fast connection: try full-size images first  
            console.log(`🚀 Fast connection detected, trying images/ first`);
            url = await this.tryFirebaseWithSimulation("images", filename);
            
            // Fallback to optimized if full-size not found
            if (!url) {
                console.log(`🔄 images/ not found, trying recipe-images/ fallback`);
                url = await this.tryFirebaseWithSimulation("recipe-images", filename);
            }
        }
        
        if (url) {
            console.log(`✅ Web Firebase Storage: ${filename} (connection: ${connectionType.type})`);
        } else {
            if (window.SHOW_MISSING_IMAGE_LOGS) console.warn(`❌ Web Firebase failed: ${filename} (tried both folders)`);
        }
        
        return url;
    },

    // Legacy mode for unknown environments
    async getLegacyImage(filename) {
        if (window.SHOW_MISSING_IMAGE_LOGS) console.log(`🔄 Legacy mode: ${filename}`);

        // Try local folder if set
        const folder = localStorage.getItem("localImageFolder");
        if (folder) {
            const localPath = `${folder}/${filename}`;
            if (await this.testLocalImage(localPath)) {
                if (window.SHOW_MISSING_IMAGE_LOGS) console.log(`📂 Legacy Local: ${localPath}`);
                return localPath;
            }
        }

        // Try Firebase as fallback
        let url = await this.tryFirebaseWithSimulation("recipe-images", filename);
        if (!url) url = await this.tryFirebaseWithSimulation("images", filename);

        return url;
    },

    // Firebase image loading with caching support and simulation tracking
    async getFirebaseImageWithCaching(filename, strategy) {
        // AGGRESSIVE CACHING: Check simulator cache first
        if (window.firebaseSimulator) {
            const cachedUrl = window.firebaseSimulator.getCachedImage(filename);
            if (cachedUrl) {
                console.log(`💾 Simulator Cache Hit: ${filename}`);
                return cachedUrl;
            }
        }

        // Check legacy cache for mobile strategies
        if (strategy.caching && strategy.caching !== "NONE_NEEDED") {
            const cached = this.getCachedUrl(filename);
            if (cached) {
                console.log(`💾 Legacy Cache: ${filename}`);
                // Also cache in simulator for future use
                if (window.firebaseSimulator) {
                    window.firebaseSimulator.cacheImage(filename, cached, { source: 'legacy_cache' });
                }
                return cached;
            }
        }

        // Firebase calls with simulation tracking
        console.log(`🔥 Firebase: ${filename}`);
        let url = await this.tryFirebaseWithSimulation("recipe-images", filename);
        if (!url) url = await this.tryFirebaseWithSimulation("images", filename);
        
        if (url && strategy.caching && strategy.caching !== "NONE_NEEDED") {
            this.cacheUrl(filename, url, strategy);
        }
        
        // Cache successful result in simulator
        if (url && window.firebaseSimulator) {
            window.firebaseSimulator.cacheImage(filename, url, { 
                source: 'firebase',
                strategy: strategy.source
            });
        }
        
        if (!url && window.SHOW_MISSING_IMAGE_LOGS) console.warn(`❌ Not found in Firebase: ${filename}`);
        return url;
    },

    // Cache management for mobile devices
    getCachedUrl(filename) {
        if (!this.imageCache) this.imageCache = new Map();
        
        const cached = this.imageCache.get(filename);
        if (!cached) return null;
        
        // Check expiration
        if (cached.expires && Date.now() > cached.expires) {
            this.imageCache.delete(filename);
            return null;
        }
        
        return cached.url;
    },

    cacheUrl(filename, url, strategy) {
        if (!this.imageCache) this.imageCache = new Map();
        
        let expires = null;
        if (strategy.cacheExpiration) {
            const days = parseInt(strategy.cacheExpiration) || 7;
            expires = Date.now() + (days * 24 * 60 * 60 * 1000);
        }
        
        this.imageCache.set(filename, { 
            url, 
            expires, 
            cached: Date.now(),
            strategy: strategy.source 
        });
        
        // Silent caching - no individual file logging
    },

    // Firebase call with simulation tracking
    async tryFirebaseWithSimulation(folder, filename) {
        const filepath = `${folder}/${filename}`;
        
        // Track the call in simulator
        if (window.firebaseSimulator) {
            if (window.firebaseSimulator.isSimulationMode) {
                // In simulation mode, return simulated result
                return await window.firebaseSimulator.simulateStorageDownload(filepath);
            } else {
                // In real mode, track the call but execute normally  
                window.firebaseSimulator.trackCall('storage_download', `download ${filepath}`, { 
                    folder, 
                    filename 
                });
            }
        }
        
        // Execute real Firebase call
        return await this.tryFirebase(folder, filename);
    },

    async tryFirebase(folder, filename) {
        try {
            // Check if Firebase is available
            if (typeof firebase === 'undefined' || !firebase.storage) {
                console.error(`🚨 Firebase not available for image loading: ${folder}/${filename}`);
                return null;
            }
            
            // Check if app is running in local mode where Firebase is disabled
            if (window.FIREBASE_DISABLED) {
                window.debugLog('smartImages', `🔒 Firebase disabled (local mode): ${folder}/${filename}`);
                return null;
            }
            
            // CRITICAL: Check Firebase authentication before accessing Storage
            if (firebase.auth) {
                const user = firebase.auth().currentUser;
                if (!user) {
                    // Reduce noise: only log if smartImages debugging is enabled
                    window.debugLog('smartImages', `🔐 No Firebase user authenticated for image: ${folder}/${filename}`);
                    window.debugLog('smartImages', `   📋 Try: Sign in first, or check authentication status`);
                    return null;
                }
                window.debugLog('smartImages', `✅ Firebase user authenticated: ${user.uid} (anonymous: ${user.isAnonymous})`);
            }
            
            const ref = firebase.storage().ref(`${folder}/${filename}`);
            const url = await ref.getDownloadURL();
            // Silent success - only log errors
            return url;
        } catch (e) {
            // Only log non-404 errors to reduce console noise
            if (e.code !== 'storage/object-not-found') {
                console.warn(`❌ Firebase Storage error: ${folder}/${filename} - ${e.code}: ${e.message}`);
                
                if (e.code === 'storage/unauthorized') {
                    console.warn(`   🔐 Solution: Check authentication and Storage rules`);
                }
            }
            // Silent 404 errors - images simply don't exist
            return null;
        }
    },

    async testLocalImage(path) {
        return new Promise(resolve => {
            const img = new Image();
            img.onload = () => {
                // console.log(`✅ Local image found: ${path}`);
                resolve(true);
            };
            img.onerror = () => {
                // console.log(`❌ Local image failed: ${path}`); // Keep errors commented for less noise
                resolve(false);
            };
            img.src = path;
        });
    },

    // Debug information with connection details
    getDebugInfo() {
        const connectionType = this.detectConnectionType();
        return {
            context: this.envContext,
            config: this.config,
            connection: connectionType,
            cacheSize: this.imageCache ? this.imageCache.size : 0,
            cached: this.imageCache ? Array.from(this.imageCache.keys()) : [],
            imageStrategy: {
                primaryFolder: this.config?.primaryFolder || this.config?.fallbackFolder || 'N/A',
                fallbackFolder: this.config?.fallbackFolder || 'N/A',
                reasonForChoice: connectionType.isSlowConnection ? 
                    'Optimized images chosen for slow connection' : 
                    'Full-size images chosen for fast connection'
            }
        };
    },

    /**
     * Check if app is running on Firebase Hosting (iPhone/web)
     */
    isFirebaseHosted() {
        // Check if we're on a hosted domain (not localhost or file://)
        const isHosted = location.protocol === 'https:' && 
                        !location.hostname.includes('localhost') &&
                        !location.hostname.includes('127.0.0.1');
        
        // Also check for Firebase hosting indicators
        const isFirebaseHost = location.hostname.includes('firebaseapp.com') ||
                              location.hostname.includes('web.app') ||
                              location.hostname.includes('netlify.app');
        
        console.log(`📱 Firebase hosted check: ${isHosted || isFirebaseHost} (protocol: ${location.protocol}, host: ${location.hostname})`);
        return isHosted || isFirebaseHost;
    },

    /**
     * Test if hosted static image exists (for Firebase hosting)
     */
    async testHostedImage(imagePath) {
        try {
            // Create a temporary image element to test if the hosted file exists
            return new Promise((resolve) => {
                const img = new Image();
                
                // Set a timeout to avoid hanging
                const timeout = setTimeout(() => {
                    // console.log(`⏰ Timeout testing hosted image: ${imagePath}`);
                    resolve(false);
                }, 2000);
                
                img.onload = () => {
                    clearTimeout(timeout);
                    // console.log(`✅ Hosted image found: ${imagePath}`);
                    resolve(true);
                };
                
                img.onerror = () => {
                    clearTimeout(timeout);
                    // console.log(`❌ Hosted image not found: ${imagePath}`);
                    resolve(false);
                };
                
                // Test the hosted path
                img.src = imagePath;
            });
        } catch (error) {
            if (window.SHOW_MISSING_IMAGE_LOGS) console.warn(`Error testing hosted image ${imagePath}:`, error);
            return false;
        }
    }
};

// Initialize when environment config is ready
window.addEventListener('environmentConfigReady', () => {
    smartImages.init(); // ENABLED - needed for image loading
});

// Also try to initialize immediately if config is already available
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => smartImages.init());
} else {
    smartImages.init(); // ENABLED - needed for image loading
}

window.smartImages = smartImages;

// Global debugging functions for connection-aware testing
window.testImageConnection = () => {
    const debugInfo = smartImages.getDebugInfo();
    console.log('\n🔍 CONNECTION-AWARE IMAGE SYSTEM DEBUG');
    console.log('=====================================');
    console.log('📱 Environment:', debugInfo.context);
    console.log('🌐 Connection:', debugInfo.connection);
    console.log('📂 Image Strategy:', debugInfo.imageStrategy);
    console.log('💾 Cache Status:', `${debugInfo.cacheSize} images cached`);
    console.log('⚙️ Config:', debugInfo.config);
    return debugInfo;
};

window.simulateSlowConnection = () => {
    console.log('🐌 Simulating slow connection...');
    // Override connection detection temporarily
    const originalDetect = smartImages.detectConnectionType;
    smartImages.detectConnectionType = () => ({
        type: 'cellular',
        effectiveType: '2g',
        isSlowConnection: true,
        downlink: 0.5,
        rtt: 2000,
        saveData: false
    });
    
    // Force re-initialization
    smartImages.init(); // ENABLED - needed for connection simulation
    console.log('📱 Image system reconfigured for slow connection');
    console.log('🖼️ Will prioritize recipe-images/ folder for optimization');
    
    // Test a sample image
    window.testImageConnection();
    
    // Restore original detection after 30 seconds
    setTimeout(() => {
        smartImages.detectConnectionType = originalDetect;
        smartImages.init(); // ENABLED - needed to restore normal operation
        console.log('🚀 Connection simulation ended, restored to real detection');
    }, 30000);
};

window.simulateFastConnection = () => {
    console.log('🚀 Simulating fast connection...');
    const originalDetect = smartImages.detectConnectionType;
    smartImages.detectConnectionType = () => ({
        type: 'wifi',
        effectiveType: '4g',
        isSlowConnection: false,
        downlink: 10,
        rtt: 50,
        saveData: false
    });
    
    smartImages.init(); // ENABLED - needed for connection simulation
    console.log('📱 Image system reconfigured for fast connection');
    console.log('🖼️ Will prioritize images/ folder for full-size images');
    
    window.testImageConnection();
    
    setTimeout(() => {
        smartImages.detectConnectionType = originalDetect;
        smartImages.init(); // ENABLED - needed to restore normal operation
        console.log('🌐 Connection simulation ended, restored to real detection');
    }, 30000);
};

// iPhone-specific debugging function
window.debugiPhoneImages = () => {
    console.log('\n📱 iPHONE IMAGE LOADING DIAGNOSTICS');
    console.log('===================================');
    
    // Environment detection
    const debugInfo = smartImages.getDebugInfo();
    console.log('🔍 Environment Context:', debugInfo.context);
    console.log('🌐 Connection Info:', debugInfo.connection);
    console.log('⚙️ Image Strategy:', debugInfo.imageStrategy);
    
    // Firebase status
    console.log('\n🔥 FIREBASE STATUS');
    console.log('Firebase available:', typeof firebase !== 'undefined' ? 'YES' : 'NO');
    console.log('Firebase Storage available:', typeof firebase !== 'undefined' && firebase.storage ? 'YES' : 'NO');
    console.log('Firebase disabled flag:', window.FIREBASE_DISABLED ? 'YES' : 'NO');
    
    // Authentication status
    if (typeof firebase !== 'undefined' && firebase.auth) {
        const user = firebase.auth().currentUser;
        console.log('Firebase Auth user:', user ? `${user.uid} (${user.isAnonymous ? 'anonymous' : 'authenticated'})` : 'NO USER');
    }
    
    // Cache status
    console.log('\n💾 CACHE STATUS');
    console.log('Image cache size:', debugInfo.cacheSize);
    if (window.firebaseSimulator) {
        const stats = window.firebaseSimulator.getCallStats();
        console.log('Firebase simulator cached images:', stats.caching.cachedImages);
    }
    
    console.log('\n🧪 TESTING RECOMMENDATIONS');
    console.log('1. Enable Firebase simulation: enableFirebaseSimulation()');
    console.log('2. Test image loading: Go to Recipes tab and check console logs');
    console.log('3. Check Firebase status: Look for "Firebase available" and auth status above');
    console.log('4. Clear cache if needed: clearFirebaseCache()');
    
    return debugInfo;
};

window.debugLog('smartImages', "🧠 Smart Image System loaded - v7.1.0-connection-aware-firebase");
