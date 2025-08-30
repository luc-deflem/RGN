/**
 * REAL PRODUCTS-CATEGORIES MODULE - Complete Implementation
 * 
 * Contains ALL products and categories functionality - fully independent
 * Version: 3.4.0-products-categories-real
 * 
 * UNIFIED APPROACH: Products and Categories are tightly coupled so managed together
 */

class RealProductsCategoriesManager {
    constructor() {
        this.categories = [];
        this.products = [];
        this.nextCategoryId = 1;
        this.nextProductId = 1;
        
        this.defaultCategories = [
            {id: 'cat_001', name: 'produce', emoji: '🥬', order: 0, isDefault: true, displayName: 'Produce'},
            {id: 'cat_002', name: 'dairy', emoji: '🥛', order: 1, isDefault: true, displayName: 'Dairy'},
            {id: 'cat_003', name: 'meat', emoji: '🥩', order: 2, isDefault: true, displayName: 'Meat'},
            {id: 'cat_004', name: 'pantry', emoji: '🥫', order: 3, isDefault: true, displayName: 'Pantry'},
            {id: 'cat_005', name: 'frozen', emoji: '🧊', order: 4, isDefault: true, displayName: 'Frozen'},
            {id: 'cat_006', name: 'bakery', emoji: '🍞', order: 5, isDefault: true, displayName: 'Bakery'},
            {id: 'cat_007', name: 'other', emoji: '📦', order: 6, isDefault: true, displayName: 'Other'}
        ];
    }

    /**
     * Initialize the products-categories module
     */
    async initialize() {
        this.categories = this.loadCategories();
        this.products = this.loadProducts();
        
        // Initialize default categories if none exist
        if (this.categories.length === 0) {
            this.categories = [...this.defaultCategories];
            this.saveCategories();
        } else {
            this.migrateCategoryIds();
        }
        
        // Validate and fix product-category relationships
        this.validateProductCategories();
        
        // console.log(`📂 Products-Categories Manager initialized with ${this.categories.length} categories and ${this.products.length} products`);
        return this;
    }

    // ========== COUNT METHODS ==========
    
    /**
     * Get number of products
     */
    getProductsCount() {
        return this.products.length;
    }
    
    /**
     * Get number of categories
     */
    getCategoriesCount() {
        return this.categories.length;
    }

    // ========== CATEGORIES MANAGEMENT ==========

    /**
     * Load categories from localStorage
     */
    loadCategories() {
        try {
            let saved = localStorage.getItem('categories');
            
            if (!saved || saved === 'null') {
                saved = localStorage.getItem('categories_backup');
                // console.log('📁 Loaded categories from backup');
            }
            
            let categories = saved ? JSON.parse(saved) : [];
            
            if (categories.length === 0 && !localStorage.getItem('categories_initialized')) {
                categories = [...this.defaultCategories];
                localStorage.setItem('categories_initialized', 'true');
                // console.log('📱 New user - loaded default categories');
            }
            
            // console.log(`📂 Loaded ${categories.length} categories from localStorage`);
            return categories;
        } catch (e) {
            console.error('❌ Could not load categories:', e);
            return [...this.defaultCategories];
        }
    }

    /**
     * Save categories to localStorage
     */
    saveCategories() {
        try {
            const data = JSON.stringify(this.categories);
            localStorage.setItem('categories', data);
            localStorage.setItem('categories_backup', data);
            localStorage.setItem('categories_timestamp', new Date().toISOString());
            // console.log(`💾 Saved ${this.categories.length} categories to localStorage`);
        } catch (e) {
            console.error('❌ Could not save categories:', e);
        }
    }

    /**
     * Get all categories
     */
    getAllCategories() {
        return this.categories;
    }

    /**
     * Get category by ID
     */
    getCategoryById(id) {
        return this.categories.find(cat => cat.id === id);
    }

    /**
     * Get category name by ID
     */
    getCategoryName(id) {
        const category = this.getCategoryById(id);
        return category ? (category.displayName || category.name) : 'unknown';
    }

    /**
     * Get category emoji by ID
     */
    getCategoryEmoji(id) {
        const category = this.getCategoryById(id);
        return category ? (category.emoji || '📦') : '📦';
    }

    /**
     * Add new category
     */
    addCategory(name, emoji = '📦') {
        if (!name || typeof name !== 'string') {
            console.error('❌ Invalid category name provided');
            return false;
        }

        name = name.trim();
        if (!name) {
            console.error('❌ Category name cannot be empty');
            return false;
        }

        // Check for duplicates
        const existingCategory = this.categories.find(cat => 
            cat.name.toLowerCase() === name.toLowerCase()
        );

        if (existingCategory) {
            console.warn(`⚠️ Category "${name}" already exists`);
            return false;
        }

        // Generate ID
        const maxOrder = this.categories.length > 0 ? Math.max(...this.categories.map(c => c.order || 0)) : -1;
        const newId = `cat_${String(this.categories.length + 1).padStart(3, '0')}`;

        const newCategory = {
            id: newId,
            name: name.toLowerCase(),
            emoji: emoji,
            order: maxOrder + 1,
            isDefault: false,
            displayName: name.charAt(0).toUpperCase() + name.slice(1)
        };

        this.categories.push(newCategory);
        this.saveCategories();

        // Update any category dropdowns in the UI
        this.updateCategorySelects();

        // console.log(`➕ Added category: ${newCategory.displayName} (${newCategory.id})`);
        return newCategory;
    }

    /**
     * Edit category
     */
    editCategory(id, newName, newEmoji) {
        const category = this.getCategoryById(id);
        if (!category) {
            console.error(`❌ Category with id ${id} not found`);
            return false;
        }

        if (category.isDefault) {
            console.warn(`⚠️ Cannot edit default category ${category.name}`);
            return false;
        }

        if (newName) {
            const trimmedName = newName.trim();
            if (trimmedName) {
                category.name = trimmedName.toLowerCase();
                category.displayName = trimmedName.charAt(0).toUpperCase() + trimmedName.slice(1);
            }
        }

        if (newEmoji) {
            const oldEmoji = category.emoji;
            category.emoji = newEmoji;
            console.log('🔧 DEBUG: Updated emoji from', oldEmoji, 'to', newEmoji);
        }

        console.log('🔧 DEBUG: Saving categories...');
        this.saveCategories();
        // Refresh category dropdowns after edit
        this.updateCategorySelects();
        // console.log(`✏️ Edited category: ${category.displayName}`);
        return category;
    }

    /**
     * Delete category (and handle orphaned products)
     */
    deleteCategory(id) {
        const category = this.getCategoryById(id);
        if (!category) {
            console.error(`❌ Category with id ${id} not found`);
            return false;
        }

        if (category.isDefault) {
            console.warn(`⚠️ Cannot delete default category ${category.name}`);
            return false;
        }

        // Move products in this category to 'other'
        const affectedProducts = this.products.filter(p => p.category === id);
        affectedProducts.forEach(product => {
            product.category = 'cat_007'; // Move to 'other'
        });

        this.categories = this.categories.filter(cat => cat.id !== id);
        this.saveCategories();
        this.saveProducts();

        // Refresh category dropdowns after deletion
        this.updateCategorySelects();

        // console.log(`🗑️ Deleted category: ${category.displayName} (moved ${affectedProducts.length} products to Other)`);
        return true;
    }

    /**
     * Reorder categories based on provided ID order
     */
    reorderCategories(newOrder) {
        if (!Array.isArray(newOrder)) return;
        newOrder.forEach((categoryId, index) => {
            const category = this.getCategoryById(categoryId);
            if (category) {
                category.order = index;
            }
        });
        this.saveCategories();
        this.updateCategorySelects();
    }

    /**
     * Move category from one position to another (for drag and drop)
     */
    moveCategory(fromIndex, toIndex) {
        if (!this.categories || fromIndex === toIndex) return;
        
        // Get sorted categories by current order
        const sortedCategories = this.categories
            .slice()
            .sort((a, b) => (a.order || 0) - (b.order || 0));
        
        // Move the category in the sorted array
        const [movedCategory] = sortedCategories.splice(fromIndex, 1);
        sortedCategories.splice(toIndex, 0, movedCategory);
        
        // Update order values based on new positions
        sortedCategories.forEach((category, index) => {
            category.order = index;
        });
        
        // Save changes
        this.saveCategories();
        
        console.log(`✅ Moved category "${movedCategory.displayName}" from position ${fromIndex} to ${toIndex}`);
    }

    /**
     * Migrate old name-based category IDs to stable IDs
     */
    migrateCategoryIds() {
        // console.log('🔄 Checking for category ID migration...');
        let needsMigration = false;
        const idMapping = {};
        
        this.categories.forEach((cat, index) => {
            if (cat.id === cat.name) {
                const oldId = cat.id;
                const newId = `cat_${String(index + 1).padStart(3, '0')}`;
                cat.id = newId;
                idMapping[oldId] = newId;
                needsMigration = true;
                // console.log(`📝 Migrating category "${oldId}" -> "${newId}"`);
            }
        });
        
        if (needsMigration) {
            // Update products to use new category IDs
            this.products.forEach(product => {
                if (idMapping[product.category]) {
                    product.category = idMapping[product.category];
                }
            });
            
            this.saveCategories();
            this.saveProducts();
            // console.log('✅ Category migration completed');
        }
    }

