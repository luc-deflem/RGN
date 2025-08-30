/**
 * REAL PANTRY MODULE - v6.0.0 UNIFIED ARCHITECTURE
 * 
 * Contains ALL pantry functionality using FILTERED VIEWS of master products
 * Version: 6.0.0-unified-filtered-views
 * 
 * v6.0.0 BREAKING CHANGE: No more local pantryItems array!
 * All data comes from window.realProductsCategoriesManager.getAllProducts() 
 * filtered by pantry=true flag. This ensures single source of truth.
 * 
 * PANTRY CONCEPT: Permanent stock list of products you always want to have available.
 * Other products can be temporarily "in stock" without being part of your core Pantry.
 */

class RealPantryManager {
    constructor() {
        // v6.0.0 UNIFIED: No more local pantryItems array
        // All data comes from window.realProductsCategoriesManager.getAllProducts() filtered by pantry=true
        this.categories = null; // Will be set by the app
        this.skipNextSync = false; // Flag to skip sync after manual toggles
    }

    /**
     * Set categories from the main app
     */
    setCategories(categories) {
        this.categories = categories;
        // console.log(`📂 Pantry manager using ${categories.length} categories from main app`);
    }

    /**
     * Initialize the pantry module
     * v6.0.0 UNIFIED: No initialization needed - uses filtered views
     */
    async initialize() {
        // v6.0.1 FIX: Use Products Manager categories instead of defaults
        if (window.realProductsCategoriesManager) {
            this.categories = window.realProductsCategoriesManager.getAllCategories();
            // console.log(`✅ Pantry using ${this.categories.length} categories from Products Manager`);
        } else if (!this.categories) {
            this.categories = this.getDefaultCategories();
            // console.log('⚠️ Pantry using default categories - Products Manager not available');
        }
        
        // v6.0.0: Check if products manager is available
        if (!window.realProductsCategoriesManager) {
            console.warn('⚠️ Products manager not yet available - pantry will use filtered views when ready');
        }
        
        // Set up UI event listeners
        this.setupEventListeners();

        const pantryCount = this.getPantryProducts().length;
        // console.log(`🏠 Pantry Manager initialized - ${pantryCount} pantry items (unified v6.0.0)`);
        return this;
    }

    /**
     * v6.0.0 UNIFIED: Get pantry products (filtered view of master products)
     */
    getPantryProducts() {
        if (!window.realProductsCategoriesManager) {
            // console.warn('⚠️ Products manager not available - returning empty array');
            return [];
        }
        return window.realProductsCategoriesManager.getPantryProducts();
    }

    /**
     * v6.0.0 UNIFIED: Get all products (for access to full dataset)
     */
    getAllProducts() {
        if (!window.realProductsCategoriesManager) {
            // console.warn('⚠️ Products manager not available - returning empty array');
            return [];
        }
        return window.realProductsCategoriesManager.getAllProducts();
    }

