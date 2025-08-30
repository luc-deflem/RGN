/**
 * FIREBASE THROTTLING & BATCHING SYSTEM
 * 
 * Emergency fix to prevent Firebase quota burnout
 * Version: 3.0.3-emergency-throttle
 */

class FirebaseThrottler {
    constructor() {
        this.pendingSync = false;
        this.lastSyncTime = 0;
        this.syncDelay = 2000; // 2 second minimum between syncs
        this.batchQueue = new Set(); // Track what needs syncing
        this.maxBatchSize = 50; // Maximum items per batch
        
        // Firebase Throttler initialized
    }

    /**
     * Throttled Firebase sync - prevents spam
     */
    throttledSync(app, reason = 'data_change') {
        // Track the sync request
        this.batchQueue.add(reason);
        
        // If sync is already pending, just return
        if (this.pendingSync) {
            console.log(`⏳ [THROTTLE] Sync already pending (${reason})`);
            return Promise.resolve();
        }

        // Check if we need to wait before syncing
        const timeSinceLastSync = Date.now() - this.lastSyncTime;
        if (timeSinceLastSync < this.syncDelay) {
            const remainingWait = this.syncDelay - timeSinceLastSync;
            console.log(`⏱️ [THROTTLE] Delaying sync by ${remainingWait}ms (${reason})`);
            
            this.pendingSync = true;
            return new Promise(resolve => {
                setTimeout(() => {
                    this.executeBatchedSync(app, reason).then(resolve);
                }, remainingWait);
            });
        }

        // Execute immediate sync
        return this.executeBatchedSync(app, reason);
    }

    /**
     * Execute batched Firebase sync
     */
    async executeBatchedSync(app, reason) {
        this.pendingSync = true;
        
        try {
            const batchReasons = Array.from(this.batchQueue);
            console.log(`🔄 [BATCH] Executing sync for: ${batchReasons.join(', ')}`);
            
            // Clear the queue before sync
            this.batchQueue.clear();
            
            // Track with simulator if available
            if (window.firebaseSimulator) {
                window.firebaseSimulator.trackCall('firestore_batch', 'throttled batch sync', {
                    reasons: batchReasons,
                    batchSize: batchReasons.length,
                    throttled: true
                });
            }
            
            // Execute the actual Firebase sync
            await app.firebaseManager.syncWithFirebase();
            
            this.lastSyncTime = Date.now();
            console.log(`✅ [BATCH] Sync completed for ${batchReasons.length} operations`);
            
        } catch (error) {
            console.error('❌ [BATCH] Sync failed:', error);
            throw error;
        } finally {
            this.pendingSync = false;
        }
    }

    /**
     * Force immediate sync (for critical operations)
     */
    async forceSync(app, reason = 'force_sync') {
        console.log(`🚨 [FORCE] Immediate sync requested: ${reason}`);
        
        this.pendingSync = false; // Clear any pending state
        this.batchQueue.clear();   // Clear queue
        
        await app.firebaseManager.syncWithFirebase();
        this.lastSyncTime = Date.now();
        
        console.log(`✅ [FORCE] Immediate sync completed: ${reason}`);
    }

    /**
     * Emergency stop all syncing
     */
    emergencyStop() {
        this.pendingSync = false;
        this.batchQueue.clear();
        console.log('🛑 [EMERGENCY] All Firebase syncing stopped');
    }

    /**
     * Get throttling statistics
     */
    getStats() {
        return {
            pendingSync: this.pendingSync,
            queueSize: this.batchQueue.size,
            lastSyncTime: this.lastSyncTime,
            timeSinceLastSync: Date.now() - this.lastSyncTime,
            syncDelay: this.syncDelay
        };
    }

    /**
     * Configure throttling settings
     */
    configure(options = {}) {
        if (options.syncDelay) this.syncDelay = options.syncDelay;
        if (options.maxBatchSize) this.maxBatchSize = options.maxBatchSize;
        
        console.log('⚙️ [THROTTLE] Configuration updated:', {
            syncDelay: this.syncDelay,
            maxBatchSize: this.maxBatchSize
        });
    }
}

// Create global instance
window.firebaseThrottler = new FirebaseThrottler();

// Global convenience functions
window.emergencyStopSync = () => window.firebaseThrottler.emergencyStop();
window.forceFirebaseSync = (reason) => {
    if (window.app) {
        return window.firebaseThrottler.forceSync(window.app, reason);
    } else {
        console.error('❌ App not available for sync');
    }
};
window.throttlerStats = () => {
    const stats = window.firebaseThrottler.getStats();
    console.log('📊 Firebase Throttler Stats:', stats);
    return stats;
};

// Firebase Throttler loaded - use emergencyStopSync(), forceFirebaseSync(), throttlerStats()