/**
 * FIREBASE SYNC MANAGER - Complete Firebase Integration
 * 
 * Extracted from app.js to achieve true modular architecture
 * Handles all Firebase-related operations independently
 * Version: 3.7.27-firebase-sync-extraction
 * 
 * RESPONSIBILITIES:
 * - Firebase image management and settings
 * - Firebase sync coordination and conflict resolution
 * - Firebase status monitoring and user controls
 * - Firebase debug information and setup validation
 */

class FirebaseSyncManager {
    constructor() {
        // Firebase state management
        this.useFirebaseImages = false;
        this.firebaseSyncing = false;
        
        // Integration points
        this.app = null;
        this.firebaseManager = null;
        
        // DOM elements (will be set during initialization)
        this.firebaseStatus = null;
        this.syncIndicator = null;
        this.enableFirebaseBtn = null;
        this.disableFirebaseBtn = null;
        this.firebaseInfo = null;
        this.useFirebaseImagesCheckbox = null;
        this.uploadImageBtn = null;
        this.syncExistingImagesBtn = null;
        this.migrateGoogleImagesBtn = null;
        
        console.log('🔥 Firebase Sync Manager constructed');
    }

    /**
     * Initialize Firebase Sync Manager
     */
    async initialize(app) {
        this.app = app;
        this.firebaseManager = app.firebaseManager;
        
        // Load Firebase image settings
        this.useFirebaseImages = this.loadFirebaseImageSetting();
        
        // Initialize DOM elements
        this.initializeDOMElements();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Debug Firebase setup
        this.debugFirebaseSetup();
        
        console.log('✅ Firebase Sync Manager initialized');
        return this;
    }

    /**
     * Initialize DOM elements for Firebase controls
     */
    initializeDOMElements() {
        // Firebase elements
        this.firebaseStatus = document.getElementById('firebaseStatus');
        this.syncIndicator = document.getElementById('syncIndicator');
        this.enableFirebaseBtn = document.getElementById('enableFirebaseBtn');
        this.disableFirebaseBtn = document.getElementById('disableFirebaseBtn');
        this.firebaseInfo = document.getElementById('firebaseInfo');
        
        // Firebase image controls
        this.useFirebaseImagesCheckbox = document.getElementById('useFirebaseImages');
        this.uploadImageBtn = document.getElementById('uploadImageBtn');
        this.syncExistingImagesBtn = document.getElementById('syncExistingImagesBtn');
        this.migrateGoogleImagesBtn = document.getElementById('migrateGoogleImagesBtn');
        
        console.log('🔥 Firebase DOM elements initialized');
    }

    /**
     * Setup Firebase-related event listeners
     */
    setupEventListeners() {
        // Firebase image settings checkbox
        if (this.useFirebaseImagesCheckbox) {
            this.useFirebaseImagesCheckbox.addEventListener('change', () => this.toggleFirebaseImages());
        }
        
        // Image management buttons
        if (this.uploadImageBtn) {
            this.uploadImageBtn.addEventListener('click', () => this.openImageUploadDialog());
        }
        if (this.syncExistingImagesBtn) {
            this.syncExistingImagesBtn.addEventListener('click', () => this.syncAllExistingImages());
        }
        if (this.migrateGoogleImagesBtn) {
            this.migrateGoogleImagesBtn.addEventListener('click', () => this.migrateGoogleImages());
        }
        
        console.log('🔥 Firebase event listeners setup complete');
    }

    // ========== FIREBASE IMAGE MANAGEMENT ==========

    /**
     * Toggle Firebase images setting
     */
    toggleFirebaseImages() {
        if (this.useFirebaseImagesCheckbox) {
            this.useFirebaseImages = this.useFirebaseImagesCheckbox.checked;
            this.saveImageSettings();
            console.log('🔥 Firebase Images:', this.useFirebaseImages ? 'Enabled' : 'Disabled');
        } else {
            console.log('⚠️ Firebase Images checkbox not found - using environment-based configuration');
        }
    }

    /**
     * Load Firebase image setting from localStorage
     */
    loadFirebaseImageSetting() {
        try {
            const settings = localStorage.getItem('imageSettings');
            if (settings) {
                const parsed = JSON.parse(settings);
                return parsed.useFirebaseImages || false;
            }
        } catch (e) {
            console.error('Could not load Firebase image setting:', e);
        }
        return false;
    }
    
    /**
     * Save image settings to localStorage
     */
    saveImageSettings() {
        try {
            const settings = {
                folderPath: this.app?.imagesFolderPathValue || '',
                useFirebaseImages: this.useFirebaseImages,
                lastUpdated: new Date().toISOString()
            };
            localStorage.setItem('imageSettings', JSON.stringify(settings));
            console.log('💾 Image settings saved');
        } catch (e) {
            console.error('Could not save image settings:', e);
        }
    }

