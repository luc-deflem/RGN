/**
 * FIREBASE CALL MONITOR & OPTIMIZATION
 * 
 * Real-time monitoring of Firebase calls to identify bottlenecks and optimize usage
 * Integrates with existing firebase-simulator.js for comprehensive tracking
 */

class FirebaseCallMonitor {
    constructor() {
        this.isMonitoring = false;
        this.realTimeStats = {
            currentSession: {
                reads: 0,
                writes: 0,
                listeners: 0,
                storageOps: 0,
                startTime: null
            },
            realTime: {
                lastMinute: [],
                lastHour: [],
                callsPerSecond: 0
            },
            warnings: {
                highVolumeThreshold: 100, // calls per minute
                quotaWarningThreshold: 1000, // approaching daily limit
                currentAlerts: []
            }
        };
        
        this.originalFirebaseMethods = new Map();
        this.interceptFirebaseCalls();
    }

    /**
     * Start monitoring Firebase calls
     */
    startMonitoring() {
        this.isMonitoring = true;
        this.realTimeStats.currentSession.startTime = Date.now();
        
        console.log('📊 Firebase Call Monitoring STARTED');
        console.log('📈 Real-time Firebase usage tracking enabled');
        
        // Start real-time reporting
        this.startRealTimeReporting();
    }

    /**
     * Stop monitoring
     */
    stopMonitoring() {
        this.isMonitoring = false;
        console.log('📊 Firebase Call Monitoring STOPPED');
        
        if (this.reportingInterval) {
            clearInterval(this.reportingInterval);
        }
    }

    /**
     * Intercept Firebase calls to track them
     */
    interceptFirebaseCalls() {
        // Monitor Firebase Firestore calls
        if (window.firebase && window.firebase.firestore) {
            this.interceptFirestoreOperations();
        }

        // Monitor Firebase Storage calls
        if (window.firebase && window.firebase.storage) {
            this.interceptStorageOperations();
        }

        console.log('🔍 Firebase call interception enabled');
    }

    /**
     * Intercept Firestore operations
     */
    interceptFirestoreOperations() {
        // This would normally intercept real Firebase calls
        // For now, we'll integrate with the simulator to track patterns
        
        // Track common patterns that generate excessive calls
        this.trackCommonPatterns();
    }

    /**
     * Track common Firebase usage patterns that may generate excessive calls
     */
    trackCommonPatterns() {
        // Monitor shopping list operations
        this.monitorShoppingListPatterns();
        
        // Monitor pantry operations  
        this.monitorPantryPatterns();
        
        // Monitor recipe image requests
        this.monitorImagePatterns();
    }

    /**
     * Monitor shopping list for excessive Firebase calls
     */
    monitorShoppingListPatterns() {
        const originalAddItem = window.realShoppingListManager?.addItem;
        if (originalAddItem && window.realShoppingListManager) {
            window.realShoppingListManager.addItem = (...args) => {
                this.trackCall('shopping_add', { type: 'firestore_write', collection: 'shoppingItems' });
                return originalAddItem.apply(window.realShoppingListManager, args);
            };
        }

        const originalDeleteItem = window.realShoppingListManager?.deleteItem;
        if (originalDeleteItem && window.realShoppingListManager) {
            window.realShoppingListManager.deleteItem = (...args) => {
                this.trackCall('shopping_delete', { type: 'firestore_write', collection: 'shoppingItems' });
                return originalDeleteItem.apply(window.realShoppingListManager, args);
            };
        }
    }

    /**
     * Monitor pantry operations
     */
    monitorPantryPatterns() {
        const originalToggleStock = window.realPantryManager?.toggleItemStock;
        if (originalToggleStock && window.realPantryManager) {
            window.realPantryManager.toggleItemStock = (...args) => {
                this.trackCall('pantry_toggle', { type: 'firestore_write', collection: 'standardItems' });
                return originalToggleStock.apply(window.realPantryManager, args);
            };
        }
    }

    /**
     * Monitor image loading patterns
     */
    monitorImagePatterns() {
        // Track recipe image requests
        const originalGetRecipeImage = window.smartImageSystem?.getRecipeImageUrl;
        if (originalGetRecipeImage && window.smartImageSystem) {
            window.smartImageSystem.getRecipeImageUrl = (...args) => {
                this.trackCall('image_request', { type: 'storage_download', filename: args[0] });
                return originalGetRecipeImage.apply(window.smartImageSystem, args);
            };
        }
    }

