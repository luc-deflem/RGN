/**
 * FIREBASE SIMULATOR & CALL TRACKER
 * 
 * Simulates Firebase operations to track API call usage without real connections
 * Includes aggressive local caching to minimize actual Firebase usage
 * Version: 3.0.2-simulator
 */

class FirebaseSimulator {
    constructor() {
        this.callTracker = {
            reads: 0,
            writes: 0,
            deletes: 0,
            storageDownloads: 0,
            storageUploads: 0,
            listeners: 0,
            totalCalls: 0,
            sessionStartTime: new Date().toISOString(),
            callHistory: [],
            cachedImages: new Map(), // Local image cache
            cachedData: new Map()    // Local data cache
        };
        
        this.isSimulationMode = false;
        this.simulatedDelay = 100; // ms delay to simulate network
        
        this.initializeLocalCaches();
    }

    /**
     * Initialize local caching systems
     */
    initializeLocalCaches() {
        // Load cached images from localStorage
        try {
            const cachedImages = localStorage.getItem('firebase_image_cache');
            if (cachedImages) {
                this.callTracker.cachedImages = new Map(JSON.parse(cachedImages));
                console.log(`📸 Loaded ${this.callTracker.cachedImages.size} cached images`);
            }
        } catch (e) {
            console.warn('Could not load image cache:', e);
        }

        // Load cached data from localStorage
        try {
            const cachedData = localStorage.getItem('firebase_data_cache');
            if (cachedData) {
                this.callTracker.cachedData = new Map(JSON.parse(cachedData));
                console.log(`📊 Loaded ${this.callTracker.cachedData.size} cached data entries`);
            }
        } catch (e) {
            console.warn('Could not load data cache:', e);
        }
    }

    /**
     * Enable simulation mode
     */
    enableSimulation() {
        this.isSimulationMode = true;
        console.log('🎭 Firebase Simulation Mode ENABLED');
        console.log('📊 All Firebase calls will be tracked but not executed');
        
        // Reset counters for new simulation session
        this.resetCounters();
    }

    /**
     * Disable simulation mode
     */
    disableSimulation() {
        this.isSimulationMode = false;
        console.log('🔥 Firebase Simulation Mode DISABLED - Real calls will be made');
    }

    /**
     * Reset call counters
     */
    resetCounters() {
        const oldTotal = this.callTracker.totalCalls;
        this.callTracker = {
            ...this.callTracker,
            reads: 0,
            writes: 0,
            deletes: 0,
            storageDownloads: 0,
            storageUploads: 0,
            listeners: 0,
            totalCalls: 0,
            sessionStartTime: new Date().toISOString(),
            callHistory: []
        };
        
        console.log(`🔄 Call counters reset (previous session: ${oldTotal} calls)`);
    }

    /**
     * Track local-only operations (no Firebase call needed)
     */
    trackLocalOperation(operation, details = {}) {
        const call = {
            timestamp: new Date().toISOString(),
            type: 'local_only',
            operation,
            details: { ...details, firebaseCallsAvoided: 1 },
            cached: false,
            local: true
        };

        this.callTracker.callHistory.push(call);
        
        // Don't increment totalCalls since no Firebase call was made
        // But track the operation for visibility
        
        // console.log(`🏠 [LOCAL] ${operation}`, details);
        return call;
    }

    /**
     * Track a Firebase call
     */
    trackCall(type, operation, details = {}) {
        const call = {
            timestamp: new Date().toISOString(),
            type,
            operation,
            details,
            cached: details.cached || false
        };

        this.callTracker.callHistory.push(call);
        this.callTracker.totalCalls++;

        // Increment specific counters
        switch (type) {
            case 'firestore_read':
                this.callTracker.reads++;
                break;
            case 'firestore_write':
                this.callTracker.writes++;
                break;
            case 'firestore_delete':
                this.callTracker.deletes++;
                break;
            case 'storage_download':
                this.callTracker.storageDownloads++;
                break;
            case 'storage_upload':
                this.callTracker.storageUploads++;
                break;
            case 'listener':
                this.callTracker.listeners++;
                break;
        }

        // Log the call if in simulation mode
        if (this.isSimulationMode) {
            const cacheStatus = call.cached ? '💾' : '🌐';
            console.log(`${cacheStatus} [SIM] ${type}: ${operation}`, details);
        }

        return call;
    }

