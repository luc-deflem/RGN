// VERSION 6.0.1 - UNIFIED ARCHITECTURE BUG FIXES - Single Source of Truth
console.log('🚀 Loading Grocery App VERSION 6.0.1-unified-bug-fixes');

class GroceryApp {
    constructor() {
        // Initialize modules (with safe checks)
        this.debugUtils = window.DebugUtils ? new DebugUtils(this) : null;
        this.performanceMonitor = window.PerformanceMonitor ? new PerformanceMonitor(this) : null;
        this.shoppingList = null; // Will be set during initialization
        this.pantryManager = window.RealPantryManager ? new RealPantryManager() : null;
        this.productsCategoriesManager = window.RealProductsCategoriesManager ? new RealProductsCategoriesManager() : null;
        this.realRecipesManager = window.RealRecipesManager ? new RealRecipesManager() : null;
        this.realMenuManager = window.RealMenuManager ? new RealMenuManager() : null;
        this.jsonImportExportManager = window.RealJsonImportExportManager ? new RealJsonImportExportManager() : null;
        this.productsManager = window.ProductsManager ? new ProductsManager(this) : null;
        this.firebaseManager = window.FirebaseManager ? new FirebaseManager(this) : null;
        this.firebaseSyncManager = window.FirebaseSyncManager ? new FirebaseSyncManager() : null;
        
        // Check if localStorage is working
        if (this.debugUtils && this.debugUtils.checkStorageHealth) {
            this.debugUtils.checkStorageHealth();
        }
        
        this.currentTab = 'welcome';
        this.currentEditingItem = null;
        this.currentHighlightIndex = -1;
        this.INITIAL_RENDER_LIMIT = 200;
        
        // v6.0.0 UNIFIED: No more local data arrays - pure module delegation
        // All data is accessed through module methods like:
        // - window.realProductsCategoriesManager.getAllProducts()
        // - window.realProductsCategoriesManager.getShoppingProducts()
        // - window.realProductsCategoriesManager.getPantryProducts()
        
        // v6.0.0 UNIFIED: Shopping List initialization (AFTER Products Manager)
        // Note: Delayed longer to ensure Products Manager initializes first
        setTimeout(() => {
            this.initializeShoppingList().catch(error => {
                console.error('❌ Shopping list initialization failed:', error);
            });
        }, 200);
        
        // v6.0.0 UNIFIED: Pantry manager initialization (AFTER Products Manager)
        // Note: Delayed longer to ensure Products Manager initializes first
        setTimeout(async () => {
            try {
                if (this.pantryManager) {
                    await this.pantryManager.initialize();
                    
                    // v6.0.0: Pantry gets categories from products manager directly
                    // console.log(`🏠 Pantry manager initialized (unified v6.0.0)`);
                    
                    // Make globally available for HTML onclick handlers
                    window.realPantryManager = this.pantryManager;
                    
                    // Re-render pantry if needed
                    if (this.currentTab === 'pantry') {
                        window.realPantryManager.refreshDisplay();
                    }
                }
            } catch (error) {
                console.error('❌ Pantry manager initialization failed:', error);
            }
        }, 200);

        // v6.0.0 UNIFIED: Products-Categories manager initialization (pure delegation)
        setTimeout(async () => {
            try {
                if (this.productsCategoriesManager) {
                    await this.productsCategoriesManager.initialize();
                    
                    // Make globally available for HTML onclick handlers
                    window.realProductsCategoriesManager = this.productsCategoriesManager;

                    // Populate category dropdowns now that categories are loaded
                    window.realProductsCategoriesManager.updateCategorySelects();

                    const categories = this.productsCategoriesManager.getAllCategories();
                    const products = this.productsCategoriesManager.getAllProducts();
                    
                    // Make globally available immediately (no assignment needed - getters handle this)
                    window.app = this;
                    
                    // console.log(`📦📂 Products-Categories Manager initialized (unified v6.0.0): ${categories.length} categories, ${products.length} products`);
                    // console.log('✅ Categories available via getter:', this.categories.length);
                    
                    // Force refresh displays to use correct categories
                    this.forceRefreshDisplays();
                    
                    // IMPORTANT: Trigger all displays re-render now that Products Manager is ready
                    setTimeout(() => {
                        if (window.realShoppingListManager && window.realShoppingListManager.renderShoppingList) {
                            // console.log('🔄 Re-rendering shopping list now that Products Manager is ready');
                            window.realShoppingListManager.renderShoppingList();
                        }
                        if (window.realPantryManager && window.realPantryManager.refreshDisplay) {
                            // console.log('🔄 Re-rendering pantry now that Products Manager is ready');
                            window.realPantryManager.refreshDisplay();
                        }
                        // Also re-render products tab if it's currently active
                        if (this.currentTab === 'products') {
                            // console.log('🔄 Re-rendering products list now that Products Manager is ready');
                            this.renderProductsList();
                        }
                    }, 100);
                    
                    // DEBUG: Check module states after initialization
                    setTimeout(() => {
                        this.debugModuleStates();
                    }, 500);
                }
            } catch (error) {
                console.error('❌ Products-Categories manager initialization failed:', error);
            }
        }, 100);
        
        // Also make app globally available immediately in constructor
        window.app = this;

        // Async recipes manager initialization
        setTimeout(async () => {
            try {
                if (this.realRecipesManager) {
                    await this.realRecipesManager.initialize();
                }
                
                // Set up integrations with other modules
                if (this.realRecipesManager) {
                    this.realRecipesManager.setIntegrations({
                        productsManager: this.productsCategoriesManager,
                        smartImageSystem: window.smartImageSystem,
                        mealPlanningSystem: null, // Will be connected when meal planning is modularized
                        jsonImportExportManager: this.jsonImportExportManager
                    });
                    
                // Sync data from real module is handled through getter
                }
                
                // Make globally available for HTML onclick handlers
                window.realRecipesManager = this.realRecipesManager;
                
                // Initialize UI rendering capabilities
                this.realRecipesManager.initializeUI(this);
                this.realRecipesManager.attachEventListeners();

                // console.log(`🍳 Real Recipes Manager initialized with UI - ${this.recipes.length} recipes`);
                
                // Re-render recipes if needed
                if (this.currentTab === 'recipes') {
                    this.renderRecipes();
                }
            } catch (error) {
                console.error('❌ Real Recipes manager initialization failed:', error);
                // Fallback to old system - recipes already loaded in constructor
                // console.log(`🔄 Using fallback recipes manager with ${this.recipes.length} recipes`);
            }
        }, 100);

        // Async menu manager initialization
        setTimeout(async () => {
            try {
                if (this.realMenuManager) {
                    await this.realMenuManager.initialize();
                    
                    // Set up integration with main app
                    this.realMenuManager.setIntegration(this);
                    
                    // Register render callbacks for each tab
                    this.realMenuManager.registerRenderCallback('shopping', () => this.renderShoppingList());
                    this.realMenuManager.registerRenderCallback('pantry', () => {
                        if (window.realPantryManager) {
                            window.realPantryManager.refreshDisplay();
                        }
                    });
                    this.realMenuManager.registerRenderCallback('products', () => this.renderProductsList());
                    this.realMenuManager.registerRenderCallback('recipes', () => this.renderRecipes());
                    this.realMenuManager.registerRenderCallback('meals', () => this.renderMealCalendar());
                    this.realMenuManager.registerRenderCallback('categories', () => this.renderCategoriesList());
                    
                    // Sync current tab state
                    this.currentTab = this.realMenuManager.getCurrentTab();
                }
                
                // Make globally available for HTML onclick handlers
                window.realMenuManager = this.realMenuManager;
                
                // console.log(`🗂️ Real Menu Manager initialized - active tab: ${this.currentTab}`);
                
                // Initial render for current tab
                this.render();
            } catch (error) {
                console.error('❌ Real Menu manager initialization failed:', error);
                // Fallback to legacy menu system
                // console.log(`🔄 Using fallback menu system - current tab: ${this.currentTab}`);
            }
        }, 150); // Slightly delayed to ensure products-categories is ready
        
        // Async JSON import/export manager initialization
        setTimeout(async () => {
            try {
                if (this.jsonImportExportManager) {
                    await this.jsonImportExportManager.initialize();
                    
                    // Set up integration with main app
                    this.jsonImportExportManager.setIntegration(this);
                }
                
                // Make globally available for HTML onclick handlers
                window.realJsonImportExportManager = this.jsonImportExportManager;
                
                // console.log('📤📥 Real JSON Import/Export Manager initialized and integrated');
            } catch (error) {
                console.error('❌ JSON Import/Export manager initialization failed:', error);
            }
        }, 150);
        
        // REMOVED: this.standardItems - managed by pantry-manager-real.js
        // v6.0.0 UNIFIED: No local data arrays - using delegation getters
        // Categories are now accessed via get categories() getter that delegates to Products Manager
        this.mealPlans = this.loadMealPlans();

        // Load image settings
        this.imagesFolderPathValue = this.loadImageSettings();
        this.useFirebaseImages = this.loadFirebaseImageSetting();

        // Initialize current week (start of current week)
        this.currentWeekStart = this.getWeekStart(new Date());

        this.initializeElements();
        this.attachEventListeners();

        // Update category selects with current categories
        
        // Initialize image settings UI
        this.initializeImageSettings();
        
        // Temporarily disabled syncing methods to debug constructor issue
        // console.log('🔧 Skipping sync methods for debugging...');
        // this.syncProductsWithExistingItems();
        // this.syncListsFromProducts();
        
        this.render();
        if (window.DebugUtils) {
            DebugUtils.updateDeviceInfo();
        }
        
        // console.log('🔧 About to initialize Firebase...');
        // Initialize Firebase
        if (this.firebaseManager) {
            this.firebaseManager.initializeFirebase();
        }
        
        // Initialize Firebase Sync Manager asynchronously
        setTimeout(async () => {
            if (this.firebaseSyncManager) {
                try {
                    await this.firebaseSyncManager.initialize(this);
                    // console.log('✅ Firebase Sync Manager initialized');
                } catch (error) {
                    console.error('❌ Firebase Sync Manager initialization failed:', error);
                }
            }
        }, 100);
        
        // console.log('🔧 About to refresh product recipe counts...');
        // Refresh product recipe counts after loading
        // console.log('🔄 Refreshing product recipe counts...');
        if (this.productsManager) {
            this.refreshProductRecipeCounts();
            // console.log('🔧 Product recipe counts refreshed');
        } else {
            // console.log('🔧 Skipping product recipe counts (no products manager)');
        }
        
        // console.log('🛒 Grocery Manager initialized with localStorage');
        const pantryCount = this.pantryManager ? this.pantryManager.getItemsCount() : 0;
        const deviceInfo = window.DebugUtils ? DebugUtils.getDeviceInfo() : 'Unknown';
        console.log(`📊 Data loaded: ${this.shoppingItems.length} shopping items, ${pantryCount} pantry items, ${this.categories.length} categories, ${this.allProducts.length} products, ${this.recipes.length} recipes`);
        // console.log(`📱 Device: ${deviceInfo}`);
        
        // Test functions are now handled by DebugUtils module
        
        // Make app globally available for inline onclick handlers
        // console.log('🔧 Setting window.app...');
        window.app = this;
        // console.log('✅ GroceryApp constructor completed - window.app available');
    }

    // ========================================
    // v6.0.0 UNIFIED: BACKWARD COMPATIBILITY DELEGATION METHODS
    // These methods provide backward compatibility while delegating to real modules
    // ========================================

    /**
     * v6.0.0 UNIFIED: Get all products (delegates to products manager)
     */
    get allProducts() {
        if (window.realProductsCategoriesManager) {
            return window.realProductsCategoriesManager.getAllProducts();
        }
        return [];
    }

    /**
     * v6.0.0 UNIFIED: Get shopping items (delegates to products manager)
     */
    get shoppingItems() {
        if (window.realProductsCategoriesManager) {
            return window.realProductsCategoriesManager.getShoppingProducts();
        }
        return [];
    }

    /**
     * v6.0.0 UNIFIED: Get categories (delegates to products manager)
     */
    get categories() {
        if (window.realProductsCategoriesManager) {
            return window.realProductsCategoriesManager.getAllCategories();
        }
        return [];
    }

    /**
     * v6.0.1 UNIFIED: Get recipes (delegates to recipes manager)
     */
    get recipes() {
        if (this.realRecipesManager) {
            return this.realRecipesManager.getAllRecipes();
        }
        return [];
    }

    /**
     * v6.0.0 UNIFIED: Get all products method (delegates to products manager)
     */
    getAllProducts() {
        return this.allProducts;
    }

    /**
     * v6.0.0 UNIFIED: Get shopping items method (delegates to products manager)
     */
    getShoppingItems() {
        return this.shoppingItems;
    }

    /**
     * v6.0.1 UNIFIED: Get all recipes method (delegates to recipes manager)
     */
    getAllRecipes() {
        return this.recipes;
    }


    findOrphanedProducts() {
        // The products tab can render before the products/categories
        // manager is ready. If it's not available yet, simply treat it as
        // having no orphaned products so the rest of the render can
        // proceed without errors.
        if (
            window.realProductsCategoriesManager &&
            typeof window.realProductsCategoriesManager.findOrphanedProducts === 'function'
        ) {
            return window.realProductsCategoriesManager.findOrphanedProducts();
        }
        return [];
    }

    fixOrphanedProduct(productId, newCategoryId) {
        const result = window.realProductsCategoriesManager.fixOrphanedProduct(productId, newCategoryId);
        if (result) {
            // v6.0.0 UNIFIED: No manual data sync needed - using getters
            this.render();
        }
        return result;
    }

    deleteOrphanedProduct(productId) {
        const result = window.realProductsCategoriesManager.deleteOrphanedProduct(productId);
        if (result) {
            // v6.0.0 UNIFIED: No manual data sync needed - using getters
            this.render();
        }
        return result;
    }

    initializeElements() {
        // Header elements
        this.refreshBtn = document.getElementById('refreshBtn');
        
        // Tab elements
        this.tabButtons = document.querySelectorAll('.tab-button');
        this.tabContents = document.querySelectorAll('.tab-content');

        // Shopping tab elements
        this.itemInput = document.getElementById('itemInput');
        this.categorySelect = document.getElementById('categorySelect');
        this.addBtn = document.getElementById('addBtn');
        this.groceryList = document.getElementById('groceryList');
        this.itemCount = document.getElementById('itemCount');
        this.clearCompletedBtn = document.getElementById('clearCompleted');

        // Pantry tab elements
        this.standardItemInput = document.getElementById('standardItemInput');
        this.standardCategorySelect = document.getElementById('standardCategorySelect');
        this.addStandardBtn = document.getElementById('addStandardBtn');
        this.standardList = document.getElementById('standardList');
        this.addAllUnstockedBtn = document.getElementById('addAllUnstocked');

        // Category tab elements
        this.categoryInput = document.getElementById('categoryInput');
        this.categoryEmojiInput = document.getElementById('categoryEmojiInput');
        this.addCategoryBtn = document.getElementById('addCategoryBtn');
        this.categoriesList = document.getElementById('categoriesList');

        // Products elements
        this.productSearchInput = document.getElementById('productSearchInput');
        this.clearSearchBtn = document.getElementById('clearSearchBtn');
        this.productInput = document.getElementById('productInput');
        this.productCategorySelect = document.getElementById('productCategorySelect');
        this.addProductBtn = document.getElementById('addProductBtn');
        this.productsList = document.getElementById('productsList');
        this.productCount = document.getElementById('productCount');
        this.filteredCount = document.getElementById('filteredCount');
        
        // Orphaned products elements
        this.orphanedProductsSection = document.getElementById('orphanedProductsSection');
        this.orphanedProductsList = document.getElementById('orphanedProductsList');
        
        // Product filter elements
        this.stockStatusFilter = document.getElementById('stockStatusFilter');
        this.categoryFilter = document.getElementById('categoryFilter');
        this.clearProductFiltersBtn = document.getElementById('clearProductFiltersBtn');
        this.productAiSuggestBtn = document.getElementById('productAiSuggestBtn');

        // Recipe elements handled by RealRecipesManager
        if (this.realRecipesManager?.initializeDOMElements) {
            this.realRecipesManager.initializeDOMElements();
        }

        // Meal planning elements
        this.prevWeekBtn = document.getElementById('prevWeekBtn');
        this.nextWeekBtn = document.getElementById('nextWeekBtn');
        this.currentWeekRange = document.getElementById('currentWeekRange');
        this.mealCalendar = document.getElementById('mealCalendar');
        this.generateShoppingListBtn = document.getElementById('generateShoppingListBtn');
        // console.log('🔍 Generate Shopping List button:', !!this.generateShoppingListBtn);
        this.clearWeekBtn = document.getElementById('clearWeekBtn');

        // Meal type selection modal elements
        this.mealTypeSelectionModal = document.getElementById('mealTypeSelectionModal');
        this.selectedMealSlot = document.getElementById('selectedMealSlot');
        this.selectRecipeBtn = document.getElementById('selectRecipeBtn');
        this.selectSimpleMealBtn = document.getElementById('selectSimpleMealBtn');
        this.cancelMealTypeSelectionBtn = document.getElementById('cancelMealTypeSelection');
        this.closeMealTypeModalBtn = document.getElementById('closeMealTypeModal');

        // Simple meal modal elements
        this.simpleMealModal = document.getElementById('simpleMealModal');
        this.simpleMealName = document.getElementById('simpleMealName');
        this.simpleMealSearch = document.getElementById('simpleMealSearch');
        this.clearSimpleMealSearchBtn = document.getElementById('clearSimpleMealSearch');
        this.simpleMealCategories = document.getElementById('simpleMealCategories');
        this.selectedProducts = document.getElementById('selectedProducts');
        this.saveSimpleMealBtn = document.getElementById('saveSimpleMeal');
        this.cancelSimpleMealBtn = document.getElementById('cancelSimpleMeal');
        this.closeSimpleMealModalBtn = document.getElementById('closeSimpleMealModal');

        // Recipe selection modal elements
        this.recipeSelectionModal = document.getElementById('recipeSelectionModal');
        this.mealTypeLabel = document.getElementById('mealTypeLabel');
        this.recipeSelectionSearch = document.getElementById('recipeSelectionSearch');
        this.clearRecipeSelectionSearchBtn = document.getElementById('clearRecipeSelectionSearch');
        this.recipeSelectionList = document.getElementById('recipeSelectionList');
        this.confirmRecipeSelectionBtn = document.getElementById('confirmRecipeSelection');
        this.cancelRecipeSelectionBtn = document.getElementById('cancelRecipeSelection');
        this.closeRecipeSelectionModalBtn = document.getElementById('closeRecipeSelectionModal');

        // Recipe planning modal elements
        this.recipePlanningModal = document.getElementById('recipePlanningModal');
        this.planningRecipeName = document.getElementById('planningRecipeName');
        this.planningDate = document.getElementById('planningDate');
        this.planningPreview = document.getElementById('planningPreview');
        this.previewRecipeName = document.getElementById('previewRecipeName');
        this.previewMealType = document.getElementById('previewMealType');
        this.previewDate = document.getElementById('previewDate');
        this.existingMealWarning = document.getElementById('existingMealWarning');
        this.existingMealName = document.getElementById('existingMealName');
        this.confirmRecipePlanningBtn = document.getElementById('confirmRecipePlanning');
        this.cancelRecipePlanningBtn = document.getElementById('cancelRecipePlanning');
        this.closeRecipePlanningModalBtn = document.getElementById('closeRecipePlanningModal');

        // Shopping list modal elements
        this.shoppingListModal = document.getElementById('shoppingListModal');
        this.mealsSummary = document.getElementById('mealsSummary');
        this.ingredientsCount = document.getElementById('ingredientsCount');
        this.confirmShoppingListBtn = document.getElementById('confirmShoppingList');
        this.cancelShoppingListBtn = document.getElementById('cancelShoppingList');
        this.closeShoppingListModalBtn = document.getElementById('closeShoppingListModal');
        
        // Product recipes modal elements
        this.productRecipesModal = document.getElementById('productRecipesModal');
        this.closeProductRecipesModalBtn = document.getElementById('closeProductRecipesModal');
        this.closeProductRecipesBtn = document.getElementById('closeProductRecipes');
        this.selectedProductName = document.getElementById('selectedProductName');
        this.productRecipesList = document.getElementById('productRecipesList');
        this.noRecipesFound = document.getElementById('noRecipesFound');
        
        // Firebase elements - delegated to Firebase Sync Manager

        // Sync elements (exportDataBtn, importDataBtn handled by json-import-export-real.js)
        this.importFileInput = document.getElementById('importFileInput');
        
        // CSV elements
        this.importCsvBtn = document.getElementById('importCsvBtn');
        this.downloadCsvTemplateBtn = document.getElementById('downloadCsvTemplateBtn');
        this.csvFileInput = document.getElementById('csvFileInput');
        this.showCsvTextBtn = document.getElementById('showCsvTextBtn');
        this.csvTextArea = document.getElementById('csvTextArea');
        this.csvTextContent = document.getElementById('csvTextContent');
        this.importCsvTextBtn = document.getElementById('importCsvTextBtn');
        this.cancelCsvTextBtn = document.getElementById('cancelCsvTextBtn');
        
        // Recipe CSV elements (single file)
        this.importRecipeCsvBtn = document.getElementById('importRecipeCsvBtn');
        this.downloadRecipeCsvTemplateBtn = document.getElementById('downloadRecipeCsvTemplateBtn');
        this.recipeCsvFileInput = document.getElementById('recipeCsvFileInput');
        
        // Recipe CSV elements (two file)
        this.importTwoFileRecipesBtn = document.getElementById('importTwoFileRecipesBtn');
        this.importIngredientsFileBtn = document.getElementById('importIngredientsFileBtn');
        this.downloadTwoFileTemplatesBtn = document.getElementById('downloadTwoFileTemplatesBtn');
        this.recipeInfoFileInput = document.getElementById('recipeInfoFileInput');
        this.recipeIngredientsFileInput = document.getElementById('recipeIngredientsFileInput');
        
        // Recipe CSV elements (recipe-only)
        this.importRecipeOnlyBtn = document.getElementById('importRecipeOnlyBtn');
        this.downloadRecipeOnlyTemplateBtn = document.getElementById('downloadRecipeOnlyTemplateBtn');
        this.recipeOnlyFileInput = document.getElementById('recipeOnlyFileInput');


        // Modal elements
        this.changeCategoryModal = document.getElementById('changeCategoryModal');
        this.itemNameSpan = document.getElementById('itemNameSpan');
        this.newCategorySelect = document.getElementById('newCategorySelect');
        this.cancelChangeCategoryBtn = document.getElementById('cancelChangeCategory');
        this.confirmChangeCategoryBtn = document.getElementById('confirmChangeCategory');
        this.closeModalBtn = document.querySelector('.close-modal');
        
        // Product edit modal elements
        this.productEditModal = document.getElementById('productEditModal');
        this.editProductName = document.getElementById('editProductName');
        this.editProductCategory = document.getElementById('editProductCategory');
        this.editInShopping = document.getElementById('editInShopping');
        this.editInPantry = document.getElementById('editInPantry');
        this.editInStock = document.getElementById('editInStock');
        this.editInSeason = document.getElementById('editInSeason');
        this.closeProductModalBtn = document.getElementById('closeProductModal');
        this.cancelProductEditBtn = document.getElementById('cancelProductEdit');
        this.confirmProductEditBtn = document.getElementById('confirmProductEdit');

        // Recipe edit modal elements
        this.recipeEditModal = document.getElementById('recipeEditModal');
        this.editRecipeName = document.getElementById('editRecipeName');
        this.editRecipeDescription = document.getElementById('editRecipeDescription');
        this.editRecipePreparation = document.getElementById('editRecipePreparation');
        this.editRecipeIngredientsText = document.getElementById('editRecipeIngredientsText');
        this.convertIngredientsBtn = document.getElementById('convertIngredientsBtn');
        this.recipePersons = document.getElementById('recipePersons');
        
        // Recipe metadata elements
        this.editRecipeCuisine = document.getElementById('editRecipeCuisine');
        this.editRecipeMainIngredient = document.getElementById('editRecipeMainIngredient');
        this.editRecipeSeason = document.getElementById('editRecipeSeason');
        
        // Recipe image elements
        this.editRecipeImage = document.getElementById('editRecipeImage');
        this.browseImageBtn = document.getElementById('browseImageBtn');
        this.imageFileInput = document.getElementById('imageFileInput'); // Note: This is for recipe edit modal, not creation modal
        this.imagePreview = document.getElementById('imagePreview');
        this.previewImage = document.getElementById('previewImage');
        this.removeImageBtn = document.getElementById('removeImageBtn');
        this.downloadImageUrlBtn = document.getElementById('downloadImageUrlBtn');
        
        // Image settings elements
        this.imagesFolderPath = document.getElementById('imagesFolderPath');
        this.testImagePathBtn = document.getElementById('testImagePathBtn');
        // Firebase image elements - handled by Firebase Sync Manager
        
        this.maximizeRecipeModalBtn = document.getElementById('maximizeRecipeModal');
        this.ingredientProductSearch = document.getElementById('ingredientProductSearch');
        this.ingredientProductResults = document.getElementById('ingredientProductResults');
        this.selectedProductId = document.getElementById('selectedProductId');
        this.ingredientQuantity = document.getElementById('ingredientQuantity');
        this.ingredientUnit = document.getElementById('ingredientUnit');
        this.addIngredientBtn = document.getElementById('addIngredientBtn');
        this.ingredientsList = document.getElementById('ingredientsList');
        this.closeRecipeModalBtn = document.getElementById('closeRecipeModal');
        this.cancelRecipeEditBtn = document.getElementById('cancelRecipeEdit');
        this.confirmRecipeEditBtn = document.getElementById('confirmRecipeEdit');
        this.planRecipeFromModalBtn = document.getElementById('planRecipeFromModal');
    }