    // ========== PRODUCTS MANAGEMENT ==========

    /**
     * Load products from localStorage
     */
    loadProducts() {
        try {
            let saved = localStorage.getItem('allProducts');
            
            if (!saved || saved === 'null') {
                saved = localStorage.getItem('allProducts_backup');
                // console.log('📁 Loaded products from backup');
            }
            
            let products = saved ? JSON.parse(saved) : [];
            
            if (products.length === 0 && !localStorage.getItem('allProducts_initialized')) {
                products = this.getSampleProducts();
                localStorage.setItem('allProducts_initialized', 'true');
                // console.log('📱 New user - loaded sample products');
            }
            
            // Ensure all products have required properties
            products = products.map(product => ({
                id: product.id || Date.now() + Math.random(),
                name: product.name || 'Unknown Product',
                category: product.category || 'cat_007',
                inShopping: product.inShopping || false,
                inPantry: product.inPantry || false,
                inStock: product.inStock || false,
                inSeason: product.inSeason !== undefined ? product.inSeason : true,
                completed: product.completed || false,
                recipeCount: product.recipeCount || 0,
                dateAdded: product.dateAdded || new Date().toISOString()
            }));
            
            // console.log(`📦 Loaded ${products.length} products from localStorage`);
            return products;
        } catch (e) {
            console.error('❌ Could not load products:', e);
            return this.getSampleProducts();
        }
    }

    /**
     * Save products to localStorage
     */
    saveProducts() {
        try {
            const data = JSON.stringify(this.products);
            localStorage.setItem('allProducts', data);
            localStorage.setItem('allProducts_backup', data);
            localStorage.setItem('allProducts_timestamp', new Date().toISOString());
            // console.log(`💾 Saved ${this.products.length} products to localStorage`);
        } catch (e) {
            console.error('❌ Could not save products:', e);
        }
    }

    /**
     * Reload products from localStorage (for Firebase sync updates)
     */
    reloadProducts() {
        console.log('🔄 Reloading products from localStorage after Firebase sync...');
        this.products = this.loadProducts();
        console.log(`✅ Reloaded ${this.products.length} products (${this.getShoppingProducts().length} in shopping)`);
        return this.products;
    }

    /**
     * Get sample products for new users
     */
    getSampleProducts() {
        return [
            {id: 1, name: 'bananas', category: 'cat_001', inShopping: false, inPantry: false, inStock: false, inSeason: true, completed: false, recipeCount: 0, dateAdded: new Date().toISOString()},
            {id: 2, name: 'milk', category: 'cat_002', inShopping: false, inPantry: false, inStock: false, inSeason: true, completed: false, recipeCount: 0, dateAdded: new Date().toISOString()},
            {id: 3, name: 'bread', category: 'cat_006', inShopping: false, inPantry: false, inStock: false, inSeason: true, completed: false, recipeCount: 0, dateAdded: new Date().toISOString()},
            {id: 4, name: 'olive oil', category: 'cat_004', inShopping: false, inPantry: true, inStock: true, inSeason: true, completed: false, recipeCount: 0, dateAdded: new Date().toISOString()},
            {id: 5, name: 'chicken breast', category: 'cat_003', inShopping: false, inPantry: false, inStock: false, inSeason: true, completed: false, recipeCount: 0, dateAdded: new Date().toISOString()}
        ];
    }

    /**
     * PHASE 1: Migrate pantry data to master products (Single Source of Truth)
     */
    migratePantryToMasterProducts() {
        // console.log('🔄 PHASE 1: Starting pantry → master products migration...');
        
        if (!window.realPantryManager) {
            console.error('❌ Pantry manager not available for migration');
            return { success: false, error: 'Pantry manager not found' };
        }
        
        const pantryItems = window.realPantryManager.getAllItems();
        // console.log(`📦 Found ${pantryItems.length} pantry items to migrate`);
        
        let created = 0;
        let updated = 0;
        let errors = [];
        
        pantryItems.forEach(pantryItem => {
            try {
                // Find existing master product by name and category
                let masterProduct = this.products.find(p => 
                    p.name.toLowerCase() === pantryItem.name.toLowerCase() && 
                    p.category === pantryItem.category
                );
                
                if (masterProduct) {
                    // Update existing master product with pantry data
                    const oldInPantry = masterProduct.inPantry;
                    const oldInStock = masterProduct.inStock;
                    const oldInSeason = masterProduct.inSeason;
                    
                    masterProduct.inPantry = true; // It's in pantry
                    masterProduct.inStock = pantryItem.inStock; // Migrate stock status
                    masterProduct.inSeason = pantryItem.inSeason; // Migrate season status
                    
                    // console.log(`🔄 Updated "${pantryItem.name}":`, {
                    //     inPantry: `${oldInPantry} → ${masterProduct.inPantry}`,
                    //     inStock: `${oldInStock} → ${masterProduct.inStock}`, 
                    //     inSeason: `${oldInSeason} → ${masterProduct.inSeason}`
                    // });
                    updated++;
                } else {
                    // Create new master product from pantry item
                    const newProduct = {
                        id: this.generateProductId(),
                        name: pantryItem.name,
                        category: pantryItem.category,
                        inShopping: false,
                        inPantry: true,              // ✅ It's in pantry
                        inStock: pantryItem.inStock, // ✅ Migrate from pantry
                        inSeason: pantryItem.inSeason, // ✅ Migrate from pantry
                        completed: false,
                        recipeCount: 0,
                        dateAdded: pantryItem.dateAdded || new Date().toISOString()
                    };
                    
                    this.products.push(newProduct);
                    // console.log(`➕ Created master product "${pantryItem.name}" from pantry item`);
                    created++;
                }
            } catch (error) {
                console.error(`❌ Failed to migrate pantry item "${pantryItem.name}":`, error);
                errors.push({ item: pantryItem.name, error: error.message });
            }
        });
        
        // Save the updated master products
        this.saveProducts();
        
        const result = {
            success: true,
            created,
            updated,
            total: pantryItems.length,
            errors
        };
        
        // console.log('✅ PHASE 1 Migration completed:', result);
        return result;
    }

    /**
     * PHASE 2: Migrate shopping data to master products (Single Source of Truth)
     */
    migrateShoppingToMasterProducts() {
        // console.log('🔄 PHASE 2: Starting shopping → master products migration...');
        
        if (!window.realShoppingListManager) {
            console.error('❌ Shopping list manager not available for migration');
            return { success: false, error: 'Shopping list manager not found' };
        }
        
        const shoppingItems = window.realShoppingListManager.getAllItems();
        // console.log(`🛒 Found ${shoppingItems.length} shopping items to migrate`);
        
        let created = 0;
        let updated = 0;
        let errors = [];
        
        shoppingItems.forEach(shoppingItem => {
            try {
                // Find existing master product by name and category
                let masterProduct = this.products.find(p => 
                    p.name.toLowerCase() === shoppingItem.name.toLowerCase() && 
                    p.category === shoppingItem.category
                );
                
                if (masterProduct) {
                    // Update existing master product with shopping data
                    const oldInShopping = masterProduct.inShopping;
                    const oldCompleted = masterProduct.completed;
                    
                    masterProduct.inShopping = true; // It's in shopping list
                    masterProduct.completed = shoppingItem.completed; // Migrate completion status
                    
                    // console.log(`🔄 Updated "${shoppingItem.name}":`, {
                    //     inShopping: `${oldInShopping} → ${masterProduct.inShopping}`,
                    //     completed: `${oldCompleted} → ${masterProduct.completed}`
                    // });
                    updated++;
                } else {
                    // Create new master product from shopping item
                    const newProduct = {
                        id: this.generateProductId(),
                        name: shoppingItem.name,
                        category: shoppingItem.category,
                        inShopping: true,              // ✅ It's in shopping list
                        inPantry: false,
                        inStock: false,
                        inSeason: true,
                        completed: shoppingItem.completed, // ✅ Migrate from shopping
                        recipeCount: 0,
                        dateAdded: shoppingItem.addedDate || new Date().toISOString()
                    };
                    
                    this.products.push(newProduct);
                    // console.log(`➕ Created master product "${shoppingItem.name}" from shopping item`);
                    created++;
                }
            } catch (error) {
                console.error(`❌ Failed to migrate shopping item "${shoppingItem.name}":`, error);
                errors.push({ item: shoppingItem.name, error: error.message });
            }
        });
        
        // Save the updated master products
        this.saveProducts();
        
        const result = {
            success: true,
            created,
            updated,
            total: shoppingItems.length,
            errors
        };
        
        // console.log('✅ PHASE 2 Migration completed:', result);
        return result;
    }

    /**
     * PHASE 3: Single Source of Truth - Filtered Views
     */
    
    /**
     * Get pantry items (filtered view of master products)
     */
    getPantryItems() {
        return this.products.filter(p => p.inPantry === true);
    }
    
