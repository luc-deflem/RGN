/**
 * REAL SHOPPING LIST MODULE - v6.0.0 UNIFIED ARCHITECTURE
 * 
 * Contains ALL shopping list functionality using FILTERED VIEWS of master products
 * Version: 6.0.0-unified-filtered-views
 * 
 * v6.0.0 BREAKING CHANGE: No more local items array!
 * All data comes from window.realProductsCategoriesManager.getAllProducts() 
 * filtered by inShopping=true flag. This ensures single source of truth.
 */

class RealShoppingListManager {
    constructor(app = null) {
        this.app = app;
        // v6.0.0 UNIFIED: No more local items array
        // All data comes from window.realProductsCategoriesManager.getAllProducts() filtered by inShopping=true
        this.skipMasterProductSync = false; // Flag to disable master product sync (may be obsolete)
        this.pendingProductCreation = null; // Track products being created to prevent double-addition
    }

    /**
     * Initialize the shopping list module
     * v6.0.0 UNIFIED: No initialization needed - uses filtered views
     */
    async initialize() {
        // v6.0.0: Check if products manager is available
        if (!window.realProductsCategoriesManager) {
            // console.warn('⚠️ Products manager not yet available - shopping list will use filtered views when ready');
        }
        
        const shoppingCount = this.getShoppingProducts().length;
        // console.log(`🛒 Shopping List initialized - ${shoppingCount} shopping items (unified v6.0.0)`);
        
        // Set up clear completed button event listener
        this.setupClearCompletedButton();
        
        // Set up autocomplete functionality
        this.setupAutocomplete();
        
        return this;
    }