    /**
     * Open dialog for uploading images to Firebase
     */
    openImageUploadDialog() {
        // Create file input for uploading images to Firebase
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.multiple = true;
        
        fileInput.onchange = async (event) => {
            const files = event.target.files;
            if (files.length === 0) return;
            
            console.log(`🔄 Uploading ${files.length} images to Firebase...`);
            
            for (let file of files) {
                try {
                    if (this.app.smartImageSystem) {
                        await this.app.smartImageSystem.uploadImageToFirebase(file);
                        console.log(`✅ Uploaded: ${file.name}`);
                    }
                } catch (error) {
                    console.error(`❌ Failed to upload ${file.name}:`, error);
                }
            }
            
            console.log('🎉 Firebase image upload completed');
        };
        
        fileInput.click();
    }

    /**
     * Sync all existing images to Firebase
     */
    async syncAllExistingImages() {
        if (!this.app.smartImageSystem) {
            console.error('❌ Smart Image System not available');
            return;
        }
        
        console.log('🔄 Starting sync of all existing images to Firebase...');
        
        try {
            // Get all recipe images that need syncing
            const recipes = this.app.recipes || [];
            let syncCount = 0;
            
            for (const recipe of recipes) {
                if (recipe.image && recipe.image.trim()) {
                    try {
                        await this.app.smartImageSystem.syncImageToFirebase(recipe.image);
                        syncCount++;
                    } catch (error) {
                        console.error(`❌ Failed to sync image ${recipe.image}:`, error);
                    }
                }
            }
            
            console.log(`✅ Synced ${syncCount} images to Firebase`);
        } catch (error) {
            console.error('❌ Failed to sync existing images:', error);
        }
    }

    /**
     * Migrate Google Images to Firebase Storage
     */
    async migrateGoogleImages() {
        if (!this.app.smartImageSystem) {
            console.error('❌ Smart Image System not available');
            return;
        }
        
        console.log('🔄 Starting Google Images to Firebase migration...');
        
        try {
            const recipes = this.app.recipes || [];
            let migratedCount = 0;
            
            for (const recipe of recipes) {
                if (recipe.image && this.isGoogleImageUrl(recipe.image)) {
                    try {
                        const newImageName = await this.app.smartImageSystem.migrateGoogleImageToFirebase(recipe.image, recipe.name);
                        if (newImageName) {
                            recipe.image = newImageName;
                            migratedCount++;
                        }
                    } catch (error) {
                        console.error(`❌ Failed to migrate Google image for ${recipe.name}:`, error);
                    }
                }
            }
            
            if (migratedCount > 0) {
                this.app.saveRecipes();
                console.log(`✅ Migrated ${migratedCount} Google images to Firebase`);
            } else {
                console.log('ℹ️ No Google images found to migrate');
            }
        } catch (error) {
            console.error('❌ Failed to migrate Google images:', error);
        }
    }

    /**
     * Check if URL is a Google image URL
     */
    isGoogleImageUrl(url) {
        if (!url || typeof url !== 'string') return false;
        const lowerUrl = url.toLowerCase();
        return lowerUrl.includes('googleusercontent.com') ||
               lowerUrl.includes('googleapis.com') ||
               lowerUrl.includes('google.com/images') ||
               lowerUrl.includes('gstatic.com');
    }

    // ========== FIREBASE SYNC COORDINATION ==========

    /**
     * Auto-sync product to Firebase when properties change
     */
    autoSyncProduct(product, operation = 'update') {
        if (!window.db || !window.app?.unsubscribeFirebase) {
            return; // Firebase not connected
        }
        
        if (this.firebaseSyncing) {
            console.log('🔄 Skipping auto-sync - Firebase sync in progress');
            return;
        }
        
        console.log(`🔄 Auto-syncing ${operation} to Firebase for product:`, product.name);
        
        try {
            if (this.firebaseManager) {
                this.firebaseManager.syncSingleProductToFirebase(product);
            }
        } catch (error) {
            console.error(`❌ Failed to auto-sync product ${product.name}:`, error);
        }
    }

    /**
     * Sync meal plan deletion to Firebase
     */
    async syncMealPlanDeletion(weekKey) {
        if (!window.db) {
            return; // Firebase not connected
        }
        
        this.firebaseSyncing = true;
        
        try {
            console.log('🔥 Syncing week deletion to Firebase...');
            // Use the same collection name as the listener ('mealPlan' not 'mealPlans')
            await window.db.collection('mealPlan').doc(weekKey).delete();
            console.log('✅ Week successfully deleted from Firebase');
        } catch (error) {
            console.error('❌ Failed to delete week from Firebase:', error);
        } finally {
            this.firebaseSyncing = false;
        }
    }

    /**
     * Set Firebase syncing flag
     */
    setFirebaseSyncing(syncing) {
        this.firebaseSyncing = syncing;
        console.log(`🔥 Firebase syncing: ${syncing ? 'ACTIVE' : 'INACTIVE'}`);
    }

    /**
     * Check if Firebase sync is in progress
     */
    isFirebaseSyncing() {
        return this.firebaseSyncing;
    }