    attachEventListeners() {
        // Header events
        this.refreshBtn.addEventListener('click', () => this.hardRefresh());
        // Test modal button removed - no longer needed
        
        // Tab switching
        this.tabButtons.forEach(button => {
            button.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Shopping list events - using smart add with product search
        this.addBtn.addEventListener('click', () => {
            // Check if autocomplete dropdown is visible and has selection
            const dropdown = document.getElementById('shopping-autocomplete-dropdown');
            const selectedItem = dropdown?.querySelector('.autocomplete-item.selected');
            
            if (dropdown && dropdown.style.display !== 'none' && selectedItem) {
                // Use autocomplete selection
                selectedItem.click();
                return;
            }
            
            // Regular add flow
            const itemName = this.itemInput.value.trim();
            if (!itemName) return;
            const success = this.shoppingList.smartAddItem(itemName);
            if (success) {
                this.itemInput.value = '';
                this.render();
            }
        });
        
        this.itemInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                // Check if autocomplete dropdown is handling this
                const dropdown = document.getElementById('shopping-autocomplete-dropdown');
                if (dropdown && dropdown.style.display !== 'none') {
                    // Let autocomplete handle the Enter key
                    return;
                }
                
                // Regular add flow
                const itemName = this.itemInput.value.trim();
                if (!itemName) return;
                const success = this.shoppingList.smartAddItem(itemName);
                if (success) {
                    this.itemInput.value = '';
                    this.render();
                }
            }
        });
        this.clearCompletedBtn.addEventListener('click', () => {
            // console.log('🧹 Clear completed button clicked');
            
            // DELEGATE to shopping list module
            if (window.realShoppingListManager && window.realShoppingListManager.clearCompleted) {
                // console.log('🎯 Delegating clear completed to module');
                const clearedCount = window.realShoppingListManager.clearCompleted();
                // console.log(`🧹 Cleared ${clearedCount} completed items`);
                
                // IMPORTANT: Refresh pantry UI to update cart icons after clearing completed
                if (window.realPantryManager) {
                    // console.log('🔄 Refreshing pantry display after clear completed');
                    window.realPantryManager.refreshDisplay();
                }
                
                // Module handles its own shopping list re-rendering
            } else {
                console.warn('⚠️ Using fallback clear completed');
                if (!this.shoppingList) {
                    console.error('❌ Shopping list module not initialized');
                    return;
                }
                const clearedCount = this.shoppingList.clearCompleted();
                // console.log(`🧹 Cleared ${clearedCount} completed items`);
                this.render();
            }
        });

