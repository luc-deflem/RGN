// VERSION 2.3.2 - Added Firebase auto-sync to all shopping/pantry operations
console.log('🚀 Loading Grocery App VERSION 2.3.2');
console.log('✅ Modal fix version - Testing meal type selection...');

class GroceryApp {
    constructor() {
        // Check if localStorage is working
        this.checkStorageHealth();
        
        this.currentTab = 'shopping';
        this.currentEditingItem = null;
        this.currentHighlightIndex = -1;

        // Initialize products/categories manager early and expose globally
        this.productsManager = new RealProductsCategoriesManager();
        window.realProductsCategoriesManager = this.productsManager;
        this.productsManager.initialize();

        // Initialize pantry manager and expose globally
        this.pantryManager = new RealPantryManager();
        window.realPantryManager = this.pantryManager;

        // Load additional data directly from localStorage (with sample data for new users)
        this.standardItems = this.loadStandardItems();
        this.mealPlans = this.loadMealPlans();

        // Use data from products manager
        this.categories = this.productsManager.getAllCategories();
        this.allProducts = this.productsManager.getAllProducts();

        // Provide categories to pantry manager and initialize
        this.pantryManager.setCategories(this.categories);
        this.pantryManager.initialize();

        // Load image settings
        this.imagesFolderPathValue = this.loadImageSettings();
        
        // Initialize current week (start of current week)
        this.currentWeekStart = this.getWeekStart(new Date());
        
        // Two-file recipe import state
        this.pendingRecipeInfoData = null;
        this.pendingRecipeIngredientsData = null;
        
        this.initializeElements();

        // Initialize recipes manager early and expose globally
        this.recipesManager = new RealRecipesManager();
        window.realRecipesManager = this.recipesManager;
        this.recipesManager.initialize();

        // Initialize shopping list manager
        this.shoppingListManager = new RealShoppingListManager(this);
        window.realShoppingListManager = this.shoppingListManager;
        this.shoppingListManager.initialize();

        // Initialize JSON import/export manager and expose globally
        this.jsonImportExportManager = new RealJsonImportExportManager();
        window.realJsonImportExportManager = this.jsonImportExportManager;
        this.jsonImportExportManager.setIntegration(this);
        this.jsonImportExportManager.initialize();

        this.attachEventListeners();
        
        // Update category selects with current categories via manager
        window.realProductsCategoriesManager.updateCategorySelects();
        
        // Initialize image settings UI
        this.initializeImageSettings();
        
        // Sync products with shopping and pantry items
        this.syncProductsWithExistingItems();
        
        // Update lists from products (makes products the master list)
        this.syncListsFromProducts();
        
        this.render();
        this.updateDeviceInfo();
        
        // Initialize Firebase managers
        this.firebaseManager = new FirebaseManager(this);
        this.firebaseSyncManager = new FirebaseSyncManager();
        this.firebaseSyncManager.initialize(this);
        this.firebaseSyncManager.initializeFirebase();
        
        // Refresh product recipe counts after loading
        console.log('🔄 Refreshing product recipe counts...');
        this.refreshProductRecipeCounts();
        
        console.log('🛒 Grocery Manager initialized with localStorage');
        console.log(`📊 Data loaded: ${this.shoppingItems.length} shopping items, ${this.standardItems.length} pantry items, ${this.categories.length} categories, ${this.allProducts.length} products, ${this.recipes.length} recipes`);
        console.log(`📱 Device: ${this.getDeviceInfo()}`);
        
        // Make test function globally available
        window.testCategoryInput = () => this.testCategoryInput();
        window.testProductSearch = () => this.testProductSearch();
        window.testClearButton = () => this.testClearButton();
        
        // Make app globally available for inline onclick handlers
        window.app = this;

        // Integrate navigation and meals modules
        if (window.tabNavigation) {
            window.tabNavigation.setIntegration(this);
            this.navigation = window.tabNavigation;
            this.currentTab = window.tabNavigation.getCurrentTab();
        }
        if (window.realMealsManager) {
            window.realMealsManager.setIntegration(this);
            this.mealsManager = window.realMealsManager;
        }
    }

    get shoppingItems() {
        return this.shoppingListManager ? this.shoppingListManager.getAllItems() : [];
    }

    get recipes() {
        return window.realRecipesManager ? window.realRecipesManager.recipes : [];
    }

    set recipes(value) {
        if (window.realRecipesManager) {
            window.realRecipesManager.recipes = value;
        }
    }

    testCategoryInput() {
        console.log('🧪 Testing category input...');
        console.log('  Input element:', this.categoryInput);
        console.log('  Current value:', JSON.stringify(this.categoryInput.value));
        console.log('  Set to "fruit"...');
        this.categoryInput.value = 'fruit';
        console.log('  Value after setting:', JSON.stringify(this.categoryInput.value));
        console.log('  Computed style text-transform:', getComputedStyle(this.categoryInput).textTransform);
    }

    testProductSearch() {
        console.log('🧪 Testing product search...');
        console.log('  Search input element:', this.productSearchInput);
        console.log('  Clear button element:', this.clearSearchBtn);
        console.log('  Current search value:', this.productSearchInput ? this.productSearchInput.value : 'NULL');
        
        // Test setting a search value
        if (this.productSearchInput) {
            this.productSearchInput.value = 'test';
            console.log('  Value after setting to "test":', this.productSearchInput.value);
            
            // Manually trigger search
            this.searchProducts();
            
            // Test clear
            this.clearProductSearch();
        }
    }

    testClearButton() {
        console.log('🧪 Testing clear button...');
        console.log('  Clear button element:', this.clearSearchBtn);
        
        // Set some text first
        if (this.productSearchInput) {
            this.productSearchInput.value = 'test search';
            console.log('  Set search to:', this.productSearchInput.value);
            
            // Trigger click event on clear button
            if (this.clearSearchBtn) {
                console.log('  Clicking clear button...');
                this.clearSearchBtn.click();
                console.log('  Value after click:', this.productSearchInput.value);
            } else {
                console.error('  ❌ Clear button not found!');
            }
        }
    }

    initializeDefaultCategories() {
        if (this.categories.length === 0) {
            this.categories = [
                {id: 'cat_001', name: 'produce', emoji: '🥬', order: 0, isDefault: true},
                {id: 'cat_002', name: 'dairy', emoji: '🥛', order: 1, isDefault: true},
                {id: 'cat_003', name: 'meat', emoji: '🥩', order: 2, isDefault: true},
                {id: 'cat_004', name: 'pantry', emoji: '🥫', order: 3, isDefault: true},
                {id: 'cat_005', name: 'frozen', emoji: '🧊', order: 4, isDefault: true},
                {id: 'cat_006', name: 'bakery', emoji: '🍞', order: 5, isDefault: true},
                {id: 'cat_007', name: 'other', emoji: '📦', order: 6, isDefault: true}
            ];
            this.saveCategories();
        } else {
            // Migration: Fix existing categories that have name-based IDs
            this.migrateCategoryIds();
        }
    }

    migrateCategoryIds() {
        console.log('🔄 Checking for category ID migration...');
        let needsMigration = false;
        const idMapping = {};
        
        this.categories.forEach((cat, index) => {
            if (cat.id === cat.name) {
                const oldId = cat.id;
                const newId = `cat_${String(index + 1).padStart(3, '0')}`;
                cat.id = newId;
                idMapping[oldId] = newId;
                needsMigration = true;
                console.log(`📝 Migrating category "${oldId}" -> "${newId}"`);
            }
        });
        
        if (needsMigration) {
            console.log('🔄 Migrating category references in all data...');
            
            // Update shopping items
            this.shoppingListManager.getAllItems().forEach(item => {
                if (idMapping[item.category]) {
                    item.category = idMapping[item.category];
                }
            });
            
            // Update pantry items
            this.standardItems.forEach(item => {
                if (idMapping[item.category]) {
                    item.category = idMapping[item.category];
                }
            });
            
            // Update all products
            this.allProducts.forEach(product => {
                if (idMapping[product.category]) {
                    product.category = idMapping[product.category];
                }
            });
            
            // Save all updated data
            this.saveCategories();
            this.saveShoppingItems();
            this.saveStandardItems();
            this.saveAllProducts();
            
            console.log('✅ Category migration completed!');
        }
    }

    findOrphanedProducts() {
        const validCategoryIds = new Set(this.categories.map(cat => cat.id));
        return this.allProducts.filter(product => !validCategoryIds.has(product.category));
    }

    fixOrphanedProduct(productId, newCategoryId) {
        const product = this.allProducts.find(p => p.id === productId);
        if (product) {
            console.log(`🔧 Fixing orphaned product "${product.name}": ${product.category} -> ${newCategoryId}`);
            product.category = newCategoryId;
            this.saveAllProducts();
            this.render();
        }
    }

    deleteOrphanedProduct(productId) {
        if (confirm('Are you sure you want to delete this orphaned product? This cannot be undone.')) {
            this.allProducts = this.allProducts.filter(p => p.id !== productId);
            this.saveAllProducts();
            this.render();
        }
    }