    /**
     * Get shopping items (filtered view of master products)
     */
    getShoppingItems() {
        return this.products.filter(p => p.inShopping === true);
    }
    
    /**
     * Get items by stock status
     */
    getItemsByStockStatus(inStock) {
        return this.products.filter(p => p.inPantry === true && p.inStock === inStock);
    }
    
    /**
     * Add item to pantry (creates/updates master product)
     */
    addItemToPantry(name, category = 'cat_001') {
        if (!name || typeof name !== 'string') {
            console.error('❌ Invalid item name provided');
            return false;
        }

        const trimmedName = name.trim();
        if (!trimmedName) {
            console.error('❌ Item name cannot be empty');
            return false;
        }

        // Check if product already exists in master products
        let existingProduct = this.products.find(p => 
            p.name.toLowerCase() === trimmedName.toLowerCase() && 
            p.category === category
        );

        if (existingProduct) {
            if (existingProduct.inPantry) {
                console.warn(`⚠️ Item "${trimmedName}" is already in pantry`);
                return false;
            } else {
                // Add existing product to pantry
                existingProduct.inPantry = true;
                existingProduct.inStock = true; // Default to in stock when adding to pantry
                existingProduct.inSeason = true;
                
                this.saveProducts();
                // console.log(`✅ Added existing product "${trimmedName}" to pantry`);
                return existingProduct;
            }
        } else {
            // Create new master product
            const newProduct = {
                id: this.generateProductId(),
                name: trimmedName,
                category: category,
                inShopping: false,
                inPantry: true,
                inStock: true, // Default to in stock when adding to pantry
                inSeason: true,
                completed: false,
                recipeCount: 0,
                dateAdded: new Date().toISOString()
            };
            
            this.products.push(newProduct);
            this.saveProducts();
            
            // console.log(`➕ Created new product "${trimmedName}" in pantry`);
            return newProduct;
        }
    }
    
    /**
     * Remove item from pantry (updates master product)
     */
    removeItemFromPantry(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) {
            console.error(`❌ Product with id ${productId} not found`);
            return false;
        }
        
        if (!product.inPantry) {
            console.warn(`⚠️ Product "${product.name}" is not in pantry`);
            return false;
        }
        
        product.inPantry = false;
        this.saveProducts();
        