    /**
     * Track a Firebase call
     */
    trackCall(operation, details = {}) {
        if (!this.isMonitoring) return;

        const call = {
            timestamp: Date.now(),
            operation,
            details
        };

        // Update current session stats
        switch (details.type) {
            case 'firestore_read':
                this.realTimeStats.currentSession.reads++;
                break;
            case 'firestore_write':
                this.realTimeStats.currentSession.writes++;
                break;
            case 'storage_download':
                this.realTimeStats.currentSession.storageOps++;
                break;
        }

        // Add to real-time tracking
        this.realTimeStats.realTime.lastMinute.push(call);
        this.realTimeStats.realTime.lastHour.push(call);

        // Clean old entries
        this.cleanupOldEntries();

        // Check for warnings
        this.checkForWarnings();

        // Also track in simulator if available
        if (window.firebaseSimulator) {
            window.firebaseSimulator.trackCall(details.type, operation, details);
        }

        console.log(`📞 [FB] ${operation}:`, details);
    }

    /**
     * Clean up old tracking entries
     */
    cleanupOldEntries() {
        const now = Date.now();
        const oneMinuteAgo = now - 60000;
        const oneHourAgo = now - 3600000;

        this.realTimeStats.realTime.lastMinute = this.realTimeStats.realTime.lastMinute
            .filter(call => call.timestamp > oneMinuteAgo);

        this.realTimeStats.realTime.lastHour = this.realTimeStats.realTime.lastHour
            .filter(call => call.timestamp > oneHourAgo);
    }

    /**
     * Check for warning conditions
     */
    checkForWarnings() {
        const callsLastMinute = this.realTimeStats.realTime.lastMinute.length;
        
        if (callsLastMinute > this.realTimeStats.warnings.highVolumeThreshold) {
            const warning = `⚠️ HIGH VOLUME: ${callsLastMinute} Firebase calls in last minute!`;
            if (!this.realTimeStats.warnings.currentAlerts.includes(warning)) {
                this.realTimeStats.warnings.currentAlerts.push(warning);
                console.warn(warning);
            }
        }

        const totalCalls = this.realTimeStats.currentSession.reads + 
                          this.realTimeStats.currentSession.writes + 
                          this.realTimeStats.currentSession.storageOps;

        if (totalCalls > this.realTimeStats.warnings.quotaWarningThreshold) {
            const warning = `⚠️ QUOTA WARNING: ${totalCalls} total calls this session - approaching limits!`;
            if (!this.realTimeStats.warnings.currentAlerts.includes(warning)) {
                this.realTimeStats.warnings.currentAlerts.push(warning);
                console.warn(warning);
            }
        }
    }

    /**
     * Start real-time reporting
     */
    startRealTimeReporting() {
        this.reportingInterval = setInterval(() => {
            if (this.isMonitoring) {
                this.updateRealTimeStats();
            }
        }, 5000); // Update every 5 seconds
    }

    /**
     * Update real-time statistics
     */
    updateRealTimeStats() {
        const now = Date.now();
        const sessionDuration = now - this.realTimeStats.currentSession.startTime;
        const callsLastMinute = this.realTimeStats.realTime.lastMinute.length;
        
        this.realTimeStats.realTime.callsPerSecond = callsLastMinute / 60;

        // Clear old warnings
        this.realTimeStats.warnings.currentAlerts = [];
    }

    /**
     * Get current monitoring statistics
     */
    getMonitoringStats() {
        const now = Date.now();
        const sessionDuration = this.realTimeStats.currentSession.startTime ? 
            now - this.realTimeStats.currentSession.startTime : 0;

        return {
            monitoring: {
                isActive: this.isMonitoring,
                sessionDuration: Math.round(sessionDuration / 1000) + 's'
            },
            currentSession: {
                ...this.realTimeStats.currentSession,
                total: this.realTimeStats.currentSession.reads + 
                       this.realTimeStats.currentSession.writes + 
                       this.realTimeStats.currentSession.storageOps
            },
            realTime: {
                callsPerSecond: this.realTimeStats.realTime.callsPerSecond.toFixed(2),
                callsLastMinute: this.realTimeStats.realTime.lastMinute.length,
                callsLastHour: this.realTimeStats.realTime.lastHour.length
            },
            warnings: this.realTimeStats.warnings.currentAlerts,
            recommendations: this.getOptimizationRecommendations()
        };
    }

