/**
 * REAL MENU MODULE - Complete Implementation
 * 
 * Contains ALL menu/navigation functionality - fully independent
 * Version: 3.7.1-modal-dom-fix
 * 
 * COMPLETE TAB NAVIGATION SYSTEM:
 * - Tab switching and state management
 * - Active tab tracking and persistence
 * - Render coordination across all modules
 * - Event handling for tab buttons
 * - State synchronization and persistence
 */

class RealMenuManager {
    constructor() {
        // Tab configuration
        this.tabs = [
            { id: 'shopping', title: 'Shopping', icon: '🛒', tooltip: 'Shopping List' },
            { id: 'pantry', title: 'Pantry', icon: '🏠', tooltip: 'Pantry Stock' },
            { id: 'products', title: 'Products', icon: '📋', tooltip: 'Products Management' },
            { id: 'recipes', title: 'Recipes', icon: '🍳', tooltip: 'Recipe Collection' },
            { id: 'meals', title: 'Meals', icon: '📅', tooltip: 'Meal Planning' },
            { id: 'categories', title: 'Categories', icon: '⚙️', tooltip: 'Category Management' },
            { id: 'sync', title: 'Sync', icon: '📱', tooltip: 'Sync & Backup' }
        ];
        
        // State management
        this.currentTab = 'shopping'; // Default tab
        this.previousTab = null;
        this.tabHistory = ['shopping'];
        
        // DOM elements (will be set during initialization)
        this.tabButtons = null;
        this.tabContents = null;
        
        // Integration points (set by external systems)
        this.app = null;
        this.renderCallbacks = new Map();
        
        // Tab state persistence
        this.persistState = true;
        this.storageKey = 'currentTab';
        
        // Prevent duplicate meal removal calls
        this.removingMeal = false;
        
        // console.log('🗂️ Real Menu Manager constructed');
    }

    /**
     * Initialize the menu manager
     */
    async initialize() {
        // Load saved state
        this.loadState();
        
        // Initialize DOM elements
        this.initializeDOMElements();
        
        // Set up event listeners
        this.attachEventListeners();
        
        // Set initial active tab
        this.activateTab(this.currentTab, false);
        
        // console.log(`🗂️ Real Menu Manager initialized - active tab: ${this.currentTab}`);
        return this;
    }

    /**
     * Set integration with main app
     */
    setIntegration(app) {
        this.app = app;
        // console.log('🔗 Menu Manager integrated with main app');
    }

    /**
     * Initialize DOM elements
     */
    initializeDOMElements() {
        this.tabButtons = document.querySelectorAll('.tab-button');
        this.tabContents = document.querySelectorAll('.tab-content');
        
        if (!this.tabButtons.length) {
            console.error('❌ No tab buttons found');
            return false;
        }
        
        if (!this.tabContents.length) {
            console.error('❌ No tab content elements found');
            return false;
        }
        
        // console.log(`🗂️ Initialized ${this.tabButtons.length} tab buttons and ${this.tabContents.length} content areas`);
        return true;
    }