        // console.log(`🗑️ Removed "${product.name}" from pantry`);
        return product;
    }
    
    /**
     * Toggle stock status for pantry item
     */
    togglePantryItemStock(productId) {
        const product = this.products.find(p => p.id === productId && p.inPantry);
        if (!product) {
            console.error(`❌ Pantry item with id ${productId} not found`);
            return false;
        }
        
        product.inStock = !product.inStock;
        this.saveProducts();
        
        // console.log(`🔄 Toggled "${product.name}" stock: ${product.inStock ? 'InStock' : 'OutStock'}`);
        return product;
    }
    
    /**
     * Add item to shopping list (updates master product)
     */
    addItemToShopping(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) {
            console.error(`❌ Product with id ${productId} not found`);
            return false;
        }
        
        if (product.inShopping) {
            console.warn(`⚠️ Product "${product.name}" is already in shopping list`);
            return false;
        }
        
        product.inShopping = true;
        product.completed = false;
        this.saveProducts();
        
        // console.log(`🛒 Added "${product.name}" to shopping list`);
        return product;
    }
    
    /**
     * Remove item from shopping list (updates master product)
     */
    removeItemFromShopping(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) {
            console.error(`❌ Product with id ${productId} not found`);
            return false;
        }
        
        product.inShopping = false;
        product.completed = false;
        this.saveProducts();
        
        // console.log(`🗑️ Removed "${product.name}" from shopping list`);
        return product;
    }
    
    /**
     * Toggle shopping completion status
     */
    toggleShoppingItemCompletion(productId) {
        const product = this.products.find(p => p.id === productId && p.inShopping);
        if (!product) {
            console.error(`❌ Shopping item with id ${productId} not found`);
            return false;
        }
        
        product.completed = !product.completed;
        this.saveProducts();
        
        // console.log(`${product.completed ? '✅' : '📝'} Toggled "${product.name}" completion: ${product.completed}`);
        return product;
    }

    /**
     * Generate unique product ID
     */
    generateProductId() {
        if (this.products.length === 0) {
            return 1;
        }
        return Math.max(...this.products.map(p => p.id)) + 1;
    }

    /**
     * Get all products
     */
    getAllProducts() {
        return this.products;
    }

    /**
     * Get product by ID
     */
    getProductById(id) {
        // Handle both string and number IDs with flexible comparison
        return this.products.find(p => p.id == id || p.id === String(id) || p.id === parseFloat(id));
    }

    /**
     * Find a product by name and category
     * @param {string} name - Product name to match (case-insensitive)
     * @param {string} category - Category ID to match
     * @returns {Object|undefined} Matching product if found
     */
    findProductByNameAndCategory(name, category) {
        if (!name || !category) return undefined;
        return this.products.find(p =>
            p.name?.toLowerCase() === name.toLowerCase() &&
            p.category === category
        );
    }

    /**
     * Get products by category
     */
    getProductsByCategory(categoryId) {
        return this.products.filter(p => p.category === categoryId);
    }

    // ========== UNIFIED DATA MODEL v6.0.0 - FILTERED VIEWS ==========

    /**
     * Get pantry products (replaces separate pantryItems array)
     * v6.0.1 UNIFIED BUG FIX: Support both pantry=true AND inPantry=true for backward compatibility
     */
    getPantryProducts() {
        return this.products.filter(p => p.pantry === true || p.inPantry === true);
    }

    /**
     * Get shopping list products (replaces separate shoppingItems array)
     */
    getShoppingProducts() {
        return this.products.filter(p => p.inShopping === true);
    }

    /**
     * Get products by season status
     */
    getProductsBySeason(inSeason = true) {
        return this.products.filter(p => p.inSeason === inSeason);
    }

    /**
     * Get products by stock status
     */
    getProductsByStock(inStock = true) {
        return this.products.filter(p => p.inStock === inStock);
    }

    /**
     * Get completed shopping products
     */
    getCompletedShoppingProducts() {
        return this.products.filter(p => p.inShopping === true && p.completed === true);
    }

    // ========== PRODUCT STATE MANAGEMENT ==========

    /**
     * Toggle product pantry status
     */
    toggleProductPantry(id) {
        const product = this.getProductById(id);
        if (!product) {
            console.error(`❌ Product with id ${id} not found`);
            return false;
        }
        
        // v6.0.1 UNIFIED BUG FIX: Update both flags for backward compatibility
        product.pantry = !product.pantry;
        product.inPantry = product.pantry; // Keep inPantry in sync for backward compatibility
        product.lastModified = new Date().toISOString();
        this.saveProducts();
        
        // console.log(`🏠 Toggled pantry for "${product.name}": ${product.pantry}`);
        return product;
    }

    /**
     * Toggle product shopping status
     */
    toggleProductShopping(id) {
        const product = this.getProductById(id);
        if (!product) {
            console.error(`❌ Product with id ${id} not found`);
            return false;
        }
        
        product.inShopping = !product.inShopping;
        product.lastModified = new Date().toISOString();
        this.saveProducts();
        
        // console.log(`🛒 Toggled shopping for "${product.name}": ${product.inShopping}`);
        return product;
    }

    /**
     * Toggle product stock status
     */
    toggleProductInStock(id) {
        const product = this.getProductById(id);
        if (!product) {
            console.error(`❌ Product with id ${id} not found`);
            return false;
        }
        
        product.inStock = !product.inStock;
        product.lastModified = new Date().toISOString();
        this.saveProducts();
        
        // console.log(`📦 Toggled stock for "${product.name}": ${product.inStock}`);
        return product;
    }

    /**
     * Toggle product season status
     */
    toggleProductInSeason(id) {
        const product = this.getProductById(id);
        if (!product) {
            console.error(`❌ Product with id ${id} not found`);
            return false;
        }
        
        product.inSeason = !product.inSeason;
        product.lastModified = new Date().toISOString();
        this.saveProducts();
        
        // console.log(`🌱 Toggled season for "${product.name}": ${product.inSeason}`);
        return product;
    }

    /**
     * Toggle product completed status (for shopping)
     */
    toggleProductCompleted(id) {
        const product = this.getProductById(id);
        if (!product) {
            console.error(`❌ Product with id ${id} not found`);
            return false;
        }
        
        product.completed = !product.completed;
        product.lastModified = new Date().toISOString();
        this.saveProducts();
        
        console.log(`✅ Toggled completed for "${product.name}": ${product.completed}`);
        return product;
    }

    /**
     * Toggle product stock status
     */
    toggleProductStock(id) {
        const product = this.getProductById(id);
        if (!product) {
            console.error(`❌ Product with id ${id} not found`);
            return false;
        }
        
        product.inStock = !product.inStock;
        product.lastModified = new Date().toISOString();
        this.saveProducts();
        
        // console.log(`📦 Toggled stock for "${product.name}": ${product.inStock}`);
        return product;
    }

    /**
     * Toggle product season status
     */
    toggleProductSeason(id) {
        const product = this.getProductById(id);
        if (!product) {
            console.error(`❌ Product with id ${id} not found`);
            return false;
        }
        
        product.inSeason = !product.inSeason;
        product.lastModified = new Date().toISOString();
        this.saveProducts();
        
        console.log(`🍃 Toggled season for "${product.name}": ${product.inSeason ? 'In Season' : 'Out of Season'}`);
        return product;
    }

    /**
     * Mark product as completed in shopping
     */
    markProductCompleted(id, completed = true) {
        const product = this.getProductById(id);
        if (!product) {
            console.error(`❌ Product with id ${id} not found`);
            return false;
        }
        
        product.completed = completed;
        product.bought = completed; // Set bought flag when completed
        product.lastModified = new Date().toISOString();
        this.saveProducts();
        
        console.log(`✅ Marked "${product.name}" as ${completed ? 'completed' : 'not completed'}`);
        return product;
    }

    /**
     * Add new product
     */
    addProduct(name, categoryId = 'cat_007') {
        if (!name || typeof name !== 'string') {
            console.error('❌ Invalid product name provided');
            return false;
        }

        name = name.trim();
        if (!name) {
            console.error('❌ Product name cannot be empty');
            return false;
        }

        // Check for duplicates
        const existingProduct = this.products.find(p => 
            p.name.toLowerCase() === name.toLowerCase() && 
            p.category === categoryId
        );

        if (existingProduct) {
            console.warn(`⚠️ Product "${name}" already exists in this category`);
            return false;
        }

        // Validate category exists
        if (!this.getCategoryById(categoryId)) {
            console.warn(`⚠️ Category ${categoryId} not found, using 'other'`);
            categoryId = 'cat_007';
        }

        const newProduct = {
            id: Date.now() + Math.random(),
            name: name.toLowerCase(),
            category: categoryId,
            
            // UNIFIED DATA MODEL v6.0.0 - Single Source of Truth
            pantry: false,          // In user's pantry (replaces inPantry)
            inShopping: false,      // In shopping list
            inStock: false,         // Currently have it
            completed: false,       // Bought during shopping
            bought: false,          // Bought flag for shopping journey
            inSeason: true,         // true = 🍃 green, false = 🍂 red
            
            // METADATA
            recipeCount: 0,         // Used in N recipes
            created: new Date().toISOString(),
            lastModified: new Date().toISOString()
        };

        this.products.push(newProduct);
        this.saveProducts();

        console.log(`➕ Added product: ${name} to ${categoryId}`);
        return newProduct;
    }

    /**
     * Edit product
     */
    editProduct(id, newName, newCategory) {
        const product = this.getProductById(id);
        if (!product) {
            console.error(`❌ Product with id ${id} not found`);
            return false;
        }

        if (newName) {
            const trimmedName = newName.trim();
            if (trimmedName) {
                product.name = trimmedName.toLowerCase();
            }
        }

        if (newCategory && this.getCategoryById(newCategory)) {
            product.category = newCategory;
        }

        this.saveProducts();
        console.log(`✏️ Edited product: ${product.name}`);
        return product;
    }

    /**
     * Delete product
     */
    deleteProduct(id) {
        const product = this.getProductById(id);
        if (!product) {
            console.error(`❌ Product with id ${id} not found`);
            return false;
        }

        // Remove from products list (unified data - this is the only deletion needed)
        this.products = this.products.filter(p => p.id !== id);
        this.saveProducts();

        // v6.0.0 UNIFIED: Product deletion automatically removes from all views
        // since pantry, shopping, etc. are now filtered views of this single source
        console.log(`🗑️ Deleted product: ${product.name} (unified architecture v6.0.0)`);
        
        // Refresh all module displays that show filtered views
        this.notifyModulesOfDataChange();
        
        return true;
    }

    /**
     * Search products
     */
    searchProducts(query) {
        if (!query || typeof query !== 'string') {
            return this.products;
        }

        const searchTerm = query.toLowerCase().trim();
        if (!searchTerm) {
            return this.products;
        }

        return this.products.filter(product =>
            product.name.toLowerCase().includes(searchTerm)
        );
    }

    /**
     * Filter products by search term, stock status and category
     */
    filterProducts(options = {}) {
        const {
            searchTerm = '',
            stockFilter = '',
            categoryId = ''
        } = options;

        let filtered = [...this.products];

        // Search filter
        const term = searchTerm.toLowerCase().trim();
        if (term) {
            filtered = filtered.filter(product =>
                product.name.toLowerCase().includes(term)
            );
        }

        // Stock status filter
        if (stockFilter === 'inStock') {
            filtered = filtered.filter(product =>
                product.inStock === true || product.stock === 'in'
            );
        } else if (stockFilter === 'outOfStock') {
            filtered = filtered.filter(product =>
                product.inStock === false || product.stock === 'out'
            );
        } else if (stockFilter === 'inShopping') {
            filtered = filtered.filter(product => product.inShopping);
        }

        // Category filter
        const trimmedCategory = categoryId.trim();
        if (trimmedCategory) {
            filtered = filtered.filter(
                product => product.category === trimmedCategory
            );
        }

        return filtered;
    }

    // ========== VALIDATION & MAINTENANCE ==========

    /**
     * Validate product-category relationships
     */
    validateProductCategories() {
        let fixedCount = 0;
        
        this.products.forEach(product => {
            if (!this.getCategoryById(product.category)) {
                console.warn(`🔧 Fixing orphaned product "${product.name}" with invalid category ${product.category}`);
                product.category = 'cat_007'; // Move to 'other'
                fixedCount++;
            }
        });
        
        if (fixedCount > 0) {
            this.saveProducts();
            console.log(`✅ Fixed ${fixedCount} orphaned products`);
        }
    }

    /**
     * Find orphaned products (products with invalid categories)
     */
    findOrphanedProducts() {
        return this.products.filter(product => !this.getCategoryById(product.category));
    }

    /**
     * Fix orphaned product by assigning new category
     */
    fixOrphanedProduct(productId, newCategoryId) {
        const product = this.getProductById(productId);
        if (!product) {
            return false;
        }

        if (!this.getCategoryById(newCategoryId)) {
            newCategoryId = 'cat_007'; // Default to 'other'
        }

        product.category = newCategoryId;
        this.saveProducts();
        
        console.log(`🔧 Fixed orphaned product "${product.name}" -> category ${newCategoryId}`);
        return product;
    }

    /**
     * Delete orphaned product
     */
    deleteOrphanedProduct(productId) {
        return this.deleteProduct(productId);
    }

    // ========== INTEGRATION HELPERS ==========

    /**
     * Sync product status from shopping/pantry lists
     */
    syncProductStatus(productName, category, updates) {
        const product = this.products.find(p => 
            p.name.toLowerCase() === productName.toLowerCase() && 
            p.category === category
        );
        
        if (product) {
            Object.assign(product, updates);
            this.saveProducts();
            return product;
        }
        
        return null;
    }

    /**
     * Update recipe count for product
     */
    updateRecipeCount(productName, category, count) {
        const product = this.products.find(p => 
            p.name.toLowerCase() === productName.toLowerCase() && 
            p.category === category
        );
        
        if (product) {
            product.recipeCount = Math.max(0, count);
            this.saveProducts();
            return product;
        }
        
        return null;
    }

    // ========== EXPORT/IMPORT ==========

    /**
     * Export all data
     */
    exportData() {
        return {
            categories: this.categories,
            products: this.products,
            statistics: this.getStatistics(),
            exportDate: new Date().toISOString(),
            version: '3.4.0-products-categories-real'
        };
    }

    /**
     * Import data
     */
    importData(data) {
        if (!data || !Array.isArray(data.categories) || !Array.isArray(data.products)) {
            console.error('❌ Invalid import data format');
            return false;
        }

        try {
            // Validate categories
            const validCategories = data.categories.filter(cat => 
                cat && typeof cat.name === 'string' && cat.name.trim() && cat.id
            );

            // Validate products
            const validProducts = data.products.filter(product => 
                product && typeof product.name === 'string' && product.name.trim() && product.category
            );

            if (validCategories.length === 0 && validProducts.length === 0) {
                console.error('❌ No valid categories or products found in import data');
                return false;
            }

            // Import categories first
            if (validCategories.length > 0) {
                this.categories = validCategories;
                this.saveCategories();
            }

            // Import products
            if (validProducts.length > 0) {
                this.products = validProducts;
                this.validateProductCategories(); // Fix any invalid category references
                this.saveProducts();
            }

            console.log(`📥 Imported ${validCategories.length} categories and ${validProducts.length} products`);
            return true;
        } catch (e) {
            console.error('❌ Failed to import data:', e);
            return false;
        }
    }
    
    /**
     * Import products safely (for external import functions)
     */
    importProducts(productsArray) {
        try {
            if (!Array.isArray(productsArray)) {
                throw new Error('Products must be an array');
            }
            
            console.log(`📦 Starting import of ${productsArray.length} products...`);
            
            // Validate and clean products
            const validProducts = productsArray.filter(product => {
                if (!product.id || !product.name) {
                    console.warn('⚠️ Skipping invalid product:', product);
                    return false;
                }
                return true;
            });
            
            // Assign to internal array
            this.products = validProducts;
            
            // Run validation and migrations
            this.validateProductCategories();
            this.ensureProductIntegrity();
            
            // Save to localStorage
            this.saveProducts();
            
            console.log(`✅ Successfully imported ${this.products.length} products`);
            console.log(`🛒 Shopping items: ${this.getShoppingProducts().length}`);
            console.log(`🏠 Pantry items: ${this.getPantryProducts().length}`);
            
            return {
                success: true,
                imported: this.products.length,
                shoppingItems: this.getShoppingProducts().length,
                pantryItems: this.getPantryProducts().length
            };
            
        } catch (error) {
            console.error('❌ Failed to import products:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Ensure product data integrity
     */
    ensureProductIntegrity() {
        let fixed = 0;
        
        this.products.forEach(product => {
            // Ensure required boolean flags exist
            if (typeof product.inShopping !== 'boolean') {
                product.inShopping = false;
                fixed++;
            }
            if (typeof product.inStock !== 'boolean') {
                product.inStock = false;
                fixed++;
            }
            if (typeof product.completed !== 'boolean') {
                product.completed = false;
                fixed++;
            }
            if (typeof product.inSeason !== 'boolean') {
                product.inSeason = true;
                fixed++;
            }
            
            // Ensure pantry flags are consistent
            if (typeof product.pantry !== 'boolean') {
                product.pantry = product.inPantry || false;
                fixed++;
            }
            if (typeof product.inPantry !== 'boolean') {
                product.inPantry = product.pantry || false;
                fixed++;
            }
            
            // Ensure numeric fields
            if (typeof product.recipeCount !== 'number') {
                product.recipeCount = 0;
                fixed++;
            }
        });
        
        if (fixed > 0) {
            console.log(`🔧 Fixed ${fixed} product integrity issues`);
        }
    }

    /**
     * Get statistics
     */
    getStatistics() {
        const categoryStats = {};
        this.categories.forEach(cat => {
            const products = this.getProductsByCategory(cat.id);
            categoryStats[cat.id] = {
                name: cat.displayName || cat.name,
                emoji: cat.emoji,
                productCount: products.length,
                inShopping: products.filter(p => p.inShopping).length,
                inPantry: products.filter(p => p.inPantry).length,
                inStock: products.filter(p => p.inStock).length
            };
        });

        return {
            totalCategories: this.categories.length,
            totalProducts: this.products.length,
            inShopping: this.products.filter(p => p.inShopping).length,
            inPantry: this.products.filter(p => p.inPantry).length,
            inStock: this.products.filter(p => p.inStock).length,
            inSeason: this.products.filter(p => p.inSeason).length,
            categoryBreakdown: categoryStats
        };
    }

    // ========== PRODUCT MODAL MANAGEMENT ==========

    /**
     * Open product edit modal from an item (shopping list or pantry item)
     * @param {string} itemId - The ID of the item
     * @param {string} itemName - The name of the item
     */
    openProductEditModalFromItem(itemId, itemName) {
        // console.log('🔧 [PRODUCTS] Opening product edit modal from item:', { itemId, itemName });
        
        // DEBUG: Check Bosui specifically
        if (itemName.toLowerCase().includes('bosui')) {
            console.log('🔍 BOSUI DEBUG - Before modal open:');
            // TODO: Add debug method here if needed
        }
        
        // Try to find product by ID first
        let product = this.products.find(p => p.id === itemId);
        
        // If not found by ID, try to find by name (case-insensitive)
        if (!product) {
            product = this.products.find(p => p.name.toLowerCase() === itemName.toLowerCase());
        }
        
        // If still not found, create a temporary product object for editing
        if (!product) {
            // console.warn(`⚠️ Product not found in products list for item: ${itemName} (ID: ${itemId})`);
            // console.log('🔧 Creating temporary product object for editing');
            
            // Find the item in shopping list or pantry to get its current data
            const shoppingItem = window.app ? window.app.shoppingItems.find(item => item.id === itemId) : null;
            const pantryItem = window.realPantryManager ? window.realPantryManager.getAllItems().find(item => item.id === itemId) : null;
            
            const sourceItem = shoppingItem || pantryItem;
            if (!sourceItem) {
                console.error('❌ Item not found in shopping list or pantry');
                return;
            }
            
            // Create temporary product based on item data
            product = {
                id: itemId,
                name: itemName,
                category: sourceItem.category || 'cat_001',
                inShopping: !!shoppingItem,
                inPantry: !!pantryItem,
                inStock: sourceItem.inStock || false,
                inSeason: sourceItem.inSeason !== false
            };
        }
        
        // SYNC FIX: Use source item's current data to override product data
        // CRITICAL: Use REAL shopping list manager, not stale app.shoppingItems
        const realShoppingItems = window.realShoppingListManager ? window.realShoppingListManager.getAllItems() : [];
        const shoppingItemById = realShoppingItems.find(item => item.id === itemId);
        const shoppingItemByName = realShoppingItems.find(item => item.name.toLowerCase() === itemName.toLowerCase());
        const shoppingItem = shoppingItemById || shoppingItemByName; // Try both ID and name matching
        
        const pantryItem = window.realPantryManager ? window.realPantryManager.getAllItems().find(item => item.id === itemId) : null;
        const sourceItem = shoppingItem || pantryItem;
        
        if (sourceItem && product) {
            // console.log('🔍 MODAL SYNC DEBUG - Data comparison:', {
            //     itemName: itemName,
            //     itemId: itemId,
            //     shoppingItemById: !!shoppingItemById,
            //     shoppingItemByName: !!shoppingItemByName,
            //     finalShoppingItem: !!shoppingItem,
            //     pantryItemExists: !!pantryItem,
            //     productBeforeSync: {
            //         inShopping: product.inShopping,
            //         inStock: product.inStock,
            //         inSeason: product.inSeason
            //     },
            //     sourceItemData: {
            //         inStock: sourceItem.inStock,
            //         inSeason: sourceItem.inSeason
            //     },
            //     source: shoppingItem ? 'shopping' : 'pantry'
            // });
            
            // Override product data with current source item data
            // ONLY update inStock/inSeason from pantry items (shopping items don't have stock info)
            if (pantryItem && !shoppingItem) {
                // Use pantry item data only if no shopping item exists
                product.inStock = pantryItem.inStock;
                product.inSeason = pantryItem.inSeason !== false;
            } else if (pantryItem && shoppingItem) {
                // Both exist - use pantry for stock info, keep existing master product data
                product.inStock = pantryItem.inStock;
                product.inSeason = pantryItem.inSeason !== false;
            }
            // If only shopping item exists, don't override inStock (keep master product value)
            product.category = sourceItem.category || product.category;
            
            // Ensure shopping/pantry flags are correct - CRITICAL: Check by name, not just ID
            product.inShopping = !!shoppingItem; // Now uses name-based matching too
            product.inPantry = !!pantryItem;
            
            // console.log('✅ Product data synchronized - After sync:', {
            //     inShopping: product.inShopping,
            //     inPantry: product.inPantry,
            //     inStock: product.inStock
            // });
        }
        
        // console.log('🔧 Found/created product for modal:', product);
        this.openProductEditModal(product, false);
    }

    /**
     * Open product edit modal
     * @param {object} product - The product object to edit
     * @param {boolean} isNewProduct - Whether this is a new product being created
     */
    openProductEditModal(product, isNewProduct = false) {
        // console.log('🔧 [PRODUCTS] Opening product edit modal:', { product, isNewProduct });
        
        // v6.0.4 INDEPENDENCE FIX: Make Products Manager self-sufficient, don't wait for app
        
        // Re-fetch modal element to ensure it's still available
        const modalElement = document.getElementById('productEditModal');
        if (!modalElement) {
            console.error('❌ productEditModal element not found in DOM!');
            return;
        }
        
        // Store references in Products Manager instead of app
        this.currentEditingProduct = product;
        this.isCreatingNewProduct = isNewProduct;
        
        // Also store in app if available for backward compatibility
        if (window.app) {
            window.app.productEditModal = modalElement;
            window.app.currentEditingProduct = product;
            window.app.isCreatingNewProduct = isNewProduct;
        }
        
        // Update modal title based on context
        const modalTitle = modalElement.querySelector('.modal-title');
        if (modalTitle) {
            modalTitle.textContent = isNewProduct ? 'Create New Product' : 'Edit Product';
        }
        
        // Get form elements
        const editProductName = document.getElementById('editProductName');
        const editProductCategory = document.getElementById('editProductCategory');
        const editInShopping = document.getElementById('editInShopping');
        const editCompleted = document.getElementById('editCompleted');
        const editInPantry = document.getElementById('editInPantry');
        const editInStock = document.getElementById('editInStock');
        const editInSeason = document.getElementById('editInSeason');
        
        // console.log('🔍 Form elements check:', {
        //     editProductName: !!editProductName,
        //     editProductCategory: !!editProductCategory,
        //     editInShopping: !!editInShopping,
        //     editCompleted: !!editCompleted,
        //     editInPantry: !!editInPantry,
        //     editInStock: !!editInStock,
        //     editInSeason: !!editInSeason
        // });
        
        if (!editProductName || !editProductCategory) {
            console.error('❌ Form elements not found in DOM!');
            console.error('Missing elements:', {
                editProductName: !editProductName,
                editProductCategory: !editProductCategory
            });
            return;
        }
        
        // Store form element references in Products Manager (self-sufficient)
        this.editProductName = editProductName;
        this.editProductCategory = editProductCategory;
        this.editInShopping = editInShopping;
        this.editCompleted = editCompleted;
        this.editInPantry = editInPantry;
        this.editInStock = editInStock;
        this.editInSeason = editInSeason;
        
        // Also store in app if available for backward compatibility
        if (window.app) {
            window.app.editProductName = editProductName;
            window.app.editProductCategory = editProductCategory;
            window.app.editInShopping = editInShopping;
            window.app.editCompleted = editCompleted;
            window.app.editInPantry = editInPantry;
            window.app.editInStock = editInStock;
            window.app.editInSeason = editInSeason;
        }
        
        // First populate category dropdown with all available categories
        this.populateCategoryDropdown(editProductCategory);
        
        // Populate modal fields with current product data
        editProductName.value = product.name;
        editProductCategory.value = product.category;
        editInShopping.checked = product.inShopping || false;
        
        // For completed status, check if shopping item exists and get its completed status
        let completedStatus = false;
        if (product.inShopping && window.realShoppingListManager) {
            const shoppingItem = window.realShoppingListManager.getAllItems().find(item => 
                item.name.toLowerCase() === product.name.toLowerCase()
            );
            completedStatus = shoppingItem ? shoppingItem.completed : false;
        }
        editCompleted.checked = completedStatus;
        
        editInPantry.checked = product.inPantry || false;
        editInStock.checked = product.inStock || false;
        editInSeason.checked = product.inSeason !== false; // Default to true if not set
        
        // Clear all modal styles and classes to start fresh
        modalElement.removeAttribute('class');
        modalElement.removeAttribute('style');
        modalElement.className = 'modal';
        
        // Force modal to be visible with aggressive styles
        modalElement.style.setProperty('display', 'block', 'important');
        modalElement.style.setProperty('position', 'fixed', 'important');
        modalElement.style.setProperty('top', '0', 'important');
        modalElement.style.setProperty('left', '0', 'important');
        modalElement.style.setProperty('width', '100%', 'important');
        modalElement.style.setProperty('height', '100%', 'important');
        modalElement.style.setProperty('z-index', '999999', 'important');
        modalElement.style.setProperty('background-color', 'rgba(0,0,0,0.7)', 'important');
        modalElement.style.setProperty('opacity', '1', 'important');
        modalElement.style.setProperty('visibility', 'visible', 'important');
        
        // Add a special class when opened from recipe context
        if (window.app && window.app.creatingProductForRecipe) {
            modalElement.classList.add('product-from-recipe');
            modalElement.style.setProperty('z-index', '9999999', 'important');
        }
        
        // Force the modal to the front of the stacking context
        document.body.appendChild(modalElement);
        
        // QUICK FIX: Wire up close buttons directly since window.realProductsCategoriesManager timing issues
        const closeBtn = document.getElementById('closeProductModal');
        const cancelBtn = document.getElementById('cancelProductEdit');
        const confirmBtn = document.getElementById('confirmProductEdit');
        
        if (closeBtn) {
            closeBtn.onclick = () => this.closeProductEditModal();
        }
        if (cancelBtn) {
            cancelBtn.onclick = () => this.closeProductEditModal();
        }
        if (confirmBtn) {
            // Clear any existing handlers
            confirmBtn.onclick = null;
            
            // Add onclick with logging
            confirmBtn.onclick = () => {
                console.log('🖱️ [PRODUCTS] Save button clicked via onclick');
                this.confirmProductEdit();
            };
            
            // console.log('✅ Save button onclick handler set');
        }
        
        // console.log('📋 Product modal forced visible:', {
        //     display: modalElement.style.display,
        //     zIndex: modalElement.style.zIndex,
        //     classList: modalElement.classList.toString(),
        //     elementExists: !!modalElement,
        //     isConnected: modalElement.isConnected,
        //     buttonsWired: { closeBtn: !!closeBtn, cancelBtn: !!cancelBtn, confirmBtn: !!confirmBtn }
        // });
    }

    /**
     * Populate category dropdown with available categories
     */
    populateCategoryDropdown(selectElement, includeAllOption = false) {
        // console.log('🔧 [PRODUCTS] Populating category dropdown...');

        if (!selectElement) return;

        // Clear existing options
        selectElement.innerHTML = '';

        // Add "All Categories" option for filters if requested
        if (includeAllOption) {
            const allOption = document.createElement('option');
            allOption.value = '';
            allOption.textContent = 'All Categories';
            selectElement.appendChild(allOption);
        }

        // Get categories from Categories Manager or fallback to internal categories
        let categories = [];
        if (window.realCategoriesManager && window.realCategoriesManager.getAllCategories) {
            categories = window.realCategoriesManager.getAllCategories();
            // console.log('📋 Using categories from Categories Manager:', categories.length);
        } else if (this.categories && this.categories.length > 0) {
            categories = this.categories;
            // console.log('📋 Using internal categories:', categories.length);
        } else {
            // Fallback to default categories
            categories = this.getDefaultCategories();
            // console.log('📋 Using default fallback categories:', categories.length);
        }

        // Add options to dropdown
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id || category.key;
            option.textContent = `${category.emoji || '📦'} ${category.displayName || category.name}`;
            selectElement.appendChild(option);
        });

        // console.log(`✅ Category dropdown populated with ${categories.length} options`);
    }

    /**
     * Update common category selects in the UI
     */
    updateCategorySelects() {
        const productCategorySelect = document.getElementById('productCategorySelect');
        const editProductCategory = document.getElementById('editProductCategory');
        const categoryFilter = document.getElementById('categoryFilter');
        const categorySelect = document.getElementById('categorySelect');
        const standardCategorySelect = document.getElementById('standardCategorySelect');
        const newCategorySelect = document.getElementById('newCategorySelect');

        const sortedCategories = [...this.categories].sort((a, b) => (a.order || 0) - (b.order || 0));
        const optionsHtml = sortedCategories.map(cat =>
            `<option value="${cat.id}">${cat.emoji || '📦'} ${cat.displayName || cat.name}</option>`
        ).join('');

        if (productCategorySelect) productCategorySelect.innerHTML = optionsHtml;
        if (editProductCategory) editProductCategory.innerHTML = optionsHtml;
        if (categoryFilter) categoryFilter.innerHTML = `<option value="">All Categories</option>${optionsHtml}`;
        if (categorySelect) categorySelect.innerHTML = optionsHtml;
        if (standardCategorySelect) standardCategorySelect.innerHTML = optionsHtml;
        if (newCategorySelect) newCategorySelect.innerHTML = optionsHtml;
    }

    /**
     * Get default categories if no other source available
     */
    getDefaultCategories() {
        return [
            {id: 'cat_001', key: 'cat_001', name: 'produce', emoji: '🥬', displayName: 'Produce'},
            {id: 'cat_002', key: 'cat_002', name: 'dairy', emoji: '🥛', displayName: 'Dairy'},
            {id: 'cat_003', key: 'cat_003', name: 'meat', emoji: '🥩', displayName: 'Meat'},
            {id: 'cat_004', key: 'cat_004', name: 'pantry', emoji: '🥫', displayName: 'Pantry'},
            {id: 'cat_005', key: 'cat_005', name: 'frozen', emoji: '🧊', displayName: 'Frozen'},
            {id: 'cat_006', key: 'cat_006', name: 'bakery', emoji: '🍞', displayName: 'Bakery'},
            {id: 'cat_007', key: 'cat_007', name: 'other', emoji: '📦', displayName: 'Other'}
        ];
    }

    /**
     * Open product edit modal by ID - simplified version for onclick handlers
     */
    openProductEditModalById(productId) {
        // console.log(`🔧 [PRODUCTS] Opening product edit modal by ID: ${productId}`);
        const product = this.getProductById(productId);
        if (product) {
            return this.openProductEditModal(product);
        } else {
            console.error(`❌ Product with ID ${productId} not found`);
            return false;
        }
    }

    /**
     * Open product edit modal by name and category - for shopping list items
     */
    openProductEditModalByName(productName, category) {
        // console.log(`🔧 [PRODUCTS] Opening product edit modal by name: "${productName}" in category "${category}"`);
        const product = this.products.find(p => 
            p.name.toLowerCase() === productName.toLowerCase() && 
            p.category === category
        );
        if (product) {
            return this.openProductEditModal(product);
        } else {
            console.error(`❌ Product "${productName}" in category "${category}" not found`);
            return false;
        }
    }

    /**
     * Close product edit modal
     */
    closeProductEditModal() {
        // console.log('🚪 [PRODUCTS] Closing product edit modal');
        
        // Get modal directly from DOM (self-sufficient approach)
        const modal = document.getElementById('productEditModal');
        
        if (!modal) {
            console.error('❌ [PRODUCTS] Modal element not found in DOM!');
            return;
        }
        
        // console.log('🔍 [PRODUCTS] Modal element found, current display:', modal.style.display);
        
        // Log state for debugging (safe access to window.app)
        // if (window.app) {
        //     console.log('📊 State before close:', {
        //         creatingProductForRecipe: window.app.creatingProductForRecipe,
        //         pendingIngredientName: window.app.pendingIngredientName,
        //         currentEditingProduct: window.app.currentEditingProduct,
        //         isCreatingNewProduct: window.app.isCreatingNewProduct
        //     });
        // }
        
        // Aggressively hide modal
        modal.style.setProperty('display', 'none', 'important');
        modal.style.visibility = 'hidden';
        modal.classList.remove('product-from-recipe');
        modal.classList.remove('show');
        
        // console.log('🔍 [PRODUCTS] Modal hidden, new display:', modal.style.display);
        
        // Reset our internal state
        this.currentEditingProduct = null;
        this.isCreatingNewProduct = false;
        
        // Also reset app state if available (backward compatibility)
        if (window.app) {
            window.app.currentEditingProduct = null;
            window.app.isCreatingNewProduct = false;
            
            // Reset recipe creation state if canceled
            if (window.app.resetRecipeCreationState) {
                window.app.resetRecipeCreationState();
            }
        }
        
        // console.log('✅ Product modal closed, state reset');
    }

    /**
     * Confirm product edit and save changes
     * v6.0.22 - Granular error isolation to find exception source
     */
    confirmProductEdit() {
        // console.log('💾 [PRODUCTS] Confirming product edit - Starting granular isolation...');
        
        try {
            // console.log('🔍 Step 1: Getting product data...');
            // Use our internal state first, fallback to app if needed
            const product = this.currentEditingProduct || (window.app && window.app.currentEditingProduct);
            if (!product) {
                console.error('❌ No product being edited');
                return;
            }
            // console.log('✅ Step 1 complete: Product found:', product.name);

            // console.log('🔍 Step 2: Getting form values...');
            // Get form values from our internal references (self-sufficient)
            const newName = this.editProductName ? this.editProductName.value.trim() : 
                           (window.app && window.app.editProductName ? window.app.editProductName.value.trim() : '');
            const newCategory = this.editProductCategory ? this.editProductCategory.value : 
                              (window.app && window.app.editProductCategory ? window.app.editProductCategory.value : '');
            const newInShopping = this.editInShopping ? this.editInShopping.checked : 
                                (window.app && window.app.editInShopping ? window.app.editInShopping.checked : false);
            const newInPantry = this.editInPantry ? this.editInPantry.checked : 
                              (window.app && window.app.editInPantry ? window.app.editInPantry.checked : false);
            // console.log('✅ Step 2 complete: Form values retrieved', { newName, newCategory, newInShopping, newInPantry });
            // console.log('🔍 Step 3: Getting remaining form values...');
            const newInStock = this.editInStock ? this.editInStock.checked : 
                             (window.app && window.app.editInStock ? window.app.editInStock.checked : false);
            const newInSeason = this.editInSeason ? this.editInSeason.checked : 
                              (window.app && window.app.editInSeason ? window.app.editInSeason.checked : true);
            // console.log('✅ Step 3 complete: All form values retrieved', { newInStock, newInSeason });

            // console.log('🔍 Step 4: Form validation...');
            if (!newName) {
                alert('Product name cannot be empty');
                return;
            }

            if (!newCategory) {
                alert('Product category cannot be empty. Please select a category.');
                return;
            }
            // console.log('✅ Step 4 complete: Basic validation passed');

            // console.log('🔍 Step 5: Duplicate name check...');
            // Check for duplicate names (excluding current product if editing)
            const existingProduct = this.products.find(p => 
                p.id !== product.id && p.name.toLowerCase() === newName.toLowerCase()
            );
            
            if (existingProduct) {
                alert('A product with this name already exists');
                return;
            }
            // console.log('✅ Step 5 complete: No duplicates found');

            // console.log('🔍 Step 6: Updating product properties...');
            // Update product with new values
            product.name = newName;
            product.category = newCategory;
            product.inShopping = newInShopping;
            product.inPantry = newInPantry;
            product.inStock = newInStock;
            product.inSeason = newInSeason;
            // console.log('✅ Step 6 complete: Product properties updated');

            // console.log('🔍 Step 7: Adding/updating product in lists...');
            // If this is a new product, add it to the products list
            const isCreatingNew = this.isCreatingNewProduct || (window.app && window.app.isCreatingNewProduct);
            if (isCreatingNew) {
                this.products.push(product);
                // Also add to app.allProducts for compatibility
                if (window.app && window.app.allProducts) {
                    window.app.allProducts.push(product);
                }
                // console.log('✅ Step 7a complete: New product added to lists');
            } else {
                // Update existing product in app.allProducts for compatibility
                if (window.app && window.app.allProducts) {
                    const existingIndex = window.app.allProducts.findIndex(p => p.id === product.id);
                    if (existingIndex >= 0) {
                        window.app.allProducts[existingIndex] = product;
                    }
                }
                // console.log('✅ Step 7b complete: Existing product updated in lists');
            }

            // console.log('🔍 Step 8: Saving products to storage...');
            // Save products
            this.saveProducts();
            // console.log('✅ Step 8 complete: Products saved to storage');
            
            // console.log('🔍 Step 9: Syncing with other lists...');
            // Update shopping and pantry lists to sync with product changes
            if (window.app && window.app.syncListsFromProducts) {
                window.app.syncListsFromProducts();
            }
            
            // Save other lists
            if (window.app && window.app.productsManager && window.app.productsManager.saveAllProducts) {
                window.app.productsManager.saveAllProducts();
            }
            if (window.app && window.app.shoppingList && window.app.shoppingList.saveToStorage) {
                window.app.shoppingList.saveToStorage();
            }
            // console.log('✅ Step 9 complete: Lists synchronized');
            
            // console.log('🔍 Step 10: Recipe integration handling...');
            // If we're creating a product for a recipe, auto-select it
            if (window.app && window.app.creatingProductForRecipe && window.app.pendingIngredientName) {
                if (window.app.selectProductForRecipe) {
                    window.app.selectProductForRecipe(product);
                }
            } else {
                // Clean up state if not for recipe
                if (window.app && window.app.resetRecipeCreationState) {
                    window.app.resetRecipeCreationState();
                }
            }
            // console.log('✅ Step 10 complete: Recipe integration handled');
            
            // console.log('🔍 Step 11: Firebase sync...');
            // Auto-sync product update to Firebase if connected
            if (window.db && window.app && window.app.unsubscribeFirebase) {
                // console.log('🔄 Auto-syncing product edit to Firebase...');
                if (window.app.syncSingleProductToFirebase) {
                    window.app.syncSingleProductToFirebase(product);
                }
            }
            // console.log('✅ Step 11 complete: Firebase sync handled');

            // console.log('🔍 Step 12: CRITICAL - Closing modal...');
            // Close modal first with dedicated error handling
            try {
                this.closeProductEditModal();
                // console.log('✅ Step 12 complete: Modal closed successfully');
            } catch (modalError) {
                console.error('❌ [MODAL CLOSE] Exception during modal close:', modalError);
                console.error('❌ [MODAL CLOSE] Stack trace:', modalError.stack);
                // Force close with direct DOM manipulation
                const modal = document.getElementById('productEditModal');
                if (modal) {
                    modal.style.display = 'none';
                    modal.style.visibility = 'hidden';
                    // console.log('🔧 [MODAL CLOSE] Forced modal close via direct DOM');
                }
                // RE-THROW the modal error so we know this is the problem
                throw new Error(`Modal close failed: ${modalError.message}`);
            }
            
            // console.log('🔍 Step 13: Scheduling refresh operations...');
            // Then do all refreshes with a small delay to ensure modal is closed
            setTimeout(() => {
                try {
                    // console.log('🔄 [REFRESH] Starting post-save refreshes...');
                    
                    // Re-render the app
                    if (window.app && window.app.render) {
                        // console.log('🔄 [REFRESH] Calling app.render()...');
                        window.app.render();
                    }
                    
                    // Specifically refresh shopping list if it exists and item was edited
                    if (window.realShoppingListManager && window.realShoppingListManager.renderShoppingList) {
                        // console.log('🔄 [REFRESH] Refreshing shopping list after product save...');
                        window.realShoppingListManager.renderShoppingList();
                    }
                    
                    // Also refresh pantry if it exists and item was edited
                    if (window.realPantryManager && window.realPantryManager.refreshDisplay) {
                        // console.log('🔄 [REFRESH] Refreshing pantry after product save...');
                        window.realPantryManager.refreshDisplay();
                    }
                    
                    // Refresh products list if we're on products tab
                    if (window.app && window.app.renderProductsList) {
                        // console.log('🔄 [REFRESH] Refreshing products list after product save...');
                        window.app.renderProductsList();
                    }
                    
                    // console.log('✅ [REFRESH] All post-save refreshes completed successfully');
                } catch (refreshError) {
                    console.error('❌ [REFRESH] Error during refresh operations:', refreshError);
                    console.error('❌ [REFRESH] Stack trace:', refreshError.stack);
                    // Don't throw - refreshes are not critical for save success
                }
            }, 50);
            // console.log('✅ Step 13 complete: Refresh operations scheduled');
            
            // console.log('🎉 PRODUCT EDIT COMPLETED SUCCESSFULLY - All steps passed!');
        
        } catch (error) {
            console.error('❌ [PRODUCTS] MAIN EXCEPTION CAUGHT - Step-by-step isolation results:');
            console.error('❌ [PRODUCTS] Exception details:', error.message);
            console.error('❌ [PRODUCTS] Full error object:', error);
            console.error('❌ [PRODUCTS] Stack trace:', error.stack);
            
            // Emergency modal close
            const modal = document.getElementById('productEditModal');
            if (modal) {
                modal.style.display = 'none';
                modal.style.visibility = 'hidden';
                // console.log('🚨 [PRODUCTS] Emergency modal close executed');
            }
            
            // Provide more specific error message based on the exception caught
            if (error.message && error.message.includes('Modal close failed')) {
                alert('Product saved successfully, but there was an issue closing the modal. Please refresh the page to see your changes.');
            } else {
                alert(`Error during product save: ${error.message || 'Unknown error'}. Changes may not have been saved properly.`);
            }
        }
    }

    /**
     * Notify other modules that the unified data has changed
     * v6.0.0 UNIFIED: All modules use filtered views of master products
     */
    notifyModulesOfDataChange() {
        // console.log('🔄 Notifying modules of unified data change...');
        
        // Refresh pantry display (filtered view of products where pantry=true)
        if (window.realPantryManager?.refreshDisplay) {
            window.realPantryManager.refreshDisplay();
            // console.log('🏠 Pantry display refreshed');
        }
        
        // Refresh shopping list display (filtered view of products where inShopping=true)
        if (window.realShoppingListManager?.refreshDisplay) {
            window.realShoppingListManager.refreshDisplay();
            // console.log('🛒 Shopping list display refreshed');
        }
        
        // Refresh main app display
        if (window.app?.render) {
            window.app.render();
            // console.log('📱 Main app display refreshed');
        }
        
        // console.log('✅ All module displays refreshed for unified data change');
    }
}