    /**
     * Set up pantry-specific UI event listeners
     */
    setupEventListeners() {
        const addBtn = document.getElementById('addStandardBtn');
        const itemInput = document.getElementById('standardItemInput');
        const categorySelect = document.getElementById('standardCategorySelect');
        const addAllUnstockedBtn = document.getElementById('addAllUnstocked');

        if (addBtn && itemInput && categorySelect) {
            const handleAdd = () => {
                const itemName = itemInput.value.trim();
                const category = categorySelect.value;

                if (!itemName) {
                    itemInput.focus();
                    return;
                }

                const result = this.addItem(itemName, category);
                if (result) {
                    itemInput.value = '';
                    itemInput.focus();
                    this.refreshDisplay();
                }
            };

            addBtn.addEventListener('click', handleAdd);
            itemInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    handleAdd();
                }
            });
        } else {
            console.warn('⚠️ Pantry add controls not found - event listeners not attached');
        }

        if (addAllUnstockedBtn) {
            addAllUnstockedBtn.addEventListener('click', () => {
                if (window.realShoppingListManager && window.realShoppingListManager.addAllUnstockedToShopping) {
                    window.realShoppingListManager.addAllUnstockedToShopping();
                }
            });
        }
    }

    // v6.0.0 UNIFIED: Storage methods removed - all data managed by products manager

    /**
     * Get sample pantry items for new users
     */
    getSamplePantryItems() {
        return [
            {id: 1, name: 'olive oil', category: 'cat_004', inStock: true, inSeason: true, addedDate: new Date().toISOString()},
            {id: 2, name: 'salt', category: 'cat_004', inStock: true, inSeason: true, addedDate: new Date().toISOString()},
            {id: 3, name: 'black pepper', category: 'cat_004', inStock: false, inSeason: true, addedDate: new Date().toISOString()},
            {id: 4, name: 'onions', category: 'cat_001', inStock: true, inSeason: true, addedDate: new Date().toISOString()},
            {id: 5, name: 'garlic', category: 'cat_001', inStock: false, inSeason: true, addedDate: new Date().toISOString()},
            {id: 6, name: 'butter', category: 'cat_002', inStock: true, inSeason: true, addedDate: new Date().toISOString()}
        ];
    }

    /**
     * Get default categories (compatible with main app structure)
     */
    getDefaultCategories() {
        return [
            {key: 'cat_001', id: 'cat_001', name: 'produce', emoji: '🥬', displayName: 'Produce'},
            {key: 'cat_002', id: 'cat_002', name: 'dairy', emoji: '🥛', displayName: 'Dairy'},
            {key: 'cat_003', id: 'cat_003', name: 'meat', emoji: '🥩', displayName: 'Meat'},
            {key: 'cat_004', id: 'cat_004', name: 'pantry', emoji: '🥫', displayName: 'Pantry'},
            {key: 'cat_005', id: 'cat_005', name: 'frozen', emoji: '🧊', displayName: 'Frozen'},
            {key: 'cat_006', id: 'cat_006', name: 'bakery', emoji: '🍞', displayName: 'Bakery'},
            {key: 'cat_007', id: 'cat_007', name: 'other', emoji: '📦', displayName: 'Other'}
        ];
    }

    /**
     * Get all pantry items
     * v6.0.0 UNIFIED: Returns filtered view of master products
     */
    getAllItems() {
        return this.getPantryProducts();
    }

    /**
     * Get pantry items count
     * v6.0.0 UNIFIED: Count from filtered view
     */
    getItemsCount() {
        return this.getPantryProducts().length;
    }

    /**
     * Get in-stock count
     * v6.0.0 UNIFIED: Filter from unified data
     */
    getInStockCount() {
        return this.getPantryProducts().filter(item => item.inStock).length;
    }

    /**
     * Get out-of-stock count
     * v6.0.0 UNIFIED: Filter from unified data
     */
    getOutOfStockCount() {
        return this.getPantryProducts().filter(item => !item.inStock).length;
    }

    /**
     * Get items by category
     * v6.0.0 UNIFIED: Filter from unified data
     */
    getItemsByCategory(category) {
        return this.getPantryProducts().filter(item => item.category === category);
    }

    /**
     * Get items by stock status
     * v6.0.0 UNIFIED: Filter from unified data
     */
    getItemsByStockStatus(inStock) {
        return this.getPantryProducts().filter(item => item.inStock === inStock);
    }

    /**
     * Add new item to pantry
     * v6.0.0 UNIFIED: Delegates to products manager
     */
    addItem(name, category = 'cat_004') {
        if (!window.realProductsCategoriesManager) {
            console.error('❌ Products manager not available');
            return false;
        }

        if (!name || typeof name !== 'string') {
            console.error('❌ Invalid item name provided');
            return false;
        }

        name = name.trim();
        if (!name) {
            console.error('❌ Item name cannot be empty');
            return false;
        }

        // Check if product already exists
        const allProducts = window.realProductsCategoriesManager.getAllProducts();
        const existingProduct = allProducts.find(product => 
            product.name.toLowerCase() === name.toLowerCase()
        );

        if (existingProduct) {
            // Product exists - just toggle pantry flag
            if (existingProduct.pantry) {
                console.warn(`⚠️ Item "${name}" already in pantry`);
                return false;
            } else {
                // Add to pantry by toggling flag
                return window.realProductsCategoriesManager.toggleProductPantry(existingProduct.id);
            }
        } else {
            // Create new product with pantry=true
            const newProduct = window.realProductsCategoriesManager.addProduct(name, category);
            if (newProduct) {
                // Set pantry flag
                newProduct.pantry = true;
                newProduct.inStock = true; // Default to in stock when adding to pantry
                window.realProductsCategoriesManager.saveProducts();
                // console.log(`➕ Added "${name}" to pantry (new product)`);
                return newProduct;
            }
            return false;
        }
    }

    /**
     * Delete pantry item
     * v6.0.0 UNIFIED: Toggles pantry flag to false
     */
    deleteItem(id) {
        if (!window.realProductsCategoriesManager) {
            console.error('❌ Products manager not available');
            return false;
        }

        const allProducts = window.realProductsCategoriesManager.getAllProducts();
        const product = allProducts.find(product => product.id === id);
        
        if (!product) {
            console.error(`❌ Product with id ${id} not found`);
            return false;
        }

        if (!product.pantry) {
            console.warn(`⚠️ Product "${product.name}" is not in pantry`);
            return false;
        }

        // Remove from pantry by toggling flag to false
        const result = window.realProductsCategoriesManager.toggleProductPantry(id);
        if (result) {
            // console.log(`🗑️ Removed "${product.name}" from pantry (unified v6.0.0)`);
        }
        return result;
    }

    /**
     * Toggle stock status of pantry item
     * v6.0.0 UNIFIED: Delegates to products manager
     */
    toggleStockStatus(id) {
        if (!window.realProductsCategoriesManager) {
            console.error('❌ Products manager not available');
            return false;
        }

        const result = window.realProductsCategoriesManager.toggleProductInStock(id);
        if (result) {
            // console.log(`🔄 Toggled stock status (unified v6.0.0): "${result.name}" → ${result.inStock ? 'in stock' : 'out of stock'}`);
            
            // Refresh display
            this.refreshDisplay();
        }
        
        return result;
    }

    /**
     * Toggle season status of pantry item
     * v6.0.0 UNIFIED: Delegates to products manager
     */
    toggleSeasonStatus(id) {
        if (!window.realProductsCategoriesManager) {
            console.error('❌ Products manager not available');
            return false;
        }

        const result = window.realProductsCategoriesManager.toggleProductInSeason(id);
        if (result) {
            // console.log(`🌱 Toggled season status (unified v6.0.0): "${result.name}" → ${result.inSeason ? 'in season' : 'out of season'}`);
            
            // Refresh display
            this.refreshDisplay();
        }
        
        return result;
    }

    /**
     * Edit pantry item name
     * TODO v6.0.0: Update to use unified products manager (currently still uses old references)
     */
    editItemName(id, newName) {
        if (!newName || typeof newName !== 'string') {
            console.error('❌ Invalid new name provided');
            return false;
        }

        newName = newName.trim();
        if (!newName) {
            console.error('❌ New name cannot be empty');
            return false;
        }

        const item = this.pantryItems.find(item => item.id === id);
        if (!item) {
            console.error(`❌ Pantry item with id ${id} not found`);
            return false;
        }

        // Check for duplicates (excluding current item)
        const existingItem = this.pantryItems.find(otherItem => 
            otherItem.id !== id &&
            otherItem.name.toLowerCase() === newName.toLowerCase() &&
            otherItem.category === item.category
        );

        if (existingItem) {
            console.warn(`⚠️ Item "${newName}" already exists in pantry`);
            return false;
        }

        const oldName = item.name;
        item.name = newName;
        this.saveToStorage();

        // console.log(`✏️ Renamed pantry item: "${oldName}" → "${newName}"`);
        return item;
    }

    /**
     * Change item category
     */
    changeItemCategory(id, newCategory) {
        const item = this.pantryItems.find(item => item.id === id);
        if (!item) {
            console.error(`❌ Pantry item with id ${id} not found`);
            return false;
        }

        const oldCategory = item.category;
        item.category = newCategory;
        this.saveToStorage();

        // console.log(`📂 Changed "${item.name}" category: ${oldCategory} → ${newCategory}"`);
        return item;
    }

    /**
     * Get out-of-stock items (for adding to shopping list)
     * Only returns items that are both out of stock AND in season
     * v6.0.0 UNIFIED: Filter from unified data
     */
    getOutOfStockItems() {
        return this.getPantryProducts().filter(item => 
            !item.inStock && (item.inSeason !== false) // Default to true if undefined
        );
    }

    /**
     * Clear all completed/marked items
     */
    clearItems(filterFn = null) {
        const originalCount = this.pantryItems.length;
        
        if (filterFn && typeof filterFn === 'function') {
            this.pantryItems = this.pantryItems.filter(item => !filterFn(item));
        } else {
            this.pantryItems = [];
        }

        const removedCount = originalCount - this.pantryItems.length;
        this.saveToStorage();

        // console.log(`🧹 Cleared ${removedCount} pantry items`);
        return removedCount;
    }

    /**
     * Search pantry items
     * v6.0.0 UNIFIED: Search within filtered pantry products
     */
    searchItems(query) {
        const pantryProducts = this.getPantryProducts();
        
        if (!query || typeof query !== 'string') {
            return pantryProducts;
        }

        const searchTerm = query.toLowerCase().trim();
        if (!searchTerm) {
            return pantryProducts;
        }

        return pantryProducts.filter(item =>
            item.name.toLowerCase().includes(searchTerm) ||
            item.category.toLowerCase().includes(searchTerm)
        );
    }

    /**
     * Get statistics
     * v6.0.0 UNIFIED: Calculate stats from filtered pantry products
     */
    getStatistics() {
        const pantryProducts = this.getPantryProducts();
        const total = pantryProducts.length;
        const inStock = this.getInStockCount();
        const outOfStock = this.getOutOfStockCount();
        const inSeason = pantryProducts.filter(item => item.inSeason).length;

        // Category breakdown
        const byCategory = {};
        this.categories.forEach(cat => {
            const catId = cat.id || cat.key;
            byCategory[catId] = this.getItemsByCategory(catId).length;
        });

        return {
            total,
            inStock,
            outOfStock,
            inSeason,
            outOfSeason: total - inSeason,
            stockRate: total > 0 ? Math.round((inStock / total) * 100) : 0,
            byCategory
        };
    }

    /**
     * Export pantry data
     */
    exportData() {
        return {
            pantryItems: this.pantryItems,
            statistics: this.getStatistics(),
            exportDate: new Date().toISOString(),
            version: '3.3.5-cleanup-temp-dirs'
        };
    }

    /**
     * Import pantry data
     */
    importData(data) {
        if (!data || !Array.isArray(data.pantryItems)) {
            console.error('❌ Invalid import data format');
            return false;
        }

        try {
            // Validate each item
            const validItems = data.pantryItems.filter(item => 
                item && 
                typeof item.name === 'string' && 
                item.name.trim() &&
                typeof item.category === 'string'
            );

            if (validItems.length === 0) {
                console.error('❌ No valid pantry items found in import data');
                return false;
            }

            // Update IDs to prevent conflicts
            let maxId = this.pantryItems.length > 0 ? Math.max(...this.pantryItems.map(item => item.id)) : 0;
            validItems.forEach(item => {
                if (!item.id || this.pantryItems.find(existing => existing.id === item.id)) {
                    item.id = ++maxId;
                }
            });

            this.pantryItems = validItems;
            this.nextId = maxId + 1;
            this.saveToStorage();

            console.log(`📥 Imported ${validItems.length} pantry items`);
            return true;
        } catch (e) {
            console.error('❌ Failed to import pantry data:', e);
            return false;
        }
    }

    /**
     * Group items by category for display
     * v6.0.0 UNIFIED: Group filtered pantry products by category
     */
    getGroupedByCategory() {
        const grouped = {};
        const pantryProducts = this.getPantryProducts();
        
        // Initialize all categories - use 'id' for app categories, 'key' for fallback
        this.categories.forEach(cat => {
            const catId = cat.id || cat.key;
            grouped[catId] = [];
        });

        // Group items
        pantryProducts.forEach(item => {
            if (grouped[item.category]) {
                grouped[item.category].push(item);
            } else {
                // Handle unknown categories - fall back to 'other'
                if (!grouped['cat_007']) {
                    grouped['cat_007'] = [];
                }
                grouped['cat_007'].push(item);
            }
        });

        // Remove empty categories for display
        Object.keys(grouped).forEach(key => {
            if (grouped[key].length === 0) {
                delete grouped[key];
            }
        });

        return grouped;
    }

    /**
     * Render pantry items HTML
     * v6.0.0 UNIFIED: Render from filtered pantry products
     */
    renderItemsHTML() {
        const pantryProducts = this.getPantryProducts();
        if (pantryProducts.length === 0) {
            return `
                <div class="empty-state">
                    <span class="emoji">🏠</span>
                    <p>Your pantry list is empty</p>
                    <p>Add items you want to keep in stock permanently</p>
                </div>
            `;
        }

        const groupedItems = this.getGroupedByCategory();
        let html = '';

        // Render each category
        Object.keys(groupedItems).forEach(categoryKey => {
            const category = this.categories.find(cat => (cat.id || cat.key) === categoryKey) || 
                           {id: categoryKey, key: categoryKey, emoji: '📦', displayName: categoryKey, name: categoryKey};
            
            html += this.renderCategorySectionHTML(category, groupedItems[categoryKey]);
        });

        return html;
    }

    /**
     * Render category section HTML
     */
    renderCategorySectionHTML(category, items) {
        // Sort items: 1) In season first, 2) Then alphabetically by name
        const sortedItems = items.sort((a, b) => {
            // First sort by season (in season first)
            const aInSeason = a.inSeason !== false; // Default to true if undefined
            const bInSeason = b.inSeason !== false; // Default to true if undefined
            
            if (aInSeason && !bInSeason) return -1; // a comes first (in season)
            if (!aInSeason && bInSeason) return 1;  // b comes first (in season)
            
            // If same season status, sort alphabetically
            return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
        });
        
        // Separate in-season and out-of-season items
        const inSeasonItems = sortedItems.filter(item => item.inSeason !== false);
        const outOfSeasonItems = sortedItems.filter(item => item.inSeason === false);
        
        // Build items HTML with separator if both groups exist
        let itemsHTML = '';
        
        // Add in-season items
        if (inSeasonItems.length > 0) {
            itemsHTML += inSeasonItems.map(item => this.renderItemHTML(item)).join('');
        }
        
        // Add separator and out-of-season items if they exist
        if (inSeasonItems.length > 0 && outOfSeasonItems.length > 0) {
            itemsHTML += `<div class="season-separator">
                <div class="separator-line"></div>
                <span class="separator-text">🌐 Out of Season</span>
                <div class="separator-line"></div>
            </div>`;
        }
        
        if (outOfSeasonItems.length > 0) {
            itemsHTML += outOfSeasonItems.map(item => this.renderItemHTML(item)).join('');
        }
        
        return `
            <div class="category-section" data-category="${category.id || category.key}">
                <h3 class="category-header">
                    <span class="category-emoji">${category.emoji}</span>
                    <span class="category-name">${category.displayName || category.name}</span>
                    <span class="category-count">${items.length}</span>
                </h3>
                <div class="category-items">
                    ${itemsHTML}
                </div>
            </div>
        `;
    }

    /**
     * Render individual item HTML
     */
    renderItemHTML(item) {
        const inSeason = item.inSeason !== false; // Default to true if undefined
        
        // DEBUG: Check for Bosui specifically - commented out for production
        // if (item.name.toLowerCase().includes('bosui')) {
        //     console.log('🏠 PANTRY RENDER DEBUG - Bosui rendering:', {
        //         itemName: item.name,
        //         itemId: item.id,
        //         inStock: item.inStock,
        //         inSeason: inSeason,
        //         fullItem: item
        //     });
        // }
        
        return `
            <div class="pantry-item ${item.inStock ? 'in-stock' : 'out-of-stock'} ${inSeason ? 'in-season' : 'out-of-season'}" data-id="${item.id}">
                <!-- Stock Section: Square checkbox + Clickable status -->
                <div class="stock-section">
                    <input 
                        type="checkbox" 
                        class="stock-checkbox checkbox-square" 
                        ${item.inStock ? 'checked' : ''}
                        onchange="window.realPantryManager.toggleStockStatus(${item.id});"
                        title="Toggle stock status"
                    >
                    <div class="stock-content" onclick="window.realProductsCategoriesManager.openProductEditModalFromItem(${item.id}, '${this.escapeHtml(item.name).replace(/'/g, '\\\'')}')" style="cursor: pointer;" title="Click to edit this product">
                        <div class="stock-name">${this.escapeHtml(item.name)}</div>
                        <div class="stock-status ${item.inStock ? 'in-stock' : 'out-of-stock'}" 
                             onclick="event.stopPropagation(); window.realPantryManager.toggleStockStatus(${item.id});" 
                             style="cursor: pointer;" 
                             title="Click to toggle: ${item.inStock ? 'In Stock → Out of Stock' : 'Out of Stock → In Stock'}">
                            ${item.inStock ? '✅ In Stock' : '❌ Out of Stock'}
                        </div>
                    </div>
                </div>
                
                <!-- Season Section: Beautiful emoji toggle -->
                <div class="season-actions">
                    <span class="season-emoji ${inSeason ? 'in-season' : 'out-of-season'}" 
                          onclick="window.realPantryManager.toggleSeasonStatus(${item.id});" 
                          style="cursor: pointer; font-size: 18px; margin-right: 8px;" 
                          title="Click to toggle: ${inSeason ? 'In Season → Out of Season' : 'Out of Season → In Season'}">
                        ${inSeason ? '🌱' : '🍂'}
                    </span>
                    <button class="cart-toggle-btn ${this.isItemInShoppingList(item) ? 'in-shopping' : 'not-in-shopping'}" 
                            onclick="window.realPantryManager.toggleShoppingList(${item.id})" 
                            title="${this.isItemInShoppingList(item) ? 'Remove from shopping list' : 'Add to shopping list'}">
                        ${this.isItemInShoppingList(item) ? '🛒' : '🛒'}
                    </button>
                    <button class="delete-btn" onclick="window.realPantryManager.deleteItemPrompt(${item.id})">×</button>
                </div>
            </div>
        `;
    }

    /**
     * Utility function to escape HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Sync pantry items with main products data to fix data inconsistency
     */
    syncWithMainProductsData() {
        // Skip sync if we just made a manual toggle to prevent overwriting
        if (this.skipNextSync) {
            // console.log('🚫 Skipping sync - manual toggle just performed');
            this.skipNextSync = false;
            return;
        }
        
        // console.log('🔄 Starting sync with main products data...');
        
        if (window.realProductsCategoriesManager) {
            const mainProducts = window.realProductsCategoriesManager.getAllProducts();
            let syncedCount = 0;
            
            this.pantryItems.forEach(pantryItem => {
                // Find matching product in main products list by name and category
                const matchingProduct = mainProducts.find(p => 
                    p.name.toLowerCase() === pantryItem.name.toLowerCase() && 
                    p.category === pantryItem.category
                );
                
                if (matchingProduct) {
                    // Sync stock status and other relevant data
                    const wasChanged = pantryItem.inStock !== matchingProduct.inStock || 
                                     pantryItem.inSeason !== matchingProduct.inSeason;
                    
                    if (wasChanged) {
                        // console.log(`🔄 PANTRY SYNC: "${pantryItem.name}" stock: ${pantryItem.inStock} → ${matchingProduct.inStock}, season: ${pantryItem.inSeason} → ${matchingProduct.inSeason}`);
                        pantryItem.inStock = matchingProduct.inStock;
                        pantryItem.inSeason = matchingProduct.inSeason;
                        syncedCount++;
                    }
                }
            });
            
            if (syncedCount > 0) {
                this.saveToStorage();
                // console.log(`🔄 Pantry sync completed: ${syncedCount} items updated`);
            }
        }
    }

    /**
     * Refresh display (to be called after changes)
     */
    refreshDisplay() {
        // console.log('🔄 PANTRY: Starting refreshDisplay...');
        
        // Check if pantry tab is active
        const currentTab = window.realMenuManager ? window.realMenuManager.getCurrentTab() : 
                          (window.app ? window.app.currentTab : null);
        // console.log('📋 PANTRY: Current tab is:', currentTab);
        
        // TEMPORARILY DISABLED: Sync with main products data before rendering to ensure consistency
        // this.syncWithMainProductsData();
        
        const pantryContainer = document.getElementById('standardList');
        if (pantryContainer) {
            // console.log('🔄 PANTRY: Found container, updating HTML...');
            const newHTML = this.renderItemsHTML();
            pantryContainer.innerHTML = newHTML;
            // console.log('🔄 PANTRY: HTML updated successfully');
        } else {
            console.warn('⚠️ PANTRY: standardList container not found for refresh');
        }
        
        // Update stats if available
        this.updateStatsDisplay();
        
        // Force a re-render through the app if available (only if pantry is active)
        if (currentTab === 'pantry' && window.app && window.app.renderPantryList) {
            // console.log('🔄 PANTRY: Also calling app.renderPantryList...');
            window.app.renderPantryList();
        }
        
        // console.log('✅ PANTRY: refreshDisplay completed');
    }

    /**
     * Update statistics display
     */
    updateStatsDisplay() {
        const stats = this.getStatistics();
        
        // Update various stat displays if they exist
        const elements = {
            'pantryItemCount': `${stats.total} items`,
            'pantryStockRate': `${stats.stockRate}% in stock`,
            'pantryInStock': stats.inStock,
            'pantryOutOfStock': stats.outOfStock
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }

    /**
     * Prompt for editing item name
     */
    editItemPrompt(id) {
        const item = this.pantryItems.find(item => item.id === id);
        if (!item) return;

        const newName = prompt(`Edit item name:`, item.name);
        if (newName && newName.trim() && newName.trim() !== item.name) {
            if (this.editItemName(id, newName.trim())) {
                this.refreshDisplay();
            }
        }
    }

    /**
     * Prompt for changing category
     */
    changeCategoryPrompt(id) {
        const item = this.pantryItems.find(item => item.id === id);
        if (!item) return;

        const categoryOptions = this.categories.map(cat => {
            const catId = cat.id || cat.key;
            return `${catId === item.category ? '*' : ' '} ${cat.emoji} ${cat.name} (${catId})`;
        }).join('\n');

        const newCategory = prompt(
            `Change category for "${item.name}":\n\n${categoryOptions}\n\nEnter category ID:`, 
            item.category
        );

        if (newCategory && newCategory.trim() !== item.category) {
            const validCategory = this.categories.find(cat => (cat.id || cat.key) === newCategory.trim());
            if (validCategory) {
                if (this.changeItemCategory(id, newCategory.trim())) {
                    this.refreshDisplay();
                }
            } else {
                alert(`Invalid category: ${newCategory}. Please use one of: ${this.categories.map(c => c.id || c.key).join(', ')}`);
            }
        }
    }

    /**
     * Prompt for deleting item
     */
    deleteItemPrompt(id) {
        // v6.0.2 UNIFIED BUG FIX: Use unified data instead of old pantryItems array
        const pantryProducts = this.getPantryProducts();
        const item = pantryProducts.find(item => item.id === id);
        if (!item) return;

        if (confirm(`Remove "${item.name}" from pantry?`)) {
            if (this.deleteItem(id)) {
                this.refreshDisplay();
            }
        }
    }

    /**
     * Check if pantry item is in shopping list
     */
    isItemInShoppingList(pantryItem) {
        // First try to check via master products list (most reliable)
        if (window.app?.allProducts) {
            const product = window.app.allProducts.find(p => 
                p.name.toLowerCase() === pantryItem.name.toLowerCase()
            );
            if (product) {
                return !!product.inShopping;
            }
        }
        
        // Fallback to shopping list comparison
        if (window.realShoppingListManager) {
            const shoppingItems = window.realShoppingListManager.getAllItems();
            return shoppingItems.some(shoppingItem => 
                shoppingItem.name.toLowerCase() === pantryItem.name.toLowerCase()
            );
        }
        
        return false;
    }

    /**
     * Toggle pantry item in shopping list
     */
    toggleShoppingList(id) {
        // v6.0.2 UNIFIED BUG FIX: Use unified data instead of old pantryItems array
        const pantryProducts = this.getPantryProducts();
        const item = pantryProducts.find(item => item.id === id);
        if (!item) return;

        // console.log(`🔄 === CART TOGGLE START for "${item.name}" ===`);
        // console.log('📊 Initial state:', {
        //     isInShoppingList: this.isItemInShoppingList(item),
        //     masterProductExists: !!window.app?.allProducts?.find(p => p.name.toLowerCase() === item.name.toLowerCase()),
        //     masterProductInShopping: window.app?.allProducts?.find(p => p.name.toLowerCase() === item.name.toLowerCase())?.inShopping
        // });

        if (this.isItemInShoppingList(item)) {
            this.removeFromShoppingList(id);
        } else {
            this.addToShoppingList(id);
        }

        // Force refresh after toggle to ensure UI updates immediately
        setTimeout(() => {
            // console.log(`🔄 === CART TOGGLE COMPLETE for "${item.name}" ===`);
            // console.log('📊 After toggle state:', {
            //     isInShoppingListNow: this.isItemInShoppingList(item),
            //     shoppingItemExists: !!window.realShoppingListManager?.getAllItems().find(si => si.name.toLowerCase() === item.name.toLowerCase())
            // });
            
            // Also ensure master product is synced if available
            if (window.app?.allProducts) {
                const masterProduct = window.app.allProducts.find(p => 
                    p.name.toLowerCase() === item.name.toLowerCase()
                );
                if (masterProduct && window.realShoppingListManager) {
                    const shouldBeInShopping = window.realShoppingListManager.getAllItems()
                        .some(si => si.name.toLowerCase() === item.name.toLowerCase());
                    
                    // console.log(`🔧 Master product sync check for "${item.name}":`, {
                    //     currentInShopping: masterProduct.inShopping,
                    //     shouldBeInShopping: shouldBeInShopping,
                    //     needsUpdate: masterProduct.inShopping !== shouldBeInShopping
                    // });
                    
                    if (masterProduct.inShopping !== shouldBeInShopping) {
                        // console.log(`🔧 CORRECTING master product "${item.name}": ${masterProduct.inShopping} → ${shouldBeInShopping}`);
                        masterProduct.inShopping = shouldBeInShopping;
                        
                        // Save updated products
                        if (window.app.productsManager?.saveAllProducts) {
                            window.app.productsManager.saveAllProducts();
                        }
                        
                        // console.log(`✅ Master product "${item.name}" updated and saved`);
                    } else {
                        // console.log(`✅ Master product "${item.name}" already in sync`);
                    }
                }
            }
            
            this.refreshDisplay();
            // console.log(`🎯 Cart toggle complete for "${item.name}"`);
        }, 100);
    }

    /**
     * Remove item from shopping list (integration point)
     */
    removeFromShoppingList(id) {
        // v6.0.2 UNIFIED BUG FIX: Use unified data instead of old pantryItems array
        const pantryProducts = this.getPantryProducts();
        const item = pantryProducts.find(item => item.id === id);
        if (!item) return;

        if (window.realShoppingListManager) {
            // Find the shopping item by name
            const shoppingItems = window.realShoppingListManager.getAllItems();
            const shoppingItem = shoppingItems.find(si => 
                si.name.toLowerCase() === item.name.toLowerCase()
            );
            
            if (shoppingItem) {
                window.realShoppingListManager.deleteItem(shoppingItem.id);
                // console.log(`🛒 Removed "${item.name}" from shopping list`);
                
                // Shopping list will auto-refresh when user switches to shopping tab
                this.refreshDisplay();
            }
        }
    }

    /**
     * Add item to shopping list (integration point)
     */
    addToShoppingList(id) {
        // v6.0.2 UNIFIED BUG FIX: Use unified data instead of old pantryItems array
        const pantryProducts = this.getPantryProducts();
        const item = pantryProducts.find(item => item.id === id);
        if (!item) return;

        // Try to use the real shopping list manager if available
        if (window.realShoppingListManager) {
            // Set fromStandard=true and originalStockStatus=false since we're adding out-of-stock pantry items
            const added = window.realShoppingListManager.addItem(item.name, item.category, true, false);
            if (added) {
                // console.log(`🛒 Added "${item.name}" to shopping list from pantry`);
                
                // Shopping list will auto-refresh when user switches to shopping tab
                this.refreshDisplay();
            }
        } else {
            console.warn('⚠️ Shopping list manager not available');
            alert(`Added "${item.name}" to shopping list`);
        }
    }
}

// Make the class globally available
window.RealPantryManager = RealPantryManager;

window.debugLog('pantry', `🏠 Real Pantry Manager loaded - v6.0.0-unified-filtered-views`);