    /**
     * Attach event listeners to tab buttons
     */
    attachEventListeners() {
        if (!this.tabButtons) return false;
        
        this.tabButtons.forEach(button => {
            const tabId = button.dataset.tab;
            if (!tabId) {
                console.warn('⚠️ Tab button missing data-tab attribute:', button);
                return;
            }
            
            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchTab(tabId);
            });
            
            // Add keyboard support
            button.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.switchTab(tabId);
                }
            });
        });
        
        // console.log('🎛️ Event listeners attached to tab buttons');
        return true;
    }

    // ========== CORE TAB MANAGEMENT ==========

    /**
     * Switch to a specific tab
     */
    switchTab(tabId, addToHistory = true) {
        if (!tabId || typeof tabId !== 'string') {
            console.error('❌ Invalid tab ID provided:', tabId);
            return false;
        }
        
        // Check if tab exists
        const tabConfig = this.tabs.find(tab => tab.id === tabId);
        if (!tabConfig) {
            console.error('❌ Unknown tab ID:', tabId);
            return false;
        }
        
        // Check if already active - still process for UX consistency after refresh
        const isAlreadyActive = (this.currentTab === tabId);
        
        if (!isAlreadyActive) {
            // Store previous tab only if switching to different tab
            this.previousTab = this.currentTab;
            
            // Update current tab
            this.currentTab = tabId;
            
            // Add to history
            if (addToHistory) {
                this.addToHistory(tabId);
            }
        } else {
            // console.log(`🗂️ Re-activating current tab '${tabId}' for UX consistency`);
        }
        
        // Always activate the tab visually (handles refresh UX issue)
        this.activateTab(tabId);
        
        // Always trigger render callback (ensures content is displayed after refresh)
        this.triggerRender(tabId);
        
        // Save state if tab actually changed
        if (!isAlreadyActive) {
            this.saveState();
        }
        
        // console.log(`🗂️ Switched from '${this.previousTab}' to '${this.currentTab}'`);
        return true;
    }

    /**
     * Activate a tab visually (update DOM)
     */
    activateTab(tabId, updateContent = true) {
        // Update tab buttons
        this.tabButtons.forEach(button => {
            const isActive = button.dataset.tab === tabId;
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-selected', isActive.toString());
        });
        
        // Update tab content visibility
        if (updateContent) {
            this.tabContents.forEach(content => {
                const isActive = content.id === `${tabId}-tab`;
                content.classList.toggle('active', isActive);
                content.setAttribute('aria-hidden', (!isActive).toString());
            });
        }
        
        // Update document title if needed
        const tabConfig = this.tabs.find(tab => tab.id === tabId);
        if (tabConfig && document.title.includes('Grocery App')) {
            document.title = `${tabConfig.title} - Grocery App`;
        }
        
        // console.log(`🗂️ Activated tab: ${tabId}`);
        return true;
    }

    /**
     * Get current active tab
     */
    getCurrentTab() {
        return this.currentTab;
    }

    /**
     * Get previous tab
     */
    getPreviousTab() {
        return this.previousTab;
    }

    /**
     * Check if a tab is currently active
     */
    isTabActive(tabId) {
        return this.currentTab === tabId;
    }

    /**
     * Get all available tabs
     */
    getAllTabs() {
        return this.tabs;
    }

    /**
     * Get tab configuration by ID
     */
    getTabConfig(tabId) {
        return this.tabs.find(tab => tab.id === tabId);
    }

    // ========== RENDER COORDINATION ==========

    /**
     * Register a render callback for a specific tab
     */
    registerRenderCallback(tabId, callback) {
        if (typeof callback !== 'function') {
            console.error('❌ Render callback must be a function');
            return false;
        }
        
        this.renderCallbacks.set(tabId, callback);
        // console.log(`🎨 Registered render callback for tab: ${tabId}`);
        return true;
    }

    /**
     * Unregister render callback
     */
    unregisterRenderCallback(tabId) {
        const removed = this.renderCallbacks.delete(tabId);
        if (removed) {
            // console.log(`🗑️ Removed render callback for tab: ${tabId}`);
        }
        return removed;
    }

    /**
     * Trigger render for current or specific tab
     */
    triggerRender(tabId = null) {
        const targetTab = tabId || this.currentTab;
        
        // Special handling for shopping tab - force shopping list sync and render
        if (targetTab === 'shopping') {
            this.forceShoppingListRender();
        }
        
        // Call registered callback if available
        const callback = this.renderCallbacks.get(targetTab);
        if (callback) {
            try {
                callback(targetTab);
                // console.log(`🎨 Triggered render callback for tab: ${targetTab}`);
                return true;
            } catch (error) {
                console.error(`❌ Render callback failed for tab ${targetTab}:`, error);
                return false;
            }
        }
        
        // Fallback to app render if integrated
        if (this.app && typeof this.app.render === 'function') {
            try {
                this.app.render();
                // console.log(`🎨 Triggered app render for tab: ${targetTab}`);
                return true;
            } catch (error) {
                console.error(`❌ App render failed for tab ${targetTab}:`, error);
                return false;
            }
        }
        
        // console.log(`🎨 No render method available for tab: ${targetTab}`);
        return false;
    }

    /**
     * Force shopping list to render with modular data
     */
    forceShoppingListRender() {
        // console.log('🛒 Forcing shopping list render with modular data...');
        
        try {
            // v6.0.0 UNIFIED: No need to sync - app.shoppingItems is now a getter
            if (window.realShoppingListManager && this.app) {
                // The shopping list module is the source of truth via getter
                // Safety check: Make sure Products Manager is ready before accessing getter
                if (window.realProductsCategoriesManager) {
                    // console.log(`🔄 Shopping items available via getter: ${this.app.shoppingItems.length} items`);
                } else {
                    console.warn('⚠️ Products Manager not ready - skipping shopping list render');
                    return;
                }
                
                // Force shopping list render directly
                // console.log('🎨 About to call renderShoppingList() directly');
                if (this.app && this.app.renderShoppingList) {
                    // console.log('🎨 Calling app.renderShoppingList()...');
                    this.app.renderShoppingList();
                    // console.log('✅ app.renderShoppingList() completed');
                } else {
                    console.warn('⚠️ Cannot call app.renderShoppingList() - not available');
                }
            }
        } catch (error) {
            console.error('❌ Error forcing shopping list render:', error);
        }
    }

    /**
     * Refresh current tab
     */
    refreshCurrentTab() {
        return this.triggerRender(this.currentTab);
    }

    // ========== NAVIGATION HISTORY ==========

    /**
     * Add tab to history
     */
    addToHistory(tabId) {
        // Remove if already exists to avoid duplicates
        const existingIndex = this.tabHistory.indexOf(tabId);
        if (existingIndex > -1) {
            this.tabHistory.splice(existingIndex, 1);
        }
        
        // Add to end
        this.tabHistory.push(tabId);
        
        // Keep only last 10 tabs
        if (this.tabHistory.length > 10) {
            this.tabHistory.shift();
        }
        
        // console.log(`📚 Tab history updated:`, this.tabHistory);
    }

    /**
     * Go back to previous tab
     */
    goBack() {
        if (!this.previousTab) {
            // console.log('📚 No previous tab available');
            return false;
        }
        
        return this.switchTab(this.previousTab, false);
    }

    /**
     * Get tab history
     */
    getHistory() {
        return [...this.tabHistory];
    }

    /**
     * Clear history
     */
    clearHistory() {
        this.tabHistory = [this.currentTab];
        // console.log('📚 Tab history cleared');
    }

    // ========== STATE MANAGEMENT ==========

    /**
     * Load saved state from localStorage
     */
    loadState() {
        if (!this.persistState) return;
        
        try {
            const savedTab = localStorage.getItem(this.storageKey);
            if (savedTab && this.tabs.find(tab => tab.id === savedTab)) {
                this.currentTab = savedTab;
                // console.log(`💾 Loaded saved tab state: ${savedTab}`);
            }
        } catch (error) {
            console.error('❌ Failed to load tab state:', error);
        }
    }

    /**
     * Save current state to localStorage
     */
    saveState() {
        if (!this.persistState) return;
        
        try {
            localStorage.setItem(this.storageKey, this.currentTab);
            localStorage.setItem(`${this.storageKey}_timestamp`, new Date().toISOString());
        } catch (error) {
            console.error('❌ Failed to save tab state:', error);
        }
    }

    /**
     * Reset to default state
     */
    resetToDefault() {
        this.currentTab = 'shopping';
        this.previousTab = null;
        this.tabHistory = ['shopping'];
        this.activateTab('shopping');
        this.saveState();
        // console.log('🔄 Reset to default tab state');
    }

    // ========== UTILITY METHODS ==========

    /**
     * Enable or disable tab
     */
    setTabEnabled(tabId, enabled = true) {
        const button = document.querySelector(`.tab-button[data-tab="${tabId}"]`);
        const content = document.getElementById(`${tabId}-tab`);
        
        if (button) {
            button.disabled = !enabled;
            button.classList.toggle('disabled', !enabled);
            button.setAttribute('aria-disabled', (!enabled).toString());
        }
        
        if (content) {
            content.classList.toggle('disabled', !enabled);
        }
        
        // console.log(`🗂️ Tab ${tabId} ${enabled ? 'enabled' : 'disabled'}`);
        return true;
    }

    /**
     * Update tab badge/notification
     */
    setTabBadge(tabId, count = null) {
        const button = document.querySelector(`.tab-button[data-tab="${tabId}"]`);
        if (!button) return false;
        
        // Remove existing badge
        const existingBadge = button.querySelector('.tab-badge');
        if (existingBadge) {
            existingBadge.remove();
        }
        
        // Add new badge if count provided
        if (count && count > 0) {
            const badge = document.createElement('span');
            badge.className = 'tab-badge';
            badge.textContent = count > 99 ? '99+' : count.toString();
            badge.setAttribute('aria-label', `${count} items`);
            button.appendChild(badge);
        }
        
        // console.log(`🏷️ Updated badge for tab ${tabId}: ${count || 'removed'}`);
        return true;
    }

    /**
     * Get comprehensive menu statistics
     */
    getStatistics() {
        return {
            totalTabs: this.tabs.length,
            currentTab: this.currentTab,
            previousTab: this.previousTab,
            historyLength: this.tabHistory.length,
            history: [...this.tabHistory],
            availableTabs: this.tabs.map(tab => tab.id),
            statePersistedAt: localStorage.getItem(`${this.storageKey}_timestamp`)
        };
    }

    /**
     * Refresh all tab states and DOM
     */
    refreshAll() {
        this.initializeDOMElements();
        this.attachEventListeners();
        this.activateTab(this.currentTab);
        // console.log('🔄 Refreshed all menu states and DOM');
    }

    // ========== MEALS TAB FUNCTIONALITY ==========

    /**
     * Initialize meals tab functionality
     */
    initializeMealsTab() {
        // Get DOM elements for meals tab
        this.shoppingListModal = document.getElementById('shoppingListModal');
        this.generateShoppingListBtn = document.getElementById('generateShoppingListBtn');
        
        if (this.generateShoppingListBtn) {
            this.generateShoppingListBtn.addEventListener('click', () => {
                console.log('🖱️ Generate Shopping List button clicked (from RealMenuManager)');
                this.openShoppingListModal();
            });
            // console.log('🍽️ Meals tab shopping list generation initialized');
        } else {
            console.warn('⚠️ Generate Shopping List button not found');
        }
        
        // Initialize modal close events
        if (this.shoppingListModal) {
            const closeBtn = document.getElementById('closeShoppingListModal');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.closeShoppingListModal());
            }
            
            // Close on backdrop click
            this.shoppingListModal.addEventListener('click', (e) => {
                if (e.target === this.shoppingListModal) {
                    this.closeShoppingListModal();
                }
            });
        }
    }

    /**
     * Open shopping list generation modal
     */
    openShoppingListModal() {
        // console.log('🛒 Opening shopping list modal from RealMenuManager...');
        
        try {
            // Create a fresh modal that bypasses any CSS conflicts
            this.createFreshModal();
            return true;
        } catch (error) {
            console.error('❌ Error opening shopping list modal:', error);
            return false;
        }
    }

    /**
     * Create a completely fresh modal that bypasses existing CSS conflicts
     */
    createFreshModal() {
        // console.log('🆕 Creating fresh modal to bypass CSS conflicts...');
        
        // Remove any existing fresh modal
        const existingFresh = document.getElementById('freshShoppingModal');
        if (existingFresh) {
            existingFresh.remove();
        }
        
        // Create modal structure
        const modalHTML = `
            <div id="freshShoppingModal" style="
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                background: rgba(0,0,0,0.6) !important;
                z-index: 2000000 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
            ">
                <div style="
                    width: 500px !important;
                    height: 400px !important;
                    background: white !important;
                    border-radius: 12px !important;
                    padding: 24px !important;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.3) !important;
                    position: relative !important;
                    display: flex !important;
                    flex-direction: column !important;
                ">
                    <div style="
                        display: flex !important;
                        justify-content: space-between !important;
                        align-items: center !important;
                        margin-bottom: 20px !important;
                        border-bottom: 1px solid #eee !important;
                        padding-bottom: 15px !important;
                    ">
                        <h3 style="margin: 0 !important; color: #333 !important; font-size: 18px !important;">🛒 Generate Shopping List</h3>
                        <button id="closeFreshModal" style="
                            background: none !important;
                            border: none !important;
                            font-size: 24px !important;
                            cursor: pointer !important;
                            color: #666 !important;
                            padding: 5px !important;
                        ">&times;</button>
                    </div>
                    <div style="flex: 1 !important; overflow-y: auto !important;">
                        <p style="margin-bottom: 15px !important; color: #555 !important;">Choose which meals to include in your shopping list:</p>
                        
                        <div style="margin-bottom: 20px !important;">
                            <label style="display: block !important; margin-bottom: 8px !important; font-weight: 600 !important;">Time Range:</label>
                            <div style="display: flex !important; flex-direction: column !important; gap: 8px !important;">
                                <label style="display: flex !important; align-items: center !important; gap: 8px !important; cursor: pointer !important;">
                                    <input type="radio" name="freshTimeRange" value="future" checked style="margin: 0 !important;">
                                    <span>🔮 Future meals only (tomorrow onwards)</span>
                                </label>
                                <label style="display: flex !important; align-items: center !important; gap: 8px !important; cursor: pointer !important;">
                                    <input type="radio" name="freshTimeRange" value="todayFuture" style="margin: 0 !important;">
                                    <span>⏰ Today's remaining meals + future</span>
                                </label>
                                <label style="display: flex !important; align-items: center !important; gap: 8px !important; cursor: pointer !important;">
                                    <input type="radio" name="freshTimeRange" value="all" style="margin: 0 !important;">
                                    <span>📅 All planned meals this week</span>
                                </label>
                            </div>
                        </div>
                        
                        <div id="freshMealsPreview" style="
                            background: #f8f9fa !important;
                            padding: 15px !important;
                            border-radius: 8px !important;
                            margin-bottom: 20px !important;
                            min-height: 80px !important;
                        ">
                            <div style="color: #666 !important; font-style: italic !important;">Loading meal preview...</div>
                        </div>
                    </div>
                    <div style="
                        display: flex !important;
                        gap: 12px !important;
                        justify-content: flex-end !important;
                        border-top: 1px solid #eee !important;
                        padding-top: 15px !important;
                    ">
                        <button id="cancelFreshModal" style="
                            padding: 8px 16px !important;
                            border: 1px solid #ddd !important;
                            background: white !important;
                            border-radius: 6px !important;
                            cursor: pointer !important;
                        ">Cancel</button>
                        <button id="confirmFreshModal" style="
                            padding: 8px 16px !important;
                            border: none !important;
                            background: #007bff !important;
                            color: white !important;
                            border-radius: 6px !important;
                            cursor: pointer !important;
                        ">Add to Shopping List</button>
                    </div>
                </div>
            </div>
        `;
        
        // Add to DOM
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Add event listeners
        const freshModal = document.getElementById('freshShoppingModal');
        const closeBtn = document.getElementById('closeFreshModal');
        const cancelBtn = document.getElementById('cancelFreshModal');
        const confirmBtn = document.getElementById('confirmFreshModal');
        
        const closeModal = () => {
            freshModal.remove();
            // console.log('🗑️ Fresh modal closed');
        };
        
        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        freshModal.addEventListener('click', (e) => {
            if (e.target === freshModal) closeModal();
        });
        
        confirmBtn.addEventListener('click', () => {
            const selectedRange = document.querySelector('input[name="freshTimeRange"]:checked')?.value || 'future';
            // console.log('✅ Generating shopping list for:', selectedRange);
            
            // Delegate to app's generation method
            if (this.app && typeof this.app.confirmShoppingListGeneration === 'function') {
                // Temporarily set the original radio button to match selection
                const originalRadio = document.querySelector(`input[name="timeRange"][value="${selectedRange}"]`);
                if (originalRadio) {
                    originalRadio.checked = true;
                    // console.log('📋 Set original radio button to:', selectedRange);
                } else {
                    // console.warn('⚠️ Could not find original radio button for:', selectedRange);
                }
                
                // Debug the state before calling generation
                // console.log('🔍 Debugging shopping list generation...');
                const { meals, ingredients } = this.app.getMealsForTimeRange(selectedRange);
                // console.log('🍽️ Found meals:', meals.length);
                // console.log('🥘 Found ingredients:', ingredients.length);
                
                // Check shopping list state
                const currentShoppingItems = this.app.allProducts.filter(p => p.inShopping);
                const currentShoppingCount = currentShoppingItems.length;
                // console.log('🛒 Current shopping list items:', currentShoppingCount);
                
                // DEBUG: List all products that app thinks are in shopping list
                // console.log('📋 DEBUGGING: Products marked as inShopping:');
                currentShoppingItems.forEach((product, index) => {
                    // console.log(`${index + 1}. ${product.name} (ID: ${product.id}) - inShopping: ${product.inShopping}, completed: ${product.completed}`);
                });
                
                // Also check what the shopping list manager thinks
                if (window.realShoppingListManager) {
                    const shoppingManagerItems = window.realShoppingListManager.getShoppingItems();
                    console.log('🛍️ Shopping List Manager items:', shoppingManagerItems.length);
                    shoppingManagerItems.forEach((item, index) => {
                        // console.log(`Manager ${index + 1}. ${item.name} (ID: ${item.id})`);
                    });
                } else {
                    // console.log('⚠️ realShoppingListManager not found');
                }
                
                // Check which ingredients are already in shopping list
                const alreadyInShopping = ingredients.filter(ingredient => {
                    const product = this.app.allProducts.find(p => p.id === ingredient.productId);
                    return product && product.inShopping;
                });
                // console.log('🔍 Ingredients already in shopping:', alreadyInShopping.length);
                // console.log('🆕 New ingredients to add:', ingredients.length - alreadyInShopping.length);
                
                if (alreadyInShopping.length > 0) {
                    console.log('📋 Already in shopping list:', alreadyInShopping.map(ing => {
                        const product = this.app.allProducts.find(p => p.id === ing.productId);
                        return product ? product.name : `Product ${ing.productId}`;
                    }));
                }
                
                this.app.confirmShoppingListGeneration();
            }
            
            closeModal();
        });
        
        // Update preview when radio buttons change
        const radioButtons = document.querySelectorAll('input[name="freshTimeRange"]');
        radioButtons.forEach(radio => {
            radio.addEventListener('change', () => {
                this.updateFreshModalPreview(radio.value);
            });
        });
        
        // Initial preview update
        this.updateFreshModalPreview('future');
        
        // console.log('✅ Fresh modal created and displayed successfully');
    }

    /**
     * Update the preview in the fresh modal
     */
    updateFreshModalPreview(timeRange) {
        const previewDiv = document.getElementById('freshMealsPreview');
        if (!previewDiv) return;
        
        if (this.app && typeof this.app.getMealsForTimeRange === 'function') {
            const { meals, ingredientsCount } = this.app.getMealsForTimeRange(timeRange);
            
            if (meals.length === 0) {
                previewDiv.innerHTML = '<div style="color: #666; font-style: italic;">No meals planned for selected time range</div>';
            } else {
                const mealsList = meals.map(meal => 
                    `<div style="margin-bottom: 4px; color: #333;">${meal.day} ${meal.mealType}: ${meal.name}</div>`
                ).join('');
                previewDiv.innerHTML = `
                    <div style="font-weight: 600; margin-bottom: 8px; color: #007bff;">${ingredientsCount} unique ingredients to add</div>
                    ${mealsList}
                `;
            }
        } else {
            previewDiv.innerHTML = '<div style="color: #666;">Preview not available</div>';
        }
    }

    /**
     * Close shopping list generation modal
     */
    closeShoppingListModal() {
        if (this.shoppingListModal) {
            this.shoppingListModal.style.display = 'none';
            // console.log('🗑️ Shopping list modal closed');
        }
    }

    /**
     * Update shopping list preview (delegates to app for now)
     */
    updateShoppingPreview() {
        // Delegate to main app's updateShoppingPreview method if available
        if (this.app && typeof this.app.updateShoppingPreview === 'function') {
            this.app.updateShoppingPreview();
        } else {
            // console.log('📋 Shopping preview update - app method not available');
        }
    }

    /**
     * Set integration with main app (enhanced for meals functionality)
     */
    setIntegration(app) {
        this.app = app;
        
        // Initialize meals tab functionality after app integration
        this.initializeMealsTab();
        
        // console.log('🔗 Menu Manager integrated with main app (including meals functionality)');
    }

    // ========== MEAL PLANNING FUNCTIONALITY ==========
    /**
     * Assign meal to a specific slot
     */
    assignMealToSlot(dayIndex, mealType) {
        // console.log(`📅 Assigning meal to slot: Day ${dayIndex}, ${mealType}`);
        // v6.0.1 FIX: Menu Manager should be self-sufficient, not depend on app.js
        // console.log('📅 Menu Manager: Handling meal assignment independently...');
        
        // Store context internally (no app dependency)
        this.currentMealAssignment = { dayIndex, mealType };
        
        // Create self-sufficient meal type selection modal 
        const mealTypeModal = document.createElement('div');
        mealTypeModal.className = 'modal';
        mealTypeModal.style.display = 'block';
        mealTypeModal.innerHTML = `
            <div class="modal-content meal-selection-modal">
                <h3>Add ${mealType} for Day ${dayIndex + 1}</h3>
                <p>What would you like to add for ${mealType}?</p>
                <div class="meal-type-buttons">
                    <button onclick="window.realMenuManager.selectRecipeForMeal()" class="meal-type-btn recipe-btn">
                        🍽️ Recipe
                    </button>
                    <button onclick="window.realMenuManager.selectQuickMealForMeal()" class="meal-type-btn quick-btn">
                        ⚡ Quick Meal
                    </button>
                    <button onclick="window.realMenuManager.closeMealTypeModal()" class="meal-type-btn cancel-btn">
                        ❌ Cancel
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(mealTypeModal);
        this.currentMealTypeModal = mealTypeModal;
        return true;
    }
    
    /**
     * Show meal details
     */
    showMealDetails(dayIndex, mealType, mealData) {
        // console.log(`👁️ Showing meal details: Day ${dayIndex}, ${mealType}`, mealData);
        
        if (!mealData) {
            console.warn('⚠️ No meal data provided for details');
            alert('No meal details available.');
            return false;
        }
        
        // Create comprehensive meal details modal
        this.createMealDetailsModal(dayIndex, mealType, mealData);
        return true;
    }
    
    /**
     * Create comprehensive meal details modal
     */
    createMealDetailsModal(dayIndex, mealType, mealData) {
        // console.log(`🍽️ Creating meal details modal for ${mealType} on day ${dayIndex + 1}`);
        
        // Remove any existing meal details modal
        const existingModal = document.getElementById('mealDetailsModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Determine meal type and prepare content
        const isRecipe = mealData.type === 'recipe' || mealData.recipeId;
        const dayName = this.getDayName(dayIndex);
        
        let contentHTML = '';
        let titleHTML = '';
        
        if (isRecipe) {
            // Recipe meal details
            const recipe = this.getRecipeById(mealData.recipeId || mealData.id);
            if (recipe) {
                titleHTML = `🍽️ ${recipe.name}`;
                contentHTML = this.createRecipeMealContent(recipe, mealData);
            } else {
                titleHTML = `🍽️ Recipe Meal`;
                contentHTML = `<div class="meal-error">Recipe not found (ID: ${mealData.recipeId || mealData.id})</div>`;
            }
        } else {
            // Simple meal details
            titleHTML = `⚡ ${mealData.name || 'Quick Meal'}`;
            contentHTML = this.createSimpleMealContent(mealData);
        }
        
        // Create modal structure
        const modalHTML = `
            <div id="mealDetailsModal" style="
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                background: rgba(0,0,0,0.6) !important;
                z-index: 2000000 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
            ">
                <div style="
                    width: 600px !important;
                    max-width: 90vw !important;
                    max-height: 80vh !important;
                    background: white !important;
                    border-radius: 12px !important;
                    padding: 24px !important;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.3) !important;
                    position: relative !important;
                    display: flex !important;
                    flex-direction: column !important;
                    overflow: hidden !important;
                ">
                    <!-- Header -->
                    <div style="
                        display: flex !important;
                        justify-content: space-between !important;
                        align-items: center !important;
                        margin-bottom: 20px !important;
                        border-bottom: 1px solid #eee !important;
                        padding-bottom: 15px !important;
                    ">
                        <div>
                            <h3 style="margin: 0 !important; color: #333 !important; font-size: 18px !important;">${titleHTML}</h3>
                            <p style="margin: 5px 0 0 0 !important; color: #666 !important; font-size: 14px !important;">${dayName} ${mealType}</p>
                        </div>
                        <button id="closeMealDetailsModal" style="
                            background: none !important;
                            border: none !important;
                            font-size: 24px !important;
                            cursor: pointer !important;
                            color: #666 !important;
                            padding: 5px !important;
                        ">&times;</button>
                    </div>
                    
                    <!-- Content -->
                    <div style="
                        flex: 1 !important;
                        overflow-y: auto !important;
                        margin-bottom: 20px !important;
                    ">
                        ${contentHTML}
                    </div>
                    
                    <!-- Actions -->
                    <div style="
                        display: flex !important;
                        gap: 12px !important;
                        justify-content: flex-end !important;
                        border-top: 1px solid #eee !important;
                        padding-top: 15px !important;
                    ">
                        <button id="editMealBtn" style="
                            padding: 8px 16px !important;
                            border: 1px solid #007bff !important;
                            background: white !important;
                            color: #007bff !important;
                            border-radius: 6px !important;
                            cursor: pointer !important;
                        ">✏️ Edit</button>
                        <button id="removeMealBtn" style="
                            padding: 8px 16px !important;
                            border: 1px solid #dc3545 !important;
                            background: white !important;
                            color: #dc3545 !important;
                            border-radius: 6px !important;
                            cursor: pointer !important;
                        ">🗑️ Remove</button>
                        <button id="closeMealDetailsBtn" style="
                            padding: 8px 16px !important;
                            border: none !important;
                            background: #6c757d !important;
                            color: white !important;
                            border-radius: 6px !important;
                            cursor: pointer !important;
                        ">Close</button>
                    </div>
                </div>
            </div>
        `;
        
        // Add to DOM
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Add event listeners
        const modal = document.getElementById('mealDetailsModal');
        const closeBtn = document.getElementById('closeMealDetailsModal');
        const closeBottomBtn = document.getElementById('closeMealDetailsBtn');
        const editBtn = document.getElementById('editMealBtn');
        const removeBtn = document.getElementById('removeMealBtn');
        
        const closeModal = () => {
            modal.remove();
            // console.log('🗑️ Meal details modal closed');
        };
        
        closeBtn.addEventListener('click', closeModal);
        closeBottomBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        
        // Edit meal action
        editBtn.addEventListener('click', () => {
            // console.log('✏️ Edit meal clicked');
            closeModal();
            
            if (isRecipe) {
                // Re-open recipe selection for this slot
                this.assignMealToSlot(dayIndex, mealType);
            } else {
                // Re-open simple meal builder for this slot
                if (window.app && typeof window.app.openSimpleMealBuilder === 'function') {
                    window.app.openSimpleMealBuilder(dayIndex, mealType);
                } else {
                    alert('Edit functionality not available. Please try refreshing the page.');
                }
            }
        });
        
        // Remove meal action
        removeBtn.addEventListener('click', () => {
            if (confirm(`Remove ${mealData.name || 'this meal'} from ${dayName} ${mealType}?`)) {
                // console.log(`🗑️ Removing meal: Day ${dayIndex}, ${mealType}`);
                closeModal();
                
                // Use app's removeMeal method if available
                if (window.app && typeof window.app.removeMeal === 'function') {
                    window.app.removeMeal(dayIndex, mealType);
                } else {
                    alert('Remove functionality not available. Please try refreshing the page.');
                }
            }
        });
        
        // console.log('✅ Meal details modal created and displayed');
    }
    
    /**
     * Create content for recipe meals
     */
    createRecipeMealContent(recipe, mealData) {
        const ingredients = recipe.ingredients || [];
        const ingredientsHTML = ingredients.length > 0 
            ? ingredients.map(ing => {
                // Resolve productId to product name
                const productName = ing.name || this.getProductNameById(ing.productId) || 'Unknown ingredient';
                return `<li>${ing.quantity || ''} ${ing.unit || ''} ${productName}</li>`;
            }).join('')
            : '<li>No ingredients listed</li>';
        
        return `
            <div style="margin-bottom: 20px !important;">
                <h4 style="margin: 0 0 10px 0 !important; color: #007bff !important;">📝 Description</h4>
                <p style="margin: 0 !important; color: #555 !important; line-height: 1.5 !important;">
                    ${recipe.description || 'No description available'}
                </p>
            </div>
            
            <div style="margin-bottom: 20px !important;">
                <h4 style="margin: 0 0 10px 0 !important; color: #007bff !important;">🥘 Ingredients (${ingredients.length})</h4>
                <ul style="margin: 0 !important; padding-left: 20px !important; color: #555 !important;">
                    ${ingredientsHTML}
                </ul>
            </div>
            
            ${recipe.preparation ? `
                <div style="margin-bottom: 20px !important;">
                    <h4 style="margin: 0 0 10px 0 !important; color: #007bff !important;">👨‍🍳 Preparation</h4>
                    <div style="
                        background: #f8f9fa !important;
                        padding: 15px !important;
                        border-radius: 8px !important;
                        color: #555 !important;
                        line-height: 1.5 !important;
                        white-space: pre-wrap !important;
                    ">${recipe.preparation}</div>
                </div>
            ` : ''}
            
            <div style="
                display: flex !important;
                gap: 15px !important;
                font-size: 14px !important;
                color: #666 !important;
            ">
                ${recipe.persons ? `<span>👥 ${recipe.persons} persons</span>` : ''}
                ${recipe.cuisine ? `<span>🌍 ${recipe.cuisine}</span>` : ''}
                ${recipe.season ? `<span>🌱 ${recipe.season}</span>` : ''}
            </div>
        `;
    }
    
    /**
     * Create content for simple meals
     */
    createSimpleMealContent(mealData) {
        // Handle both data structures: 'ingredients' (new) and 'products' (current)
        const ingredients = mealData.ingredients || mealData.products || [];
        console.log('🥘 Simple meal ingredients/products:', ingredients);
        const ingredientsHTML = ingredients.length > 0
            ? ingredients.map(ing => {
                // Handle both formats: object {productId: "123"} or direct ID "123"  
                const productId = typeof ing === 'object' ? ing.productId : ing;
                const product = this.getProductById(productId);
                const productName = product ? product.name : `Product ${productId}`;
                const notes = typeof ing === 'object' ? ing.notes : '';
                console.log(`🥘 Processing ingredient: ${productId} → ${productName}`);
                return `<li>${productName}${notes ? ` (${notes})` : ''}</li>`;
            }).join('')
            : '<li>No ingredients specified</li>';
        
        return `
            <div style="margin-bottom: 20px !important;">
                <h4 style="margin: 0 0 10px 0 !important; color: #007bff !important;">📝 Quick Meal</h4>
                <p style="margin: 0 !important; color: #555 !important; line-height: 1.5 !important;">
                    ${mealData.description || 'Simple meal with selected ingredients'}
                </p>
            </div>
            
            <div style="margin-bottom: 20px !important;">
                <h4 style="margin: 0 0 10px 0 !important; color: #007bff !important;">🛒 Ingredients (${ingredients.length})</h4>
                <ul style="margin: 0 !important; padding-left: 20px !important; color: #555 !important;">
                    ${ingredientsHTML}
                </ul>
            </div>
            
            <div style="
                background: #e7f3ff !important;
                padding: 15px !important;
                border-radius: 8px !important;
                color: #0066cc !important;
                font-size: 14px !important;
            ">
                💡 This is a quick meal. You can edit it to add more ingredients or convert it to a full recipe.
            </div>
        `;
    }
    
    /**
     * Helper methods for meal details modal
     */
    getDayName(dayIndex) {
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        return days[dayIndex] || `Day ${dayIndex + 1}`;
    }
    
    getRecipeById(recipeId) {
        if (window.realRecipesManager && window.realRecipesManager.getRecipeById) {
            return window.realRecipesManager.getRecipeById(recipeId);
        } else if (window.app && window.app.recipes) {
            return window.app.recipes.find(r => r.id === recipeId);
        }
        return null;
    }
    
    getProductById(productId) {
        if (window.realProductsCategoriesManager && window.realProductsCategoriesManager.getProductById) {
            return window.realProductsCategoriesManager.getProductById(productId);
        } else if (window.app && window.app.allProducts) {
            return window.app.allProducts.find(p => p.id === productId);
        }
        return null;
    }
    
    getProductNameById(productId) {
        if (!productId) return null;
        
        const product = this.getProductById(productId);
        return product ? product.name : null;
    }
    
    /**
     * Remove meal from slot
     */
    removeMeal(dayIndex, mealType) {
        // Prevent duplicate calls
        if (this.removingMeal) {
            console.warn('🚫 Meal removal already in progress, ignoring duplicate call');
            return false;
        }
        
        if (confirm(`Remove ${mealType} meal from day ${dayIndex}?`)) {
            this.removingMeal = true; // Set flag to prevent duplicates
            console.log(`🗑️ Removing meal: Day ${dayIndex}, ${mealType}`);
            
            // Use app's meal data structure if available
            if (window.app && window.app.mealPlans) {
                // Get the current week key (same pattern as app.js)
                const weekKey = window.app.getWeekKey ? window.app.getWeekKey(window.app.currentWeekStart) : 
                               `${new Date().getFullYear()}-W${Math.ceil((new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 604800000)}`;
                
                console.log(`🔍 Looking for meal: weekKey=${weekKey}, dayIndex=${dayIndex}, mealType=${mealType}`);
                console.log(`📊 Available meal plans:`, window.app.mealPlans);
                
                if (window.app.mealPlans[weekKey] && window.app.mealPlans[weekKey][dayIndex] && window.app.mealPlans[weekKey][dayIndex][mealType]) {
                    const mealData = window.app.mealPlans[weekKey][dayIndex][mealType];
                    const mealName = mealData.name || mealData.recipeName || 'Unknown meal';
                    
                    console.log(`🎯 Found meal to remove:`, mealData);
                    
                    // Remove the meal directly (avoid circular delegation)
                    // Don't call window.app.removeMeal() as that delegates back to us!
                    
                    // Perform manual removal with proper cleanup
                    delete window.app.mealPlans[weekKey][dayIndex][mealType];
                    
                    // Clean up empty objects
                    if (Object.keys(window.app.mealPlans[weekKey][dayIndex]).length === 0) {
                        delete window.app.mealPlans[weekKey][dayIndex];
                    }
                    if (Object.keys(window.app.mealPlans[weekKey]).length === 0) {
                        delete window.app.mealPlans[weekKey];
                    }
                    
                    // Save and refresh
                    if (window.app.saveMealPlans) {
                        window.app.saveMealPlans();
                    }
                    if (window.app.renderMealCalendar) {
                        window.app.renderMealCalendar();
                    }
                    
                    console.log(`✅ Meal "${mealName}" successfully removed from ${mealType} on day ${dayIndex}`);
                    
                    // Reset flag after successful removal
                    this.removingMeal = false;
                    return true;
                } else {
                    console.warn(`⚠️ No meal found for ${mealType} on day ${dayIndex} in week ${weekKey}`);
                    console.log(`📋 Available data structure:`, {
                        weekExists: !!window.app.mealPlans[weekKey],
                        dayExists: !!(window.app.mealPlans[weekKey] && window.app.mealPlans[weekKey][dayIndex]),
                        mealExists: !!(window.app.mealPlans[weekKey] && window.app.mealPlans[weekKey][dayIndex] && window.app.mealPlans[weekKey][dayIndex][mealType])
                    });
                    alert(`No ${mealType} meal found on day ${dayIndex} to remove.`);
                    this.removingMeal = false; // Reset flag
                    return false;
                }
            } else {
                console.error('❌ Meal data not available - app.mealPlans not found');
                console.log(`🔍 Available app properties:`, window.app ? Object.keys(window.app) : 'window.app not available');
                alert('Error: Meal data not available. Please refresh the page and try again.');
                this.removingMeal = false; // Reset flag
                return false;
            }
        } else {
            // User cancelled - reset flag
            this.removingMeal = false;
        }
        return false;
    }
    
    // ========== SELF-SUFFICIENT MEAL MODAL METHODS ==========
    
    selectRecipeForMeal() {
        console.log('🍽️ Menu Manager: Using app\'s proper recipe selection modal...');
        
        // Safety check for meal assignment context
        if (!this.currentMealAssignment) {
            console.error('❌ No meal assignment context available');
            alert('Error: No meal assignment context. Please try again.');
            return;
        }
        
        // STORE meal context and close our modal
        const mealContext = { ...this.currentMealAssignment };
        this.closeMealTypeModal();
        
        // Use app's real recipe selection functionality
        if (window.app && typeof window.app.openRecipeSelectionModal === 'function') {
            // Set up the context that app expects
            window.app.currentMealSlot = {
                dayIndex: mealContext.dayIndex,
                mealType: mealContext.mealType
            };
            
            // Open the real recipe selection modal with proper UI
            window.app.openRecipeSelectionModal();
        } else {
            // Fallback to simple selection
            alert('Recipe selection modal not available. Please try again.');
        }
    }
    
    selectQuickMealForMeal() {
        console.log('⚡ Menu Manager: Selecting quick meal...');
        
        // Safety check for meal assignment context
        if (!this.currentMealAssignment) {
            console.error('❌ No meal assignment context available');
            alert('Error: No meal assignment context. Please try again.');
            return;
        }
        
        // STORE meal context BEFORE closing modal (which sets it to null)
        const mealContext = { ...this.currentMealAssignment };
        this.closeMealTypeModal();
        
        // Use app's proper simple meal builder instead of just prompting for name
        if (window.app && typeof window.app.openSimpleMealBuilder === 'function') {
            console.log('🛠️ Opening app\'s simple meal builder...');
            window.app.openSimpleMealBuilder(mealContext.dayIndex, mealContext.mealType);
        } else {
            // Fallback to simple name-only entry if builder not available
            console.warn('⚠️ Simple meal builder not available, using fallback');
            const mealName = prompt(`Enter a quick meal name for ${mealContext.mealType}:`);
            
            if (mealName && mealName.trim()) {
                // Create meal data object
                const mealData = {
                    type: 'simple',
                    name: mealName.trim(),
                    timestamp: new Date().toISOString()
                };
                
                console.log(`💾 Saving quick meal "${mealName}" to calendar...`);
                
                // Save the meal using app's setMeal method
                if (window.app && typeof window.app.setMeal === 'function') {
                    try {
                        window.app.setMeal(mealContext.dayIndex, mealContext.mealType, mealData);
                        console.log(`✅ Successfully saved quick meal "${mealName}" to calendar`);
                        alert(`Quick meal "${mealName}" saved to ${mealContext.mealType} on day ${mealContext.dayIndex + 1}!`);
                    } catch (error) {
                        console.error('❌ Error saving quick meal:', error);
                        alert('Error saving meal to calendar. Please try again.');
                    }
                } else {
                    console.error('❌ App setMeal method not available');
                    alert('Error: Meal saving functionality not available. Please refresh and try again.');
                }
            } else {
                console.log('⚠️ Quick meal creation cancelled - no name provided');
            }
        }
    }
    
    closeMealTypeModal() {
        console.log('🚪 Menu Manager: Closing meal type modal...');
        if (this.currentMealTypeModal) {
            document.body.removeChild(this.currentMealTypeModal);
            this.currentMealTypeModal = null;
        }
        this.currentMealAssignment = null;
    }
}

// Make the class globally available
window.RealMenuManager = RealMenuManager;

console.log(`🗂️ Real Menu Manager loaded - v3.7.1-modal-dom-fix`);