    /**
     * v6.0.0 UNIFIED: Get shopping products (filtered view of master products)
     */
    getShoppingProducts() {
        if (!window.realProductsCategoriesManager) {
            // console.warn('⚠️ Products manager not available - returning empty array');
            return [];
        }
        return window.realProductsCategoriesManager.getShoppingProducts();
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
     * Set up autocomplete functionality for shopping input
     */
    setupAutocomplete() {
        const itemInput = document.getElementById('itemInput');
        if (!itemInput) {
            console.warn('⚠️ Item input not found - autocomplete not available');
            return;
        }

        // Create autocomplete dropdown
        this.createAutocompleteDropdown();
        
        // Set up input event listeners
        itemInput.addEventListener('input', (e) => this.handleAutocompleteInput(e));
        itemInput.addEventListener('keydown', (e) => this.handleAutocompleteKeydown(e));
        
        // Hide dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.autocomplete-container')) {
                this.hideAutocompleteDropdown();
            }
        });
    }

    /**
     * Create autocomplete dropdown element
     */
    createAutocompleteDropdown() {
        const itemInput = document.getElementById('itemInput');
        if (!itemInput) return;

        // Create wrapper for positioning
        const wrapper = document.createElement('div');
        wrapper.className = 'autocomplete-container';
        wrapper.style.position = 'relative';
        wrapper.style.display = 'inline-block';
        wrapper.style.width = '100%';

        // Create dropdown
        const dropdown = document.createElement('div');
        dropdown.id = 'shopping-autocomplete-dropdown';
        dropdown.className = 'autocomplete-dropdown';
        dropdown.style.cssText = `
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: white;
            border: 1px solid #ddd;
            border-top: none;
            border-radius: 0 0 6px 6px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            max-height: 200px;
            overflow-y: auto;
            z-index: 1000;
            display: none;
        `;

        // Wrap the input and add dropdown
        itemInput.parentNode.insertBefore(wrapper, itemInput);
        wrapper.appendChild(itemInput);
        wrapper.appendChild(dropdown);

        this.autocompleteDropdown = dropdown;
    }

    /**
     * Handle input events for autocomplete
     */
    handleAutocompleteInput(e) {
        const query = e.target.value.trim();
        if (query.length < 2) {
            this.hideAutocompleteDropdown();
            return;
        }

        const matches = this.searchProducts(query);
        this.showAutocompleteDropdown(matches, query);
    }

    /**
     * Handle keyboard navigation in autocomplete
     */
    handleAutocompleteKeydown(e) {
        const dropdown = this.autocompleteDropdown;
        if (!dropdown || dropdown.style.display === 'none') return;

        const items = dropdown.querySelectorAll('.autocomplete-item');
        const selectedItem = dropdown.querySelector('.autocomplete-item.selected');
        let selectedIndex = selectedItem ? Array.from(items).indexOf(selectedItem) : -1;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
                this.selectAutocompleteItem(items, selectedIndex);
                break;
            case 'ArrowUp':
                e.preventDefault();
                selectedIndex = Math.max(selectedIndex - 1, 0);
                this.selectAutocompleteItem(items, selectedIndex);
                break;
            case 'Enter':
                if (selectedItem) {
                    e.preventDefault();
                    selectedItem.click();
                }
                break;
            case 'Escape':
                this.hideAutocompleteDropdown();
                break;
        }
    }

    /**
     * Search products based on query
     */
    searchProducts(query) {
        const allProducts = this.getAllProducts();
        const lowerQuery = query.toLowerCase();
        
        return allProducts
            .filter(product => 
                product.name.toLowerCase().includes(lowerQuery)
            )
            .sort((a, b) => {
                // Prioritize exact matches at the beginning
                const aStartsWith = a.name.toLowerCase().startsWith(lowerQuery);
                const bStartsWith = b.name.toLowerCase().startsWith(lowerQuery);
                if (aStartsWith && !bStartsWith) return -1;
                if (!aStartsWith && bStartsWith) return 1;
                return a.name.localeCompare(b.name);
            })
            .slice(0, 8); // Limit to 8 results
    }

    /**
     * Show autocomplete dropdown with matches
     */
    showAutocompleteDropdown(matches, query) {
        if (!this.autocompleteDropdown) return;

        const dropdown = this.autocompleteDropdown;
        dropdown.innerHTML = '';

        if (matches.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'autocomplete-no-results';
            noResults.style.cssText = 'padding: 12px; color: #666; font-style: italic;';
            noResults.textContent = `No products found for "${query}"`;
            dropdown.appendChild(noResults);
        } else {
            matches.forEach((product, index) => {
                const item = document.createElement('div');
                item.className = 'autocomplete-item';
                item.style.cssText = `
                    padding: 12px;
                    cursor: pointer;
                    border-bottom: 1px solid #f0f0f0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                `;
                
                // Product name with highlighting
                const nameSpan = document.createElement('span');
                nameSpan.innerHTML = this.highlightMatch(product.name, query);
                
                // Category badge
                const categorySpan = document.createElement('span');
                categorySpan.style.cssText = `
                    font-size: 0.8em;
                    color: #666;
                    background: #f8f9fa;
                    padding: 2px 6px;
                    border-radius: 4px;
                `;
                
                // Get category name
                const categoryName = this.getCategoryName(product.category);
                categorySpan.textContent = categoryName;
                
                item.appendChild(nameSpan);
                item.appendChild(categorySpan);
                
                // Hover effects
                item.addEventListener('mouseenter', () => {
                    this.clearAutocompleteSelection();
                    item.classList.add('selected');
                    item.style.backgroundColor = '#f8f9fa';
                });
                
                item.addEventListener('mouseleave', () => {
                    item.classList.remove('selected');
                    item.style.backgroundColor = '';
                });
                
                // Click to select
                item.addEventListener('click', () => {
                    this.selectProduct(product);
                });
                
                dropdown.appendChild(item);
            });
        }

        dropdown.style.display = 'block';
    }

    /**
     * Hide autocomplete dropdown
     */
    hideAutocompleteDropdown() {
        if (this.autocompleteDropdown) {
            this.autocompleteDropdown.style.display = 'none';
        }
    }

    /**
     * Select autocomplete item by index
     */
    selectAutocompleteItem(items, index) {
        this.clearAutocompleteSelection();
        if (items[index]) {
            items[index].classList.add('selected');
            items[index].style.backgroundColor = '#f8f9fa';
            items[index].scrollIntoView({ block: 'nearest' });
        }
    }

    /**
     * Clear autocomplete selection
     */
    clearAutocompleteSelection() {
        const items = this.autocompleteDropdown?.querySelectorAll('.autocomplete-item');
        if (items) {
            items.forEach(item => {
                item.classList.remove('selected');
                item.style.backgroundColor = '';
            });
        }
    }

    /**
     * Highlight matching text in product name
     */
    highlightMatch(text, query) {
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<strong style="background: yellow;">$1</strong>');
    }

    /**
     * Get category name from category ID
     */
    getCategoryName(categoryId) {
        if (!window.realProductsCategoriesManager) return categoryId;
        const categories = window.realProductsCategoriesManager.getAllCategories();
        const category = categories.find(c => c.id === categoryId);
        return category ? category.name : categoryId;
    }

    /**
     * Select product from autocomplete (add to shopping list)
     */
    selectProduct(product) {
        const itemInput = document.getElementById('itemInput');
        if (itemInput) {
            itemInput.value = product.name;
        }
        
        this.hideAutocompleteDropdown();
        
        // Add to shopping list
        const success = this.addExistingProductToShopping(product);
        if (success && itemInput) {
            itemInput.value = '';
            
            // Refresh only the shopping list display (not the entire app)
            this.renderShoppingList();
        }
    }

    /**
     * Set up clear completed button event listener
     */
    setupClearCompletedButton() {
        const clearBtn = document.getElementById('clearCompleted');
        if (clearBtn) {
            // UX CLEANUP: Hide Clear Completed button on iPhone (not an iPhone function)
            const isIPhone = /iPhone|iPad|iPod/.test(navigator.userAgent);
            if (isIPhone) {
                clearBtn.style.display = 'none';
                // console.log('📱 iPhone detected: Clear Completed button hidden (Mac-only function)');
                return;
            }
            
            // MAC: Remove any existing listeners and set up the button
            const newClearBtn = clearBtn.cloneNode(true);
            clearBtn.parentNode.replaceChild(newClearBtn, clearBtn);
            
            // Add our module's event listener
            newClearBtn.addEventListener('click', () => {
                // console.log('🧹 Clear completed clicked - handled by shopping module');
                const clearedCount = this.clearCompleted();
                console.log(`✅ Cleared ${clearedCount} completed items`);
                
                // Show user-friendly message with count
                if (clearedCount > 0) {
                    alert(`✅ COMPLETED ITEMS CLEARED!\n\n🧹 Cleaned: ${clearedCount} product${clearedCount === 1 ? '' : 's'}\n\n💡 Items moved back to pantry inventory`);
                } else {
                    alert('ℹ️ No completed items to clear.\n\nTip: Check items off your shopping list first!');
                }
            });
            
            // console.log('✅ Mac: Shopping module took control of clear completed button');
        } else {
            // console.warn('⚠️ Clear completed button not found');
        }
    }

    /**
     * Get all shopping items
     * v6.0.0 UNIFIED: Returns filtered view of master products
     */
    getAllItems() {
        return this.getShoppingProducts();
    }

    /**
     * Get shopping items (alias for getAllItems for compatibility)
     * v6.0.0 UNIFIED: Returns filtered view of master products
     */
    getShoppingItems() {
        return this.getShoppingProducts();
    }

    /**
     * Get shopping items count
     * v6.0.0 UNIFIED: Count from filtered view
     */
    getItemsCount() {
        return this.getShoppingProducts().length;
    }

    /**
     * Get completed items count
     * v6.0.0 UNIFIED: Filter from unified data
     */
    getCompletedCount() {
        return this.getShoppingProducts().filter(item => item.completed).length;
    }

    /**
     * Update the item count display in the UI
     */
    updateItemCount() {
        const itemCountElement = document.getElementById('itemCount');
        if (!itemCountElement) {
            // console.warn('⚠️ itemCount element not found in DOM');
            return;
        }

        const total = this.getShoppingProducts().length;
        const completed = this.getCompletedCount();
        const remaining = total - completed;
        
        if (total === 0) {
            itemCountElement.textContent = '0 items';
        } else {
            itemCountElement.textContent = `${remaining} of ${total} items remaining`;
        }
    }

    /**
     * Render the shopping list in the DOM
     */
    /**
     * Render shopping list
     * v6.0.0 UNIFIED: Render from filtered shopping products
     */
    renderShoppingList() {
        const groceryListElement = document.getElementById('groceryList');
        if (!groceryListElement) {
            console.error('❌ groceryList element not found in DOM');
            return;
        }

        // v6.0.0 UNIFIED: Safety check - don't render if Products Manager not ready
        if (!window.realProductsCategoriesManager) {
            // console.warn('⚠️ Shopping list render skipped - Products Manager not ready yet');
            groceryListElement.innerHTML = `
                <div class="empty-state">
                    <span class="emoji">⏳</span>
                    <p>Loading shopping list...</p>
                    <p>Products Manager initializing...</p>
                </div>
            `;
            return;
        }

        // Update item count first
        this.updateItemCount();

        const shoppingProducts = this.getShoppingProducts();
        
        // Deduplicate shopping products by ID to prevent display issues
        const uniqueProducts = [];
        const seenIds = new Set();
        
        for (const product of shoppingProducts) {
            if (!seenIds.has(product.id)) {
                seenIds.add(product.id);
                uniqueProducts.push(product);
            }
        }
        
        // Log if we found duplicates
        if (uniqueProducts.length !== shoppingProducts.length) {
            console.warn(`⚠️ Found ${shoppingProducts.length - uniqueProducts.length} duplicate products in shopping list. Deduplicating.`);
        }
        
        if (uniqueProducts.length === 0) {
            groceryListElement.innerHTML = `
                <div class="empty-state">
                    <span class="emoji">🛒</span>
                    <p>Your shopping list is empty</p>
                    <p>Add items above or check your pantry stock!</p>
                </div>
            `;
            return;
        }

        const activeItems = uniqueProducts.filter(item => !item.completed);
        const completedItems = uniqueProducts.filter(item => item.completed);
        
        let html = '';
        
        // Group active items by category (delegating to app for category logic for now)
        if (activeItems.length > 0) {
            html += this.renderActiveItems(activeItems);
        }
        
        // Add bought section if there are completed items
        if (completedItems.length > 0) {
            html += this.renderCompletedItems(completedItems);
        }
        
        groceryListElement.innerHTML = html;
        // console.log('✅ Shopping list rendered by module with', uniqueProducts.length, 'items (unified v6.0.0)');
    }

    /**
     * Render active (not bought) items grouped by category
     */
    renderActiveItems(activeItems) {
        // Group items by category
        const groupedItems = this.groupItemsByCategory(activeItems);
        const categoryOrder = this.getCategoryOrder();
        
        let html = '';
        
        categoryOrder.forEach(categoryKey => {
            if (groupedItems[categoryKey] && groupedItems[categoryKey].length > 0) {
                html += this.renderCategorySection(categoryKey, groupedItems[categoryKey]);
            }
        });
        
        return html;
    }

    /**
     * Group items by category
     */
    groupItemsByCategory(items) {
        const grouped = {};
        items.forEach(item => {
            if (!grouped[item.category]) {
                grouped[item.category] = [];
            }
            grouped[item.category].push(item);
        });
        return grouped;
    }

    /**
     * Get category order for display
     */
    getCategoryOrder() {
        // Get categories from Products Manager in their proper order
        if (window.realProductsCategoriesManager) {
            const categories = window.realProductsCategoriesManager.getAllCategories();
            // Sort by order field, then return IDs
            return categories.sort((a, b) => (a.order || 0) - (b.order || 0)).map(cat => cat.id);
        }
        
        // Fallback to app categories if available
        if (window.app && window.app.categories) {
            return window.app.categories.sort((a, b) => (a.order || 0) - (b.order || 0)).map(cat => cat.id);
        }
        
        // Last resort fallback
        return [
            'cat_001', 'cat_002', 'cat_003', 'cat_004', 'cat_005', 
            'cat_006', 'cat_007', 'cat_008', 'cat_009', 'cat_010', 
            'cat_011', 'cat_012'
        ];
    }

    /**
     * Render a category section with header
     */
    renderCategorySection(category, items) {
        const categoryData = this.getCategoryData(category);
        const categoryName = categoryData ? categoryData.name.charAt(0).toUpperCase() + categoryData.name.slice(1) : category;
        const categoryEmoji = categoryData ? categoryData.emoji : '📦';
        
        return `
            <div class="category-section">
                <div class="category-header">
                    <span class="category-title">${categoryEmoji} ${categoryName}</span>
                    <span class="category-count">${items.length}</span>
                </div>
                <div class="category-items">
                    ${items.sort((a, b) => a.name.localeCompare(b.name)).map(item => this.renderShoppingItem(item, false)).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Render completed (bought) items
     */
    renderCompletedItems(completedItems) {
        // Sort completed items by category like original
        const sortedItems = this.sortItemsByCategory(completedItems);
        
        return `
            <div class="bought-section">
                <div class="bought-header">
                    <span class="bought-title">✅ Bought</span>
                    <span class="bought-count">${completedItems.length}</span>
                </div>
                <div class="bought-items">
                    ${sortedItems.map(item => this.renderShoppingItem(item, true)).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Sort items by category for display
     */
    sortItemsByCategory(items) {
        const categoryOrder = this.getCategoryOrder();
        return items.sort((a, b) => {
            const aIndex = categoryOrder.indexOf(a.category);
            const bIndex = categoryOrder.indexOf(b.category);
            return aIndex - bIndex;
        });
    }

    /**
     * Refresh the shopping list display (alias for renderShoppingList)
     */
    refreshDisplay() {
        this.renderShoppingList();
    }

    /**
     * Render a single shopping item
     */
    renderShoppingItem(item, showCategory = false) {
        const categoryData = this.getCategoryData(item.category);
        const categoryEmoji = categoryData ? categoryData.emoji : '📦';
        
        // Get stock status from app's master products list
        let stockIndicator = '';
        if (window.app && window.app.allProducts) {
            const product = window.app.allProducts.find(p => p.id === item.id);
            if (product) {
                const stockStatus = product.inStock ? 'InStock' : 'OutStock';
                // Mobile-optimized: just emoji, no text
                const isMobile = window.innerWidth <= 768;
                stockIndicator = `<span class="stock-indicator stock-${stockStatus.toLowerCase()}">${stockStatus === 'InStock' ? '✅' : '❌'}</span>`;
            }
        }
        
        return `
            <div class="grocery-item category-${item.category} ${item.completed ? 'completed' : ''}" data-id="${item.id}">
                <input 
                    type="checkbox" 
                    class="item-checkbox" 
                    ${item.completed ? 'checked' : ''}
                    onchange="window.realShoppingListManager.toggleItemComplete(${item.id});"
                >
                <div class="item-content" onclick="window.realShoppingListManager.toggleItemComplete(${item.id});" style="cursor: pointer;" title="📱 Tap to mark as bought">
                    <div class="item-name">${this.escapeHtml(item.name)}</div>
                    <div class="item-meta">
                        ${showCategory ? `<span class="item-category-small">${categoryEmoji} ${item.category}</span>` : ''}
                        ${stockIndicator}
                    </div>
                </div>
                <div class="item-actions">
                    <button class="menu-usage-btn" onclick="window.realShoppingListManager.showProductUsage(${item.id}, '${this.escapeHtml(item.name).replace(/'/g, '\\\'')}')" title="Show planned meals or recipes using this ingredient">🍽️</button>
                    <button class="product-portal-btn" onclick="window.realShoppingListManager.openProductModal('${this.escapeHtml(item.name).replace(/'/g, '\\\'').toLowerCase()}', '${item.category}')" title="Open product portal to edit details">📋</button>
                    <button class="delete-btn" onclick="window.realShoppingListManager.deleteItem(${item.id});" title="Delete item">×</button>
                </div>
            </div>
        `;
    }

    /**
     * Get category data from products-categories module
     */
    getCategoryData(categoryId) {
        // Use central products-categories manager when available
        if (window.realProductsCategoriesManager && window.realProductsCategoriesManager.getCategoryById) {
            const category = window.realProductsCategoriesManager.getCategoryById(categoryId);
            if (category) {
                return {
                    id: category.id,
                    name: category.displayName || category.name,
                    emoji: category.emoji || '📦'
                };
            }
        }

        // Fallback to app categories
        if (window.app && window.app.categories) {
            const found = window.app.categories.find(cat => cat.id === categoryId);
            if (found) {
                return {
                    id: found.id,
                    name: found.displayName || found.name,
                    emoji: found.emoji || '📦'
                };
            }
        }

        // Last resort: hardcoded fallback (should rarely be used)
        const categoryNames = {
            'cat_001': 'Vegetables',
            'cat_002': 'Meat',
            'cat_003': 'Fish',
            'cat_004': 'Dairy',
            'cat_005': 'Bakery',
            'cat_006': 'Fruits',
            'cat_007': 'Spices',
            'cat_008': 'Frozen',
            'cat_009': 'Cleaning',
            'cat_010': 'Health',
            'cat_011': 'Household',
            'cat_012': 'Car'
        };

        const categoryEmojiMap = {
            'cat_001': '🥬', 'cat_002': '🥩', 'cat_003': '🐟', 'cat_004': '🥛',
            'cat_005': '🍞', 'cat_006': '🍎', 'cat_007': '🧂', 'cat_008': '🧊',
            'cat_009': '🧴', 'cat_010': '🏥', 'cat_011': '🏠', 'cat_012': '🚗'
        };

        return {
            id: categoryId,
            name: categoryNames[categoryId] || categoryId,
            emoji: categoryEmojiMap[categoryId] || '📦'
        };
    }

    /**
     * Get category emoji using central manager when possible
     */
    getCategoryEmoji(categoryId) {
        if (window.realProductsCategoriesManager && window.realProductsCategoriesManager.getCategoryEmoji) {
            return window.realProductsCategoriesManager.getCategoryEmoji(categoryId);
        }
        const categoryData = this.getCategoryData(categoryId);
        return categoryData ? categoryData.emoji : '📦';
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Toggle item completion status
     */
    /**
     * Toggle item completion status
     * v6.0.0 UNIFIED: Delegates to products manager
     */
    toggleItemComplete(itemId) {
        if (!window.realProductsCategoriesManager) {
            console.error('❌ Products manager not available');
            return;
        }

        const result = window.realProductsCategoriesManager.toggleProductCompleted(itemId);
        if (result) {
            // console.log(`📝 Toggled item ${itemId} completion (unified v6.0.0): ${result.completed}`);
            this.renderShoppingList(); // Re-render after change
        }
    }

    // v6.0.0 UNIFIED: Duplicate deleteItem method removed - see main deleteItem method above

    /**
     * Open product modal for shopping item
     */
    openProductModal(itemName, itemCategory) {
        if (window.realProductsCategoriesManager && window.realProductsCategoriesManager.openProductEditModal) {
            // Get product directly from products manager module (not from app)
            if (window.realProductsCategoriesManager.getAllProducts) {
                const allProducts = window.realProductsCategoriesManager.getAllProducts();
                const product = allProducts.find(p => 
                    p.name.toLowerCase() === itemName.toLowerCase() && 
                    p.category === itemCategory
                );
                
                if (product) {
                    // console.log('📋 Opening product modal for:', product.name);
                    window.realProductsCategoriesManager.openProductEditModal(product);
                } else {
                    // console.warn('⚠️ Product not found for modal:', itemName, itemCategory);
                    // console.log('🔍 Available products:', allProducts.length);
                }
            } else {
                console.error('❌ Products manager getAllProducts method not available');
            }
        } else {
            console.error('❌ Products categories manager not available for modal');
        }
    }

    /**
     * Add new shopping item
     */
    /**
     * Smart add item with product search and creation flow
     * This is the main entry point for adding items from the shopping input
     */
    smartAddItem(itemName) {
        if (!itemName || typeof itemName !== 'string' || !itemName.trim()) {
            console.error('❌ Invalid item name provided');
            return false;
        }

        const searchName = itemName.trim();
        
        // First, search for existing product (case-insensitive)
        const existingProduct = this.findExistingProduct(searchName);
        
        if (existingProduct) {
            // Product exists - add to shopping list
            console.log(`✅ Found existing product: ${existingProduct.name}`);
            return this.addExistingProductToShopping(existingProduct);
        } else {
            // Product doesn't exist - open create product modal
            console.log(`🔍 Product "${searchName}" not found - opening creation modal`);
            this.openCreateProductModal(searchName);
            return true; // Return true because we're handling the request (via modal)
        }
    }

    /**
     * Find existing product by name (case-insensitive search)
     */
    findExistingProduct(searchName) {
        const allProducts = this.getAllProducts();
        return allProducts.find(product => 
            product.name.toLowerCase().trim() === searchName.toLowerCase().trim()
        );
    }

    /**
     * Add existing product to shopping list
     */
    addExistingProductToShopping(product) {
        return this.addItem(product.name, product.category, product.inPantry || false, product.inStock || false);
    }

    /**
     * Open product creation modal with pre-filled name
     */
    openCreateProductModal(productName) {
        // Check if products manager modal functions are available
        if (!window.realProductsCategoriesManager || !window.realProductsCategoriesManager.openProductEditModal) {
            console.error('❌ Products manager modal not available');
            alert('⚠️ Product creation not available. Please try again later.');
            return;
        }

        // Mark this product as pending creation to prevent double-addition
        this.pendingProductCreation = productName.toLowerCase().trim();
        console.log(`🔄 Marking "${productName}" as pending creation`);

        // Create a new product structure with pre-filled name
        const newProduct = {
            id: null, // Will be generated when saved
            name: productName,
            category: 'cat_001', // Default category - user can change in modal
            inShopping: true, // Since they're adding it to shopping - let modal handle it
            inStock: false, // Default - user will set in modal
            inPantry: false, // Default - user will set in modal
            season: 'all-year', // Default - user will set in modal
            recipeCount: 0
        };

        // Open the modal in "new product" mode
        // The modal will handle Season, Pantry, and Stock questions
        window.realProductsCategoriesManager.openProductEditModal(newProduct, true);

        // Set up a listener to clear the pending flag when modal closes
        this.setupProductCreationListener();
    }

    /**
     * Set up listener for product creation completion
     */
    setupProductCreationListener() {
        // Clear the flag when modal closes (regardless of save/cancel)
        // Check periodically if the modal is still open
        const checkModalStatus = () => {
            const modal = document.getElementById('productEditModal');
            if (!modal || modal.style.display === 'none') {
                if (this.pendingProductCreation) {
                    console.log(`🚪 Modal closed, clearing pending creation flag for "${this.pendingProductCreation}"`);
                    this.pendingProductCreation = null;
                }
                return; // Stop checking
            }
            
            // Continue checking every 500ms while modal is open
            setTimeout(checkModalStatus, 500);
        };

        // Start checking after a short delay
        setTimeout(checkModalStatus, 1000);

        // Also clear the flag after 30 seconds as a fallback
        setTimeout(() => {
            if (this.pendingProductCreation) {
                console.log(`⏰ Clearing stale pending creation flag for "${this.pendingProductCreation}"`);
                this.pendingProductCreation = null;
            }
        }, 30000);
    }

    /**
     * Add item to shopping list (internal method)
     * v6.0.0 UNIFIED: Delegates to products manager
     */
    addItem(name, category = 'cat_001', fromStandard = false, originalStockStatus = false) {
        if (!window.realProductsCategoriesManager) {
            console.error('❌ Products manager not available');
            return null;
        }

        if (!name || typeof name !== 'string') {
            console.error('❌ Invalid item name provided');
            return null;
        }

        const trimmedName = name.trim();
        if (trimmedName === '') {
            console.error('❌ Empty item name provided');
            return null;
        }

        // Check if this product is currently being created via modal
        if (this.pendingProductCreation && trimmedName.toLowerCase() === this.pendingProductCreation) {
            console.log(`⏸️ Skipping addition of "${trimmedName}" - currently being created via modal`);
            return null;
        }

        // Check if product already exists in shopping list
        const currentShoppingItems = this.getShoppingProducts();
        const alreadyInShopping = currentShoppingItems.find(item => 
            item.name.toLowerCase().trim() === trimmedName.toLowerCase()
        );
        
        if (alreadyInShopping) {
            console.log(`📋 Product "${trimmedName}" already in shopping list - skipping duplicate addition`);
            return alreadyInShopping; // Return existing item instead of null
        }

        // Check if product already exists
        const allProducts = window.realProductsCategoriesManager.getAllProducts();
        const existingProduct = allProducts.find(product => 
            product.name.toLowerCase() === trimmedName.toLowerCase()
        );

        if (existingProduct) {
            // Product exists - just toggle shopping flag
            if (existingProduct.inShopping) {
                // console.log(`⚠️ Item "${trimmedName}" already in shopping list`);
                return null;
            } else {
                // Add to shopping list by toggling flag
                existingProduct.completed = false; // Reset completed status
                existingProduct.bought = false; // Reset bought status for shopping journey
                return window.realProductsCategoriesManager.toggleProductShopping(existingProduct.id);
            }
        } else {
            // Create new product with inShopping=true
            const newProduct = window.realProductsCategoriesManager.addProduct(trimmedName, category);
            if (newProduct) {
                // Set shopping flags
                newProduct.inShopping = true;
                newProduct.completed = false;
                newProduct.bought = false;
                newProduct.inStock = originalStockStatus; // Use provided stock status
                window.realProductsCategoriesManager.saveProducts();
                console.log(`✅ Added "${trimmedName}" to shopping list`);
                return newProduct;
            }
            return null;
        }
    }

    /**
     * Toggle item completion status
     */
    toggleItem(itemId) {
        // console.log(`🔄 === TOGGLE ITEM CALLED === ID: ${itemId}`);
        // console.log('📋 All shopping items before toggle:', this.items.map(item => ({
        //     id: item.id,
        //     name: item.name, 
        //     completed: item.completed
        // })));
        
        const item = this.items.find(item => item.id === itemId);
        if (!item) {
            console.error(`❌ Shopping item with id ${itemId} not found`);
            console.error('Available IDs:', this.items.map(i => i.id));
            return false;
        }

        const oldCompleted = item.completed;
        item.completed = !item.completed;
        this.saveToStorage();
        
        // console.log(`${item.completed ? '✅' : '📝'} Toggled "${item.name}": ${oldCompleted} → ${item.completed}`);
        // console.log('📋 All shopping items after toggle:', this.items.map(item => ({
        //     id: item.id,
        //     name: item.name, 
        //     completed: item.completed
        // })));
        return item;
    }

    /**
     * Delete shopping item
     */
    /**
     * Delete item from shopping list
     * v6.0.0 UNIFIED: Toggles inShopping flag to false
     */
    deleteItem(itemId) {
        if (!window.realProductsCategoriesManager) {
            console.error('❌ Products manager not available');
            return false;
        }

        const allProducts = window.realProductsCategoriesManager.getAllProducts();
        const product = allProducts.find(product => product.id === itemId);
        
        if (!product) {
            console.error(`❌ Product with id ${itemId} not found`);
            return false;
        }

        if (!product.inShopping) {
            // console.warn(`⚠️ Product "${product.name}" is not in shopping list`);
            return false;
        }

        // Remove from shopping list by toggling flag to false
        const result = window.realProductsCategoriesManager.toggleProductShopping(itemId);
        if (result) {
            console.log(`🗑️ Removed "${product.name}" from shopping list`);
            
            // IMPORTANT: Refresh the shopping list display immediately
            this.renderShoppingList();
            
            // Also refresh pantry display to update cart icons
            if (window.realPantryManager) {
                // console.log('🔄 Refreshing pantry display after shopping item deletion');
                window.realPantryManager.refreshDisplay();
            }
        }
        return result;
    }

    /**
     * Update item name
     */
    updateItemName(itemId, newName) {
        const item = this.items.find(item => item.id === itemId);
        if (!item) {
            console.error(`❌ Shopping item with id ${itemId} not found`);
            return false;
        }

        const trimmedName = newName.trim();
        if (trimmedName === '') {
            console.error('❌ Empty item name provided');
            return false;
        }

        const oldName = item.name;
        item.name = trimmedName;
        this.saveToStorage();
        // console.log(`✏️ Updated item: "${oldName}" → "${trimmedName}"`);
        return item;
    }

    /**
     * Update item category
     */
    updateItemCategory(itemId, newCategory) {
        const item = this.items.find(item => item.id === itemId);
        if (!item) {
            console.error(`❌ Shopping item with id ${itemId} not found`);
            return false;
        }

        item.category = newCategory;
        this.saveToStorage();
        // console.log(`📂 Updated category for "${item.name}"`);
        return item;
    }

    /**
     * Clear all completed items
     */
    clearCompleted() {
        // v6.0.4 UNIFIED BUG FIX: Use unified data instead of this.items
        const shoppingItems = this.getShoppingItems();
        const completedItems = shoppingItems.filter(item => item.completed);
        const completedCount = completedItems.length;
        
        // NEW SYNC LOGIC: Update pantry stock status for items from pantry
        let syncedToPantryCount = 0;
        if (window.realPantryManager) {
            completedItems.forEach(item => {
                if (item.fromStandard) {
                    // Find matching pantry item by name and category
                    const pantryItems = window.realPantryManager.getAllItems();
                    const pantryItem = pantryItems.find(pantryItem => 
                        pantryItem.name.toLowerCase() === item.name.toLowerCase() && 
                        pantryItem.category === item.category
                    );
                    
                    if (pantryItem && !pantryItem.inStock) {
                        // Mark pantry item as in stock
                        window.realPantryManager.toggleStockStatus(pantryItem.id);
                        syncedToPantryCount++;
                        // console.log(`📦 Synced "${item.name}" to pantry as in stock`);
                    }
                }
            });
            
            // Refresh pantry display if any items were synced
            if (syncedToPantryCount > 0) {
                window.realPantryManager.refreshDisplay();
            }
        }
        
        // v6.0.4 UNIFIED BUG FIX: Remove completed items using Products Manager
        completedItems.forEach(item => {
            if (window.realProductsCategoriesManager) {
                // Set completed=false, inShopping=false, and inStock=true (since we bought it!)
                const product = window.realProductsCategoriesManager.getProductById(item.id);
                if (product) {
                    product.completed = false;
                    product.inShopping = false;
                    product.inStock = true; // 🔧 FIX: If we bought it, it's now in stock!
                    window.realProductsCategoriesManager.saveProducts();
                    // console.log(`✅ Cleared completed item "${product.name}" - now in stock`);
                }
            }
        });
        
        // Re-render the shopping list to update UI
        this.renderShoppingList();
        
        console.log(`✅ Cleared ${completedCount} completed items`);
        return completedCount;
    }

    /**
     * Mark item as in stock (for items from pantry)
     */
    markAsInStock(itemId) {
        // v6.0.4 UNIFIED BUG FIX: Use unified data instead of this.items
        const shoppingItems = this.getShoppingItems();
        const item = shoppingItems.find(item => item.id === itemId);
        if (!item) {
            console.error(`❌ Shopping item with id ${itemId} not found`);
            return false;
        }

        if (!item.fromStandard) {
            // console.log(`⚠️ Item "${item.name}" is not from pantry, cannot mark as in stock`);
            return false;
        }

        // Remove from shopping list and restore original stock status
        this.deleteItem(itemId);
        // console.log(`📦 Marked "${item.name}" as in stock`);
        
        return {
            item: item,
            originalStockStatus: item.originalStockStatus
        };
    }

    /**
     * Get items by category
     */
    getItemsByCategory(categoryId) {
        return this.items.filter(item => item.category === categoryId);
    }

    /**
     * Get items by completion status
     */
    getItemsByStatus(completed = false) {
        return this.items.filter(item => item.completed === completed);
    }

    /**
     * Search items by name
     */
    searchItems(query) {
        const searchTerm = query.toLowerCase();
        return this.items.filter(item => 
            item.name.toLowerCase().includes(searchTerm)
        );
    }

    /**
     * Load shopping items from localStorage
     */
    loadFromStorage() {
        try {
            let saved = localStorage.getItem('shoppingItems');
            
            // Try backup if main data is corrupted
            if (!saved || saved === 'null') {
                saved = localStorage.getItem('shoppingItems_backup');
                // console.log('📁 Loaded shopping items from backup');
            }
            
            let items = saved ? JSON.parse(saved) : [];
            
            // Provide sample data for new users
            if (items.length === 0 && !localStorage.getItem('shoppingItems_initialized')) {
                items = this.getSampleItems();
                localStorage.setItem('shoppingItems_initialized', 'true');
                // console.log('📱 New user - loaded sample shopping items');
            }
            
            // console.log(`💾 Loaded ${items.length} shopping items from localStorage`);
            return items;
        } catch (e) {
            console.error('❌ Could not load shopping items:', e);
            return this.getSampleItems();
        }
    }

    /**
     * Save shopping items to localStorage
     */
    saveToStorage() {
        try {
            // Save main data
            localStorage.setItem('shoppingItems', JSON.stringify(this.items));
            
            // Save backup
            localStorage.setItem('shoppingItems_backup', JSON.stringify(this.items));
            
            // console.log(`💾 Saved ${this.items.length} shopping items to localStorage`);
        } catch (e) {
            console.error('❌ Could not save shopping items:', e);
        }
    }

    /**
     * Get sample shopping items for new users
     */
    getSampleItems() {
        return [
            {id: 1, name: 'bananas', category: 'cat_001', completed: false, originalStockStatus: false, addedDate: new Date().toISOString()},
            {id: 2, name: 'milk', category: 'cat_002', completed: false, originalStockStatus: false, addedDate: new Date().toISOString()},
            {id: 3, name: 'bread', category: 'cat_006', completed: true, originalStockStatus: false, addedDate: new Date().toISOString()}
        ];
    }

    /**
     * Export shopping list data
     */
    exportData() {
        return {
            items: this.items,
            exportDate: new Date().toISOString(),
            itemsCount: this.items.length,
            completedCount: this.getCompletedCount()
        };
    }

    /**
     * Import shopping list data
     */
    importData(data) {
        // Handle both formats: data.items (old) and data.shoppingItems (new)
        const itemsArray = data.items || data.shoppingItems;
        
        if (!data || !Array.isArray(itemsArray)) {
            console.error('❌ Invalid import data - expected items or shoppingItems array');
            return false;
        }

        this.items = itemsArray;
        this.nextId = this.items.length > 0 ? Math.max(...this.items.map(item => item.id)) + 1 : 1;
        this.saveToStorage();
        // console.log(`📥 Imported ${this.items.length} shopping items`);
        return true;
    }

    /**
     * Get statistics
     */
    getStats() {
        const total = this.items.length;
        const completed = this.getCompletedCount();
        const pending = total - completed;
        
        const byCategory = {};
        this.items.forEach(item => {
            byCategory[item.category] = (byCategory[item.category] || 0) + 1;
        });

        return {
            total,
            completed,
            pending,
            completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
            byCategory
        };
    }

    // ========== MOBILE SHOPPING UX METHODS ==========

    /**
     * Show product usage - mobile-friendly UX for shopping
     * Find menu items that use this product, or recipes if no menu items found
     */
    showProductUsage(productId, productName) {
        // console.log(`🔍 SHOPPING DEBUG: showProductUsage called with productId: ${productId}, productName: "${productName}"`);
        // console.log(`🔍 Module shopping items (${this.items.length}):`, this.items.map(item => ({id: item.id, name: item.name, category: item.category})));
        // if (window.app && window.app.shoppingItems) {
        //     console.log(`🔍 Main app shopping items (${window.app.shoppingItems.length}):`, window.app.shoppingItems.map(item => ({id: item.id, name: item.name, category: item.category})));
        // }
        
        // First, look for planned menu items that use this product
        const menuItems = this.findMenuItemsUsingProduct(productId, productName);
        
        if (menuItems.length > 0) {
            this.showMenuItemsModal(productName, menuItems);
        } else {
            // No menu items found, show recipes instead
            // Find the actual product by name and category to get the correct product ID
            if (window.app && window.app.findProductByNameAndCategory && window.app.showProductRecipes) {
                // Get the shopping item to find name and category
                // Try our own items first, then fall back to main app's shopping items
                let shoppingItem = this.items.find(item => item.id === productId);
                if (!shoppingItem && window.app && window.app.shoppingItems) {
                    // console.log(`🔍 Not found in module items, checking main app's ${window.app.shoppingItems.length} shopping items...`);
                    shoppingItem = window.app.shoppingItems.find(item => item.id === productId);
                }
                // console.log(`🔍 Looking for shopping item with ID ${productId}:`, shoppingItem);
                if (shoppingItem) {
                    const actualProduct = window.app.findProductByNameAndCategory(shoppingItem.name, shoppingItem.category);
                    if (actualProduct) {
                        // console.log(`🔍 Found actual product ID ${actualProduct.id} for shopping item "${shoppingItem.name}" in category "${shoppingItem.category}"`);
                        // console.log(`📋 Product details:`, actualProduct);
                        window.app.showProductRecipes(actualProduct.id);
                    } else {
                        // console.warn(`⚠️ No product found for "${shoppingItem.name}" in category "${shoppingItem.category}"`);
                        // Show available products for debugging
                        // const allProducts = window.app.allProducts || [];
                        // const similarProducts = allProducts.filter(p => p.name.toLowerCase().includes(shoppingItem.name.toLowerCase()));
                        // console.log(`🔍 Similar products found:`, similarProducts);
                        alert(`No recipes found for "${shoppingItem.name}"`);
                    }
                } else {
                    // console.warn(`⚠️ Shopping item with ID ${productId} not found`);
                }
            } else {
                // console.warn('⚠️ Recipe functionality not available');
            }
        }
    }

    /**
     * Find menu items (meal plans) that use a specific product
     */
    findMenuItemsUsingProduct(productId, productName) {
        const menuItems = [];
        
        // Access meal plan from main app
        const mealPlan = window.app ? window.app.mealPlan : null;
        const recipes = window.app ? window.app.recipes : [];
        
        if (!mealPlan || typeof mealPlan !== 'object') {
            return menuItems;
        }
        
        // Check all meal plans
        Object.entries(mealPlan).forEach(([date, meals]) => {
            Object.entries(meals).forEach(([mealType, meal]) => {
                if (meal && meal.type === 'recipe' && meal.recipeId) {
                    // Find the recipe
                    const recipe = recipes.find(r => r.id === meal.recipeId);
                    if (recipe && recipe.ingredients) {
                        // Check if this recipe uses the product
                        const usesProduct = recipe.ingredients.some(ingredient => 
                            ingredient.productId === productId || 
                            ingredient.productName?.toLowerCase() === productName.toLowerCase()
                        );
                        
                        if (usesProduct) {
                            menuItems.push({
                                date,
                                mealType,
                                recipeName: recipe.name,
                                recipeId: recipe.id
                            });
                        }
                    }
                } else if (meal && meal.type === 'simple' && meal.products) {
                    // Check simple meals
                    const usesProduct = meal.products.some(product => 
                        product.id === productId || 
                        product.name?.toLowerCase() === productName.toLowerCase()
                    );
                    
                    if (usesProduct) {
                        menuItems.push({
                            date,
                            mealType,
                            recipeName: meal.name || 'Simple Meal',
                            isSimple: true
                        });
                    }
                }
            });
        });
        
        return menuItems;
    }

    /**
     * Show modal with menu items using this product
     */
    showMenuItemsModal(productName, menuItems) {
        // Create modal content
        const modalContent = `
            <div class="modal active" id="productMenuItemsModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <span class="modal-title">📅 Planned Meals using ${productName}</span>
                        <button class="close-modal" onclick="this.closest('.modal').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="menu-items-list">
                            ${menuItems.map(item => `
                                <div class="menu-item-card">
                                    <div class="menu-date">${new Date(item.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</div>
                                    <div class="menu-meal-type">${this.formatMealType(item.mealType)}</div>
                                    <div class="menu-recipe-name">${item.recipeName}</div>
                                    ${!item.isSimple ? `<button class="view-recipe-btn" onclick="window.realRecipesManager.openRecipeEditModal(${item.recipeId}); document.getElementById('productMenuItemsModal').remove();">View Recipe</button>` : ''}
                                </div>
                            `).join('')}
                        </div>
                        <div class="modal-info">
                            <p>💡 This product is needed for ${menuItems.length} planned meal${menuItems.length !== 1 ? 's' : ''}</p>
                        </div>
                    </div>
                    <div class="modal-actions">
                        <button class="modal-btn secondary" onclick="this.closest('.modal').remove()">Close</button>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalContent);
    }

    /**
     * Format meal type for display
     */
    formatMealType(mealType) {
        const mealEmojis = {
            breakfast: '🌅 Breakfast',
            lunch: '☀️ Lunch', 
            dinner: '🌙 Dinner'
        };
        return mealEmojis[mealType] || mealType;
    }

    /**
     * Sync all master products with current shopping list status
     */
    syncAllMasterProductsWithShoppingList() {
        // Try multiple ways to access the master products list
        let allProducts = null;
        let productsManager = null;
        
        if (this.app?.allProducts) {
            allProducts = this.app.allProducts;
            productsManager = this.app.productsManager;
        } else if (window.app?.allProducts) {
            allProducts = window.app.allProducts;
            productsManager = window.app.productsManager;
        } else if (window.realProductsCategoriesManager?.getAllProducts) {
            allProducts = window.realProductsCategoriesManager.getAllProducts();
            productsManager = window.realProductsCategoriesManager;
        }
        
        if (!allProducts) {
            // console.warn('⚠️ Master products list not available for sync through any source');
            return 0;
        }

        // console.log('🔄 Syncing all master products with shopping list...');
        let syncCount = 0;

        // Get all current shopping item names (lowercase for comparison)
        const shoppingItemNames = this.items.map(item => item.name.toLowerCase());
        // console.log('🛒 Current shopping items:', shoppingItemNames);

        // Update each product's inShopping status
        allProducts.forEach(product => {
            const shouldBeInShopping = shoppingItemNames.includes(product.name.toLowerCase());
            if (product.inShopping !== shouldBeInShopping) {
                // console.log(`🔄 Correcting "${product.name}": ${product.inShopping} → ${shouldBeInShopping}`);
                product.inShopping = shouldBeInShopping;
                syncCount++;
            }
        });

        if (syncCount > 0) {
            // Save the updated products list using any available method
            if (productsManager?.saveAllProducts) {
                productsManager.saveAllProducts();
            } else if (productsManager?.saveProducts) {
                productsManager.saveProducts();
            }
            
            // Refresh displays
            if (window.realPantryManager?.refreshDisplay) {
                window.realPantryManager.refreshDisplay();
            }
            
            // console.log(`✅ Synced ${syncCount} products with shopping list status`);
        } else {
            // console.log('✅ All products already in sync with shopping list');
        }
        
        return syncCount;
    }

    /**
     * Update master product's inShopping status
     */
    updateMasterProductShopping(itemName, inShopping) {
        // Skip if master product sync is disabled (e.g., during bulk operations)
        if (this.skipMasterProductSync) {
            return;
        }
        
        // Try multiple ways to access the master products list
        let allProducts = null;
        let productsManager = null;
        
        if (this.app?.allProducts) {
            allProducts = this.app.allProducts;
            productsManager = this.app.productsManager;
        } else if (window.app?.allProducts) {
            allProducts = window.app.allProducts;
            productsManager = window.app.productsManager;
        } else if (window.realProductsCategoriesManager?.getAllProducts) {
            allProducts = window.realProductsCategoriesManager.getAllProducts();
            productsManager = window.realProductsCategoriesManager;
        }
        
        if (!allProducts) {
            // console.warn('⚠️ Master products list not available through any source');
            return;
        }

        // Find the product by name (case insensitive)
        const product = allProducts.find(p => 
            p.name.toLowerCase() === itemName.toLowerCase()
        );

        if (product) {
            const oldStatus = product.inShopping;
            product.inShopping = inShopping;
            
            // Save the updated products list using any available method
            if (productsManager?.saveAllProducts) {
                productsManager.saveAllProducts();
            } else if (productsManager?.saveProducts) {
                productsManager.saveProducts();
            }
            
            // console.log(`🔄 Updated "${itemName}" inShopping: ${oldStatus} → ${inShopping}`);
            
            // Refresh pantry display if available to update cart buttons
            if (window.realPantryManager?.refreshDisplay) {
                window.realPantryManager.refreshDisplay();
            }
        } else {
            // console.warn(`⚠️ Product "${itemName}" not found in master list`);
        }
    }

    /**
     * Sync shopping list from products marked inShopping
     * Moved from app.js to centralize shopping logic
     */
    syncListsFromProducts() {
        // console.log('🔄 === syncListsFromProducts() STARTED ===');
        
        // Get products that should be in shopping from app or products manager
        let allProducts = [];
        if (window.app?.allProducts) {
            allProducts = window.app.allProducts;
        } else if (window.realProductsCategoriesManager?.getAllProducts) {
            allProducts = window.realProductsCategoriesManager.getAllProducts();
        }
        
        if (!allProducts.length) {
            console.error('❌ No products available for sync!');
            return;
        }
        
        const productsForShopping = allProducts.filter(product => product.inShopping);
        // console.log('📦 Products marked inShopping:', productsForShopping.map(p => p.name));
        
        // Get current shopping items
        const currentShoppingItems = this.getAllItems();
        // console.log('🛒 Current shopping items:', currentShoppingItems.map(item => item.name));
        
        // Remove items no longer marked as inShopping
        currentShoppingItems.forEach(item => {
            const stillInShopping = productsForShopping.find(product => 
                product.name.toLowerCase() === item.name.toLowerCase()
            );
            if (!stillInShopping) {
                // console.log(`🗑️ Removing "${item.name}" - no longer marked inShopping`);
                this.deleteItem(item.id);
            }
        });
        
        // Add items that should be in shopping but aren't yet
        for (const product of productsForShopping) {
            const existingItem = currentShoppingItems.find(item => 
                item.name.toLowerCase() === product.name.toLowerCase()
            );
            if (!existingItem) {
                // console.log(`➕ Adding "${product.name}" - newly marked inShopping`);
                this.addItem(product.name, product.category, product.inPantry || false, false);
            }
        }
        
        // console.log('✅ syncListsFromProducts() COMPLETED');
        this.refreshDisplay();
    }

    /**
     * Add all out-of-stock pantry items to shopping list
     * Moved from app.js to centralize shopping logic
     */
    addAllUnstockedToShopping() {
        // Get out-of-stock items from real pantry manager
        if (!window.realPantryManager) {
            console.error('❌ Pantry manager not available');
            return;
        }
        
        const outOfStockItems = window.realPantryManager.getOutOfStockItems();
        
        if (!outOfStockItems || outOfStockItems.length === 0) {
            // console.log('ℹ️ No out-of-stock items to add');
            return;
        }
        
        // Add each out-of-stock item to shopping list
        let addedCount = 0;
        outOfStockItems.forEach(item => {
            // Check if item is already in shopping list
            const existingItem = this.getAllItems().find(shoppingItem => 
                shoppingItem.name.toLowerCase() === item.name.toLowerCase()
            );
            
            if (!existingItem) {
                // Set fromStandard=true for pantry items, originalStockStatus=false since they're out of stock
                this.addItem(item.name, item.category, true, false);
                addedCount++;
            }
        });
        
        // Refresh displays
        this.refreshDisplay();
        
        // Also refresh pantry display so cart icons turn green
        if (window.realPantryManager?.refreshDisplay) {
            window.realPantryManager.refreshDisplay();
        }
        
        // console.log(`✅ Added ${addedCount} out-of-stock items to shopping list`);
        return addedCount;
    }
}

// Make it available globally
window.RealShoppingListManager = RealShoppingListManager;

// Debug helper function for console use
window.fixShoppingSync = function() {
    if (window.realShoppingListManager) {
        const syncCount = window.realShoppingListManager.syncAllMasterProductsWithShoppingList();
        // console.log(`🔧 Manual sync completed. Fixed ${syncCount} products.`);
        return syncCount;
    } else {
        console.error('❌ Shopping list manager not available');
        return 0;
    }
};

// Comprehensive debug function for specific product
window.debugProductSync = function(productName) {
    // console.log(`🔍 === DEBUGGING PRODUCT: "${productName}" ===`);
    
    // 1. Check shopping list items
    const shoppingItems = window.realShoppingListManager ? window.realShoppingListManager.getAllItems() : [];
    const inShoppingList = shoppingItems.find(item => item.name.toLowerCase() === productName.toLowerCase());
    // console.log('📋 Shopping List Check:', {
    //     inShoppingList: !!inShoppingList,
    //     shoppingItem: inShoppingList,
    //     allShoppingItems: shoppingItems.map(item => item.name)
    // });
    
    // 2. Check master products
    const masterProduct = window.app?.allProducts?.find(p => p.name.toLowerCase() === productName.toLowerCase());
    // console.log('📦 Master Product Check:', {
    //     found: !!masterProduct,
    //     inShopping: masterProduct ? masterProduct.inShopping : 'NOT_FOUND',
    //     product: masterProduct
    // });
    
    // 3. Check pantry items  
    const pantryItem = window.realPantryManager ? 
        window.realPantryManager.getAllItems().find(item => item.name.toLowerCase() === productName.toLowerCase()) : null;
    // console.log('🏠 Pantry Item Check:', {
    //     found: !!pantryItem,
    //     pantryItem: pantryItem
    // });
    
    // 4. Check what pantry cart button would show
    if (pantryItem && window.realPantryManager) {
        const cartButtonState = window.realPantryManager.isItemInShoppingList(pantryItem);
        // console.log('🛒 Cart Button State:', {
        //     wouldBeGreen: cartButtonState,
        //     logic: cartButtonState ? 'GREEN (in shopping)' : 'RED (not in shopping)'
        // });
    }
    
    // 5. Summary and inconsistencies
    const summary = {
        inShoppingListActual: !!inShoppingList,
        masterProductInShopping: masterProduct ? !!masterProduct.inShopping : null,
        cartButtonWouldShow: pantryItem && window.realPantryManager ? 
            window.realPantryManager.isItemInShoppingList(pantryItem) : null
    };
    
    // console.log('📊 SUMMARY:', summary);
    
    const inconsistent = summary.inShoppingListActual !== summary.masterProductInShopping;
    if (inconsistent) {
        console.error('🚨 INCONSISTENCY DETECTED!');
        // console.log('🔧 Run fixShoppingSync() to correct this');
    } else {
        // console.log('✅ All sources are consistent');
    }
    
    return summary;
};

// Force refresh all displays after sync
window.forceRefreshAllDisplays = function() {
    // console.log('🔄 Force refreshing all displays...');
    
    if (window.realPantryManager?.refreshDisplay) {
        window.realPantryManager.refreshDisplay();
        // console.log('✅ Pantry display refreshed');
    }
    
    if (window.realShoppingListManager?.refreshDisplay) {
        window.realShoppingListManager.refreshDisplay();
        // console.log('✅ Shopping list display refreshed');
    }
    
    if (window.app?.render) {
        window.app.render();
        // console.log('✅ Main app display refreshed');
    }
    
    // console.log('🎯 All displays refreshed');
};

// Debug function for Bosui specifically
window.debugBosuiState = function() {
    // console.log('🔍 === DEBUGGING BOSUI STATE ===');
    
    // Check shopping list
    const shoppingItems = window.realShoppingListManager?.getAllItems() || [];
    const bosuiInShopping = shoppingItems.find(item => item.name.toLowerCase().includes('bosui'));
    // console.log('🛒 Bosui in shopping list:', !!bosuiInShopping, bosuiInShopping);
    
    // Check master products
    const masterProduct = window.app?.allProducts?.find(p => p.name.toLowerCase().includes('bosui'));
    // console.log('📦 Master product inShopping:', masterProduct ? masterProduct.inShopping : 'NOT_FOUND', masterProduct);
    
    // Check pantry item
    const pantryItem = window.realPantryManager?.getAllItems().find(item => item.name.toLowerCase().includes('bosui'));
    // console.log('🏠 Pantry item found:', !!pantryItem, pantryItem);
    
    // Check what cart button would show
    if (pantryItem && window.realPantryManager) {
        const cartState = window.realPantryManager.isItemInShoppingList(pantryItem);
        // console.log('🛒 Cart button should show:', cartState ? 'GREEN' : 'RED');
    }
    
    return {
        inShoppingList: !!bosuiInShopping,
        masterProductInShopping: masterProduct?.inShopping,
        cartButtonState: pantryItem ? window.realPantryManager?.isItemInShoppingList(pantryItem) : null
    };
};

// Auto-instantiate the shopping list manager
(async () => {
    try {
        window.realShoppingListManager = new RealShoppingListManager();
        await window.realShoppingListManager.initialize();
        // console.log('✅ Real Shopping List Manager instantiated and initialized');
    } catch (error) {
        console.error('❌ Failed to instantiate shopping list manager:', error);
    }
})();

// console.log('✅ Real Shopping List Module loaded - v6.0.0-unified-filtered-views');