// Make the class globally available
window.RealProductsCategoriesManager = RealProductsCategoriesManager;

// PHASE 1: Console migration function
window.migratePantryToMaster = function() {
    console.log('🚀 Starting Phase 1: Pantry → Master Products Migration');
    
    if (!window.realProductsCategoriesManager) {
        console.error('❌ Products manager not available');
        return false;
    }
    
    // Run the migration
    const result = window.realProductsCategoriesManager.migratePantryToMasterProducts();
    
    if (result.success) {
        // Sync app's allProducts with the updated master products
        if (window.app) {
            window.app.allProducts = window.realProductsCategoriesManager.getAllProducts();
            console.log(`🔄 Synced app.allProducts: ${window.app.allProducts.length} products`);
            
            // Re-render to show updated data
            window.app.render();
            console.log('🎨 UI refreshed with migrated data');
        }
        
        console.log('🎉 PHASE 1 MIGRATION SUCCESS!');
        // console.log(`📊 Results: ${result.created} created, ${result.updated} updated, ${result.errors.length} errors`);
        
        if (result.errors.length > 0) {
            console.warn('⚠️ Migration errors:', result.errors);
        }
        
        // Test the fix
        const bosuiTest = window.app?.allProducts?.find(p => p.name.toLowerCase().includes('bosui'));
        if (bosuiTest) {
            console.log('✅ BOSUI FIX TEST:', {
                name: bosuiTest.name,
                inPantry: bosuiTest.inPantry,
                inStock: bosuiTest.inStock,
                inSeason: bosuiTest.inSeason
            });
        }
        
        return result;
    } else {
        console.error('❌ Migration failed:', result.error);
        return false;
    }
};