    /**
     * Cache image URL locally with aggressive caching
     */
    cacheImage(filename, url, metadata = {}) {
        const cacheEntry = {
            url,
            timestamp: new Date().toISOString(),
            accessCount: 1,
            metadata
        };

        this.callTracker.cachedImages.set(filename, cacheEntry);
        
        // Persist to localStorage
        try {
            const cacheArray = Array.from(this.callTracker.cachedImages.entries());
            localStorage.setItem('firebase_image_cache', JSON.stringify(cacheArray));
        } catch (e) {
            console.warn('Could not persist image cache:', e);
        }

        console.log(`📸 Cached image: ${filename}`);
    }

    /**
     * Get cached image URL
     */
    getCachedImage(filename) {
        const cached = this.callTracker.cachedImages.get(filename);
        if (cached) {
            cached.accessCount++;
            cached.lastAccessed = new Date().toISOString();
            console.log(`💾 Using cached image: ${filename} (accessed ${cached.accessCount} times)`);
            return cached.url;
        }
        return null;
    }

    /**
     * Cache data locally
     */
    cacheData(key, data, ttl = 5 * 60 * 1000) { // 5 minute default TTL
        const cacheEntry = {
            data,
            timestamp: new Date().toISOString(),
            ttl,
            accessCount: 1
        };

        this.callTracker.cachedData.set(key, cacheEntry);
        
        // Persist to localStorage
        try {
            const cacheArray = Array.from(this.callTracker.cachedData.entries());
            localStorage.setItem('firebase_data_cache', JSON.stringify(cacheArray));
        } catch (e) {
            console.warn('Could not persist data cache:', e);
        }
    }

    /**
     * Get cached data with TTL check
     */
    getCachedData(key) {
        const cached = this.callTracker.cachedData.get(key);
        if (cached) {
            const age = Date.now() - new Date(cached.timestamp).getTime();
            if (age < cached.ttl) {
                cached.accessCount++;
                cached.lastAccessed = new Date().toISOString();
                console.log(`💾 Using cached data: ${key} (age: ${Math.round(age/1000)}s)`);
                return cached.data;
            } else {
                // Remove expired cache
                this.callTracker.cachedData.delete(key);
                console.log(`🗑️ Expired cache removed: ${key}`);
            }
        }
        return null;
    }

    /**
     * Simulate Firebase Firestore operations
     */
    async simulateFirestoreRead(collection, docId = null) {
        const operation = docId ? `get doc ${collection}/${docId}` : `get collection ${collection}`;
        
        // Check cache first
        const cacheKey = `${collection}${docId ? `/${docId}` : ''}`;
        const cachedResult = this.getCachedData(cacheKey);
        
        if (cachedResult) {
            this.trackCall('firestore_read', operation, { cached: true, collection, docId });
            return cachedResult;
        }

        this.trackCall('firestore_read', operation, { collection, docId });

        if (this.isSimulationMode) {
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, this.simulatedDelay));
            
            // Return mock data
            const mockData = this.generateMockData(collection, docId);
            
            // Cache the result
            this.cacheData(cacheKey, mockData);
            