    // ========== FIREBASE DEBUG & MONITORING ==========

    /**
     * Debug Firebase setup and configuration
     */
    debugFirebaseSetup() {
        // Run Firebase debug after a short delay to ensure everything is loaded
        setTimeout(() => {
            window.debugLog('firebase', '🔥 === FIREBASE DEBUG INFO ===');
            window.debugLog('firebase', 'Environment:', {
                protocol: window.location.protocol,
                hostname: window.location.hostname,
                userAgent: navigator.userAgent.substring(0, 100)
            });
            
            window.debugLog('firebase', 'Firebase Services:', {
                db: !!window.db,
                auth: !!window.auth,
                storage: !!window.storage,
                firebaseManager: !!this.firebaseManager,
                unsubscribeFirebase: !!window.app?.unsubscribeFirebase
            });
            
            window.debugLog('firebase', 'Firebase Settings:', {
                useFirebaseImages: this.useFirebaseImages,
                firebaseSyncing: this.firebaseSyncing,
                smartImageSystem: !!this.app?.smartImageSystem
            });
            
            window.debugLog('firebase', 'Firebase Controls:', {
                firebaseStatus: !!this.firebaseStatus,
                syncIndicator: !!this.syncIndicator,
                enableBtn: !!this.enableFirebaseBtn,
                disableBtn: !!this.disableFirebaseBtn,
                imageCheckbox: !!this.useFirebaseImagesCheckbox
            });
            
            window.debugLog('firebase', '🔥 === END FIREBASE DEBUG ===');
        }, 1000);
    }

    /**
     * Get Firebase connection status
     */
    getFirebaseStatus() {
        return {
            connected: !!window.db,
            authenticated: !!window.auth?.currentUser,
            syncing: this.firebaseSyncing,
            imageSupport: this.useFirebaseImages,
            managerAvailable: !!this.firebaseManager
        };
    }

    /**
     * Update Firebase status display
     */
    updateFirebaseStatusDisplay() {
        const status = this.getFirebaseStatus();
        
        if (this.firebaseStatus) {
            this.firebaseStatus.textContent = status.connected ? '🟢 Connected' : '🔴 Disconnected';
        }
        
        if (this.syncIndicator) {
            this.syncIndicator.style.display = status.syncing ? 'block' : 'none';
        }
        
        // Update Firebase info
        if (this.firebaseInfo) {
            this.firebaseInfo.innerHTML = `
                <div>Connection: ${status.connected ? '✅' : '❌'}</div>
                <div>Authentication: ${status.authenticated ? '✅' : '❌'}</div>
                <div>Image Support: ${status.imageSupport ? '✅' : '❌'}</div>
                <div>Syncing: ${status.syncing ? '🔄 Active' : '⏸️ Idle'}</div>
            `;
        }
    }

    // ========== FIREBASE DELEGATION METHODS ==========

    /**
     * Delegate Firebase sync operations to Firebase Manager
     */
    syncWithFirebase() {
        if (this.firebaseManager) {
            return this.firebaseManager.syncWithFirebase();
        }
        console.warn('⚠️ Firebase Manager not available for sync');
        return false;
    }

    syncSingleProductToFirebase(product) {
        if (this.firebaseManager) {
            return this.firebaseManager.syncSingleProductToFirebase(product);
        }
        console.warn('⚠️ Firebase Manager not available for single product sync');
        return false;
    }

    syncMultipleProductsToFirebase(products) {
        if (this.firebaseManager) {
            return this.firebaseManager.syncMultipleProductsToFirebase(products);
        }
        console.warn('⚠️ Firebase Manager not available for multiple products sync');
        return false;
    }

    deleteProductFromFirebase(productId) {
        if (this.firebaseManager) {
            return this.firebaseManager.deleteProductFromFirebase(productId);
        }
        console.warn('⚠️ Firebase Manager not available for product deletion');
        return false;
    }

    // ========== INTEGRATION METHODS ==========

    /**
     * Initialize Firebase controls (delegated from main Firebase manager)
     */
    initializeFirebaseControls() {
        if (this.firebaseManager) {
            this.firebaseManager.initializeFirebaseControls();
        }
        
        // Update status display
        this.updateFirebaseStatusDisplay();
        
        // Set checkbox state
        if (this.useFirebaseImagesCheckbox) {
            this.useFirebaseImagesCheckbox.checked = this.useFirebaseImages;
        }
    }

    /**
     * Handle Firebase initialization
     */
    initializeFirebase() {
        console.log('🔧 Initializing Firebase via Sync Manager...');
        if (this.firebaseManager) {
            this.firebaseManager.initializeFirebase();
        }
        
        // Initialize controls after Firebase setup
        setTimeout(() => {
            this.initializeFirebaseControls();
        }, 1000);
    }
}

// Make the class globally available
window.FirebaseSyncManager = FirebaseSyncManager;

console.log('🔥 Firebase Sync Manager loaded - v3.7.27-firebase-sync-extraction');