    initializeElements() {
        // Header elements
        this.refreshBtn = document.getElementById('refreshBtn');
        
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
        this.clearProductFiltersBtn = document.getElementById('clearProductFiltersBtn');
        this.productAiSuggestBtn = document.getElementById('productAiSuggestBtn');

        // Recipe elements
        this.recipeSearchInput = document.getElementById('recipeSearchInput');
        this.clearRecipeSearchBtn = document.getElementById('clearRecipeSearchBtn');
        this.recipeNameInput = document.getElementById('recipeNameInput');
        this.addRecipeBtn = document.getElementById('addRecipeBtn');
        this.recipesList = document.getElementById('recipesList');
        this.recipeCount = document.getElementById('recipeCount');
        this.filteredRecipeCount = document.getElementById('filteredRecipeCount');
        
        // Recipe filter elements
        this.cuisineFilter = document.getElementById('cuisineFilter');
        this.mainIngredientFilter = document.getElementById('mainIngredientFilter');
        this.seasonFilter = document.getElementById('seasonFilter');
        this.stockFilter = document.getElementById('stockFilter');
        this.clearFiltersBtn = document.getElementById('clearFiltersBtn');
        this.aiSuggestBtn = document.getElementById('aiSuggestBtn');

        // Meal planning elements
        this.prevWeekBtn = document.getElementById('prevWeekBtn');
        this.nextWeekBtn = document.getElementById('nextWeekBtn');
        this.currentWeekRange = document.getElementById('currentWeekRange');
        this.mealCalendar = document.getElementById('mealCalendar');
        this.generateShoppingListBtn = document.getElementById('generateShoppingListBtn');
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
        this.imageFileInput = document.getElementById('imageFileInput');
        this.imagePreview = document.getElementById('imagePreview');
        this.previewImage = document.getElementById('previewImage');
        this.removeImageBtn = document.getElementById('removeImageBtn');
        this.downloadImageUrlBtn = document.getElementById('downloadImageUrlBtn');
        
        // Image settings elements
        this.imagesFolderPath = document.getElementById('imagesFolderPath');
        this.testImagePathBtn = document.getElementById('testImagePathBtn');
        
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
        document.getElementById('testModalBtn').addEventListener('click', () => this.testModal());
        
        // Shopping list events
        this.addBtn.addEventListener('click', () => {
            const name = this.itemInput.value.trim();
            if (!name) return;
            this.shoppingListManager.smartAddItem(name);
            this.itemInput.value = '';
            this.shoppingListManager.refreshDisplay();
        });
        this.itemInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const name = this.itemInput.value.trim();
                if (!name) return;
                this.shoppingListManager.smartAddItem(name);
                this.itemInput.value = '';
                this.shoppingListManager.refreshDisplay();
            }
        });

        // Pantry events
        this.addStandardBtn.addEventListener('click', () => {
            const itemName = this.standardItemInput.value.trim();
            const category = this.standardCategorySelect.value;
            if (!itemName) {
                this.standardItemInput.focus();
                return;
            }
            window.realPantryManager.addItem(itemName, category);
            this.standardItemInput.value = '';
            this.standardItemInput.focus();
            window.realPantryManager.refreshDisplay();
        });
        this.standardItemInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const itemName = this.standardItemInput.value.trim();
                const category = this.standardCategorySelect.value;
                if (!itemName) {
                    this.standardItemInput.focus();
                    return;
                }
                window.realPantryManager.addItem(itemName, category);
                this.standardItemInput.value = '';
                this.standardItemInput.focus();
                window.realPantryManager.refreshDisplay();
            }
        });
        this.addAllUnstockedBtn.addEventListener('click', () => this.shoppingListManager.addAllUnstockedToShopping());

        // Category events
        this.addCategoryBtn.addEventListener('click', () => {
            const name = this.categoryInput.value.trim();
            const emoji = this.categoryEmojiInput.value.trim() || '🏷️';
            if (!name) {
                this.categoryInput.focus();
                return;
            }
            window.realProductsCategoriesManager.addCategory(name, emoji);
            this.categoryInput.value = '';
            this.categoryEmojiInput.value = '';
            window.realProductsCategoriesManager.updateCategorySelects();
            this.renderCategoriesList();
        });
        this.categoryInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const name = this.categoryInput.value.trim();
                const emoji = this.categoryEmojiInput.value.trim() || '🏷️';
                if (!name) {
                    this.categoryInput.focus();
                    return;
                }
                window.realProductsCategoriesManager.addCategory(name, emoji);
                this.categoryInput.value = '';
                this.categoryEmojiInput.value = '';
                window.realProductsCategoriesManager.updateCategorySelects();
                this.renderCategoriesList();
            }
        });

        // Products events
        this.addProductBtn.addEventListener('click', () => {
            const productName = this.productInput.value.trim();
            const category = this.productCategorySelect.value;
            if (!productName) {
                this.productInput.focus();
                return;
            }
            const newProduct = window.realProductsCategoriesManager.addProduct(productName, category);
            if (newProduct) {
                this.productInput.value = '';
                this.productInput.focus();
                this.renderProductsList();
            }
        });
        this.productInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const productName = this.productInput.value.trim();
                const category = this.productCategorySelect.value;
                if (!productName) {
                    this.productInput.focus();
                    return;
                }
                const newProduct = window.realProductsCategoriesManager.addProduct(productName, category);
                if (newProduct) {
                    this.productInput.value = '';
                    this.productInput.focus();
                    this.renderProductsList();
                }
            }
        });
        this.productSearchInput.addEventListener('input', () => this.searchProducts());
        this.clearSearchBtn.addEventListener('click', () => this.clearProductSearch());
        
        // Product filter events
        this.stockStatusFilter.addEventListener('change', () => this.applyProductFilters());
        this.clearProductFiltersBtn.addEventListener('click', () => this.clearProductFilters());
        this.productAiSuggestBtn.addEventListener('click', () => this.generateProductAIRecipes());

        // Recipe events
        this.recipeSearchInput.addEventListener('input', () => {
            const term = this.recipeSearchInput.value.trim().toLowerCase();
            window.realRecipesManager.renderRecipesList(term);
        });
        this.clearRecipeSearchBtn.addEventListener('click', () => {
            this.recipeSearchInput.value = '';
            window.realRecipesManager.applyRecipeFilters();
        });
        this.addRecipeBtn.addEventListener('click', () => {
            const recipeName = this.recipeNameInput.value.trim();
            const newRecipe = window.realRecipesManager.addRecipe(recipeName);
            if (newRecipe) {
                this.recipeNameInput.value = '';
                window.realRecipesManager.renderRecipes();
                window.realRecipesManager.openRecipeEditModal(newRecipe.id);
            }
        });
        this.recipeNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const recipeName = this.recipeNameInput.value.trim();
                const newRecipe = window.realRecipesManager.addRecipe(recipeName);
                if (newRecipe) {
                    this.recipeNameInput.value = '';
                    window.realRecipesManager.renderRecipes();
                    window.realRecipesManager.openRecipeEditModal(newRecipe.id);
                }
            }
        });

        // Recipe filter events
        this.cuisineFilter.addEventListener('change', () => window.realRecipesManager.applyRecipeFilters());
        this.mainIngredientFilter.addEventListener('change', () => window.realRecipesManager.applyRecipeFilters());
        this.seasonFilter.addEventListener('change', () => window.realRecipesManager.applyRecipeFilters());
        this.stockFilter.addEventListener('change', () => window.realRecipesManager.applyRecipeFilters());
        this.clearFiltersBtn.addEventListener('click', () => window.realRecipesManager.clearRecipeFilters());
        this.aiSuggestBtn.addEventListener('click', () => window.realRecipesManager.generateAIRecipes());

        // Meal planning events
        this.prevWeekBtn.addEventListener('click', () => this.navigateWeek(-1));
        this.nextWeekBtn.addEventListener('click', () => this.navigateWeek(1));
        this.generateShoppingListBtn.addEventListener('click', () => this.shoppingListManager.addAllUnstockedToShopping());
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

        // Recipe selection modal events
        this.confirmRecipeSelectionBtn.addEventListener('click', () => this.confirmRecipeSelection());
        this.cancelRecipeSelectionBtn.addEventListener('click', () => this.closeRecipeSelectionModal());
        this.closeRecipeSelectionModalBtn.addEventListener('click', () => this.closeRecipeSelectionModal());
        this.recipeSelectionSearch.addEventListener('input', () => this.filterRecipeSelection());
        this.clearRecipeSelectionSearchBtn.addEventListener('click', () => this.clearRecipeSelectionSearch());
        this.recipeSelectionModal.addEventListener('click', (e) => {
            if (e.target === this.recipeSelectionModal) {
                this.closeRecipeSelectionModal();
            }
        });

        // Recipe planning modal events - DISABLED: Using working modal instead
        // this.confirmRecipePlanningBtn.addEventListener('click', () => this.confirmRecipePlanning());
        // this.cancelRecipePlanningBtn.addEventListener('click', () => this.closeRecipePlanningModal());
        // this.closeRecipePlanningModalBtn.addEventListener('click', () => this.closeRecipePlanningModal());
        this.planningDate.addEventListener('change', () => this.updatePlanningPreview());
        
        // Listen for meal type radio button changes
        document.addEventListener('change', (e) => {
            if (e.target.name === 'mealType') {
                this.updatePlanningPreview();
            }
        });
        
        this.recipePlanningModal.addEventListener('click', (e) => {
            if (e.target === this.recipePlanningModal) {
                this.closeRecipePlanningModal();
            }
        });

        // Shopping list modal events
        this.confirmShoppingListBtn.addEventListener('click', () => this.confirmShoppingListGeneration());
        this.cancelShoppingListBtn.addEventListener('click', () => this.closeShoppingListModal());
        this.closeShoppingListModalBtn.addEventListener('click', () => this.closeShoppingListModal());
        
        // Product recipes modal events
        this.closeProductRecipesModalBtn.addEventListener('click', () => this.closeProductRecipesModal());
        this.closeProductRecipesBtn.addEventListener('click', () => this.closeProductRecipesModal());
        
        // Close modal when clicking outside
        this.productRecipesModal.addEventListener('click', (e) => {
            if (e.target === this.productRecipesModal) {
                this.closeProductRecipesModal();
            }
        });
        
        
        // Listen for time range radio button changes
        document.addEventListener('change', (e) => {
            if (e.target.name === 'timeRange') {
                this.updateShoppingPreview();
            }
        });
        
        this.shoppingListModal.addEventListener('click', (e) => {
            if (e.target === this.shoppingListModal) {
                this.closeShoppingListModal();
            }
        });

        // CSV events
        this.importCsvBtn.addEventListener('click', () => this.csvFileInput.click());
        this.downloadCsvTemplateBtn.addEventListener('click', () => this.downloadCsvTemplate());
        this.showCsvTextBtn.addEventListener('click', () => this.showCsvTextInput());
        this.importCsvTextBtn.addEventListener('click', () => window.realJsonImportExportManager.importCsvFromText());
        this.cancelCsvTextBtn.addEventListener('click', () => this.hideCsvTextInput());
        
        // Recipe CSV events (single file)
        this.importRecipeCsvBtn.addEventListener('click', () => this.recipeCsvFileInput.click());
        this.downloadRecipeCsvTemplateBtn.addEventListener('click', () => this.downloadRecipeCsvTemplate());
        this.recipeCsvFileInput.addEventListener('change', (e) => this.handleRecipeCsvImport(e));
        
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
        this.closeProductModalBtn.addEventListener('click', () => this.closeProductEditModal());
        this.cancelProductEditBtn.addEventListener('click', () => this.closeProductEditModal());
        this.confirmProductEditBtn.addEventListener('click', () => this.confirmProductEdit());

        // Recipe edit modal events
        this.closeRecipeModalBtn.addEventListener('click', () => this.closeRecipeEditModal());
        this.cancelRecipeEditBtn.addEventListener('click', () => this.closeRecipeEditModal());
        this.confirmRecipeEditBtn.addEventListener('click', () => this.confirmRecipeEdit());
        this.planRecipeFromModalBtn.addEventListener('click', () => this.planRecipeFromModal());
        this.maximizeRecipeModalBtn.addEventListener('click', () => this.toggleMaximizeRecipeModal());
        this.addIngredientBtn.addEventListener('click', () => this.addIngredientToRecipe());
        this.convertIngredientsBtn.addEventListener('click', () => this.convertIngredientsTextToStructured());
        
        // Recipe image events
        this.browseImageBtn.addEventListener('click', () => this.browseForImage());
        this.imageFileInput.addEventListener('change', (e) => this.handleImageSelection(e));
        this.removeImageBtn.addEventListener('click', () => this.removeImage());
        this.editRecipeImage.addEventListener('input', () => this.updateImagePreview());
        this.downloadImageUrlBtn.addEventListener('click', () => this.downloadCurrentImageUrl());
        
        // Image settings events
        this.testImagePathBtn.addEventListener('click', () => this.testImagePath());
        
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
            alert(`🖱️ CLICK DETECTED on: ${e.target.tagName} ${e.target.className}`);
            console.log('🖱️ Click detected on search results area:', e.target);
            console.log('🔍 Current search results innerHTML:', this.ingredientProductResults.innerHTML);
            
            // Handle create product option clicks
            if (e.target.closest('.create-product-option')) {
                alert('✅ CREATE OPTION FOUND - about to call function');
                e.preventDefault();
                e.stopPropagation();
                const createOption = e.target.closest('.create-product-option');
                const productName = createOption.dataset.productName;
                console.log('🖱️ Create option clicked via delegation, productName:', productName);
                console.log('🔧 About to call createNewProductFromSearch...');
                
                // Extra debugging
                console.log('📊 Pre-creation state check:', {
                    functionsExists: typeof this.createNewProductFromSearch === 'function',
                    modalExists: !!document.getElementById('productEditModal'),
                    currentProducts: this.allProducts.length
                });
                
                this.createNewProductFromSearch(productName);
                return;
            } else {
                alert('❌ CREATE OPTION NOT FOUND in clicked element');
            }
            
            // Handle regular product selection clicks
            if (e.target.closest('.search-result-item')) {
                e.preventDefault();
                e.stopPropagation();
                const resultItem = e.target.closest('.search-result-item');
                const productId = resultItem.dataset.productId;
                console.log('🖱️ Product selected via delegation, productId:', productId);
                this.selectProduct(productId);
            }
        });
        
        // Close modal when clicking outside
        this.changeCategoryModal.addEventListener('click', (e) => {
            if (e.target === this.changeCategoryModal) {
                this.closeModal();
            }
        });
        
        this.productEditModal.addEventListener('click', (e) => {
            if (e.target === this.productEditModal) {
                this.closeProductEditModal();
            }
        });

        this.recipeEditModal.addEventListener('click', (e) => {
            if (e.target === this.recipeEditModal) {
                this.closeRecipeEditModal();
            }
        });

        // Add force sync button functionality (if present)
        const forceSyncBtn = document.getElementById('forceSyncBtn');
        if (forceSyncBtn) {
            forceSyncBtn.addEventListener('click', () => this.forceFullSync());
        }
    }

    // Products Methods
    searchProducts(query = null) {
        // If no query provided, read from the search input
        const searchTerm = query !== null ? query : (this.productSearchInput ? this.productSearchInput.value : '');
        console.log('🔍 Product search triggered, search term:', searchTerm);
        
        // For the main product list search, just re-render (the render method handles filtering)
        if (query === null) {
            this.render();
            return;
        }
        
        // For ingredient search (when query is provided), use the existing logic
        if (!query || query.length < 1) {
            this.hideSearchResults();
            return;
        }

        const searchTermLower = query.toLowerCase();
        const matchingProducts = this.allProducts.filter(product => {
            // Get the actual category name from the ID
            const category = this.categories.find(cat => cat.id === product.category);
            const categoryName = category ? category.name.toLowerCase() : '';
            
            return product.name.toLowerCase().includes(searchTermLower) ||
                   categoryName.includes(searchTermLower);
        }).slice(0, 10); // Limit to 10 results

        console.log('📊 Search results:', {
            query: searchTermLower,
            totalProducts: this.allProducts.length,
            matchingProducts: matchingProducts.length,
            results: matchingProducts.map(p => p.name)
        });

        if (matchingProducts.length === 0) {
            this.showNoResultsMessage(query);
            return;
        }

        this.showSearchResults(matchingProducts, query);
    }

    // Separate method for ingredient search in recipes
    searchProductsForIngredients(query) {
        console.log('🔍 Searching products for ingredients, query:', query);
        
        if (!query || query.length < 1) {
            this.hideSearchResults();
            return;
        }

        const searchTerm = query.toLowerCase();
        const matchingProducts = this.allProducts.filter(product => {
            // Get the actual category name from the ID
            const category = this.categories.find(cat => cat.id === product.category);
            const categoryName = category ? category.name.toLowerCase() : '';
            
            return product.name.toLowerCase().includes(searchTerm) ||
                   categoryName.includes(searchTerm);
        }).slice(0, 10); // Limit to 10 results

        console.log('📊 Ingredient search results:', {
            query: searchTerm,
            totalProducts: this.allProducts.length,
            matchingProducts: matchingProducts.length,
            results: matchingProducts.map(p => p.name)
        });

        if (matchingProducts.length === 0) {
            this.showNoResultsMessage(query);
            return;
        }

        this.displaySearchResults(matchingProducts);
    }

    clearProductSearch() {
        console.log('🧹 Clearing product search');
        if (this.productSearchInput) {
            this.productSearchInput.value = '';
            console.log('🔍 Search input after clear:', this.productSearchInput.value);
            this.render();
        } else {
            console.error('❌ productSearchInput element not found!');
        }
    }

    searchRecipes() {
        const searchTerm = this.recipeSearchInput ? this.recipeSearchInput.value.trim().toLowerCase() : '';
        window.realRecipesManager.renderRecipesList(searchTerm);
    }

    clearRecipeSearch() {
        if (this.recipeSearchInput) {
            this.recipeSearchInput.value = '';
            window.realRecipesManager.applyRecipeFilters();
        } else {
            console.error('❌ recipeSearchInput element not found!');
        }
    }

    // Recipe Methods
    addRecipe() {
        const recipeName = this.recipeNameInput.value.trim();
        const newRecipe = window.realRecipesManager.addRecipe(recipeName);
        if (newRecipe) {
            this.recipeNameInput.value = '';
            window.realRecipesManager.renderRecipes();
            window.realRecipesManager.openRecipeEditModal(newRecipe.id);
        }
    }

    editRecipe(recipeId) {
        window.realRecipesManager.openRecipeEditModal(recipeId);
    }

    deleteRecipe(recipeId) {
        window.realRecipesManager.deleteRecipe(recipeId);
    }

    openRecipeEditModal(recipe) {
        if (recipe && recipe.id) {
            window.realRecipesManager.openRecipeEditModal(recipe.id);
        } else if (typeof recipe === 'number') {
            window.realRecipesManager.openRecipeEditModal(recipe);
        }
    }

    closeRecipeEditModal() {
        if (window.realRecipesManager && window.realRecipesManager.closeRecipeEditModal) {
            window.realRecipesManager.closeRecipeEditModal();
        }
    }

    planRecipeFromModal() {
        if (!this.currentEditingRecipe) {
            console.error('No recipe is currently being edited');
            return;
        }

        // Store the recipe ID before closing the modal
        const recipeId = this.currentEditingRecipe.id;
        
        // Close the recipe edit modal first
        this.closeRecipeEditModal();
        
        // Open the recipe planning modal with the current recipe
        this.planRecipe(recipeId);
    }

    toggleMaximizeRecipeModal() {
        const modal = this.recipeEditModal;
        const isMaximized = modal.classList.contains('maximized');
        
        if (isMaximized) {
            modal.classList.remove('maximized');
            this.maximizeRecipeModalBtn.innerHTML = '⛶';
            this.maximizeRecipeModalBtn.title = 'Maximize';
        } else {
            modal.classList.add('maximized');
            this.maximizeRecipeModalBtn.innerHTML = '🗗';
            this.maximizeRecipeModalBtn.title = 'Restore';
        }
    }

    confirmRecipeEdit() {
        if (!this.currentEditingRecipe) return;

        const recipe = this.currentEditingRecipe;
        const newName = this.editRecipeName.value.trim();
        const newDescription = this.editRecipeDescription.value.trim();
        const newPreparation = this.editRecipePreparation.value.trim();

        if (!newName) {
            alert('Recipe name cannot be empty');
            return;
        }

        // Check for duplicate names (excluding current recipe)
        const duplicateRecipe = this.recipes.find(r => 
            r.id !== recipe.id && r.name.toLowerCase() === newName.toLowerCase()
        );

        if (duplicateRecipe) {
            alert('A recipe with this name already exists');
            return;
        }

        // Update recipe
        recipe.name = newName;
        recipe.description = newDescription;
        recipe.preparation = newPreparation;
        recipe.ingredients = [...this.currentRecipeIngredients];
        recipe.ingredientsText = this.editRecipeIngredientsText.value.trim();
        recipe.persons = parseInt(this.recipePersons.value) || 4;
        
        // Update metadata
        if (!recipe.metadata) {
            recipe.metadata = {};
        }
        recipe.metadata.cuisine = this.editRecipeCuisine.value.trim();
        recipe.metadata.mainIngredient = this.editRecipeMainIngredient.value.trim();
        recipe.metadata.season = this.editRecipeSeason.value;
        
        // Update image
        recipe.image = this.editRecipeImage.value.trim();

        this.saveRecipes();
        this.closeRecipeEditModal();
        this.render();
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
        console.log('🤖 Converting ingredients text to structured format...');
        
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
                    console.log(`⚠️ Ingredient ${parsedIng.productName} already exists in recipe`);
                }
            } else {
                console.log(`⚠️ No matching product found for: ${parsedIng.productName}`);
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
        
        console.log(`🤖 Conversion complete: ${addedCount} added, ${skippedCount} skipped`);
    }

    parseIngredientsText(text) {
        console.log('🔍 Parsing ingredients text:', text);
        
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
                        console.log(`✅ Parsed: ${quantity} ${unit} ${productName}`);
                    }
                    break;
                }
            }
        });
        
        console.log(`🔍 Parsed ${parsedIngredients.length} ingredients`);
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
        if (!this.ingredientsList || !this.currentRecipeIngredients) return;

        if (this.currentRecipeIngredients.length === 0) {
            this.ingredientsList.innerHTML = '<p style="color: #7f8c8d; text-align: center; margin: 10px 0;">No ingredients added yet</p>';
            return;
        }

        const html = this.currentRecipeIngredients.map(ingredient => {
            // Simple and robust product lookup
            const product = this.allProducts.find(p => p.id == ingredient.productId); // Use == for loose equality
            const productName = product ? product.name : `Unknown Product (ID: ${ingredient.productId})`;
            
            return `
                <div class="ingredient-item">
                    <div class="ingredient-info">
                        <div class="ingredient-name">${this.escapeHtml(productName)}</div>
                        <div class="ingredient-amount">${ingredient.quantity} ${ingredient.unit}</div>
                    </div>
                    <button class="ingredient-remove" onclick="app.removeIngredientFromRecipe('${ingredient.productId}')" title="Remove ingredient">×</button>
                </div>
            `;
        }).join('');

        this.ingredientsList.innerHTML = html;
    }

    // Product search methods for ingredient selection

    displaySearchResults(products) {
        console.log('🔍 displaySearchResults called with:', {
            productsCount: products.length,
            searchTerm: this.ingredientProductSearch?.value?.trim(),
            resultsContainerExists: !!this.ingredientProductResults
        });
        
        if (!this.ingredientProductResults) {
            console.error('❌ ingredientProductResults element not found!');
            return;
        }
        
        const searchTerm = this.ingredientProductSearch.value.trim();

        if (products.length === 0 && searchTerm) {
            console.log('🔍 No products found, showing create option for:', searchTerm);
            
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
            console.log('✅ Create option HTML set:', createOptionHTML);
            
            // Note: Click handling is done through event delegation in attachEventListeners()
        } else {
            const html = products.map((product, index) => {
                const categoryData = this.categories.find(cat => cat.id === product.category);
                const categoryName = categoryData ? categoryData.name : product.category;
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
        const product = this.allProducts.find(p => p.id == productId);
        if (product) {
            this.ingredientProductSearch.value = product.name;
            this.selectedProductId.value = productId;
            this.hideSearchResults();
            this.ingredientQuantity.focus();
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
        console.log('🧹 Clearing product search');
        this.ingredientProductSearch.value = '';
        this.selectedProductId.value = '';
        this.hideSearchResults();
        this.currentHighlightIndex = -1;
    }

    resetRecipeCreationState() {
        console.log('🔄 Fully resetting recipe creation state');
        this.creatingProductForRecipe = false;
        this.pendingIngredientName = null;
        this.currentEditingProduct = null;
        this.isCreatingNewProduct = false;
        console.log('✅ Recipe creation state fully reset');
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
        console.log('🆕 createNewProductFromSearch called for:', productName);
        console.log('📊 Current state before creation:', {
            creatingProductForRecipe: this.creatingProductForRecipe,
            pendingIngredientName: this.pendingIngredientName,
            currentEditingProduct: this.currentEditingProduct,
            isCreatingNewProduct: this.isCreatingNewProduct,
            productModalDisplay: this.productEditModal?.style.display,
            recipeModalDisplay: this.recipeEditModal?.style.display
        });
        
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
        
        console.log('📝 New product template:', newProduct);
        
        // Hide search results
        this.hideSearchResults();
        
        // Open product edit modal for the new product
        console.log('🚀 About to open product edit modal...');
        this.openProductEditModal(newProduct, true); // true = isNewProduct
        
        // Verify modal opened
        setTimeout(() => {
            const isVisible = this.productEditModal.style.display === 'block';
            console.log('⏱️ Modal visibility check:', isVisible ? 'VISIBLE' : 'NOT VISIBLE');
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
        const shoppingItems = this.shoppingListManager.getAllItems();
        shoppingItems.forEach(shoppingItem => {
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

        // Add pantry items to products if they don't exist
        this.standardItems.forEach(standardItem => {
            const existingProduct = this.allProducts.find(product => 
                product.name.toLowerCase() === standardItem.name.toLowerCase() && 
                product.category === standardItem.category
            );

            if (!existingProduct) {
                const newProduct = {
                    id: Date.now() + Math.random(),
                    name: standardItem.name,
                    category: standardItem.category,
                    inShopping: false,
                    inPantry: true,
                    inStock: standardItem.inStock !== undefined ? standardItem.inStock : true,
                    inSeason: standardItem.inSeason !== undefined ? standardItem.inSeason : true,
                    completed: false,
                    dateAdded: standardItem.dateAdded || new Date().toISOString()
                };
                this.allProducts.push(newProduct);
                hasChanges = true;
            } else {
                // Update existing product to reflect pantry status
                existingProduct.inPantry = true;
                existingProduct.inStock = standardItem.inStock !== undefined ? standardItem.inStock : true;
                existingProduct.inSeason = standardItem.inSeason !== undefined ? standardItem.inSeason : true;
                hasChanges = true;
            }
        });

        if (hasChanges) {
            this.saveAllProducts();
            console.log('🔄 Synced products with existing shopping and pantry items');
        }
    }

    syncListsFromProducts() {
        // Update shopping list via manager
        if (this.shoppingListManager) {
            this.shoppingListManager.syncListsFromProducts();
        }

        // Update pantry list from products
        this.standardItems = this.allProducts
            .filter(product => product.inPantry)
            .map(product => ({
                id: product.id,
                name: product.name,
                category: product.category,
                inStock: product.inStock || false,
                inSeason: product.inSeason !== false,
                dateAdded: product.dateAdded
            }));

        this.saveStandardItems();
        console.log('🔄 Synced pantry list from products');
    }

    getCategoryOrder() {
        return this.categories.sort((a, b) => a.order - b.order).map(cat => cat.id);
    }

    // Item Category Change Methods
    openCategoryChangeModal(itemId, itemType) {
        let item;
        
        if (itemType === 'shopping') {
            item = this.shoppingItems.find(i => i.id === itemId);
        } else if (itemType === 'standard') {
            item = this.standardItems.find(i => i.id === itemId);
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
            this.saveShoppingItems();
        } else if (type === 'standard') {
            this.saveStandardItems();
        } else if (type === 'product') {
            this.saveAllProducts();
            // Also sync lists to ensure shopping and pantry items get updated categories
            this.syncListsFromProducts();
            
            // Auto-sync product category change to Firebase if connected
            if (window.db && this.unsubscribeFirebase) {
                console.log('🔄 Auto-syncing product category change to Firebase...');
                this.syncSingleProductToFirebase(item);
            }
        }

        this.closeModal();
        this.render();
    }

    openProductEditModal(product, isNewProduct = false) {
        console.log('🔧 Opening product edit modal:', { product, isNewProduct });
        
        // Re-fetch modal element to ensure it's still available
        const modalElement = document.getElementById('productEditModal');
        if (!modalElement) {
            console.error('❌ productEditModal element not found in DOM!');
            return;
        }
        
        // Update the reference in case it was lost
        this.productEditModal = modalElement;
        
        this.currentEditingProduct = product;
        this.isCreatingNewProduct = isNewProduct;
        
        // Update modal title based on context
        const modalTitle = this.productEditModal.querySelector('.modal-title');
        if (modalTitle) {
            modalTitle.textContent = isNewProduct ? 'Create New Product' : 'Edit Product';
        }
        
        // Ensure form elements are still available
        this.editProductName = document.getElementById('editProductName');
        this.editProductCategory = document.getElementById('editProductCategory');
        this.editInShopping = document.getElementById('editInShopping');
        this.editInPantry = document.getElementById('editInPantry');
        this.editInStock = document.getElementById('editInStock');
        this.editInSeason = document.getElementById('editInSeason');
        
        if (!this.editProductName || !this.editProductCategory) {
            console.error('❌ Form elements not found in DOM!');
            return;
        }
        
        // Populate modal fields with current product data
        this.editProductName.value = product.name;
        this.editProductCategory.value = product.category;
        this.editInShopping.checked = product.inShopping || false;
        this.editInPantry.checked = product.inPantry || false;
        this.editInStock.checked = product.inStock || false;
        this.editInSeason.checked = product.inSeason !== false; // Default to true if not set
        
        // Clear all modal styles and classes to start fresh
        this.productEditModal.removeAttribute('class');
        this.productEditModal.removeAttribute('style');
        this.productEditModal.className = 'modal';
        
        // Force modal to be visible with aggressive styles
        this.productEditModal.style.setProperty('display', 'block', 'important');
        this.productEditModal.style.setProperty('position', 'fixed', 'important');
        this.productEditModal.style.setProperty('top', '0', 'important');
        this.productEditModal.style.setProperty('left', '0', 'important');
        this.productEditModal.style.setProperty('width', '100%', 'important');
        this.productEditModal.style.setProperty('height', '100%', 'important');
        this.productEditModal.style.setProperty('z-index', '999999', 'important');
        this.productEditModal.style.setProperty('background-color', 'rgba(0,0,0,0.7)', 'important');
        this.productEditModal.style.setProperty('opacity', '1', 'important');
        this.productEditModal.style.setProperty('visibility', 'visible', 'important');
        
        // Add a special class when opened from recipe context
        if (this.creatingProductForRecipe) {
            this.productEditModal.classList.add('product-from-recipe');
            this.productEditModal.style.setProperty('z-index', '9999999', 'important');
        }
        
        // Force the modal to the front of the stacking context
        document.body.appendChild(this.productEditModal);
        
        console.log('📋 Product modal forced visible:', {
            display: this.productEditModal.style.display,
            zIndex: this.productEditModal.style.zIndex,
            classList: this.productEditModal.classList.toString(),
            elementExists: !!this.productEditModal,
            isConnected: this.productEditModal.isConnected
        });
    }

    closeProductEditModal() {
        console.log('🚪 Closing product edit modal');
        console.log('📊 State before close:', {
            creatingProductForRecipe: this.creatingProductForRecipe,
            pendingIngredientName: this.pendingIngredientName,
            currentEditingProduct: this.currentEditingProduct,
            isCreatingNewProduct: this.isCreatingNewProduct
        });
        
        this.productEditModal.style.display = 'none';
        this.productEditModal.classList.remove('product-from-recipe');
        this.currentEditingProduct = null;
        this.isCreatingNewProduct = false;
        
        // Reset recipe creation state if canceled
        this.resetRecipeCreationState();
        
        console.log('✅ Product modal closed, state reset');
    }

    selectProductForRecipe(product) {
        console.log('🎯 Selecting product for recipe:', product);
        
        // Auto-select the newly created product in the recipe search
        this.ingredientProductSearch.value = product.name;
        this.selectedProductId.value = product.id;
        
        // Reset the creation state
        this.resetRecipeCreationState();
        
        console.log('📊 State after reset:', {
            creatingProductForRecipe: this.creatingProductForRecipe,
            pendingIngredientName: this.pendingIngredientName,
            selectedProduct: { name: product.name, id: product.id }
        });
        
        // Focus on quantity field for smooth workflow
        setTimeout(() => {
            if (this.ingredientQuantity) {
                this.ingredientQuantity.focus();
            }
        }, 100);
    }

    confirmProductEdit() {
        if (!this.currentEditingProduct) return;

        const product = this.currentEditingProduct;
        const newName = this.editProductName.value.trim();
        const newCategory = this.editProductCategory.value;
        const newInShopping = this.editInShopping.checked;
        const newInPantry = this.editInPantry.checked;
        const newInStock = this.editInStock.checked;
        const newInSeason = this.editInSeason.checked;

        if (!newName) {
            alert('Product name cannot be empty');
            return;
        }

        // Check for duplicate names (excluding current product if editing)
        const existingProduct = this.allProducts.find(p => 
            p.id !== product.id && p.name.toLowerCase() === newName.toLowerCase()
        );
        
        if (existingProduct) {
            alert('A product with this name already exists');
            return;
        }

        // Update product with new values
        product.name = newName;
        product.category = newCategory;
        product.inShopping = newInShopping;
        product.inPantry = newInPantry;
        product.inStock = newInStock;
        product.inSeason = newInSeason;

        // If this is a new product, add it to the products list
        if (this.isCreatingNewProduct) {
            this.allProducts.push(product);
        }

        // Update shopping and pantry lists to sync with product changes
        this.syncListsFromProducts();
        
        this.saveAllProducts();
        this.saveShoppingItems();
        this.saveStandardItems();
        
        // If we're creating a product for a recipe, auto-select it
        if (this.creatingProductForRecipe && this.pendingIngredientName) {
            this.selectProductForRecipe(product);
        } else {
            // Clean up state if not for recipe
            this.resetRecipeCreationState();
        }
        
        // Auto-sync product update to Firebase if connected
        if (window.db && this.unsubscribeFirebase) {
            console.log('🔄 Auto-syncing product edit to Firebase...');
            this.syncSingleProductToFirebase(product);
        }

        this.closeProductEditModal();
        this.render();
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
            console.log('🗑️ Clearing week:', weekKey);
            
            // Set syncing flag to prevent listener interference
            this.firebaseSyncing = true;
            
            delete this.mealPlans[weekKey];
            this.saveMealPlans();
            
            // Sync deletion to Firebase  
            if (window.db) {
                try {
                    console.log('🔥 Syncing week deletion to Firebase...');
                    // Use the same collection name as the listener ('mealPlan' not 'mealPlans')
                    await window.db.collection('mealPlan').doc(weekKey).delete();
                    console.log('✅ Week successfully deleted from Firebase');
                } catch (error) {
                    console.error('❌ Failed to delete week from Firebase:', error);
                }
            }
            
            // Clear syncing flag
            this.firebaseSyncing = false;
            
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
        console.log('🍳 Recipe option selected:', { dayIndex, mealType });
        this.closeMealTypeModal();
        
        // Add a small delay to ensure the previous modal is fully closed
        setTimeout(() => {
            this.assignRecipeToSlot(dayIndex, mealType);
        }, 100);
    }

    selectSimpleMealOption() {
        const { dayIndex, mealType } = this.currentMealContext;
        console.log('🥘 Simple meal option selected:', { dayIndex, mealType });
        this.closeMealTypeModal();
        
        // Add a small delay to ensure the previous modal is fully closed
        setTimeout(() => {
            this.assignSimpleMealToSlot(dayIndex, mealType);
        }, 100);
    }

    selectTestRecipe(recipeId, recipeName) {
        console.log('🍳 Recipe selected:', { recipeId, recipeName });
        
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
        
        // Store context for later use
        this.currentMealSlot = { dayIndex, mealType };
        this.selectedRecipeId = null;
        
        this.openRecipeSelectionModal();
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
            console.log('🔄 updateSelectedDisplay called');
            console.log('🔄 Selected products:', Array.from(this.selectedMealProducts));
            
            const container = simpleMealModal.querySelector('#workingSelectedProducts');
            const saveBtn = simpleMealModal.querySelector('#saveSimpleMeal');
            
            console.log('🔄 Container found:', !!container);
            console.log('🔄 Save button found:', !!saveBtn);
            
            if (this.selectedMealProducts.size === 0) {
                console.log('🔄 No products selected - showing empty state');
                container.innerHTML = '<em style="color: #666;">No products selected yet</em>';
                saveBtn.disabled = true;
                saveBtn.style.background = '#6c757d';
            } else {
                console.log('🔄 Products selected - showing product list');
                const selectedArray = Array.from(this.selectedMealProducts);
                console.log('🔄 Selected array length:', selectedArray.length);
                
                const productNames = selectedArray.map(productId => {
                    const product = this.allProducts.find(p => p.id === productId);
                    console.log(`🔄 Product ID ${productId} -> Product:`, product ? product.name : 'NOT FOUND');
                    return product ? `
                        <span style="display: inline-block; background: #007bff; color: white; padding: 5px 10px; margin: 2px; border-radius: 15px; font-size: 14px;">
                            ${product.name} 
                            <button onclick="window.removeSimpleMealProduct(${productId})" style="background: none; border: none; color: white; margin-left: 5px; cursor: pointer; font-size: 16px;">×</button>
                        </span>
                    ` : '';
                }).filter(html => html !== '').join('');
                
                console.log('🔄 Generated HTML length:', productNames.length);
                container.innerHTML = productNames;
                saveBtn.disabled = false;
                saveBtn.style.background = '#28a745';
                console.log('🔄 Container updated successfully');
            }
        };
        
        // Add product selection functionality
        simpleMealModal.addEventListener('click', (e) => {
            console.log('🥘 Click detected:', e.target);
            console.log('🥘 Target classes:', e.target.className);
            console.log('🥘 Has working-product-item:', e.target.classList.contains('working-product-item'));
            
            // Check if clicked element or its parent is a product item
            const productItem = e.target.closest('.working-product-item');
            if (productItem) {
                console.log('🥘 Product item found:', productItem.dataset.productId);
                console.log('🥘 Raw dataset productId:', productItem.dataset.productId);
                
                const rawId = productItem.dataset.productId;
                const productId = parseFloat(rawId); // Use parseFloat instead of parseInt for decimal IDs
                console.log('🥘 Current selected products before:', Array.from(this.selectedMealProducts));
                console.log('🥘 Product ID type:', typeof productId, 'Value:', productId);
                console.log('🥘 Raw vs Parsed:', rawId, '->', productId);
                console.log('🥘 Has product?', this.selectedMealProducts.has(productId));
                
                if (this.selectedMealProducts.has(productId)) {
                    console.log('🥘 Deselecting product:', productId);
                    this.selectedMealProducts.delete(productId);
                    productItem.style.background = '#f8f9fa';
                    productItem.style.borderColor = '#ddd';
                } else {
                    console.log('🥘 Selecting product:', productId);
                    this.selectedMealProducts.add(productId);
                    productItem.style.background = '#e3f2fd';
                    productItem.style.borderColor = '#2196f3';
                }
                
                console.log('🥘 Current selected products after:', Array.from(this.selectedMealProducts));
                console.log('🥘 Set size:', this.selectedMealProducts.size);
                console.log('🥘 About to call updateSelectedDisplay...');
                updateSelectedDisplay();
            } else {
                console.log('🥘 No product item found');
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
            console.log('💾 Save button clicked');
            console.log('💾 Selected products count:', this.selectedMealProducts.size);
            console.log('💾 Selected products:', Array.from(this.selectedMealProducts));
            
            if (this.selectedMealProducts.size > 0) {
                const mealName = simpleMealModal.querySelector('#workingSimpleMealName').value || this.generateMealName();
                console.log('💾 Generated meal name:', mealName);
                
                const mealData = {
                    type: 'simple',
                    name: mealName,
                    products: Array.from(this.selectedMealProducts)
                };
                
                console.log('💾 Meal data to save:', mealData);
                console.log('💾 Saving to dayIndex:', dayIndex, 'mealType:', mealType);
                
                this.setMeal(dayIndex, mealType, mealData);
                
                delete window.removeSimpleMealProduct;
                document.body.removeChild(simpleMealModal);
                
                console.log('💾 Simple meal saved successfully!');
                alert(`✅ Simple meal "${mealName}" saved for ${mealType}!`);
            } else {
                console.log('💾 No products selected - showing alert');
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
        
        console.log('✅ Working simple meal builder created');
    }

    generateProductCategoriesHTML() {
        const validCategoryIds = new Set(this.categories.map(cat => cat.id));
        const validProducts = this.allProducts.filter(product => validCategoryIds.has(product.category));
        
        console.log('🥘 Generating products HTML:', validProducts.length, 'valid products');
        
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
            
            console.log(`🥘 Category ${category.name}:`, categoryProducts.length, 'products');
            
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
        
        console.log('🥘 Generated HTML length:', html.length);
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
        
        // Group products by category
        const groupedProducts = this.groupItemsByCategory(validProducts);
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
                                           onchange="app.toggleProductSelection(${product.id}, this.checked)">
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
                    <button class="remove-selected-product" onclick="app.removeProductFromSelection(${productId})">×</button>
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
        console.log('🍳 Opening working recipe selection modal...');
        
        const { dayIndex, mealType } = this.currentMealSlot;
        
        // Create a working recipe selection modal
        const workingRecipeModal = document.createElement('div');
        workingRecipeModal.id = 'workingRecipeModal';
        workingRecipeModal.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.7); z-index: 999999; display: flex; align-items: center; justify-content: center;">
                <div style="background: white; padding: 30px; border-radius: 10px; width: 600px; max-height: 80vh; overflow-y: auto; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h3 style="margin: 0; color: #333;">Select Recipe for ${mealType}</h3>
                        <button id="closeWorkingRecipeModal" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666; padding: 5px;">&times;</button>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <input type="text" id="workingRecipeSearch" placeholder="Search recipes..." style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; box-sizing: border-box;">
                    </div>
                    
                    <div id="workingRecipeList" style="max-height: 400px; overflow-y: auto; border: 1px solid #eee; border-radius: 5px;">
                        ${this.generateRecipeListHTML()}
                    </div>
                    
                    <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                        <button id="cancelWorkingRecipeSelection" style="padding: 10px 20px; border: 1px solid #95a5a6; background: #ecf0f1; color: #7f8c8d; border-radius: 5px; cursor: pointer;">Cancel</button>
                        <button id="confirmWorkingRecipeSelection" style="padding: 10px 20px; border: none; background: #3498db; color: white; border-radius: 5px; cursor: pointer;" disabled>Select Recipe</button>
                    </div>
                </div>
            </div>
        `;
        
        let selectedRecipeId = null;
        
        // Add search functionality
        const searchInput = workingRecipeModal.querySelector('#workingRecipeSearch');
        searchInput.oninput = (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const recipeItems = workingRecipeModal.querySelectorAll('.working-recipe-item');
            recipeItems.forEach(item => {
                const recipeName = item.dataset.recipeName.toLowerCase();
                const isVisible = recipeName.includes(searchTerm);
                item.style.display = isVisible ? 'block' : 'none';
            });
        };
        
        // Add recipe selection functionality
        workingRecipeModal.addEventListener('click', (e) => {
            console.log('🍳 Modal clicked:', e.target);
            console.log('🍳 Target classes:', e.target.className);
            console.log('🍳 Has working-recipe-item:', e.target.classList.contains('working-recipe-item'));
            
            // Check if clicked element or its parent is a recipe item
            const recipeItem = e.target.closest('.working-recipe-item');
            if (recipeItem) {
                console.log('🍳 Recipe item clicked:', recipeItem.dataset.recipeId);
                
                // Remove previous selection
                workingRecipeModal.querySelectorAll('.working-recipe-item').forEach(item => {
                    item.style.backgroundColor = '';
                    item.style.borderColor = '#ddd';
                });
                
                // Select this recipe
                recipeItem.style.backgroundColor = '#e3f2fd';
                recipeItem.style.borderColor = '#2196f3';
                selectedRecipeId = recipeItem.dataset.recipeId;
                
                console.log('🍳 Recipe selected:', selectedRecipeId);
                
                // Enable confirm button
                const confirmBtn = workingRecipeModal.querySelector('#confirmWorkingRecipeSelection');
                confirmBtn.disabled = false;
                confirmBtn.style.background = '#2196f3';
            }
        });
        
        // Add event listeners
        workingRecipeModal.querySelector('#closeWorkingRecipeModal').onclick = () => {
            document.body.removeChild(workingRecipeModal);
        };
        
        workingRecipeModal.querySelector('#cancelWorkingRecipeSelection').onclick = () => {
            document.body.removeChild(workingRecipeModal);
        };
        
        workingRecipeModal.querySelector('#confirmWorkingRecipeSelection').onclick = () => {
            if (selectedRecipeId) {
                console.log('🍳 Recipe confirmed:', selectedRecipeId);
                document.body.removeChild(workingRecipeModal);
                this.confirmRecipeToSlot(selectedRecipeId, dayIndex, mealType);
            }
        };
        
        // Click outside to close
        workingRecipeModal.onclick = (e) => {
            if (e.target === workingRecipeModal) {
                document.body.removeChild(workingRecipeModal);
            }
        };
        
        document.body.appendChild(workingRecipeModal);
        console.log('✅ Working recipe modal created and displayed');
    }

    generateRecipeListHTML() {
        if (this.recipes.length === 0) {
            return '<div style="padding: 20px; text-align: center; color: #666;">No recipes available. Add some recipes first!</div>';
        }
        
        return this.recipes.map(recipe => `
            <div class="working-recipe-item" data-recipe-id="${recipe.id}" data-recipe-name="${recipe.name}" 
                 style="padding: 15px; border: 1px solid #ddd; margin-bottom: 10px; border-radius: 5px; cursor: pointer; transition: all 0.2s;">
                <div style="font-weight: bold; font-size: 16px; margin-bottom: 5px;">${recipe.name}</div>
                ${recipe.description ? `<div style="color: #666; font-size: 14px; margin-bottom: 5px;">${recipe.description}</div>` : ''}
                <div style="font-size: 12px; color: #999;">
                    ${recipe.cuisine ? `${recipe.cuisine} • ` : ''}
                    ${recipe.mainIngredient ? `${recipe.mainIngredient} • ` : ''}
                    ${recipe.persons ? `${recipe.persons} persons` : ''}
                </div>
            </div>
        `).join('');
    }

    confirmRecipeToSlot(recipeId, dayIndex, mealType) {
        console.log('🔍 Looking for recipe:', recipeId, typeof recipeId);
        console.log('🔍 Available recipes:', this.recipes.map(r => ({ id: r.id, type: typeof r.id, name: r.name })).slice(0, 5));
        
        // Convert recipeId to number if it's a string (preserve decimals)
        const numericRecipeId = typeof recipeId === 'string' ? parseFloat(recipeId) : recipeId;
        console.log('🔍 Converted recipe ID:', numericRecipeId, typeof numericRecipeId);
        
        const recipe = this.recipes.find(r => r.id === numericRecipeId);
        console.log('🔍 Found recipe:', recipe ? recipe.name : 'NOT FOUND');
        
        if (!recipe) {
            alert('Recipe not found!');
            return;
        }
        
        // Use the old simple data format
        this.setMeal(dayIndex, mealType, { 
            type: 'recipe', 
            id: numericRecipeId 
        });
    }

    closeRecipeSelectionModal() {
        this.recipeSelectionModal.style.display = 'none';
        this.recipeSelectionModal.classList.remove('force-show');
        this.currentMealSlot = null;
        this.selectedRecipeId = null;
    }

    renderRecipeSelectionList(searchTerm = '') {
        if (!this.recipeSelectionList) return;
        
        let recipesToShow = this.recipes;
        
        // Apply search filter if provided  
        if (searchTerm) {
            recipesToShow = this.recipes.filter(recipe => {
                const recipeName = recipe.name.toLowerCase();
                const recipeDescription = (recipe.description || '').toLowerCase();
                const recipeCuisine = (recipe.metadata?.cuisine || '').toLowerCase();
                const recipeMainIngredient = (recipe.metadata?.mainIngredient || '').toLowerCase();
                const recipeSeason = (recipe.metadata?.season || '').toLowerCase();
                const recipeIngredientsText = (recipe.ingredientsText || '').toLowerCase();
                
                // Search in structured ingredients
                const ingredientNames = recipe.ingredients ? 
                    recipe.ingredients.map(ing => (ing.productName || '').toLowerCase()).join(' ') : '';
                
                return recipeName.includes(searchTerm) ||
                       recipeDescription.includes(searchTerm) ||
                       recipeCuisine.includes(searchTerm) ||
                       recipeMainIngredient.includes(searchTerm) ||
                       recipeSeason.includes(searchTerm) ||
                       recipeIngredientsText.includes(searchTerm) ||
                       ingredientNames.includes(searchTerm);
            });
        }

        if (recipesToShow.length === 0) {
            this.recipeSelectionList.innerHTML = `
                <div class="no-recipes-found">
                    <p>${searchTerm ? 'No recipes found matching your search' : 'No recipes available'}</p>
                    <p>${searchTerm ? 'Try a different search term' : 'Add some recipes first!'}</p>
                </div>
            `;
            return;
        }

        // Sort recipes alphabetically
        const sortedRecipes = [...recipesToShow].sort((a, b) => a.name.localeCompare(b.name));
        
        const html = sortedRecipes.map(recipe => {
            const ingredientCount = recipe.ingredients ? recipe.ingredients.length : 0;
            const hasIngredientsText = recipe.ingredientsText && recipe.ingredientsText.trim();
            
            // Build details array
            const details = [];
            if (recipe.metadata?.cuisine) details.push(`🌍 ${recipe.metadata.cuisine}`);
            if (recipe.metadata?.mainIngredient) details.push(`🥘 ${recipe.metadata.mainIngredient}`);
            if (recipe.metadata?.season) details.push(`📅 ${recipe.metadata.season}`);
            if (ingredientCount > 0) details.push(`📋 ${ingredientCount} ingredients`);
            if (hasIngredientsText && ingredientCount === 0) details.push(`📝 Text ingredients`);
            
            return `
                <div class="recipe-selection-item" data-recipe-id="${recipe.id}">
                    <div class="recipe-selection-name">${recipe.name}</div>
                    <div class="recipe-selection-details">
                        ${details.map(detail => `<span class="recipe-selection-tag">${detail}</span>`).join('')}
                    </div>
                </div>
            `;
        }).join('');
        
        this.recipeSelectionList.innerHTML = html;

        // Add click event listeners to recipe items
        this.recipeSelectionList.querySelectorAll('.recipe-selection-item').forEach(item => {
            item.addEventListener('click', () => {
                // Remove previous selection
                this.recipeSelectionList.querySelectorAll('.recipe-selection-item').forEach(i => 
                    i.classList.remove('selected')
                );
                
                // Select this item
                item.classList.add('selected');
                this.selectedRecipeId = parseFloat(item.dataset.recipeId);
                this.confirmRecipeSelectionBtn.disabled = false;
            });
        });
    }

    filterRecipeSelection() {
        const searchTerm = this.recipeSelectionSearch.value.trim().toLowerCase();
        this.renderRecipeSelectionList(searchTerm);
    }

    clearRecipeSelectionSearch() {
        this.recipeSelectionSearch.value = '';
        this.renderRecipeSelectionList();
    }

    confirmRecipeSelection() {
        if (!this.selectedRecipeId || !this.currentMealSlot) return;
        
        const selectedRecipe = this.recipes.find(r => r.id === this.selectedRecipeId);
        if (!selectedRecipe) return;
        
        this.setMeal(this.currentMealSlot.dayIndex, this.currentMealSlot.mealType, { 
            type: 'recipe', 
            id: selectedRecipe.id 
        });
        
        this.closeRecipeSelectionModal();
    }

    // Recipe Planning Modal Methods
    planRecipe(recipeId) {
        const recipe = this.recipes.find(r => r.id === recipeId);
        if (!recipe) return;

        // Store the recipe being planned
        this.currentPlanningRecipe = recipe;
        
        // Create a working recipe planning modal
        const planningModal = document.createElement('div');
        planningModal.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.7); z-index: 999999; display: flex; align-items: center; justify-content: center;">
                <div style="background: white; padding: 30px; border-radius: 10px; width: 500px; max-height: 80vh; overflow-y: auto; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h3 style="margin: 0; color: #333;">Plan Recipe: ${recipe.name}</h3>
                        <button id="closePlanningModal" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666; padding: 5px;">&times;</button>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 10px; font-weight: bold;">Select Date:</label>
                        <input type="date" id="workingPlanningDate" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; box-sizing: border-box;" value="${new Date().toISOString().split('T')[0]}">
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 10px; font-weight: bold;">Select Meal Type:</label>
                        <div style="display: flex; gap: 15px;">
                            <label style="display: flex; align-items: center; gap: 5px; cursor: pointer;">
                                <input type="radio" name="workingMealType" value="breakfast" style="margin: 0;">
                                <span>🌅 Breakfast</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 5px; cursor: pointer;">
                                <input type="radio" name="workingMealType" value="lunch" style="margin: 0;" checked>
                                <span>🌞 Lunch</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 5px; cursor: pointer;">
                                <input type="radio" name="workingMealType" value="dinner" style="margin: 0;">
                                <span>🌙 Dinner</span>
                            </label>
                        </div>
                    </div>
                    
                    <div id="workingPlanningPreview" style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px; border-left: 4px solid #007bff;">
                        <strong>Planning Preview:</strong><br>
                        <span id="workingPreviewText">Select date and meal type</span>
                        <div id="workingExistingMealWarning" style="margin-top: 10px; padding: 10px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; display: none;">
                            ⚠️ <strong>Warning:</strong> <span id="workingExistingMealName"></span> is already planned for this slot.
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button id="cancelPlanning" style="padding: 10px 20px; border: 1px solid #95a5a6; background: #ecf0f1; color: #7f8c8d; border-radius: 5px; cursor: pointer;">Cancel</button>
                        <button id="confirmPlanning" style="padding: 10px 20px; border: none; background: #28a745; color: white; border-radius: 5px; cursor: pointer;">Plan Recipe</button>
                    </div>
                </div>
            </div>
        `;
        
        // Update preview function
        const updatePreview = () => {
            const dateInput = planningModal.querySelector('#workingPlanningDate');
            const mealTypeInputs = planningModal.querySelectorAll('input[name="workingMealType"]');
            const selectedMealType = Array.from(mealTypeInputs).find(input => input.checked)?.value;
            
            if (dateInput.value && selectedMealType) {
                const date = new Date(dateInput.value);
                const formattedDate = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
                
                planningModal.querySelector('#workingPreviewText').innerHTML = `
                    <strong>${recipe.name}</strong> for <strong>${selectedMealType}</strong> on <strong>${formattedDate}</strong>
                `;
                
                // Check for existing meal conflict
                this.checkMealConflict(date, selectedMealType, planningModal);
            }
        };
        
        // Add event listeners
        planningModal.querySelector('#closePlanningModal').onclick = () => {
            document.body.removeChild(planningModal);
        };
        
        planningModal.querySelector('#cancelPlanning').onclick = () => {
            document.body.removeChild(planningModal);
        };
        
        planningModal.querySelector('#confirmPlanning').onclick = () => {
            console.log('🔄 Working modal confirm button clicked');
            
            const dateInput = planningModal.querySelector('#workingPlanningDate');
            const mealTypeInputs = planningModal.querySelectorAll('input[name="workingMealType"]');
            const selectedMealType = Array.from(mealTypeInputs).find(input => input.checked)?.value;
            
            console.log('🔄 Date input value:', dateInput.value);
            console.log('🔄 Selected meal type:', selectedMealType);
            
            if (dateInput.value && selectedMealType) {
                const selectedDate = new Date(dateInput.value);
                console.log('🔄 Calling confirmRecipePlanningWithParams with params:', selectedDate, selectedMealType);
                this.confirmRecipePlanningWithParams(selectedDate, selectedMealType);
                document.body.removeChild(planningModal);
            } else {
                console.log('❌ Missing date or meal type');
                alert('Please select both date and meal type');
            }
        };
        
        // Add change listeners for preview updates
        planningModal.querySelector('#workingPlanningDate').onchange = updatePreview;
        planningModal.querySelectorAll('input[name="workingMealType"]').forEach(input => {
            input.onchange = updatePreview;
        });
        
        // Click outside to close
        planningModal.onclick = (e) => {
            if (e.target === planningModal) {
                document.body.removeChild(planningModal);
            }
        };
        
        document.body.appendChild(planningModal);
        
        // Initial preview update
        updatePreview();
        
        console.log('✅ Working recipe planning modal created');
    }

    checkMealConflict(selectedDate, mealType, modalElement) {
        // Calculate which week the selected date falls into
        const weekStart = this.getWeekStart(selectedDate);
        const weekKey = this.getWeekKey(weekStart);
        
        // Calculate day index (0 = Saturday, 1 = Sunday, etc.)
        const dayIndex = (selectedDate.getDay() + 1) % 7;
        
        // Check if there's already a meal planned
        const existingMeal = this.mealPlans[weekKey]?.[dayIndex]?.[mealType];
        const warningElement = modalElement.querySelector('#workingExistingMealWarning');
        const mealNameElement = modalElement.querySelector('#workingExistingMealName');
        
        if (existingMeal) {
            let mealName = 'Unknown meal';
            if (existingMeal.type === 'recipe') {
                const recipe = this.recipes.find(r => r.id === existingMeal.id);
                mealName = recipe ? recipe.name : 'Unknown recipe';
            } else if (existingMeal.type === 'simple') {
                mealName = existingMeal.name || 'Simple meal';
            }
            
            mealNameElement.textContent = mealName;
            warningElement.style.display = 'block';
        } else {
            warningElement.style.display = 'none';
        }
    }

    confirmRecipePlanningWithParams(selectedDate, mealType) {
        console.log('📅 confirmRecipePlanningWithParams called with:', selectedDate, mealType);
        console.log('📅 currentPlanningRecipe:', this.currentPlanningRecipe?.name);
        
        if (!this.currentPlanningRecipe) {
            console.log('❌ No current planning recipe');
            return;
        }
        
        // Calculate the correct week and day index
        const weekStart = this.getWeekStart(selectedDate);
        const dayIndex = (selectedDate.getDay() + 1) % 7; // 0 = Saturday, 1 = Sunday, etc.
        
        console.log('📅 weekStart:', weekStart);
        console.log('📅 dayIndex:', dayIndex);
        console.log('📅 mealType:', mealType);
        
        // Switch to the correct week if necessary
        const originalWeekStart = this.currentWeekStart;
        this.currentWeekStart = weekStart;
        
        const mealData = { 
            type: 'recipe', 
            id: this.currentPlanningRecipe.id 
        };
        
        console.log('📅 Setting meal data:', mealData);
        
        // Set the meal
        this.setMeal(dayIndex, mealType, mealData);
        
        // Restore original week start if we switched
        if (originalWeekStart.getTime() !== weekStart.getTime()) {
            this.currentWeekStart = originalWeekStart;
        }
        
        // Show success message
        const dateOptions = { weekday: 'long', month: 'short', day: 'numeric' };
        const formattedDate = selectedDate.toLocaleDateString('en-US', dateOptions);
        alert(`✅ Successfully planned "${this.currentPlanningRecipe.name}" for ${mealType} on ${formattedDate}!`);
        
        this.currentPlanningRecipe = null;
        console.log('📅 Recipe planning completed');
    }

    closeRecipePlanningModal() {
        this.recipePlanningModal.style.display = 'none';
        this.currentPlanningRecipe = null;
        this.planningPreview.style.display = 'none';
        this.confirmRecipePlanningBtn.disabled = true;
    }

    updatePlanningPreview() {
        if (!this.currentPlanningRecipe || !this.planningDate.value) {
            this.planningPreview.style.display = 'none';
            this.confirmRecipePlanningBtn.disabled = true;
            return;
        }

        const selectedMealType = document.querySelector('input[name="mealType"]:checked');
        if (!selectedMealType) {
            this.planningPreview.style.display = 'none';
            this.confirmRecipePlanningBtn.disabled = true;
            return;
        }

        const selectedDate = new Date(this.planningDate.value);
        const mealType = selectedMealType.value;
        
        // Format date for display
        const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const formattedDate = selectedDate.toLocaleDateString('en-US', dateOptions);
        
        // Update preview
        this.previewRecipeName.textContent = this.currentPlanningRecipe.name;
        this.previewMealType.textContent = mealType;
        this.previewDate.textContent = formattedDate;
        
        // Check if there's an existing meal
        const dayIndex = this.getDayIndexFromDate(selectedDate);
        const weekKey = this.getWeekKey(this.getWeekStartFromDate(selectedDate));
        const existingMeal = this.mealPlans[weekKey]?.[dayIndex]?.[mealType];
        
        if (existingMeal) {
            let existingMealName = '';
            if (existingMeal.type === 'recipe') {
                const existingRecipe = this.recipes.find(r => r.id === existingMeal.id);
                existingMealName = existingRecipe ? existingRecipe.name : 'Unknown Recipe';
            } else if (existingMeal.type === 'simple') {
                existingMealName = existingMeal.name || 'Simple Meal';
            } else {
                // Legacy format
                const existingRecipe = this.recipes.find(r => r.id === existingMeal);
                existingMealName = existingRecipe ? existingRecipe.name : 'Unknown Recipe';
            }
            
            this.existingMealName.textContent = existingMealName;
            this.existingMealWarning.style.display = 'block';
        } else {
            this.existingMealWarning.style.display = 'none';
        }
        
        this.planningPreview.style.display = 'block';
        this.confirmRecipePlanningBtn.disabled = false;
    }

    confirmRecipePlanning() {
        console.log('📅 confirmRecipePlanning called without params');
        console.log('📅 Call stack:', new Error().stack);
        console.log('📅 currentPlanningRecipe:', this.currentPlanningRecipe?.name);
        console.log('📅 planningDate value:', this.planningDate?.value);
        
        if (!this.currentPlanningRecipe || !this.planningDate.value) {
            console.log('❌ Missing recipe or date');
            return;
        }

        const selectedMealType = document.querySelector('input[name="mealType"]:checked');
        console.log('📅 selectedMealType:', selectedMealType?.value);
        
        if (!selectedMealType) {
            console.log('❌ No meal type selected');
            return;
        }

        const selectedDate = new Date(this.planningDate.value);
        const mealType = selectedMealType.value;
        const dayIndex = this.getDayIndexFromDate(selectedDate);
        
        console.log('📅 Selected date:', selectedDate);
        console.log('📅 dayIndex:', dayIndex);
        console.log('📅 mealType:', mealType);
        
        // Get the week start for the selected date
        const weekStart = this.getWeekStartFromDate(selectedDate);
        console.log('📅 weekStart:', weekStart);
        
        // Temporarily set currentWeekStart to handle the selected week
        const originalWeekStart = this.currentWeekStart;
        this.currentWeekStart = weekStart;
        
        const mealData = { 
            type: 'recipe', 
            id: this.currentPlanningRecipe.id 
        };
        
        console.log('📅 Setting meal data:', mealData);
        
        // Plan the meal
        this.setMeal(dayIndex, mealType, mealData);
        
        // Restore original week start
        this.currentWeekStart = originalWeekStart;
        
        // Show success message
        const dateOptions = { weekday: 'long', month: 'short', day: 'numeric' };
        const formattedDate = selectedDate.toLocaleDateString('en-US', dateOptions);
        alert(`✅ Successfully planned "${this.currentPlanningRecipe.name}" for ${mealType} on ${formattedDate}!`);
        
        console.log('📅 Recipe planning completed (no params version)');
        this.closeRecipePlanningModal();
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

    // Shopping List Generation Modal Methods
    openShoppingListModal() {
        // Reset to future meals by default
        const futureRadio = document.querySelector('input[name="timeRange"][value="future"]');
        if (futureRadio) futureRadio.checked = true;
        
        // Update preview
        this.updateShoppingPreview();
        
        // Show modal
        this.shoppingListModal.style.display = 'block';
    }

    closeShoppingListModal() {
        this.shoppingListModal.style.display = 'none';
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
            this.saveAllProducts();
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

    switchTab(tabName) {
        if (this.navigation) {
            this.navigation.switchTab(tabName);
            this.currentTab = this.navigation.getCurrentTab();
        } else {
            this.currentTab = tabName;
            this.render();
        }
    }

    // Rendering Methods
    render() {
        if (this.currentTab === 'shopping') {
            this.shoppingListManager.renderShoppingList();
        } else if (this.currentTab === 'pantry') {
            this.pantryManager.refreshDisplay();
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

    renderCategoriesList() {
        const categories = window.realProductsCategoriesManager.getAllCategories();
        const sortedCategories = categories.slice().sort((a, b) => a.order - b.order);

        if (sortedCategories.length === 0) {
            this.categoriesList.innerHTML = `
                <div class="empty-state">
                    <span class="emoji">⚙️</span>
                    <p>No categories found</p>
                </div>
            `;
            return;
        }

        this.categoriesList.innerHTML = sortedCategories.map((category, index) => `
            <div class="category-item" data-category-id="${category.id}" data-index="${index}">
                <div class="category-drag-handle">⋮⋮</div>
                <div class="category-info">
                    <div class="category-emoji" onclick="const e=prompt('Enter new emoji for \"${category.displayName || category.name}\":','${category.emoji}'); if(e){ window.realProductsCategoriesManager.editCategory('${category.id}', null, e); window.realProductsCategoriesManager.updateCategorySelects(); app.renderCategoriesList(); }" style="cursor: pointer;" title="Click to change emoticon">${category.emoji}</div>
                    <div class="category-name" onclick="const n=prompt('Enter new category name:','${category.displayName || category.name}'); if(n){ window.realProductsCategoriesManager.editCategory('${category.id}', n, null); window.realProductsCategoriesManager.updateCategorySelects(); app.renderCategoriesList(); }" style="cursor: pointer;" title="Click to edit category">${(category.displayName || category.name)}</div>
                </div>
                <div class="category-actions">
                    <button class="delete-btn" onclick="if(confirm('Delete category?')){ window.realProductsCategoriesManager.deleteCategory('${category.id}'); window.realProductsCategoriesManager.updateCategorySelects(); app.renderCategoriesList(); }" title="Delete category">×</button>
                </div>
            </div>
        `).join('');

        // Add drag and drop functionality
        this.initializeDragAndDrop();
    }

    initializeDragAndDrop() {
        const categoryItems = this.categoriesList.querySelectorAll('.category-item');
        
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
                    window.realProductsCategoriesManager.moveCategory(fromIndex, toIndex);
                    this.renderCategoriesList();
                }
            });
        });
    }

    groupItemsByCategory(items) {
        const groups = items.reduce((groups, item) => {
            if (!groups[item.category]) {
                groups[item.category] = [];
            }
            groups[item.category].push(item);
            return groups;
        }, {});
        
        // Sort items alphabetically within each category
        Object.keys(groups).forEach(category => {
            groups[category].sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
        });
        
        return groups;
    }

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
        
        const categoryOptions = this.categories
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
                    <button class="fix-product-btn" onclick="app.fixOrphanedProductFromSelect(${product.id})">Fix</button>
                    <button class="delete-orphaned-btn" onclick="app.deleteOrphanedProduct(${product.id})">Delete</button>
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
        // Group products by category
        const groupedProducts = this.groupItemsByCategory(products);
        const categoryOrder = this.getCategoryOrder();
        
        let html = '';
        categoryOrder.forEach(categoryKey => {
            if (groupedProducts[categoryKey] && groupedProducts[categoryKey].length > 0) {
                html += this.renderProductCategorySection(categoryKey, groupedProducts[categoryKey]);
            }
        });
        
        return html;
    }

    renderProductsList() {
        const allProducts = window.realProductsCategoriesManager.getAllProducts();
        const categories = window.realProductsCategoriesManager.getAllCategories();
        console.log('🔍 Rendering products list, total products:', allProducts.length);

        // First, render orphaned products section
        this.renderOrphanedProducts();

        const searchTerm = this.productSearchInput ? this.productSearchInput.value.trim().toLowerCase() : '';
        const stockFilter = this.stockStatusFilter ? this.stockStatusFilter.value : '';

        // Update filter button visibility
        this.updateProductFilterButtons();

        // Filter out orphaned products from main list - they're shown in the recovery section
        const validCategoryIds = new Set(categories.map(cat => cat.id));
        let filteredProducts = allProducts.filter(product => validCategoryIds.has(product.category));

        // Apply stock status filter
        if (stockFilter) {
            filteredProducts = filteredProducts.filter(product => {
                switch (stockFilter) {
                    case 'inStock':
                        return product.inStock === true;
                    case 'outOfStock':
                        return product.inStock === false;
                    case 'inShopping':
                        return product.inShopping === true;
                    default:
                        return true;
                }
            });
        }

        // Apply search filter
        if (searchTerm) {
            filteredProducts = filteredProducts.filter(product => {
                // Get the actual category name from the ID
                const category = categories.find(cat => cat.id === product.category);
                const categoryName = category ? (category.name || '').toLowerCase() : '';
                
                return product.name.toLowerCase().includes(searchTerm) ||
                       categoryName.includes(searchTerm);
            });
        }

        this.updateProductCount(filteredProducts.length, searchTerm || stockFilter);

        if (allProducts.length === 0) {
            if (this.productsList) {
                this.productsList.innerHTML = `
                    <div class="empty-state">
                        <span class="emoji">📋</span>
                        <p>Your products list is empty</p>
                        <p>Add products that you might need for recipes and menus!</p>
                    </div>
                `;
            }
            return;
        }

        if (filteredProducts.length === 0) {
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
        const inSeasonProducts = filteredProducts.filter(p => p.inSeason !== false);
        const outOfSeasonProducts = filteredProducts.filter(p => p.inSeason === false);
        
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
        
        if (this.productsList) {
            this.productsList.innerHTML = html;
            console.log('✅ Products list rendered with', filteredProducts.length, 'products');
        } else {
            console.error('❌ Products list element not found!');
        }
    }

    renderRecipes(searchTerm = '') {
        window.realRecipesManager.renderRecipes(searchTerm);
    }

    renderRecipesList(searchTerm = '') {
        window.realRecipesManager.renderRecipesList(searchTerm);
    }


    renderRecipe(recipe) {
        return window.realRecipesManager.renderRecipe(recipe);
    }


    updateRecipeCount(filteredCount = null, searchTerm = '', hasFilters = false) {
        window.realRecipesManager.updateRecipeCount(filteredCount, searchTerm, hasFilters);
    }


    // Global Recipe Filter Methods
    applyRecipeFilters() {
        window.realRecipesManager.applyRecipeFilters();
    }


    clearRecipeFilters() {
        window.realRecipesManager.clearRecipeFilters();
    }

    populateFilterDropdowns() {
        window.realRecipesManager.populateFilterDropdowns();
    }


    getActiveFilters() {
        return window.realRecipesManager.getActiveFilters();
    }

    updateClearFiltersButton() {
        window.realRecipesManager.updateClearFiltersButton();
    }

    getRecipeAvailability(recipe) {
        return window.realRecipesManager.getRecipeAvailability(recipe);
    }

    generateAIRecipes() {
        window.realRecipesManager.generateAIRecipes();
    }


    // Product filter methods
    applyProductFilters() {
        this.renderProductsList();
    }

    clearProductFilters() {
        if (this.stockStatusFilter) {
            this.stockStatusFilter.value = '';
        }
        this.updateProductFilterButtons();
        this.renderProductsList();
    }

    updateProductFilterButtons() {
        const hasStockFilter = this.stockStatusFilter && this.stockStatusFilter.value;
        
        // Show/hide clear filter button
        if (this.clearProductFiltersBtn) {
            this.clearProductFiltersBtn.style.display = hasStockFilter ? 'inline-block' : 'none';
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

    // Product recipes modal methods
    showProductRecipes(productId) {
        console.log(`🔍 showProductRecipes called with productId: ${productId}`);
        
        
        const product = this.allProducts.find(p => p.id === productId);
        if (!product) return;

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
        
        // Show modal IMMEDIATELY with loading state (before doing heavy recipe filtering)
        this.selectedProductName.textContent = product.name;
        this.productRecipesList.innerHTML = '<div style="text-align: center; padding: 40px; font-size: 16px;">🔄 Loading recipes...</div>';
        this.productRecipesList.style.display = 'block';
        this.noRecipesFound.style.display = 'none';
        
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
                return recipe.ingredients && recipe.ingredients.some(ingredient => 
                    // Try matching by productId first (convert to strings), then fall back to name matching
                    String(ingredient.productId) === String(productId) || 
                    (ingredient.productName && ingredient.productName.toLowerCase() === product.name.toLowerCase())
                );
            });
            
            console.log(`🍳 Found ${recipesUsingProduct.length} recipes using ${product.name}`);
            
            if (recipesUsingProduct.length === 0) {
                this.productRecipesList.style.display = 'none';
                this.noRecipesFound.style.display = 'block';
            } else {
                this.renderProductRecipesList(recipesUsingProduct, product);
                this.productRecipesList.style.display = 'block';
                this.noRecipesFound.style.display = 'none';
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
            const availability = this.getRecipeAvailability(recipe);
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
                        <button class="recipe-link-btn" onclick="app.openRecipeFromProduct(${recipe.id})">
                            View Recipe
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        this.productRecipesList.innerHTML = html;
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
                this.openRecipeEditModal(recipe);
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
        // This method forces a re-render which will recalculate all recipe counts
        if (this.currentTab === 'products') {
            this.render();
        }
    }

    renderProductCategorySection(category, products) {
        const categoryData = window.realProductsCategoriesManager.getCategoryById(category);
        const categoryName = categoryData ? (categoryData.displayName || categoryData.name) : category;
        const categoryEmoji = categoryData ? categoryData.emoji : '📦';
        
        return `
            <div class="category-section">
                <div class="category-header">
                    <span class="category-emoji">${categoryEmoji}</span>
                    <span class="category-name">${categoryName}</span>
                    <span class="category-count">${products.length}</span>
                </div>
                <div class="category-items">
                    ${products.map(product => this.renderProduct(product)).join('')}
                </div>
            </div>
        `;
    }

    renderProduct(product) {
        const status = this.getProductStatus(product);
        const statusIndicators = [];
        
        if (status.inShopping) statusIndicators.push('🛒 Shopping');
        if (status.inPantry) statusIndicators.push('🏠 Pantry');
        if (status.inStock) statusIndicators.push('✅ Stock');
        if (status.inPantry && !status.inStock) statusIndicators.push('<span class="status-nostock">❌ NoStock</span>');
        if (status.inSeason) statusIndicators.push('🌱 Season');
        if (!status.inSeason) statusIndicators.push('<span class="status-notseason">🚫 NotSeason</span>');
        
        const statusText = statusIndicators.length > 0 ? statusIndicators.join(' • ') : '📋 Available';
        
        return `
            <div class="product-item ${status.inShopping ? 'in-shopping' : ''} ${status.inPantry ? 'in-pantry' : ''}" data-id="${product.id}">
                <div class="product-checkboxes">
                    <label class="product-checkbox-label" title="Add to shopping list">
                        <input 
                            type="checkbox" 
                            class="product-checkbox shopping-checkbox" 
                            ${status.inShopping ? 'checked' : ''}
                            onchange="window.realProductsCategoriesManager.toggleProductShopping(${product.id}); app.renderProductsList();"
                        >
                        <span class="checkbox-text">🛒</span>
                    </label>
                    <label class="product-checkbox-label" title="Add to pantry">
                        <input 
                            type="checkbox" 
                            class="product-checkbox pantry-checkbox" 
                            ${status.inPantry ? 'checked' : ''}
                            onchange="window.realPantryManager.togglePantryStatus(${product.id})"
                        >
                        <span class="checkbox-text">🏠</span>
                    </label>
                </div>
                <div class="product-content" onclick="app.showProductRecipes(${product.id})" style="cursor: pointer;" title="Click to see recipes using this ingredient">
                    <div class="product-name-section">
                        <div class="product-name">${this.escapeHtml(product.name)}</div>
                        <div class="product-recipe-count">${this.getProductRecipeCount(product.id)} recipes</div>
                    </div>
                    <div class="product-status">${statusText}</div>
                </div>
                <div class="product-actions">
                    <button class="edit-category-btn" onclick="app.openCategoryChangeModal(${product.id}, 'product')" title="Change category">✏️</button>
                    <button class="edit-btn" onclick="window.realProductsCategoriesManager.openProductEditModalById(${product.id})" title="Edit product name">✏️</button>
                    <button class="delete-btn" onclick="window.realProductsCategoriesManager.deleteProduct(${product.id}); app.renderProductsList();" title="Delete product">×</button>
                </div>
            </div>
        `;
    }

    updateProductCount(filteredCount = null, hasFilter = false) {
        if (this.productCount) {
            this.productCount.textContent = `${this.allProducts.length} products`;
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

    updateItemCount() {
        const total = this.shoppingItems.length;
        const completed = this.shoppingItems.filter(item => item.completed).length;
        const remaining = total - completed;
        
        if (total === 0) {
            this.itemCount.textContent = '0 items';
        } else {
            this.itemCount.textContent = `${remaining} of ${total} items remaining`;
        }
    }

    getCategoryEmoji(categoryId) {
        const category = this.categories.find(cat => cat.id === categoryId);
        return category ? category.emoji : '📦';
    }

    renderMealCalendar() {
        if (!this.mealCalendar || !this.currentWeekRange) return;
        
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
                 ${!hasMeal ? `onclick="app.assignMealToSlot(${dayIndex}, '${mealType}')"` : ''}>
                <div class="meal-type">${mealType}</div>
                ${hasMeal && mealDisplay ? `
                    <div class="meal-content">
                        <div class="meal-recipe" onclick="event.stopPropagation(); app.showMealDetails(${dayIndex}, '${mealType}', ${JSON.stringify(mealData).replace(/"/g, '&quot;')})">
                            <span class="meal-icon">${mealDisplay.icon}</span>
                            <span class="meal-name" title="${this.escapeHtml(mealDisplay.name)}">${this.escapeHtml(mealDisplay.name)}</span>
                        </div>
                        <div class="meal-actions">
                            <button class="edit-meal-btn" onclick="event.stopPropagation(); app.assignMealToSlot(${dayIndex}, '${mealType}')" title="Change meal">✏️</button>
                            <button class="remove-meal-btn" onclick="event.stopPropagation(); app.removeMeal(${dayIndex}, '${mealType}')" title="Remove meal">×</button>
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

    getDeviceInfo() {
        const userAgent = navigator.userAgent;
        
        // Detect device type
        if (/iPad/.test(userAgent)) {
            return 'iPad';
        } else if (/iPhone/.test(userAgent)) {
            return 'iPhone';
        } else if (/Macintosh/.test(userAgent)) {
            return 'Mac';
        } else if (/Android/.test(userAgent)) {
            return /Mobile/.test(userAgent) ? 'Android Phone' : 'Android Tablet';
        } else if (/Mobile/.test(userAgent)) {
            return 'Mobile';
        } else {
            return 'Desktop';
        }
    }

    isLargeScreen() {
        // Consider Mac and iPad as large screens for future recipe/menu management
        const deviceInfo = this.getDeviceInfo();
        return deviceInfo === 'Mac' || deviceInfo === 'iPad' || deviceInfo === 'Desktop';
    }

    isMobileDevice() {
        const deviceInfo = this.getDeviceInfo();
        return deviceInfo === 'iPhone' || deviceInfo === 'Android Phone' || deviceInfo === 'Mobile';
    }

    updateDeviceInfo() {
        const deviceInfo = this.getDeviceInfo();
        const header = document.querySelector('header h1');
        
        if (header) {
            const deviceEmoji = {
                'iPhone': '📱',
                'iPad': '📱', 
                'Mac': '💻',
                'Android Phone': '📱',
                'Android Tablet': '📱',
                'Desktop': '💻',
                'Mobile': '📱'
            };
            
            header.innerHTML = `${deviceEmoji[deviceInfo] || '🛒'} Grocery Manager`;
            
            // Add device class to body for CSS targeting
            document.body.className = `device-${deviceInfo.toLowerCase().replace(' ', '-')}`;
        }
    }

    hardRefresh() {
        console.log('🔄 Performing hard refresh (Cmd+Shift+R equivalent)');
        // Clear all caches and reload
        if ('caches' in window) {
            caches.keys().then(names => {
                names.forEach(name => caches.delete(name));
            });
        }
        
        // Force reload bypassing cache
        window.location.reload(true);
    }

    testModal() {
        console.log('🧪 Testing modal system - version 2.2.6');
        
        // Try a completely different approach - create a simple test div
        const testDiv = document.createElement('div');
        testDiv.id = 'testModalDiv';
        testDiv.innerHTML = `
            <div style="position: fixed; top: 50px; left: 50px; width: 300px; height: 200px; background: red; z-index: 999999; padding: 20px; color: white; border-radius: 10px;">
                <h3>TEST MODAL</h3>
                <p>This is a test modal to verify rendering works</p>
                <button id="closeTestModalBtn">Close</button>
            </div>
        `;
        
        // Add event listener after adding to DOM
        testDiv.querySelector('#closeTestModalBtn').onclick = () => {
            document.body.removeChild(testDiv);
        };
        document.body.appendChild(testDiv);
        
        // The original modal has some CSS issue. Let's create a completely new one
        console.log('🧪 Creating bypass modal...');
        
        const bypassModal = document.createElement('div');
        bypassModal.id = 'bypassMealModal';
        bypassModal.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.7); z-index: 999999; display: flex; align-items: center; justify-content: center;">
                <div style="background: white; padding: 30px; border-radius: 10px; min-width: 400px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                    <h3 style="margin-top: 0; color: #333;">Choose Meal Type</h3>
                    <p style="margin-bottom: 30px; color: #666;">What type of meal would you like to add for <strong>this meal slot</strong>?</p>
                    
                    <div style="display: flex; gap: 20px; justify-content: center; margin-bottom: 30px;">
                        <button id="bypassRecipeBtn" style="padding: 20px; border: 2px solid #3498db; background: #3498db; color: white; border-radius: 10px; cursor: pointer; min-width: 120px;">
                            <div style="font-size: 24px; margin-bottom: 10px;">🍳</div>
                            <div style="font-weight: bold; margin-bottom: 5px;">Recipe</div>
                            <div style="font-size: 12px; opacity: 0.8;">Full recipe with instructions</div>
                        </button>
                        
                        <button id="bypassSimpleBtn" style="padding: 20px; border: 2px solid #e67e22; background: #e67e22; color: white; border-radius: 10px; cursor: pointer; min-width: 120px;">
                            <div style="font-size: 24px; margin-bottom: 10px;">🥘</div>
                            <div style="font-weight: bold; margin-bottom: 5px;">Simple Meal</div>
                            <div style="font-size: 12px; opacity: 0.8;">Combine individual products</div>
                        </button>
                    </div>
                    
                    <button id="bypassCancelBtn" style="padding: 10px 20px; border: 1px solid #95a5a6; background: #ecf0f1; color: #7f8c8d; border-radius: 5px; cursor: pointer;">Cancel</button>
                </div>
            </div>
        `;
        
        // Add event listeners for the bypass modal
        bypassModal.querySelector('#bypassRecipeBtn').onclick = () => {
            console.log('🍳 Recipe selected via bypass modal');
            document.body.removeChild(bypassModal);
            this.handleRecipeSelection();
        };
        
        bypassModal.querySelector('#bypassSimpleBtn').onclick = () => {
            console.log('🥘 Simple meal selected via bypass modal');
            document.body.removeChild(bypassModal);
            this.handleSimpleMealSelection();
        };
        
        bypassModal.querySelector('#bypassCancelBtn').onclick = () => {
            console.log('❌ Bypass modal cancelled');
            document.body.removeChild(bypassModal);
        };
        
        // Click outside to close
        bypassModal.onclick = (e) => {
            if (e.target === bypassModal) {
                console.log('📱 Bypass modal closed by clicking outside');
                document.body.removeChild(bypassModal);
            }
        };
        
        document.body.appendChild(bypassModal);
        
        console.log('🧪 Bypass modal created and should be visible');
        
        // Set dummy slot info for testing
        this.selectedMealSlot.textContent = 'Test Slot - Breakfast';
        this.currentMealAssignment = { dayIndex: 0, mealType: 'breakfast' };
        
        console.log('🧪 Test complete - check for red backgrounds');
    }

    // Debug utility to clear all data and start fresh
    clearAllData() {
        const keys = ['shoppingItems', 'standardItems', 'categories', 'allProducts', 'recipes'];
        keys.forEach(key => {
            localStorage.removeItem(key);
            localStorage.removeItem(key + '_backup');
            localStorage.removeItem(key + '_timestamp');
            localStorage.removeItem(key + '_initialized');
        });
        console.log('🧹 Cleared all localStorage data');
        window.location.reload();
    }

    // Storage Methods - Pure localStorage with Sample Data for New Users
    loadShoppingItems() {
        try {
            let saved = localStorage.getItem('shoppingItems');
            
            // Try backup if main data is corrupted
            if (!saved || saved === 'null') {
                saved = localStorage.getItem('shoppingItems_backup');
                console.log('Loaded shopping items from localStorage backup');
            }
            
            let items = saved ? JSON.parse(saved) : [];
            
            // Provide sample data for new users
            if (items.length === 0 && !localStorage.getItem('shoppingItems_initialized')) {
                items = this.getSampleShoppingItems();
                localStorage.setItem('shoppingItems_initialized', 'true');
                console.log('📱 New user - loaded sample shopping items');
            }
            
            console.log(`📦 Loaded ${items.length} shopping items from localStorage`);
            return items;
        } catch (e) {
            console.error('Could not load shopping items from localStorage:', e);
            return this.getSampleShoppingItems();
        }
    }

    loadStandardItems() {
        try {
            let saved = localStorage.getItem('standardItems');
            
            // Try backup if main data is corrupted
            if (!saved || saved === 'null') {
                saved = localStorage.getItem('standardItems_backup');
                console.log('Loaded pantry items from localStorage backup');
            }
            
            let items = saved ? JSON.parse(saved) : [];
            
            // Provide sample data for new users
            if (items.length === 0 && !localStorage.getItem('standardItems_initialized')) {
                items = this.pantryManager.getSamplePantryItems();
                localStorage.setItem('standardItems_initialized', 'true');
                console.log('📱 New user - loaded sample pantry items');
            } else if (items.length > 0) {
                // Ensure backward compatibility - add inSeason property if missing
                items = items.map(item => ({
                    ...item,
                    inSeason: item.inSeason !== undefined ? item.inSeason : true
                }));
            }
            
            console.log(`📦 Loaded ${items.length} pantry items from localStorage`);
            return items;
        } catch (e) {
            console.error('Could not load standard items from localStorage:', e);
            return this.pantryManager.getSamplePantryItems();
        }
    }

    loadCategories() {
        try {
            let saved = localStorage.getItem('categories');
            
            // Try backup if main data is corrupted
            if (!saved || saved === 'null') {
                saved = localStorage.getItem('categories_backup');
                console.log('Loaded categories from localStorage backup');
            }
            
            const categories = saved ? JSON.parse(saved) : [];
            console.log(`📦 Loaded ${categories.length} categories from localStorage`);
            return categories;
        } catch (e) {
            console.error('Could not load categories from localStorage:', e);
            return [];
        }
    }

    loadAllProducts() {
        try {
            let saved = localStorage.getItem('allProducts');
            
            // Try backup if main data is corrupted
            if (!saved || saved === 'null') {
                saved = localStorage.getItem('allProducts_backup');
                console.log('Loaded products from localStorage backup');
            }
            
            let products = saved ? JSON.parse(saved) : [];
            
            // Provide sample data for new users
            if (products.length === 0 && !localStorage.getItem('allProducts_initialized')) {
                products = this.getSampleProducts();
                localStorage.setItem('allProducts_initialized', 'true');
                console.log('📱 New user - loaded sample products:', products.length);
                // Save sample products immediately
                try {
                    const data = JSON.stringify(products);
                    localStorage.setItem('allProducts', data);
                    localStorage.setItem('allProducts_backup', data);
                } catch (e) {
                    console.error('Could not save sample products:', e);
                }
            }
            
            console.log(`📋 Loaded ${products.length} products from localStorage`);
            return products;
        } catch (e) {
            console.error('Could not load products from localStorage:', e);
            return this.getSampleProducts();
        }
    }

    saveShoppingItems() {
        if (this.shoppingListManager && this.shoppingListManager.saveToStorage) {
            this.shoppingListManager.saveToStorage();
        }
    }

    saveStandardItems() {
        try {
            const data = JSON.stringify(this.standardItems);
            localStorage.setItem('standardItems', data);
            localStorage.setItem('standardItems_backup', data);
            localStorage.setItem('standardItems_timestamp', new Date().toISOString());
            console.log(`💾 Saved ${this.standardItems.length} pantry items to localStorage`);
        } catch (e) {
            console.error('Could not save standard items to localStorage:', e);
            this.showPersistenceError('pantry items');
        }
    }

    saveAllProducts() {
        if (window.realProductsCategoriesManager) {
            window.realProductsCategoriesManager.saveProducts();
            this.allProducts = window.realProductsCategoriesManager.getAllProducts();
        }
    }

    saveCategories() {
        try {
            const data = JSON.stringify(this.categories);
            localStorage.setItem('categories', data);
            localStorage.setItem('categories_backup', data);
            localStorage.setItem('categories_timestamp', new Date().toISOString());
            console.log(`💾 Saved ${this.categories.length} categories to localStorage`);
        } catch (e) {
            console.error('Could not save categories to localStorage:', e);
            this.showPersistenceError('categories');
        }
    }

    loadRecipes() {
        try {
            let saved = localStorage.getItem('recipes');
            
            // Try backup if main data is corrupted
            if (!saved || saved === 'null') {
                saved = localStorage.getItem('recipes_backup');
                console.log('Loaded recipes from localStorage backup');
            }
            
            let recipes = saved ? JSON.parse(saved) : [];
            
            // Check if existing recipes need metadata upgrade
            if (recipes.length > 0) {
                const needsMetadataUpgrade = recipes.some(recipe => !recipe.metadata);
                if (needsMetadataUpgrade) {
                    console.log('🔄 Upgrading existing recipes with metadata...');
                    recipes = this.upgradeRecipesWithMetadata(recipes);
                    // Save upgraded recipes
                    localStorage.setItem('recipes', JSON.stringify(recipes));
                    localStorage.setItem('recipes_backup', JSON.stringify(recipes));
                }
            }
            
            // Provide sample data for new users
            if (recipes.length === 0 && !localStorage.getItem('recipes_initialized')) {
                recipes = this.getSampleRecipes();
                localStorage.setItem('recipes_initialized', 'true');
                console.log('📱 New user - loaded sample recipes');
            }
            
            console.log(`📦 Loaded ${recipes.length} recipes from localStorage`);
            return recipes;
        } catch (e) {
            console.error('Could not load recipes from localStorage:', e);
            return this.getSampleRecipes();
        }
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
        try {
            const data = JSON.stringify(this.recipes);
            localStorage.setItem('recipes', data);
            localStorage.setItem('recipes_backup', data);
            localStorage.setItem('recipes_timestamp', new Date().toISOString());
            console.log(`💾 Saved ${this.recipes.length} recipes to localStorage`);
            
            // Update filter dropdowns if on recipes tab
            if (this.currentTab === 'recipes') {
                this.populateFilterDropdowns();
            }
        } catch (e) {
            console.error('Could not save recipes to localStorage:', e);
            this.showPersistenceError('recipes');
        }
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

    getSampleProducts() {
        const baseProduct = {
            inShopping: false,
            inPantry: false,
            inStock: false,
            inSeason: true,
            completed: false,
            dateAdded: new Date().toISOString()
        };

        return [
            // Common produce
            {id: Date.now() + 200, name: "Onions", category: "produce", ...baseProduct},
            {id: Date.now() + 201, name: "Garlic", category: "produce", ...baseProduct},
            {id: Date.now() + 202, name: "Carrots", category: "produce", ...baseProduct},
            {id: Date.now() + 203, name: "Celery", category: "produce", ...baseProduct},
            {id: Date.now() + 204, name: "Potatoes", category: "produce", ...baseProduct},
            {id: Date.now() + 205, name: "Tomatoes", category: "produce", ...baseProduct},
            {id: Date.now() + 206, name: "Bell Peppers", category: "produce", ...baseProduct},
            {id: Date.now() + 207, name: "Mushrooms", category: "produce", ...baseProduct},
            {id: Date.now() + 208, name: "Lemons", category: "produce", ...baseProduct},
            {id: Date.now() + 209, name: "Fresh Herbs", category: "produce", ...baseProduct},
            
            // Pantry staples
            {id: Date.now() + 210, name: "Olive Oil", category: "pantry", ...baseProduct},
            {id: Date.now() + 211, name: "Salt", category: "pantry", ...baseProduct},
            {id: Date.now() + 212, name: "Black Pepper", category: "pantry", ...baseProduct},
            {id: Date.now() + 213, name: "Flour", category: "pantry", ...baseProduct},
            {id: Date.now() + 214, name: "Sugar", category: "pantry", ...baseProduct},
            {id: Date.now() + 215, name: "Pasta", category: "pantry", ...baseProduct},
            {id: Date.now() + 216, name: "Canned Tomatoes", category: "pantry", ...baseProduct},
            {id: Date.now() + 217, name: "Stock/Broth", category: "pantry", ...baseProduct},
            {id: Date.now() + 218, name: "Vinegar", category: "pantry", ...baseProduct},
            {id: Date.now() + 219, name: "Spices Mix", category: "pantry", ...baseProduct},
            
            // Dairy & proteins
            {id: Date.now() + 220, name: "Eggs", category: "dairy", ...baseProduct},
            {id: Date.now() + 221, name: "Butter", category: "dairy", ...baseProduct},
            {id: Date.now() + 222, name: "Cheese", category: "dairy", ...baseProduct},
            {id: Date.now() + 223, name: "Ground Beef", category: "meat", ...baseProduct},
            {id: Date.now() + 224, name: "Chicken Thighs", category: "meat", ...baseProduct},
            {id: Date.now() + 225, name: "Fish Fillets", category: "meat", ...baseProduct},
            
            // Bakery
            {id: Date.now() + 226, name: "Sandwich Bread", category: "bakery", ...baseProduct},
            {id: Date.now() + 227, name: "Dinner Rolls", category: "bakery", ...baseProduct},
            
            // Frozen
            {id: Date.now() + 228, name: "Frozen Vegetables", category: "frozen", ...baseProduct},
            {id: Date.now() + 229, name: "Ice Cream", category: "frozen", ...baseProduct}
        ];
    }

    showPersistenceError(dataType) {
        console.warn(`Storage error for ${dataType}. Your data might not be saved.`);
        // Could add user notification here if needed
    }

    // CSV Methods
    downloadCsvTemplate() {
        try {
            this.downloadCsvTemplateBtn.disabled = true;
            this.downloadCsvTemplateBtn.textContent = '📋 Generating...';
            
            // Create CSV template with headers and sample data
            const csvContent = [
                'name,category,inShopping,inPantry,inStock,inSeason',
                'Apples,produce,FALSE,TRUE,TRUE,TRUE',
                'Milk,dairy,TRUE,FALSE,FALSE,TRUE',
                'Chicken Breast,meat,FALSE,TRUE,FALSE,TRUE',
                'Pasta,pantry,FALSE,TRUE,TRUE,TRUE',
                'Ice Cream,frozen,FALSE,FALSE,FALSE,TRUE'
            ].join('\n');
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = 'grocery-products-template.csv';
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            console.log('📋 CSV template downloaded successfully');
            
            // Reset button after short delay
            setTimeout(() => {
                this.downloadCsvTemplateBtn.disabled = false;
                this.downloadCsvTemplateBtn.textContent = '📋 Download CSV Template';
            }, 1000);
            
        } catch (error) {
            console.error('Template download failed:', error);
            alert('Template download failed. Please try again.');
            this.downloadCsvTemplateBtn.disabled = false;
            this.downloadCsvTemplateBtn.textContent = '📋 Download CSV Template';
        }
    }

    importCsvProducts(csvData, importMode = 'replace') {
        try {
            // Parse CSV data
            const lines = csvData.trim().split('\n');
            if (lines.length < 2) {
                throw new Error('CSV file must have at least a header row and one data row');
            }
            
            // Detect separator (comma or semicolon)
            const firstLine = lines[0];
            const separator = firstLine.includes(';') && firstLine.split(';').length > firstLine.split(',').length ? ';' : ',';
            console.log(`📊 Detected CSV separator: "${separator}"`);
            
            // Parse headers
            const headers = lines[0].split(separator).map(h => h.trim().toLowerCase());
            const requiredHeaders = ['name', 'category', 'inshopping', 'inpantry', 'instock', 'inseason'];
            
            // Validate headers
            const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
            if (missingHeaders.length > 0) {
                throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
            }
            
            // Get column indices
            const nameIndex = headers.indexOf('name');
            const categoryIndex = headers.indexOf('category');
            const inShoppingIndex = headers.indexOf('inshopping');
            const inPantryIndex = headers.indexOf('inpantry');
            const inStockIndex = headers.indexOf('instock');
            const inSeasonIndex = headers.indexOf('inseason');
            
            const validCategories = new Set(this.categories.map(cat => cat.name.toLowerCase()));
            const categoryMapping = new Map();
            this.categories.forEach(cat => {
                categoryMapping.set(cat.name.toLowerCase(), cat.id); // Map to category ID, not name!
            });
            console.log(`📂 Available categories: ${Array.from(validCategories).join(', ')}`);
            console.log(`🗺️ Category mapping:`, Object.fromEntries(categoryMapping));
            const importedProducts = [];
            const skippedRows = [];
            
            // Process data rows
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                
                const values = line.split(separator).map(v => v.trim());
                
                if (values.length < requiredHeaders.length) {
                    skippedRows.push(`Row ${i + 1}: Not enough columns`);
                    continue;
                }
                
                const name = values[nameIndex];
                const categoryInput = values[categoryIndex];
                const categoryLower = categoryInput.toLowerCase();
                const inShopping = this.parseBoolean(values[inShoppingIndex]);
                const inPantry = this.parseBoolean(values[inPantryIndex]);
                const inStock = this.parseBoolean(values[inStockIndex]);
                const inSeason = this.parseBoolean(values[inSeasonIndex]);
                
                // Validate data
                if (!name) {
                    skippedRows.push(`Row ${i + 1}: Product name is required`);
                    continue;
                }
                
                if (!validCategories.has(categoryLower)) {
                    skippedRows.push(`Row ${i + 1}: Invalid category "${categoryInput}". Valid categories: ${Array.from(validCategories).join(', ')}`);
                    continue;
                }
                
                // Get the correct category ID
                const correctCategoryId = categoryMapping.get(categoryLower);
                
                // Check if product already exists
                const existingProduct = this.allProducts.find(p => 
                    p.name.toLowerCase() === name.toLowerCase()
                );
                
                if (existingProduct) {
                    skippedRows.push(`Row ${i + 1}: Product "${name}" already exists`);
                    continue;
                }
                
                // Create new product
                const newProduct = {
                    id: Date.now() + Math.random() * 1000,
                    name: name,
                    category: correctCategoryId, // Use the category ID!
                    inShopping: inShopping,
                    inPantry: inPantry,
                    inStock: inStock,
                    inSeason: inSeason,
                    completed: false,
                    dateAdded: new Date().toISOString()
                };
                
                importedProducts.push(newProduct);
            }
            
            if (importedProducts.length === 0) {
                let errorDetail = 'No valid products found to import.';
                if (skippedRows.length > 0) {
                    errorDetail += `\n\nReasons:\n${skippedRows.slice(0, 5).join('\n')}`;
                    if (skippedRows.length > 5) {
                        errorDetail += `\n... and ${skippedRows.length - 5} more issues`;
                    }
                }
                throw new Error(errorDetail);
            }
            
            // Handle import based on mode
            let updatedCount = 0;
            let addedCount = 0;
            
            if (importMode === 'update') {
                // Update mode: merge with existing products
                for (const newProduct of importedProducts) {
                    const existingIndex = this.allProducts.findIndex(p => 
                        p.name.toLowerCase() === newProduct.name.toLowerCase()
                    );
                    
                    if (existingIndex >= 0) {
                        // Update existing product with new data
                        const existing = this.allProducts[existingIndex];
                        this.allProducts[existingIndex] = {
                            ...existing, // Keep existing data like id, dateAdded
                            ...newProduct, // Override with new data
                            id: existing.id, // Always preserve original ID
                            dateAdded: existing.dateAdded // Preserve original date
                        };
                        updatedCount++;
                    } else {
                        // Add new product
                        this.allProducts.push(newProduct);
                        addedCount++;
                    }
                }
            } else {
                // Replace mode: clear existing and add new
                this.allProducts.push(...importedProducts);
                addedCount = importedProducts.length;
            }
            
            this.saveAllProducts();
            this.render();
            
            // Show results
            let message;
            if (importMode === 'update') {
                message = `Update completed!\n• Updated: ${updatedCount} products\n• Added: ${addedCount} new products`;
            } else {
                message = `Successfully imported ${importedProducts.length} products!`;
            }
            
            if (skippedRows.length > 0) {
                message += `\n\nSkipped ${skippedRows.length} rows:\n${skippedRows.slice(0, 5).join('\n')}`;
                if (skippedRows.length > 5) {
                    message += `\n... and ${skippedRows.length - 5} more`;
                }
            }
            
            alert(message);
            console.log('📄 CSV import completed:', {
                imported: importedProducts.length,
                skipped: skippedRows.length,
                products: importedProducts
            });
            
        } catch (error) {
            console.error('CSV import error:', error);
            throw error;
        }
    }

    parseBoolean(value) {
        if (!value || value.trim() === '') {
            return false; // Default to false for empty values
        }
        if (typeof value === 'string') {
            const lowerValue = value.toLowerCase().trim();
            return lowerValue === 'true' || lowerValue === '1' || lowerValue === 'yes';
        }
        return Boolean(value);
    }

    // CSV Text Input Methods
    showCsvTextInput() {
        this.csvTextArea.style.display = 'block';
        this.csvTextContent.focus();
    }

    hideCsvTextInput() {
        this.csvTextArea.style.display = 'none';
        this.csvTextContent.value = '';
    }

    // Recipe CSV Methods
    downloadRecipeCsvTemplate() {
        try {
            this.downloadRecipeCsvTemplateBtn.disabled = true;
            this.downloadRecipeCsvTemplateBtn.textContent = '📋 Generating...';
            
            // Create CSV template with headers and sample recipes
            const csvContent = [
                'recipeName,description,preparation,ingredientName,quantity,unit,cuisine,mainIngredient,season,image,ingredientsText,persons',
                '"Simple Pasta","Quick and easy pasta with tomato sauce","1. Boil water in a large pot\\n2. Add pasta and cook according to package instructions\\n3. Heat tomato sauce in a separate pan\\n4. Drain pasta and mix with sauce\\n5. Serve hot","Pasta",100,g,"Italian","pasta","all-year","pasta.jpg","100g pasta, 200ml tomato sauce, 1 tbsp olive oil",2',
                '"Simple Pasta","Quick and easy pasta with tomato sauce","1. Boil water in a large pot\\n2. Add pasta and cook according to package instructions\\n3. Heat tomato sauce in a separate pan\\n4. Drain pasta and mix with sauce\\n5. Serve hot","Canned Tomatoes",200,ml,"Italian","pasta","all-year","pasta.jpg","100g pasta, 200ml tomato sauce, 1 tbsp olive oil",2',
                '"Simple Pasta","Quick and easy pasta with tomato sauce","1. Boil water in a large pot\\n2. Add pasta and cook according to package instructions\\n3. Heat tomato sauce in a separate pan\\n4. Drain pasta and mix with sauce\\n5. Serve hot","Olive Oil",1,tbsp,"Italian","pasta","all-year","pasta.jpg","100g pasta, 200ml tomato sauce, 1 tbsp olive oil",2',
                '"Chicken Rice","Healthy chicken and rice meal","1. Cook rice according to package instructions\\n2. Season and grill chicken breast\\n3. Combine and serve with vegetables","Rice",150,g,"International","chicken","all-year","chicken-rice.jpg","150g rice, 200g chicken breast, salt, pepper",4',
                '"Chicken Rice","Healthy chicken and rice meal","1. Cook rice according to package instructions\\n2. Season and grill chicken breast\\n3. Combine and serve with vegetables","Chicken Breast",200,g,"International","chicken","all-year","chicken-rice.jpg","150g rice, 200g chicken breast, salt, pepper",4',
                '"Chicken Rice","Healthy chicken and rice meal","1. Cook rice according to package instructions\\n2. Season and grill chicken breast\\n3. Combine and serve with vegetables","Salt",1,pinch,"International","chicken","all-year","chicken-rice.jpg","150g rice, 200g chicken breast, salt, pepper",4',
                '"Chicken Rice","Healthy chicken and rice meal","1. Cook rice according to package instructions\\n2. Season and grill chicken breast\\n3. Combine and serve with vegetables","Black Pepper",1,pinch,"International","chicken","all-year","chicken-rice.jpg","150g rice, 200g chicken breast, salt, pepper",4'
            ].join('\n');
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = 'grocery-recipes-template.csv';
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            console.log('📋 Recipe CSV template downloaded successfully');
            
            // Reset button after short delay
            setTimeout(() => {
                this.downloadRecipeCsvTemplateBtn.disabled = false;
                this.downloadRecipeCsvTemplateBtn.textContent = '📋 Download Recipe Template';
            }, 1000);
            
        } catch (error) {
            console.error('Recipe template download failed:', error);
            alert('Recipe template download failed. Please try again.');
            this.downloadRecipeCsvTemplateBtn.disabled = false;
            this.downloadRecipeCsvTemplateBtn.textContent = '📋 Download Recipe Template';
        }
    }

    handleRecipeCsvImport(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        this.importRecipeCsvBtn.disabled = true;
        this.importRecipeCsvBtn.textContent = '📄 Importing...';
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                this.importCsvRecipes(e.target.result);
            } catch (error) {
                console.error('Recipe CSV import failed:', error);
                alert(`Recipe CSV import failed: ${error.message}\n\nPlease check the file format and try again.`);
            } finally {
                // Reset button and file input
                this.importRecipeCsvBtn.disabled = false;
                this.importRecipeCsvBtn.textContent = '📄 Import Recipes from CSV';
                this.recipeCsvFileInput.value = '';
            }
        };
        
        reader.readAsText(file);
    }

    importCsvRecipes(csvData) {
        try {
            // Parse CSV data
            const lines = csvData.trim().split('\n');
            if (lines.length < 2) {
                throw new Error('CSV file must have at least a header row and one data row');
            }
            
            // Detect separator (comma or semicolon)
            const firstLine = lines[0];
            const separator = firstLine.includes(';') && firstLine.split(';').length > firstLine.split(',').length ? ';' : ',';
            console.log(`🍳 Detected Recipe CSV separator: "${separator}"`);
            
            // Parse headers
            const headers = lines[0].split(separator).map(h => h.trim().toLowerCase());
            const requiredHeaders = ['recipename', 'description', 'preparation', 'ingredientname', 'quantity', 'unit'];
            
            // Validate headers
            const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
            if (missingHeaders.length > 0) {
                throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
            }
            
            // Get column indices
            const recipeNameIndex = headers.indexOf('recipename');
            const descriptionIndex = headers.indexOf('description');
            const preparationIndex = headers.indexOf('preparation');
            const ingredientNameIndex = headers.indexOf('ingredientname');
            const quantityIndex = headers.indexOf('quantity');
            const unitIndex = headers.indexOf('unit');
            
            // Optional metadata columns
            const cuisineIndex = headers.indexOf('cuisine');
            const mainIngredientIndex = headers.indexOf('mainingredient');
            const seasonIndex = headers.indexOf('season');
            const imageIndex = headers.indexOf('image');
            const ingredientsTextIndex = headers.indexOf('ingredientstext');
            const personsIndex = headers.indexOf('persons');
            
            // Start with known units but allow new ones to be added during import
            const validUnits = new Set(['g', 'kg', 'ml', 'cl', 'l', 'pcs', 'pinch', 'tsp', 'tbsp', 'cup']);
            const newUnitsFound = new Set();
            const newCuisinesFound = new Set();
            const newSeasonsFound = new Set();
            const existingProductsByName = new Map();
            this.allProducts.forEach(product => {
                existingProductsByName.set(product.name.toLowerCase(), product);
            });
            
            const recipesMap = new Map();
            const skippedRows = [];
            
            // Process data rows
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                
                // Parse CSV line (handle quoted values)
                const values = this.parseCSVLine(line, separator);
                
                if (values.length < requiredHeaders.length) {
                    skippedRows.push(`Row ${i + 1}: Not enough columns`);
                    continue;
                }
                
                const recipeName = this.cleanCSVValue(values[recipeNameIndex]);
                const description = this.cleanCSVValue(values[descriptionIndex]);
                const preparation = this.cleanCSVValue(values[preparationIndex]);
                const ingredientName = this.cleanCSVValue(values[ingredientNameIndex]);
                const quantity = parseFloat(values[quantityIndex]);
                const unit = values[unitIndex].trim();
                
                // Extract optional metadata
                const cuisine = cuisineIndex >= 0 ? this.cleanCSVValue(values[cuisineIndex]) : '';
                const mainIngredient = mainIngredientIndex >= 0 ? this.cleanCSVValue(values[mainIngredientIndex]) : '';
                const season = seasonIndex >= 0 ? this.cleanCSVValue(values[seasonIndex]) : '';
                const image = imageIndex >= 0 ? this.cleanCSVValue(values[imageIndex]) : '';
                const ingredientsText = ingredientsTextIndex >= 0 ? this.cleanCSVValue(values[ingredientsTextIndex]) : '';
                const persons = personsIndex >= 0 ? parseInt(values[personsIndex]) || 4 : 4;
                
                // Validate data
                if (!recipeName) {
                    skippedRows.push(`Row ${i + 1}: Recipe name is required`);
                    continue;
                }
                
                if (!ingredientName) {
                    skippedRows.push(`Row ${i + 1}: Ingredient name is required`);
                    continue;
                }
                
                if (isNaN(quantity) || quantity <= 0) {
                    skippedRows.push(`Row ${i + 1}: Invalid quantity "${values[quantityIndex]}"`);
                    continue;
                }
                
                // Accept new units and track them
                if (!validUnits.has(unit)) {
                    if (unit && unit.length > 0 && unit.length <= 10) {
                        validUnits.add(unit);
                        newUnitsFound.add(unit);
                        console.log(`🆕 New unit discovered: "${unit}"`);
                    } else {
                        skippedRows.push(`Row ${i + 1}: Invalid unit "${unit}". Units must be 1-10 characters.`);
                        continue;
                    }
                }
                
                // Track new cuisine types
                if (cuisine && !['belgian', 'italian', 'french', 'spanish', 'greek', 'asian', 'mexican', 'american', 'mediterranean', 'international'].includes(cuisine.toLowerCase())) {
                    newCuisinesFound.add(cuisine);
                    console.log(`🆕 New cuisine discovered: "${cuisine}"`);
                }
                
                // Track new seasons
                if (season && !['spring', 'summer', 'autumn', 'winter', 'all-year'].includes(season.toLowerCase())) {
                    newSeasonsFound.add(season);
                    console.log(`🆕 New season discovered: "${season}"`);
                }
                
                // Find product by name
                const product = existingProductsByName.get(ingredientName.toLowerCase());
                if (!product) {
                    // Try to find similar products to help user
                    const similarProducts = Array.from(existingProductsByName.keys())
                        .filter(name => name.includes(ingredientName.toLowerCase()) || ingredientName.toLowerCase().includes(name))
                        .slice(0, 3);
                    
                    let errorMsg = `Row ${i + 1}: Product "${ingredientName}" not found.`;
                    if (similarProducts.length > 0) {
                        errorMsg += ` Similar products: ${similarProducts.join(', ')}`;
                    } else {
                        errorMsg += ` Available products: ${Array.from(existingProductsByName.keys()).slice(0, 5).join(', ')}...`;
                    }
                    
                    skippedRows.push(errorMsg);
                    continue;
                }
                
                // Create or update recipe
                if (!recipesMap.has(recipeName)) {
                    recipesMap.set(recipeName, {
                        name: recipeName,
                        description: description,
                        preparation: preparation.replace(/\\n/g, '\n'), // Convert \\n to actual newlines
                        ingredients: [],
                        cuisine: cuisine,
                        mainIngredient: mainIngredient,
                        season: season,
                        image: image,
                        ingredientsText: ingredientsText,
                        persons: persons
                    });
                }
                
                const recipe = recipesMap.get(recipeName);
                
                // Check for duplicate ingredients in same recipe (use same matching logic)
                const existingIngredient = recipe.ingredients.find(ing => 
                    ing.productId === product.id || 
                    (ing.productName && ing.productName.toLowerCase() === product.name.toLowerCase())
                );
                if (existingIngredient) {
                    skippedRows.push(`Row ${i + 1}: Ingredient "${ingredientName}" already exists in recipe "${recipeName}"`);
                    continue;
                }
                
                // Add ingredient to recipe
                recipe.ingredients.push({
                    productId: product.id,
                    quantity: quantity,
                    unit: unit
                });
            }
            
            if (recipesMap.size === 0) {
                throw new Error('No valid recipes found to import');
            }
            
            // Check for existing recipes and create new ones
            const importedRecipes = [];
            const skippedRecipes = [];
            
            recipesMap.forEach((recipeData, recipeName) => {
                // Check if recipe already exists
                const existingRecipe = this.recipes.find(r => 
                    r.name.toLowerCase() === recipeName.toLowerCase()
                );
                
                if (existingRecipe) {
                    skippedRecipes.push(`Recipe "${recipeName}" already exists`);
                    return;
                }
                
                if (recipeData.ingredients.length === 0) {
                    skippedRecipes.push(`Recipe "${recipeName}" has no valid ingredients`);
                    return;
                }
                
                // Create new recipe
                const newRecipe = {
                    id: Date.now() + Math.random() * 1000,
                    name: recipeData.name,
                    description: recipeData.description,
                    preparation: recipeData.preparation,
                    ingredients: recipeData.ingredients,
                    ingredientsText: recipeData.ingredientsText || '',
                    persons: recipeData.persons || 4,
                    image: recipeData.image || '',
                    metadata: {
                        cuisine: recipeData.cuisine || '',
                        mainIngredient: recipeData.mainIngredient || '',
                        season: recipeData.season || ''
                    },
                    dateCreated: new Date().toISOString()
                };
                
                importedRecipes.push(newRecipe);
            });
            
            if (importedRecipes.length === 0) {
                throw new Error('No valid recipes to import after validation');
            }
            
            // Add recipes to the list
            this.recipes.push(...importedRecipes);
            this.saveRecipes();
            this.render();
            
            // Update UI with new values discovered
            this.updateFormOptionsWithNewValues(newUnitsFound, newCuisinesFound, newSeasonsFound);
            
            // Show results
            let message = `Successfully imported ${importedRecipes.length} recipes!`;
            
            // Add info about new values discovered
            if (newUnitsFound.size > 0 || newCuisinesFound.size > 0 || newSeasonsFound.size > 0) {
                message += '\n\n🆕 New values discovered:';
                if (newUnitsFound.size > 0) {
                    message += `\n• Units: ${Array.from(newUnitsFound).join(', ')}`;
                }
                if (newCuisinesFound.size > 0) {
                    message += `\n• Cuisines: ${Array.from(newCuisinesFound).join(', ')}`;
                }
                if (newSeasonsFound.size > 0) {
                    message += `\n• Seasons: ${Array.from(newSeasonsFound).join(', ')}`;
                }
            }
            if (skippedRows.length > 0 || skippedRecipes.length > 0) {
                const totalSkipped = skippedRows.length + skippedRecipes.length;
                message += `\n\nSkipped ${totalSkipped} items:`;
                if (skippedRecipes.length > 0) {
                    message += `\n\nRecipes: ${skippedRecipes.slice(0, 3).join(', ')}`;
                    if (skippedRecipes.length > 3) {
                        message += ` and ${skippedRecipes.length - 3} more`;
                    }
                }
                if (skippedRows.length > 0) {
                    message += `\n\nRows: ${skippedRows.slice(0, 3).join(', ')}`;
                    if (skippedRows.length > 3) {
                        message += ` and ${skippedRows.length - 3} more`;
                    }
                }
            }
            
            alert(message);
            console.log('🍳 Recipe CSV import completed:', {
                imported: importedRecipes.length,
                skippedRows: skippedRows.length,
                skippedRecipes: skippedRecipes.length,
                recipes: importedRecipes
            });
            
        } catch (error) {
            console.error('Recipe CSV import error:', error);
            throw error;
        }
    }

    parseCSVLine(line, separator = ',') {
        const result = [];
        let current = '';
        let inQuotes = false;
        let i = 0;
        
        while (i < line.length) {
            const char = line[i];
            const nextChar = line[i + 1];
            
            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    // Escaped quote
                    current += '"';
                    i += 2;
                } else {
                    // Toggle quote state
                    inQuotes = !inQuotes;
                    i++;
                }
            } else if (char === separator && !inQuotes) {
                // End of field
                result.push(current);
                current = '';
                i++;
            } else {
                current += char;
                i++;
            }
        }
        
        // Add the last field
        result.push(current);
        
        return result;
    }

    cleanCSVValue(value) {
        if (!value) return '';
        return value.trim().replace(/^"(.*)"$/, '$1'); // Remove surrounding quotes
    }

    // Check storage health
    checkStorageHealth() {
        try {
            const testKey = 'storage_test';
            const testValue = 'test';
            localStorage.setItem(testKey, testValue);
            const retrieved = localStorage.getItem(testKey);
            localStorage.removeItem(testKey);
            
            if (retrieved !== testValue) {
                throw new Error('Storage read/write mismatch');
            }
            
            console.log('✅ localStorage is working correctly');
            return true;
        } catch (e) {
            console.error('❌ localStorage is not working:', e);
            return false;
        }
    }

    // ===== IMAGE FUNCTIONALITY =====
    
    loadImageSettings() {
        try {
            const settings = localStorage.getItem('imageSettings');
            if (settings) {
                const parsed = JSON.parse(settings);
                return parsed.folderPath || '';
            }
        } catch (e) {
            console.error('Could not load image settings:', e);
        }
        return '';
    }

    initializeImageSettings() {
        if (this.imagesFolderPath) {
            this.imagesFolderPath.value = this.imagesFolderPathValue;
        }
    }


    isGoogleImageUrl(imageUrl) {
        if (!imageUrl || !imageUrl.trim()) return false;
        
        const googleDomains = [
            'lh3.googleusercontent.com',
            'lh4.googleusercontent.com', 
            'lh5.googleusercontent.com',
            'lh6.googleusercontent.com',
            'drive.google.com',
            'docs.google.com',
            'sites.google.com',
            'storage.googleapis.com'  // Added the missing googleapis domain (389 recipes)
        ];
        
        return googleDomains.some(domain => imageUrl.includes(domain));
    }

    generateLocalFilename(googleUrl, recipeName) {
        // Try to extract original filename from Google URL
        let filename = '';
        
        // For Google Drive/Photos URLs, extract filename or use recipe name
        const urlParts = googleUrl.split('/');
        const lastPart = urlParts[urlParts.length - 1];
        
        if (lastPart && lastPart.includes('.')) {
            // Found a filename with extension
            filename = lastPart.split('?')[0]; // Remove query parameters
        } else {
            // Generate filename from recipe name
            filename = recipeName
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
                .replace(/\s+/g, '-') // Replace spaces with hyphens
                .substring(0, 50) + '.jpg'; // Limit length and add extension
        }

        // Ensure unique filename
        return this.ensureUniqueFilename(filename);
    }

    ensureUniqueFilename(baseFilename) {
        const existingImages = new Set();
        
        // Collect all existing local image filenames
        this.recipes.forEach(recipe => {
            if (recipe.image && !recipe.image.includes('http')) {
                existingImages.add(recipe.image);
            }
        });

        let filename = baseFilename;
        let counter = 1;
        
        while (existingImages.has(filename)) {
            const nameParts = baseFilename.split('.');
            const extension = nameParts.pop();
            const baseName = nameParts.join('.');
            filename = `${baseName}-${counter}.${extension}`;
            counter++;
        }
        
        return filename;
    }

    createRecipeBackup() {
        const backup = {
            timestamp: new Date().toISOString(),
            recipes: JSON.parse(JSON.stringify(this.recipes))
        };
        
        localStorage.setItem('recipesBackupBeforeImageMigration', JSON.stringify(backup));
        console.log('📦 Recipe backup created');
    }

    async generateMigrationScript(googleImages) {
        // Create backup first
        this.createRecipeBackup();

        // Generate Python script content
        const scriptContent = this.createPythonMigrationScript(googleImages);
        
        // Generate data file with recipe mappings
        const dataContent = this.createMigrationDataFile(googleImages);
        
        // Download the script and data files
        this.downloadFile(scriptContent, 'migrate_google_images.py', 'text/python');
        this.downloadFile(dataContent, 'image_migration_data.json', 'application/json');
        
        // Update recipes to use local filenames (optimistic update)
        googleImages.forEach(imageInfo => {
            imageInfo.recipe.image = imageInfo.localFilename;
        });
        
        // Save updated recipes
        this.saveRecipes();
        
        // Sync to Firebase if available
        if (this.syncData) {
            await this.syncData();
        }

        // Show instructions
        this.showMigrationInstructions(googleImages.length);
    }

    createPythonMigrationScript(googleImages) {
        const script = `#!/usr/bin/env python3
"""
Google Images Migration Script for Recipe App
Auto-generated by your Recipe App

This script downloads Google images and uploads reduced versions to Firebase.
"""

import os
import json
import sys
import requests
from urllib.parse import urlparse
from PIL import Image
import firebase_admin
from firebase_admin import credentials, storage
from datetime import datetime

# Configuration
IMAGES_FOLDER = "${this.imagesFolderPathValue}"
MAX_SIZE = (800, 800)  # Firebase reduced size
QUALITY = 80

def setup_firebase():
    """Initialize Firebase - you'll need to add your service account key"""
    try:
        # You need to download your Firebase service account key
        # Go to: https://console.firebase.google.com/project/recipesgroceriesapp/settings/serviceaccounts/adminsdk
        # Generate and download the key, save as 'firebase-key.json'
        cred = credentials.Certificate('firebase-key.json')
        firebase_admin.initialize_app(cred, {
            'storageBucket': 'recipesgroceriesapp.appspot.com'
        })
        return storage.bucket()
    except Exception as e:
        print(f"⚠️  Firebase setup failed: {e}")
        print("Firebase uploads will be skipped")
        return None

def download_image(url, filename):
    """Download image from Google with proper headers"""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=30, stream=True)
        response.raise_for_status()
        
        # Save full-size image locally
        local_path = os.path.join(IMAGES_FOLDER, filename)
        os.makedirs(IMAGES_FOLDER, exist_ok=True)
        
        with open(local_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        print(f"✅ Downloaded: {filename}")
        return local_path
    except Exception as e:
        print(f"❌ Failed to download {filename}: {e}")
        return None

def create_reduced_version(image_path):
    """Create reduced version for Firebase"""
    try:
        with Image.open(image_path) as img:
            # Convert to RGB if necessary
            if img.mode in ('RGBA', 'LA', 'P'):
                img = img.convert('RGB')
            
            # Resize maintaining aspect ratio
            img.thumbnail(MAX_SIZE, Image.Resampling.LANCZOS)
            
            # Save to temporary file
            temp_path = image_path.replace('.jpg', '_reduced.jpg')
            img.save(temp_path, 'JPEG', quality=QUALITY, optimize=True)
            return temp_path
    except Exception as e:
        print(f"❌ Failed to create reduced version: {e}")
        return None

def upload_to_firebase(bucket, local_path, firebase_filename):
    """Upload reduced image to Firebase Storage"""
    if not bucket:
        return False
    
    try:
        blob = bucket.blob(f'recipe-images/{firebase_filename}')
        blob.upload_from_filename(local_path)
        
        # Make publicly accessible
        blob.make_public()
        
        print(f"🔥 Uploaded to Firebase: {firebase_filename}")
        return True
    except Exception as e:
        print(f"❌ Firebase upload failed for {firebase_filename}: {e}")
        return False

def main():
    print("🚀 Starting Google Images Migration...")
    print(f"📁 Target folder: {IMAGES_FOLDER}")
    
    # Load migration data
    with open('image_migration_data.json', 'r') as f:
        images_data = json.load(f)
    
    print(f"📸 Found {len(images_data)} images to migrate")
    
    # Setup Firebase
    bucket = setup_firebase()
    
    # Process each image
    success_count = 0
    failed_count = 0
    
    for i, image_info in enumerate(images_data, 1):
        print(f"\\n[{i}/{len(images_data)}] Processing: {image_info['recipeName']}")
        
        # Download full-size image
        local_path = download_image(image_info['originalUrl'], image_info['localFilename'])
        
        if local_path:
            success_count += 1
            
            # Create and upload reduced version to Firebase
            if bucket:
                reduced_path = create_reduced_version(local_path)
                if reduced_path:
                    upload_success = upload_to_firebase(bucket, reduced_path, image_info['localFilename'])
                    # Clean up temporary file
                    if os.path.exists(reduced_path):
                        os.remove(reduced_path)
        else:
            failed_count += 1
    
    print(f"\\n🎉 Migration Complete!")
    print(f"✅ Success: {success_count}")
    print(f"❌ Failed: {failed_count}")
    print(f"📁 Images saved to: {IMAGES_FOLDER}")
    
    if bucket:
        print(f"🔥 Reduced versions uploaded to Firebase Storage")

if __name__ == "__main__":
    # Check dependencies
    try:
        import requests, PIL, firebase_admin
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        print("\\nInstall with:")
        print("pip install requests pillow firebase-admin")
        sys.exit(1)
    
    main()
`;
        return script;
    }

    createMigrationDataFile(googleImages) {
        const data = googleImages.map(imageInfo => ({
            originalUrl: imageInfo.originalUrl,
            localFilename: imageInfo.localFilename,
            recipeName: imageInfo.recipeName,
            recipeId: imageInfo.recipeId
        }));
        
        return JSON.stringify(data, null, 2);
    }

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    showMigrationInstructions(imageCount) {
        const instructions = `🚀 Migration Script Generated!

✅ Downloaded Files:
• migrate_google_images.py (Python script)
• image_migration_data.json (Image data)

📋 Next Steps:

1. 📁 SETUP:
   • Move both files to a convenient folder
   • Install Python dependencies:
     pip install requests pillow firebase-admin

2. 🔥 FIREBASE SETUP (Optional):
   • Go to: https://console.firebase.google.com/project/recipesgroceriesapp/settings/serviceaccounts/adminsdk
   • Generate private key → Download as 'firebase-key.json'
   • Put firebase-key.json in same folder as the script

3. 🚀 RUN MIGRATION:
   • Open Terminal/Command Prompt
   • Navigate to folder with the files
   • Run: python3 migrate_google_images.py

4. ✅ RESULTS:
   • Full-size images → ${this.imagesFolderPathValue}
   • Reduced images → Firebase Storage (if configured)
   • Recipe references already updated in app!

⚡ The script bypasses browser security and downloads all ${imageCount} images automatically!`;

        alert(instructions);
        console.log('🚀 Migration script generated for', imageCount, 'images');
    }

    async downloadGoogleImageForRecipe(recipeId) {
        const recipe = this.recipes.find(r => r.id === recipeId);
        if (!recipe || !recipe.image) {
            alert('❌ Recipe or image not found');
            return;
        }

        if (!this.isGoogleImageUrl(recipe.image)) {
            alert('ℹ️ This recipe doesn\'t have a Google image URL');
            return;
        }

        if (!this.imagesFolderPathValue) {
            alert('⚠️ Please set your images folder path in Settings first');
            return;
        }

        // Generate local filename
        const localFilename = this.generateLocalFilename(recipe.image, recipe.name);

        const confirmDownload = confirm(`📥 Download Google image for "${recipe.name}"?\n\n🖼️ Google URL: ${recipe.image.substring(0, 60)}...\n📁 Save as: ${localFilename}\n\n✅ This will:\n• Open the image in a new tab\n• Update recipe to use local filename\n• Upload reduced version to Firebase\n\nContinue?`);

        if (!confirmDownload) return;

        try {
            // Update recipe immediately (optimistic update)
            const originalImage = recipe.image;
            recipe.image = localFilename;
            this.saveRecipes();
            
            // Sync to Firebase
            if (this.syncData) {
                await this.syncData();
            }

            // Refresh the display to show the updated recipe
            this.render();

            // Try to open image with fallback handling
            this.openImageWithFallback(originalImage, localFilename);

            // Try to upload to Firebase if we can create a reduced version
            if (window.storage) {
                this.attemptFirebaseUploadFromUrl(originalImage, localFilename, recipe.name);
            }

        } catch (error) {
            console.error('Download initiation failed:', error);
            alert(`❌ Error: ${error.message}`);
        }
    }

    async attemptFirebaseUploadFromUrl(imageUrl, filename, recipeName) {
        try {
            console.log(`🔥 Attempting Firebase upload for: ${recipeName}`);
            
            // Try to create an image element with the URL
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = async () => {
                try {
                    // Create canvas and resize
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // Calculate reduced size (max 800x800)
                    const maxSize = 800;
                    let { width, height } = img;
                    
                    if (width > height) {
                        if (width > maxSize) {
                            height = (height * maxSize) / width;
                            width = maxSize;
                        }
                    } else {
                        if (height > maxSize) {
                            width = (width * maxSize) / height;
                            height = maxSize;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Convert to blob and upload
                    canvas.toBlob(async (blob) => {
                        try {
                            await this.uploadImageToFirebase(blob, filename);
                            console.log(`✅ Firebase upload successful for: ${recipeName}`);
                        } catch (uploadError) {
                            console.log(`⚠️ Firebase upload failed for ${recipeName}:`, uploadError.message);
                        }
                    }, 'image/jpeg', 0.8);
                    
                } catch (canvasError) {
                    console.log(`⚠️ Canvas processing failed for ${recipeName}:`, canvasError.message);
                }
            };
            
            img.onerror = () => {
                console.log(`⚠️ Could not load image for Firebase upload: ${recipeName}`);
            };
            
            img.src = imageUrl;
            
        } catch (error) {
            console.log(`⚠️ Firebase upload attempt failed for ${recipeName}:`, error.message);
        }
    }

    async downloadCurrentImageUrl() {
        if (!this.currentEditingRecipe) {
            alert('❌ No recipe is currently being edited');
            return;
        }

        const imageUrl = this.editRecipeImage.value.trim();
        if (!imageUrl) {
            alert('⚠️ No image URL specified');
            return;
        }

        if (!imageUrl.startsWith('http')) {
            alert('ℹ️ Please enter a valid image URL (starting with http:// or https://)');
            return;
        }

        if (!this.imagesFolderPathValue) {
            alert('⚠️ Please set your images folder path in Settings first');
            return;
        }

        // Generate local filename from recipe name
        const localFilename = this.generateLocalFilenameFromRecipe(this.currentEditingRecipe.name, imageUrl);

        const confirmDownload = confirm(`📥 Save image as "${localFilename}"?\n\n🖼️ This will automatically:\n• Download image with recipe name to Downloads folder\n• Upload reduced version to Firebase for mobile access\n• Update recipe to use the new filename\n\n📂 Next step: Move "${localFilename}" from Downloads to:\n${this.imagesFolderPathValue}\n\n✅ Continue with automatic download?`);

        if (!confirmDownload) return;

        try {
            // Show progress
            console.log(`📥 Starting automatic download for: ${this.currentEditingRecipe.name}`);
            
            // Automatically download and process the image
            const success = await this.automaticImageDownload(imageUrl, localFilename, this.currentEditingRecipe.name);
            
            if (success) {
                console.log(`🔄 Updating recipe "${this.currentEditingRecipe.name}" image from "${this.currentEditingRecipe.image}" to "${localFilename}"`);
                
                // Update the input field
                this.editRecipeImage.value = localFilename;
                
                // Force DOM update and verify
                setTimeout(() => {
                    console.log(`🔍 Verifying input field update: "${this.editRecipeImage.value}"`);
                    if (this.editRecipeImage.value !== localFilename) {
                        console.error(`❌ Input field update failed! Expected: "${localFilename}", Got: "${this.editRecipeImage.value}"`);
                        this.editRecipeImage.value = localFilename; // Try again
                    }
                }, 100);
                
                // Update the actual recipe object
                this.currentEditingRecipe.image = localFilename;
                
                // Also find and update the recipe in the recipes array to ensure consistency
                const recipeIndex = this.recipes.findIndex(r => r.id === this.currentEditingRecipe.id);
                if (recipeIndex !== -1) {
                    this.recipes[recipeIndex].image = localFilename;
                    console.log(`🔄 Updated recipe in array at index ${recipeIndex}`);
                } else {
                    console.error(`❌ Could not find recipe with id ${this.currentEditingRecipe.id} in recipes array`);
                }
                
                // Save the updated recipe to localStorage
                this.saveRecipes();
                
                // Sync to Firebase if enabled
                if (this.useFirebase) {
                    await this.syncRecipeToFirebase(this.currentEditingRecipe);
                }
                
                // Update the preview
                this.updateImagePreview();
                
                // Re-render the recipes list to show updates everywhere
                this.render();
                
                console.log(`✅ Recipe image updated successfully. New value: "${this.editRecipeImage.value}"`);
                
                // Show success message
                alert(`✅ Image downloaded successfully!\n\n📁 Recipe-named file: ${localFilename}\n📍 Downloaded to: Downloads folder\n🔥 Reduced version uploaded to Firebase\n\n📂 Final step: Move "${localFilename}" from Downloads to:\n${this.imagesFolderPathValue}`);
            } else {
                alert(`❌ Download failed. The image might not be accessible or the URL might be invalid.\n\nTry:\n• Check if the image URL works in your browser\n• Use the manual method (open URL in new tab)`);
            }

        } catch (error) {
            console.error('Automatic download failed:', error);
            alert(`❌ Error: ${error.message}`);
        }
    }

    generateLocalFilenameFromRecipe(recipeName, imageUrl) {
        // Generate filename from recipe name
        let filename = recipeName
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .substring(0, 50); // Limit length

        // Try to detect image extension from URL
        let extension = '.jpg'; // Default
        const urlLower = imageUrl.toLowerCase();
        if (urlLower.includes('.png')) extension = '.png';
        else if (urlLower.includes('.gif')) extension = '.gif';
        else if (urlLower.includes('.webp')) extension = '.webp';
        else if (urlLower.includes('.jpeg')) extension = '.jpeg';

        filename += extension;

        // Ensure unique filename
        return this.ensureUniqueFilename(filename);
    }

    openImageWithFallback(imageUrl, filename) {
        // First, try to open in new tab
        const newTab = window.open('', '_blank');
        
        if (newTab && !newTab.closed) {
            // Popup allowed - navigate to image
            newTab.location.href = imageUrl;
            
            // Show instructions after a short delay
            setTimeout(() => {
                const instructions = `✅ Image opened in new tab!\n\n📋 Next Steps:\n\n1. 📥 SAVE IMAGE:\n   • Right-click on the image\n   • Select "Save Image As..."\n   • Save as: "${filename}"\n   • Location: ${this.imagesFolderPathValue}\n\n2. ✅ DONE:\n   • Image field already updated to: "${filename}"\n   • Firebase upload will happen automatically\n   • Remember to save your recipe!`;
                
                alert(instructions);
            }, 1500);

            console.log(`📥 Opened image in new tab for: ${filename}`);
        } else {
            // Popup blocked - provide manual instructions
            const manualInstructions = `🚫 Popup was blocked by your browser!\n\n📋 Manual Steps:\n\n1. 🔗 COPY URL:\n   ${imageUrl}\n\n2. 📥 MANUAL DOWNLOAD:\n   • Paste URL in new browser tab\n   • Right-click image → "Save Image As..."\n   • Save as: "${filename}"\n   • Location: ${this.imagesFolderPathValue}\n\n3. ✅ ENABLE POPUPS (Optional):\n   • Look for popup blocker icon in address bar\n   • Click it and select "Always allow popups"\n   • Try download button again\n\n✅ Image field already updated to: "${filename}"`;
            
            alert(manualInstructions);
            
            // Copy URL to clipboard if possible
            if (navigator.clipboard) {
                navigator.clipboard.writeText(imageUrl).then(() => {
                    console.log('📋 Image URL copied to clipboard');
                }).catch(() => {
                    console.log('📋 Could not copy URL to clipboard');
                });
            }
        }
    }

    
    testImagePath() {
        const path = this.imagesFolderPath.value.trim();
        if (!path) {
            alert('Please enter a folder path first');
            return;
        }
        
        // Update the stored path
        this.imagesFolderPathValue = path;
        if (this.firebaseSyncManager) {
            this.firebaseSyncManager.saveImageSettings();
        }
        
        // Test by trying to display a test image
        const testImagePath = this.buildImagePathSync('test.jpg');
        console.log('🧪 Testing image path:', testImagePath);
        
        // Create a temporary image to test if path is accessible
        const testImg = new Image();
        let testCompleted = false;
        
        // Set a timeout to prevent hanging
        const timeout = setTimeout(() => {
            if (!testCompleted) {
                testCompleted = true;
                console.log('⏰ Image test timed out after 3 seconds');
                alert(`⏰ Image test timed out

Path: ${path}
Generated URL: ${testImagePath}

This usually means:
• The path is not accessible to the browser
• File permissions issue
• Network/security blocking

Try:
• Make sure test.jpg exists in the folder
• Check if images work in actual recipes
• Browser security may have changed`);
            }
        }, 3000);
        
        testImg.onload = () => {
            if (!testCompleted) {
                testCompleted = true;
                clearTimeout(timeout);
                alert('✅ Path works! Test image loaded successfully.');
            }
        };
        
        testImg.onerror = () => {
            if (!testCompleted) {
                testCompleted = true;
                clearTimeout(timeout);
                console.log('❌ Test image failed to load from:', testImagePath);
                
                alert(`❌ Test image failed to load

Path: ${path}
Generated URL: ${testImagePath}

Possible issues:
• No test.jpg file in the folder
• File permissions or security policy
• Path format incorrect

Browser info:
• Running from: ${window.location.protocol}//${window.location.host}
• User agent: ${navigator.userAgent.substring(0, 50)}...`);
            }
        };
        
        testImg.src = testImagePath;
    }
    
   
// ### added from ChatGPT5 20250809 08:44

// Synchronous version for immediate display (lets async loader swap Firebase URLs)
buildImagePathSync(filename) {
  if (!filename) return '';

  // Where the user configured the local folder in the Categories tab
  const basePath = this.imagesFolderPathValue || '';
  const normalizedBase = basePath && (basePath.endsWith('/') ? basePath : basePath + '/');

  const isLocalhost = window.location.hostname === 'localhost';
  const isFileProto = window.location.protocol === 'file:';
  const isDesktopMac = this.isDesktopMac && this.isDesktopMac();
  const isMobileUA = /iphone|ipad|android/i.test(navigator.userAgent);

  // 1) Desktop local development → use the user’s local folder path (fast)
  if ((isLocalhost || isFileProto) && isDesktopMac && normalizedBase && normalizedBase.startsWith('/')) {
    const encodedPath = normalizedBase.split('/').map(seg => seg ? encodeURIComponent(seg) : '').join('/');
    const encodedFile = encodeURIComponent(filename);
    return 'file://' + encodedPath + encodedFile;
  }

  // 2) If a web URL was entered as the folder, allow it
  if (normalizedBase && normalizedBase.startsWith('http')) {
    return normalizedBase + encodeURIComponent(filename);
  }

  // 3) Any hosted environment or mobile devices → let async loader fetch from Firebase
  // Return a tiny transparent placeholder; enhanced-recipe-renderer will replace it.
  return 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
}


// ### added from ChatGPT5 


    

    async buildImagePath(filename) {
        if (!filename) return '';
        
        // Smart image selection based on platform
        const isMobile = this.isMobileDevice();
        const isDesktopMac = this.isDesktopMac();
        const isGitHubPages = this.isGitHubPages();
        
        if ((isMobile || isGitHubPages) && window.storage) {
            // Mobile devices (iPad, iPhone) or GitHub Pages - always prefer Firebase reduced images
            try {
                const firebaseUrl = await this.getFirebaseImageUrl(filename);
                if (firebaseUrl) {
                    const platform = isMobile ? 'Mobile' : 'GitHub Pages';
                    console.log(`📱 ${platform}: Using Firebase reduced image:`, firebaseUrl);
                    return firebaseUrl;
                }
                const platform = isMobile ? 'Mobile' : 'GitHub Pages';
                console.log(`📱 ${platform}: Firebase image not found, using fallback`);
            } catch (error) {
                const platform = isMobile ? 'Mobile' : 'GitHub Pages';
                console.log(`📱 ${platform}: Firebase error, using fallback:`, error.message);
            }
        } else if (isDesktopMac) {
            // Desktop Mac - prefer local full-size images
            const localPath = this.buildImagePathSync(filename);
            console.log('🖥️ Mac Desktop: Using local full-size image:', localPath);
            return localPath;
        }
        
        // Fallback to synchronous path building for other cases
        return this.buildImagePathSync(filename);
    }

    isMobileDevice() {
        const userAgent = navigator.userAgent.toLowerCase();
        return /iphone|ipad|android/.test(userAgent);
    }

    isDesktopMac() {
        const userAgent = navigator.userAgent.toLowerCase();
        const isLocalFile = window.location.protocol === 'file:';
        const isMac = /macintosh|mac os x/.test(userAgent);
        return isLocalFile && isMac && !this.isMobileDevice();
    }

    isGitHubPages() {
        const isWebHosted = window.location.protocol.startsWith('http');
        const hostname = window.location.hostname.toLowerCase();
        // GitHub Pages domains: username.github.io, custom domains, etc.
        return isWebHosted && (
            hostname.includes('github.io') || 
            hostname.includes('githubpages') ||
            // For any web-hosted version that's not local
            (isWebHosted && !hostname.includes('localhost') && !hostname.includes('127.0.0.1'))
        );
    }

    async getFirebaseImageUrl(filename) {
        if (!window.storage) return null;
        
        try {
            // Try to get the download URL for the image
            const imageRef = window.storage.ref(`recipe-images/${filename}`);
            const url = await imageRef.getDownloadURL();
            return url;
        } catch (error) {
            // Image doesn't exist in Firebase Storage
            console.log(`📷 Image ${filename} not found in Firebase Storage`);
            return null;
        }
    }

    async uploadImageToFirebase(file, filename) {
        if (!window.storage) {
            throw new Error('Firebase Storage not initialized');
        }

        try {
            // Resize image before upload for better performance
            const resizedFile = await this.resizeImage(file, 800, 800, 0.8);
            
            // Upload to Firebase Storage
            const imageRef = window.storage.ref(`recipe-images/${filename}`);
            const uploadTask = await imageRef.put(resizedFile);
            
            // Get download URL
            const downloadURL = await uploadTask.ref.getDownloadURL();
            
            console.log('🔥 Image uploaded to Firebase Storage:', downloadURL);
            return downloadURL;
            
        } catch (error) {
            console.error('❌ Error uploading image to Firebase:', error);
            throw error;
        }
    }

    resizeImage(file, maxWidth, maxHeight, quality = 0.8) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                // Calculate new dimensions
                const ratio = Math.min(maxWidth / img.width, maxHeight / img.height);
                const newWidth = img.width * ratio;
                const newHeight = img.height * ratio;
                
                // Set canvas size
                canvas.width = newWidth;
                canvas.height = newHeight;
                
                // Draw resized image
                ctx.drawImage(img, 0, 0, newWidth, newHeight);
                
                // Convert to blob
                canvas.toBlob(resolve, 'image/jpeg', quality);
            };
            
            img.src = URL.createObjectURL(file);
        });
    }
    
    async updateImagePreview() {
        const filename = this.editRecipeImage.value.trim();
        
        // Show/hide download button based on whether there's a URL (starts with http)
        if (filename && filename.startsWith('http')) {
            this.downloadImageUrlBtn.style.display = 'inline-block';
        } else {
            this.downloadImageUrlBtn.style.display = 'none';
        }
        
        if (filename) {
            // First, try to load image synchronously for immediate display
            const syncImagePath = this.buildImagePathSync(filename);
            console.log('🖼️ Image preview - filename:', filename);
            console.log('🖼️ Image preview - sync path:', syncImagePath);
            
            this.previewImage.src = syncImagePath;
            this.previewImage.onerror = async (e) => {
                // Prevent infinite loop by clearing the error handler
                this.previewImage.onerror = null;
                console.log('❌ Sync image failed, trying Firebase...', syncImagePath);
                
                // If sync fails and Firebase is enabled, try Firebase
                if (this.firebaseSyncManager?.useFirebaseImages && window.storage && !syncImagePath.includes('firebase')) {
                    try {
                        const firebasePath = await this.buildImagePath(filename);
                        console.log('🔥 Trying Firebase path:', firebasePath);
                        this.previewImage.onerror = () => {
                            console.log('❌ Firebase image also failed');
                            this.imagePreview.style.display = 'none';
                        };
                        this.previewImage.src = firebasePath;
                    } catch (fbError) {
                        console.log('❌ Firebase image also failed:', fbError);
                        this.imagePreview.style.display = 'none';
                    }
                } else {
                    this.imagePreview.style.display = 'none';
                }
            };
            this.previewImage.onload = () => {
                console.log('✅ Image preview loaded successfully:', this.previewImage.src);
                this.imagePreview.style.display = 'block';
            };
        } else {
            this.imagePreview.style.display = 'none';
        }
    }
    
    browseForImage() {
        this.imageFileInput.click();
    }
    
    async handleImageSelection(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Extract just the filename
        const filename = file.name;
        
        // Update the input field
        this.editRecipeImage.value = filename;
        
        const isDesktopMac = this.isDesktopMac();
        const isGitHubPages = this.isGitHubPages();
        
        if (isDesktopMac && window.storage) {
            // Mac Desktop: Always auto-upload reduced version to Firebase for mobile devices
            try {
                console.log('🖥️ Mac: Auto-uploading reduced version to Firebase for mobile access...', filename);
                const downloadURL = await this.uploadImageToFirebase(file, filename);
                console.log('✅ Reduced image uploaded to Firebase for mobile devices:', downloadURL);
                
                // Show success message with Mac-specific workflow
                const targetPath = this.imagesFolderPathValue || 'your images folder';
                alert(`✅ Image setup complete!\n\n🖥️ Mac: Using full-size local image\n📱 Mobile: Reduced version uploaded to Firebase\n\n💡 Copy "${filename}" to: ${targetPath}`);
                
            } catch (error) {
                console.error('❌ Failed to upload reduced version to Firebase:', error);
                const targetPath = this.imagesFolderPathValue || 'your images folder';
                alert(`⚠️ Image selected but Firebase upload failed\n\n🖥️ Mac: Will use local image\n📱 Mobile: Image won't be available\n\n💡 Copy "${filename}" to: ${targetPath}\n\nError: ${error.message}`);
            }
        } else if (isGitHubPages) {
            // GitHub Pages: Images should come from Firebase only (no uploads)
            alert(`📁 Image filename set: ${filename}\n\n🌐 GitHub Pages: Will use Firebase image if available\n📱 Mobile: Will use Firebase image if available\n\n💡 To upload images, use the Mac local version of the app`);
        } else if (window.storage) {
            // Web/Other platforms: Offer Firebase upload
            const uploadToFirebase = confirm(`🔥 Upload "${filename}" to Firebase Storage?\n\n✅ This will automatically resize the image and make it available on all your devices (iPad, iPhone, etc.)\n\n❌ Cancel to just use local file reference`);
            
            if (uploadToFirebase) {
                try {
                    console.log('🔥 Uploading image to Firebase...', filename);
                    const downloadURL = await this.uploadImageToFirebase(file, filename);
                    console.log('✅ Image uploaded to Firebase successfully:', downloadURL);
                    alert(`✅ Image uploaded to Firebase Storage successfully!\n\nThe image "${filename}" is now available on all your devices.`);
                } catch (error) {
                    console.error('❌ Failed to upload to Firebase:', error);
                    alert(`❌ Failed to upload to Firebase: ${error.message}\n\nThe image filename has been saved, but you'll need to copy the file manually or try uploading again.`);
                }
            }
        } else {
            // No Firebase: Traditional workflow
            const targetPath = this.imagesFolderPathValue || 'your images folder';
            alert(`📁 Image selected: ${filename}\n\n💡 Don't forget to copy this file to:\n${targetPath}\n\n🔥 Tip: Enable Firebase for cross-device image sync!`);
        }
        
        // Update preview
        this.updateImagePreview();
    }
    
    removeImage() {
        this.editRecipeImage.value = '';
        this.imagePreview.style.display = 'none';
    }
    
    getRecipeImageUrl(recipe) {
        if (!recipe.image) return null;
        
        // Use the new environment-aware smart image system
        if (window.smartImages && window.EnvironmentConfig) {
            // For synchronous calls, we'll use the environment config directly
            const imageStrategy = window.EnvironmentConfig.getImageLoadingStrategy();
            
            if (imageStrategy.bypassFirebase && imageStrategy.source === "LOCAL_ONLY") {
                // Mac Local: Direct local path
                return `${imageStrategy.localPath}${recipe.image}`;
            } else if (imageStrategy.bypassFirebase && imageStrategy.source === "SHARED_FOLDER") {
                // Shared Local: Direct local path  
                return `${imageStrategy.localPath}${recipe.image}`;
            }
        }
        
        // Fallback to old system if new system not available
        return this.buildImagePathSync(recipe.image);
    }

    async getRecipeImageUrlAsync(recipe) {
        if (!recipe.image) return null;
        return await this.buildImagePath(recipe.image);
    }
    
    // ===== DYNAMIC FORM OPTIONS UPDATES =====
    
    updateFormOptionsWithNewValues(newUnits, newCuisines, newSeasons) {
        // Add new units to ingredient unit select
        if (newUnits.size > 0) {
            const unitSelect = this.ingredientUnit;
            if (unitSelect) {
                newUnits.forEach(unit => {
                    // Check if option already exists
                    const existingOption = Array.from(unitSelect.options).find(opt => opt.value === unit);
                    if (!existingOption) {
                        const option = document.createElement('option');
                        option.value = unit;
                        option.textContent = unit;
                        unitSelect.appendChild(option);
                        console.log(`➕ Added new unit option: ${unit}`);
                    }
                });
            }
        }
        
        // Add new cuisines to datalist
        if (newCuisines.size > 0) {
            const cuisineDatalist = document.getElementById('cuisineOptions');
            if (cuisineDatalist) {
                newCuisines.forEach(cuisine => {
                    // Check if option already exists
                    const existingOption = Array.from(cuisineDatalist.options).find(opt => opt.value === cuisine);
                    if (!existingOption) {
                        const option = document.createElement('option');
                        option.value = cuisine;
                        cuisineDatalist.appendChild(option);
                        console.log(`➕ Added new cuisine option: ${cuisine}`);
                    }
                });
            }
        }
        
        // Add new seasons to season select
        if (newSeasons.size > 0) {
            const seasonSelect = this.editRecipeSeason;
            if (seasonSelect) {
                newSeasons.forEach(season => {
                    // Check if option already exists
                    const existingOption = Array.from(seasonSelect.options).find(opt => opt.value === season);
                    if (!existingOption) {
                        const option = document.createElement('option');
                        option.value = season;
                        option.textContent = season.charAt(0).toUpperCase() + season.slice(1); // Capitalize first letter
                        seasonSelect.appendChild(option);
                        console.log(`➕ Added new season option: ${season}`);
                    }
                });
            }
        }
    }
    
    // ===== TWO-FILE RECIPE IMPORT =====
    
    startTwoFileRecipeImport() {
        // Reset state
        this.pendingRecipeInfoData = null;
        this.pendingRecipeIngredientsData = null;
        
        // Hide manual button
        this.importIngredientsFileBtn.style.display = 'none';
        
        // Start with info file
        this.recipeInfoFileInput.click();
    }
    
    selectIngredientsFileManually() {
        if (!this.pendingRecipeInfoData) {
            alert('⚠️ Please select the recipe info file first by clicking "📄 Import Recipes (Two Files)".');
            return;
        }
        
        console.log('🔄 Manual ingredients file selection...');
        this.recipeIngredientsFileInput.click();
    }
    
    downloadTwoFileRecipeTemplates() {
        try {
            this.downloadTwoFileTemplatesBtn.disabled = true;
            this.downloadTwoFileTemplatesBtn.textContent = '📋 Generating...';
            
            // Create recipe info template
            const infoHeaders = ['recipeName', 'description', 'preparation', 'cuisine', 'mainIngredient', 'season', 'image', 'ingredientsText', 'persons'];
            const infoSample = [
                '"Belgian Waffles","Sweet breakfast treat","Mix batter and cook in waffle iron","Belgian","eggs","all-year","waffles.jpg","2 cups flour, 3 eggs, 250ml milk, 50g sugar","4"',
                '"Pasta Bolognese","Classic Italian meat sauce pasta","Brown meat cook sauce serve over pasta","Italian","beef","all-year","bolognese.jpg","400g pasta, 300g ground beef, 400ml tomato sauce, 1 onion","6"'
            ];
            const infoCsv = [infoHeaders.join(','), ...infoSample].join('\n');
            
            // Download info template
            const infoBlob = new Blob([infoCsv], { type: 'text/csv;charset=utf-8;' });
            const infoUrl = URL.createObjectURL(infoBlob);
            const infoLink = document.createElement('a');
            infoLink.href = infoUrl;
            infoLink.download = 'recipe-info-template.csv';
            document.body.appendChild(infoLink);
            infoLink.click();
            document.body.removeChild(infoLink);
            URL.revokeObjectURL(infoUrl);
            
            // Download ingredients template after short delay
            setTimeout(() => {
                const ingredientsHeaders = ['recipeName', 'ingredientName', 'quantity', 'unit'];
                const ingredientsSample = [
                    '"Belgian Waffles","flour",200,"g"',
                    '"Belgian Waffles","eggs",2,"pcs"',
                    '"Belgian Waffles","milk",250,"ml"',
                    '"Belgian Waffles","sugar",50,"g"',
                    '"Pasta Bolognese","pasta",400,"g"',
                    '"Pasta Bolognese","ground beef",300,"g"',
                    '"Pasta Bolognese","tomato sauce",400,"ml"',
                    '"Pasta Bolognese","onion",1,"pcs"'
                ];
                const ingredientsCsv = [ingredientsHeaders.join(','), ...ingredientsSample].join('\n');
                
                const ingredientsBlob = new Blob([ingredientsCsv], { type: 'text/csv;charset=utf-8;' });
                const ingredientsUrl = URL.createObjectURL(ingredientsBlob);
                const ingredientsLink = document.createElement('a');
                ingredientsLink.href = ingredientsUrl;
                ingredientsLink.download = 'recipe-ingredients-template.csv';
                document.body.appendChild(ingredientsLink);
                ingredientsLink.click();
                document.body.removeChild(ingredientsLink);
                URL.revokeObjectURL(ingredientsUrl);
                
                // Show success message
                alert('📋 Two template files downloaded:\n• recipe-info-template.csv\n• recipe-ingredients-template.csv\n\nFill both files with your recipe data.');
                
                // Reset button
                this.downloadTwoFileTemplatesBtn.disabled = false;
                this.downloadTwoFileTemplatesBtn.textContent = '📋 Download Templates';
                
            }, 1000);
            
        } catch (error) {
            console.error('Template download failed:', error);
            alert('Template download failed. Please try again.');
            this.downloadTwoFileTemplatesBtn.disabled = false;
            this.downloadTwoFileTemplatesBtn.textContent = '📋 Download Templates';
        }
    }
    
    handleRecipeInfoFile(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        console.log('📄 Info file selected:', file.name);
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                this.pendingRecipeInfoData = this.parseRecipeInfoCsv(e.target.result);
                console.log('📄 Recipe info loaded:', this.pendingRecipeInfoData.length, 'recipes');
                
                // Reset the ingredients file input to ensure it's clean
                this.recipeIngredientsFileInput.value = '';
                
                // Show manual button and try automatic approach
                this.importIngredientsFileBtn.style.display = 'inline-block';
                this.importIngredientsFileBtn.textContent = '📄 Select Ingredients File (Ready!)';
                
                const proceed = confirm(`📄 Recipe info loaded (${this.pendingRecipeInfoData.length} recipes).\n\nReady to select the ingredients file?\n\nClick OK for automatic selection, or Cancel to use the manual button.`);
                
                if (proceed) {
                    // Try automatic approach
                    console.log('🔄 Attempting automatic ingredients file dialog...');
                    
                    setTimeout(() => {
                        try {
                            this.recipeIngredientsFileInput.click();
                            console.log('✅ Automatic file dialog opened');
                        } catch (e) {
                            console.error('❌ Automatic approach failed:', e);
                            alert('⚠️ Automatic file selection failed. Please use the "📄 Select Ingredients File" button below.');
                        }
                    }, 300);
                } else {
                    // User prefers manual approach
                    alert('👆 Use the "📄 Select Ingredients File" button when ready.');
                }
                
            } catch (error) {
                console.error('Recipe info file parsing failed:', error);
                alert(`Recipe info file error: ${error.message}`);
                this.pendingRecipeInfoData = null;
            } finally {
                // Reset the info file input
                this.recipeInfoFileInput.value = '';
            }
        };
        
        reader.readAsText(file);
    }
    
    handleRecipeIngredientsFile(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        console.log('📄 Ingredients file selected:', file.name);
        
        if (!this.pendingRecipeInfoData) {
            alert('Please select the recipe info file first.');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                this.pendingRecipeIngredientsData = this.parseRecipeIngredientsCsv(e.target.result);
                console.log('📄 Recipe ingredients loaded:', this.pendingRecipeIngredientsData.length, 'ingredients');
                
                // Process both files
                this.processTwoFileRecipeImport();
                
            } catch (error) {
                console.error('Recipe ingredients file parsing failed:', error);
                alert(`Recipe ingredients file error: ${error.message}`);
                this.pendingRecipeIngredientsData = null;
            } finally {
                // Reset file inputs
                this.recipeInfoFileInput.value = '';
                this.recipeIngredientsFileInput.value = '';
            }
        };
        
        reader.readAsText(file);
    }
    
    parseRecipeInfoCsv(csvData) {
        // Use proper CSV parsing that handles quoted multi-line fields
        const records = this.parseCSVWithQuotes(csvData);
        
        if (records.length < 2) {
            throw new Error('Recipe info file must have at least a header row and one data row');
        }
        
        const headers = records[0].map(h => h.trim().toLowerCase());
        const requiredHeaders = ['recipename'];
        
        // Validate headers
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
        if (missingHeaders.length > 0) {
            throw new Error(`Missing required headers in info file: ${missingHeaders.join(', ')}`);
        }
        
        const recipeInfos = [];
        
        // Process data rows (skip header row)
        for (let i = 1; i < records.length; i++) {
            const values = records[i];
            const info = {};
            
            // Map values to headers
            headers.forEach((header, index) => {
                if (values[index] !== undefined) {
                    info[header] = this.cleanCSVValue(values[index]);
                }
            });
            
            if (info.recipename) {
                recipeInfos.push(info);
            }
        }
        
        console.log(`📊 Parsed ${recipeInfos.length} unique recipes from ${records.length - 1} data rows`);
        return recipeInfos;
    }
    
    parseCSVWithQuotes(csvData) {
        const lines = csvData.trim().split('\n');
        const records = [];
        let currentRecord = [];
        let currentField = '';
        let inQuotes = false;
        let i = 0;
        
        // Detect separator
        const firstLine = lines[0];
        const separator = firstLine.includes(';') && firstLine.split(';').length > firstLine.split(',').length ? ';' : ',';
        
        for (const line of lines) {
            let j = 0;
            while (j < line.length) {
                const char = line[j];
                
                if (char === '"') {
                    if (inQuotes && j + 1 < line.length && line[j + 1] === '"') {
                        // Escaped quote
                        currentField += '"';
                        j += 2;
                    } else {
                        // Toggle quote state
                        inQuotes = !inQuotes;
                        j++;
                    }
                } else if (char === separator && !inQuotes) {
                    // Field separator
                    currentRecord.push(currentField);
                    currentField = '';
                    j++;
                } else {
                    currentField += char;
                    j++;
                }
            }
            
            if (!inQuotes) {
                // End of record
                currentRecord.push(currentField);
                records.push(currentRecord);
                currentRecord = [];
                currentField = '';
            } else {
                // Multi-line field, add newline
                currentField += '\n';
            }
        }
        
        // Handle case where last record wasn't completed
        if (currentRecord.length > 0 || currentField) {
            currentRecord.push(currentField);
            records.push(currentRecord);
        }
        
        return records;
    }
    
    parseRecipeIngredientsCsv(csvData) {
        const lines = csvData.trim().split('\n');
        if (lines.length < 2) {
            throw new Error('Recipe ingredients file must have at least a header row and one data row');
        }
        
        // Detect separator
        const firstLine = lines[0];
        const separator = firstLine.includes(';') && firstLine.split(';').length > firstLine.split(',').length ? ';' : ',';
        
        // Parse headers
        const headers = lines[0].split(separator).map(h => h.trim().toLowerCase());
        const requiredHeaders = ['recipename', 'ingredientname', 'quantity', 'unit'];
        
        // Validate headers
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
        if (missingHeaders.length > 0) {
            throw new Error(`Missing required headers in ingredients file: ${missingHeaders.join(', ')}`);
        }
        
        const ingredients = [];
        this.newUnitsFromTwoFile = new Set(); // Store for later use
        
        // Process data rows
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const values = line.split(separator).map(v => v.trim());
            const ingredient = {};
            
            // Map values to headers
            headers.forEach((header, index) => {
                if (values[index] !== undefined) {
                    ingredient[header] = values[index];
                }
            });
            
            if (ingredient.recipename && ingredient.ingredientname) {
                // Validate and track new units
                const unit = ingredient.unit?.trim();
                if (unit) {
                    const validUnits = new Set(['g', 'kg', 'ml', 'cl', 'l', 'pcs', 'pinch', 'tsp', 'tbsp', 'cup']);
                    if (!validUnits.has(unit)) {
                        if (unit.length > 0 && unit.length <= 10) {
                            this.newUnitsFromTwoFile.add(unit);
                            console.log(`🆕 New unit discovered in ingredients file: "${unit}"`);
                        }
                    }
                }
                ingredients.push(ingredient);
            }
        }
        
        return ingredients;
    }
    
    processTwoFileRecipeImport() {
        try {
            if (!this.pendingRecipeInfoData || !this.pendingRecipeIngredientsData) {
                throw new Error('Both recipe files are required');
            }
            
            const importedRecipes = [];
            const skippedRecipes = [];
            const skippedIngredients = [];
            
            // Process each recipe info
            for (const recipeInfo of this.pendingRecipeInfoData) {
                const recipeName = recipeInfo.recipename;
                
                // Check for existing recipe
                const existingRecipe = this.recipes.find(r => 
                    r.name.toLowerCase() === recipeName.toLowerCase()
                );
                
                if (existingRecipe) {
                    skippedRecipes.push(`Recipe "${recipeName}" already exists`);
                    continue;
                }
                
                // Find ingredients for this recipe
                const recipeIngredients = this.pendingRecipeIngredientsData.filter(ing => 
                    ing.recipename.toLowerCase() === recipeName.toLowerCase()
                );
                
                if (recipeIngredients.length === 0) {
                    skippedRecipes.push(`Recipe "${recipeName}" has no ingredients`);
                    continue;
                }
                
                // Build ingredients array
                const ingredients = [];
                for (const ing of recipeIngredients) {
                    // Find matching product
                    const product = this.allProducts.find(p => 
                        p.name.toLowerCase() === ing.ingredientname.toLowerCase()
                    );
                    
                    if (!product) {
                        skippedIngredients.push(`${recipeName}: "${ing.ingredientname}" not found in products`);
                        continue;
                    }
                    
                    const quantity = parseFloat(ing.quantity);
                    if (isNaN(quantity) || quantity <= 0) {
                        skippedIngredients.push(`${recipeName}: "${ing.ingredientname}" has invalid quantity`);
                        continue;
                    }
                    
                    ingredients.push({
                        productId: product.id,
                        productName: product.name,
                        quantity: quantity,
                        unit: ing.unit || 'pcs'
                    });
                }
                
                if (ingredients.length === 0) {
                    skippedRecipes.push(`Recipe "${recipeName}" has no valid ingredients`);
                    continue;
                }
                
                // Create new recipe
                const newRecipe = {
                    id: Date.now() + Math.random(),
                    name: recipeName,
                    description: recipeInfo.description || '',
                    preparation: recipeInfo.preparation || '',
                    ingredients: ingredients,
                    ingredientsText: recipeInfo.ingredientstext || '',
                    persons: parseInt(recipeInfo.persons) || 4,
                    image: recipeInfo.image || '',
                    metadata: {
                        cuisine: recipeInfo.cuisine || '',
                        mainIngredient: recipeInfo.mainingredient || '',
                        season: recipeInfo.season || ''
                    },
                    dateCreated: new Date().toISOString()
                };
                
                importedRecipes.push(newRecipe);
            }
            
            if (importedRecipes.length === 0) {
                throw new Error('No valid recipes to import');
            }
            
            // Collect new values from info data
            const newCuisinesFound = new Set();
            const newSeasonsFound = new Set();
            
            this.pendingRecipeInfoData.forEach(info => {
                if (info.cuisine && !['belgian', 'italian', 'french', 'spanish', 'greek', 'asian', 'mexican', 'american', 'mediterranean', 'international'].includes(info.cuisine.toLowerCase())) {
                    newCuisinesFound.add(info.cuisine);
                }
                if (info.season && !['spring', 'summer', 'autumn', 'winter', 'all-year'].includes(info.season.toLowerCase())) {
                    newSeasonsFound.add(info.season);
                }
            });
            
            // Add recipes to the list
            this.recipes.push(...importedRecipes);
            this.saveRecipes();
            this.render();
            
            // Update UI with new values discovered
            this.updateFormOptionsWithNewValues(this.newUnitsFromTwoFile || new Set(), newCuisinesFound, newSeasonsFound);
            
            // Show results
            let message = `✅ Successfully imported ${importedRecipes.length} recipes!`;
            
            // Add info about new values discovered
            const hasNewUnits = this.newUnitsFromTwoFile && this.newUnitsFromTwoFile.size > 0;
            if (hasNewUnits || newCuisinesFound.size > 0 || newSeasonsFound.size > 0) {
                message += '\n\n🆕 New values discovered:';
                if (hasNewUnits) {
                    message += `\n• Units: ${Array.from(this.newUnitsFromTwoFile).join(', ')}`;
                }
                if (newCuisinesFound.size > 0) {
                    message += `\n• Cuisines: ${Array.from(newCuisinesFound).join(', ')}`;
                }
                if (newSeasonsFound.size > 0) {
                    message += `\n• Seasons: ${Array.from(newSeasonsFound).join(', ')}`;
                }
            }
            
            if (skippedRecipes.length > 0 || skippedIngredients.length > 0) {
                const totalSkipped = skippedRecipes.length + skippedIngredients.length;
                message += `\n\n⚠️ Skipped ${totalSkipped} issues:`;
                
                if (skippedRecipes.length > 0) {
                    message += `\n\nRecipes: ${skippedRecipes.slice(0, 3).join(', ')}`;
                    if (skippedRecipes.length > 3) {
                        message += `... and ${skippedRecipes.length - 3} more`;
                    }
                }
                
                if (skippedIngredients.length > 0) {
                    message += `\n\nIngredients: ${skippedIngredients.slice(0, 3).join(', ')}`;
                    if (skippedIngredients.length > 3) {
                        message += `... and ${skippedIngredients.length - 3} more`;
                    }
                }
            }
            
            alert(message);
            console.log('📄📄 Two-file recipe import completed:', {
                imported: importedRecipes.length,
                skippedRecipes: skippedRecipes.length,
                skippedIngredients: skippedIngredients.length
            });
            
        } catch (error) {
            console.error('Two-file recipe import failed:', error);
            alert(`Import failed: ${error.message}`);
        } finally {
            // Reset state
            this.pendingRecipeInfoData = null;
            this.pendingRecipeIngredientsData = null;
            
            // Hide manual button
            this.importIngredientsFileBtn.style.display = 'none';
        }
    }

    downloadRecipeOnlyTemplate() {
        const template = `recipeName,description,preparation,cuisine,mainIngredient,season,image,ingredientsText,persons
Belgian Waffles,Crispy golden waffles perfect for breakfast,Mix flour and eggs. Cook in waffle iron until golden. Serve with syrup.,Belgian,flour,all-year,belgian-waffles.jpg,"2 cups flour, 3 eggs, 1 cup milk, 2 tbsp sugar, 1/2 tsp salt, butter for serving",4
Pasta Carbonara,Classic Italian pasta with eggs and bacon,Cook pasta. Mix eggs with cheese. Combine with bacon and pasta.,Italian,pasta,all-year,carbonara.jpg,"400g spaghetti, 4 eggs, 200g bacon, 100g parmesan cheese, black pepper, salt",4`;

        const blob = new Blob([template], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'recipe-only-template.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    handleRecipeOnlyImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const csvText = e.target.result;
                const lines = this.parseCSVWithQuotes(csvText);
                
                if (lines.length < 2) {
                    throw new Error('CSV file must have at least a header row and one data row');
                }

                // Parse header
                const headers = lines[0].map(h => h.toLowerCase().trim());
                const requiredHeaders = ['recipename', 'description', 'preparation', 'cuisine', 'mainingredient', 'season', 'image', 'ingredientstext', 'persons'];
                
                // Validate headers
                for (const required of requiredHeaders) {
                    if (!headers.includes(required)) {
                        throw new Error(`Missing required column: ${required}`);
                    }
                }

                // Get column indices
                const recipeNameIndex = headers.indexOf('recipename');
                const descriptionIndex = headers.indexOf('description');
                const preparationIndex = headers.indexOf('preparation');
                const cuisineIndex = headers.indexOf('cuisine');
                const mainIngredientIndex = headers.indexOf('mainingredient');
                const seasonIndex = headers.indexOf('season');
                const imageIndex = headers.indexOf('image');
                const ingredientsTextIndex = headers.indexOf('ingredientstext');
                const personsIndex = headers.indexOf('persons');

                const importedRecipes = [];
                const skippedRecipes = [];
                const newCuisinesFound = new Set();
                const newSeasonsFound = new Set();

                // Process data rows
                for (let i = 1; i < lines.length; i++) {
                    try {
                        const values = lines[i];
                        
                        if (values.length < requiredHeaders.length) {
                            skippedRecipes.push(`Row ${i + 1}: Not enough columns`);
                            continue;
                        }

                        const recipeName = values[recipeNameIndex]?.trim();
                        const description = values[descriptionIndex]?.trim() || '';
                        const preparation = values[preparationIndex]?.trim() || '';
                        const cuisine = values[cuisineIndex]?.trim() || '';
                        const mainIngredient = values[mainIngredientIndex]?.trim() || '';
                        const season = values[seasonIndex]?.trim() || '';
                        const image = values[imageIndex]?.trim() || '';
                        const ingredientsText = values[ingredientsTextIndex]?.trim() || '';
                        const persons = parseInt(values[personsIndex]?.trim()) || 4;

                        // Validate required fields
                        if (!recipeName) {
                            skippedRecipes.push(`Row ${i + 1}: Recipe name is required`);
                            continue;
                        }

                        if (!ingredientsText) {
                            skippedRecipes.push(`Row ${i + 1}: Ingredients text is required for recipe-only import`);
                            continue;
                        }

                        // Check for existing recipe
                        const existingRecipe = this.recipes.find(r => 
                            r.name.toLowerCase() === recipeName.toLowerCase()
                        );
                        
                        if (existingRecipe) {
                            skippedRecipes.push(`Recipe "${recipeName}" already exists`);
                            continue;
                        }

                        // Track new values for UI updates
                        if (cuisine && !['belgian', 'italian', 'french', 'spanish', 'greek', 'asian', 'mexican', 'american', 'mediterranean', 'international'].includes(cuisine.toLowerCase())) {
                            newCuisinesFound.add(cuisine);
                        }
                        if (season && !['spring', 'summer', 'autumn', 'winter', 'all-year'].includes(season.toLowerCase())) {
                            newSeasonsFound.add(season);
                        }

                        // Create new recipe (no structured ingredients)
                        const newRecipe = {
                            id: Date.now() + Math.random(),
                            name: recipeName,
                            description: description,
                            preparation: preparation,
                            ingredients: [], // Empty for recipe-only import
                            ingredientsText: ingredientsText,
                            persons: persons,
                            image: image,
                            metadata: {
                                cuisine: cuisine,
                                mainIngredient: mainIngredient,
                                season: season
                            },
                            dateCreated: new Date().toISOString()
                        };

                        importedRecipes.push(newRecipe);

                    } catch (rowError) {
                        skippedRecipes.push(`Row ${i + 1}: ${rowError.message}`);
                    }
                }

                if (importedRecipes.length === 0) {
                    throw new Error('No valid recipes to import');
                }

                // Add recipes to the list
                this.recipes.push(...importedRecipes);
                this.saveRecipes();
                this.render();

                // Update UI with new values discovered
                this.updateFormOptionsWithNewValues(new Set(), newCuisinesFound, newSeasonsFound);

                // Show results
                let message = `✅ Successfully imported ${importedRecipes.length} recipe-only entries!`;
                
                // Add info about new values discovered
                if (newCuisinesFound.size > 0 || newSeasonsFound.size > 0) {
                    message += '\n\n🆕 New values discovered:';
                    if (newCuisinesFound.size > 0) {
                        message += `\n• Cuisines: ${Array.from(newCuisinesFound).join(', ')}`;
                    }
                    if (newSeasonsFound.size > 0) {
                        message += `\n• Seasons: ${Array.from(newSeasonsFound).join(', ')}`;
                    }
                }

                if (skippedRecipes.length > 0) {
                    message += `\n\n⚠️ Skipped ${skippedRecipes.length} recipes:`;
                    message += `\n${skippedRecipes.slice(0, 5).join('\n')}`;
                    if (skippedRecipes.length > 5) {
                        message += `\n... and ${skippedRecipes.length - 5} more`;
                    }
                }

                alert(message);

                console.log('📄 Recipe-only import completed:', {
                    imported: importedRecipes.length,
                    skipped: skippedRecipes.length
                });

            } catch (error) {
                console.error('Recipe-only import failed:', error);
                alert(`Import failed: ${error.message}`);
            }
        };

        reader.readAsText(file);
        event.target.value = '';
    }

    // Firebase Methods
    async initializeFirebase() {
        console.log('🔥 Initializing Firebase...');
        console.log('🔍 Firebase check:', {
            windowDb: !!window.db,
            windowFirebase: !!window.firebase,
            projectId: window.firebaseConfig?.projectId
        });
        
        if (window.db) {
            console.log('🔥 Firebase already initialized for project:', window.firebaseConfig?.projectId);
            this.updateFirebaseStatus('connected');
            
            // Check if Firebase has data and auto-enable sync
            try {
                console.log('📡 Checking Firebase for existing data...');
                const recipesSnapshot = await window.db.collection('recipes').limit(1).get();
                console.log('📊 Firebase recipes check:', {
                    empty: recipesSnapshot.empty,
                    size: recipesSnapshot.size,
                    localRecipes: this.recipes.length
                });
                
                if (!recipesSnapshot.empty) {
                    console.log('🔄 Firebase has data - setting up listeners automatically');
                    this.setupFirebaseListeners();
                    
                    // Load data from Firebase if local is empty
                    if (this.recipes.length === 0) {
                        console.log('📥 Local is empty, loading from Firebase...');
                        await this.loadFromFirebase();
                    } else {
                        console.log('📚 Local has data, keeping listeners active for sync');
                    }
                } else {
                    console.log('📭 Firebase is empty - waiting for manual sync');
                }
            } catch (error) {
                console.error('❌ Could not check Firebase data:', error);
                this.updateFirebaseStatus('disconnected');
            }
        } else {
            console.log('❌ Firebase not configured - window.db is missing');
            this.updateFirebaseStatus('disconnected');
        }
    }

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

    async enableFirebase() {
        if (!window.db) {
            alert('⚠️ Firebase not configured. Please update firebase-config.js with your Firebase credentials.');
            return;
        }

        try {
            console.log('🔥 Testing Firebase connection...');
            
            // Simple test write and read
            const testDoc = await window.db.collection('test').add({ 
                timestamp: new Date(),
                message: 'Connection test'
            });
            console.log('✅ Test write successful:', testDoc.id);
            
            const testRead = await window.db.collection('test').limit(1).get();
            console.log('✅ Test read successful:', testRead.size, 'documents');
            
            this.updateFirebaseStatus('connected');
            
            // Don't set up listeners yet - wait for first sync
            console.log('🔥 Firebase connected. Use "Sync Now" to upload your data first.');
            alert('✅ Firebase connected successfully! Click "Sync Now" to upload your data.');
        } catch (error) {
            console.error('❌ Firebase connection failed:', error);
            alert(`❌ Firebase connection failed: ${error.message}`);
            this.updateFirebaseStatus('disconnected');
        }
    }

    disableFirebase() {
        if (this.unsubscribeFirebase) {
            this.unsubscribeFirebase();
            this.unsubscribeFirebase = null;
        }
        this.updateFirebaseStatus('disconnected');
        alert('📴 Firebase sync disabled');
    }

    setupFirebaseListeners() {
        if (!window.db || this.unsubscribeFirebase) {
            console.log('⚠️ Cannot setup listeners:', {
                hasDb: !!window.db,
                hasExistingListeners: !!this.unsubscribeFirebase
            });
            return;
        }

        console.log('🔥 Setting up Firebase real-time listeners for project:', window.firebaseConfig?.projectId);
        this.firebaseSyncing = false; // Prevent sync loops
        
        const unsubscribeRecipes = window.db.collection('recipes').onSnapshot(snapshot => {
            if (this.firebaseSyncing) return; // Skip if we're currently syncing
            
            console.log('🔄 Recipes updated from Firebase');
            const firebaseRecipes = [];
            snapshot.forEach(doc => firebaseRecipes.push({ ...doc.data(), id: doc.data().id }));
            
            // Update if Firebase has data and it's different from local
            if (firebaseRecipes.length > 0) {
                // Check for actual differences, not just count
                const recipesChanged = JSON.stringify(firebaseRecipes.map(r => r.id).sort()) !== 
                                     JSON.stringify(this.recipes.map(r => r.id).sort());
                
                if (recipesChanged) {
                    console.log(`📚 Updating recipes: ${firebaseRecipes.length} from Firebase vs ${this.recipes.length} local`);
                    this.recipes = firebaseRecipes;
                    this.saveRecipes();
                    this.render();
                }
            } else if (firebaseRecipes.length === 0 && this.recipes.length > 0) {
                console.log('⚠️ Firebase has no recipes but local has data - skipping update to prevent data loss');
            }
        });

        const unsubscribeProducts = window.db.collection('products').onSnapshot(snapshot => {
            if (this.firebaseSyncing) return; // Skip if we're currently syncing
            
            console.log('🔄 Products updated from Firebase');
            const firebaseProducts = [];
            snapshot.forEach(doc => firebaseProducts.push({ ...doc.data(), id: doc.data().id }));
            
            // Update if Firebase has data and it's different from local
            if (firebaseProducts.length > 0) {
                // Check for actual content differences, not just count
                const localHash = JSON.stringify(this.allProducts.map(p => ({id: p.id, completed: p.completed, inStock: p.inStock, inShopping: p.inShopping, inPantry: p.inPantry})).sort((a,b) => a.id - b.id));
                const firebaseHash = JSON.stringify(firebaseProducts.map(p => ({id: p.id, completed: p.completed, inStock: p.inStock, inShopping: p.inShopping, inPantry: p.inPantry})).sort((a,b) => a.id - b.id));
                
                if (localHash !== firebaseHash) {
                    console.log(`🛒 Updating products: ${firebaseProducts.length} from Firebase vs ${this.allProducts.length} local (content changed)`);
                    this.allProducts = firebaseProducts;
                    this.saveAllProducts();
                    this.syncListsFromProducts();
                    this.render();
                } else {
                    console.log('📊 Products unchanged - skipping update');
                }
            } else if (firebaseProducts.length === 0 && this.allProducts.length > 0) {
                console.log('⚠️ Firebase has no products but local has data - skipping update to prevent data loss');
            }
        });

        const unsubscribeMealPlan = window.db.collection('mealPlan').onSnapshot(snapshot => {
            if (this.firebaseSyncing) return; // Skip if we're currently syncing
            
            console.log('🔄 Meal plans updated from Firebase');
            const firebaseMealPlans = {};
            snapshot.forEach(doc => firebaseMealPlans[doc.id] = doc.data());
            
            const firebaseKeys = Object.keys(firebaseMealPlans).length;
            const localKeys = this.mealPlans ? Object.keys(this.mealPlans).length : 0;
            
            // Only update if Firebase has data and it's different from local
            if (firebaseKeys > 0 && firebaseKeys !== localKeys) {
                console.log(`📅 Updating meal plans: ${firebaseKeys} from Firebase vs ${localKeys} local`);
                this.mealPlans = firebaseMealPlans;
                this.saveMealPlans();
                this.render();
            } else if (firebaseKeys === 0 && localKeys > 0) {
                console.log('⚠️ Firebase has no meal plans but local has data - skipping update to prevent data loss');
            }
        });

        this.unsubscribeFirebase = () => {
            console.log('🔥 Unsubscribing from Firebase listeners');
            unsubscribeRecipes();
            unsubscribeProducts();
            unsubscribeMealPlan();
        };
    }

    async syncToFirebase() {
        if (!window.db) {
            alert('⚠️ Firebase not configured');
            return;
        }

        if (this.firebaseSyncing) {
            console.log('⚠️ Sync already in progress, skipping...');
            return;
        }

        try {
            this.firebaseSyncing = true; // Prevent listener loops
            console.log('🔄 Starting Firebase sync...');
            
            // Check data integrity
            console.log('📊 Data check:', {
                recipes: this.recipes ? this.recipes.length : 'undefined',
                products: this.allProducts ? this.allProducts.length : 'undefined', 
                mealPlans: this.mealPlans ? Object.keys(this.mealPlans).length : 'undefined'
            });
            
            // Sync recipes
            if (this.recipes && Array.isArray(this.recipes)) {
                console.log(`📚 Syncing ${this.recipes.length} recipes...`);
                for (const recipe of this.recipes) {
                    if (recipe && recipe.id) {
                        await window.db.collection('recipes').doc(recipe.id.toString()).set(recipe);
                    }
                }
            } else {
                console.warn('⚠️ No recipes to sync or recipes is not an array');
            }
            
            // Sync products  
            if (this.allProducts && Array.isArray(this.allProducts)) {
                console.log(`🛒 Syncing ${this.allProducts.length} products...`);
                for (const product of this.allProducts) {
                    if (product && product.id) {
                        await window.db.collection('products').doc(product.id.toString()).set(product);
                    }
                }
            } else {
                console.warn('⚠️ No products to sync or allProducts is not an array');
            }
            
            // Sync meal plans
            if (this.mealPlans && typeof this.mealPlans === 'object') {
                console.log(`📅 Syncing meal plans with ${Object.keys(this.mealPlans).length} entries...`);
                for (const [key, value] of Object.entries(this.mealPlans)) {
                    if (key && value) {
                        await window.db.collection('mealPlan').doc(key).set(value);
                    }
                }
            } else {
                console.warn('⚠️ No meal plans to sync or mealPlans is not an object');
            }

            console.log('✅ Firebase sync completed successfully');
            
            // Set up real-time listeners after first successful sync
            if (!this.unsubscribeFirebase) {
                console.log('🔄 Setting up real-time listeners after successful sync...');
                this.setupFirebaseListeners();
            }
            
            alert('✅ All data synced to Firebase successfully! Real-time sync is now active.');
        } catch (error) {
            console.error('❌ Firebase sync failed:', error);
            console.error('❌ Error details:', {
                message: error.message,
                stack: error.stack,
                dataState: {
                    recipes: this.recipes,
                    allProducts: this.allProducts,
                    mealPlans: this.mealPlans
                }
            });
            alert(`❌ Firebase sync failed: ${error.message}\n\nCheck console for details.`);
        } finally {
            // Re-enable listeners after a delay
            setTimeout(() => {
                this.firebaseSyncing = false;
                console.log('🔄 Re-enabled Firebase listeners');
            }, 2000);
        }
    }

    async syncSingleProductToFirebase(product) {
        if (!window.db) return;
        
        try {
            await window.db.collection('products').doc(product.id.toString()).set(product);
            console.log('✅ Product synced to Firebase:', product.name);
        } catch (error) {
            console.error('❌ Failed to sync product to Firebase:', error);
        }
    }

    async syncSingleRecipeToFirebase(recipe) {
        if (!window.db) return;
        
        try {
            await window.db.collection('recipes').doc(recipe.id.toString()).set(recipe);
            console.log('✅ Recipe synced to Firebase:', recipe.name);
        } catch (error) {
            console.error('❌ Failed to sync recipe to Firebase:', error);
        }
    }

    async deleteProductFromFirebase(productId) {
        if (!window.db) return;
        
        try {
            await window.db.collection('products').doc(productId.toString()).delete();
            console.log('✅ Product deleted from Firebase:', productId);
        } catch (error) {
            console.error('❌ Failed to delete product from Firebase:', error);
        }
    }

    async deleteRecipeFromFirebase(recipeId) {
        if (!window.db) return;
        
        try {
            await window.db.collection('recipes').doc(recipeId.toString()).delete();
            console.log('✅ Recipe deleted from Firebase:', recipeId);
        } catch (error) {
            console.error('❌ Failed to delete recipe from Firebase:', error);
        }
    }

    async syncMultipleProductsToFirebase(products) {
        if (!window.db || !products || products.length === 0) return;
        
        try {
            // Temporarily set syncing flag to prevent listener conflicts
            const wasSyncing = this.firebaseSyncing;
            this.firebaseSyncing = true;
            
            console.log(`🔄 Syncing ${products.length} products to Firebase...`);
            
            // Sync each product individually to avoid batch conflicts
            for (const product of products) {
                await window.db.collection('products').doc(product.id.toString()).set(product);
            }
            
            console.log(`✅ Successfully synced ${products.length} products to Firebase`);
            
            // Restore syncing flag after a short delay
            setTimeout(() => {
                this.firebaseSyncing = wasSyncing;
            }, 1000);
            
        } catch (error) {
            console.error('❌ Failed to sync multiple products to Firebase:', error);
            this.firebaseSyncing = false;
        }
    }

    async forceFullSync() {
        if (!window.db) {
            alert('⚠️ Firebase not configured');
            return;
        }

        if (confirm('🔄 Force sync will overwrite Firebase with your current local data. Continue?')) {
            console.log('🔄 Starting force full sync...');
            
            // Temporarily disable listeners to prevent conflicts
            if (this.unsubscribeFirebase) {
                this.unsubscribeFirebase();
                this.unsubscribeFirebase = null;
            }
            
            // Clear all Firebase collections first
            try {
                const collections = ['recipes', 'products', 'mealPlan'];
                for (const collectionName of collections) {
                    const snapshot = await window.db.collection(collectionName).get();
                    const batch = window.db.batch();
                    snapshot.docs.forEach(doc => batch.delete(doc.ref));
                    await batch.commit();
                    console.log(`🗑️ Cleared ${collectionName} collection`);
                }
                
                // Now sync all local data to Firebase
                await this.syncToFirebase();
                
                // Re-enable listeners
                this.setupFirebaseListeners();
                
                alert('✅ Force sync completed! All devices should now have the same data.');
            } catch (error) {
                console.error('❌ Force sync failed:', error);
                alert('❌ Force sync failed. Check console for details.');
            }
        }
    }

    async loadFromFirebase() {
        if (!window.db) return;
        
        try {
            console.log('📥 Loading data from Firebase...');
            
            // Load recipes
            const recipesSnapshot = await window.db.collection('recipes').get();
            if (!recipesSnapshot.empty) {
                this.recipes = [];
                recipesSnapshot.forEach(doc => {
                    this.recipes.push({ ...doc.data(), id: doc.data().id });
                });
                this.saveRecipes();
                console.log(`📚 Loaded ${this.recipes.length} recipes from Firebase`);
            }
            
            // Load products
            const productsSnapshot = await window.db.collection('products').get();
            if (!productsSnapshot.empty) {
                this.allProducts = [];
                productsSnapshot.forEach(doc => {
                    this.allProducts.push({ ...doc.data(), id: doc.data().id });
                });
                this.saveAllProducts();
                this.syncListsFromProducts();
                console.log(`🛒 Loaded ${this.allProducts.length} products from Firebase`);
            }
            
            // Load meal plans
            const mealPlansSnapshot = await window.db.collection('mealPlan').get();
            if (!mealPlansSnapshot.empty) {
                this.mealPlans = {};
                mealPlansSnapshot.forEach(doc => {
                    this.mealPlans[doc.id] = doc.data();
                });
                this.saveMealPlans();
                console.log(`📅 Loaded ${Object.keys(this.mealPlans).length} meal plan entries from Firebase`);
            }
            
            this.render();
            console.log('✅ Successfully loaded data from Firebase');
        } catch (error) {
            console.error('❌ Failed to load from Firebase:', error);
        }
    }

    async automaticImageDownload(imageUrl, localFilename, recipeName) {
        try {
            console.log(`📥 Starting automatic download: ${imageUrl} -> ${localFilename}`);
            console.log(`🍽️ Recipe: ${recipeName} | Target folder: ${this.imagesFolderPathValue}`);
            
            // Fetch the image
            const response = await fetch(imageUrl, {
                mode: 'cors',
                cache: 'no-cache'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const blob = await response.blob();
            console.log(`✅ Image fetched successfully: ${blob.size} bytes`);
            
            // Browser security prevents direct download to custom folders
            // We download with recipe-based filename to Downloads, then user moves it
            const downloadUrl = URL.createObjectURL(blob);
            const downloadLink = document.createElement('a');
            downloadLink.href = downloadUrl;
            downloadLink.download = localFilename; // This is already the recipe-based filename
            downloadLink.style.display = 'none';
            
            // Add to DOM, click, and clean up
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            
            console.log(`💾 Recipe-named image download initiated: ${localFilename}`);
            
            // Upload reduced version to Firebase if available
            if (window.storage) {
                try {
                    console.log('🔥 Uploading reduced version to Firebase...');
                    
                    // Convert blob to File object for resizing
                    const file = new File([blob], localFilename, { type: blob.type });
                    
                    // Upload resized version to Firebase
                    const firebaseUrl = await this.uploadImageToFirebase(file, localFilename);
                    console.log('✅ Reduced version uploaded to Firebase:', firebaseUrl);
                    
                } catch (firebaseError) {
                    console.error('❌ Firebase upload failed:', firebaseError);
                    // Don't fail the whole operation if Firebase fails
                }
            } else {
                console.log('ℹ️ Firebase not available, skipping reduced upload');
            }
            
            // Clean up the blob URL
            setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
            
            return true;
            
        } catch (error) {
            console.error('❌ Automatic download failed:', error);
            
            // Provide fallback with manual instructions
            const fallbackInstructions = `❌ Automatic download failed: ${error.message}\n\n📋 Manual fallback:\n\n1. 🔗 Open this URL in a new tab:\n${imageUrl}\n\n2. 📥 Right-click image → "Save Image As..."\n3. 💾 Save as: "${localFilename}"\n4. 📁 Save to: ${this.imagesFolderPathValue}\n\n✅ Image field will be updated automatically`;
            
            // Copy URL to clipboard for convenience
            if (navigator.clipboard) {
                try {
                    await navigator.clipboard.writeText(imageUrl);
                    alert(fallbackInstructions + '\n\n📋 URL copied to clipboard!');
                } catch (clipboardError) {
                    alert(fallbackInstructions);
                }
            } else {
                alert(fallbackInstructions);
            }
            
            return false;
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new GroceryApp(); // app is now assigned to window.app in constructor
});

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
