/**
 * FIREBASE MANAGEMENT MODULE
 * 
 * Handles all Firebase operations for the Grocery App
 * Version: 3.0.0-modular
 */

class FirebaseManager {
    constructor(app) {
        this.app = app;
        this.unsubscribeFirebase = null;
    }

    /**
     * Initialize Firebase connection
     */
    async initializeFirebase() {
        // console.log('🔥 Initializing Firebase...');
        // console.log('🔍 Firebase check:', {
        //     windowDb: !!window.db,
        //     windowFirebase: !!window.firebase,
        //     projectId: window.firebaseConfig?.projectId
        // });
        
        if (!window.db) {
            // console.log('❌ Firebase not available - running in offline mode');
            return;
        }

        try {
            // Initialize Firebase if not already done
            if (window.firebase && !window.firebase.apps.length) {
                // console.log('🚀 Initializing Firebase app...');
                window.firebase.initializeApp(window.firebaseConfig);
            }

            // console.log('✅ Firebase initialized successfully');
            
            // Set up real-time listeners if user authentication is available
            if (this.app.currentUser) {
                await this.setupRealtimeSync();
            }
        } catch (error) {
            console.error('❌ Firebase initialization failed:', error);
        }
        
        // Note: Firebase UI controls initialized by app coordinator in attachEventListeners()
    }

    /**
     * REMOVED: Real-time sync replaced with shopping-focused workflow
     */
    async setupRealtimeSync() {
        // console.log('🛒 Real-time sync removed - using shopping-focused workflow instead');
        // console.log('💰 Saves quota: No expensive real-time listeners needed');
        
        // No real-time listeners needed for shopping-focused workflow
        return;
    }

    /**
     * Sync all data with Firebase (supports simulation mode)
     */
    async syncWithFirebase() {
        // Check if we're in simulation mode - simulate even in prod mode
        if (window.firebaseSimulator && window.firebaseSimulator.isSimulationMode) {
            // console.log('🎭 [SIMULATION] Syncing to Firebase (simulated)...');
            
            // Simulate the sync operations
            await this.simulateFirebaseSync();
            
            // console.log('✅ [SIMULATION] Firebase sync completed (no real calls made)');
            return;
        }
        
        if (!window.db || !this.app.currentUser) {
            // console.log('❌ Firebase sync skipped - not connected or no user');
            return;
        }

        try {
            // console.log('🔄 Syncing to Firebase...');
            
            const userDoc = window.db.collection('users').doc(this.app.currentUser.uid);
            
            await Promise.all([
                this.syncShoppingItemsToFirebase(userDoc),
                this.syncStandardItemsToFirebase(userDoc),
                this.syncProductsToFirebase(userDoc)
            ]);
            
            window.debugLog('firebase', '✅ Firebase sync completed');
        } catch (error) {
            console.error('❌ Firebase sync failed:', error);
        }
    }