            return mockData;
        }

        // If not in simulation mode, this would make the real call
        return null;
    }

    /**
     * Simulate Firebase Firestore writes
     */
    async simulateFirestoreWrite(collection, docId, data) {
        const operation = `write doc ${collection}/${docId}`;
        this.trackCall('firestore_write', operation, { collection, docId, dataSize: JSON.stringify(data).length });

        if (this.isSimulationMode) {
            await new Promise(resolve => setTimeout(resolve, this.simulatedDelay));
            
            // Update cache
            const cacheKey = `${collection}/${docId}`;
            this.cacheData(cacheKey, data);
            
            return { success: true, docId };
        }

        return null;
    }

    /**
     * Simulate Firebase Storage operations
     */
    async simulateStorageDownload(filename) {
        // Check cache first - CRITICAL for images
        const cachedUrl = this.getCachedImage(filename);
        if (cachedUrl) {
            this.trackCall('storage_download', `get ${filename}`, { cached: true, filename });
            return cachedUrl;
        }

        this.trackCall('storage_download', `download ${filename}`, { filename });

        if (this.isSimulationMode) {
            await new Promise(resolve => setTimeout(resolve, this.simulatedDelay * 2)); // Storage is slower
            
            // Generate mock URL and cache it
            const mockUrl = `https://mock-firebase-storage.com/${filename}?t=${Date.now()}`;
            this.cacheImage(filename, mockUrl);
            
            return mockUrl;
        }

        return null;
    }

    /**
     * Generate mock data for testing
     */
    generateMockData(collection, docId) {
        const mockData = {
            id: docId || `mock_${Date.now()}`,
            timestamp: new Date().toISOString(),
            collection
        };

        switch (collection) {
            case 'shoppingItems':
                return {
                    ...mockData,
                    items: [
                        { id: 1, name: 'Mock Bananas', completed: false },
                        { id: 2, name: 'Mock Milk', completed: true }
                    ]
                };
            case 'standardItems':
                return {
                    ...mockData,
                    items: [
                        { id: 1, name: 'Mock Olive Oil', inStock: true },
                        { id: 2, name: 'Mock Salt', inStock: false }
                    ]
                };
            default:
                return mockData;
        }
    }

    /**
     * Get detailed call statistics
     */
    getCallStats() {
        const sessionDuration = Date.now() - new Date(this.callTracker.sessionStartTime).getTime();
        const durationMinutes = Math.round(sessionDuration / 60000);

        // Calculate local operations and Firebase calls avoided
        const localOperations = this.callTracker.callHistory.filter(call => call.local);
        const firebaseCallsAvoided = localOperations.reduce((sum, call) => 
            sum + (call.details.firebaseCallsAvoided || 0), 0);

        const stats = {
            session: {
                startTime: this.callTracker.sessionStartTime,
                duration: `${durationMinutes} minutes`,
                simulationMode: this.isSimulationMode,
                totalOperations: this.callTracker.callHistory.length
            },
            calls: {
                totalFirebaseCalls: this.callTracker.totalCalls,
                firestoreReads: this.callTracker.reads,
                firestoreWrites: this.callTracker.writes,
                firestoreDeletes: this.callTracker.deletes,
                storageDownloads: this.callTracker.storageDownloads,
                storageUploads: this.callTracker.storageUploads,
                listeners: this.callTracker.listeners
            },
            localOptimization: {
                localOperations: localOperations.length,
                firebaseCallsAvoided: firebaseCallsAvoided,
                quotaSaved: `${firebaseCallsAvoided} calls`
            },
            caching: {
                cachedImages: this.callTracker.cachedImages.size,
                cachedData: this.callTracker.cachedData.size,
                cacheHitRate: this.calculateCacheHitRate()
            },
            projectedCosts: this.calculateProjectedCosts()
        };

        return stats;
    }

    /**
     * Calculate cache hit rate
     */
    calculateCacheHitRate() {
        const cachedCalls = this.callTracker.callHistory.filter(call => call.cached).length;
        const totalCalls = this.callTracker.callHistory.length;
        return totalCalls > 0 ? Math.round((cachedCalls / totalCalls) * 100) : 0;
    }

    /**
     * Calculate projected Firebase costs
     */
    calculateProjectedCosts() {
        // Firebase pricing (approximate)
        const costs = {
            firestoreRead: 0.36 / 100000,  // $0.36 per 100k reads
            firestoreWrite: 1.08 / 100000, // $1.08 per 100k writes
            firestoreDelete: 0.02 / 1000,  // $0.02 per 1k deletes
            storageDownload: 0.12 / 1000,  // $0.12 per GB (assume 1MB per image)
            storageUpload: 0.12 / 1000
        };

        const projectedCost = 
            (this.callTracker.reads * costs.firestoreRead) +
            (this.callTracker.writes * costs.firestoreWrite) +
            (this.callTracker.deletes * costs.firestoreDelete) +
            (this.callTracker.storageDownloads * costs.storageDownload) +
            (this.callTracker.storageUploads * costs.storageUpload);

        return {
            estimated: `$${projectedCost.toFixed(4)}`,
            breakdown: {
                reads: `$${(this.callTracker.reads * costs.firestoreRead).toFixed(4)}`,
                writes: `$${(this.callTracker.writes * costs.firestoreWrite).toFixed(4)}`,
                storage: `$${((this.callTracker.storageDownloads + this.callTracker.storageUploads) * costs.storageDownload).toFixed(4)}`
            }
        };
    }

    /**
     * Display comprehensive statistics
     */
    displayStats() {
        const stats = this.getCallStats();
        
        console.log(`\n🔥 FIREBASE CALL STATISTICS`);
        console.log(`========================================`);
        console.log(`📊 Session: ${stats.session.duration} (${stats.session.simulationMode ? 'SIMULATION' : 'REAL'})`);
        console.log(`🎯 Total Operations Monitored: ${stats.session.totalOperations}`);
        console.log(`\n📞 FIREBASE CALLS`);
        console.log(`🔥 Total Firebase Calls: ${stats.calls.totalFirebaseCalls}`);
        console.log(`📖 Firestore Reads: ${stats.calls.firestoreReads}`);
        console.log(`✏️ Firestore Writes: ${stats.calls.firestoreWrites}`);
        console.log(`🗑️ Firestore Deletes: ${stats.calls.firestoreDeletes}`);
        console.log(`📥 Storage Downloads: ${stats.calls.storageDownloads}`);
        console.log(`📤 Storage Uploads: ${stats.calls.storageUploads}`);
        console.log(`👂 Listeners: ${stats.calls.listeners}`);
        console.log(`\n🏠 LOCAL OPTIMIZATION`);
        console.log(`🏡 Local Operations: ${stats.localOptimization.localOperations}`);
        console.log(`💡 Firebase Calls Avoided: ${stats.localOptimization.firebaseCallsAvoided}`);
        console.log(`💚 Quota Saved: ${stats.localOptimization.quotaSaved}`);
        console.log(`\n💾 CACHING PERFORMANCE`);
        console.log(`📸 Cached Images: ${stats.caching.cachedImages}`);
        console.log(`📊 Cached Data: ${stats.caching.cachedData}`);
        console.log(`🎯 Cache Hit Rate: ${stats.caching.cacheHitRate}%`);
        console.log(`\n💰 PROJECTED COSTS`);
        console.log(`💵 Total Estimated: ${stats.projectedCosts.estimated}`);
        console.log(`   📖 Reads: ${stats.projectedCosts.breakdown.reads}`);
        console.log(`   ✏️ Writes: ${stats.projectedCosts.breakdown.writes}`);
        console.log(`   📦 Storage: ${stats.projectedCosts.breakdown.storage}`);
        
        return stats;
    }

    /**
     * Clear all caches
     */
    clearCaches() {
        this.callTracker.cachedImages.clear();
        this.callTracker.cachedData.clear();
        
        localStorage.removeItem('firebase_image_cache');
        localStorage.removeItem('firebase_data_cache');
        
        console.log('🗑️ All caches cleared');
    }
}