// PHASE 2: Console migration function
window.migrateShoppingToMaster = function() {
    console.log('🚀 Starting Phase 2: Shopping → Master Products Migration');
    
    if (!window.realProductsCategoriesManager) {
        console.error('❌ Products manager not available');
        return false;
    }
    
    // Run the migration
    const result = window.realProductsCategoriesManager.migrateShoppingToMasterProducts();
    
    if (result.success) {
        // Sync app's allProducts with the updated master products
        if (window.app) {
            window.app.allProducts = window.realProductsCategoriesManager.getAllProducts();
            console.log(`🔄 Synced app.allProducts: ${window.app.allProducts.length} products`);
            
            // Also sync the old shoppingItems for backward compatibility
            const shoppingProducts = window.app.allProducts.filter(p => p.inShopping);
            window.app.shoppingItems = shoppingProducts;
            console.log(`🛒 Synced app.shoppingItems: ${shoppingProducts.length} items`);
            
            // Re-render to show updated data
            window.app.render();
            console.log('🎨 UI refreshed with migrated data');
        }
        
        console.log('🎉 PHASE 2 MIGRATION SUCCESS!');
        console.log(`📊 Results: ${result.created} created, ${result.updated} updated, ${result.errors.length} errors`);
        
        if (result.errors.length > 0) {
            console.warn('⚠️ Migration errors:', result.errors);
        }
        
        // Test the fix with a shopping item
        const shoppingProducts = window.app?.allProducts?.filter(p => p.inShopping) || [];
        console.log(`✅ SHOPPING MIGRATION TEST: ${shoppingProducts.length} products now marked inShopping`);
        
        if (shoppingProducts.length > 0) {
            const testItem = shoppingProducts[0];
            console.log('📋 Sample migrated item:', {
                name: testItem.name,
                inShopping: testItem.inShopping,
                completed: testItem.completed
            });
        }
        
        return result;
    } else {
        console.error('❌ Migration failed:', result.error);
        return false;
    }
};