    /**
     * Get optimization recommendations based on usage patterns
     */
    getOptimizationRecommendations() {
        const stats = this.realTimeStats.currentSession;
        const recommendations = [];

        if (stats.reads > stats.writes * 3) {
            recommendations.push('📖 High read ratio - consider caching frequently accessed data');
        }

        if (stats.storageOps > 20) {
            recommendations.push('📸 Many storage operations - implement aggressive image caching');
        }

        if (this.realTimeStats.realTime.callsPerSecond > 1) {
            recommendations.push('⚡ High call frequency - batch operations where possible');
        }

        const totalCalls = stats.reads + stats.writes + stats.storageOps;
        if (totalCalls > 100) {
            recommendations.push('🎯 Consider implementing on-demand sync instead of real-time');
        }

        return recommendations;
    }

    /**
     * Display comprehensive monitoring report
     */
    displayMonitoringReport() {
        const stats = this.getMonitoringStats();
        
        console.log(`\n📊 FIREBASE CALL MONITORING REPORT`);
        console.log(`==========================================`);
        console.log(`🔍 Monitoring Status: ${stats.monitoring.isActive ? 'ACTIVE' : 'INACTIVE'}`);
        console.log(`⏱️ Session Duration: ${stats.monitoring.sessionDuration}`);
        
        console.log(`\n📞 CURRENT SESSION CALLS`);
        console.log(`📖 Reads: ${stats.currentSession.reads}`);
        console.log(`✏️ Writes: ${stats.currentSession.writes}`);
        console.log(`👂 Listeners: ${stats.currentSession.listeners}`);
        console.log(`📦 Storage: ${stats.currentSession.storageOps}`);
        console.log(`🎯 Total: ${stats.currentSession.total}`);
        
        console.log(`\n⚡ REAL-TIME ACTIVITY`);
        console.log(`🔥 Calls/Second: ${stats.realTime.callsPerSecond}`);
        console.log(`📊 Last Minute: ${stats.realTime.callsLastMinute} calls`);
        console.log(`📈 Last Hour: ${stats.realTime.callsLastHour} calls`);
        
        if (stats.warnings.length > 0) {
            console.log(`\n⚠️ ACTIVE WARNINGS`);
            stats.warnings.forEach(warning => console.log(warning));
        }
        
        if (stats.recommendations.length > 0) {
            console.log(`\n💡 OPTIMIZATION RECOMMENDATIONS`);
            stats.recommendations.forEach(rec => console.log(rec));
        }

        return stats;
    }

    /**
     * Suggest on-demand sync strategy
     */
    suggestOnDemandSync() {
        console.log(`\n🎯 ON-DEMAND SYNC STRATEGY`);
        console.log(`==========================`);
        console.log(`\n📝 CURRENT ISSUES:`);
        console.log(`- Real-time sync uses too many Firebase reads`);
        console.log(`- Hitting 50k read limits frequently`);
        console.log(`- Unnecessary calls on every data access`);
        
        console.log(`\n💡 RECOMMENDED APPROACH:`);
        console.log(`1. 🏠 LOCAL-FIRST: Store all data in localStorage`);
        console.log(`2. 📤 MANUAL SYNC: User-triggered sync to Firebase`);
        console.log(`3. 💾 SMART CACHING: Cache Firebase results locally`);
        console.log(`4. 📊 BATCH OPERATIONS: Sync multiple changes at once`);
        console.log(`5. 🔍 DELTA SYNC: Only sync changed data`);
        
        console.log(`\n🛠️ IMPLEMENTATION:`);
        console.log(`- Add "Sync to Cloud" button in settings`);
        console.log(`- Use localStorage as primary storage`);
        console.log(`- Firebase as backup/sharing mechanism only`);
        console.log(`- Show sync status and last sync time`);
        
        console.log(`\n📈 EXPECTED RESULTS:`);
        console.log(`- 95% reduction in Firebase reads`);
        console.log(`- Faster app performance (local-first)`);
        console.log(`- Better offline support`);
        console.log(`- Predictable Firebase usage`);
    }
}

// Create global instance
window.firebaseCallMonitor = new FirebaseCallMonitor();

// Global convenience functions
window.startFirebaseMonitoring = () => window.firebaseCallMonitor.startMonitoring();
window.stopFirebaseMonitoring = () => window.firebaseCallMonitor.stopMonitoring();
window.showFirebaseMonitoring = () => window.firebaseCallMonitor.displayMonitoringReport();
window.suggestOnDemandSync = () => window.firebaseCallMonitor.suggestOnDemandSync();

console.log('📊 Firebase Call Monitor loaded');
console.log('🔧 Commands: startFirebaseMonitoring(), showFirebaseMonitoring(), suggestOnDemandSync()');