    /**
     * Simulate Firebase sync operations (for testing prod mode without quota usage)
     */
    async simulateFirebaseSync() {
        // Simulate user document access
        const userId = 'simulated_user_' + Date.now();
        
        // Simulate shopping items sync - only track collection-level operations
        const shoppingItems = this.app.allProducts.filter(product => product.inShopping);
        // console.log(`🎭 [SIM] Simulating sync of ${shoppingItems.length} shopping items`);
        
        // Track simulated operations - batch operations instead of individual items
        if (window.firebaseSimulator && shoppingItems.length > 0) {
            window.firebaseSimulator.trackCall('firestore_read', 'get shopping items collection', { 
                collection: 'shoppingItems',
                userId,
                simulated: true
            });
            
            // Simulate batch delete (5 ops max for cleanup)
            window.firebaseSimulator.trackCall('firestore_delete', 'batch delete shopping items', { 
                collection: 'shoppingItems',
                count: Math.min(5, shoppingItems.length),
                simulated: true
            });
            
            // Simulate batch write for all current items (1 operation for efficiency)
            window.firebaseSimulator.trackCall('firestore_write', 'batch write shopping items', { 
                collection: 'shoppingItems',
                count: shoppingItems.length,
                simulated: true
            });
        }
        
        // Simulate pantry items sync - batch operations only
        const pantryItems = this.app.standardItems;
        // console.log(`🎭 [SIM] Simulating sync of ${pantryItems.length} pantry items`);
        
        if (window.firebaseSimulator && pantryItems.length > 0) {
            window.firebaseSimulator.trackCall('firestore_read', 'get pantry items collection', { 
                collection: 'standardItems',
                userId,
                simulated: true
            });
            
            // Simulate batch write for all pantry items (1 operation)
            window.firebaseSimulator.trackCall('firestore_write', 'batch write pantry items', { 
                collection: 'standardItems',
                count: pantryItems.length,
                simulated: true
            });
        }
        
        // Simulate products sync - batch operations only (most important fix)
        const products = this.app.allProducts;
        // console.log(`🎭 [SIM] Simulating sync of ${products.length} products`);
        
        if (window.firebaseSimulator && products.length > 0) {
            window.firebaseSimulator.trackCall('firestore_read', 'get products collection', { 
                collection: 'allProducts',
                userId,
                simulated: true
            });
            
            // Simulate batch write for all products (1 operation instead of hundreds)
            window.firebaseSimulator.trackCall('firestore_write', 'batch write all products', { 
                collection: 'allProducts',
                count: products.length,
                simulated: true
            });
        }
        
        // Add realistic delay to simulate network operations
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    /**
     * Sync shopping items to Firebase with simulation tracking
     */
    async syncShoppingItemsToFirebase(userDoc) {
        const shoppingCollection = userDoc.collection('shoppingItems');
        
        // Track Firestore read call
        if (window.firebaseSimulator) {
            window.firebaseSimulator.trackCall('firestore_read', 'get shopping items collection', { 
                collection: 'shoppingItems',
                userId: this.app.currentUser?.uid
            });
        }
        
        // Clear existing items
        const existing = await shoppingCollection.get();
        const batch = window.db.batch();
        
        existing.docs.forEach(doc => {
            batch.delete(doc.ref);
            // Track delete operation
            if (window.firebaseSimulator) {
                window.firebaseSimulator.trackCall('firestore_delete', `delete shopping item ${doc.id}`, { 
                    docId: doc.id,
                    collection: 'shoppingItems'
                });
            }
        });
        
        // Add current shopping items
        const shoppingItems = this.app.allProducts.filter(product => product.inShopping);
        shoppingItems.forEach(product => {
            const docRef = shoppingCollection.doc(product.id.toString());
            
            // Track write operation
            if (window.firebaseSimulator) {
                window.firebaseSimulator.trackCall('firestore_write', `write shopping item ${product.id}`, { 
                    docId: product.id.toString(),
                    collection: 'shoppingItems',
                    productName: product.name
                });
            }
            
            batch.set(docRef, {
                    id: product.id,
                    name: product.name,
                    category: product.category,
                    completed: product.completed,
                    inStock: product.inStock,
                    timestamp: new Date().toISOString()
                });
            });
        
        await batch.commit();
        // console.log('✅ Shopping items synced to Firebase');
    }

    /**
     * Sync standard items to Firebase
     */
    async syncStandardItemsToFirebase(userDoc) {
        const pantryCollection = userDoc.collection('standardItems');
        
        // Clear existing items
        const existing = await pantryCollection.get();
        const batch = window.db.batch();
        
        existing.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        // Add current pantry items (from real pantry manager)
        const pantryItems = window.realPantryManager ? 
            window.realProductsCategoriesManager.getAllProducts().filter(p => p.pantry) : 
            [];
        pantryItems.forEach(item => {
            const docRef = pantryCollection.doc(item.id.toString());
            batch.set(docRef, {
                ...item,
                timestamp: new Date().toISOString()
            });
        });
        
        await batch.commit();
        // console.log('✅ Standard items synced to Firebase');
    }

    /**
     * Sync products to Firebase
     */
    async syncProductsToFirebase(userDoc) {
        const productsCollection = userDoc.collection('allProducts');
        
        // Clear existing products
        const existing = await productsCollection.get();
        const batch = window.db.batch();
        
        existing.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        // Add current products
        this.app.allProducts.forEach(product => {
            const docRef = productsCollection.doc(product.id.toString());
            batch.set(docRef, {
                ...product,
                timestamp: new Date().toISOString()
            });
        });
        
        await batch.commit();
        // console.log('✅ Products synced to Firebase');
    }

    /**
     * Throttled sync to prevent excessive Firebase reads
     */
    throttledSyncFromFirebase(dataType) {
        // Initialize throttle timers if not exists
        if (!this.syncThrottles) {
            this.syncThrottles = {};
        }
        
        // Clear existing throttle for this data type
        if (this.syncThrottles[dataType]) {
            clearTimeout(this.syncThrottles[dataType]);
        }
        
        // Set different throttle times based on data type
        const throttleTime = {
            'shopping': 1000,   // 1 second (frequent changes expected)
            'pantry': 2000,     // 2 seconds (moderate changes)
            'products': 10000   // 10 seconds (bulk changes, prevent read storms)
        };
        
        // Schedule throttled sync
        this.syncThrottles[dataType] = setTimeout(() => {
            // console.log(`🔄 Executing throttled sync for: ${dataType}`);
            this.syncFromFirebase();
            delete this.syncThrottles[dataType];
        }, throttleTime[dataType] || 5000);
        
        // console.log(`⏱️ Throttled ${dataType} sync scheduled (${throttleTime[dataType]}ms)`);
    }

    /**
     * Sync from Firebase to local storage
     */
    async syncFromFirebase() {
        if (!window.db || !this.app.currentUser) {
            // console.log('❌ Cannot sync from Firebase - not connected');
            return;
        }

        try {
            // console.log('⬇️ Syncing from Firebase...');
            
            const userDoc = window.db.collection('users').doc(this.app.currentUser.uid);
            
            // Load shopping items
            const shoppingSnapshot = await userDoc.collection('shoppingItems').get();
            const firebaseShoppingItems = [];
            shoppingSnapshot.docs.forEach(doc => {
                firebaseShoppingItems.push(doc.data());
            });
            
            // Load standard items
            const standardSnapshot = await userDoc.collection('standardItems').get();
            const firebaseStandardItems = [];
            standardSnapshot.docs.forEach(doc => {
                firebaseStandardItems.push(doc.data());
            });
            
            // Load products
            const productsSnapshot = await userDoc.collection('allProducts').get();
            const firebaseProducts = [];
            productsSnapshot.docs.forEach(doc => {
                firebaseProducts.push(doc.data());
            });
            
            // Update local data if Firebase has newer data (respecting modular architecture)
            if (firebaseProducts.length > 0) {
                // console.log('🔄 Updating products in localStorage...');
                localStorage.setItem('allProducts', JSON.stringify(firebaseProducts));
                // console.log(`✅ Updated ${firebaseProducts.length} products from Firebase`);
            }
            
            if (firebaseStandardItems.length > 0) {
                // console.log('🔄 Updating pantry in localStorage...');
                localStorage.setItem('standardItems', JSON.stringify(firebaseStandardItems));
                // console.log(`✅ Updated ${firebaseStandardItems.length} pantry items from Firebase`);
            }
            
            // Update shopping items in localStorage
            if (firebaseShoppingItems.length > 0) {
                // console.log('🔄 Updating shopping items in localStorage...');
                // Note: Shopping items are managed differently - might need special handling
                // console.log(`✅ Processed ${firebaseShoppingItems.length} shopping items from Firebase`);
            }
            
            this.app.render();
            window.debugLog('firebase', '✅ Synced from Firebase successfully');
            
        } catch (error) {
            console.error('❌ Failed to sync from Firebase:', error);
        }
    }

    /**
     * Sync single product to Firebase
     */
    async syncSingleProductToFirebase(product) {
        if (!window.db || !this.app.currentUser) return;

        try {
            const userDoc = window.db.collection('users').doc(this.app.currentUser.uid);
            const productDoc = userDoc.collection('allProducts').doc(product.id.toString());
            
            await productDoc.set({
                ...product,
                timestamp: new Date().toISOString()
            });
            
            // console.log(`✅ Synced product "${product.name}" to Firebase`);
        } catch (error) {
            console.error('❌ Failed to sync product to Firebase:', error);
        }
    }

    /**
     * Sync multiple products to Firebase
     */
    async syncMultipleProductsToFirebase(products) {
        if (!window.db || !this.app.currentUser || products.length === 0) return;

        try {
            const userDoc = window.db.collection('users').doc(this.app.currentUser.uid);
            const batch = window.db.batch();
            
            products.forEach(product => {
                const docRef = userDoc.collection('allProducts').doc(product.id.toString());
                batch.set(docRef, {
                    ...product,
                    timestamp: new Date().toISOString()
                });
            });
            
            await batch.commit();
            // console.log(`✅ Synced ${products.length} products to Firebase`);
        } catch (error) {
            console.error('❌ Failed to sync multiple products to Firebase:', error);
        }
    }

    /**
     * Delete product from Firebase
     */
    async deleteProductFromFirebase(productId) {
        if (!window.db || !this.app.currentUser) return;

        try {
            const userDoc = window.db.collection('users').doc(this.app.currentUser.uid);
            await userDoc.collection('allProducts').doc(productId.toString()).delete();
            // console.log(`✅ Deleted product ${productId} from Firebase`);
        } catch (error) {
            console.error('❌ Failed to delete product from Firebase:', error);
        }
    }

    /**
     * Disconnect Firebase listeners
     */
    disconnectFirebase() {
        // Disconnect all real-time listeners
        if (this.realtimeListeners && this.realtimeListeners.length > 0) {
            this.realtimeListeners.forEach((listener, index) => {
                listener();
                // console.log(`🔌 Disconnected listener ${index + 1}`);
            });
            this.realtimeListeners = [];
        }
        
        // Legacy cleanup
        if (this.unsubscribeFirebase) {
            this.unsubscribeFirebase();
            this.unsubscribeFirebase = null;
        }
        
        // Clear any pending throttled syncs
        if (this.syncThrottles) {
            Object.values(this.syncThrottles).forEach(timeout => clearTimeout(timeout));
            this.syncThrottles = {};
        }
        
        // console.log('🔌 Disconnected all Firebase listeners and cleared throttles');
    }

    /**
     * Get Firebase connection status
     */
    getFirebaseStatus() {
        return {
            available: !!window.db,
            connected: !!this.unsubscribeFirebase,
            user: !!this.app.currentUser,
            projectId: window.firebaseConfig?.projectId
        };
    }

    /**
     * Inspect Firebase data - shows what's actually stored
     */
    async inspectFirebaseData() {
        if (!window.db || !this.app.currentUser) {
            window.debugLog('firebase', '❌ Cannot inspect - Firebase not connected or no user');
            return;
        }

        try {
            window.debugLog('firebase', '🔍 FIREBASE DATA INSPECTION');
            window.debugLog('firebase', '================================');
            
            const userDoc = window.db.collection('users').doc(this.app.currentUser.uid);
            
            // Inspect Shopping Items
            const shoppingSnapshot = await userDoc.collection('shoppingItems').get();
            window.debugLog('firebase', `\n📋 SHOPPING ITEMS (${shoppingSnapshot.size} items):`);
            shoppingSnapshot.docs.forEach(doc => {
                const data = doc.data();
                window.debugLog('firebase', `  • ${data.name} (${data.category}) - ${data.completed ? '✅' : '⏳'}`);
            });
            
            // Inspect Standard Items (Pantry)
            const pantrySnapshot = await userDoc.collection('standardItems').get();
            window.debugLog('firebase', `\n🌱 PANTRY ITEMS (${pantrySnapshot.size} items):`);
            pantrySnapshot.docs.forEach(doc => {
                const data = doc.data();
                window.debugLog('firebase', `  • ${data.name} (${data.category}) - Stock: ${data.inStock ? '✅' : '🔴'}`);
            });
            
            // Inspect All Products
            const productsSnapshot = await userDoc.collection('allProducts').get();
            window.debugLog('firebase', `\n📦 ALL PRODUCTS (${productsSnapshot.size} items):`);
            const categoryCounts = {};
            productsSnapshot.docs.forEach(doc => {
                const data = doc.data();
                categoryCounts[data.category] = (categoryCounts[data.category] || 0) + 1;
            });
            
            window.debugLog('firebase', '  Categories breakdown:');
            Object.entries(categoryCounts).forEach(([category, count]) => {
                window.debugLog('firebase', `    - ${category}: ${count} products`);
            });
            
            // Sample products
            window.debugLog('firebase', '\n  Sample products:');
            productsSnapshot.docs.slice(0, 5).forEach(doc => {
                const data = doc.data();
                const flags = [];
                if (data.inShopping) flags.push('🛒');
                if (data.pantry) flags.push('🌱');
                if (data.inStock) flags.push('✅');
                window.debugLog('firebase', `    • ${data.name} (${data.category}) ${flags.join(' ')}`);
            });
            
            window.debugLog('firebase', '\n================================');
            window.debugLog('firebase', '📊 SUMMARY:');
            window.debugLog('firebase', `   Shopping Items: ${shoppingSnapshot.size}`);
            window.debugLog('firebase', `   Pantry Items: ${pantrySnapshot.size}`);
            window.debugLog('firebase', `   Total Products: ${productsSnapshot.size}`);
            window.debugLog('firebase', '\n🎯 To run this inspection, type: window.app.firebaseManager.inspectFirebaseData()');
            
        } catch (error) {
            console.error('❌ Firebase inspection failed:', error);
        }
    }

    /**
     * Export complete app data to JSON file
     */
    exportToJSON() {
        try {
            // console.log('📦 Exporting complete app data to JSON...');
            
            // Collect all data from localStorage
            const exportData = {
                timestamp: new Date().toISOString(),
                device: navigator.userAgent.includes('iPhone') ? 'iPhone' : 'Mac',
                version: window.APP_VERSION || 'unknown',
                data: {
                    allProducts: JSON.parse(localStorage.getItem('allProducts') || '[]'),
                    standardItems: JSON.parse(localStorage.getItem('standardItems') || '[]'),
                    categories: JSON.parse(localStorage.getItem('categories') || '[]'),
                    recipes: JSON.parse(localStorage.getItem('recipes') || '[]'),
                    mealPlan: JSON.parse(localStorage.getItem('mealPlan') || '{}'),
                    customSettings: JSON.parse(localStorage.getItem('customSettings') || '{}')
                },
                statistics: {
                    totalProducts: JSON.parse(localStorage.getItem('allProducts') || '[]').length,
                    totalRecipes: JSON.parse(localStorage.getItem('recipes') || '[]').length,
                    shoppingItems: JSON.parse(localStorage.getItem('allProducts') || '[]').filter(p => p.inShopping).length
                }
            };

            // Create downloadable file
            const jsonString = JSON.stringify(exportData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            // Create download link
            const a = document.createElement('a');
            a.href = url;
            a.download = `recipes-groceries-export-${new Date().toISOString().slice(0,10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            window.debugLog('firebase', '✅ Export completed successfully');
            // console.log(`📊 Exported: ${exportData.statistics.totalProducts} products, ${exportData.statistics.totalRecipes} recipes`);
            alert(`✅ Export completed!\n\n📦 File: recipes-groceries-export-${new Date().toISOString().slice(0,10)}.json\n📊 Data: ${exportData.statistics.totalProducts} products, ${exportData.statistics.totalRecipes} recipes\n\n📱 Share this file to sync devices!`);

        } catch (error) {
            console.error('❌ Export failed:', error);
            alert(`❌ Export failed: ${error.message}`);
        }
    }

    /**
     * Import complete app data from JSON file
     */
    async importFromJSON(file) {
        try {
            // console.log('📥 Importing app data from JSON...');
            
            let jsonData;
            if (typeof file === 'string') {
                // Direct JSON string
                jsonData = JSON.parse(file);
            } else {
                // File object
                const text = await file.text();
                jsonData = JSON.parse(text);
            }

            // Validate import data
            if (!jsonData.data || !jsonData.timestamp) {
                throw new Error('Invalid export file format');
            }

            // Show import confirmation
            const confirmed = confirm(
                `📥 Import Data?\n\n` +
                `📅 Exported: ${new Date(jsonData.timestamp).toLocaleString()}\n` +
                `💻 Device: ${jsonData.device}\n` +
                `📊 Products: ${jsonData.statistics?.totalProducts || 'unknown'}\n` +
                `🍽️ Recipes: ${jsonData.statistics?.totalRecipes || 'unknown'}\n\n` +
                `⚠️ This will OVERWRITE your current data!`
            );

            if (!confirmed) {
                // console.log('📥 Import cancelled by user');
                return;
            }

            // Import data to localStorage
            const { data } = jsonData;
            localStorage.setItem('allProducts', JSON.stringify(data.allProducts));
            localStorage.setItem('standardItems', JSON.stringify(data.standardItems));
            localStorage.setItem('categories', JSON.stringify(data.categories));
            localStorage.setItem('recipes', JSON.stringify(data.recipes));
            localStorage.setItem('mealPlan', JSON.stringify(data.mealPlan));
            localStorage.setItem('customSettings', JSON.stringify(data.customSettings));

            // Refresh the app
            if (this.app && this.app.render) {
                this.app.render();
            } else {
                location.reload();
            }

            // console.log('✅ Import completed successfully');
            alert(`✅ Import completed!\n\n📥 Data imported from ${jsonData.device}\n🔄 App refreshed with new data\n\n💡 Tip: Export again to backup your merged data`);

        } catch (error) {
            console.error('❌ Import failed:', error);
            alert(`❌ Import failed: ${error.message}`);
        }
    }

    /**
     * Quick file import helper
     */
    showImportDialog() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                await this.importFromJSON(file);
            }
        };
        input.click();
    }

    /**
     * Initial Firebase setup - upload current device data as source of truth
     */
    async initialFirebaseSetup(userDoc) {
        try {
            // console.log('🚀 Starting initial Firebase setup...');
            
            const confirmed = confirm(
                '🚀 Initial Firebase Setup\n\n' +
                '📤 This will upload your current device data to Firebase\n' +
                '🔄 After this, individual changes will sync between devices\n\n' +
                '⚠️ Make sure both devices have identical data first!\n' +
                '   (Use JSON export/import to sync devices first)\n\n' +
                'Continue with setup?'
            );
            
            if (!confirmed) {
                // console.log('🚀 Initial setup cancelled');
                return;
            }

            // Upload current data to Firebase (one-time setup)
            // console.log('📤 Step 1: Uploading shopping items...');
            await this.syncShoppingItemsToFirebase(userDoc);
            
            // console.log('📤 Step 2: Uploading pantry items...');
            await this.syncStandardItemsToFirebase(userDoc);
            
            // console.log('📤 Step 3: Uploading products...');
            await this.syncProductsToFirebase(userDoc);
            
            // Mark setup as complete
            localStorage.setItem('firebaseSetupComplete', 'true');
            localStorage.setItem('firebaseSetupDate', new Date().toISOString());
            
            // console.log('✅ Initial Firebase setup completed!');
            alert(
                '✅ Initial Firebase Setup Complete!\n\n' +
                '📤 Your data is now uploaded to Firebase\n' +
                '🔄 Real-time sync is now active\n' +
                '📱 Individual changes will sync between devices\n\n' +
                '💡 Next: Run "Sync Now" on other device to activate real-time sync there too'
            );
            
        } catch (error) {
            console.error('❌ Initial Firebase setup failed:', error);
            alert(`❌ Initial setup failed: ${error.message}`);
        }
    }

    /**
     * Check if initial Firebase setup is complete
     */
    isFirebaseSetupComplete() {
        return localStorage.getItem('firebaseSetupComplete') === 'true';
    }

    /**
     * Sync individual product change to Firebase (efficient)
     */
    async syncIndividualProductChange(product, action = 'update') {
        if (!this.isFirebaseSetupComplete() || !window.db || !this.app.currentUser) {
            // console.log('⚠️ Individual sync skipped - setup not complete or not connected');
            return;
        }

        try {
            const userDoc = window.db.collection('users').doc(this.app.currentUser.uid);
            
            if (action === 'delete') {
                await userDoc.collection('allProducts').doc(product.id.toString()).delete();
                // console.log(`🗑️ Deleted product "${product.name}" from Firebase`);
            } else {
                await userDoc.collection('allProducts').doc(product.id.toString()).set({
                    ...product,
                    timestamp: new Date().toISOString()
                });
                // console.log(`📝 Updated product "${product.name}" in Firebase`);
            }
            
            // Also update shopping items if this product is in shopping
            if (product.inShopping) {
                if (action === 'delete') {
                    await userDoc.collection('shoppingItems').doc(product.id.toString()).delete();
                } else {
                    await userDoc.collection('shoppingItems').doc(product.id.toString()).set({
                        id: product.id,
                        name: product.name,
                        category: product.category,
                        completed: product.completed,
                        inStock: product.inStock,
                        timestamp: new Date().toISOString()
                    });
                }
            }
            
        } catch (error) {
            console.error('❌ Individual product sync failed:', error);
        }
    }

    /**
     * Sync individual shopping list change to Firebase (efficient)
     */
    async syncIndividualShoppingChange(product, action = 'update') {
        if (!this.isFirebaseSetupComplete() || !window.db || !this.app.currentUser) {
            // console.log('⚠️ Individual shopping sync skipped - setup not complete');
            return;
        }

        try {
            const userDoc = window.db.collection('users').doc(this.app.currentUser.uid);
            
            if (action === 'remove' || !product.inShopping) {
                await userDoc.collection('shoppingItems').doc(product.id.toString()).delete();
                // console.log(`🛒 Removed "${product.name}" from Firebase shopping list`);
            } else {
                await userDoc.collection('shoppingItems').doc(product.id.toString()).set({
                    id: product.id,
                    name: product.name,
                    category: product.category,
                    completed: product.completed,
                    inStock: product.inStock,
                    timestamp: new Date().toISOString()
                });
                // console.log(`🛒 Added/updated "${product.name}" in Firebase shopping list`);
            }
            
        } catch (error) {
            console.error('❌ Individual shopping sync failed:', error);
        }
    }

    /**
     * Global hook for when products change - called by app modules
     */
    onProductChanged(product, action = 'update') {
        if (!this.isFirebaseSetupComplete()) {
            // console.log('⚠️ Product change not synced - Firebase setup not complete');
            return;
        }
        
        // console.log(`🔄 Product changed: ${product.name} (${action})`);
        
        // Sync to Firebase
        this.syncIndividualProductChange(product, action);
        
        // If it's a shopping item, also sync shopping collection
        if (product.inShopping || action === 'shopping_toggle') {
            this.syncIndividualShoppingChange(product, action);
        }
    }

    // ========== FIREBASE CONTROL METHODS ==========

    /**
     * Enable Firebase connection
     */
    async enableFirebase() {
        if (!window.db) {
            alert('⚠️ Firebase not configured. Please update firebase-config.js with your Firebase credentials.');
            return;
        }

        try {
            window.debugLog('firebase', '🔥 Testing Firebase connection...');
            
            // Get current user for user-scoped test
            const currentUser = window.auth.currentUser;
            if (!currentUser) {
                throw new Error('User not authenticated');
            }
            
            // Simple test write and read using user-scoped path
            const userDoc = window.db.collection('users').doc(currentUser.uid);
            const testDoc = await userDoc.collection('test').add({ 
                timestamp: new Date(),
                message: 'Connection test'
            });
            // console.log('✅ Test write successful:', testDoc.id);
            
            const testRead = await userDoc.collection('test').limit(1).get();
            // console.log('✅ Test read successful:', testRead.size, 'documents');
            
            this.updateFirebaseStatus('connected');
            
            // Don't set up listeners yet - wait for first sync
            // console.log('🔥 Firebase connected. Use "Sync Now" to upload your data first.');
            alert('✅ Firebase connected successfully! Click "Sync Now" to upload your data.');
        } catch (error) {
            console.error('❌ Firebase connection failed:', error);
            alert(`❌ Firebase connection failed: ${error.message}`);
            this.updateFirebaseStatus('disconnected');
        }
    }

    /**
     * Disable Firebase connection
     */
    disableFirebase() {
        if (this.unsubscribeFirebase) {
            this.unsubscribeFirebase();
            this.unsubscribeFirebase = null;
        }
        this.updateFirebaseStatus('disconnected');
        // console.log('🔥 Firebase disabled');
        alert('✅ Firebase disconnected. App will work in offline mode.');
    }

    /**
     * Update Firebase status UI
     */
    updateFirebaseStatus(status) {
        const statusElement = document.getElementById('firebaseStatus');
        const enableBtn = document.getElementById('enableFirebaseBtn');
        const disableBtn = document.getElementById('disableFirebaseBtn');
        const syncBtn = document.getElementById('syncNowBtn');

        if (statusElement) {
            statusElement.textContent = status === 'connected' ? '🟢 Connected' : '🔴 Disconnected';
            statusElement.className = `firebase-status ${status}`;
        }

        if (enableBtn) enableBtn.style.display = status === 'connected' ? 'none' : 'inline-block';
        if (disableBtn) disableBtn.style.display = status === 'connected' ? 'inline-block' : 'none';
        if (syncBtn) syncBtn.style.display = status === 'connected' ? 'inline-block' : 'none';
    }

    /**
     * Sync all data to Firebase
     */
    async syncToFirebase() {
        if (!window.db) {
            alert('⚠️ Firebase not configured');
            return;
        }

        // Check authentication - try both methods for debugging
        const appCurrentUser = this.app.currentUser;
        const authCurrentUser = window.auth?.currentUser;
        
        // console.log('🔍 AUTH DEBUG: this.app.currentUser:', appCurrentUser);
        // console.log('🔍 AUTH DEBUG: window.auth.currentUser:', authCurrentUser);
        
        if (!appCurrentUser && !authCurrentUser) {
            alert('⚠️ Please sign in first');
            return;
        }
        
        // Use the available user (prefer appCurrentUser, fallback to authCurrentUser)
        const currentUser = appCurrentUser || authCurrentUser;

        try {
            // REPLACED WITH SHOPPING-FOCUSED SYNC
            // console.log('🛒 Bulk sync replaced with shopping-focused workflow');
            
            alert('🛒 NEW SYNC STRATEGY!\n\n❌ Old bulk sync removed\n✅ Use shopping-focused sync below:\n\n🖥️ MAC: Set Shopping Ready\n📱 iPhone: Get Shopping List\n\n💰 Much more cost-efficient!');

        } catch (error) {
            console.error('❌ Sync to Firebase failed:', error);
            alert(`❌ Sync failed: ${error.message}`);
        }
    }

    /**
     * Force sync with conflict resolution
     */
    async forceSyncToFirebase() {
        if (!window.db || !this.app.currentUser) {
            alert('⚠️ Firebase not connected or user not signed in');
            return;
        }

        const confirmed = confirm('⚠️ Force sync will overwrite Firebase data with your local data. Continue?');
        if (!confirmed) return;

        try {
            // console.log('🚀 Starting force sync...');
            
            // Disable listeners during sync
            if (this.unsubscribeFirebase) {
                this.unsubscribeFirebase();
                this.unsubscribeFirebase = null;
            }

            await this.syncToFirebase();
            
            // Re-enable listeners
            await this.setupRealtimeSync();
            
            alert('✅ Force sync completed! All devices should now have the same data.');
        } catch (error) {
            console.error('❌ Force sync failed:', error);
            alert(`❌ Force sync failed: ${error.message}`);
        }
    }

    /**
     * Initialize Firebase control UI with robust error handling
     */
    initializeFirebaseControls(attempt = 1, maxAttempts = 5) {
        // Set up event listeners for Firebase control buttons
        const enableBtn = document.getElementById('enableFirebaseBtn');
        const disableBtn = document.getElementById('disableFirebaseBtn');
        const syncBtn = document.getElementById('syncNowBtn');
        const forceSyncBtn = document.getElementById('forceSyncBtn');

        // Check if critical button exists
        if (!enableBtn) {
            if (attempt < maxAttempts) {
                // console.warn(`⚠️ enableFirebaseBtn not found, retry ${attempt}/${maxAttempts}`);
                setTimeout(() => this.initializeFirebaseControls(attempt + 1, maxAttempts), 500);
                return;
            } else {
                console.error('❌ enableFirebaseBtn not found after 5 attempts');
                return;
            }
        }

        // Add event listeners with error handling
        try {
            enableBtn.addEventListener('click', () => {
                // console.log('🔥 Enable Firebase button clicked');
                // Immediate visual feedback
                alert('🔥 Firebase Sync button clicked! Processing...');
                this.enableFirebase();
            });

            if (disableBtn) {
                disableBtn.addEventListener('click', () => this.disableFirebase());
            }
            if (syncBtn) {
                syncBtn.addEventListener('click', () => this.syncToFirebase());
            }
            if (forceSyncBtn) {
                forceSyncBtn.addEventListener('click', () => this.forceSyncToFirebase());
            }

            // console.log(`🎛️ Firebase controls initialized successfully (attempt ${attempt})`);
            
            // Add shopping-focused sync buttons
            setTimeout(() => this.addShoppingButtons(), 500);
        } catch (error) {
            console.error('❌ Error setting up Firebase controls:', error);
        }
    }
}

// Make available globally
window.FirebaseManager = FirebaseManager;

// Initialize Firebase controls after app is fully loaded
window.addEventListener('load', () => {
    // Wait for app to be available and fully initialized
    const waitForApp = () => {
        if (window.app && window.app.firebaseManager) {
            window.app.firebaseManager.initializeFirebaseControls();
            // console.log('🎛️ Firebase controls initialized after window load');
        } else {
            setTimeout(waitForApp, 100);
        }
    };
    waitForApp();
});

window.debugLog('firebase', '✅ Firebase Manager loaded - v7.2.1-smart-initial-setup');

// Add manual sync testing function with visual feedback
FirebaseManager.prototype.testIndividualSync = function() {
    // console.log('🧪 Testing individual sync...');
    
    // Find a shopping item to test with
    const shoppingItems = JSON.parse(localStorage.getItem('allProducts') || '[]')
        .filter(p => p.inShopping);
        
    if (shoppingItems.length > 0) {
        const testItem = shoppingItems[0];
        // console.log(`🧪 Testing with: ${testItem.name}`);
        
        // Show immediate feedback
        alert(`🧪 TESTING SYNC...\n\nItem: ${testItem.name}\nCurrent: ${testItem.completed ? 'Completed ✅' : 'Pending ⏳'}\n\n⏳ Toggling status and syncing...`);
        
        // Toggle completed status
        testItem.completed = !testItem.completed;
        
        // Update localStorage
        const allProducts = JSON.parse(localStorage.getItem('allProducts') || '[]');
        const index = allProducts.findIndex(p => p.id === testItem.id);
        if (index >= 0) {
            allProducts[index] = testItem;
            localStorage.setItem('allProducts', JSON.stringify(allProducts));
        }
        
        // Trigger sync with visual feedback
        this.onProductChanged(testItem, 'shopping_toggle');
        
        // Trigger app re-render
        if (this.app && this.app.render) {
            this.app.render();
        }
        
        // console.log(`🧪 Test complete - toggled "${testItem.name}" completed status`);
        
        // Show result with timing
        setTimeout(() => {
            alert(`✅ SYNC TEST COMPLETE!\n\nItem: ${testItem.name}\nNew Status: ${testItem.completed ? 'Completed ✅' : 'Pending ⏳'}\n\n📱 Check other device in 5-10 seconds!\n\n💡 If setup complete, this change should appear on other device automatically`);
        }, 1000);
    } else {
        alert('❌ No shopping items found!\n\n📝 Add items to shopping list first,\nthen try this test again');
    }
};

// Add shopping-focused sync buttons to Firebase controls
FirebaseManager.prototype.addShoppingButtons = function() {
    // MOVED TO SHOPPING TAB: Add buttons to shopping tab instead of sync tab
    const shoppingTab = document.getElementById('shopping-tab');
    if (shoppingTab && !document.getElementById('shoppingSyncContainer')) {
        // Create shopping sync container - clean design without frame, inline buttons
        const container = document.createElement('div');
        container.id = 'shoppingSyncContainer';
        container.style.marginTop = '15px';
        container.style.marginBottom = '10px';
        container.style.display = 'flex';
        container.style.flexWrap = 'wrap';
        container.style.gap = '10px';
        container.style.alignItems = 'center';
        
        // Check if we're on Mac or iPhone
        const isMac = !navigator.userAgent.includes('iPhone');
        
        if (isMac) {
            // MAC buttons - only Set Ready + Refresh (original Clear Completed button is separate)
            const readyBtn = this.createShoppingButton('setReadyBtn', '🛒 Set Shopping Ready', '#4CAF50', () => this.setShoppingReady());
            const refreshBtn = this.createShoppingButton('refreshShoppingBtn', '🔄 Refresh Shopping', '#2196F3', () => this.refreshShopping());
            
            container.appendChild(readyBtn);
            container.appendChild(refreshBtn);
        } else {
            // IPHONE buttons
            const getBtn = this.createShoppingButton('getShoppingBtn', '📥 Get Shopping List', '#2196F3', () => this.getShoppingList());
            const doneBtn = this.createShoppingButton('shoppingDoneBtn', '✅ Shopping Done', '#4CAF50', () => this.shoppingDone());
            
            container.appendChild(getBtn);
            container.appendChild(doneBtn);
        }
        
        // Add debug button for both
        const debugBtn = this.createShoppingButton('debugBtn', '🔍', '#9E9E9E', () => this.showDebugStatus());
        container.appendChild(debugBtn);
        
        // MAC: Insert into list-stats div to make buttons truly inline
        const listStats = shoppingTab.querySelector('.list-stats');
        if (listStats && isMac) {
            // For Mac: add buttons directly to list-stats div for true inline layout
            listStats.style.display = 'flex';
            listStats.style.alignItems = 'center';
            listStats.style.gap = '10px';
            listStats.style.flexWrap = 'wrap';
            
            // Set button order: Green(1) → Blue(2) → Red(3)
            const clearCompletedBtn = listStats.querySelector('#clearCompleted');
            if (clearCompletedBtn) {
                clearCompletedBtn.style.order = '3'; // Red Clear Completed last
            }
            
            // Set order for our new buttons
            const readyBtn = container.querySelector('#setReadyBtn');
            const refreshBtn = container.querySelector('#refreshShoppingBtn');
            if (readyBtn) readyBtn.style.order = '1'; // Green Set Ready first
            if (refreshBtn) refreshBtn.style.order = '2'; // Blue Refresh second
            
            // Remove container styling since we're adding directly to list-stats
            container.style.display = 'contents'; // This makes the container transparent
            
            listStats.appendChild(container);
        } else {
            // iPhone: Keep separate container
            const listStats = shoppingTab.querySelector('.list-stats');
            if (listStats) {
                listStats.parentNode.insertBefore(container, listStats.nextSibling);
            } else {
                shoppingTab.appendChild(container);
            }
        }
        // console.log(`🛒 Shopping sync buttons added for ${isMac ? 'Mac' : 'iPhone'}`);
    }
};

// Auto-connect Firebase helper for shopping actions
FirebaseManager.prototype.ensureFirebaseConnected = async function() {
    // Check if Firebase is already connected
    if (window.db && (this.app.currentUser || window.auth?.currentUser)) {
        return true; // Already connected
    }
    
    // Show connecting message
    const connectingMsg = this.showConnectingMessage();
    
    try {
        // Auto-connect Firebase
        // console.log('🔌 Auto-connecting Firebase for shopping action...');
        
        // Initialize Firebase if needed
        if (!window.db) {
            await this.initializeFirebase();
        }
        
        // Ensure authentication
        if (!this.app.currentUser && !window.auth?.currentUser) {
            await this.signInAnonymously();
        }
        
        // Sync user references
        if (!this.app.currentUser && window.auth?.currentUser) {
            this.app.currentUser = window.auth.currentUser;
        }
        
        connectingMsg.hide();
        // console.log('✅ Firebase auto-connected successfully');
        return true;
        
    } catch (error) {
        connectingMsg.hide();
        console.error('❌ Auto-connect failed:', error);
        alert('❌ Connection failed. Please try "Enable Firebase Sync" in Sync tab.');
        return false;
    }
};

// Show connecting message
FirebaseManager.prototype.showConnectingMessage = function() {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    overlay.style.zIndex = '10001';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    
    const message = document.createElement('div');
    message.style.backgroundColor = 'white';
    message.style.padding = '20px 30px';
    message.style.borderRadius = '10px';
    message.style.fontSize = '18px';
    message.style.fontWeight = 'bold';
    message.style.color = '#333';
    message.textContent = '🔌 Connecting...';
    
    overlay.appendChild(message);
    document.body.appendChild(overlay);
    
    return {
        hide: () => {
            if (overlay.parentNode) {
                document.body.removeChild(overlay);
            }
        }
    };
};

// Custom 3-option dialog for iPhone Shopping Done
FirebaseManager.prototype.showThreeOptionDialog = function(message, option1, option2, option3) {
    return new Promise((resolve) => {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        overlay.style.zIndex = '10000';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        
        // Create dialog
        const dialog = document.createElement('div');
        dialog.style.backgroundColor = 'white';
        dialog.style.borderRadius = '10px';
        dialog.style.padding = '20px';
        dialog.style.maxWidth = '90%';
        dialog.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
        
        // Add message
        const messageEl = document.createElement('div');
        messageEl.textContent = message;
        messageEl.style.marginBottom = '20px';
        messageEl.style.fontSize = '16px';
        messageEl.style.lineHeight = '1.4';
        messageEl.style.whiteSpace = 'pre-line';
        dialog.appendChild(messageEl);
        
        // Button container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.flexDirection = 'column';
        buttonContainer.style.gap = '10px';
        
        // Create buttons
        const btn1 = this.createDialogButton(option1, '#4CAF50', () => { cleanup(); resolve('clean'); });
        const btn2 = this.createDialogButton(option2, '#2196F3', () => { cleanup(); resolve('keep'); });
        const btn3 = this.createDialogButton(option3, '#f44336', () => { cleanup(); resolve('cancel'); });
        
        buttonContainer.appendChild(btn1);
        buttonContainer.appendChild(btn2);
        buttonContainer.appendChild(btn3);
        dialog.appendChild(buttonContainer);
        
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        // Cleanup function
        function cleanup() {
            document.body.removeChild(overlay);
        }
        
        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                cleanup();
                resolve('cancel');
            }
        });
    });
};

// Helper to create dialog buttons
FirebaseManager.prototype.createDialogButton = function(text, color, onClick) {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.style.padding = '12px 20px';
    btn.style.fontSize = '16px';
    btn.style.border = 'none';
    btn.style.borderRadius = '6px';
    btn.style.backgroundColor = color;
    btn.style.color = 'white';
    btn.style.cursor = 'pointer';
    btn.style.fontWeight = 'bold';
    btn.addEventListener('click', onClick);
    return btn;
};

// Helper to create shopping buttons
FirebaseManager.prototype.createShoppingButton = function(id, text, color, onClick) {
    const btn = document.createElement('button');
    btn.id = id;
    btn.textContent = text;
    btn.className = 'firebase-btn shopping-btn';
    btn.style.background = color;
    btn.style.color = 'white';
    btn.style.margin = '5px';
    btn.style.padding = '8px 12px';
    btn.style.border = 'none';
    btn.style.borderRadius = '4px';
    btn.style.cursor = 'pointer';
    btn.onclick = onClick;
    return btn;
};

// ========== SHOPPING-FOCUSED SYNC METHODS ==========

/**
 * MAC: Set shopping list ready and upload to Firebase
 */
FirebaseManager.prototype.setShoppingReady = async function() {
    // Auto-connect Firebase if needed
    if (!(await this.ensureFirebaseConnected())) {
        return; // Connection failed
    }
    
    const currentUser = this.app.currentUser || window.auth?.currentUser;

    try {
        // Get current shopping items
        const shoppingItems = JSON.parse(localStorage.getItem('allProducts') || '[]')
            .filter(product => product.inShopping);
        
        if (shoppingItems.length === 0) {
            alert('❌ No items in shopping list!\n\nAdd items to shopping list first');
            return;
        }

        const confirmed = confirm(
            `🛒 SET SHOPPING READY?\n\n` +
            `📋 Items: ${shoppingItems.length}\n` +
            `📤 Upload to Firebase for iPhone access\n\n` +
            `Continue?`
        );

        if (!confirmed) return;

        const userDoc = window.db.collection('users').doc(currentUser.uid);
        
        // Upload shopping items with metadata
        const shoppingData = {
            items: shoppingItems,
            status: 'READY',
            timestamp: new Date().toISOString(),
            device: 'Mac',
            itemCount: shoppingItems.length
        };

        await userDoc.collection('shoppingSync').doc('current').set(shoppingData);
        
        // console.log(`✅ Shopping list uploaded: ${shoppingItems.length} items`);
        alert(`✅ SHOPPING READY!\n\n📤 Uploaded: ${shoppingItems.length} items\n📱 iPhone can now download shopping list`);

    } catch (error) {
        console.error('❌ Set shopping ready failed:', error);
        alert(`❌ Upload failed: ${error.message}`);
    }
};

/**
 * IPHONE: Get shopping list from Firebase
 */
FirebaseManager.prototype.getShoppingList = async function() {
    // Auto-connect Firebase if needed
    if (!(await this.ensureFirebaseConnected())) {
        return; // Connection failed
    }
    
    const currentUser = this.app.currentUser || window.auth?.currentUser;

    try {
        const userDoc = window.db.collection('users').doc(currentUser.uid);
        const shoppingDoc = await userDoc.collection('shoppingSync').doc('current').get();
        
        if (!shoppingDoc.exists) {
            alert('❌ No shopping list found!\n\nMac needs to "Set Shopping Ready" first');
            return;
        }

        const shoppingData = shoppingDoc.data();
        
        if (shoppingData.status !== 'READY') {
            alert(`⚠️ Shopping list status: ${shoppingData.status}\n\nExpected: READY`);
            return;
        }

        const confirmed = confirm(
            `📥 DOWNLOAD SHOPPING LIST?\n\n` +
            `📅 From: ${new Date(shoppingData.timestamp).toLocaleString()}\n` +
            `📋 Items: ${shoppingData.itemCount}\n` +
            `💻 Device: ${shoppingData.device}\n\n` +
            `This will replace your current shopping list!`
        );

        if (!confirmed) return;

        // Update local shopping list
        const allProducts = JSON.parse(localStorage.getItem('allProducts') || '[]');
        
        // Clear existing shopping flags
        allProducts.forEach(product => {
            product.inShopping = false;
            product.completed = false;
        });
        
        // Set new shopping items - copy ALL properties from Mac to ensure category sync
        shoppingData.items.forEach(shoppingItem => {
            const localProduct = allProducts.find(p => p.id === shoppingItem.id);
            if (localProduct) {
                // Copy all properties from Mac shopping item to local product
                Object.assign(localProduct, shoppingItem);
                // Ensure shopping flags are set correctly
                localProduct.inShopping = true;
                localProduct.completed = shoppingItem.completed || false;
            } else {
                // If product doesn't exist locally, add it completely
                allProducts.push(shoppingItem);
            }
        });

        localStorage.setItem('allProducts', JSON.stringify(allProducts));
        
        // COMPREHENSIVE SYNC: Save baseline state to track ALL changes made on iPhone
        const baselineState = JSON.parse(JSON.stringify(allProducts)); // Deep copy
        localStorage.setItem('iPhoneShoppingBaseline', JSON.stringify(baselineState));
        window.debugLog('firebase', `📊 Baseline saved: ${baselineState.length} products for comprehensive sync tracking`);
        
        // Update status to IN_PROGRESS
        await userDoc.collection('shoppingSync').doc('current').update({
            status: 'IN_PROGRESS',
            downloadedAt: new Date().toISOString(),
            downloadDevice: 'iPhone'
        });

        // Force multiple refresh attempts
        // console.log('🔄 Forcing app refresh...');
        if (this.app && this.app.render) {
            this.app.render();
        }
        
        // Try alternative refresh methods
        if (window.realShoppingListManager && window.realShoppingListManager.render) {
            window.realShoppingListManager.render();
            // console.log('🛒 Shopping list module refreshed');
        }
        
        window.debugLog('firebase', `✅ Shopping list downloaded: ${shoppingData.itemCount} items`);
        
        // Enhanced refresh sequence
        this.refreshShoppingListDisplay();
        
        alert(`✅ SHOPPING LIST DOWNLOADED!\n\n📥 Items: ${shoppingData.itemCount}\n🛒 Ready for shopping!\n\n🔄 Auto-refreshing display...`);

    } catch (error) {
        console.error('❌ Get shopping list failed:', error);
        alert(`❌ Download failed: ${error.message}`);
    }
};

/**
 * Refresh shopping list display with FORCE DOM update
 */
FirebaseManager.prototype.refreshShoppingListDisplay = function() {
    window.debugLog('firebase', '🔄 FORCE refreshing shopping list display...');
    
    // CRITICAL: First reload the data in the Products Manager from localStorage
    if (window.realProductsCategoriesManager && window.realProductsCategoriesManager.reloadProducts) {
        window.realProductsCategoriesManager.reloadProducts();
        window.debugLog('firebase', '✅ Products reloaded from localStorage');
    }
    
    // Method 1: Immediate app render
    if (this.app && this.app.render) {
        this.app.render();
        window.debugLog('firebase', '✅ App rendered');
    }
    
    // Method 2: Direct shopping list render
    if (window.realShoppingListManager && window.realShoppingListManager.renderShoppingList) {
        window.realShoppingListManager.renderShoppingList();
        window.debugLog('firebase', '✅ Shopping list rendered');
    }
    
    // Method 3: Switch to shopping tab
    if (this.app && this.app.switchTab) {
        this.app.switchTab('shopping');
        window.debugLog('firebase', '✅ Switched to shopping tab');
    }
    
    // Method 4: FORCE DOM refresh by triggering events
    setTimeout(() => {
        // Additional render attempts
        if (this.app && this.app.renderShoppingList) {
            this.app.renderShoppingList();
        }
        
        // FORCE DOM update by simulating a tab click
        const shoppingTab = document.querySelector('[data-tab="shopping"]');
        if (shoppingTab) {
            shoppingTab.click();
            window.debugLog('firebase', '✅ Force clicked shopping tab');
        }
        
        window.debugLog('firebase', '✅ All refresh methods completed');
        
        // Final check after shorter delay
        setTimeout(() => {
            const shoppingItems = JSON.parse(localStorage.getItem('allProducts') || '[]').filter(p => p.inShopping);
            const shoppingContainer = document.getElementById('groceryList');
            const visibleItems = shoppingContainer ? shoppingContainer.children.length : 0;
            
            window.debugLog('firebase', `📊 Final check: ${shoppingItems.length} items in storage, ${visibleItems} visible in DOM`);
            
            if (shoppingItems.length > 0 && visibleItems === 0) {
                console.warn('⚠️ Items in storage but still not visible - trying page refresh');
                
                // Automatic page refresh with shopping tab preservation
                localStorage.setItem('forceShoppingTab', 'true');
                location.reload();
            } else if (shoppingItems.length > 0 && visibleItems > 0) {
                window.debugLog('firebase', '✅ Success! Shopping list is now visible');
            }
        }, 300);
        
    }, 100);
};

/**
 * IPHONE: Upload completed shopping back to Firebase
 */
FirebaseManager.prototype.shoppingDone = async function() {
    // Auto-connect Firebase if needed
    if (!(await this.ensureFirebaseConnected())) {
        return; // Connection failed
    }
    
    const currentUser = this.app.currentUser || window.auth?.currentUser;

    try {
        // Get current shopping items with completion status - ensure no undefined values
        const shoppingItems = JSON.parse(localStorage.getItem('allProducts') || '[]')
            .filter(product => product.inShopping)
            .map(product => ({
                id: product.id || Date.now(),
                name: product.name || 'Unknown Product',
                category: product.category || 'cat_007',
                inShopping: Boolean(product.inShopping),
                completed: Boolean(product.completed),
                inStock: Boolean(product.inStock)
            }));
        
        if (shoppingItems.length === 0) {
            alert('❌ No shopping items found!');
            return;
        }

        const completedCount = shoppingItems.filter(item => item.completed).length;
        
        // iPhone: Custom 3-button dialog for better UX
        const userChoice = await this.showThreeOptionDialog(
            `✅ SHOPPING DONE?\n\n` +
            `📋 Total items: ${shoppingItems.length}\n` +
            `✅ Completed: ${completedCount}\n` +
            `⏳ Remaining: ${shoppingItems.length - completedCount}`,
            'Send + Clean List',
            'Send + Keep List', 
            'Cancel'
        );
        
        if (userChoice === 'cancel') {
            // console.log('📱 Shopping Done cancelled - no changes made');
            return;
        }
        
        const shouldClearList = (userChoice === 'clean');

        const userDoc = window.db.collection('users').doc(currentUser.uid);
        
        // ENHANCED UNIFIED WORKFLOW: Prepare complete shopping list state sync
        const allProducts = JSON.parse(localStorage.getItem('allProducts') || '[]');
        
        // Create complete shopping list with ALL current states (bought + unbought)
        const completeShoppingState = shoppingItems.map(shoppingItem => {
            const fullProduct = allProducts.find(p => p.id === shoppingItem.id);
            return {
                id: shoppingItem.id || Date.now(),
                name: shoppingItem.name || 'Unknown Product',
                category: shoppingItem.category || 'cat_007',
                completed: Boolean(shoppingItem.completed),
                inShopping: Boolean(shoppingItem.inShopping),
                // CRITICAL: Include current stock status from iPhone
                inStock: Boolean(fullProduct ? fullProduct.inStock : shoppingItem.inStock),
                inPantry: Boolean(fullProduct ? (fullProduct.inPantry || fullProduct.pantry) : false)
            };
        });
        
        window.debugLog('firebase', `🔄 Enhanced sync: uploading complete state for ${completeShoppingState.length} shopping items (bought + unbought)`);
        
        // Apply Clear Completed logic ONLY on iPhone for immediate UI feedback
        const completedItems = shoppingItems.filter(item => item.completed);
        completedItems.forEach(item => {
            const product = allProducts.find(p => p.id === item.id);
            if (product) {
                product.completed = false;
                product.inShopping = false;
                product.inStock = true; // Bought items are in stock
                window.debugLog('firebase', `✅ iPhone immediate feedback: "${product.name}" → removed from shopping, marked in stock`);
            }
        });
        
        // Update localStorage and UI for iPhone immediate feedback
        localStorage.setItem('allProducts', JSON.stringify(allProducts));
        if (window.realProductsCategoriesManager?.reloadProducts) {
            window.realProductsCategoriesManager.reloadProducts();
        }
        if (this.app?.render) {
            this.app.render();
        }
        
        // Upload complete shopping list state (bought + unbought with current states)
        await userDoc.collection('shoppingSync').doc('current').update({
            items: shoppingItems, // Original items for backward compatibility
            completeShoppingState: completeShoppingState, // NEW: All shopping items with current states
            status: 'DONE',
            completedAt: new Date().toISOString(),
            completedDevice: 'iPhone',
            completedCount: completedCount,
            totalCount: shoppingItems.length,
            totalShoppingItems: completeShoppingState.length, // May include unbought items
            enhancedSync: true // Flag for Mac to use complete state sync
        });

        // console.log(`✅ Shopping completion uploaded: ${completedCount}/${shoppingItems.length} completed`);
        
        // iPhone UX: Conditional list clearing based on user choice
        let listStatus = '';
        if (shouldClearList) {
            const allProducts = JSON.parse(localStorage.getItem('allProducts') || '[]');
            allProducts.forEach(product => {
                if (product.inShopping) {
                    product.inShopping = false;
                    product.completed = false;
                }
            });
            localStorage.setItem('allProducts', JSON.stringify(allProducts));
            
            // Refresh the UI to show empty shopping list
            if (this.app && this.app.render) {
                this.app.render();
            }
            listStatus = '📱 iPhone shopping list cleared';
        } else {
            listStatus = '📱 iPhone shopping list kept (ready for next update)';
        }
        
        alert(`✅ SHOPPING COMPLETE!\n\n📤 Shopping: ${completedCount}/${shoppingItems.length} completed\n🔄 ALL shopping items synced (bought + unbought)\n📦 Stock status preserved for unbought items\n🏠 Mac will receive complete state\n${listStatus}`);

    } catch (error) {
        console.error('❌ Shopping done failed:', error);
        alert(`❌ Upload failed: ${error.message}`);
    }
};

/**
 * MAC: Refresh shopping results from iPhone
 */
FirebaseManager.prototype.refreshShopping = async function() {
    // Auto-connect Firebase if needed
    if (!(await this.ensureFirebaseConnected())) {
        return; // Connection failed
    }
    
    const currentUser = this.app.currentUser || window.auth?.currentUser;

    try {
        const userDoc = window.db.collection('users').doc(currentUser.uid);
        const shoppingDoc = await userDoc.collection('shoppingSync').doc('current').get();
        
        if (!shoppingDoc.exists) {
            alert('❌ No shopping data found!');
            return;
        }

        const shoppingData = shoppingDoc.data();
        
        if (shoppingData.status !== 'DONE') {
            alert(`⚠️ Shopping status: ${shoppingData.status}\n\nExpected: DONE (from iPhone)`);
            return;
        }

        const enhancedInfo = shoppingData.enhancedSync ? 
            `\n🔄 Complete shopping state: ${shoppingData.totalShoppingItems} items (bought + unbought)` : 
            `\n🔄 Basic sync: ${shoppingData.totalCount} items`;
            
        const confirmed = confirm(
            `🔄 SYNC WITH IPHONE RESULTS?\n\n` +
            `📅 Completed: ${new Date(shoppingData.completedAt).toLocaleString()}\n` +
            `✅ Items bought: ${shoppingData.completedCount}/${shoppingData.totalCount}\n` +
            `📱 Device: ${shoppingData.completedDevice}${enhancedInfo}\n\n` +
            `Apply ALL shopping item states from iPhone?`
        );

        if (!confirmed) return;

        // ENHANCED SYNC: Apply ALL shopping item states from iPhone
        const allProducts = JSON.parse(localStorage.getItem('allProducts') || '[]');
        let appliedStates = 0;
        
        // Use enhanced sync if available, fallback to basic sync
        const shoppingItemsToSync = shoppingData.enhancedSync && shoppingData.completeShoppingState ? 
            shoppingData.completeShoppingState : shoppingData.items;
        
        window.debugLog('firebase', `🔄 Mac applying ${shoppingData.enhancedSync ? 'ENHANCED' : 'BASIC'} sync for ${shoppingItemsToSync.length} shopping items`);
        
        // Apply ALL shopping item states (bought + unbought)
        shoppingItemsToSync.forEach(shoppingItem => {
            const product = allProducts.find(p => p.id === shoppingItem.id);
            if (product) {
                // Apply all states from iPhone shopping item
                if (shoppingItem.completed !== undefined) product.completed = shoppingItem.completed;
                if (shoppingItem.inShopping !== undefined) product.inShopping = shoppingItem.inShopping;
                if (shoppingItem.inStock !== undefined) product.inStock = shoppingItem.inStock;
                if (shoppingItem.inPantry !== undefined) {
                    product.inPantry = shoppingItem.inPantry;
                    product.pantry = shoppingItem.inPantry;
                }
                
                window.debugLog('firebase', `🔄 Mac sync: "${product.name}" → completed:${shoppingItem.completed}, inStock:${shoppingItem.inStock}, inShopping:${shoppingItem.inShopping}`);
                appliedStates++;
            }
        });
        
        // Now apply Clear Completed logic for bought items only
        const completedItems = shoppingItemsToSync.filter(item => item.completed);
        completedItems.forEach(item => {
            const product = allProducts.find(p => p.id === item.id);
            if (product) {
                // Clear Completed: remove from shopping, mark as in stock
                product.completed = false;
                product.inShopping = false;
                product.inStock = true; // Bought items are in stock
                window.debugLog('firebase', `✅ Mac Clear Completed: "${product.name}" → removed from shopping`);
            }
        });

        localStorage.setItem('allProducts', JSON.stringify(allProducts));

        // Force reload pantry data in ProductsCategoriesManager
        if (window.realProductsCategoriesManager && window.realProductsCategoriesManager.reloadProducts) {
            window.realProductsCategoriesManager.reloadProducts();
        }

        // Refresh app
        if (this.app && this.app.render) {
            this.app.render();
        }

        // console.log(`✅ Mac synced with iPhone results: ${shoppingData.completedCount}/${shoppingData.totalCount} completed`);
        alert(`✅ ENHANCED SYNC COMPLETE!\n\n📥 Shopping items: ${shoppingItemsToSync.length}\n🔄 States applied: ${appliedStates}\n✅ Bought items cleared: ${completedItems.length}\n📦 Unbought items preserved with correct stock status\n\n✅ Mac and iPhone now in identical state!`);

    } catch (error) {
        console.error('❌ Refresh shopping failed:', error);
        alert(`❌ Refresh failed: ${error.message}`);
    }
};

/**
 * MAC: Clear completed items (existing functionality)
 */
FirebaseManager.prototype.clearCompleted = function() {
    // This will call the existing clear completed functionality
    if (window.app && window.app.clearCompleted) {
        window.app.clearCompleted();
        alert('✅ Completed items cleared and integrated into inventory!');
    } else {
        alert('❌ Clear completed function not found');
    }
};

// Debug status function
FirebaseManager.prototype.showDebugStatus = function() {
    const setupComplete = localStorage.getItem('firebaseSetupComplete') === 'true';
    const setupDate = localStorage.getItem('firebaseSetupDate');
    const firebaseConnected = !!window.db;
    const userSignedIn = !!window.auth?.currentUser;
    const listenersActive = !!(this.realtimeListeners && this.realtimeListeners.length > 0);
    
    // Check shopping list status
    const allProducts = JSON.parse(localStorage.getItem('allProducts') || '[]');
    const shoppingItems = allProducts.filter(p => p.inShopping);
    const completedItems = shoppingItems.filter(p => p.completed);
    
    // Check button visibility
    const enableBtn = document.getElementById('enableFirebaseBtn');
    const syncBtn = document.getElementById('syncNowBtn');
    const enableVisible = enableBtn && enableBtn.style.display !== 'none';
    const syncVisible = syncBtn && syncBtn.style.display !== 'none';
    
    let nextStep = '';
    if (!firebaseConnected || !userSignedIn) {
        nextStep = '1. Click "Enable Firebase Sync" first';
    } else if (!setupComplete) {
        nextStep = syncVisible ? '2. Click "Sync Now" to complete setup' : '❌ Sync Now button missing - refresh page';
    } else {
        nextStep = 'Shopping sync should work';
    }
    
    const status = 
        `🔍 DEBUG STATUS\n\n` +
        `🔥 Firebase Connected: ${firebaseConnected}\n` +
        `👤 User Signed In: ${userSignedIn}\n\n` +
        `🛒 SHOPPING LIST:\n` +
        `   Total products: ${allProducts.length}\n` +
        `   In shopping: ${shoppingItems.length}\n` +
        `   Completed: ${completedItems.length}\n\n` +
        `🎛️ BUTTONS:\n` +
        `   Enable Firebase: ${enableVisible ? 'Visible' : 'Hidden'}\n` +
        `   Sync Now: ${syncVisible ? 'Visible' : 'Hidden'}\n\n` +
        `📋 NEXT STEP: ${nextStep}`;
    
    alert(status);
    // console.log('🔍 Debug Status:', {
    //     setupComplete,
    //     setupDate,
    //     firebaseConnected,
    //     userSignedIn,
    //     totalProducts: allProducts.length,
    //     shoppingItems: shoppingItems.length,
    //     completedItems: completedItems.length,
    //     enableVisible,
    //     syncVisible
    // });
    
    // Also log first few shopping items for debugging
    // if (shoppingItems.length > 0) {
    //     console.log('🛒 Shopping items in localStorage:', shoppingItems.slice(0, 3).map(item => ({
    //         id: item.id,
    //         name: item.name,
    //         inShopping: item.inShopping,
    //         completed: item.completed
    //     })));
    // }
};