// PHASE 3: Single Source of Truth - Filtered Views
window.activateFilteredViews = function() {
    console.log('🚀 Starting Phase 3: Single Source of Truth - Filtered Views');
    
    if (!window.realProductsCategoriesManager) {
        console.error('❌ Products manager not available');
        return false;
    }
    
    if (!window.app) {
        console.error('❌ App not available');
        return false;
    }
    
    console.log('🔄 PHASE 3: Activating filtered view architecture...');
    
    // Test the filtered views
    const pantryItems = window.realProductsCategoriesManager.getPantryItems();
    const shoppingItems = window.realProductsCategoriesManager.getShoppingItems();
    const inStockItems = window.realProductsCategoriesManager.getItemsByStockStatus(true);
    const outOfStockItems = window.realProductsCategoriesManager.getItemsByStockStatus(false);
    
    console.log('✅ PHASE 3 FILTERED VIEWS ACTIVE:');
    console.log(`🏠 Pantry items (filtered): ${pantryItems.length}`);
    console.log(`🛒 Shopping items (filtered): ${shoppingItems.length}`);
    console.log(`✅ In stock items: ${inStockItems.length}`);
    console.log(`❌ Out of stock items: ${outOfStockItems.length}`);
    
    // Update app to use filtered views for backward compatibility
    window.app.shoppingItems = shoppingItems;
    console.log(`🔄 Updated app.shoppingItems to use filtered view: ${shoppingItems.length} items`);
    
    // Test specific operations
    console.log('🧪 TESTING FILTERED OPERATIONS:');
    
    // Test pantry operations
    const samplePantryItem = pantryItems[0];
    if (samplePantryItem) {
        console.log(`📋 Sample pantry item: "${samplePantryItem.name}" (ID: ${samplePantryItem.id}, inStock: ${samplePantryItem.inStock})`);
    }
    
    // Test shopping operations  
    const sampleShoppingItem = shoppingItems[0];
    if (sampleShoppingItem) {
        console.log(`📋 Sample shopping item: "${sampleShoppingItem.name}" (ID: ${sampleShoppingItem.id}, completed: ${sampleShoppingItem.completed})`);
    }
    
    console.log('🎉 PHASE 3 SUCCESS: Single Source of Truth architecture is now active!');
    console.log('🔧 All operations now use filtered master products instead of separate arrays');
    console.log('📊 Next: Modules can be updated to use these filtered methods');
    
    return {
        success: true,
        pantryItems: pantryItems.length,
        shoppingItems: shoppingItems.length,
        inStockItems: inStockItems.length,
        outOfStockItems: outOfStockItems.length,
        totalProducts: window.realProductsCategoriesManager.getAllProducts().length
    };
};

window.debugLog('products', `📦📂 Real Products-Categories Manager loaded - v3.4.3-phase3-filtered-views-ready`);
// console.log('🚀 Phase 1: Run migratePantryToMaster() to migrate pantry data');
// console.log('🚀 Phase 2: Run migrateShoppingToMaster() to migrate shopping data');
// console.log('🚀 Phase 3: Run activateFilteredViews() to activate Single Source of Truth');