// Create global instance
window.firebaseSimulator = new FirebaseSimulator();

// Global convenience functions
window.enableFirebaseSimulation = () => window.firebaseSimulator.enableSimulation();
window.disableFirebaseSimulation = () => window.firebaseSimulator.disableSimulation();
window.showFirebaseStats = () => window.firebaseSimulator.displayStats();
window.clearFirebaseCache = () => window.firebaseSimulator.clearCaches();
window.firebaseSimulatorStatus = () => {
    const stats = window.firebaseSimulator.getCallStats();
    console.log(`🎭 Simulator: ${stats.session.simulationMode ? 'ON' : 'OFF'} | Operations: ${stats.session.totalOperations} | Firebase Calls: ${stats.calls.totalFirebaseCalls} | Local Operations: ${stats.localOptimization.localOperations}`);
    return stats;
};

// Helper function to test production mode with simulation
window.testProdModeWithSimulation = () => {
    console.log(`\n🎯 TESTING PROD MODE WITH FIREBASE SIMULATION`);
    console.log(`=============================================`);
    console.log(`\n📋 INSTRUCTIONS:`);
    console.log(`1. Enable Firebase simulation:`);
    console.log(`   enableFirebaseSimulation()`);
    console.log(`\n2. Switch to Production mode:`);
    console.log(`   Click the 🔧 DEV button to switch to 🚀 PROD`);
    console.log(`\n3. Test Firebase operations:`);
    console.log(`   - Add/remove items from shopping list`);
    console.log(`   - Toggle pantry items`);
    console.log(`   - Open recipes tab (for image simulation)`);
    console.log(`\n4. Check simulation results:`);
    console.log(`   showFirebaseStats()`);
    console.log(`\n5. See live status anytime:`);
    console.log(`   firebaseSimulatorStatus()`);
    console.log(`\n✅ You'll see all Firebase calls that WOULD be made, but with 0 quota usage!`);
    console.log(`\n🎭 Let's start:`);
    
    window.firebaseSimulator.resetCounters();
    window.firebaseSimulator.enableSimulation();
};

// Firebase Simulator loaded - use enableFirebaseSimulation(), showFirebaseStats(), firebaseSimulatorStatus()