        // Pantry events - use real pantry manager directly
        this.addStandardBtn.addEventListener('click', () => {
            if (window.realPantryManager) {
                const itemName = this.standardItemInput.value.trim();
                const category = this.standardCategorySelect.value;
                
                if (!itemName) {
                    this.standardItemInput.focus();
                    return;
                }
                
                const result = window.realPantryManager.addItem(itemName, category);
                if (result) {
                    this.standardItemInput.value = '';
                    this.standardItemInput.focus();
                    window.realPantryManager.refreshDisplay();
                }
            }
        });
        this.standardItemInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && window.realPantryManager) {
                const itemName = this.standardItemInput.value.trim();
                const category = this.standardCategorySelect.value;
                
                if (!itemName) {
                    this.standardItemInput.focus();
                    return;
                }
                
                const result = window.realPantryManager.addItem(itemName, category);
                if (result) {
                    this.standardItemInput.value = '';
                    this.standardItemInput.focus();
                    window.realPantryManager.refreshDisplay();
                }
            }
        });
        this.addAllUnstockedBtn.addEventListener('click', () => this.addAllUnstockedToShopping());

        // Category events
        this.addCategoryBtn.addEventListener('click', () => this.addCategory());
        this.categoryInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addCategory();
        });

        // Products events
        this.addProductBtn.addEventListener('click', () => this.addProduct());
        this.productInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addProduct();
        });
        this.productSearchInput.addEventListener('input', () => this.handleProductSearch());
        this.clearSearchBtn.addEventListener('click', () => this.clearProductSearch());
        
        // Product filter events
        this.stockStatusFilter.addEventListener('change', () => {
            if (this.productsManager?.applyProductFilters) {
                this.productsManager.applyProductFilters();
            } else {
                this.applyProductFilters();
            }
        });
        this.categoryFilter.addEventListener('change', () => {
            if (this.productsManager?.applyProductFilters) {
                this.productsManager.applyProductFilters();
            } else {
                this.applyProductFilters();
            }
        });
        this.clearProductFiltersBtn.addEventListener('click', () => {
            if (this.productsManager?.clearProductFilters) {
                this.productsManager.clearProductFilters();
            } else {
                this.clearProductFilters();
            }
        });
        this.productAiSuggestBtn.addEventListener('click', () => this.generateProductAIRecipes());

        // Meal planning events
        this.prevWeekBtn.addEventListener('click', () => this.navigateWeek(-1));
        this.nextWeekBtn.addEventListener('click', () => this.navigateWeek(1));
        // Generate Shopping List button handled by menu-real.js
        this.clearWeekBtn.addEventListener('click', () => this.clearCurrentWeek());

        // Meal type selection modal events
        this.selectRecipeBtn.addEventListener('click', () => this.handleRecipeSelection());
        this.selectSimpleMealBtn.addEventListener('click', () => this.handleSimpleMealSelection());
        this.cancelMealTypeSelectionBtn.addEventListener('click', () => this.closeMealTypeModal());
        this.closeMealTypeModalBtn.addEventListener('click', () => this.closeMealTypeModal());
        this.mealTypeSelectionModal.addEventListener('click', (e) => {
            if (e.target === this.mealTypeSelectionModal) {
                this.closeMealTypeModal();
            }
        });

        // Simple meal modal events
        this.saveSimpleMealBtn.addEventListener('click', () => this.saveSimpleMeal());
        this.cancelSimpleMealBtn.addEventListener('click', () => this.closeSimpleMealModal());
        this.closeSimpleMealModalBtn.addEventListener('click', () => this.closeSimpleMealModal());
        this.simpleMealSearch.addEventListener('input', () => this.filterSimpleMealProducts());
        this.clearSimpleMealSearchBtn.addEventListener('click', () => this.clearSimpleMealSearch());
        this.simpleMealModal.addEventListener('click', (e) => {
            if (e.target === this.simpleMealModal) {
                this.closeSimpleMealModal();
            }
        });

        // Remove event delegation - we'll use inline onclick handlers like the old version

        // Recipe selection and planning modals handled by recipes module

        // Shopping list modal events
        this.confirmShoppingListBtn.addEventListener('click', () => this.confirmShoppingListGeneration());
        // Shopping list modal close buttons handled by menu-real.js
        
        // Product recipes modal events
        this.closeProductRecipesModalBtn.addEventListener('click', () => this.closeProductRecipesModal());
        this.closeProductRecipesBtn.addEventListener('click', () => this.closeProductRecipesModal());
        
        // Close modal when clicking outside
        this.productRecipesModal.addEventListener('click', (e) => {
            if (e.target === this.productRecipesModal) {
                this.closeProductRecipesModal();
            }
        });
        
        // Firebase events - delegated to Firebase Sync Manager
        
        // Listen for time range radio button changes
        document.addEventListener('change', (e) => {
            if (e.target.name === 'timeRange') {
                this.updateShoppingPreview();
            }
        });
        
        // Shopping list modal backdrop click handled by menu-real.js

        // Sync events (exportDataBtn, importDataBtn handled by json-import-export-real.js)
        this.importFileInput.addEventListener('change', (e) => this.handleFileImport(e));
        
        // CSV events
        this.importCsvBtn.addEventListener('click', () => this.csvFileInput.click());
        this.downloadCsvTemplateBtn.addEventListener('click', () => this.downloadCsvTemplate());
        this.csvFileInput.addEventListener('change', (e) => this.handleCsvImport(e));
        this.showCsvTextBtn.addEventListener('click', () => this.showCsvTextInput());
        this.importCsvTextBtn.addEventListener('click', () => this.importCsvFromText());
        this.cancelCsvTextBtn.addEventListener('click', () => this.hideCsvTextInput());
        
        // Recipe CSV events (single file)
        this.importRecipeCsvBtn.addEventListener('click', () => this.recipeCsvFileInput.click());
        this.downloadRecipeCsvTemplateBtn.addEventListener('click', () => this.realRecipesManager.downloadRecipeCsvTemplate());
        this.recipeCsvFileInput.addEventListener('change', (e) => this.realRecipesManager.handleRecipeCsvImport(e));
        
        // Recipe CSV events (two file)
        this.importTwoFileRecipesBtn.addEventListener('click', () => this.startTwoFileRecipeImport());
        this.importIngredientsFileBtn.addEventListener('click', () => this.selectIngredientsFileManually());
        this.downloadTwoFileTemplatesBtn.addEventListener('click', () => this.downloadTwoFileRecipeTemplates());
        this.recipeInfoFileInput.addEventListener('change', (e) => this.handleRecipeInfoFile(e));
        this.recipeIngredientsFileInput.addEventListener('change', (e) => this.handleRecipeIngredientsFile(e));
        
        // Recipe CSV events (recipe-only)
        this.importRecipeOnlyBtn.addEventListener('click', () => this.recipeOnlyFileInput.click());
        this.downloadRecipeOnlyTemplateBtn.addEventListener('click', () => this.downloadRecipeOnlyTemplate());
        this.recipeOnlyFileInput.addEventListener('change', (e) => this.handleRecipeOnlyImport(e));


        // Modal events
        this.closeModalBtn.addEventListener('click', () => this.closeModal());
        this.cancelChangeCategoryBtn.addEventListener('click', () => this.closeModal());
        this.confirmChangeCategoryBtn.addEventListener('click', () => this.confirmCategoryChange());
        
        // Product edit modal events
        this.closeProductModalBtn.addEventListener('click', () => window.realProductsCategoriesManager.closeProductEditModal());
        this.cancelProductEditBtn.addEventListener('click', () => window.realProductsCategoriesManager.closeProductEditModal());
        this.confirmProductEditBtn.addEventListener('click', () => window.realProductsCategoriesManager.confirmProductEdit());

        // Recipe edit modal events
        this.closeRecipeModalBtn.addEventListener('click', () => this.realRecipesManager.closeRecipeEditModal());
        this.cancelRecipeEditBtn.addEventListener('click', () => this.realRecipesManager.closeRecipeEditModal());
        this.confirmRecipeEditBtn.addEventListener('click', () => this.realRecipesManager.confirmRecipeEdit());
        this.planRecipeFromModalBtn.addEventListener('click', () => this.planRecipeFromModal());
        this.maximizeRecipeModalBtn.addEventListener('click', () => this.realRecipesManager.toggleMaximizeRecipeModal());
        // UNIFIED ARCHITECTURE: Add Ingredient button handled by recipes module
        // this.addIngredientBtn.addEventListener('click', () => this.addIngredientToRecipe());
        this.convertIngredientsBtn.addEventListener('click', () => this.convertIngredientsTextToStructured());
        
        // Recipe image events
        if (this.browseImageBtn) this.browseImageBtn.addEventListener('click', () => this.browseForImage());
        // Note: imageFileInput for recipe creation modal is handled in recipes-real.js
        if (this.removeImageBtn) this.removeImageBtn.addEventListener('click', () => this.removeImage());
        this.editRecipeImage.addEventListener('input', () => this.updateImagePreview());
        this.downloadImageUrlBtn.addEventListener('click', () => this.downloadCurrentImageUrl());
        
        // Image settings events (with null checks for removed elements)
        if (this.testImagePathBtn) {
            this.testImagePathBtn.addEventListener('click', () => this.testImagePath());
        }
        // Firebase image events - handled by Firebase Sync Manager
        
        // Firebase debug - handled by Firebase Sync Manager
        
        // Ingredient search events
        this.ingredientProductSearch.addEventListener('input', (e) => this.searchProductsForIngredients(e.target.value));
        this.ingredientProductSearch.addEventListener('focus', () => this.showSearchResults());
        this.ingredientProductSearch.addEventListener('blur', () => {
            // Delay hiding to allow clicks on results
            setTimeout(() => this.hideSearchResults(), 150);
        });
        this.ingredientProductSearch.addEventListener('keydown', (e) => this.handleSearchKeydown(e));
        
        // Event delegation for search results (including create option)
        this.ingredientProductResults.addEventListener('click', (e) => {
            // console.log('🖱️ CLICK START - target:', e.target.tagName, e.target.className);
            
            // Handle create product option clicks
            if (e.target.closest('.create-product-option')) {
                e.preventDefault();
                e.stopPropagation();
                const createOption = e.target.closest('.create-product-option');
                const productName = createOption.dataset.productName;
                // console.log('➕ Creating new product:', productName);
                this.createNewProductFromSearch(productName);
                return;
            }
            
            // Handle regular product selection clicks
            const resultItem = e.target.closest('.search-result-item');
            if (resultItem) {
                e.preventDefault();
                e.stopPropagation();
                const productId = resultItem.dataset.productId;
                // console.log('✅ SELECTING PRODUCT:', productId);
                this.selectProduct(productId);
                return;
            }
            
            // console.log('⚠️ No handler matched for:', e.target);
        });
        
        // Close modal when clicking outside
        this.changeCategoryModal.addEventListener('click', (e) => {
            if (e.target === this.changeCategoryModal) {
                this.closeModal();
            }
        });
        
        this.productEditModal.addEventListener('click', (e) => {
            if (e.target === this.productEditModal) {
                window.realProductsCategoriesManager.closeProductEditModal();
            }
        });

        this.recipeEditModal.addEventListener('click', (e) => {
            if (e.target === this.recipeEditModal) {
                this.realRecipesManager.closeRecipeEditModal();
            }
        });

        // Firebase events - handled by Firebase Sync Manager
        
        // Add force sync button functionality (if present)
        const forceSyncBtn = document.getElementById('forceSyncBtn');
        if (forceSyncBtn) {
            forceSyncBtn.addEventListener('click', () => this.forceFullSync());
        }
    }

    // Category Management Methods
    addCategory() {
        const name = document.getElementById('newCategoryName')?.value || prompt('Category name:');
        const emoji = document.getElementById('newCategoryEmoji')?.value || prompt('Category emoji:') || '📦';
        const result = window.realProductsCategoriesManager.addCategory(name, emoji);
        if (result) {
            // v6.0.0 UNIFIED: Categories accessed via getter - no assignment needed
            window.realProductsCategoriesManager.updateCategorySelects();
            this.render();
        }
        return result;
    }

    deleteCategory(categoryId) {
        const result = window.realProductsCategoriesManager.deleteCategory(categoryId);
        if (result) {
            // v6.0.0 UNIFIED: Categories accessed via getter - no assignment needed
            // v6.0.0 UNIFIED: No manual data sync needed - using getters
            window.realProductsCategoriesManager.updateCategorySelects();
            this.render();
        }
        return result;
    }

    editCategory(categoryId) {
        const newName = prompt('New category name:');
        const result = window.realProductsCategoriesManager.editCategory(categoryId, newName);
        if (result) {
            // v6.0.0 UNIFIED: Categories accessed via getter - no assignment needed
            window.realProductsCategoriesManager.updateCategorySelects();
            this.render();
        }
        return result;
    }

    editCategoryEmoji(categoryId) {
        console.log('🔧 DEBUG: editCategoryEmoji called for categoryId:', categoryId);
        const newEmoji = prompt('New emoji:');
        console.log('🔧 DEBUG: User entered emoji:', newEmoji);
        
        if (newEmoji !== null) { // User didn't cancel
            const result = window.realProductsCategoriesManager.editCategory(categoryId, null, newEmoji);
            console.log('🔧 DEBUG: editCategory result:', result);
            
            if (result) {
                // v6.0.0 UNIFIED: Categories accessed via getter - no assignment needed
                window.realProductsCategoriesManager.updateCategorySelects();
                this.render();
                console.log('✅ DEBUG: Category emoji updated and UI refreshed');
            } else {
                console.error('❌ DEBUG: Failed to update category emoji');
            }
            return result;
        }
        return false;
    }

    // REMOVED: editShoppingItem - functionality handled by shopping module

    // editStandardItem - NOW HANDLED BY REAL PANTRY MODULE

    // Products Methods (delegated to ProductsManager)
    addProduct() {
        // Delegate to real products-categories manager
        if (window.realProductsCategoriesManager) {
            const name = this.productInput?.value.trim();
            const category = this.productCategorySelect?.value || 'cat_007';

            if (!name) {
                this.productInput?.focus();
                return false;
            }

            const result = window.realProductsCategoriesManager.addProduct(name, category);
            if (result) {
                if (this.productInput) {
                    this.productInput.value = '';
                    this.productInput.focus();
                }
                // v6.0.0 UNIFIED: No manual data sync needed - using getters
                this.render();
            }
            return result;
        }
        return this.productsManager.addProduct();
    }

    deleteProduct(productId) {
        // Delegate to real products-categories manager
        if (window.realProductsCategoriesManager) {
            const result = window.realProductsCategoriesManager.deleteProduct(productId);
            if (result) {
                // v6.0.0 UNIFIED: No manual data sync needed - using getters
                this.render();
            }
            return result;
        }
        return this.productsManager.deleteProduct(productId);
    }

    editProduct(productId) {
        // Delegate to real products-categories manager
        if (window.realProductsCategoriesManager) {
            const newName = prompt('New product name:');
            const result = window.realProductsCategoriesManager.editProduct(productId, newName);
            if (result) {
                // v6.0.0 UNIFIED: No manual data sync needed - using getters
                this.render();
            }
            return result;
        }
        return this.productsManager.editProduct(productId);
    }




    addProductToShopping(productId) {
        const product = this.allProducts.find(p => p.id === productId);
        if (!product) return;

        if (product.inShopping) {
            alert('This item is already in your shopping list!');
            return;
        }

        // Update product status
        product.inShopping = true;
        product.completed = false;
        
        this.productsManager.saveAllProducts();
        this.syncListsFromProducts();
        this.switchTab('shopping');
    }

    toggleProductShopping(productId) {
        const product = this.allProducts.find(p => p.id === productId);
        if (!product) return;

        product.inShopping = !product.inShopping;
        if (!product.inShopping) {
            product.completed = false;
        }
        
        // Delegate to products-categories module
        if (window.realProductsCategoriesManager && window.realProductsCategoriesManager.toggleProductShopping) {
            return window.realProductsCategoriesManager.toggleProductShopping(productId);
        }
        console.error('❌ Products-categories module not available');
    }

    toggleProductPantry(productId) {
        const product = this.allProducts.find(p => p.id === productId);
        if (!product) return;

        product.inPantry = !product.inPantry;
        if (!product.inPantry) {
            product.inStock = false;
            product.inSeason = true;
        } else {
            product.inStock = true;
            product.inSeason = true;
        }
        
        this.productsManager.saveAllProducts();
        this.syncListsFromProducts();
        
        // Auto-sync product pantry toggle to Firebase - delegated to Firebase Sync Manager
        if (this.firebaseSyncManager) {
            this.firebaseSyncManager.autoSyncProduct(product, 'pantry_toggle');
        }
        
        this.render();
    }

    toggleProductStock(productId) {
        const product = this.allProducts.find(p => p.id === productId);
        if (!product || !product.inPantry) return;

        product.inStock = !product.inStock;
        
        this.productsManager.saveAllProducts();
        this.syncListsFromProducts();
        
        // Auto-sync product stock toggle to Firebase - delegated to Firebase Sync Manager
        if (this.firebaseSyncManager) {
            this.firebaseSyncManager.autoSyncProduct(product, 'stock_toggle');
        }
        
        this.render();
    }

    toggleProductSeason(productId) {
        const product = this.allProducts.find(p => p.id === productId);
        if (!product || !product.inPantry) return;

        product.inSeason = !product.inSeason;
        if (!product.inSeason) {
            product.inStock = false;
        }
        
        this.productsManager.saveAllProducts();
        this.syncListsFromProducts();
        
        // Auto-sync product season toggle to Firebase - delegated to Firebase Sync Manager
        if (this.firebaseSyncManager) {
            this.firebaseSyncManager.autoSyncProduct(product, 'season_toggle');
        }
        
        this.render();
    }

    toggleProductCompleted(productId) {
        const product = this.allProducts.find(p => p.id === productId);
        if (!product || !product.inShopping) return;

        product.completed = !product.completed;
        
        this.productsManager.saveAllProducts();
        this.syncListsFromProducts();
        
        // Auto-sync product completion toggle to Firebase - delegated to Firebase Sync Manager
        if (this.firebaseSyncManager) {
            this.firebaseSyncManager.autoSyncProduct(product, 'completion_toggle');
        }
        
        this.render();
    }

    searchProducts(query = null) {
        // v6.0.1 FIX: Use real Products Manager for search
        if (window.realProductsCategoriesManager) {
            // console.log('🔍 Using real products manager for search:', query);
            return window.realProductsCategoriesManager.searchProducts(query);
        }
        
        // Fallback to old products manager
        return this.productsManager.searchProducts(query);
    }
    
    handleProductSearch() {
        const query = this.productSearchInput ? this.productSearchInput.value : '';
        // console.log('🔍 Handling product search:', query);
        
        // Perform search and re-render products list
        this.searchProducts(query);
        this.renderProductsList();
    }
    
    clearProductSearch() {
        // console.log('🔍 Clearing product search');
        if (this.productSearchInput) {
            this.productSearchInput.value = '';
        }
        
        // Clear search and re-render
        this.searchProducts('');
        this.renderProductsList();
    }

    // Separate method for ingredient search in recipes
    searchProductsForIngredients(query) {
        // console.log('🔍 Searching products for ingredients:', query);
        
        // Use real products manager if available
        if (window.realProductsCategoriesManager) {
            // console.log('🔍 Using real products manager for ingredient search');
            const products = window.realProductsCategoriesManager.searchProducts(query);
            this.updateIngredientSearchResults(products);
            return products;
        }
        
        // Fallback to old products manager
        // console.log('🔍 Using legacy products manager for ingredient search');
        return this.productsManager.searchProductsForIngredients(query);
    }

    // Update ingredient search results (used by real products manager integration)
    updateIngredientSearchResults(products) {
        // console.log('🔍 updateIngredientSearchResults called with', products.length, 'products');
        this.displaySearchResults(products);
    }

    clearProductSearch() {
        return this.productsManager.clearProductSearch();
    }

    // Add recipe ingredients to shopping list
    addRecipeIngredientsToShopping(recipeId, servingMultiplier = 1) {
        return this.realRecipesManager.addRecipeIngredientsToShopping(recipeId, servingMultiplier);
    }



    planRecipeFromModal() {
        if (!this.currentEditingRecipe) {
            console.error('No recipe is currently being edited');
            return;
        }

        // Store the recipe ID before closing the modal
        const recipeId = this.currentEditingRecipe.id;
        
        // Close the recipe edit modal first
        this.realRecipesManager.closeRecipeEditModal();
        
        // Open the recipe planning modal with the current recipe
        if (this.realRecipesManager && this.realRecipesManager.planRecipe) {
            this.realRecipesManager.planRecipe(recipeId);
        }
    }
    addIngredientToRecipe() {
        const productId = this.selectedProductId.value;
        const quantity = parseFloat(this.ingredientQuantity.value);
        const unit = this.ingredientUnit.value;

        if (!productId || !quantity || quantity <= 0) {
            alert('Please search for a product and enter a valid quantity');
            return;
        }

        // Check if ingredient already exists (use loose equality for flexibility)
        const existingIngredient = this.currentRecipeIngredients.find(ing => ing.productId == productId);
        if (existingIngredient) {
            alert('This ingredient is already in the recipe');
            return;
        }

        const ingredient = {
            productId: productId,
            quantity: quantity,
            unit: unit
        };

        this.currentRecipeIngredients.push(ingredient);
        
        // Clear form
        this.clearProductSearch();
        this.ingredientQuantity.value = '';
        this.ingredientUnit.value = 'g';
        
        this.renderIngredientsInModal();
    }

    removeIngredientFromRecipe(productId) {
        // Use loose equality to match both string and number IDs
        this.currentRecipeIngredients = this.currentRecipeIngredients.filter(ing => ing.productId != productId);
        this.renderIngredientsInModal();
    }

    convertIngredientsTextToStructured() {
        // console.log('🤖 Converting ingredients text to structured format...');
        
        const ingredientsText = this.editRecipeIngredientsText.value.trim();
        if (!ingredientsText) {
            alert('⚠️ Please enter some ingredients in the text field first.');
            return;
        }

        // Parse the ingredients text
        const parsedIngredients = this.parseIngredientsText(ingredientsText);
        
        if (parsedIngredients.length === 0) {
            alert('⚠️ Could not parse any ingredients from the text. Please check the format.');
            return;
        }

        // Show preview and ask for confirmation
        const previewText = parsedIngredients.map(ing => 
            `• ${ing.quantity} ${ing.unit} ${ing.productName}`
        ).join('\n');
        
        const confirmed = confirm(`🤖 Found ${parsedIngredients.length} ingredients:\n\n${previewText}\n\nDo you want to add these to the structured ingredients list?\n\n⚠️ Note: Ingredients not matching existing products will be skipped.`);
        
        if (!confirmed) return;

        // Add parsed ingredients to the structured list
        let addedCount = 0;
        let skippedCount = 0;

        parsedIngredients.forEach(parsedIng => {
            // Find matching product
            const matchingProduct = this.findBestProductMatch(parsedIng.productName);
            
            if (matchingProduct) {
                // Check if ingredient already exists
                const existingIngredient = this.currentRecipeIngredients.find(ing => ing.productId == matchingProduct.id);
                if (!existingIngredient) {
                    const ingredient = {
                        productId: matchingProduct.id,
                        quantity: parsedIng.quantity,
                        unit: parsedIng.unit
                    };
                    this.currentRecipeIngredients.push(ingredient);
                    addedCount++;
                } else {
                    // console.log(`⚠️ Ingredient ${parsedIng.productName} already exists in recipe`);
                }
            } else {
                // console.log(`⚠️ No matching product found for: ${parsedIng.productName}`);
                skippedCount++;
            }
        });

        // Update the display
        this.renderIngredientsInModal();
        
        // Show results
        let resultMessage = `✅ Successfully added ${addedCount} ingredients to the structured list.`;
        if (skippedCount > 0) {
            resultMessage += `\n⚠️ ${skippedCount} ingredients were skipped (no matching products found).`;
        }
        alert(resultMessage);
        
        // console.log(`🤖 Conversion complete: ${addedCount} added, ${skippedCount} skipped`);
    }

    parseIngredientsText(text) {
        // console.log('🔍 Parsing ingredients text:', text);
        
        // Split by common separators
        const lines = text.split(/[,\n\r;]/).map(line => line.trim()).filter(line => line.length > 0);
        const parsedIngredients = [];
        
        // Common units mapping (including Dutch units)
        const unitMap = {
            'cups': 'cup', 'cup': 'cup',
            'tablespoons': 'tbsp', 'tablespoon': 'tbsp', 'tbsp': 'tbsp', 'tbs': 'tbsp',
            'teaspoons': 'tsp', 'teaspoon': 'tsp', 'tsp': 'tsp',
            'grams': 'g', 'gram': 'g', 'g': 'g', 'gr': 'g',
            'kilograms': 'kg', 'kilogram': 'kg', 'kg': 'kg', 'kgs': 'kg',
            'milliliters': 'ml', 'milliliter': 'ml', 'ml': 'ml', 'mls': 'ml',
            'centiliters': 'cl', 'centiliter': 'cl', 'cl': 'cl', 'cls': 'cl',
            'liters': 'l', 'liter': 'l', 'l': 'l', 'ls': 'l',
            'pieces': 'pcs', 'piece': 'pcs', 'pcs': 'pcs', 'pc': 'pcs',
            'pinch': 'pinch', 'pinches': 'pinch',
            // Dutch units
            'el': 'tbsp', 'eetlepel': 'tbsp', 'eetlepels': 'tbsp',
            'tl': 'tsp', 'theelepel': 'tsp', 'theelepels': 'tsp'
        };
        
        lines.forEach(line => {
            // Match patterns like: "2 cups flour", "250ml milk", "3 eggs", "1 pinch salt"
            // AND also: "Bloemkool 600 g", "Ui 1", "Olijfolie 1 el"
            const patterns = [
                // Pattern 1: Quantity first - "2 cups flour", "250ml milk"
                /^(\d+(?:\.\d+)?)\s*(cups?|tablespoons?|tbsp|tbs|teaspoons?|tsp|grams?|g|gr|kilograms?|kg|kgs|milliliters?|ml|mls|centiliters?|cl|cls|liters?|l|ls|pieces?|piece|pcs?|pc|pinch|pinches?|el|eetlepel|tl|theelepel)\s+(.+)$/i,
                // Pattern 2: Ingredient first - "Bloemkool 600 g", "Ui 1", "Olijfolie 1 el"
                /^(.+?)\s+(\d+(?:\.\d+)?)\s*(cups?|tablespoons?|tbsp|tbs|teaspoons?|tsp|grams?|g|gr|kilograms?|kg|kgs|milliliters?|ml|mls|centiliters?|cl|cls|liters?|l|ls|pieces?|piece|pcs?|pc|pinch|pinches?|el|eetlepel|tl|theelepel)$/i,
                // Pattern 3: Ingredient with quantity but no unit - "Ui 1", "Ei 1"
                /^(.+?)\s+(\d+(?:\.\d+)?)$/i,
                // Pattern 4: Quantity first, no unit - "3 eggs"
                /^(\d+(?:\.\d+)?)\s*(.+)$/i,
                // Pattern 5: Just ingredient name (for items like "Peper", "Zout")
                /^([a-zA-Z\u00C0-\u017F\s,-]+)$/i
            ];
            
            for (let i = 0; i < patterns.length; i++) {
                const match = line.match(patterns[i]);
                if (match) {
                    let quantity, unit, productName;
                    
                    if (i === 0) {
                        // Pattern 1: "2 cups flour", "250ml milk" - quantity first
                        quantity = parseFloat(match[1]);
                        unit = unitMap[match[2].toLowerCase()] || match[2].toLowerCase();
                        productName = match[3];
                    } else if (i === 1) {
                        // Pattern 2: "Bloemkool 600 g", "Olijfolie 1 el" - ingredient first with unit
                        productName = match[1];
                        quantity = parseFloat(match[2]);
                        unit = unitMap[match[3].toLowerCase()] || match[3].toLowerCase();
                    } else if (i === 2) {
                        // Pattern 3: "Ui 1", "Ei 1" - ingredient first, no unit
                        productName = match[1];
                        quantity = parseFloat(match[2]);
                        unit = 'pcs';
                    } else if (i === 3) {
                        // Pattern 4: "3 eggs" - quantity first, no unit
                        quantity = parseFloat(match[1]);
                        productName = match[2];
                        unit = 'pcs';
                    } else if (i === 4) {
                        // Pattern 5: "Peper", "Zout" - just ingredient name
                        productName = match[1];
                        quantity = 1;
                        unit = 'pinch';
                    }
                    
                    // Clean up product name
                    productName = productName.trim()
                        .replace(/^(of\s+|the\s+|de\s+|het\s+)/i, '') // Remove "of", "the", "de", "het"
                        .replace(/\s*\([^)]*\)/g, '') // Remove anything in parentheses
                        .trim();
                    
                    if (productName && quantity > 0) {
                        parsedIngredients.push({
                            quantity: quantity,
                            unit: unit,
                            productName: productName
                        });
                        // console.log(`✅ Parsed: ${quantity} ${unit} ${productName}`);
                    }
                    break;
                }
            }
        });
        
        // console.log(`🔍 Parsed ${parsedIngredients.length} ingredients`);
        return parsedIngredients;
    }

    findBestProductMatch(productName) {
        const searchTerm = productName.toLowerCase().trim();
        
        // First try exact match
        let match = this.allProducts.find(product => 
            product.name.toLowerCase() === searchTerm
        );
        
        if (match) return match;
        
        // Then try partial match (product name contains search term)
        match = this.allProducts.find(product => 
            product.name.toLowerCase().includes(searchTerm)
        );
        
        if (match) return match;
        
        // Try reverse (search term contains product name)
        match = this.allProducts.find(product => 
            searchTerm.includes(product.name.toLowerCase())
        );
        
        if (match) return match;
        
        // Try fuzzy matching by removing common words (English and Dutch)
        const cleanSearchTerm = searchTerm
            .replace(/\b(fresh|dried|chopped|sliced|ground|whole|raw|cooked|vers|gedroogd|gehakt|gesneden|gemalen|heel|rauw|gekookt)\b/g, '')
            .trim();
        
        if (cleanSearchTerm !== searchTerm) {
            match = this.allProducts.find(product => 
                product.name.toLowerCase().includes(cleanSearchTerm) ||
                cleanSearchTerm.includes(product.name.toLowerCase())
            );
        }
        
        return match || null;
    }

    renderIngredientsInModal() {
        // console.log('🍽️ Rendering ingredients in modal...', {
        //     ingredientsList: !!this.ingredientsList,
        //     currentRecipeIngredients: this.currentRecipeIngredients?.length || 0
        // });

        if (!this.ingredientsList || !this.currentRecipeIngredients) {
            console.warn('⚠️ Missing ingredientsList element or currentRecipeIngredients');
            return;
        }

        if (this.currentRecipeIngredients.length === 0) {
            this.ingredientsList.innerHTML = '<p style="color: #7f8c8d; text-align: center; margin: 10px 0;">No ingredients added yet</p>';
            // console.log('📝 No ingredients to display');
            return;
        }

        // console.log('🥘 Processing ingredients:', this.currentRecipeIngredients);

        const html = this.currentRecipeIngredients.map((ingredient, index) => {
            // Enhanced product lookup with multiple fallbacks
            let product = null;
            let productName = 'Unknown Product';
            
            // Try multiple product resolution methods
            if (ingredient.productId) {
                // Method 1: Direct allProducts lookup
                product = this.allProducts.find(p => p.id == ingredient.productId);
                
                // Method 2: Use Products Manager if available
                if (!product && window.realProductsCategoriesManager) {
                    product = window.realProductsCategoriesManager.getProductById(ingredient.productId);
                }
                
                if (product) {
                    productName = product.name;
                } else {
                    productName = `Product ID: ${ingredient.productId}`;
                    console.warn(`⚠️ Product not found for ID: ${ingredient.productId}`);
                }
            } else if (ingredient.name) {
                // Fallback to ingredient name if no productId
                productName = ingredient.name;
            }
            
            // console.log(`${index + 1}. ${productName} - ${ingredient.quantity || 1} ${ingredient.unit || 'pcs'}`);
            
            return `
                <div class="ingredient-item">
                    <div class="ingredient-info">
                        <div class="ingredient-name">${this.escapeHtml(productName)}</div>
                        <div class="ingredient-amount">${ingredient.quantity} ${ingredient.unit}</div>
                    </div>
                    <button class="ingredient-remove" onclick="window.app.removeIngredientFromRecipe('${ingredient.productId}')" title="Remove ingredient">×</button>
                </div>
            `;
        }).join('');

        this.ingredientsList.innerHTML = html;
        // console.log('✅ Ingredients rendered successfully');
    }

    // Product search methods for ingredient selection

    displaySearchResults(products) {
        // console.log('🔍 displaySearchResults called with:', {
        //     productsCount: products.length,
        //     searchTerm: this.ingredientProductSearch?.value?.trim(),
        //     resultsContainerExists: !!this.ingredientProductResults
        // });
        
        if (!this.ingredientProductResults) {
            console.error('❌ ingredientProductResults element not found!');
            return;
        }
        
        const searchTerm = this.ingredientProductSearch.value.trim();

        if (products.length === 0 && searchTerm) {
            // console.log('🔍 No products found, showing create option for:', searchTerm);
            
            const createOptionHTML = `
                <div class="no-results-container">
                    <div class="no-results">No products found for "${this.escapeHtml(searchTerm)}"</div>
                    <div class="create-product-option" data-product-name="${this.escapeHtml(searchTerm)}">
                        <span class="create-icon">➕</span>
                        <span class="create-text">Create "${this.escapeHtml(searchTerm)}" as new product</span>
                    </div>
                </div>
            `;
            
            this.ingredientProductResults.innerHTML = createOptionHTML;
            // console.log('✅ Create option HTML set:', createOptionHTML);
            
            // Note: Click handling is done through event delegation in attachEventListeners()
        } else {
            const html = products.map((product, index) => {
                // Use real products manager for category lookup if available
                let categoryData;
                if (window.realProductsCategoriesManager) {
                    categoryData = window.realProductsCategoriesManager.getCategoryById(product.category);
                } else {
                    categoryData = this.categories.find(cat => cat.id === product.category);
                }
                
                const categoryName = categoryData ? (categoryData.displayName || categoryData.name) : product.category;
                const categoryEmoji = categoryData ? categoryData.emoji : '📦';
                
                return `
                    <div class="search-result-item" data-product-id="${product.id}" data-index="${index}">
                        <span class="product-name">${this.escapeHtml(product.name)}</span>
                        <span class="product-category">${categoryEmoji} ${categoryName}</span>
                    </div>
                `;
            }).join('');
            
            this.ingredientProductResults.innerHTML = html;
        }

        this.showSearchResults();
        this.currentHighlightIndex = -1;
    }

    selectProduct(productId) {
        // Use real products manager if available
        let product;
        if (window.realProductsCategoriesManager) {
            product = window.realProductsCategoriesManager.getProductById(productId);
        } else {
            product = this.allProducts.find(p => p.id == productId);
        }
        
        if (product) {
            // console.log('✅ Selected product for ingredient:', product.name);
            this.ingredientProductSearch.value = product.name;
            this.selectedProductId.value = productId;
            this.hideSearchResults();
            this.ingredientQuantity.focus();
        } else {
            console.error('❌ Product not found for ID:', productId);
        }
    }

    showSearchResults() {
        if (this.ingredientProductResults && this.ingredientProductResults.innerHTML.trim()) {
            this.ingredientProductResults.classList.add('show');
        }
    }

    hideSearchResults() {
        if (this.ingredientProductResults) {
            this.ingredientProductResults.classList.remove('show');
        }
    }

    clearProductSearch() {
        // console.log('🧹 Clearing product search');
        this.ingredientProductSearch.value = '';
        this.selectedProductId.value = '';
        this.hideSearchResults();
        this.currentHighlightIndex = -1;
    }

    resetRecipeCreationState() {
        // console.log('🔄 Fully resetting recipe creation state');
        this.creatingProductForRecipe = false;
        this.pendingIngredientName = null;
        this.currentEditingProduct = null;
        this.isCreatingNewProduct = false;
        // console.log('✅ Recipe creation state fully reset');
    }

    handleSearchKeydown(e) {
        const results = this.ingredientProductResults.querySelectorAll('.search-result-item');
        const createOption = this.ingredientProductResults.querySelector('.create-product-option');
        const totalOptions = results.length + (createOption ? 1 : 0);
        
        if (totalOptions === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.currentHighlightIndex = Math.min(this.currentHighlightIndex + 1, totalOptions - 1);
                this.updateHighlightWithCreate(results, createOption);
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                this.currentHighlightIndex = Math.max(this.currentHighlightIndex - 1, -1);
                this.updateHighlightWithCreate(results, createOption);
                break;
                
            case 'Enter':
                e.preventDefault();
                if (this.currentHighlightIndex >= 0) {
                    if (this.currentHighlightIndex < results.length) {
                        // Select existing product
                        const selectedItem = results[this.currentHighlightIndex];
                        this.selectProduct(selectedItem.dataset.productId);
                    } else if (createOption && this.currentHighlightIndex === results.length) {
                        // Create new product
                        const searchTerm = this.ingredientProductSearch.value.trim();
                        this.createNewProductFromSearch(searchTerm);
                    }
                }
                break;
                
            case 'Escape':
                this.hideSearchResults();
                break;
        }
    }

    updateHighlight(results) {
        results.forEach((item, index) => {
            item.classList.toggle('highlighted', index === this.currentHighlightIndex);
        });
    }

    updateHighlightWithCreate(results, createOption) {
        // Highlight regular results
        results.forEach((item, index) => {
            item.classList.toggle('highlighted', index === this.currentHighlightIndex);
        });
        
        // Highlight create option if it exists
        if (createOption) {
            const isCreateHighlighted = this.currentHighlightIndex === results.length;
            createOption.classList.toggle('highlighted', isCreateHighlighted);
        }
    }

    createNewProductFromSearch(productName) {
        alert(`🆕 FUNCTION CALLED: createNewProductFromSearch for ${productName}`);
        // console.log('🆕 createNewProductFromSearch called for:', productName);
        // console.log('📊 Current state before creation:', {
        //     creatingProductForRecipe: this.creatingProductForRecipe,
        //     pendingIngredientName: this.pendingIngredientName,
        //     currentEditingProduct: this.currentEditingProduct,
        //     isCreatingNewProduct: this.isCreatingNewProduct,
        //     productModalDisplay: this.productEditModal?.style.display,
        //     recipeModalDisplay: this.recipeEditModal?.style.display
        // });
        
        // Store the search context for after product creation
        this.pendingIngredientName = productName;
        this.creatingProductForRecipe = true;
        
        // Create a new product template
        const newProduct = {
            id: Date.now(),
            name: productName,
            category: 'other', // Default category
            inShopping: false,
            inPantry: false,
            inStock: false,
            inSeason: true,
            completed: false,
            dateAdded: new Date().toISOString()
        };
        
        // console.log('📝 New product template:', newProduct);
        
        // Hide search results
        this.hideSearchResults();
        
        // Open product edit modal for the new product
        // console.log('🚀 About to open product edit modal...');
        window.realProductsCategoriesManager.openProductEditModal(newProduct, true); // true = isNewProduct
        
        // Verify modal opened
        setTimeout(() => {
            const isVisible = this.productEditModal.style.display === 'block';
            // console.log('⏱️ Modal visibility check:', isVisible ? 'VISIBLE' : 'NOT VISIBLE');
            if (!isVisible) {
                console.error('❌ Modal failed to open! Debugging info:', {
                    modalElement: !!this.productEditModal,
                    modalClasses: this.productEditModal?.className,
                    modalStyle: this.productEditModal?.style.cssText
                });
            }
        }, 100);
    }

    getProductStatus(product) {
        return {
            inShopping: product.inShopping || false,
            inPantry: product.inPantry || false,
            inStock: product.inStock || false,
            inSeason: product.inSeason !== false,
            completed: product.completed || false
        };
    }

    syncProductsWithExistingItems() {
        let hasChanges = false;

        // Add shopping items to products if they don't exist
        this.shoppingItems.forEach(shoppingItem => {
            const existingProduct = this.allProducts.find(product => 
                product.name.toLowerCase() === shoppingItem.name.toLowerCase() && 
                product.category === shoppingItem.category
            );

            if (!existingProduct) {
                const newProduct = {
                    id: Date.now() + Math.random(),
                    name: shoppingItem.name,
                    category: shoppingItem.category,
                    inShopping: true,
                    inPantry: shoppingItem.fromStandard || false,
                    inStock: false,
                    inSeason: true,
                    completed: shoppingItem.completed || false,
                    dateAdded: shoppingItem.dateAdded || new Date().toISOString()
                };
                this.allProducts.push(newProduct);
                hasChanges = true;
            } else {
                // Update existing product to reflect shopping status
                existingProduct.inShopping = true;
                existingProduct.completed = shoppingItem.completed || false;
                if (shoppingItem.fromStandard) {
                    existingProduct.inPantry = true;
                }
                hasChanges = true;
            }
        });

        // REMOVED: Pantry sync logic now handled by pantry-manager-real.js

        if (hasChanges) {
            this.productsManager.saveAllProducts();
            // console.log('🔄 Synced products with existing shopping and pantry items');
        }
    }

    syncListsFromProducts() {
        // Delegate to shopping list module
        if (window.realShoppingListManager && window.realShoppingListManager.syncListsFromProducts) {
            window.realShoppingListManager.syncListsFromProducts();
        } else {
            console.error('❌ Shopping list module not available for sync');
        }
        
        // Get products that should be in shopping
        const productsForShopping = this.allProducts.filter(product => product.inShopping);
        // console.log('📦 Products marked inShopping:', productsForShopping.map(p => p.name));
        
        // Get current shopping items from real manager
        const currentShoppingItems = this.shoppingList ? this.shoppingList.getAllItems() : [];
        // console.log('🛒 Current shopping items:', currentShoppingItems.map(item => item.name));
        
        if (!this.shoppingList) {
            console.error('❌ Real shopping list manager not available!');
            return;
        }
        
        // Instead of recreating the list, sync with real shopping list manager
        // 1. Remove items that are no longer marked inShopping
        const currentNames = new Set(currentShoppingItems.map(item => item.name.toLowerCase()));
        const shouldBeNames = new Set(productsForShopping.map(p => p.name.toLowerCase()));
        
        // Remove items that shouldn't be in shopping anymore
        for (const item of currentShoppingItems) {
            if (!shouldBeNames.has(item.name.toLowerCase())) {
                // console.log(`🗑️ Removing "${item.name}" - no longer marked inShopping`);
                this.shoppingList.deleteItem(item.id);
            }
        }
        
        // Add items that should be in shopping but aren't yet
        for (const product of productsForShopping) {
            if (!currentNames.has(product.name.toLowerCase())) {
                // console.log(`➕ Adding "${product.name}" - newly marked inShopping`);
                this.shoppingList.addItem(product.name, product.category, product.inPantry || false, false);
            }
        }
        
        // ✅ UNIFIED ARCHITECTURE FIX: shoppingItems is now a getter-only property
        // No assignment needed - this.shoppingItems automatically returns this.shoppingList.getAllItems()
        
        // console.log('✅ syncListsFromProducts() COMPLETED - Used real shopping list manager');
        // console.log('📋 Final shopping items:', this.shoppingItems.map(item => ({
        //     name: item.name,
        //     completed: item.completed,
        //     id: item.id
        // })));
    }

    moveCategory(fromIndex, toIndex) {
        window.realProductsCategoriesManager.moveCategory(fromIndex, toIndex);
        window.realProductsCategoriesManager.updateCategorySelects();
        this.render();
    }

    getCategoryOrder() {
        if (
            window.realProductsCategoriesManager &&
            typeof window.realProductsCategoriesManager.getCategoryOrder === 'function'
        ) {
            return window.realProductsCategoriesManager.getCategoryOrder();
        }
        // Fallback: derive order from loaded categories if module isn't ready
        return (this.categories || [])
            .slice()
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map(cat => cat.id);
    }

    updateCategorySelects() {
        return window.realProductsCategoriesManager.updateCategorySelects();
    }

    // Item Category Change Methods
    openCategoryChangeModal(itemId, itemType) {
        let item;
        
        if (itemType === 'shopping') {
            item = this.shoppingItems.find(i => i.id === itemId);
        } else if (itemType === 'standard') {
            item = this.pantryManager.getAllItems().find(i => i.id === itemId);
        } else if (itemType === 'product') {
            item = this.allProducts.find(i => i.id === itemId);
        }
        
        if (!item) return;

        this.currentEditingItem = {id: itemId, type: itemType, item: item};
        this.itemNameSpan.textContent = item.name;
        this.newCategorySelect.value = item.category;
        this.changeCategoryModal.style.display = 'block';
    }

    closeModal() {
        this.changeCategoryModal.style.display = 'none';
        this.currentEditingItem = null;
    }

    confirmCategoryChange() {
        if (!this.currentEditingItem) return;

        const newCategory = this.newCategorySelect.value;
        const {id, type, item} = this.currentEditingItem;

        item.category = newCategory;

        if (type === 'shopping') {
            if (this.shoppingList && this.shoppingList.saveToStorage) {
            this.shoppingList.saveToStorage();
        }
        } else if (type === 'standard') {
            // Pantry save now handled by real pantry manager automatically
        } else if (type === 'product') {
            this.productsManager.saveAllProducts();
            // Also sync lists to ensure shopping and pantry items get updated categories
            this.syncListsFromProducts();
            
            // Auto-sync product category change to Firebase - delegated to Firebase Sync Manager
            if (this.firebaseSyncManager) {
                this.firebaseSyncManager.autoSyncProduct(item, 'category_change');
            }
        }

        this.closeModal();
        this.render();
    }

    /**
     * Open product edit modal from shopping list or pantry item
     */
    /**
     * Debug method to check "Bosui" data consistency across all sources
     */

    openProductEditModalFromItem(itemId, itemName) {
        // console.log('🔧 Opening product edit modal from item:', { itemId, itemName });
        
        
        // Try to find product by ID first
        let product = this.allProducts.find(p => p.id === itemId);
        
        // If not found by ID, try to find by name (case-insensitive)
        if (!product) {
            product = this.allProducts.find(p => p.name.toLowerCase() === itemName.toLowerCase());
        }
        
        // If still not found, create a temporary product object for editing
        if (!product) {
            console.warn(`⚠️ Product not found in allProducts for item: ${itemName} (ID: ${itemId})`);
            // console.log('🔧 Creating temporary product object for editing');
            
            // Find the item in shopping list or pantry to get its current data
            const shoppingItem = this.shoppingItems.find(item => item.id === itemId);
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
        const shoppingItem = this.shoppingItems.find(item => item.id === itemId);
        const pantryItem = window.realPantryManager ? window.realPantryManager.getAllItems().find(item => item.id === itemId) : null;
        const sourceItem = shoppingItem || pantryItem;
        
        if (sourceItem && product) {
            // console.log('🔍 PANTRY SYNC DEBUG - Data comparison:', {
            //     itemName: itemName,
            //     itemId: itemId,
            //     pantryItemStock: pantryItem ? pantryItem.inStock : 'N/A',
            //     shoppingItemExists: !!shoppingItem,
            //     productStock: product.inStock,
            //     sourceItemStock: sourceItem.inStock,
            //     pantryItemObject: pantryItem,
            //     productObject: product,
            //     source: shoppingItem ? 'shopping' : 'pantry'
            // });
            
            // Override product data with current source item data
            product.inStock = sourceItem.inStock;
            product.inSeason = sourceItem.inSeason !== false;
            product.category = sourceItem.category || product.category;
            
            // Ensure shopping/pantry flags are correct
            product.inShopping = !!shoppingItem;
            product.inPantry = !!pantryItem;
            
            // console.log('✅ Product data synchronized with source item');
        }
        
        // console.log('🔧 Found/created product for modal:', product);
        window.realProductsCategoriesManager.openProductEditModal(product, false);
    }



    selectProductForRecipe(product) {
        // console.log('🎯 Selecting product for recipe:', product);
        
        // Auto-select the newly created product in the recipe search
        this.ingredientProductSearch.value = product.name;
        this.selectedProductId.value = product.id;
        
        // Reset the creation state
        this.resetRecipeCreationState();
        
        // console.log('📊 State after reset:', {
        //     creatingProductForRecipe: this.creatingProductForRecipe,
        //     pendingIngredientName: this.pendingIngredientName,
        //     selectedProduct: { name: product.name, id: product.id }
        // });
        
        // Focus on quantity field for smooth workflow
        setTimeout(() => {
            if (this.ingredientQuantity) {
                this.ingredientQuantity.focus();
            }
        }, 100);
    }


    // Meal Planning Methods
    loadMealPlans() {
        try {
            return JSON.parse(localStorage.getItem('mealPlans') || '{}');
        } catch (e) {
            console.error('Error loading meal plans:', e);
            return {};
        }
    }

    saveMealPlans() {
        localStorage.setItem('mealPlans', JSON.stringify(this.mealPlans));
    }

    getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        // Saturday = 6, so we want to find the most recent Saturday
        // If today is Saturday (6), diff = 0. Otherwise, go back to previous Saturday
        const diff = d.getDate() - ((day + 1) % 7); // Saturday = 0 in our system
        return new Date(d.setDate(diff));
    }

    getWeekKey(weekStart) {
        return weekStart.toISOString().split('T')[0]; // YYYY-MM-DD format
    }

    navigateWeek(direction) {
        const newWeekStart = new Date(this.currentWeekStart);
        newWeekStart.setDate(newWeekStart.getDate() + (direction * 7));
        this.currentWeekStart = newWeekStart;
        this.renderMealCalendar();
    }

    async clearCurrentWeek() {
        if (confirm('Are you sure you want to clear all meals for this week?')) {
            const weekKey = this.getWeekKey(this.currentWeekStart);
            // console.log('🗑️ Clearing week:', weekKey);
            
            delete this.mealPlans[weekKey];
            this.saveMealPlans();
            
            // Sync deletion to Firebase - delegated to Firebase Sync Manager
            if (this.firebaseSyncManager) {
                await this.firebaseSyncManager.syncMealPlanDeletion(weekKey);
            }
            
            this.renderMealCalendar();
        }
    }

    assignMealToSlot(dayIndex, mealType) {
        // Store context for modal handlers
        this.currentMealAssignment = { dayIndex, mealType };
        
        // Create a beautiful meal type selection modal (improved version of the old prompt)
        const mealTypeModal = document.createElement('div');
        mealTypeModal.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.7); z-index: 999999; display: flex; align-items: center; justify-content: center;">
                <div style="background: white; padding: 30px; border-radius: 10px; min-width: 400px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                    <h3 style="margin-top: 0; color: #333;">Choose meal type for ${mealType}</h3>
                    
                    <div style="display: flex; gap: 20px; justify-content: center; margin: 30px 0;">
                        <button onclick="window.assignMealType(1)" style="padding: 20px; border: 2px solid #3498db; background: #3498db; color: white; border-radius: 10px; cursor: pointer; min-width: 120px; transition: all 0.2s;">
                            <div style="font-size: 24px; margin-bottom: 10px;">🍳</div>
                            <div style="font-weight: bold; margin-bottom: 5px;">Recipe</div>
                            <div style="font-size: 12px; opacity: 0.8;">Full recipe with instructions</div>
                        </button>
                        
                        <button onclick="window.assignMealType(2)" style="padding: 20px; border: 2px solid #e67e22; background: #e67e22; color: white; border-radius: 10px; cursor: pointer; min-width: 120px; transition: all 0.2s;">
                            <div style="font-size: 24px; margin-bottom: 10px;">🥘</div>
                            <div style="font-weight: bold; margin-bottom: 5px;">Simple Meal</div>
                            <div style="font-size: 12px; opacity: 0.8;">Combine individual products</div>
                        </button>
                    </div>
                    
                    <button onclick="window.assignMealType(null)" style="padding: 10px 20px; border: 1px solid #95a5a6; background: #ecf0f1; color: #7f8c8d; border-radius: 5px; cursor: pointer;">Cancel</button>
                </div>
            </div>
        `;
        
        // Create temporary global function for the modal
        window.assignMealType = (choice) => {
            document.body.removeChild(mealTypeModal);
            delete window.assignMealType;
            
            if (choice === 1) {
                this.assignRecipeToSlot(dayIndex, mealType);
            } else if (choice === 2) {
                this.assignSimpleMealToSlot(dayIndex, mealType);
            }
        };
        
        document.body.appendChild(mealTypeModal);
    }

    handleRecipeSelection() {
        const { dayIndex, mealType } = this.currentMealAssignment;
        this.closeMealTypeModal();
        this.assignRecipeToSlot(dayIndex, mealType);
    }

    handleSimpleMealSelection() {
        const { dayIndex, mealType } = this.currentMealAssignment;
        this.closeMealTypeModal();
        this.assignSimpleMealToSlot(dayIndex, mealType);
    }

    selectRecipeOption() {
        const { dayIndex, mealType } = this.currentMealContext;
        // console.log('🍳 Recipe option selected:', { dayIndex, mealType });
        this.closeMealTypeModal();
        
        // Add a small delay to ensure the previous modal is fully closed
        setTimeout(() => {
            this.assignRecipeToSlot(dayIndex, mealType);
        }, 100);
    }

    selectSimpleMealOption() {
        const { dayIndex, mealType } = this.currentMealContext;
        // console.log('🥘 Simple meal option selected:', { dayIndex, mealType });
        this.closeMealTypeModal();
        
        // Add a small delay to ensure the previous modal is fully closed
        setTimeout(() => {
            this.assignSimpleMealToSlot(dayIndex, mealType);
        }, 100);
    }

    selectTestRecipe(recipeId, recipeName) {
        // console.log('🍳 Recipe selected:', { recipeId, recipeName });
        
        // Find the recipe
        const recipe = this.recipes.find(r => r.id === recipeId);
        if (!recipe) {
            alert('Recipe not found!');
            return;
        }
        
        // Add the recipe to the meal plan
        const { dayIndex, mealType } = this.currentMealSlot;
        const weekKey = this.getWeekKey(this.currentWeekStart);
        
        if (!this.mealPlans[weekKey]) {
            this.mealPlans[weekKey] = {};
        }
        if (!this.mealPlans[weekKey][dayIndex]) {
            this.mealPlans[weekKey][dayIndex] = {};
        }
        
        this.mealPlans[weekKey][dayIndex][mealType] = {
            type: 'recipe',
            recipeId: recipeId,
            name: recipe.name,
            timestamp: new Date().toISOString()
        };
        
        this.saveMealPlans();
        this.renderMealCalendar();
        this.closeTestRecipeModal();
    }

    closeTestRecipeModal() {
        if (this.testRecipeModal) {
            this.testRecipeModal.style.display = 'none';
        }
        this.currentMealSlot = null;
    }

    closeTestModal() {
        if (this.testModal) {
            this.testModal.style.display = 'none';
        }
        this.currentMealContext = null;
    }

    closeMealTypeModal() {
        this.mealTypeSelectionModal.classList.remove('force-show');
        this.currentMealContext = null;
    }

    assignRecipeToSlot(dayIndex, mealType) {
        if (this.recipes.length === 0) {
            alert('No recipes available. Add some recipes first!');
            return;
        }

        // Store context for later use (for simple meal workflow)
        this.currentMealSlot = { dayIndex, mealType };
        this.selectedRecipeId = null;

        if (this.realRecipesManager && this.realRecipesManager.openSelectionModal) {
            this.realRecipesManager.openSelectionModal(dayIndex, mealType);
        }
    }

    assignSimpleMealToSlot(dayIndex, mealType) {
        if (this.allProducts.length === 0) {
            alert('No products available. Add some products first!');
            return;
        }
        
        // Group products by category for easier selection
        const validCategoryIds = new Set(this.categories.map(cat => cat.id));
        const validProducts = this.allProducts.filter(product => validCategoryIds.has(product.category));
        
        if (validProducts.length === 0) {
            alert('No valid products available. Fix orphaned products first!');
            return;
        }
        
        this.openSimpleMealBuilder(dayIndex, mealType);
    }

    openSimpleMealBuilder(dayIndex, mealType) {
        this.currentMealSlot = { dayIndex, mealType };
        this.selectedMealProducts = new Set();
        
        // Create a working simple meal builder modal
        const simpleMealModal = document.createElement('div');
        simpleMealModal.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.7); z-index: 999999; display: flex; align-items: center; justify-content: center;">
                <div style="background: white; padding: 30px; border-radius: 10px; width: 700px; max-height: 80vh; overflow-y: auto; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h3 style="margin: 0; color: #333;">Build Simple Meal for ${mealType}</h3>
                        <button id="closeSimpleMealBuilder" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666; padding: 5px;">&times;</button>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 10px; font-weight: bold;">Meal Name (optional):</label>
                        <input type="text" id="workingSimpleMealName" placeholder="e.g., Chicken & Rice" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; box-sizing: border-box;" maxlength="50">
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 10px; font-weight: bold;">Search Products:</label>
                        <div style="display: flex; gap: 10px;">
                            <input type="text" id="workingSimpleMealSearch" placeholder="Search products..." style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 5px; box-sizing: border-box;">
                            <button id="clearSimpleMealSearch" style="padding: 10px 15px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer;">Clear</button>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 10px; font-weight: bold;">Selected Products:</label>
                        <div id="workingSelectedProducts" style="min-height: 50px; padding: 10px; border: 2px dashed #ddd; border-radius: 5px; background: #f8f9fa;">
                            <em style="color: #666;">No products selected yet</em>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 10px; font-weight: bold;">Available Products by Category:</label>
                        <div id="workingProductCategories" style="max-height: 300px; overflow-y: auto; border: 1px solid #ddd; border-radius: 5px; background: white;">
                            ${this.generateProductCategoriesHTML()}
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button id="cancelSimpleMeal" style="padding: 10px 20px; border: 1px solid #95a5a6; background: #ecf0f1; color: #7f8c8d; border-radius: 5px; cursor: pointer;">Cancel</button>
                        <button id="saveSimpleMeal" style="padding: 10px 20px; border: none; background: #28a745; color: white; border-radius: 5px; cursor: pointer;" disabled>Save Simple Meal</button>
                    </div>
                </div>
            </div>
        `;
        
        // Update selected products display
        const updateSelectedDisplay = () => {
            // console.log('🔄 updateSelectedDisplay called');
            // console.log('🔄 Selected products:', Array.from(this.selectedMealProducts));
            
            const container = simpleMealModal.querySelector('#workingSelectedProducts');
            const saveBtn = simpleMealModal.querySelector('#saveSimpleMeal');
            
            // console.log('🔄 Container found:', !!container);
            // console.log('🔄 Save button found:', !!saveBtn);
            
            if (this.selectedMealProducts.size === 0) {
                // console.log('🔄 No products selected - showing empty state');
                container.innerHTML = '<em style="color: #666;">No products selected yet</em>';
                saveBtn.disabled = true;
                saveBtn.style.background = '#6c757d';
            } else {
                // console.log('🔄 Products selected - showing product list');
                const selectedArray = Array.from(this.selectedMealProducts);
                // console.log('🔄 Selected array length:', selectedArray.length);
                
                const productNames = selectedArray.map(productId => {
                    const product = this.allProducts.find(p => p.id === productId);
                    // console.log(`🔄 Product ID ${productId} -> Product:`, product ? product.name : 'NOT FOUND');
                    return product ? `
                        <span style="display: inline-block; background: #007bff; color: white; padding: 5px 10px; margin: 2px; border-radius: 15px; font-size: 14px;">
                            ${product.name} 
                            <button onclick="window.removeSimpleMealProduct(${productId})" style="background: none; border: none; color: white; margin-left: 5px; cursor: pointer; font-size: 16px;">×</button>
                        </span>
                    ` : '';
                }).filter(html => html !== '').join('');
                
                // console.log('🔄 Generated HTML length:', productNames.length);
                container.innerHTML = productNames;
                saveBtn.disabled = false;
                saveBtn.style.background = '#28a745';
                // console.log('🔄 Container updated successfully');
            }
        };
        
        // Add product selection functionality
        simpleMealModal.addEventListener('click', (e) => {
            // console.log('🥘 Click detected:', e.target);
            // console.log('🥘 Target classes:', e.target.className);
            // console.log('🥘 Has working-product-item:', e.target.classList.contains('working-product-item'));
            
            // Check if clicked element or its parent is a product item
            const productItem = e.target.closest('.working-product-item');
            if (productItem) {
                // console.log('🥘 Product item found:', productItem.dataset.productId);
                // console.log('🥘 Raw dataset productId:', productItem.dataset.productId);
                
                const rawId = productItem.dataset.productId;
                const productId = parseFloat(rawId); // Use parseFloat instead of parseInt for decimal IDs
                // console.log('🥘 Current selected products before:', Array.from(this.selectedMealProducts));
                // console.log('🥘 Product ID type:', typeof productId, 'Value:', productId);
                // console.log('🥘 Raw vs Parsed:', rawId, '->', productId);
                // console.log('🥘 Has product?', this.selectedMealProducts.has(productId));
                
                if (this.selectedMealProducts.has(productId)) {
                    // console.log('🥘 Deselecting product:', productId);
                    this.selectedMealProducts.delete(productId);
                    productItem.style.background = '#f8f9fa';
                    productItem.style.borderColor = '#ddd';
                } else {
                    // console.log('🥘 Selecting product:', productId);
                    this.selectedMealProducts.add(productId);
                    productItem.style.background = '#e3f2fd';
                    productItem.style.borderColor = '#2196f3';
                }
                
                // console.log('🥘 Current selected products after:', Array.from(this.selectedMealProducts));
                // console.log('🥘 Set size:', this.selectedMealProducts.size);
                // console.log('🥘 About to call updateSelectedDisplay...');
                updateSelectedDisplay();
            } else {
                // console.log('🥘 No product item found');
            }
        });
        
        // Search functionality
        const searchInput = simpleMealModal.querySelector('#workingSimpleMealSearch');
        searchInput.oninput = (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const productItems = simpleMealModal.querySelectorAll('.working-product-item');
            productItems.forEach(item => {
                const productName = item.dataset.productName.toLowerCase();
                const categoryName = item.dataset.categoryName.toLowerCase();
                const isVisible = productName.includes(searchTerm) || categoryName.includes(searchTerm);
                item.style.display = isVisible ? 'block' : 'none';
            });
        };
        
        // Global function for removing products
        window.removeSimpleMealProduct = (productId) => {
            this.selectedMealProducts.delete(productId);
            // Update visual state of product item
            const productItem = simpleMealModal.querySelector(`[data-product-id="${productId}"]`);
            if (productItem) {
                productItem.style.background = '#f8f9fa';
                productItem.style.borderColor = '#ddd';
            }
            updateSelectedDisplay();
        };
        
        // Event listeners
        simpleMealModal.querySelector('#closeSimpleMealBuilder').onclick = () => {
            delete window.removeSimpleMealProduct;
            document.body.removeChild(simpleMealModal);
        };
        
        simpleMealModal.querySelector('#cancelSimpleMeal').onclick = () => {
            delete window.removeSimpleMealProduct;
            document.body.removeChild(simpleMealModal);
        };
        
        simpleMealModal.querySelector('#clearSimpleMealSearch').onclick = () => {
            searchInput.value = '';
            searchInput.oninput({ target: { value: '' } });
        };
        
        simpleMealModal.querySelector('#saveSimpleMeal').onclick = () => {
            // console.log('💾 Save button clicked');
            // console.log('💾 Selected products count:', this.selectedMealProducts.size);
            // console.log('💾 Selected products:', Array.from(this.selectedMealProducts));
            
            if (this.selectedMealProducts.size > 0) {
                const mealName = simpleMealModal.querySelector('#workingSimpleMealName').value || this.generateMealName();
                // console.log('💾 Generated meal name:', mealName);
                
                const mealData = {
                    type: 'simple',
                    name: mealName,
                    products: Array.from(this.selectedMealProducts)
                };
                
                // console.log('💾 Meal data to save:', mealData);
                // console.log('💾 Saving to dayIndex:', dayIndex, 'mealType:', mealType);
                
                this.setMeal(dayIndex, mealType, mealData);
                
                delete window.removeSimpleMealProduct;
                document.body.removeChild(simpleMealModal);
                
                // console.log('💾 Simple meal saved successfully!');
                alert(`✅ Simple meal "${mealName}" saved for ${mealType}!`);
            } else {
                // console.log('💾 No products selected - showing alert');
                alert('Please select at least one product for the meal.');
            }
        };
        
        // Click outside to close
        simpleMealModal.onclick = (e) => {
            if (e.target === simpleMealModal) {
                delete window.removeSimpleMealProduct;
                document.body.removeChild(simpleMealModal);
            }
        };
        
        document.body.appendChild(simpleMealModal);
        updateSelectedDisplay();
        
        // console.log('✅ Working simple meal builder created');
    }

    generateProductCategoriesHTML() {
        const validCategoryIds = new Set(this.categories.map(cat => cat.id));
        const validProducts = this.allProducts.filter(product => validCategoryIds.has(product.category));
        
        // console.log('🥘 Generating products HTML:', validProducts.length, 'valid products');
        
        // Group products by category
        const productsByCategory = {};
        validProducts.forEach(product => {
            if (!productsByCategory[product.category]) {
                productsByCategory[product.category] = [];
            }
            productsByCategory[product.category].push(product);
        });
        
        // Generate HTML for each category
        const html = this.categories.map(category => {
            const categoryProducts = productsByCategory[category.id] || [];
            if (categoryProducts.length === 0) return '';
            
            // console.log(`🥘 Category ${category.name}:`, categoryProducts.length, 'products');
            
            const productsHTML = categoryProducts.map(product => `
                <div class="working-product-item" 
                     data-product-id="${product.id}" 
                     data-product-name="${product.name}"
                     data-category-name="${category.name}"
                     style="padding: 10px; margin: 5px; border: 1px solid #ddd; border-radius: 5px; cursor: pointer; background: #f8f9fa; transition: all 0.2s;">
                    <strong>${product.name}</strong>
                    ${product.inStock ? '<span style="color: #28a745; margin-left: 10px;">✓ In Stock</span>' : '<span style="color: #dc3545; margin-left: 10px;">✗ Out of Stock</span>'}
                </div>
            `).join('');
            
            return `
                <div style="margin-bottom: 20px;">
                    <h4 style="margin: 0 0 10px 0; padding: 10px; background: #f8f9fa; border-radius: 5px; color: #495057;">${category.emoji} ${category.name.charAt(0).toUpperCase() + category.name.slice(1)}</h4>
                    <div>${productsHTML}</div>
                </div>
            `;
        }).join('');
        
        // console.log('🥘 Generated HTML length:', html.length);
        return html;
    }

    generateMealName() {
        const selectedProductsArray = Array.from(this.selectedMealProducts);
        const productNames = selectedProductsArray.slice(0, 3).map(productId => {
            const product = this.allProducts.find(p => p.id === productId);
            return product ? product.name : '';
        }).filter(name => name);
        
        let mealName = productNames.join(' & ');
        if (selectedProductsArray.length > 3) {
            mealName += ' + more';
        }
        
        return mealName || 'Simple Meal';
    }

    closeSimpleMealModal() {
        this.simpleMealModal.style.display = 'none';
        this.simpleMealModal.classList.remove('force-show');
        this.currentMealSlot = null;
        this.selectedMealProducts = new Set();
    }

    renderProductCategories(searchTerm = '') {
        if (!this.simpleMealCategories) return;
        
        const validCategoryIds = new Set(this.categories.map(cat => cat.id));
        let validProducts = this.allProducts.filter(product => validCategoryIds.has(product.category));
        
        // Apply search filter if provided
        if (searchTerm) {
            const lowerSearchTerm = searchTerm.toLowerCase();
            validProducts = validProducts.filter(product =>
                product.name.toLowerCase().includes(lowerSearchTerm)
            );
        }
        
        // Group products by category using shopping list module utilities
        const groupedProducts = window.realShoppingListManager && window.realShoppingListManager.groupItemsByCategory
            ? window.realShoppingListManager.groupItemsByCategory(validProducts)
            : {};
        const categoryOrder = this.getCategoryOrder();
        
        let html = '';
        categoryOrder.forEach(categoryKey => {
            const products = groupedProducts[categoryKey];
            if (products && products.length > 0) {
                const categoryData = this.categories.find(cat => cat.id === categoryKey);
                const categoryName = categoryData ? categoryData.name.charAt(0).toUpperCase() + categoryData.name.slice(1) : categoryKey;
                const categoryEmoji = categoryData ? categoryData.emoji : '📦';
                
                html += `
                    <div class="category-group">
                        <div class="category-group-header">
                            <span>${categoryEmoji}</span>
                            <span>${categoryName}</span>
                        </div>
                        <div class="category-products">
                            ${products.map(product => `
                                <label class="product-checkbox">
                                    <input type="checkbox" 
                                           value="${product.id}" 
                                           ${this.selectedMealProducts.has(product.id) ? 'checked' : ''}
                                           onchange="window.app.toggleProductSelection(${product.id}, this.checked)">
                                    <span>${product.name}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                `;
            }
        });
        
        if (html === '' && searchTerm) {
            html = `<div class="no-products-found">
                <p>No products found for "${this.escapeHtml(searchTerm)}"</p>
                <p style="font-size: 12px; color: #a0aec0;">Try a different search term or clear the search to see all products.</p>
            </div>`;
        }
        
        this.simpleMealCategories.innerHTML = html;
    }

    toggleProductSelection(productId, isSelected) {
        if (isSelected) {
            this.selectedMealProducts.add(productId);
        } else {
            this.selectedMealProducts.delete(productId);
        }
        this.updateSelectedProductsDisplay();
    }

    updateSelectedProductsDisplay() {
        if (!this.selectedProducts) return;
        
        if (this.selectedMealProducts.size === 0) {
            this.selectedProducts.innerHTML = '<div class="empty-selection">No products selected</div>';
            return;
        }
        
        const selectedProductsArray = Array.from(this.selectedMealProducts);
        const html = selectedProductsArray.map(productId => {
            const product = this.allProducts.find(p => p.id === productId);
            if (!product) return '';
            
            return `
                <div class="selected-product-item">
                    <span>${product.name}</span>
                    <button class="remove-selected-product" onclick="window.app.removeProductFromSelection(${productId})">×</button>
                </div>
            `;
        }).join('');
        
        this.selectedProducts.innerHTML = html;
    }

    removeProductFromSelection(productId) {
        this.selectedMealProducts.delete(productId);
        this.renderProductCategories(this.simpleMealSearch.value.trim()); // Re-render to uncheck the checkbox
        this.updateSelectedProductsDisplay();
    }

    filterSimpleMealProducts() {
        const searchTerm = this.simpleMealSearch.value.trim();
        this.renderProductCategories(searchTerm);
    }

    clearSimpleMealSearch() {
        this.simpleMealSearch.value = '';
        this.renderProductCategories();
        this.simpleMealSearch.focus();
    }

    saveSimpleMeal() {
        if (this.selectedMealProducts.size === 0) {
            alert('Please select at least one product for the meal.');
            return;
        }
        
        const mealName = this.simpleMealName.value.trim() || this.generateMealName();
        const selectedProductsArray = Array.from(this.selectedMealProducts);
        
        const simpleMeal = {
            type: 'simple',
            name: mealName,
            products: selectedProductsArray
        };
        
        this.setMeal(this.currentMealSlot.dayIndex, this.currentMealSlot.mealType, simpleMeal);
        this.closeSimpleMealModal();
    }

    generateMealName() {
        const selectedProductsArray = Array.from(this.selectedMealProducts);
        const productNames = selectedProductsArray.slice(0, 3).map(productId => {
            const product = this.allProducts.find(p => p.id === productId);
            return product ? product.name : '';
        }).filter(name => name);
        
        let mealName = productNames.join(' & ');
        if (selectedProductsArray.length > 3) {
            mealName += ' + more';
        }
        
        return mealName || 'Simple Meal';
    }

    // Recipe Selection Modal Methods
    openRecipeSelectionModal() {
        if (this.currentMealSlot && this.realRecipesManager && this.realRecipesManager.openSelectionModal) {
            const { dayIndex, mealType } = this.currentMealSlot;
            this.realRecipesManager.openSelectionModal(dayIndex, mealType);
        }
    }
    planRecipe(recipeId) {
        if (this.realRecipesManager && this.realRecipesManager.planRecipe) {
            return this.realRecipesManager.planRecipe(recipeId);
        }
    }

    getDayIndexFromDate(date) {
        // Return day of week (0 = Sunday, 1 = Monday, etc.)
        return date.getDay();
    }

    getWeekStartFromDate(date) {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay()); // Go to Sunday
        weekStart.setHours(0, 0, 0, 0);
        return weekStart;
    }

    // Shopping List Generation Modal Methods (delegated to menu-real.js)
    openShoppingListModal() {
        // Delegate to menu manager if available
        if (window.realMenuManager && typeof window.realMenuManager.openShoppingListModal === 'function') {
            return window.realMenuManager.openShoppingListModal();
        }
        console.warn('⚠️ Menu manager not available - modal functionality delegated');
    }

    closeShoppingListModal() {
        // Delegate to menu manager if available
        if (window.realMenuManager && typeof window.realMenuManager.closeShoppingListModal === 'function') {
            return window.realMenuManager.closeShoppingListModal();
        }
        console.warn('⚠️ Menu manager not available - modal functionality delegated');
    }

    updateShoppingPreview() {
        const selectedTimeRange = document.querySelector('input[name="timeRange"]:checked');
        if (!selectedTimeRange) return;

        const timeRange = selectedTimeRange.value;
        const { meals, ingredientsCount } = this.getMealsForTimeRange(timeRange);

        // Update meals summary
        if (meals.length === 0) {
            this.mealsSummary.innerHTML = '<div style="color: #64748b; font-style: italic;">No meals planned for selected time range</div>';
            this.ingredientsCount.innerHTML = '<div style="color: #64748b;">0 ingredients to add</div>';
        } else {
            const mealsList = meals.map(meal => 
                `<div class="meals-summary-item">${meal.day} ${meal.mealType}: ${meal.name}</div>`
            ).join('');
            
            this.mealsSummary.innerHTML = mealsList;
            this.ingredientsCount.innerHTML = `<div style="color: #0f172a; font-weight: 600;">${ingredientsCount} unique ingredients to add</div>`;
        }
    }

    getMealsForTimeRange(timeRange) {
        const currentWeekKey = this.getWeekKey(this.currentWeekStart);
        const currentWeekMeals = this.mealPlans[currentWeekKey] || {};
        
        const now = new Date();
        const today = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const currentHour = now.getHours();
        
        // Determine current meal time (rough estimates)
        let currentMealIndex = 0; // 0 = breakfast, 1 = lunch, 2 = dinner
        if (currentHour >= 11 && currentHour < 17) currentMealIndex = 1; // lunch time
        else if (currentHour >= 17) currentMealIndex = 2; // dinner time
        
        const mealTypes = ['breakfast', 'lunch', 'dinner'];
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        let meals = [];
        let allIngredients = [];

        // Process each day
        for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
            const dayMeals = currentWeekMeals[dayIndex] || {};
            
            // Process each meal type
            mealTypes.forEach((mealType, mealIndex) => {
                const mealData = dayMeals[mealType];
                if (!mealData) return;

                // Apply time filtering
                let shouldInclude = false;
                
                if (timeRange === 'all') {
                    shouldInclude = true;
                } else if (timeRange === 'future') {
                    // Only future days
                    shouldInclude = dayIndex > today;
                } else if (timeRange === 'todayFuture') {
                    // Today's remaining meals + future days
                    if (dayIndex > today) {
                        shouldInclude = true;
                    } else if (dayIndex === today) {
                        shouldInclude = mealIndex > currentMealIndex;
                    }
                }

                if (!shouldInclude) return;

                // Extract meal info and ingredients
                const mealInfo = this.extractMealInfo(mealData);
                if (mealInfo) {
                    meals.push({
                        day: dayNames[dayIndex],
                        mealType: mealType,
                        name: mealInfo.name
                    });
                    
                    if (mealInfo.ingredients) {
                        allIngredients = allIngredients.concat(mealInfo.ingredients);
                    }
                }
            });
        }

        // Count unique ingredients
        const uniqueProductIds = new Set();
        allIngredients.forEach(ingredient => {
            if (ingredient.productId) {
                uniqueProductIds.add(ingredient.productId);
            }
        });

        return {
            meals,
            ingredientsCount: uniqueProductIds.size,
            ingredients: allIngredients
        };
    }

    extractMealInfo(mealData) {
        if (typeof mealData === 'object' && mealData.type) {
            if (mealData.type === 'recipe') {
                const recipe = this.recipes.find(r => r.id === mealData.id);
                if (recipe) {
                    return {
                        name: recipe.name,
                        ingredients: recipe.ingredients || []
                    };
                }
            } else if (mealData.type === 'simple') {
                const simpleIngredients = mealData.products.map(productId => ({
                    productId: productId,
                    quantity: 1,
                    unit: 'portion'
                }));
                return {
                    name: mealData.name || 'Simple Meal',
                    ingredients: simpleIngredients
                };
            }
        } else if (typeof mealData === 'number') {
            // Legacy format - recipe ID
            const recipe = this.recipes.find(r => r.id === mealData);
            if (recipe) {
                return {
                    name: recipe.name,
                    ingredients: recipe.ingredients || []
                };
            }
        }
        return null;
    }

    confirmShoppingListGeneration() {
        const selectedTimeRange = document.querySelector('input[name="timeRange"]:checked');
        if (!selectedTimeRange) return;

        const timeRange = selectedTimeRange.value;
        const { meals, ingredients } = this.getMealsForTimeRange(timeRange);

        if (ingredients.length === 0) {
            alert('No meals found for the selected time range.');
            return;
        }

        // Add unique ingredients to shopping list
        const addedProducts = new Set();
        ingredients.forEach(ingredient => {
            if (!addedProducts.has(ingredient.productId)) {
                const product = this.allProducts.find(p => p.id === ingredient.productId);
                if (product && !product.inShopping) {
                    product.inShopping = true;
                    product.completed = false;
                    addedProducts.add(ingredient.productId);
                }
            }
        });

        if (addedProducts.size > 0) {
            this.productsManager.saveAllProducts();
            this.syncListsFromProducts();
            
            // Create time range description
            let timeDescription = '';
            if (timeRange === 'future') {
                timeDescription = 'future meals';
            } else if (timeRange === 'todayFuture') {
                timeDescription = "today's remaining meals and future meals";
            } else {
                timeDescription = 'all planned meals this week';
            }
            
            alert(`✅ Added ${addedProducts.size} ingredients from ${timeDescription} to your shopping list!`);
            this.render();
        } else {
            alert('No new ingredients to add. All meal ingredients are already in your shopping list.');
        }

        this.closeShoppingListModal();
    }

    showMealDetails(dayIndex, mealType, mealData) {
        if (!mealData) return;

        if (typeof mealData === 'object' && mealData.type) {
            if (mealData.type === 'recipe') {
                const recipe = this.recipes.find(r => r.id === mealData.id);
                if (recipe) {
                    this.editRecipe(recipe.id);
                }
            } else if (mealData.type === 'simple') {
                // For simple meals, show an alert with the meal details
                const productNames = mealData.products.map(productId => {
                    const product = this.allProducts.find(p => p.id === productId);
                    return product ? product.name : 'Unknown Product';
                }).join(', ');
                
                alert(`Simple Meal: ${mealData.name || 'Unnamed'}\n\nProducts: ${productNames}`);
            }
        } else if (typeof mealData === 'number') {
            // Legacy format - recipe ID
            const recipe = this.recipes.find(r => r.id === mealData);
            if (recipe) {
                this.editRecipe(recipe.id);
            }
        }
    }

    setMeal(dayIndex, mealType, mealData) {
        console.log('💾 setMeal called with:', { dayIndex, mealType, mealData });
        
        const weekKey = this.getWeekKey(this.currentWeekStart);
        console.log('💾 weekKey:', weekKey);
        console.log('💾 currentWeekStart:', this.currentWeekStart);
        
        if (!this.mealPlans[weekKey]) {
            console.log('💾 Creating new week in mealPlans');
            this.mealPlans[weekKey] = {};
        }
        
        if (!this.mealPlans[weekKey][dayIndex]) {
            console.log('💾 Creating new day in mealPlans');
            this.mealPlans[weekKey][dayIndex] = {};
        }
        
        console.log('💾 Before setting meal:', this.mealPlans[weekKey][dayIndex]);
        this.mealPlans[weekKey][dayIndex][mealType] = mealData;
        console.log('💾 After setting meal:', this.mealPlans[weekKey][dayIndex]);
        
        console.log('💾 Saving meal plans...');
        this.saveMealPlans();
        console.log('💾 Rendering meal calendar...');
        this.renderMealCalendar();
        console.log('💾 setMeal completed');
    }

    removeMeal(dayIndex, mealType) {
        const weekKey = this.getWeekKey(this.currentWeekStart);
        
        if (this.mealPlans[weekKey] && this.mealPlans[weekKey][dayIndex]) {
            delete this.mealPlans[weekKey][dayIndex][mealType];
            
            // Clean up empty objects
            if (Object.keys(this.mealPlans[weekKey][dayIndex]).length === 0) {
                delete this.mealPlans[weekKey][dayIndex];
            }
            if (Object.keys(this.mealPlans[weekKey]).length === 0) {
                delete this.mealPlans[weekKey];
            }
            
            this.saveMealPlans();
            this.renderMealCalendar();
        }
    }

    updateWelcomeStats() {
        // No stats needed for family use - welcome screen is now purely navigational
    }

    switchTab(tabName) {
        // Update welcome screen stats when switching to welcome tab
        if (tabName === 'welcome') {
            this.updateWelcomeStats();
        }
        
        // Delegate to real menu manager if available
        if (this.realMenuManager) {
            const success = this.realMenuManager.switchTab(tabName);
            if (success) {
                this.currentTab = this.realMenuManager.getCurrentTab();
                
                // Handle specific tab requirements
                if (tabName === 'categories' || tabName === 'products') {
                    window.realProductsCategoriesManager.updateCategorySelects();
                }
                
                // Firebase simulator code - MOVED TO FIREBASE SYNC MANAGER
                
                return success;
            }
        }
        
        // Fallback to legacy menu system
        this.currentTab = tabName;
        
        // Update tab buttons
        this.tabButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update tab content
        this.tabContents.forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });

        if (tabName === 'categories') {
            window.realProductsCategoriesManager.updateCategorySelects();
        }

        if (tabName === 'products') {
            window.realProductsCategoriesManager.updateCategorySelects();
        }

        this.render();
        return true;
    }

    // Shopping List Methods (using real independent module)
    toggleShoppingItemComplete(itemId) {
        console.log(`🔄 Toggle shopping item complete: ${itemId}`);
        
        // Check if shopping list module is initialized
        if (!this.shoppingList) {
            console.error('❌ Shopping list module not initialized');
            return;
        }
        
        // Toggle in the real shopping list module
        const toggledItem = this.shoppingList.toggleItem(itemId);
        if (!toggledItem) {
            console.error(`❌ Failed to toggle item ${itemId} in shopping list`);
            return;
        }
        
        console.log(`✅ Toggled item "${toggledItem.name}" completion: ${toggledItem.completed}`);
        
        // Update the corresponding product in allProducts
        const product = this.allProducts.find(p => 
            p.name.toLowerCase() === toggledItem.name.toLowerCase() && 
            p.category === toggledItem.category
        );
        
        if (product) {
            product.completed = toggledItem.completed;
            console.log(`🔄 Updated master product "${product.name}" completed: ${product.completed}`);
            
            // Save products to localStorage
            if (this.productsManager && this.productsManager.saveAllProducts) {
                this.productsManager.saveAllProducts();
            }
        } else {
            console.warn(`⚠️ Could not find master product for "${toggledItem.name}"`);
        }
        
        // Re-render the UI
        this.render();
        
        return toggledItem;
    }



    // Firebase delegation methods - MOVED TO FIREBASE SYNC MANAGER

    // markAsInStock() - REMOVED: Individual stock marking replaced with bulk sync on Clear Completed
    // Items from pantry now automatically sync back to "in stock" when clearing completed items


    // Standard Items (Pantry) Methods - NOW HANDLED BY REAL PANTRY MODULE
    // These methods have been moved to RealPantryManager - use window.realPantryManager directly
    
    // handleAddStandardItem - REMOVED: Now handled directly in event listeners

    // toggleStandardItemSeason() - REMOVED: Now handled by real pantry manager
    // HTML onclick handlers should call window.realPantryManager.toggleSeasonStatus() directly

    // deleteStandardItem - NOW HANDLED BY REAL PANTRY MODULE

    // addToShoppingFromStandard() - REMOVED: Now handled by real pantry manager
    // HTML onclick handlers should call window.realPantryManager.addToShoppingList() directly

    // REMOVED: removeFromShoppingIfExists - functionality moved to pantry-manager-real.js

    addAllUnstockedToShopping() {
        // Delegate to shopping list module
        if (window.realShoppingListManager && window.realShoppingListManager.addAllUnstockedToShopping) {
            return window.realShoppingListManager.addAllUnstockedToShopping();
        } else {
            console.error('❌ Shopping list module not available');
        }
    }

    // Rendering Methods
    render() {
        if (this.currentTab === 'shopping') {
            this.renderShoppingList();
        } else if (this.currentTab === 'pantry') {
            // Pantry rendering now handled by real pantry manager
            if (window.realPantryManager) {
                window.realPantryManager.refreshDisplay();
            }
        } else if (this.currentTab === 'products') {
            this.renderProductsList();
        } else if (this.currentTab === 'recipes') {
            this.renderRecipes();
        } else if (this.currentTab === 'meals') {
            this.renderMealCalendar();
        } else if (this.currentTab === 'categories') {
            this.renderCategoriesList();
        } else if (this.currentTab === 'sync') {
            // Sync tab doesn't need dynamic rendering
        }
    }

    renderShoppingList() {
        if (window.realShoppingListManager && window.realShoppingListManager.renderShoppingList) {
            window.realShoppingListManager.renderShoppingList();
        } else {
            console.warn('⚠️ Shopping list module not available');
        }
    }

    // renderStandardList() - REMOVED: Pantry rendering now handled by real pantry manager

    renderCategoriesList() {
        // Sync data from categories module if available
        if (window.realProductsCategoriesManager) {
            // v6.0.0 UNIFIED: Categories accessed via getter - no assignment needed
            console.log(`🔄 Synced ${this.categories.length} categories from module`);
        }
        
        // Check and re-initialize DOM element if needed
        if (!this.categoriesList) {
            console.warn('⚠️ categoriesList element not found, re-initializing elements...');
            this.categoriesList = document.getElementById('categoriesList');
            if (!this.categoriesList) {
                console.error('❌ categoriesList element still not found in DOM');
                return;
            }
        }
        
        const sortedCategories = [...this.categories].sort((a, b) => a.order - b.order);
        
        if (sortedCategories.length === 0) {
            this.categoriesList.innerHTML = `
                <div class="empty-state">
                    <span class="emoji">⚙️</span>
                    <p>No categories found</p>
                </div>
            `;
            return;
        }

        if (!this.categoriesList) {
            console.warn('⚠️ categoriesList element not found at render time, re-initializing...');
            this.categoriesList = document.getElementById('categoriesList');
            if (!this.categoriesList) {
                console.error('❌ categoriesList element still not found in DOM at render time');
                return;
            }
        }
        
        this.categoriesList.innerHTML = sortedCategories.map((category, index) => `
            <div class="category-item" data-category-id="${category.id}" data-index="${index}">
                <div class="category-drag-handle">⋮⋮</div>
                <div class="category-info">
                    <div class="category-emoji" onclick="window.app.editCategoryEmoji('${category.id}')" style="cursor: pointer;" title="Click to change emoticon">${category.emoji}</div>
                    <div class="category-name" onclick="window.app.editCategory('${category.id}')" style="cursor: pointer;" title="Click to edit category">${category.name.charAt(0).toUpperCase() + category.name.slice(1)}</div>
                </div>
                <div class="category-actions">
                    <button class="edit-category-btn" onclick="window.app.editCategory('${category.id}')" title="Edit category">✏️</button>
                    <button class="delete-btn" onclick="window.app.deleteCategory('${category.id}')" title="Delete category">×</button>
                </div>
            </div>
        `).join('');

        // Add drag and drop functionality
        this.initializeDragAndDrop();
    }

    initializeDragAndDrop() {
        const categoryItems = this.categoriesList.querySelectorAll('.category-item');
        console.log(`🔧 DEBUG: Initializing drag and drop for ${categoryItems.length} category items`);
        
        categoryItems.forEach((item, index) => {
            item.draggable = true;
            
            item.addEventListener('dragstart', (e) => {
                item.classList.add('dragging');
                e.dataTransfer.setData('text/plain', index);
            });
            
            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
            });
            
            item.addEventListener('dragover', (e) => {
                e.preventDefault();
            });
            
            item.addEventListener('drop', (e) => {
                e.preventDefault();
                const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                const toIndex = parseInt(item.dataset.index);
                
                if (fromIndex !== toIndex) {
                    this.moveCategory(fromIndex, toIndex);
                }
            });
        });
    }

    // renderStandardCategorySection() - REMOVED: Now handled by real pantry manager

    // renderStandardItem() - REMOVED: Now handled by real pantry manager


    renderBoughtSection(items) {
        return `
            <div class="bought-section">
                <div class="bought-header">
                    <span class="bought-title">✅ Bought</span>
                    <span class="bought-count">${items.length}</span>
                </div>
                <div class="bought-items">
                    ${items.map(item => this.renderShoppingItem(item, true)).join('')}
                </div>
            </div>
        `;
    }

    // renderOutOfSeasonSection() - REMOVED: Now handled by real pantry manager

    renderOrphanedProducts() {
        const orphanedProducts = this.findOrphanedProducts();
        
        if (!this.orphanedProductsSection || !this.orphanedProductsList) {
            return;
        }
        
        if (orphanedProducts.length === 0) {
            this.orphanedProductsSection.style.display = 'none';
            return;
        }
        
        console.log(`🚨 Found ${orphanedProducts.length} orphaned products`);
        this.orphanedProductsSection.style.display = 'block';
        
        const categoryOptions = [...this.categories]
            .sort((a, b) => a.order - b.order)
            .map(cat => `<option value="${cat.id}">${cat.emoji} ${cat.name.charAt(0).toUpperCase() + cat.name.slice(1)}</option>`)
            .join('');
        
        const orphanedHtml = orphanedProducts.map(product => `
            <div class="orphaned-product-item">
                <div class="orphaned-product-info">
                    <div class="orphaned-product-name">${this.escapeHtml(product.name)}</div>
                    <div class="orphaned-product-category">Invalid category: "${this.escapeHtml(product.category)}"</div>
                </div>
                <div class="orphaned-product-actions">
                    <select class="orphaned-category-select" id="orphanedSelect_${product.id}">
                        <option value="">Choose category...</option>
                        ${categoryOptions}
                    </select>
                    <button class="fix-product-btn" onclick="window.app.fixOrphanedProductFromSelect(${product.id})">Fix</button>
                    <button class="delete-orphaned-btn" onclick="window.app.deleteOrphanedProduct(${product.id})">Delete</button>
                </div>
            </div>
        `).join('');
        
        this.orphanedProductsList.innerHTML = orphanedHtml;
    }

    fixOrphanedProductFromSelect(productId) {
        const selectElement = document.getElementById(`orphanedSelect_${productId}`);
        const newCategoryId = selectElement.value;
        
        if (!newCategoryId) {
            alert('Please select a category first.');
            return;
        }
        
        this.fixOrphanedProduct(productId, newCategoryId);
    }

    renderProductsByCategory(products) {
        // Group products by category. Prefer the shopping list manager's
        // helper if it's available, but fall back to a local implementation
        // so the products tab works even before that module initializes.
        let groupedProducts;
        if (window.realShoppingListManager && typeof window.realShoppingListManager.groupItemsByCategory === 'function') {
            groupedProducts = window.realShoppingListManager.groupItemsByCategory(products);
        } else {
            // Basic grouping by category id
            groupedProducts = products.reduce((groups, product) => {
                (groups[product.category] = groups[product.category] || []).push(product);
                return groups;
            }, {});
        }

        // Within each category, sort products alphabetically by name
        Object.values(groupedProducts).forEach(items => {
            items.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
        });

        let categoryOrder = this.getCategoryOrder();
        if (!categoryOrder || categoryOrder.length === 0) {
            categoryOrder = Object.keys(groupedProducts);
        }

        let html = '';
        categoryOrder.forEach(categoryKey => {
            if (groupedProducts[categoryKey] && groupedProducts[categoryKey].length > 0) {
                html += this.renderProductCategorySection(categoryKey, groupedProducts[categoryKey]);
            }
        });

        return html;
    }

    renderProductsList(forceShowAll = false) {
        console.log('🔧 renderProductsList called');
        console.log('🔧 window.realProductsCategoriesManager exists:', !!window.realProductsCategoriesManager);
        
        // Sync data from products-categories module if available
        if (window.realProductsCategoriesManager) {
            // v6.0.0 UNIFIED: No manual data sync needed - using getters
            // v6.0.0 UNIFIED: Categories accessed via getter - no assignment needed
            console.log(`🔄 Synced ${this.allProducts.length} products and ${this.categories.length} categories from module`);
        } else {
            console.warn('⚠️ Real products manager not available, using existing data');
            console.log('🔧 Current allProducts length:', this.allProducts ? this.allProducts.length : 'undefined');
        }
        
        console.log('🔍 Rendering products list, total products:', this.allProducts.length);
        
        // Performance optimization: limit initial render for large lists
        const INITIAL_RENDER_LIMIT = this.INITIAL_RENDER_LIMIT;
        const shouldLimitRender = !forceShowAll && this.allProducts.length > INITIAL_RENDER_LIMIT;
        
        // First, render orphaned products section
        this.renderOrphanedProducts();
        
        const searchTerm = this.productSearchInput ? this.productSearchInput.value.trim().toLowerCase() : '';
        const stockFilter = this.stockStatusFilter ? this.stockStatusFilter.value : '';
        const categoryFilter = this.categoryFilter ? this.categoryFilter.value : '';
        
        // Update filter button visibility
        this.updateProductFilterButtons();
        
        // Filter out orphaned products from main list - they're shown in the recovery section
        const validCategoryIds = new Set(this.categories.map(cat => cat.id));
        let filteredProducts = this.categories.length > 0
            ? this.allProducts.filter(product => validCategoryIds.has(product.category))
            : [...this.allProducts];

        // Apply stock status filter
        if (stockFilter) {
            filteredProducts = filteredProducts.filter(product => {
                switch (stockFilter) {
                    case 'inStock':
                        return product.inStock === true || product.stock === 'in';
                    case 'outOfStock':
                        return product.inStock === false || product.stock === 'out';
                    case 'inShopping':
                        return product.inShopping === true;
                    default:
                        return true;
                }
            });
        }

        // Apply category filter
        if (categoryFilter) {
            filteredProducts = filteredProducts.filter(product => product.category === categoryFilter);
        }

        // Apply search filter
        if (searchTerm) {
            filteredProducts = filteredProducts.filter(product => {
                // Get the actual category name from the ID
                const category = this.categories.find(cat => cat.id === product.category);
                const categoryName = category ? category.name.toLowerCase() : '';
                
                return product.name.toLowerCase().includes(searchTerm) ||
                       categoryName.includes(searchTerm);
            });
        }

        // Performance optimization: limit rendering for large lists
        let productsToRender = filteredProducts;
        let hasMoreProducts = false;
        
        if (shouldLimitRender && !searchTerm && !stockFilter && !categoryFilter && filteredProducts.length > INITIAL_RENDER_LIMIT) {
            productsToRender = filteredProducts.slice(0, INITIAL_RENDER_LIMIT);
            hasMoreProducts = true;
            console.log(`🚀 Performance mode: Rendering ${INITIAL_RENDER_LIMIT} of ${filteredProducts.length} products`);
        }

        this.updateProductCount(filteredProducts.length, searchTerm || stockFilter || categoryFilter, productsToRender.length);

        if (this.allProducts.length === 0) {
            if (!this.productsList) {
                console.warn('⚠️ productsList element not found, re-initializing elements...');
                this.productsList = document.getElementById('productsList');
                if (!this.productsList) {
                    console.error('❌ productsList element still not found in DOM');
                    return;
                }
            }
            
            this.productsList.innerHTML = `
                <div class="empty-state">
                    <span class="emoji">📋</span>
                    <p>Your products list is empty</p>
                    <p>Add products that you might need for recipes and menus!</p>
                </div>
            `;
            return;
        }

        if (filteredProducts.length === 0) {
            if (!this.productsList) {
                console.warn('⚠️ productsList element not found, re-initializing elements...');
                this.productsList = document.getElementById('productsList');
                if (!this.productsList) {
                    console.error('❌ productsList element still not found in DOM');
                    return;
                }
            }
            
            if (this.productsList) {
                this.productsList.innerHTML = `
                    <div class="empty-state">
                        <span class="emoji">🔍</span>
                        <p>No products found</p>
                        <p>Try a different search term</p>
                    </div>
                `;
            }
            return;
        }

        // Group by season status first, then by category within each season
        const inSeasonProducts = productsToRender.filter(p => p.inSeason !== false);
        const outOfSeasonProducts = productsToRender.filter(p => p.inSeason === false);
        
        let html = '';
        
        // Render in-season products with categories
        if (inSeasonProducts.length > 0) {
            html += `<div class="products-season-group">
                <div class="products-season-header in-season">
                    <span class="season-icon">🌱</span>
                    <span class="season-title">In Season</span>
                    <span class="season-count">(${inSeasonProducts.length})</span>
                </div>
                <div class="products-season-items">
                    ${this.renderProductsByCategory(inSeasonProducts)}
                </div>
            </div>`;
        }
        
        // Render out-of-season products with categories
        if (outOfSeasonProducts.length > 0) {
            html += `<div class="products-season-group">
                <div class="products-season-header out-of-season">
                    <span class="season-icon">❄️</span>
                    <span class="season-title">Out of Season</span>
                    <span class="season-count">(${outOfSeasonProducts.length})</span>
                </div>
                <div class="products-season-items">
                    ${this.renderProductsByCategory(outOfSeasonProducts)}
                </div>
            </div>`;
        }
        
        // Add "Load More" button if products were limited
        if (hasMoreProducts) {
            html += `<div class="load-more-section">
                <button class="load-more-btn" onclick="window.app.loadAllProducts()">
                    📋 Load All Products (${filteredProducts.length - INITIAL_RENDER_LIMIT} more)
                </button>
                <p class="load-more-info">Showing ${INITIAL_RENDER_LIMIT} of ${filteredProducts.length} products for better performance</p>
            </div>`;
        }
        
        if (!this.productsList) {
            console.warn('⚠️ productsList element not found, re-initializing elements...');
            this.productsList = document.getElementById('productsList');
            if (!this.productsList) {
                console.error('❌ productsList element still not found in DOM');
                return;
            }
        }
        
        this.productsList.innerHTML = html;
        console.log('✅ Products list rendered with', productsToRender.length, 'of', filteredProducts.length, 'products');
    }

    renderRecipes(searchTerm = '', filters = null) {
        this.realRecipesManager.renderRecipes(searchTerm, filters);
    }

    generateAIRecipes() {
        // Get all products that are in stock
        const inStockProducts = this.allProducts.filter(product => product.inStock);
        
        if (inStockProducts.length === 0) {
            alert('⚠️ No products are marked as "in stock" in your pantry. Please mark some products as in stock first.');
            return;
        }

        // Group products by category for better AI suggestions
        const productsByCategory = {};
        inStockProducts.forEach(product => {
            if (!productsByCategory[product.category]) {
                productsByCategory[product.category] = [];
            }
            productsByCategory[product.category].push(product.name);
        });

        const ingredientsList = inStockProducts.map(p => p.name).join(', ');
        
        alert(`🤖 AI Recipe Suggestions

Available Ingredients (${inStockProducts.length} items in stock):
${ingredientsList}

📝 Recipe Ideas:

🥗 FRESH SALAD
Combine your produce items with basic seasonings for a healthy salad.

🍳 SIMPLE STIR-FRY  
Use your proteins and vegetables in a quick stir-fry with basic seasonings.

🍲 HEARTY SOUP
Combine vegetables, protein, and pantry items for a warming soup.

🍝 PASTA CREATION
If you have pasta and sauce ingredients, create a custom pasta dish.

💡 TIP: Try searching online for recipes using these specific ingredients, or ask a cooking AI assistant for detailed recipes with your available items!

Future Enhancement: This could connect to a real AI service to generate custom recipes based on your exact ingredients.`);
    }

    // Product filter methods
    applyProductFilters() {
        // v6.0.1 UNIFIED BUG FIX: products-manager.js is disabled,
        // so applying filters must re-render the products list directly
        this.renderProductsList();
    }

    clearProductFilters() {
        // v6.0.1 UNIFIED BUG FIX: reset filter inputs and re-render
        if (this.stockStatusFilter) this.stockStatusFilter.value = '';
        if (this.categoryFilter) this.categoryFilter.value = '';
        this.renderProductsList();
    }

    updateProductFilterButtons() {
        const hasStockFilter = this.stockStatusFilter && this.stockStatusFilter.value;
        const hasCategoryFilter = this.categoryFilter && this.categoryFilter.value;
        const hasAnyFilter = hasStockFilter || hasCategoryFilter;

        // Show/hide clear filter button
        if (this.clearProductFiltersBtn) {
            this.clearProductFiltersBtn.style.display = hasAnyFilter ? 'inline-block' : 'none';
        }
        
        // Show AI suggest button when filtering for in-stock products
        if (this.productAiSuggestBtn) {
            const showAISuggest = this.stockStatusFilter && this.stockStatusFilter.value === 'inStock';
            this.productAiSuggestBtn.style.display = showAISuggest ? 'inline-block' : 'none';
        }
    }

    generateProductAIRecipes() {
        // Use the same logic as the recipe tab AI suggestions
        this.generateAIRecipes();
    }

    // Helper function to find product by name and category
    findProductByNameAndCategory(name, category) {
        return this.allProducts.find(p => 
            p.name.toLowerCase() === name.toLowerCase() && 
            p.category === category
        );
    }

    // Product recipes modal methods
    showProductRecipes(productId) {
        console.log(`🔍 showProductRecipes called with productId: ${productId}`);
        
        
        const product = this.allProducts.find(p => p.id === productId);
        if (!product) {
            console.warn(`⚠️ Product with ID ${productId} not found`);
            return;
        }

        // Store the current product ID for later restoration
        this.currentProductForRecipes = productId;

        // Close any other modals first (but not product recipes modal)
        if (this.recipeEditModal) {
            this.recipeEditModal.style.display = 'none';
        }
        if (this.changeCategoryModal) this.changeCategoryModal.style.display = 'none';
        if (this.productEditModal) this.productEditModal.style.display = 'none';
        if (this.simpleMealModal) this.simpleMealModal.style.display = 'none';
        if (this.recipeSelectionModal) this.recipeSelectionModal.style.display = 'none';
        if (this.recipePlanningModal) this.recipePlanningModal.style.display = 'none';
        if (this.shoppingListModal) this.shoppingListModal.style.display = 'none';
        
        // Show modal IMMEDIATELY with loading state (get elements fresh to avoid timing issues)
        const selectedProductName = document.getElementById('selectedProductName');
        const productRecipesList = document.getElementById('productRecipesList');
        const noRecipesFound = document.getElementById('noRecipesFound');
        
        if (!selectedProductName || !productRecipesList) {
            console.error('❌ Product recipes modal elements not found in DOM!');
            return;
        }
        
        selectedProductName.textContent = product.name;
        productRecipesList.innerHTML = '<div style="text-align: center; padding: 40px; font-size: 16px;">🔄 Loading recipes...</div>';
        productRecipesList.style.display = 'block';
        if (noRecipesFound) noRecipesFound.style.display = 'none';
        
        // Show the modal with maximum z-index using both CSS class and inline styles
        console.log('📱 Showing modal immediately...');
        this.productRecipesModal.classList.add('force-show');
        this.productRecipesModal.style.setProperty('display', 'block', 'important');
        this.productRecipesModal.style.setProperty('visibility', 'visible', 'important');
        this.productRecipesModal.style.setProperty('opacity', '1', 'important');
        this.productRecipesModal.style.setProperty('z-index', '99999', 'important');
        this.productRecipesModal.style.setProperty('position', 'fixed', 'important');
        this.productRecipesModal.style.setProperty('top', '0', 'important');
        this.productRecipesModal.style.setProperty('left', '0', 'important');
        this.productRecipesModal.style.setProperty('width', '100%', 'important');
        this.productRecipesModal.style.setProperty('height', '100%', 'important');
        this.productRecipesModal.style.setProperty('background-color', 'rgba(0,0,0,0.5)', 'important');
        
        // Force reflow to ensure modal shows immediately
        this.productRecipesModal.offsetHeight;
        
        // Also force the modal-content to be visible
        const modalContent = this.productRecipesModal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.style.setProperty('display', 'block', 'important');
            modalContent.style.setProperty('visibility', 'visible', 'important');
            modalContent.style.setProperty('opacity', '1', 'important');
        }
        
        // Fix DOM structure: move productRecipesModal out of recipeEditModal if it's nested
        if (this.productRecipesModal.parentElement === this.recipeEditModal) {
            console.log('🔧 Moving productRecipesModal out of recipeEditModal...');
            document.body.appendChild(this.productRecipesModal);
        }
        
        console.log('📊 Modal element:', this.productRecipesModal);
        console.log('📊 Modal display style:', this.productRecipesModal.style.display);
        
        // Force multiple render cycles to ensure visibility
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                // Remove debug styling - modal should now show normally
                if (modalContent) {
                    modalContent.style.removeProperty('background-color');
                    modalContent.style.removeProperty('border');
                }
                // Trigger a layout recalculation
                document.body.offsetHeight;
                console.log('🔧 Modal should be visible with normal styling...');
            });
        });
        
        console.log('✅ Modal displayed, now loading recipes...');
        
        // Load content asynchronously after modal is shown  
        setTimeout(() => {
            console.log('🔄 Processing recipes in background...');
            
            // Find all recipes that use this product (this is the slow part)
            const recipesUsingProduct = this.recipes.filter(recipe => {
                if (!recipe.ingredients) return false;
                
                const foundIngredient = recipe.ingredients.some(ingredient => {
                    // Try matching by productId first (convert to strings), then fall back to name matching
                    const idMatch = String(ingredient.productId) === String(productId);
                    const nameMatch = ingredient.productName && ingredient.productName.toLowerCase() === product.name.toLowerCase();
                    
                    // Debug logging for the specific product
                    if (product.name.toLowerCase().includes('paprika')) {
                        console.log(`🔍 PAPRIKA DEBUG - Recipe: "${recipe.name}", Ingredient: "${ingredient.productName || ingredient.name}", ID match: ${idMatch}, Name match: ${nameMatch}`);
                    }
                    
                    return idMatch || nameMatch;
                });
                
                return foundIngredient;
            });
            
            console.log(`🍳 Found ${recipesUsingProduct.length} recipes using "${product.name}" (ID: ${productId})`);
            
            if (recipesUsingProduct.length === 0) {
                productRecipesList.style.display = 'none';
                if (noRecipesFound) noRecipesFound.style.display = 'block';
            } else {
                this.renderProductRecipesList(recipesUsingProduct, product);
                productRecipesList.style.display = 'block';
                if (noRecipesFound) noRecipesFound.style.display = 'none';
            }
            
            console.log('✅ Recipe content loaded');
        }, 10);
    }

    renderProductRecipesList(recipes, product) {
        const html = recipes.map(recipe => {
            // Get ingredient details for this product in this recipe (use same matching logic as other methods)
            const ingredient = recipe.ingredients.find(ing => 
                ing.productId === product.id || 
                (ing.productName && ing.productName.toLowerCase() === product.name.toLowerCase())
            );
            const quantity = ingredient ? `${ingredient.quantity} ${ingredient.unit}` : 'Unknown amount';
            
            // Get recipe availability status
            const availability = this.realRecipesManager.getRecipeAvailability(recipe);
            const availabilityIcon = availability.status === 'available' ? '✅' : 
                                   availability.status === 'partial' ? '⚠️' : '❌';
            const availabilityText = `${availabilityIcon} ${availability.availableCount}/${availability.totalCount} ingredients`;

            // Get recipe metadata
            const cuisine = recipe.metadata?.cuisine || 'Unknown';
            const season = recipe.metadata?.season || '';
            
            return `
                <div class="product-recipe-item">
                    <div class="product-recipe-info">
                        <div class="product-recipe-name">${this.escapeHtml(recipe.name)}</div>
                        <div class="product-recipe-details">
                            <span>📏 ${quantity}</span>
                            <span>🍽️ ${cuisine}</span>
                            ${season ? `<span>🌱 ${season}</span>` : ''}
                            <span>${availabilityText}</span>
                        </div>
                    </div>
                    <div class="product-recipe-actions">
                        <button class="recipe-link-btn" onclick="window.app.openRecipeFromProduct(${recipe.id})">
                            View Recipe
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        const productRecipesList = document.getElementById('productRecipesList');
        if (productRecipesList) {
            productRecipesList.innerHTML = html;
        }
    }

    openRecipeFromProduct(recipeId) {
        // Store the current product recipes modal state to restore later
        this.storedProductRecipesState = {
            productId: this.currentProductForRecipes,
            isOpen: true
        };
        
        // Hide (don't close) the product recipes modal temporarily
        this.productRecipesModal.style.display = 'none';
        
        // Switch to recipes tab
        this.switchTab('recipes');
        
        // Find and open the recipe
        const recipe = this.recipes.find(r => r.id === recipeId);
        if (recipe) {
            // Small delay to ensure tab switch completes
            setTimeout(() => {
                this.realRecipesManager.openRecipeEditModal(recipeId);
            }, 100);
        }
    }

    closeProductRecipesModal() {
        this.productRecipesModal.style.display = 'none';
        this.productRecipesModal.classList.remove('force-show');
        // Clear any stored state since user explicitly closed the modal
        this.storedProductRecipesState = null;
        this.currentProductForRecipes = null;
    }

    closeAllModals() {
        // Close all modal types to prevent conflicts
        if (this.recipeEditModal) this.recipeEditModal.style.display = 'none';
        if (this.changeCategoryModal) this.changeCategoryModal.style.display = 'none';
        if (this.productEditModal) this.productEditModal.style.display = 'none';
        if (this.simpleMealModal) this.simpleMealModal.style.display = 'none';
        if (this.recipeSelectionModal) this.recipeSelectionModal.style.display = 'none';
        if (this.recipePlanningModal) this.recipePlanningModal.style.display = 'none';
        if (this.shoppingListModal) this.shoppingListModal.style.display = 'none';
        // Don't close the productRecipesModal here since we're about to open it
    }

    getProductRecipeCount(productId) {
        const product = this.allProducts.find(p => p.id === productId);
        if (!product) return 0;
        
        // Debug logging for KRIEL to understand the matching issue
        if (product.name.toLowerCase() === 'kriel') {
            console.log('🔍 Debugging KRIEL recipe count:');
            console.log('Product:', product);
            console.log('Looking for productId:', productId);
            
            const matchingRecipes = this.recipes.filter(recipe => {
                if (!recipe.ingredients) return false;
                
                // Special debug for Vitello Tonato recipe
                if (recipe.name.toLowerCase().includes('vitello')) {
                    console.log(`  🍽️ Vitello Tonato ingredients:`, recipe.ingredients);
                    recipe.ingredients.forEach((ing, index) => {
                        console.log(`    [${index}] ${ing.productName || 'NO NAME'} (ID: ${ing.productId || 'NO ID'})`);
                        if (ing.productName && ing.productName.toLowerCase().includes('kriel')) {
                            console.log(`      🎯 FOUND KRIEL-like ingredient!`, ing);
                        }
                    });
                }
                
                const hasMatch = recipe.ingredients.some(ingredient => {
                    // Convert both to strings to handle type mismatches
                    const matchById = String(ingredient.productId) === String(productId);
                    const matchByName = ingredient.productName && ingredient.productName.toLowerCase() === product.name.toLowerCase();
                    
                    // Debug the matching for KRIEL
                    if (product.name.toLowerCase() === 'kriel') {
                        console.log(`    🔍 Checking ingredient: ID=${ingredient.productId} vs ${productId}, Name="${ingredient.productName}"`);
                        console.log(`    🔍 ID Match: ${matchById}, Name Match: ${matchByName}`);
                    }
                    
                    if (matchById || matchByName) {
                        console.log(`  ✅ MATCH in "${recipe.name}":`, ingredient);
                    }
                    return matchById || matchByName;
                });
                
                if (hasMatch) {
                    console.log(`  ✅ Recipe "${recipe.name}" uses KRIEL`);
                }
                return hasMatch;
            });
            
            console.log(`🔍 Found ${matchingRecipes.length} recipes using KRIEL`);
        }
        
        // Count how many recipes use this product (match by ID first, then name)
        return this.recipes.filter(recipe => {
            return recipe.ingredients && recipe.ingredients.some(ingredient => 
                // Try matching by productId first (convert to strings), then fall back to name matching
                String(ingredient.productId) === String(productId) || 
                (ingredient.productName && ingredient.productName.toLowerCase() === product.name.toLowerCase())
            );
        }).length;
    }

    refreshProductRecipeCounts() {
        return this.productsManager.refreshProductRecipeCounts();
    }

    renderProductCategorySection(category, products) {
        const categoryData = this.categories.find(cat => cat.id === category);
        const categoryName = categoryData ? categoryData.name.charAt(0).toUpperCase() + categoryData.name.slice(1) : category;
        const categoryEmoji = categoryData ? categoryData.emoji : '📦';
        
        return `
            <div class="category-section">
                <div class="category-header">
                    <span class="category-title">${categoryEmoji} ${categoryName}</span>
                    <span class="category-count">${products.length}</span>
                </div>
                <div class="category-items">
                    ${products.map(product => this.renderProduct(product)).join('')}
                </div>
            </div>
        `;
    }

    // REMOVED: Duplicate toggle functions - functionality handled by products-categories module

    renderProduct(product) {
        const status = this.getProductStatus(product);
        
        // Create beautiful toggles for the three key states
        const statusToggles = `
            <div class="product-status-toggles">
                <span class="status-toggle pantry-toggle ${status.inPantry ? 'active' : ''}" 
                      onclick="event.stopPropagation(); window.realProductsCategoriesManager.toggleProductPantry(${product.id}); window.app.renderProductsList();" 
                      title="Click to toggle: ${status.inPantry ? 'Remove from Pantry' : 'Add to Pantry'}">
                    🏠 ${status.inPantry ? 'Pantry' : 'No Pantry'}
                </span>
                <span class="status-toggle stock-toggle ${status.inStock ? 'active' : ''}" 
                      onclick="event.stopPropagation(); window.realProductsCategoriesManager.toggleProductStock(${product.id}); window.app.renderProductsList();" 
                      title="Click to toggle: ${status.inStock ? 'In Stock → Out of Stock' : 'Out of Stock → In Stock'}">
                    ${status.inStock ? '✅ Stock' : '❌ No Stock'}
                </span>
                <span class="status-toggle season-toggle ${status.inSeason ? 'active' : ''}" 
                      onclick="event.stopPropagation(); window.realProductsCategoriesManager.toggleProductSeason(${product.id}); window.app.renderProductsList();" 
                      title="Click to toggle: ${status.inSeason ? 'In Season → Out of Season' : 'Out of Season → In Season'}">
                    ${status.inSeason ? '🌱 Season' : '🍂 Off Season'}
                </span>
            </div>
        `;
        
        return `
            <div class="product-item ${status.inShopping ? 'in-shopping' : ''} ${status.inPantry ? 'in-pantry' : ''}" data-id="${product.id}">
                <div class="product-checkboxes">
                    <label class="product-checkbox-label" title="Add to shopping list">
                        <input 
                            type="checkbox" 
                            class="product-checkbox shopping-checkbox" 
                            ${status.inShopping ? 'checked' : ''}
                            onchange="window.realProductsCategoriesManager.toggleProductShopping(${product.id}); window.app.renderProductsList();"
                        >
                        <span class="checkbox-text">🛒</span>
                    </label>
                    <label class="product-checkbox-label" title="Add to pantry">
                        <input 
                            type="checkbox" 
                            class="product-checkbox pantry-checkbox" 
                            ${status.inPantry ? 'checked' : ''}
                            onchange="window.realProductsCategoriesManager.toggleProductPantry(${product.id}); window.app.renderProductsList();"
                        >
                        <span class="checkbox-text">🏠</span>
                    </label>
                </div>
                <div class="product-content" onclick="window.realProductsCategoriesManager.openProductEditModalById(${product.id})" style="cursor: pointer;" title="Click to edit this product">
                    <div class="product-name-section">
                        <div class="product-name">${this.escapeHtml(product.name)}</div>
                        <div class="product-recipe-count" onclick="event.stopPropagation(); window.app.showProductRecipes(${product.id})" style="cursor: pointer; color: #007bff; text-decoration: underline;" title="Click to see recipes using this ingredient">${this.getProductRecipeCount(product.id)} recipes</div>
                    </div>
                    ${statusToggles}
                </div>
                <div class="product-actions">
                    <button class="delete-btn" onclick="window.app.deleteProduct(${product.id})" title="Delete product">×</button>
                </div>
            </div>
        `;
    }

    updateProductCount(filteredCount = null, hasFilter = false, displayedCount = null) {
        if (this.productCount) {
            let productCount = this.allProducts.length;
            if (productCount === 0 && window.realProductsCategoriesManager && window.realProductsCategoriesManager.getAllProducts().length > 0) {
                console.warn('⚠️ Products Manager has data but app.allProducts getter returns empty');
                productCount = window.realProductsCategoriesManager.getAllProducts().length;
            }


            if (!hasFilter && productCount > this.INITIAL_RENDER_LIMIT && displayedCount !== null && displayedCount < productCount) {
                const shown = displayedCount;

                this.productCount.innerHTML = `Showing ${shown} of <span class="load-all-link" onclick="window.app.loadAllProducts()">${productCount}</span> products for better performance`;
                this.productCount.classList.add('load-more-info');
            } else {
                this.productCount.textContent = `${productCount} products`;
                this.productCount.classList.remove('load-more-info');
            }
        }

        if (this.filteredCount) {
            if (hasFilter && filteredCount !== null && filteredCount !== this.allProducts.length) {
                this.filteredCount.textContent = `${filteredCount} shown`;
                this.filteredCount.style.display = 'inline';
            } else {
                this.filteredCount.style.display = 'none';
            }
        }
    }

    renderShoppingItem(item, showCategory = false) {
        const categoryData = this.categories.find(cat => cat.id === item.category);
        const categoryEmoji = categoryData ? categoryData.emoji : '📦';
        
        // Get stock status from master products list
        const product = this.allProducts.find(p => p.id === item.id);
        let stockIndicator = '';
        
        if (product) {
            // Show stock status for all products
            const stockStatus = product.inStock ? 'InStock' : 'OutStock';
            stockIndicator = `<span class="stock-indicator stock-${stockStatus.toLowerCase()}">${stockStatus === 'InStock' ? '✅ InStock' : '❌ OutStock'}</span>`;
        }
        // If product doesn't exist in master list, no indicator (shouldn't happen with current sync)
        
        return `
            <div class="grocery-item category-${item.category} ${item.completed ? 'completed' : ''}" data-id="${item.id}">
                <input 
                    type="checkbox" 
                    class="item-checkbox" 
                    ${item.completed ? 'checked' : ''}
                    onchange="window.app.toggleShoppingItemComplete(${item.id});"
                >
                <div class="item-content" onclick="window.app.toggleShoppingItemComplete(${item.id});" style="cursor: pointer;" title="📱 Tap to mark as bought">
                    <div class="item-name">${this.escapeHtml(item.name)}</div>
                    <div class="item-meta">
                        ${showCategory ? `<span class="item-category-small">${categoryEmoji} ${item.category}</span>` : ''}
                        ${stockIndicator}
                        <span class="mobile-hint">📱 Tap to buy</span>
                    </div>
                </div>
                <div class="item-actions">
                    <button class="menu-usage-btn" onclick="window.realShoppingListManager.showProductUsage(${item.id}, '${this.escapeHtml(item.name).replace(/'/g, '\\\'')}')" title="Show planned meals or recipes using this ingredient">🍽️</button>
                    <button class="product-portal-btn" onclick="window.realProductsCategoriesManager.openProductEditModalByName('${this.escapeHtml(item.name).replace(/'/g, '\\\'').toLowerCase()}', '${item.category}')" title="Open product portal to edit details">📋</button>
                    <button class="delete-btn" onclick="window.app.shoppingList.deleteItem(${item.id}); window.app.render();">×</button>
                </div>
            </div>
        `;
    }

    sortItemsByCategory(items) {
        const categoryOrder = this.getCategoryOrder();
        return items.sort((a, b) => {
            const aIndex = categoryOrder.indexOf(a.category);
            const bIndex = categoryOrder.indexOf(b.category);
            
            // If same category, sort alphabetically by name
            if (aIndex === bIndex) {
                return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
            }
            
            // Otherwise sort by category order
            return aIndex - bIndex;
        });
    }

    getCategoryEmoji(categoryId) {
        if (window.realProductsCategoriesManager && window.realProductsCategoriesManager.getCategoryEmoji) {
            return window.realProductsCategoriesManager.getCategoryEmoji(categoryId);
        }
        const category = this.categories.find(cat => cat.id === categoryId);
        return category ? category.emoji : '📦';
    }

    renderMealCalendar() {
        // Sync data from menu module if available
        if (window.realMenuManager) {
            this.mealPlans = window.realMenuManager.getAllMealPlans ? window.realMenuManager.getAllMealPlans() : this.mealPlans;
            console.log(`🔄 Synced meal plans from menu module`);
        }
        
        // Check and re-initialize DOM elements if needed
        if (!this.mealCalendar) {
            console.warn('⚠️ mealCalendar element not found, re-initializing elements...');
            this.mealCalendar = document.getElementById('mealCalendar');
            if (!this.mealCalendar) {
                console.error('❌ mealCalendar element still not found in DOM');
                return;
            }
        }
        
        if (!this.currentWeekRange) {
            console.warn('⚠️ currentWeekRange element not found, re-initializing elements...');
            this.currentWeekRange = document.getElementById('currentWeekRange');
            if (!this.currentWeekRange) {
                console.error('❌ currentWeekRange element still not found in DOM');
                return;
            }
        }
        
        // Ensure currentWeekStart is initialized
        if (!this.currentWeekStart) {
            console.warn('⚠️ currentWeekStart not initialized, setting to current week');
            this.currentWeekStart = this.getWeekStart(new Date());
        }
        
        const weekKey = this.getWeekKey(this.currentWeekStart);
        const weekMeals = this.mealPlans[weekKey] || {};
        
        // Update week range display
        const weekEnd = new Date(this.currentWeekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        this.currentWeekRange.textContent = `${this.formatDate(this.currentWeekStart)} - ${this.formatDate(weekEnd)}`;
        
        // Generate calendar
        const today = new Date();
        const days = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
        let calendarHTML = '';
        
        for (let i = 0; i < 7; i++) {
            const currentDay = new Date(this.currentWeekStart);
            currentDay.setDate(currentDay.getDate() + i);
            
            const isToday = currentDay.toDateString() === today.toDateString();
            const dayMeals = weekMeals[i] || {};
            
            calendarHTML += `
                <div class="calendar-day">
                    <div class="day-header ${isToday ? 'today' : ''}">
                        ${days[i]} ${currentDay.getDate()}/${currentDay.getMonth() + 1}
                    </div>
                    ${this.renderMealSlot(i, 'breakfast', dayMeals.breakfast)}
                    ${this.renderMealSlot(i, 'lunch', dayMeals.lunch)}
                    ${this.renderMealSlot(i, 'dinner', dayMeals.dinner)}
                </div>
            `;
        }
        
        if (!this.mealCalendar) {
            console.warn('⚠️ mealCalendar element not found at render time, re-initializing...');
            this.mealCalendar = document.getElementById('mealCalendar');
            if (!this.mealCalendar) {
                console.error('❌ mealCalendar element still not found in DOM at render time');
                return;
            }
        }
        
        this.mealCalendar.innerHTML = calendarHTML;
    }

    renderMealSlot(dayIndex, mealType, mealData) {
        let mealDisplay = null;
        let hasMeal = false;
        
        if (mealData) {
            if (typeof mealData === 'object' && mealData.type) {
                // New format with type
                hasMeal = true;
                if (mealData.type === 'recipe') {
                    const recipe = this.recipes.find(r => r.id === mealData.id);
                    mealDisplay = {
                        name: recipe ? recipe.name : 'Unknown Recipe',
                        icon: '🍳',
                        type: 'recipe'
                    };
                } else if (mealData.type === 'simple') {
                    mealDisplay = {
                        name: mealData.name,
                        icon: '🍽️',
                        type: 'simple'
                    };
                }
            } else if (typeof mealData === 'number') {
                // Legacy format - just recipe ID
                const recipe = this.recipes.find(r => r.id === mealData);
                if (recipe) {
                    hasMeal = true;
                    mealDisplay = {
                        name: recipe.name,
                        icon: '🍳',
                        type: 'recipe'
                    };
                }
            }
        }
        
        return `
            <div class="meal-slot ${hasMeal ? 'has-meal' : ''}" 
                 ${!hasMeal ? `onclick="window.app.assignMealToSlot(${dayIndex}, '${mealType}')"` : ''}>
                <div class="meal-type">${mealType}</div>
                ${hasMeal && mealDisplay ? `
                    <div class="meal-content">
                        <div class="meal-recipe" onclick="event.stopPropagation(); window.app.showMealDetails(${dayIndex}, '${mealType}', ${JSON.stringify(mealData).replace(/"/g, '&quot;')})">
                            <span class="meal-icon">${mealDisplay.icon}</span>
                            <span class="meal-name" title="${this.escapeHtml(mealDisplay.name)}">${this.escapeHtml(mealDisplay.name)}</span>
                        </div>
                        <div class="meal-actions">
                            <button class="edit-meal-btn" onclick="event.stopPropagation(); window.app.assignMealToSlot(${dayIndex}, '${mealType}')" title="Change meal">✏️</button>
                            <button class="remove-meal-btn" onclick="event.stopPropagation(); window.app.removeMeal(${dayIndex}, '${mealType}')" title="Remove meal">×</button>
                        </div>
                    </div>
                ` : `
                    <div class="empty-meal">Click to add ${mealType}</div>
                `}
            </div>
        `;
    }

    formatDate(date) {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    isLargeScreen() {
        // Consider Mac and iPad as large screens for future recipe/menu management  
        return DebugUtils.isLargeScreen();
    }

    isMobileDevice() {
        return DebugUtils.isMobileDevice();
    }



    // testModal() method disabled - test button removed


    // Real Shopping List Module Initialization
    async initializeShoppingList() {
        try {
            // Use the global shopping list manager instance
            if (!window.realShoppingListManager) {
                console.warn('⚠️ Global shopping list manager not found, creating new instance');
                window.realShoppingListManager = new RealShoppingListManager(this);
                await window.realShoppingListManager.initialize();
            }
            
            // Set the app instance to use the global shopping list manager
            this.shoppingList = window.realShoppingListManager;
            this.shoppingList.app = this; // Ensure it has a reference to the app
            
            console.log('✅ Real shopping list module initialized');
            // Update shoppingItems property for backward compatibility
            // v6.0.0 UNIFIED: No manual data sync needed - using getters
            // Re-render if UI is ready
            if (this.shoppingContainer) {
                this.render();
            }
        } catch (error) {
            console.error('❌ Failed to initialize shopping list:', error);
            // Fallback to empty array
            // v6.0.0 UNIFIED: No manual data clearing needed
        }
    }

    // Storage Methods - Pure localStorage with Sample Data for New Users
    // Shopping items now handled by real shopping module
    
    // loadStandardItems() - NOW HANDLED BY REAL PANTRY MODULE

    loadCategories() {
        return window.realProductsCategoriesManager.loadCategories();
    }

    loadAllProducts() {
        console.log('📋 Loading all products...');
        this.renderProductsList(true);
    }
    
    forceRefreshDisplays() {
        console.log('🔄 Force refreshing displays with correct categories...');
        
        // Update welcome screen stats if welcome tab is active
        if (this.currentTab === 'welcome') {
            this.updateWelcomeStats();
        }
        
        // Refresh current tab display
        if (this.currentTab === 'shopping') {
            this.renderShoppingList();
        } else if (this.currentTab === 'pantry' && window.realPantryManager) {
            window.realPantryManager.refreshDisplay();
        } else if (this.currentTab === 'products') {
            this.renderProductsList();
        }
    }

    // saveShoppingItems() now handled by real shopping module

    // saveStandardItems() - NOW HANDLED BY REAL PANTRY MODULE

    saveAllProducts() {
        return this.productsManager.saveAllProducts();
    }

    saveCategories() {
        return window.realProductsCategoriesManager.saveCategories();
    }

    loadRecipes() {
        return this.realRecipesManager.loadRecipes();
    }

    upgradeRecipesWithMetadata(recipes) {
        return recipes.map(recipe => {
            // If recipe already has metadata, keep it
            if (recipe.metadata) {
                return recipe;
            }

            // Add default metadata based on recipe name or ingredients
            let cuisine = "International";
            let mainIngredient = "mixed";
            let season = "all-year";

            const recipeName = (recipe.name || "").toLowerCase();
            const recipeDescription = (recipe.description || "").toLowerCase();
            
            // Try to detect cuisine
            if (recipeName.includes('pasta') || recipeName.includes('italian')) {
                cuisine = "Italian";
                mainIngredient = "pasta";
            } else if (recipeName.includes('chicken')) {
                cuisine = "American";
                mainIngredient = "chicken";
            } else if (recipeName.includes('rice') || recipeName.includes('fried rice')) {
                cuisine = "Asian";
                mainIngredient = "rice";
            } else if (recipeName.includes('soup') || recipeName.includes('vegetable')) {
                mainIngredient = "vegetables";
                if (recipeDescription.includes('winter') || recipeName.includes('winter')) {
                    season = "winter";
                }
            }

            return {
                ...recipe,
                metadata: {
                    cuisine,
                    mainIngredient,
                    season
                }
            };
        });
    }

    saveRecipes() {
        this.realRecipesManager.saveRecipes();
    }

    getSampleRecipes() {
        // Only create sample recipes if we have products to reference
        if (this.allProducts.length === 0) {
            return [];
        }

        // Find actual product IDs that exist
        const pastaProduct = this.allProducts.find(p => 
            p.name.toLowerCase().includes('pasta')
        );
        const tomatoProduct = this.allProducts.find(p => 
            p.name.toLowerCase().includes('tomato') || p.name.toLowerCase().includes('sauce')
        );
        const chickenProduct = this.allProducts.find(p => 
            p.name.toLowerCase().includes('chicken')
        );
        const riceProduct = this.allProducts.find(p => 
            p.name.toLowerCase().includes('rice')
        );

        const recipes = [];

        // Pasta recipe
        if (pastaProduct && tomatoProduct) {
            recipes.push({
                id: Date.now() + Math.random(),
                name: "Simple Pasta",
                description: "Quick and easy pasta with tomato sauce",
                preparation: "1. Boil water in a large pot\n2. Add pasta and cook according to package instructions\n3. Heat tomato sauce in a separate pan\n4. Drain pasta and mix with sauce\n5. Serve hot",
                ingredients: [
                    { productId: pastaProduct.id, productName: pastaProduct.name, quantity: 100, unit: 'g' },
                    { productId: tomatoProduct.id, productName: tomatoProduct.name, quantity: 200, unit: 'ml' }
                ],
                metadata: {
                    cuisine: "Italian",
                    mainIngredient: "pasta",
                    season: "all-year"
                },
                dateCreated: new Date().toISOString()
            });
        }

        // Chicken recipe
        if (chickenProduct) {
            recipes.push({
                id: Date.now() + Math.random() + 1,
                name: "Grilled Chicken",
                description: "Juicy grilled chicken breast with herbs",
                preparation: "1. Season chicken with salt, pepper and herbs\n2. Preheat grill to medium-high\n3. Grill chicken 6-8 minutes per side\n4. Check internal temperature reaches 165°F\n5. Let rest 5 minutes before serving",
                ingredients: [
                    { productId: chickenProduct.id, productName: chickenProduct.name, quantity: 2, unit: 'pcs' }
                ],
                metadata: {
                    cuisine: "American",
                    mainIngredient: "chicken",
                    season: "summer"
                },
                dateCreated: new Date().toISOString()
            });
        }

        // Rice recipe
        if (riceProduct) {
            recipes.push({
                id: Date.now() + Math.random() + 2,
                name: "Fried Rice",
                description: "Classic Asian-style fried rice with vegetables",
                preparation: "1. Cook rice and let cool\n2. Heat oil in large pan or wok\n3. Add vegetables and stir-fry\n4. Add rice and mix well\n5. Season with soy sauce and serve hot",
                ingredients: [
                    { productId: riceProduct.id, productName: riceProduct.name, quantity: 200, unit: 'g' }
                ],
                metadata: {
                    cuisine: "Asian",
                    mainIngredient: "rice",
                    season: "all-year"
                },
                dateCreated: new Date().toISOString()
            });
        }

        // Add a vegetarian recipe
        const onionProduct = this.allProducts.find(p => 
            p.name.toLowerCase().includes('onion')
        );
        if (onionProduct) {
            recipes.push({
                id: Date.now() + Math.random() + 3,
                name: "Vegetable Soup",
                description: "Hearty winter vegetable soup",
                preparation: "1. Chop all vegetables\n2. Sauté onions until translucent\n3. Add other vegetables and broth\n4. Simmer 30 minutes\n5. Season to taste and serve hot",
                ingredients: [
                    { productId: onionProduct.id, productName: onionProduct.name, quantity: 2, unit: 'pcs' }
                ],
                metadata: {
                    cuisine: "International",
                    mainIngredient: "vegetables",
                    season: "winter"
                },
                dateCreated: new Date().toISOString()
            });
        }

        return recipes;
    }

    findSampleProductId(productName) {
        const product = this.allProducts.find(p => 
            p.name.toLowerCase().includes(productName.toLowerCase())
        );
        return product ? product.id : null; // Return null instead of random number
    }

    getSampleShoppingItems() {
        return [
            {
                id: Date.now(),
                name: "Bananas",
                category: "produce",
                completed: false,
                dateAdded: new Date().toISOString(),
                fromStandard: false
            },
            {
                id: Date.now() + 1,
                name: "Milk",
                category: "dairy",
                completed: false,
                dateAdded: new Date().toISOString(),
                fromStandard: true
            },
            {
                id: Date.now() + 2,
                name: "Bread",
                category: "bakery",
                completed: true,
                dateAdded: new Date().toISOString(),
                fromStandard: false
            }
        ];
    }

    getSamplePantryItems() {
        return [
            {
                id: Date.now() + 100,
                name: "Rice",
                category: "pantry",
                inStock: true,
                inSeason: true,
                dateAdded: new Date().toISOString()
            },
            {
                id: Date.now() + 101,
                name: "Milk",
                category: "dairy",
                inStock: false,
                inSeason: true,
                dateAdded: new Date().toISOString()
            },
            {
                id: Date.now() + 102,
                name: "Apples",
                category: "produce",
                inStock: true,
                inSeason: true,
                dateAdded: new Date().toISOString()
            },
            {
                id: Date.now() + 103,
                name: "Chicken Breast",
                category: "meat",
                inStock: false,
                inSeason: true,
                dateAdded: new Date().toISOString()
            },
            {
                id: Date.now() + 104,
                name: "Strawberries",
                category: "produce",
                inStock: false,
                inSeason: false,
                dateAdded: new Date().toISOString()
            }
        ];
    }


    showPersistenceError(dataType) {
        console.warn(`Storage error for ${dataType}. Your data might not be saved.`);
        // Could add user notification here if needed
    }

    // Device Sync Methods - DELEGATED TO REAL JSON IMPORT/EXPORT MODULE
    exportData() {
        console.log('🔄 Delegating export to JSON Import/Export module...');
        if (this.jsonImportExportManager) {
            return this.jsonImportExportManager.exportData();
        } else {
            console.error('❌ JSON Import/Export manager not available');
            alert('Export functionality not available. Please refresh the page.');
        }
    }

    handleFileImport(event) {
        console.log('🔄 Delegating import to JSON Import/Export module...');
        if (this.jsonImportExportManager) {
            return this.jsonImportExportManager.handleFileImport(event);
        } else {
            console.error('❌ JSON Import/Export manager not available');
            alert('Import functionality not available. Please refresh the page.');
        }
    }

    // CSV Methods
    downloadCsvTemplate() {
        console.log('🔄 Delegating CSV template download to JSON Import/Export module...');
        if (this.jsonImportExportManager && this.jsonImportExportManager.downloadCsvTemplate) {
            return this.jsonImportExportManager.downloadCsvTemplate();
        } else {
            console.error('❌ JSON Import/Export manager not available');
            alert('CSV template functionality not available. Please refresh the page.');
        }
    }

    // ========== CONDUCTOR METHODS - APP.JS AS ORCHESTRA DIRECTOR ==========
    // All import/export functionality delegated to json-import-export-real.js module
    
    handleCsvImport(event) {
        console.log('🎼 Conductor: Delegating CSV import to module...');
        if (this.jsonImportExportManager) {
            return this.jsonImportExportManager.handleCsvImport(event);
        } else {
            console.error('❌ JSON Import/Export manager not available');
            alert('CSV import functionality not available. Please refresh the page.');
        }
    }

    importCsvFromText() {
        console.log('🎼 Conductor: Delegating CSV text import to module...');
        if (this.jsonImportExportManager) {
            return this.jsonImportExportManager.importCsvFromText();
        } else {
            console.error('❌ JSON Import/Export manager not available');
            alert('CSV import functionality not available. Please refresh the page.');
        }
    }

    cleanCsvText(csvText) {
        console.log('🎼 Conductor: Delegating CSV cleaning to module...');
        if (this.jsonImportExportManager) {
            return this.jsonImportExportManager.cleanCsvText(csvText);
        } else {
            console.error('❌ JSON Import/Export manager not available');
            return csvText; // Fallback
        }
    }


    // ========== IMAGE SETTINGS METHODS ==========

    loadImageSettings() {
        // Load folder path setting from localStorage
        try {
            const settings = localStorage.getItem('imageSettings');
            if (settings) {
                const parsed = JSON.parse(settings);
                return parsed.folderPath || 'RGimages/';
            }
        } catch (e) {
            console.warn('Could not load image settings:', e);
        }
        return 'RGimages/'; // Default folder path
    }

    initializeImageSettings() {
        // Initialize image settings UI if available
        const useFirebaseImagesCheckbox = document.getElementById('useFirebaseImages');
        if (useFirebaseImagesCheckbox) {
            useFirebaseImagesCheckbox.checked = this.useFirebaseImages;
        }
        console.log('🖼️ Image settings initialized');
    }

    updateImagePreview() {
        // Update recipe image preview in edit modal
        const imagePreview = document.getElementById('imagePreview');
        const editRecipeImage = document.getElementById('editRecipeImage');
        
        if (!imagePreview || !editRecipeImage) {
            return;
        }
        
        const imageValue = editRecipeImage.value.trim();
        
        if (imageValue) {
            // Determine the image URL
            let imageUrl = imageValue;
            
            // If it's not a full URL, treat it as a local image
            if (!imageValue.startsWith('http') && !imageValue.startsWith('data:')) {
                imageUrl = `${this.imagesFolderPathValue}${imageValue}`;
            }
            
            imagePreview.innerHTML = `
                <img src="${imageUrl}" alt="Recipe preview" 
                     style="max-width: 200px; max-height: 150px; border-radius: 5px;"
                     onerror="this.style.display='none'">
            `;
            imagePreview.style.display = 'block';
        } else {
            imagePreview.style.display = 'none';
        }
    }

    // Test function for console debugging
    async testRecipeImageHeader() {
        console.log('🧪 Testing recipe image header functionality...');
        
        // Test with a mock recipe
        const testRecipe = {
            name: 'Test Recipe',
            image: 'breakfast-2.png'  // Known image from our directory
        };
        
        console.log('🧪 Calling updateRecipeImageHeader with test recipe...');
        if (this.realRecipesManager && typeof this.realRecipesManager.updateRecipeImageHeader === 'function') {
            await this.realRecipesManager.updateRecipeImageHeader(testRecipe);
        }
        console.log('🧪 Test completed');
    }

    // ========== FIREBASE DELEGATION METHODS ==========

    loadFirebaseImageSetting() {
        console.log('🎼 Conductor: Delegating Firebase image setting load to sync manager...');
        return this.firebaseSyncManager ? this.firebaseSyncManager.loadFirebaseImageSetting() : false;
    }
    
    saveImageSettings() {
        console.log('🎼 Conductor: Delegating image settings save to sync manager...');
        if (this.firebaseSyncManager) {
            this.firebaseSyncManager.saveImageSettings();
        }
    }

    toggleFirebaseImages() {
        console.log('🎼 Conductor: Delegating Firebase images toggle to sync manager...');
        if (this.firebaseSyncManager) {
            this.firebaseSyncManager.toggleFirebaseImages();
        }
    }

    openImageUploadDialog() {
        console.log('🎼 Conductor: Delegating image upload dialog to sync manager...');
        if (this.firebaseSyncManager) {
            this.firebaseSyncManager.openImageUploadDialog();
        }
    }

    async syncAllExistingImages() {
        console.log('🎼 Conductor: Delegating existing images sync to sync manager...');
        if (this.firebaseSyncManager) {
            await this.firebaseSyncManager.syncAllExistingImages();
        }
    }

    async migrateGoogleImages() {
        console.log('🎼 Conductor: Delegating Google images migration to sync manager...');
        if (this.firebaseSyncManager) {
            await this.firebaseSyncManager.migrateGoogleImages();
        }
    }

    debugFirebaseSetup() {
        console.log('🎼 Conductor: Delegating Firebase debug to sync manager...');
        if (this.firebaseSyncManager) {
            this.firebaseSyncManager.debugFirebaseSetup();
        }
    }

    // ========== v6.0.2 PURE COORDINATION METHODS ==========
    /**
     * Pure coordination - delegate to appropriate modules
     */
    fetchRecipeFromUrl() {
        const url = this.recipeUrlInput?.value?.trim();
        return this.realRecipesManager.fetchFromUrl(url);
    }

    editRecipe(recipeId) {
        console.log('🎼 Conductor: Delegating recipe editing to recipes manager...');
        return this.realRecipesManager.openRecipeEditModal(recipeId);
    }

    deleteRecipe(recipeId) {
        console.log('🎼 Conductor: Delegating recipe deletion to recipes manager...');
        return this.realRecipesManager.deleteRecipe(recipeId);
    }

    delegatePlanRecipe(recipeId) {
        console.log('🎼 Conductor: Delegating recipe planning to recipes manager...');
        return this.realRecipesManager.planRecipe(recipeId);
    }

    assignMealToSlot(dayIndex, mealType) {
        console.log('🎼 Conductor: Delegating meal assignment to menu manager...');
        if (window.realMenuManager) {
            return window.realMenuManager.assignMealToSlot(dayIndex, mealType);
        } else {
            console.error('❌ Menu Manager not available');
        }
    }
    
    showMealDetails(dayIndex, mealType, mealData) {
        console.log('🎼 Conductor: Delegating meal details to menu manager...');
        if (window.realMenuManager) {
            return window.realMenuManager.showMealDetails(dayIndex, mealType, mealData);
        } else {
            console.error('❌ Menu Manager not available');
        }
    }
    
    removeMeal(dayIndex, mealType) {
        console.log('🎼 Conductor: Delegating meal removal to menu manager...');
        if (window.realMenuManager) {
            return window.realMenuManager.removeMeal(dayIndex, mealType);
        } else {
            console.error('❌ Menu Manager not available');
        }
    }
    
    // DEBUG: Check module states
    debugModuleStates() {
        console.log('🔍 DEBUGGING MODULE STATES:');
        console.log('📦 Products Manager:', !!window.realProductsCategoriesManager);
        if (window.realProductsCategoriesManager) {
            console.log('  - Categories:', window.realProductsCategoriesManager.getAllCategories().length);
            console.log('  - Products:', window.realProductsCategoriesManager.getAllProducts().length);
            console.log('  - Shopping Products:', window.realProductsCategoriesManager.getShoppingProducts().length);
        }
        console.log('🛒 Shopping Manager:', !!window.realShoppingListManager);
        console.log('🏠 Pantry Manager:', !!window.realPantryManager);
        console.log('🍳 Recipes Manager:', !!this.realRecipesManager);
        console.log('🗂️ Menu Manager:', !!window.realMenuManager);
        
        // Check app getters
        console.log('🎯 App Getters:');
        console.log('  - this.categories.length:', this.categories.length);
        console.log('  - this.allProducts.length:', this.allProducts.length);
        console.log('  - this.shoppingItems.length:', this.shoppingItems.length);
        
        // Check localStorage directly
        console.log('💾 LocalStorage:');
        try {
            const categoriesData = localStorage.getItem('categories');
            const productsData = localStorage.getItem('allProducts');
            console.log('  - categories raw length:', categoriesData ? categoriesData.length : 0);
            console.log('  - allProducts raw length:', productsData ? productsData.length : 0);
            if (categoriesData) {
                const categories = JSON.parse(categoriesData);
                console.log('  - categories parsed count:', categories.length);
            }
            if (productsData) {
                const products = JSON.parse(productsData);
                console.log('  - products parsed count:', products.length);
                console.log('  - shopping products count:', products.filter(p => p.inShopping).length);
            }
        } catch (error) {
            console.log('  - localStorage parsing error:', error);
        }
        
        // Check DOM elements
        console.log('🎨 DOM Elements:');
        console.log('  - groceryList:', !!document.getElementById('grocery-list'));
        console.log('  - pantryContainer:', !!document.getElementById('pantry-container'));
        console.log('  - productsContainer:', !!document.getElementById('products-container'));
        
        // Check current tab
        console.log('🗂️ Current Tab:', this.currentTab);
    }

    // Hard refresh functionality for iPhone users
    hardRefresh() {
        console.log('🔄 FIXED REFRESH: Updating version while preserving user data');
        
        // Show loading indicator
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.innerHTML = '⏳';
            refreshBtn.disabled = true;
        }
        
        // Clear all caches and reload
        if ('caches' in window) {
            caches.keys().then(names => {
                return Promise.all(names.map(name => caches.delete(name)));
            }).then(() => {
                console.log('📦 Cleared all caches');
                this.performVersionUpdate();
            }).catch(error => {
                console.warn('⚠️ Cache clearing failed:', error);
                this.performVersionUpdate();
            });
        } else {
            this.performVersionUpdate();
        }
    }

    // Perform version update WITHOUT clearing user data
    performVersionUpdate() {
        console.log('🛡️ PRESERVING all user data - only updating code version');
        console.log('🚀 AGGRESSIVE CACHE BUSTING - multiple strategies');
        
        // ✅ DO NOT clear localStorage - preserve all user data
        // ✅ DO NOT clear user recipes, shopping lists, pantry, etc.
        // ✅ ONLY update the app version by cache-busting reload
        
        console.log('📊 Data preserved: recipes, shopping lists, pantry items, settings');
        
        // AGGRESSIVE cache busting - try everything
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2);
        
        // Try to unregister service worker first
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(registrations => {
                registrations.forEach(registration => {
                    console.log('🔧 Unregistering service worker');
                    registration.unregister();
                });
            });
        }
        
        // Force reload with MULTIPLE cache busters
        const url = new URL(window.location);
        url.searchParams.set('_v', timestamp);        // Version timestamp
        url.searchParams.set('_refresh', 'true');     // Refresh flag  
        url.searchParams.set('_bust', random);        // Random cache buster
        url.searchParams.set('_force', 'reload');     // Force indicator
        url.searchParams.set('_clear', 'cache');      // Clear indicator
        
        console.log(`🔄 Forcing reload with aggressive cache bust: ${url.toString()}`);
        
        // Use location.replace to avoid adding to browser history
        window.location.replace(url.toString());
    }

}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new GroceryApp(); // app is now assigned to window.app in constructor
});

// Global debug function for console use
window.debugApp = function() {
    if (window.app && window.app.debugModuleStates) {
        window.app.debugModuleStates();
    } else {
        console.log('❌ App not available or debug method missing');
    }
};

// Console help
window.debugHelp = function() {
    console.log('🔧 DEBUG COMMANDS:');
    console.log('  debugApp() - Check all module states');
    console.log('  window.app - Access main app instance');
    console.log('  window.realProductsCategoriesManager - Products manager');
    console.log('  window.realShoppingListManager - Shopping list manager');
    console.log('  window.realPantryManager - Pantry manager');
};

// Service Worker registration for PWA functionality
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}
