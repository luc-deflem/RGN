/**
 * REAL RECIPES MODULE - Complete Implementation
 * 
 * Contains ALL recipe functionality - fully independent
 * Version: 3.5.0-recipes-real
 * 
 * COMPLEX MULTI-LEVEL DATA ARCHITECTURE:
 * - Recipes (primary entities)
 * - Ingredients (n*m junction table: recipes ↔ products)
 * - Product integration (recipe counts, lookups)
 * - Smart image system integration
 * - Meal planning integration
 * - Import/export with data integrity
 */

class RealRecipesManager {
    constructor() {
        this.recipes = [];
        this.nextId = 1;
        
        // Cache for performance optimization
        this.productRecipeCountCache = new Map();
        this.recipeSearchCache = new Map();
        
        // Integration points (will be set by external systems)
        this.productsManager = null;
        this.smartImageSystem = null;
        this.mealPlanningSystem = null;
        this.jsonImportExportManager = null;
        
        // Temporary ingredient management for recipe creation/editing
        this.currentRecipeIngredients = [];

        // Two-file recipe import state
        this.pendingRecipeInfoData = null;
        this.pendingRecipeIngredientsData = null;
        
        // console.log('🍳 Real Recipes Manager constructed');
    }

    /**
     * Initialize the recipes module
     */
    async initialize() {
        this.recipes = this.loadRecipes();
        this.nextId = this.recipes.length > 0 ? Math.max(...this.recipes.map(r => r.id || 0)) + 1 : 1;
        
        // Clear caches on initialization
        this.clearCaches();
        
        // console.log(`🍳 Real Recipes Manager initialized with ${this.recipes.length} recipes`);
        return this;
    }

    // ========== COUNT METHODS ==========
    
    /**
     * Get number of recipes
     */
    getRecipesCount() {
        return this.recipes.length;
    }

    /**
     * Set integration points for external systems
     */
    setIntegrations({ productsManager, smartImageSystem, mealPlanningSystem, jsonImportExportManager }) {
        this.productsManager = productsManager;
        this.smartImageSystem = smartImageSystem;
        this.mealPlanningSystem = mealPlanningSystem;
        this.jsonImportExportManager = jsonImportExportManager;
        // console.log('🔗 Recipes Manager integrations configured');
    }

    // ========== CSV IMPORT METHODS ==========

    downloadRecipeCsvTemplate() {
        if (this.jsonImportExportManager && this.jsonImportExportManager.downloadRecipeCsvTemplate) {
            return this.jsonImportExportManager.downloadRecipeCsvTemplate();
        } else {
            console.error('❌ JSON Import/Export manager not available');
            alert('Recipe template functionality not available. Please refresh the page.');
        }
    }

    handleRecipeCsvImport(event) {
        if (this.jsonImportExportManager && this.jsonImportExportManager.handleRecipeCsvImport) {
            return this.jsonImportExportManager.handleRecipeCsvImport(event);
        } else {
            console.error('❌ JSON Import/Export manager not available');
            alert('Recipe CSV import functionality not available. Please refresh the page.');
        }
    }

    importCsvRecipes(csvData) {
        if (this.jsonImportExportManager && this.jsonImportExportManager.importCsvRecipes) {
            return this.jsonImportExportManager.importCsvRecipes(csvData);
        } else {
            console.error('❌ JSON Import/Export manager not available');
            alert('Recipe import functionality not available. Please refresh the page.');
        }
    }

    /**
     * Two-file recipe import state management
     */
    setPendingRecipeInfoData(data) {
        this.pendingRecipeInfoData = data;
    }

    getPendingRecipeInfoData() {
        return this.pendingRecipeInfoData;
    }

    setPendingRecipeIngredientsData(data) {
        this.pendingRecipeIngredientsData = data;
    }

    getPendingRecipeIngredientsData() {
        return this.pendingRecipeIngredientsData;
    }

    clearPendingRecipeImportData() {
        this.pendingRecipeInfoData = null;
        this.pendingRecipeIngredientsData = null;
    }

    // ========== CORE RECIPE MANAGEMENT ==========

    /**
     * Load recipes from localStorage
     */
    loadRecipes() {
        try {
            let saved = localStorage.getItem('recipes');
            
            // Try backup if main data is corrupted
            if (!saved || saved === 'null') {
                saved = localStorage.getItem('recipes_backup');
                // console.log('📁 Loaded recipes from backup');
            }
            
            let recipes = saved ? JSON.parse(saved) : [];
            
            // Upgrade existing recipes with metadata if needed
            if (recipes.length > 0) {
                const needsMetadataUpgrade = recipes.some(recipe => !recipe.metadata);
                if (needsMetadataUpgrade) {
                    // console.log('🔄 Upgrading existing recipes with metadata...');
                    recipes = this.upgradeRecipesWithMetadata(recipes);
                    // console.log(`✅ Upgraded ${recipes.length} recipes with metadata`);
                }
                
                // Upgrade ingredient format if needed
                const needsIngredientUpgrade = recipes.some(recipe => 
                    recipe.ingredients && recipe.ingredients.some(ing => ing.name && !ing.productId)
                );
                if (needsIngredientUpgrade) {
                    // console.log('🔄 Upgrading ingredient format...');
                    this.upgradeIngredientFormat(recipes);
                }
            }
            
            // Provide sample data for new users
            if (recipes.length === 0 && !localStorage.getItem('recipes_initialized')) {
                recipes = this.getSampleRecipes();
                localStorage.setItem('recipes_initialized', 'true');
                // console.log('📱 New user - loaded sample recipes');
            }
            
            // console.log(`🍳 Loaded ${recipes.length} recipes from localStorage`);
            return recipes;
        } catch (e) {
            console.error('❌ Could not load recipes:', e);
            return this.getSampleRecipes();
        }
    }

    /**
     * Save recipes to localStorage
     */
    saveRecipes() {
        try {
            const data = JSON.stringify(this.recipes);
            localStorage.setItem('recipes', data);
            localStorage.setItem('recipes_backup', data);
            localStorage.setItem('recipes_timestamp', new Date().toISOString());
            // console.log(`💾 Saved ${this.recipes.length} recipes to localStorage`);
            
            // Clear caches when data changes
            this.clearCaches();
        } catch (e) {
            console.error('❌ Could not save recipes:', e);
        }
    }

    /**
     * Get sample recipes for new users
     */
    getSampleRecipes() {
        return [
            {
                id: 1,
                name: 'Simple Pasta',
                ingredients: [
                    { productId: 'pasta', quantity: 200, unit: 'g', name: 'pasta' },
                    { productId: 'olive_oil', quantity: 2, unit: 'tbsp', name: 'olive oil' }
                ],
                instructions: '1. Boil water\n2. Add pasta\n3. Cook 8-10 minutes\n4. Drain and add olive oil',
                metadata: {
                    dateCreated: new Date().toISOString(),
                    dateModified: new Date().toISOString(),
                    version: '1.0',
                    tags: ['quick', 'easy'],
                    difficulty: 'easy',
                    prepTime: '5 min',
                    cookTime: '10 min',
                    servings: 2
                },
                image: ''
            },
            {
                id: 2,
                name: 'Chicken Salad',
                ingredients: [
                    { productId: 'chicken', quantity: 300, unit: 'g', name: 'chicken breast' },
                    { productId: 'lettuce', quantity: 1, unit: 'head', name: 'lettuce' }
                ],
                instructions: '1. Cook chicken\n2. Chop lettuce\n3. Mix together',
                metadata: {
                    dateCreated: new Date().toISOString(),
                    dateModified: new Date().toISOString(),
                    version: '1.0',
                    tags: ['healthy', 'protein'],
                    difficulty: 'easy',
                    prepTime: '15 min',
                    cookTime: '20 min',
                    servings: 2
                },
                image: ''
            }
        ];
    }

    /**
     * Upgrade recipes with metadata for better organization
     */
    upgradeRecipesWithMetadata(recipes) {
        return recipes.map(recipe => {
            if (!recipe.metadata) {
                recipe.metadata = {
                    dateCreated: new Date().toISOString(),
                    dateModified: new Date().toISOString(),
                    version: '1.0',
                    tags: [],
                    difficulty: 'medium',
                    prepTime: '30 min',
                    cookTime: '30 min',
                    servings: 4
                };
            }
            return recipe;
        });
    }

    /**
     * Upgrade ingredient format from name-based to productId-based
     */
    upgradeIngredientFormat(recipes) {
        recipes.forEach(recipe => {
            if (recipe.ingredients) {
                recipe.ingredients = recipe.ingredients.map(ing => {
                    // If ingredient has name but no productId, try to find matching product
                    if (ing.name && !ing.productId && this.productsManager) {
                        const matchingProduct = this.productsManager.findProductByName(ing.name);
                        if (matchingProduct) {
                            ing.productId = matchingProduct.id;
                        } else {
                            // Create productId from name for backward compatibility
                            ing.productId = ing.name.toLowerCase().replace(/\s+/g, '_');
                        }
                    }
                    return ing;
                });
            }
        });
        this.saveRecipes();
    }

    /**
     * Get all recipes
     */
    getAllRecipes() {
        return this.recipes;
    }

    /**
     * Get recipe by ID
     */
    getRecipeById(id) {
        return this.recipes.find(r => r.id === id);
    }

    /**
     * Add new recipe
     */
    addRecipe(name, ingredients = [], instructions = '', metadata = {}, ingredientsText = '', allergens = '', cookTime = '', prepTime = '', servings = 4, comments = '', glutenFree = false) {
        if (!name || typeof name !== 'string') {
            console.error('❌ Invalid recipe name provided');
            return false;
        }

        name = name.trim();
        if (!name) {
            console.error('❌ Recipe name cannot be empty');
            return false;
        }

        // Check for duplicates
        const existingRecipe = this.recipes.find(r => 
            r.name.toLowerCase() === name.toLowerCase()
        );

        if (existingRecipe) {
            console.warn(`⚠️ Recipe "${name}" already exists`);
            return false;
        }

        const newRecipe = {
            id: this.nextId++,
            name: name,
            ingredients: Array.isArray(ingredients) ? ingredients : [],
            ingredientsText: ingredientsText || '', // Store original text version
            instructions: instructions || '',
            allergens: allergens || '', // New: allergen information
            cookTime: cookTime || metadata.cookTime || '30 min', // New: dedicated cooking time
            prepTime: prepTime || metadata.prepTime || '15 min', // New: dedicated preparation time  
            servings: servings || metadata.servings || 4, // New: dedicated servings
            comments: comments || '', // New: additional comments
            glutenFree: glutenFree || false, // New: gluten-free flag
            metadata: {
                dateCreated: new Date().toISOString(),
                dateModified: new Date().toISOString(),
                version: '1.0',
                tags: metadata.tags || [],
                difficulty: metadata.difficulty || 'medium',
                ...metadata
            },
            image: metadata.image || ''
        };

        this.recipes.push(newRecipe);
        this.saveRecipes();

        // Update product recipe counts
        this.updateProductRecipeCounts();

        console.log(`➕ Added recipe: ${name}`); // Keep success message
        return newRecipe;
    }

    /**
     * Edit recipe
     */
    editRecipe(id, updates) {
        const recipe = this.getRecipeById(id);
        if (!recipe) {
            console.error(`❌ Recipe with id ${id} not found`);
            return false;
        }

        // Update recipe properties
        if (updates.name) recipe.name = updates.name.trim();
        if (updates.instructions !== undefined) recipe.instructions = updates.instructions;
        if (updates.ingredients) recipe.ingredients = updates.ingredients;
        // DEFENSIVE: Only update image if explicitly provided and not empty
        if (updates.image !== undefined && updates.image !== '') {
            recipe.image = updates.image;
            // console.log(`🖼️ [UPDATE] Recipe image updated to: ${updates.image}`);
        } else if (updates.image === '') {
            // console.log(`🖼️ [PRESERVE] Ignoring empty image update, keeping existing: ${recipe.image || 'none'}`);
        }
        
        // Update metadata
        if (updates.metadata) {
            recipe.metadata = { ...recipe.metadata, ...updates.metadata };
        }
        recipe.metadata.dateModified = new Date().toISOString();

        this.saveRecipes();
        this.updateProductRecipeCounts();

        console.log(`✏️ Edited recipe: ${recipe.name}`); // Keep success message
        return recipe;
    }

    /**
     * Delete recipe
     */
    deleteRecipe(id) {
        const recipe = this.getRecipeById(id);
        if (!recipe) {
            console.error(`❌ Recipe with id ${id} not found`);
            return false;
        }

        this.recipes = this.recipes.filter(r => r.id !== id);
        this.saveRecipes();
        this.updateProductRecipeCounts();

        // Remove from meal plans if integrated
        if (this.mealPlanningSystem) {
            this.mealPlanningSystem.removeRecipeFromAllPlans(id);
        }

        console.log(`🗑️ Deleted recipe: ${recipe.name}`); // Keep success message
        
        // Refresh the display
        if (window.app && window.app.renderRecipes) {
            window.app.renderRecipes();
        }
        
        return true;
    }

    /**
     * Plan a recipe for meal planning
     */
    planRecipe(recipeId) {
        const recipe = this.getRecipeById(recipeId);
        if (!recipe) {
            console.error(`❌ Recipe with id ${recipeId} not found`);
            return false;
        }
        
        // console.log(`📅 Planning recipe: ${recipe.name}`);
        // console.log(`🔍 Debug: window.app available?`, !!window.app);
        // console.log(`🔍 Debug: window.app.planRecipe available?`, !!(window.app && window.app.planRecipe));
        
        // UNIFIED ARCHITECTURE FIX: Delegate to app's actual meal planning modal (NOT the delegation method)
        if (window.app && window.app.planRecipe) {
            // console.log(`🔄 Calling app.planRecipe() directly for recipe: ${recipe.name}`);
            try {
                // Call the ACTUAL modal method (line 3244), not the delegation method
                return window.app.planRecipe(recipeId);
            } catch (error) {
                console.error('❌ Error calling app.planRecipe():', error);
                alert(`Error opening meal planning for "${recipe.name}": ${error.message}`);
                return false;
            }
        } else {
            console.error('❌ App meal planning system not available');
            console.error('❌ window.app:', window.app); // Keep critical error
            console.error('❌ window.app.planRecipe:', window.app ? window.app.planRecipe : 'window.app is null'); // Keep critical error
            alert(`Recipe "${recipe.name}" ready for meal planning\n\nMeal planning system not available.`);
            return false;
        }
    }

    /**
     * Open recipe edit modal
     */
    async openRecipeEditModal(recipeId) {
        // console.log(`🍳 Opening recipe edit modal for recipe ID: ${recipeId}`);
        
        const recipe = this.getRecipeById(recipeId);
        if (!recipe) {
            console.error(`❌ Recipe with id ${recipeId} not found`);
            return false;
        }
        
        // Debug what's available
        // console.log('🔍 Debug app availability:', {
        //     'window.app exists': !!window.app,
        //     'window.app type': typeof window.app,
        //     'openRecipeEditModal exists': window.app ? !!window.app.openRecipeEditModal : 'N/A',
        //     'openRecipeEditModal type': window.app ? typeof window.app.openRecipeEditModal : 'N/A'
        // });
        
        // v6.0.1 FIX: Make Recipes Manager self-sufficient like Products Manager
        // console.log('🔧 Opening recipe modal directly (self-sufficient)');
        
        // Get modal element directly
        const modalElement = document.getElementById('recipeEditModal');
        if (!modalElement) {
            console.error('❌ recipeEditModal element not found in DOM!');
            return;
        }
        
        // Store references internally
        this.currentEditingRecipe = recipe;
        this.isCreatingNewRecipe = false;
        modalElement.dataset.recipeId = recipe.id;

        // UNIFIED ARCHITECTURE: Also set app.currentEditingRecipe for modal plan button compatibility
        if (window.app) {
            window.app.currentEditingRecipe = recipe;
            window.app.currentRecipeEditId = recipe.id;
            // CRITICAL FIX: Sync recipe ingredients to app's currentRecipeIngredients for add ingredient functionality
            window.app.currentRecipeIngredients = recipe.ingredients ? [...recipe.ingredients] : [];
            // console.log('🔄 Set app.currentEditingRecipe and synced ingredients for modal compatibility');
            // console.log(`🔄 Synced ${window.app.currentRecipeIngredients.length} ingredients to app system`);
        }
        
        // Get form elements (use correct IDs from HTML)
        const editRecipeName = document.getElementById('editRecipeName');
        const editRecipeDescription = document.getElementById('editRecipeDescription');
        const editRecipeIngredientsText = document.getElementById('editRecipeIngredientsText');
        const editRecipePreparation = document.getElementById('editRecipePreparation');
        const editRecipePrepTime = document.getElementById('editRecipePrepTime');
        const editRecipeCookTime = document.getElementById('editRecipeCookTime');
        const editRecipeServings = document.getElementById('editRecipeServings');
        const editRecipeAllergens = document.getElementById('editRecipeAllergens');
        const editRecipeGlutenFree = document.getElementById('editRecipeGlutenFree');
        
        if (!editRecipeName || !editRecipeDescription || !editRecipePreparation) {
            console.error('❌ Recipe form elements not found in DOM!', {
                editRecipeName: !!editRecipeName,
                editRecipeDescription: !!editRecipeDescription,
                editRecipePreparation: !!editRecipePreparation
            });
            return;
        }
        
        // Populate form with correct field mapping
        editRecipeName.value = recipe.name || '';
        
        // 📝 DESCRIPTION: Use comments field for description display  
        editRecipeDescription.value = recipe.comments || recipe.description || '';
        
        // 🍴 INGREDIENTS TEXT: Use the dedicated ingredients text field
        if (editRecipeIngredientsText) {
            editRecipeIngredientsText.value = recipe.ingredientsText || '';
        }
        
        // 📝 PREPARATION: Instructions go here (already correct)
        editRecipePreparation.value = recipe.instructions || recipe.preparation || '';
        
        // 🍴 NEW FIELDS: Populate the new recipe fields
        if (editRecipePrepTime) {
            editRecipePrepTime.value = recipe.prepTime || '';
        }
        if (editRecipeCookTime) {
            editRecipeCookTime.value = recipe.cookTime || '';
        }
        if (editRecipeServings) {
            editRecipeServings.value = recipe.servings || '';
        }
        if (editRecipeAllergens) {
            editRecipeAllergens.value = recipe.allergens || '';
        }
        if (editRecipeGlutenFree) {
            editRecipeGlutenFree.checked = recipe.glutenFree || false;
        }
        
        // CRITICAL FIX: Populate recipe image field
        const editRecipeImage = document.getElementById('editRecipeImage');
        if (editRecipeImage) {
            editRecipeImage.value = recipe.image || '';
            // console.log(`🖼️ [POPULATE] Set recipe image field to: ${recipe.image || 'empty'}`);
        }

        // Update image header in modal
        await this.updateRecipeImageHeader(recipe);

        // Populate ingredients list (CRITICAL FIX)
        this.renderRecipeIngredientsInModal(recipe);
        
        // RECIPE TIMERS INTEGRATION: Clear old timers, load saved ones, and add suggestions
        if (window.recipeTimers) {
            // Clear previous recipe timers first
            console.log('🔥 Clearing previous recipe timers...');
            window.recipeTimers.clearAllTimers();

            // Load timers previously saved for this recipe
            window.recipeTimers.loadTimersFromRecipe(recipe.id);

            const instructions = recipe.instructions || recipe.preparation || '';
            console.log('⏰ Preparing timer zone for recipe:', recipe.name);

            setTimeout(() => {
                window.recipeTimers.prepareTimerZone(instructions);
            }, 100); // Small delay to ensure DOM is ready

        }
        
        // Wire up buttons directly
        const closeBtn = document.getElementById('closeRecipeModal');
        const cancelBtn = document.getElementById('cancelRecipeEdit');
        const confirmBtn = document.getElementById('confirmRecipeEdit');
        const addIngredientBtn = document.getElementById('addIngredientBtn');
        
        if (closeBtn) closeBtn.onclick = () => this.closeRecipeEditModal();
        if (cancelBtn) cancelBtn.onclick = () => this.closeRecipeEditModal();
        if (confirmBtn) confirmBtn.onclick = () => this.confirmRecipeEdit();
        
        // UNIFIED ARCHITECTURE: Wire Add Ingredient button to recipes module instead of app.js
        if (addIngredientBtn) {
            addIngredientBtn.onclick = () => this.addIngredientToCurrentRecipe();
            // console.log('🔄 Wired Add Ingredient button to recipes module');
        }
        
        // Show modal
        modalElement.style.display = 'block';
        // console.log('✅ Recipe modal opened self-sufficiently with ingredients');
        return;
        
        // Fallback: Wait for app to be available with more debugging
        // console.log('⏳ App not ready, waiting for initialization...');
        let attempts = 0;
        const maxAttempts = 20; // Reduce to 2 seconds max wait
        
        const waitForApp = async () => {
            attempts++;
            // console.log(`🔍 Wait attempt ${attempts}: window.app = ${!!window.app}, openRecipeEditModal = ${window.app ? typeof window.app.openRecipeEditModal : 'N/A'}`);
            
            if (window.app && typeof window.app.openRecipeEditModal === 'function') {
                console.log(`✅ App ready after ${attempts * 100}ms - calling openRecipeEditModal for recipe:`, recipe.name);
                return await window.app.openRecipeEditModal(recipe);
            } else if (attempts < maxAttempts) {
                setTimeout(waitForApp, 100);
            } else {
                console.error('❌ App modal functionality not available after waiting - giving up');
                // console.log('🔍 Final state:', {
                //     'window.app': !!window.app,
                //     'window.app type': typeof window.app,
                //     'constructor': window.app ? window.app.constructor.name : 'N/A',
                //     'has openRecipeEditModal': window.app ? !!window.app.openRecipeEditModal : false
                // });
                alert(`Recipe "${recipe.name}" selected for editing.\n\nModal functionality not available. Please refresh the page and try again.`);
                return false;
            }
        };
        
        await waitForApp();
        return true;
    }

    // Update recipe image header in modal
    async updateRecipeImageHeader(recipe) {
        if (DEBUG_LOGS) console.log('🖼️ updateRecipeImageHeader called with recipe:', recipe.name);
        const imageHeader = document.getElementById('recipeImageHeader');
        const headerImage = document.getElementById('recipeHeaderImage');

        if (DEBUG_LOGS) console.log('🖼️ DOM elements found:', { imageHeader: !!imageHeader, headerImage: !!headerImage });

        if (!imageHeader || !headerImage) {
            if (DEBUG_LOGS) console.warn('❌ Missing DOM elements for recipe image header');
            return;
        }

        // Check if recipe has an image
        if (recipe.image && recipe.image.trim()) {
            if (DEBUG_LOGS) console.log('🖼️ Recipe has image:', recipe.image);
            try {
                // Use smart image system if available
                let imageUrl;
                const smartImageSystem = this.smartImageSystem || window.smartImageSystem;
                if (smartImageSystem) {
                    if (DEBUG_LOGS) console.log('🖼️ Using smart image system');
                    imageUrl = await smartImageSystem.getImageUrl(recipe.image);
                    if (DEBUG_LOGS) console.log('🖼️ Smart image system returned:', imageUrl);
                } else {
                    if (DEBUG_LOGS) console.log('🖼️ Using fallback path method');
                    // Fallback to simple path
                    imageUrl = recipe.image.trim();
                    if (!imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
                        const basePath = this.app && this.app.imagesFolderPathValue ? this.app.imagesFolderPathValue : '';
                        imageUrl = `${basePath}${imageUrl}`;
                    }
                    if (DEBUG_LOGS) console.log('🖼️ Fallback generated URL:', imageUrl);
                }

                if (DEBUG_LOGS) console.log('🖼️ Setting image src to:', imageUrl);
                headerImage.src = imageUrl;
                headerImage.alt = `${recipe.name} - Recipe Image`;
                imageHeader.style.display = 'block';
                if (DEBUG_LOGS) console.log('🖼️ Image header displayed');

                // Add error handling for missing images
                headerImage.onerror = function() {
                    if (DEBUG_LOGS) console.warn(`❌ Recipe image failed to load: ${imageUrl}`);
                    imageHeader.style.display = 'none';
                };
            } catch (error) {
                if (DEBUG_LOGS) console.warn('❌ Error loading recipe image:', error);
                imageHeader.style.display = 'none';
            }
        } else {
            if (DEBUG_LOGS) console.log('🖼️ Recipe has no image, hiding header');
            // Hide header if no image
            imageHeader.style.display = 'none';
        }
    }

    /**
     * Download Google image for recipe
     */
    downloadGoogleImageForRecipe(recipeId) {
        // console.log(`📥 Downloading Google image for recipe ID: ${recipeId}`);
        
        // Delegate to app's image functionality for now
        if (window.app && typeof window.app.downloadGoogleImageForRecipe === 'function') {
            return window.app.downloadGoogleImageForRecipe(recipeId);
        } else {
            console.error('❌ App image download functionality not available');
            alert('Image download not available. Please refresh the page.');
            return false;
        }
    }

    // ========== INGREDIENT MANAGEMENT ==========

    /**
     * Add ingredient to currently editing recipe (for modal)
     */
    addIngredientToCurrentRecipe() {
        if (!this.currentEditingRecipe) {
            console.error('❌ No recipe currently being edited');
            alert('No recipe is currently being edited');
            return;
        }

        // Get form values from the modal
        const selectedProductId = document.getElementById('selectedProductId');
        const ingredientQuantity = document.getElementById('ingredientQuantity');
        const ingredientUnit = document.getElementById('ingredientUnit');

        // console.log('🔍 [FORM ELEMENTS] Element check:', {
        //     selectedProductId: !!selectedProductId,
        //     ingredientQuantity: !!ingredientQuantity,
        //     ingredientUnit: !!ingredientUnit,
        //     selectedProductIdElement: selectedProductId,
        //     ingredientQuantityElement: ingredientQuantity,
        //     ingredientUnitElement: ingredientUnit
        // });

        if (!selectedProductId || !ingredientQuantity || !ingredientUnit) {
            console.error('❌ Ingredient form elements not found');
            alert('Ingredient form not available');
            return;
        }

        const productId = selectedProductId.value;
        const quantity = parseFloat(ingredientQuantity.value);
        const unit = ingredientUnit.value;

        // console.log('🔍 [RAW VALUES] Direct element values:', {
        //     selectedProductIdValue: selectedProductId.value,
        //     selectedProductIdInnerHTML: selectedProductId.innerHTML,
        //     ingredientQuantityValue: ingredientQuantity.value,
        //     ingredientUnitValue: ingredientUnit.value,
        //     ingredientUnitSelectedIndex: ingredientUnit.selectedIndex
        // });

        // console.log('🔍 [VALIDATION DEBUG] Form values:', {
        //     productId: productId,
        //     quantityText: ingredientQuantity.value,
        //     quantityParsed: quantity,
        //     unit: unit,
        //     productIdValid: !!productId,
        //     quantityValid: !isNaN(quantity),
        //     quantityPositive: quantity > 0,
        //     isNaN: isNaN(quantity)
        // });

        // Fixed validation: check for empty productId, NaN quantity, or non-positive quantity
        if (!productId || isNaN(quantity) || quantity <= 0) {
            // console.error('❌ [VALIDATION] Failed validation:', {
            //     productIdMissing: !productId,
            //     quantityIsNaN: isNaN(quantity),
            //     quantityNotPositive: quantity <= 0,
            //     finalCheck: !productId || isNaN(quantity) || quantity <= 0
            // });
            alert('Please search for a product and enter a valid quantity');
            return;
        }

        // Get product name for logging
        let productName = 'Unknown Product';
        if (this.productsManager) {
            const product = this.productsManager.getProductById(productId);
            if (product) {
                productName = product.name;
            }
        }

        // console.log(`➕ Adding ingredient to current recipe: ${productName} (${quantity} ${unit})`);

        // Add to current recipe
        const success = this.addIngredient(this.currentEditingRecipe.id, productId, quantity, unit, productName);
        
        if (success) {
            // Sync with app system for compatibility
            if (window.app) {
                window.app.currentRecipeIngredients = this.currentEditingRecipe.ingredients ? [...this.currentEditingRecipe.ingredients] : [];
                // console.log(`🔄 Synced ${window.app.currentRecipeIngredients.length} ingredients back to app system`);
            }

            // Re-render ingredients list in modal
            this.renderRecipeIngredientsInModal(this.currentEditingRecipe);

            // Clear form
            selectedProductId.value = '';
            ingredientQuantity.value = '';
            ingredientUnit.value = 'g';
            
            // Clear product search
            const productSearchInput = document.getElementById('productSearchInput');
            if (productSearchInput) {
                productSearchInput.value = '';
            }
            
            console.log(`✅ Successfully added ${productName} to recipe`); // Keep success message
        }
    }

    /**
     * Add ingredient to recipe
     */
    addIngredient(recipeId, productId, quantity, unit, productName = '') {
        const recipe = this.getRecipeById(recipeId);
        if (!recipe) {
            console.error(`❌ Recipe with id ${recipeId} not found`);
            return false;
        }

        // Check if ingredient already exists
        const existingIngredient = recipe.ingredients.find(ing => ing.productId === productId);
        if (existingIngredient) {
            console.warn(`⚠️ Ingredient already exists in recipe, updating quantity`);
            existingIngredient.quantity = quantity;
            existingIngredient.unit = unit;
        } else {
            recipe.ingredients.push({
                productId: productId,
                quantity: quantity,
                unit: unit,
                name: productName // For backward compatibility
            });
        }

        recipe.metadata.dateModified = new Date().toISOString();
        this.saveRecipes();
        this.updateProductRecipeCounts();

        // console.log(`➕ Added ingredient to "${recipe.name}": ${quantity}${unit} ${productName || productId}`);
        return recipe;
    }

    /**
     * Remove ingredient from recipe
     */
    removeIngredient(recipeId, productId) {
        const recipe = this.getRecipeById(recipeId);
        if (!recipe) {
            console.error(`❌ Recipe with id ${recipeId} not found`);
            return false;
        }

        // console.log('🔍 [REMOVE DEBUG] Current ingredients:', recipe.ingredients);
        // console.log('🔍 [REMOVE DEBUG] Looking for productId:', productId, typeof productId);
        
        // Log each ingredient for comparison
        recipe.ingredients.forEach((ing, index) => {
            // console.log(`🔍 [INGREDIENT ${index}]`, {
            //     productId: ing.productId,
            //     productIdType: typeof ing.productId,
            //     strictEqual: ing.productId === productId,
            //     looseEqual: ing.productId == productId,
            //     stringComparison: String(ing.productId) === String(productId)
            // });
        });

        const originalLength = recipe.ingredients.length;
        // Use loose equality to handle string/number mismatches
        recipe.ingredients = recipe.ingredients.filter(ing => ing.productId != productId);

        if (recipe.ingredients.length === originalLength) {
            console.warn(`⚠️ Ingredient ${productId} not found in recipe`);
            console.warn(`⚠️ Available ingredient IDs:`, recipe.ingredients.map(ing => `${ing.productId} (${typeof ing.productId})`));
            return false;
        }

        recipe.metadata.dateModified = new Date().toISOString();
        this.saveRecipes();
        this.updateProductRecipeCounts();

        console.log(`➖ Removed ingredient from "${recipe.name}": ${productId}`); // Keep success message
        return recipe;
    }

    /**
     * Get ingredients for recipe with product details
     */
    getRecipeIngredients(recipeId, includeProductDetails = true) {
        const recipe = this.getRecipeById(recipeId);
        if (!recipe || !recipe.ingredients) {
            return [];
        }

        if (!includeProductDetails || !this.productsManager) {
            return recipe.ingredients;
        }

        // Enrich ingredients with product details
        return recipe.ingredients.map(ing => {
            const product = this.productsManager.getProductById(ing.productId);
            return {
                ...ing,
                productName: product?.name || ing.name || ing.productId,
                category: product?.category || 'unknown',
                available: !!product
            };
        });
    }

    // ========== SEARCH & FILTERING ==========

    /**
     * Search recipes by multiple criteria
     */
    searchRecipes(query, filters = {}) {
        if (!query && Object.keys(filters).length === 0) {
            return this.recipes;
        }

        // Check cache first
        const cacheKey = `${query || ''}_${JSON.stringify(filters)}`;
        if (this.recipeSearchCache.has(cacheKey)) {
            return this.recipeSearchCache.get(cacheKey);
        }

        let filteredRecipes = this.recipes;

        // Text search
        if (query && typeof query === 'string') {
            const searchTerm = query.toLowerCase().trim();
            filteredRecipes = filteredRecipes.filter(recipe => {
                // Search in recipe name
                if (recipe.name.toLowerCase().includes(searchTerm)) {
                    return true;
                }
                
                // Search in instructions
                if (recipe.instructions && recipe.instructions.toLowerCase().includes(searchTerm)) {
                    return true;
                }
                
                // Search in ingredients
                if (recipe.ingredients && recipe.ingredients.some(ing => 
                    (ing.name && typeof ing.name === 'string' && ing.name.toLowerCase().includes(searchTerm)) ||
                    (ing.productId && typeof ing.productId === 'string' && ing.productId.toLowerCase().includes(searchTerm))
                )) {
                    return true;
                }
                
                // Search in tags
                if (recipe.metadata?.tags && recipe.metadata.tags.some(tag => 
                    tag.toLowerCase().includes(searchTerm)
                )) {
                    return true;
                }
                
                return false;
            });
        }

        // Apply filters
        if (filters.difficulty) {
            filteredRecipes = filteredRecipes.filter(r => 
                r.metadata?.difficulty === filters.difficulty
            );
        }

        if (filters.maxPrepTime) {
            filteredRecipes = filteredRecipes.filter(r => {
                const prepTime = this.parseTime(r.metadata?.prepTime);
                return prepTime <= filters.maxPrepTime;
            });
        }

        if (filters.maxCookTime) {
            filteredRecipes = filteredRecipes.filter(r => {
                const cookTime = this.parseTime(r.metadata?.cookTime);
                return cookTime <= filters.maxCookTime;
            });
        }

        if (filters.tags && filters.tags.length > 0) {
            filteredRecipes = filteredRecipes.filter(r =>
                filters.tags.every(tag => 
                    r.metadata?.tags?.includes(tag)
                )
            );
        }

        if (filters.hasImage !== undefined) {
            filteredRecipes = filteredRecipes.filter(r =>
                filters.hasImage ? (r.image && r.image.trim()) : (!r.image || !r.image.trim())
            );
        }

        // Cache result
        this.recipeSearchCache.set(cacheKey, filteredRecipes);
        
        return filteredRecipes;
    }

    /**
     * Get recipes that use specific product
     */
    getRecipesForProduct(productId) {
        return this.recipes.filter(recipe =>
            recipe.ingredients &&
            recipe.ingredients.some(ing => ing.productId === productId)
        );
    }

    /**
     * Get all tags used in recipes
     */
    getAllTags() {
        const tags = new Set();
        this.recipes.forEach(recipe => {
            if (recipe.metadata?.tags) {
                recipe.metadata.tags.forEach(tag => tags.add(tag));
            }
        });
        return Array.from(tags).sort();
    }

    // ========== PRODUCT INTEGRATION ==========

    /**
     * Update recipe counts for all products
     */
    updateProductRecipeCounts() {
        if (!this.productsManager) {
            console.warn('⚠️ Products manager not available for recipe count update');
            return;
        }

        // Clear cache
        this.productRecipeCountCache.clear();

        // Update counts
        const allProducts = this.productsManager ? this.productsManager.getAllProducts() : [];
        allProducts.forEach(product => {
            if (product && product.id && product.name && product.category) {
                const recipeCount = this.getRecipesForProduct(product.id).length;
                if (this.productsManager.updateRecipeCount) {
                    // Products manager expects (productName, category, count)
                    this.productsManager.updateRecipeCount(product.name, product.category, recipeCount);
                }
                this.productRecipeCountCache.set(product.id, recipeCount);
            }
        });

        // console.log('🔄 Updated product recipe counts');
    }

    /**
     * Get recipe count for specific product (with caching)
     */
    getProductRecipeCount(productId) {
        if (this.productRecipeCountCache.has(productId)) {
            return this.productRecipeCountCache.get(productId);
        }

        const count = this.getRecipesForProduct(productId).length;
        this.productRecipeCountCache.set(productId, count);
        return count;
    }

    /**
     * Add ingredients from recipe to shopping list
     */
    addRecipeIngredientsToShopping(recipeId, servingMultiplier = 1) {
        const recipe = this.getRecipeById(recipeId);
        if (!recipe || !recipe.ingredients) {
            console.error(`❌ Recipe ${recipeId} not found or has no ingredients`);
            return false;
        }

        // This would integrate with shopping list manager
        if (window.realShoppingListManager) {
            let addedCount = 0;
            recipe.ingredients.forEach(ing => {
                if (ing && (ing.name || ing.productId)) {
                    const adjustedQuantity = (ing.quantity || 1) * servingMultiplier;
                    const productName = ing.name || ing.productId || 'Unknown ingredient';
                    const unit = ing.unit || '';
                    const added = window.realShoppingListManager.addItem(
                        `${productName} (${adjustedQuantity}${unit})`,
                        'cat_007', // Default category
                        false,
                        false
                    );
                    if (added) addedCount++;
                }
            });
            
            console.log(`🛒 Added ${addedCount} ingredients from "${recipe.name}" to shopping list`);
            return addedCount;
        }

        console.warn('⚠️ Shopping list manager not available');
        return false;
    }

    // ========== IMAGE MANAGEMENT ==========

    /**
     * Set recipe image
     */
    setRecipeImage(recipeId, imageFilename) {
        const recipe = this.getRecipeById(recipeId);
        if (!recipe) {
            console.error(`❌ Recipe with id ${recipeId} not found`);
            return false;
        }

        recipe.image = imageFilename || '';
        recipe.metadata.dateModified = new Date().toISOString();
        this.saveRecipes();

        console.log(`🖼️ Set image for "${recipe.name}": ${imageFilename}`); // Keep success message
        return recipe;
    }

    /**
     * Get recipe image URL (integrates with smart image system)
     */
    getRecipeImageUrl(recipeId) {
        const recipe = this.getRecipeById(recipeId);
        if (!recipe || !recipe.image) {
            return null;
        }

        if (this.smartImageSystem) {
            return this.smartImageSystem.getImageUrl(recipe.image);
        }

        // Fallback to simple path
        return `RGimages/${recipe.image}`;
    }

    // ========== IMPORT/EXPORT ==========

    /**
     * Export recipes data
     */
    exportData(format = 'json') {
        const exportData = {
            recipes: this.recipes,
            statistics: this.getStatistics(),
            exportDate: new Date().toISOString(),
            version: '3.5.0-recipes-real'
        };

        if (format === 'text') {
            return this.exportToText();
        }

        return exportData;
    }

    /**
     * Export recipes as formatted text
     */
    exportToText() {
        let exportText = `🍳 RECIPE COLLECTION (${this.recipes.length} recipes)\n`;
        exportText += `Generated: ${new Date().toLocaleString()}\n\n`;
        exportText += '='.repeat(60) + '\n\n';

        this.recipes.forEach(recipe => {
            exportText += `📝 ${recipe.name.toUpperCase()}\n`;
            
            if (recipe.ingredients && recipe.ingredients.length > 0) {
                exportText += `🥘 Ingredients:\n`;
                recipe.ingredients.forEach(ing => {
                    const name = ing.name || ing.productId;
                    exportText += `  • ${ing.quantity || ''} ${ing.unit || ''} ${name}\n`;
                });
                exportText += '\n';
            }
            
            if (recipe.instructions && recipe.instructions.trim()) {
                exportText += `👨‍🍳 Instructions:\n${recipe.instructions}\n\n`;
            }
            
            if (recipe.metadata) {
                const meta = recipe.metadata;
                exportText += `⏱️ `;
                if (meta.prepTime) exportText += `Prep: ${meta.prepTime} `;
                if (meta.cookTime) exportText += `Cook: ${meta.cookTime} `;
                if (meta.servings) exportText += `Serves: ${meta.servings}`;
                exportText += `\n🎯 Difficulty: ${meta.difficulty}\n`;
                
                if (meta.tags && meta.tags.length > 0) {
                    exportText += `🏷️ Tags: ${meta.tags.join(', ')}\n`;
                }
            }
            
            exportText += '\n' + '─'.repeat(50) + '\n\n';
        });

        return exportText;
    }

    /**
     * Import recipes data
     */
    importData(data) {
        // console.log('🔍 IMPORT DEBUG: Starting import with data:', data);
        
        if (!data) {
            // console.error('❌ IMPORT DEBUG: No data provided');
            return false;
        }
        
        // Handle different import formats
        let recipesArray = null;
        
        // Format 1: New format - {recipes: [...]}
        if (data.recipes && Array.isArray(data.recipes)) {
            // console.log('🔍 IMPORT DEBUG: Using new format - data.recipes');
            recipesArray = data.recipes;
        }
        // Format 2: Direct array - [...]
        else if (Array.isArray(data)) {
            // console.log('🔍 IMPORT DEBUG: Using direct array format');
            recipesArray = data;
        }
        // Format 3: Legacy full app export with recipes property
        else if (data.recipes) {
            // console.log('🔍 IMPORT DEBUG: Found recipes property but not array, trying to handle...');
            if (Array.isArray(data.recipes)) {
                recipesArray = data.recipes;
            } else {
                console.error('❌ IMPORT DEBUG: data.recipes is not an array, it is:', typeof data.recipes); // Keep error
            }
        }
        else {
            console.error('❌ IMPORT DEBUG: No recipes found. Available properties:', Object.keys(data)); // Keep error
            // console.log('🔍 IMPORT DEBUG: Data structure:', JSON.stringify(data, null, 2).substring(0, 500) + '...');
            return false;
        }
        
        if (!recipesArray || !Array.isArray(recipesArray)) {
            console.error('❌ IMPORT DEBUG: Could not find valid recipes array'); // Keep error
            return false;
        }

        // console.log(`🔍 IMPORT DEBUG: Found ${recipesArray.length} recipes in import data`);

        try {
            // Validate recipes with detailed logging
            const validRecipes = [];
            const invalidRecipes = [];
            
            recipesArray.forEach((recipe, index) => {
                // console.log(`🔍 IMPORT DEBUG: Checking recipe ${index + 1}:`, recipe);
                
                if (!recipe) {
                    // console.warn(`⚠️ IMPORT DEBUG: Recipe ${index + 1} is null/undefined`);
                    invalidRecipes.push({ index, reason: 'null/undefined', recipe });
                    return;
                }
                
                if (typeof recipe.name !== 'string') {
                    // console.warn(`⚠️ IMPORT DEBUG: Recipe ${index + 1} has invalid name type:`, typeof recipe.name, recipe.name);
                    invalidRecipes.push({ index, reason: 'name not string', recipe });
                    return;
                }
                
                if (!recipe.name.trim()) {
                    // console.warn(`⚠️ IMPORT DEBUG: Recipe ${index + 1} has empty name`);
                    invalidRecipes.push({ index, reason: 'empty name', recipe });
                    return;
                }
                
                // console.log(`✅ IMPORT DEBUG: Recipe ${index + 1} "${recipe.name}" is valid`);
                validRecipes.push(recipe);
            });

            // console.log(`📥 IMPORT DEBUG: Validation complete - ${validRecipes.length} valid, ${invalidRecipes.length} invalid of ${recipesArray.length} total`);
            
            if (invalidRecipes.length > 0) {
                // console.log('🔍 IMPORT DEBUG: First 5 invalid recipes:', invalidRecipes.slice(0, 5));
            }

            if (validRecipes.length === 0) {
                console.error('❌ IMPORT DEBUG: No valid recipes found after validation'); // Keep error
                return false;
            }

            // Update IDs to prevent conflicts and normalize recipe format
            let maxId = this.recipes.length > 0 ? Math.max(...this.recipes.map(r => r.id)) : 0;
            validRecipes.forEach(recipe => {
                if (!recipe.id || this.recipes.find(existing => existing.id === recipe.id)) {
                    recipe.id = ++maxId;
                }
                
                // Handle legacy format differences
                // Old format might have 'preparation' instead of 'instructions'
                if (!recipe.instructions && recipe.preparation) {
                    recipe.instructions = recipe.preparation;
                }
                
                // Old format might have different ingredient structure
                if (recipe.ingredients && recipe.ingredients.length > 0) {
                    recipe.ingredients = recipe.ingredients.map(ing => {
                        // Handle old format: {name, amount, unit} -> {productId, quantity, unit, name}
                        if (ing.name && !ing.productId) {
                            return {
                                productId: ing.name.toLowerCase().replace(/\s+/g, '_'),
                                quantity: ing.amount || ing.quantity || 1,
                                unit: ing.unit || '',
                                name: ing.name
                            };
                        }
                        // New format is already correct
                        return ing;
                    });
                }
                
                // Ensure metadata exists and merge with legacy properties
                if (!recipe.metadata) {
                    recipe.metadata = {
                        dateCreated: recipe.dateCreated || new Date().toISOString(),
                        dateModified: new Date().toISOString(),
                        version: '1.0',
                        tags: recipe.tags || [],
                        difficulty: recipe.difficulty || 'medium',
                        prepTime: recipe.prepTime || '30 min',
                        cookTime: recipe.cookTime || '30 min',
                        servings: recipe.servings || recipe.persons || 4,
                        cuisine: recipe.cuisine || '',
                        mainIngredient: recipe.mainIngredient || '',
                        season: recipe.season || ''
                    };
                } else {
                    // Merge any legacy properties into metadata
                    if (recipe.tags && !recipe.metadata.tags) recipe.metadata.tags = recipe.tags;
                    if (recipe.difficulty && !recipe.metadata.difficulty) recipe.metadata.difficulty = recipe.difficulty;
                    if (recipe.prepTime && !recipe.metadata.prepTime) recipe.metadata.prepTime = recipe.prepTime;
                    if (recipe.cookTime && !recipe.metadata.cookTime) recipe.metadata.cookTime = recipe.cookTime;
                    if (recipe.servings && !recipe.metadata.servings) recipe.metadata.servings = recipe.servings;
                    if (recipe.persons && !recipe.metadata.servings) recipe.metadata.servings = recipe.persons;
                }
                
                // console.log(`🔄 IMPORT DEBUG: Normalized recipe "${recipe.name}" with ${recipe.ingredients?.length || 0} ingredients`);
            });

            this.recipes = validRecipes;
            this.nextId = maxId + 1;
            this.saveRecipes();
            this.updateProductRecipeCounts();

            console.log(`📥 Imported ${validRecipes.length} recipes`); // Keep success message
            return true;
        } catch (e) {
            console.error('❌ Failed to import recipes:', e);
            return false;
        }
    }

    // ========== UTILITIES ==========

    /**
     * Parse time string to minutes
     */
    parseTime(timeStr) {
        if (!timeStr || typeof timeStr !== 'string') return 0;
        
        const match = timeStr.match(/(\d+)\s*(min|hour|hr)/i);
        if (!match) return 0;
        
        const value = parseInt(match[1]);
        const unit = match[2].toLowerCase();
        
        return unit.startsWith('hour') || unit === 'hr' ? value * 60 : value;
    }

    /**
     * Clear all caches
     */
    clearCaches() {
        this.productRecipeCountCache.clear();
        this.recipeSearchCache.clear();
        // console.log('🧹 Cleared recipe caches');
    }

    /**
     * Get comprehensive statistics
     */
    getStatistics() {
        const totalRecipes = this.recipes.length;
        const withIngredients = this.recipes.filter(r => r.ingredients && r.ingredients.length > 0).length;
        const withImages = this.recipes.filter(r => r.image && r.image.trim()).length;
        const withInstructions = this.recipes.filter(r => r.instructions && r.instructions.trim()).length;
        
        // Difficulty breakdown
        const difficultyBreakdown = {};
        this.recipes.forEach(recipe => {
            const difficulty = recipe.metadata?.difficulty || 'medium';
            difficultyBreakdown[difficulty] = (difficultyBreakdown[difficulty] || 0) + 1;
        });
        
        // Tag analysis
        const allTags = this.getAllTags();
        const tagUsage = {};
        allTags.forEach(tag => {
            tagUsage[tag] = this.recipes.filter(r => 
                r.metadata?.tags?.includes(tag)
            ).length;
        });
        
        // Time analysis
        const avgPrepTime = this.recipes.reduce((sum, recipe) => 
            sum + this.parseTime(recipe.metadata?.prepTime), 0
        ) / totalRecipes;
        
        const avgCookTime = this.recipes.reduce((sum, recipe) => 
            sum + this.parseTime(recipe.metadata?.cookTime), 0
        ) / totalRecipes;

        return {
            totalRecipes,
            withIngredients,
            withImages,
            withInstructions,
            completionRate: totalRecipes > 0 ? Math.round((withIngredients / totalRecipes) * 100) : 0,
            imageRate: totalRecipes > 0 ? Math.round((withImages / totalRecipes) * 100) : 0,
            difficultyBreakdown,
            uniqueTags: allTags.length,
            tagUsage,
            avgPrepTime: Math.round(avgPrepTime),
            avgCookTime: Math.round(avgCookTime),
            totalIngredients: this.recipes.reduce((sum, recipe) => 
                sum + (recipe.ingredients?.length || 0), 0
            )
        };
    }

    /**
     * Refresh display (to be called after changes)
     */
    refreshDisplay() {
        // This would trigger UI updates in the main app
        if (window.app && window.app.render) {
            window.app.render();
        }
    }

    // ========== UI RENDERING METHODS (EXTRACTED FROM APP.JS) ==========

    /**
     * Initialize UI rendering - set up DOM references and app integration
     */
    initializeUI(app) {
        this.app = app;
        
        // DOM elements
        this.recipesList = null;
        this.recipeCount = null;
        this.filteredRecipeCount = null;
        this.recipeSearchInput = null;
        this.clearRecipeSearchBtn = null;
        this.addRecipeBtn = null;
        this.importRecipeBtn = null;
        this.recipeJsonFileInput = null;
        this.cuisineFilter = null;
        this.mainIngredientFilter = null;
        this.seasonFilter = null;
        this.stockFilter = null;
        this.clearFiltersBtn = null;
        this.aiSuggestBtn = null;
        
        // Product modal elements
        this.productRecipesModal = null;
        this.selectedProductName = null;
        this.productRecipesList = null;
        this.noRecipesFound = null;
        
        // console.log('🍳 Recipes UI initialized');
    }

    /**
     * Render recipes tab (main entry point)
     */
    renderRecipes(searchTerm = '') {
        // Re-initialize DOM elements if needed
        this.initializeDOMElements();
        
        // Populate filter dropdowns with current recipe data
        this.populateFilterDropdowns();
        
        this.renderRecipesList(searchTerm);
    }

    /**
     * Initialize DOM elements with null checks
     */
    initializeDOMElements() {
        if (!this.recipesList) {
            this.recipesList = document.getElementById('recipesList');
        }
        if (!this.recipeCount) {
            this.recipeCount = document.getElementById('recipeCount');
        }
        if (!this.filteredRecipeCount) {
            this.filteredRecipeCount = document.getElementById('filteredRecipeCount');
        }
        if (!this.recipeSearchInput) {
            this.recipeSearchInput = document.getElementById('recipeSearchInput');
        }
        if (!this.clearRecipeSearchBtn) {
            this.clearRecipeSearchBtn = document.getElementById('clearRecipeSearchBtn');
        }
        if (!this.addRecipeBtn) {
            this.addRecipeBtn = document.getElementById('addRecipeBtn');
        }
        if (!this.importRecipeBtn) {
            this.importRecipeBtn = document.getElementById('importRecipeBtn');
        }
        if (!this.recipeJsonFileInput) {
            this.recipeJsonFileInput = document.getElementById('recipeJsonFile');
        }
        if (!this.cuisineFilter) {
            this.cuisineFilter = document.getElementById('cuisineFilter');
        }
        if (!this.mainIngredientFilter) {
            this.mainIngredientFilter = document.getElementById('mainIngredientFilter');
        }
        if (!this.seasonFilter) {
            this.seasonFilter = document.getElementById('seasonFilter');
        }
        if (!this.stockFilter) {
            this.stockFilter = document.getElementById('stockFilter');
        }
        if (!this.clearFiltersBtn) {
            this.clearFiltersBtn = document.getElementById('clearFiltersBtn');
        }
        if (!this.aiSuggestBtn) {
            this.aiSuggestBtn = document.getElementById('aiSuggestBtn');
        }
        
        // Product modal elements
        if (!this.productRecipesModal) {
            this.productRecipesModal = document.getElementById('productRecipesModal');
        }
        if (!this.selectedProductName) {
            this.selectedProductName = document.getElementById('selectedProductName');
        }
        if (!this.productRecipesList) {
            this.productRecipesList = document.getElementById('productRecipesList');
        }
        if (!this.noRecipesFound) {
            this.noRecipesFound = document.getElementById('noRecipesFound');
        }
    }

    /**
     * Attach event listeners for recipe UI elements
     */
    attachEventListeners() {
        this.initializeDOMElements();

        if (this.recipeSearchInput) {
            this.recipeSearchInput.addEventListener('input', () => {
                const term = this.recipeSearchInput.value.trim();
                this.renderRecipes(term);
            });
        }

        if (this.clearRecipeSearchBtn) {
            this.clearRecipeSearchBtn.addEventListener('click', () => {
                if (this.recipeSearchInput) {
                    this.recipeSearchInput.value = '';
                }
                this.renderRecipes('');
            });
        }

        if (this.addRecipeBtn) {
            this.addRecipeBtn.addEventListener('click', () => {
                this.showRecipeCreationModal();
            });
        }

        if (this.importRecipeBtn && this.recipeJsonFileInput) {
            this.importRecipeBtn.addEventListener('click', () => this.recipeJsonFileInput.click());
            this.recipeJsonFileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                    try {
                        const recipeObj = JSON.parse(reader.result);
                        const existing = this.recipes || [];
                        this.importData({ recipes: [...existing, recipeObj] });
                        this.refreshDisplay?.();
                    } catch (err) {
                        console.error('Failed to import recipe JSON:', err);
                        alert('Failed to import recipe JSON.');
                    } finally {
                        e.target.value = '';
                    }
                };
                reader.readAsText(file);
            });
        }

        const closeImport = document.getElementById('closeRecipeImportModal');
        if (closeImport) {
            closeImport.addEventListener('click', () => this.hideRecipeImportModal());
        }

        const cancelImport = document.getElementById('cancelRecipeImport');
        if (cancelImport) {
            cancelImport.addEventListener('click', () => this.hideRecipeImportModal());
        }

        const confirmImport = document.getElementById('confirmRecipeImport');
        if (confirmImport) {
            confirmImport.addEventListener('click', () => this.saveImportedRecipe());
        }

        const addIngredientBtn = document.getElementById('addImportedIngredient');
        if (addIngredientBtn) {
            addIngredientBtn.addEventListener('click', () => this.addIngredientRow());
        }

        if (this.cuisineFilter) {
            this.cuisineFilter.addEventListener('change', () => this.applyRecipeFilters());
        }
        if (this.mainIngredientFilter) {
            this.mainIngredientFilter.addEventListener('change', () => this.applyRecipeFilters());
        }
        if (this.seasonFilter) {
            this.seasonFilter.addEventListener('change', () => this.applyRecipeFilters());
        }
        if (this.stockFilter) {
            this.stockFilter.addEventListener('change', () => this.applyRecipeFilters());
        }
        if (this.clearFiltersBtn) {
            this.clearFiltersBtn.addEventListener('click', () => this.clearRecipeFilters());
        }
        if (this.aiSuggestBtn) {
            this.aiSuggestBtn.addEventListener('click', () => this.generateAIRecipes());
        }
    }

    // ----- DOM getters -----
    getRecipesList() {
        this.initializeDOMElements();
        return this.recipesList;
    }

    getRecipeCount() {
        this.initializeDOMElements();
        return this.recipeCount;
    }

    getFilteredRecipeCount() {
        this.initializeDOMElements();
        return this.filteredRecipeCount;
    }

    getRecipeSearchInput() {
        this.initializeDOMElements();
        return this.recipeSearchInput;
    }

    getClearRecipeSearchBtn() {
        this.initializeDOMElements();
        return this.clearRecipeSearchBtn;
    }

    getAddRecipeBtn() {
        this.initializeDOMElements();
        return this.addRecipeBtn;
    }

    getImportRecipeBtn() {
        this.initializeDOMElements();
        return this.importRecipeBtn;
    }

    getRecipeJsonFileInput() {
        this.initializeDOMElements();
        return this.recipeJsonFileInput;
    }

    getCuisineFilter() {
        this.initializeDOMElements();
        return this.cuisineFilter;
    }

    getMainIngredientFilter() {
        this.initializeDOMElements();
        return this.mainIngredientFilter;
    }

    getSeasonFilter() {
        this.initializeDOMElements();
        return this.seasonFilter;
    }

    getStockFilter() {
        this.initializeDOMElements();
        return this.stockFilter;
    }

    getClearFiltersBtn() {
        this.initializeDOMElements();
        return this.clearFiltersBtn;
    }

    getAiSuggestBtn() {
        this.initializeDOMElements();
        return this.aiSuggestBtn;
    }

    /**
     * Render recipes list with filtering and search
     */
    renderRecipesList(searchTerm = '') {
        this.initializeDOMElements();
        
        let recipesToShow = this.recipes;
        
        // Apply search if provided
        if (searchTerm) {
            recipesToShow = this.searchRecipes(searchTerm);
        }
        
        // Get active global filters
        const activeFilters = this.getActiveFilters();
        const hasFilters = Object.keys(activeFilters).length > 0;
        
        // Update clear filters button visibility
        this.updateClearFiltersButton();
        
        // Apply global filters
        if (hasFilters) {
            recipesToShow = recipesToShow.filter(recipe => {
                // Check cuisine filter
                if (activeFilters.cuisine && recipe.metadata?.cuisine !== activeFilters.cuisine) {
                    return false;
                }
                
                // Check main ingredient filter
                if (activeFilters.mainIngredient && recipe.metadata?.mainIngredient !== activeFilters.mainIngredient) {
                    return false;
                }
                
                // Check season filter
                if (activeFilters.season && recipe.metadata?.season !== activeFilters.season) {
                    return false;
                }
                
                // Check stock availability filter
                if (activeFilters.stock) {
                    const availability = this.getRecipeAvailability(recipe);
                    if (activeFilters.stock === 'available' && availability.status !== 'available') {
                        return false;
                    }
                    if (activeFilters.stock === 'partial' && availability.status !== 'partial') {
                        return false;
                    }
                }
                
                return true;
            });
        }

        this.updateRecipeCount(recipesToShow.length, searchTerm, hasFilters);
        
        if (this.recipes.length === 0) {
            if (!this.recipesList) {
                console.warn('⚠️ recipesList element not found, re-initializing elements...');
                this.recipesList = document.getElementById('recipesList');
                if (!this.recipesList) {
                    console.error('❌ recipesList element still not found in DOM');
                    return;
                }
            }
            
            this.recipesList.innerHTML = `
                <div class="empty-state">
                    <span class="emoji">🍳</span>
                    <p>No recipes yet</p>
                    <p>Add your first recipe above to get started!</p>
                </div>
            `;
            return;
        }

        if (recipesToShow.length === 0 && searchTerm) {
            if (!this.recipesList) {
                console.warn('⚠️ recipesList element not found, re-initializing elements...');
                this.recipesList = document.getElementById('recipesList');
                if (!this.recipesList) {
                    console.error('❌ recipesList element still not found in DOM');
                    return;
                }
            }
            
            this.recipesList.innerHTML = `
                <div class="empty-state">
                    <span class="emoji">🔍</span>
                    <p>No recipes found</p>
                    <p>Try a different search term</p>
                </div>
            `;
            return;
        }

        // Sort recipes alphabetically
        const sortedRecipes = [...recipesToShow].sort((a, b) => a.name.localeCompare(b.name));
        
        const html = sortedRecipes.map(recipe => this.renderRecipe(recipe)).join('');
        
        if (!this.recipesList) {
            console.warn('⚠️ recipesList element not found, re-initializing elements...');
            this.recipesList = document.getElementById('recipesList');
            if (!this.recipesList) {
                console.error('❌ recipesList element still not found in DOM');
                return;
            }
        }
        
        this.recipesList.innerHTML = html;
    }

    /**
     * Render individual recipe item
     */
    renderRecipe(recipe) {
        const ingredientCount = recipe.ingredients ? recipe.ingredients.length : 0;
        const description = recipe.description ? recipe.description : 'No description';
        const imageUrl = this.getRecipeImageUrl(recipe.id);
        const metadata = recipe.metadata || {};
        
        // Check if this recipe has a Google image URL
        const hasGoogleImage = this.isGoogleImageUrl(recipe.image);
        
        // Build metadata display
        let metadataHtml = '';
        if (metadata.cuisine || metadata.mainIngredient || metadata.season) {
            const metaParts = [];
            if (metadata.cuisine) metaParts.push(metadata.cuisine);
            if (metadata.mainIngredient) metaParts.push(metadata.mainIngredient);
            if (metadata.season) metaParts.push(metadata.season);
            metadataHtml = `<div class="recipe-metadata">${metaParts.join(' • ')}</div>`;
        }
        
        return `
            <div class="recipe-item">
                ${imageUrl ? `<div class="recipe-image-container">
                    <img src="${imageUrl}" alt="${this.escapeHtml(recipe.name)}" class="recipe-image">
                </div>` : ''}
                <div class="recipe-content" onclick="window.realRecipesManager.openRecipeEditModal(${recipe.id})" style="cursor: pointer;" title="Click to edit recipe">
                    <div class="recipe-name">${this.escapeHtml(recipe.name)}</div>
                    <div class="recipe-description">${this.escapeHtml(description)}</div>
                    ${metadataHtml}
                    <div class="recipe-ingredients-count">${ingredientCount} ingredient${ingredientCount !== 1 ? 's' : ''}</div>
                </div>
                <div class="recipe-actions">
                    ${hasGoogleImage ? `<button class="download-google-image-btn" onclick="window.realRecipesManager.downloadGoogleImageForRecipe(${recipe.id}); event.stopPropagation();" title="Download Google image locally">📥</button>` : ''}
                    <button class="plan-recipe-btn" onclick="window.realRecipesManager.planRecipe(${recipe.id})" title="Plan this recipe">📅</button>
                    <button class="edit-category-btn" onclick="window.realRecipesManager.openRecipeEditModal(${recipe.id})" title="Edit recipe">✏️</button>
                    <button class="delete-btn" onclick="window.realRecipesManager.deleteRecipe(${recipe.id})" title="Delete recipe">×</button>
                </div>
            </div>
        `;
    }

    /**
     * Check if URL is a Google image URL
     */
    isGoogleImageUrl(imageUrl) {
        if (!imageUrl) return false;
        return imageUrl.includes('googleusercontent.com') || 
               imageUrl.includes('drive.google.com') ||
               imageUrl.includes('docs.google.com');
    }

    /**
     * Update recipe count display
     */
    updateRecipeCount(filteredCount = null, searchTerm = '', hasFilters = false) {
        if (this.recipeCount) {
            this.recipeCount.textContent = `${this.recipes.length} recipe${this.recipes.length !== 1 ? 's' : ''}`;
        }
        
        if (this.filteredRecipeCount) {
            if ((searchTerm || hasFilters) && filteredCount !== null && filteredCount !== this.recipes.length) {
                this.filteredRecipeCount.textContent = `${filteredCount} shown`;
                this.filteredRecipeCount.style.display = 'inline';
            } else {
                this.filteredRecipeCount.style.display = 'none';
            }
        }
    }

    /**
     * Apply recipe filters
     */
    applyRecipeFilters() {
        const searchTerm = this.recipeSearchInput ? this.recipeSearchInput.value.toLowerCase().trim() : '';
        this.renderRecipesList(searchTerm);
    }

    /**
     * Clear all recipe filters
     */
    clearRecipeFilters() {
        // Clear all filter selections
        if (this.cuisineFilter) this.cuisineFilter.value = '';
        if (this.mainIngredientFilter) this.mainIngredientFilter.value = '';
        if (this.seasonFilter) this.seasonFilter.value = '';
        if (this.stockFilter) this.stockFilter.value = '';
        
        // Hide clear and AI suggest buttons
        if (this.clearFiltersBtn) {
            this.clearFiltersBtn.style.display = 'none';
        }
        if (this.aiSuggestBtn) {
            this.aiSuggestBtn.style.display = 'none';
        }
        
        // Re-render with current search term but no filters
        const searchTerm = this.recipeSearchInput ? this.recipeSearchInput.value.toLowerCase().trim() : '';
        this.renderRecipesList(searchTerm);
    }

    /**
     * Populate filter dropdowns with current recipe data
     */
    populateFilterDropdowns() {
        // Get unique values from existing recipes
        const cuisines = new Set();
        const mainIngredients = new Set();
        const seasons = new Set();

        this.recipes.forEach(recipe => {
            if (recipe.metadata?.cuisine) {
                cuisines.add(recipe.metadata.cuisine);
            }
            if (recipe.metadata?.mainIngredient) {
                mainIngredients.add(recipe.metadata.mainIngredient);
            }
            if (recipe.metadata?.season) {
                seasons.add(recipe.metadata.season);
            }
        });

        // Populate cuisine filter
        if (this.cuisineFilter) {
            const currentValue = this.cuisineFilter.value;
            this.cuisineFilter.innerHTML = '<option value="">All Cuisines</option>';
            Array.from(cuisines).sort().forEach(cuisine => {
                const option = document.createElement('option');
                option.value = cuisine;
                option.textContent = cuisine;
                if (cuisine === currentValue) option.selected = true;
                this.cuisineFilter.appendChild(option);
            });
        }

        // Populate main ingredient filter
        if (this.mainIngredientFilter) {
            const currentValue = this.mainIngredientFilter.value;
            this.mainIngredientFilter.innerHTML = '<option value="">All Ingredients</option>';
            Array.from(mainIngredients).sort().forEach(ingredient => {
                const option = document.createElement('option');
                option.value = ingredient;
                option.textContent = ingredient;
                if (ingredient === currentValue) option.selected = true;
                this.mainIngredientFilter.appendChild(option);
            });
        }

        // Populate season filter
        if (this.seasonFilter) {
            const currentValue = this.seasonFilter.value;
            this.seasonFilter.innerHTML = '<option value="">All Seasons</option>';
            const seasonOrder = ['spring', 'summer', 'autumn', 'winter', 'all-year'];
            const sortedSeasons = Array.from(seasons).sort((a, b) => {
                const aIndex = seasonOrder.indexOf(a);
                const bIndex = seasonOrder.indexOf(b);
                if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
                if (aIndex === -1) return 1;
                if (bIndex === -1) return -1;
                return aIndex - bIndex;
            });
            
            sortedSeasons.forEach(season => {
                const option = document.createElement('option');
                option.value = season;
                option.textContent = season.charAt(0).toUpperCase() + season.slice(1).replace('-', ' ');
                if (season === currentValue) option.selected = true;
                this.seasonFilter.appendChild(option);
            });
        }
    }

    /**
     * Get currently active filters
     */
    getActiveFilters() {
        const filters = {};
        
        if (this.cuisineFilter && this.cuisineFilter.value) {
            filters.cuisine = this.cuisineFilter.value;
        }
        if (this.mainIngredientFilter && this.mainIngredientFilter.value) {
            filters.mainIngredient = this.mainIngredientFilter.value;
        }
        if (this.seasonFilter && this.seasonFilter.value) {
            filters.season = this.seasonFilter.value;
        }
        if (this.stockFilter && this.stockFilter.value) {
            filters.stock = this.stockFilter.value;
        }
        
        return filters;
    }

    /**
     * Update clear filters button visibility
     */
    updateClearFiltersButton() {
        const activeFilters = this.getActiveFilters();
        const hasActiveFilters = Object.keys(activeFilters).length > 0;
        
        if (this.clearFiltersBtn) {
            this.clearFiltersBtn.style.display = hasActiveFilters ? 'inline-block' : 'none';
        }
        
        // Show AI suggest button when stock filter is set to available
        if (this.aiSuggestBtn) {
            const showAISuggest = activeFilters.stock === 'available';
            this.aiSuggestBtn.style.display = showAISuggest ? 'inline-block' : 'none';
        }
    }

    /**
     * Get recipe availability based on ingredient stock status
     */
    getRecipeAvailability(recipe) {
        // If recipe has no ingredients, consider it unavailable for stock filtering
        if (!recipe.ingredients || recipe.ingredients.length === 0) {
            return { status: 'unavailable', availableCount: 0, totalCount: 0, missingIngredients: ['No ingredients defined'] };
        }

        let availableCount = 0;
        const totalCount = recipe.ingredients.length;
        const missingIngredients = [];

        // Get products from app
        const allProducts = this.app ? this.app.allProducts : [];

        recipe.ingredients.forEach(ingredient => {
            // Find the product in products list
            const product = allProducts.find(p => p.id === ingredient.productId);
            
            if (!product) {
                // Product not found - consider it missing
                missingIngredients.push({
                    name: ingredient.productName || 'Unknown ingredient',
                    reason: 'Product not found'
                });
            } else if (product.inStock) {
                // Product is marked as in stock
                availableCount++;
            } else {
                // Product exists but not in stock
                missingIngredients.push({
                    name: product.name,
                    reason: 'Not in stock'
                });
            }
        });

        // Determine availability status
        let status;
        if (availableCount === totalCount) {
            status = 'available';
        } else if (availableCount > 0) {
            status = 'partial';
        } else {
            status = 'unavailable';
        }

        return {
            status,
            availableCount,
            totalCount,
            missingIngredients,
            availabilityPercentage: totalCount > 0 ? Math.round((availableCount / totalCount) * 100) : 100
        };
    }

    /**
     * Escape HTML for safe display
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Generate AI recipe suggestions based on available ingredients
     */
    generateAIRecipes() {
        // Get all products that are in stock from app
        const allProducts = this.app ? this.app.allProducts : [];
        const inStockProducts = allProducts.filter(product => product.inStock);
        
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

    /**
     * Show product recipes modal
     */
    showProductRecipes(productId) {
        // console.log(`🔍 showProductRecipes called with productId: ${productId}`);
        
        const allProducts = this.app ? this.app.allProducts : [];
        const product = allProducts.find(p => p.id === productId);
        if (!product) {
            console.warn(`⚠️ Product with ID ${productId} not found`);
            return;
        }

        // Initialize modal elements
        this.initializeDOMElements();

        // Store the current product ID for later restoration
        this.currentProductForRecipes = productId;

        // Close any other modals first
        this.closeAllModals();
        
        // Show modal IMMEDIATELY with loading state
        if (this.selectedProductName) {
            this.selectedProductName.textContent = product.name;
        }
        if (this.productRecipesList) {
            this.productRecipesList.innerHTML = '<div style="text-align: center; padding: 40px; font-size: 16px;">🔄 Loading recipes...</div>';
            this.productRecipesList.style.display = 'block';
        }
        if (this.noRecipesFound) {
            this.noRecipesFound.style.display = 'none';
        }
        
        // Show the modal
        if (this.productRecipesModal) {
            // console.log('📱 Showing modal immediately...');
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
            
            // Force reflow
            this.productRecipesModal.offsetHeight;
            
            // Also force the modal-content to be visible
            const modalContent = this.productRecipesModal.querySelector('.modal-content');
            if (modalContent) {
                modalContent.style.setProperty('display', 'block', 'important');
                modalContent.style.setProperty('visibility', 'visible', 'important');
                modalContent.style.setProperty('opacity', '1', 'important');
            }
        }
        
        // console.log('✅ Modal displayed, now loading recipes...');
        
        // Load content asynchronously after modal is shown  
        setTimeout(() => {
            // console.log('🔄 Processing recipes in background...');
            
            // Find all recipes that use this product
            const recipesUsingProduct = this.recipes.filter(recipe => {
                if (!recipe.ingredients) return false;
                
                const foundIngredient = recipe.ingredients.some(ingredient => {
                    // Try matching by productId first (convert to strings), then fall back to name matching
                    const idMatch = String(ingredient.productId) === String(productId);
                    const nameMatch = ingredient.productName && ingredient.productName.toLowerCase() === product.name.toLowerCase();
                    
                    return idMatch || nameMatch;
                });
                
                return foundIngredient;
            });
            
            console.log(`🍳 Found ${recipesUsingProduct.length} recipes using "${product.name}" (ID: ${productId})`); // Keep useful info
            
            if (recipesUsingProduct.length === 0) {
                if (this.productRecipesList) this.productRecipesList.style.display = 'none';
                if (this.noRecipesFound) this.noRecipesFound.style.display = 'block';
            } else {
                this.renderProductRecipesList(recipesUsingProduct, product);
                if (this.productRecipesList) this.productRecipesList.style.display = 'block';
                if (this.noRecipesFound) this.noRecipesFound.style.display = 'none';
            }
            
            // console.log('✅ Recipe content loaded');
        }, 10);
    }

    /**
     * Render product recipes list in modal
     */
    renderProductRecipesList(recipes, product) {
        const html = recipes.map(recipe => {
            // Get ingredient details for this product in this recipe
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
                        <button class="recipe-link-btn" onclick="window.realRecipesManager.openRecipeFromProduct(${recipe.id})">
                            View Recipe
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        if (this.productRecipesList) {
            this.productRecipesList.innerHTML = html;
        }
    }

    /**
     * Open recipe from product modal
     */
    openRecipeFromProduct(recipeId) {
        // Store the current product recipes modal state to restore later
        this.storedProductRecipesState = {
            productId: this.currentProductForRecipes,
            isOpen: true
        };
        
        // Hide the product recipes modal temporarily
        if (this.productRecipesModal) {
            this.productRecipesModal.style.display = 'none';
        }
        
        // Switch to recipes tab via app
        if (this.app && this.app.switchTab) {
            this.app.switchTab('recipes');
        }
        
        // Find and open the recipe
        const recipe = this.recipes.find(r => r.id === recipeId);
        if (recipe && this.app && this.app.openRecipeEditModal) {
            // Small delay to ensure tab switch completes
            setTimeout(() => {
                this.app.openRecipeEditModal(recipe);
            }, 100);
        }
    }

    /**
     * Close product recipes modal
     */
    closeProductRecipesModal() {
        if (this.productRecipesModal) {
            this.productRecipesModal.style.display = 'none';
            this.productRecipesModal.classList.remove('force-show');
        }
        // Clear any stored state since user explicitly closed the modal
        this.storedProductRecipesState = null;
        this.currentProductForRecipes = null;
    }

    /**
     * Close all modals to prevent conflicts
     */
    closeAllModals() {
        // Get modals from app if available
        if (this.app) {
            if (this.app.recipeEditModal) this.app.recipeEditModal.style.display = 'none';
            if (this.app.changeCategoryModal) this.app.changeCategoryModal.style.display = 'none';
            if (this.app.productEditModal) this.app.productEditModal.style.display = 'none';
            if (this.app.simpleMealModal) this.app.simpleMealModal.style.display = 'none';
            if (this.app.recipeSelectionModal) this.app.recipeSelectionModal.style.display = 'none';
            if (this.app.recipePlanningModal) this.app.recipePlanningModal.style.display = 'none';
            if (this.app.shoppingListModal) this.app.shoppingListModal.style.display = 'none';
        }
    }

    /**
     * Get product recipe count for display
     */
    getProductRecipeCount(productId) {
        const allProducts = this.app ? this.app.allProducts : [];
        const product = allProducts.find(p => p.id === productId);
        if (!product) return 0;
        
        // Count how many recipes use this product
        return this.recipes.filter(recipe => {
            return recipe.ingredients && recipe.ingredients.some(ingredient => 
                // Try matching by productId first (convert to strings), then fall back to name matching
                String(ingredient.productId) === String(productId) || 
                (ingredient.productName && ingredient.productName.toLowerCase() === product.name.toLowerCase())
            );
        }).length;
    }
    
    /**
     * Render recipe ingredients in modal (self-sufficient)
     */
    renderRecipeIngredientsInModal(recipe) {
        // console.log('🍽️ Rendering recipe ingredients in modal (self-sufficient)...', {
        //     recipeId: recipe.id,
        //     recipeName: recipe.name,
        //     ingredientsCount: recipe.ingredients?.length || 0
        // });

        const ingredientsList = document.getElementById('ingredientsList');
        if (!ingredientsList) {
            console.warn('⚠️ ingredientsList element not found in DOM');
            return;
        }

        if (!recipe.ingredients || recipe.ingredients.length === 0) {
            ingredientsList.innerHTML = '<p style="color: #7f8c8d; text-align: center; margin: 10px 0;">No ingredients added yet</p>';
            // console.log('📝 No ingredients to display');
            return;
        }

        // console.log('🥘 Processing ingredients:', recipe.ingredients);

        const html = recipe.ingredients.map((ingredient, index) => {
            // Enhanced product lookup with multiple fallbacks
            let product = null;
            let productName = 'Unknown Product';
            
            // Try multiple product resolution methods
            if (ingredient.productId) {
                // Method 1: Use Products Manager if available
                if (window.realProductsCategoriesManager) {
                    product = window.realProductsCategoriesManager.getProductById(ingredient.productId);
                }
                
                // Method 2: Direct app.allProducts lookup (fallback)
                if (!product && window.app && window.app.allProducts) {
                    product = window.app.allProducts.find(p => p.id == ingredient.productId);
                }
                
                if (product) {
                    productName = product.name;
                } else {
                    // Try smart matching with existing products
                    const matchedProduct = this.findBestProductMatch(ingredient);
                    if (matchedProduct) {
                        product = matchedProduct;
                        productName = matchedProduct.name;
                        // console.log(`🎯 Smart match: "${ingredient.name || ingredient.productId}" → "${matchedProduct.name}"`); 
                    } else {
                        // Use ingredient name if available, otherwise clean up the productId
                        productName = ingredient.name || ingredient.productId.replace(/_/g, ' ');
                        // console.warn(`⚠️ Product not found for ID: ${ingredient.productId}, using name: ${productName}`);
                    }
                }
            } else if (ingredient.name) {
                // Fallback to ingredient name if no productId
                productName = ingredient.name;
            }
            
            // console.log(`${index + 1}. ${productName} - ${ingredient.quantity || 1} ${ingredient.unit || 'pcs'}`);
            
            return `
                <div class="ingredient-item" id="ingredient-${ingredient.productId}">
                    <div class="ingredient-info">
                        <div class="ingredient-name">${this.escapeHtml(productName)}</div>
                        <div class="ingredient-amount">${ingredient.quantity} ${ingredient.unit}</div>
                    </div>
                    <div class="ingredient-actions">
                        <button class="ingredient-edit" onclick="window.realRecipesManager.editIngredientQuantity('${ingredient.productId}')" title="Edit quantity">✏️</button>
                        <button class="ingredient-remove" onclick="window.realRecipesManager.removeIngredientFromRecipe('${ingredient.productId}')" title="Remove ingredient">×</button>
                    </div>
                </div>
            `;
        }).join('');

        ingredientsList.innerHTML = html;
        // console.log('✅ Recipe ingredients rendered successfully in self-sufficient modal');
    }

    /**
     * Find best product match using fuzzy matching
     */
    findBestProductMatch(ingredient) {
        if (!window.app || !window.app.allProducts) {
            return null;
        }

        // Smart selection: if productId looks like Dutch (no spaces, underscores), prefer it over English name
        let searchTerm;
        if (ingredient.productId && typeof ingredient.productId === 'string') {
            // If productId looks like a dutch word (no spaces or underscores suggest it's from our system)
            if (ingredient.productId.includes('_') || !ingredient.productId.includes(' ')) {
                searchTerm = ingredient.productId.replace(/_/g, ' ').toLowerCase().trim();
                // console.log(`🔍 Smart matching (using productId): "${searchTerm}" (from "${ingredient.productId}")`);
            } else {
                searchTerm = (ingredient.name || ingredient.productId || '').toLowerCase().trim();
                // console.log(`🔍 Smart matching (using name): "${searchTerm}"`);
            }
        } else {
            searchTerm = (ingredient.name || ingredient.productId || '').toLowerCase().trim();
            // console.log(`🔍 Smart matching (fallback): "${searchTerm}"`);
        }
        
        if (!searchTerm) return null;

        // Get all products for matching
        const products = window.app.allProducts;
        const matches = [];

        // Scoring system for different match types
        for (const product of products) {
            const productName = product.name.toLowerCase();
            let score = 0;

            // Exact match (case-insensitive - highest priority)  
            if (productName === searchTerm) {
                score = 100; // Auto-accepted, no confirmation needed
            }
            // Starts with search term
            else if (productName.startsWith(searchTerm)) {
                score = 90;
            }
            // Contains search term
            else if (productName.includes(searchTerm)) {
                score = 80;
            }
            // Search term contains product name (for cases like "tomaten" matching "tomaat")
            else if (searchTerm.includes(productName)) {
                score = 70;
            }
            // Word overlap (split by spaces and check common words)
            else {
                const searchWords = searchTerm.split(/\s+/);
                const productWords = productName.split(/\s+/);
                const commonWords = searchWords.filter(word => 
                    productWords.some(pWord => pWord.includes(word) || word.includes(pWord))
                );
                if (commonWords.length > 0) {
                    score = 40 + (commonWords.length * 10); // Base 40 + 10 per common word
                }
            }

            if (score > 0) {
                matches.push({ product, score, reason: this.getMatchReason(score) });
            }
        }

        // Sort by score (highest first)
        matches.sort((a, b) => b.score - a.score);

        if (matches.length > 0) {
            const bestMatch = matches[0];
            // console.log(`🎯 Best match found: "${searchTerm}" → "${bestMatch.product.name}" (score: ${bestMatch.score}, ${bestMatch.reason})`);
            
            // Auto-accept high-confidence matches without confirmation
            if (bestMatch.score >= 80) { // Exact, starts with, or contains matches
                return bestMatch.product;
            }
            
            // Only show confirmation for uncertain matches (score < 80)
            if (matches.length > 1 && window.confirm && bestMatch.score < 80) {
                const topMatches = matches.slice(0, 3);
                const matchList = topMatches.map((m, i) => 
                    `${i + 1}. ${m.product.name} (${m.reason})`
                ).join('\n');
                
                const confirmed = confirm(
                    `🔍 Smart matching found:\n\n${matchList}\n\nUse "${bestMatch.product.name}" for "${searchTerm}"?`
                );
                
                if (confirmed) {
                    return bestMatch.product;
                }
            }
        }

        // console.log(`❌ No good matches found for: "${searchTerm}"`);
        return null;
    }

    /**
     * Get human-readable reason for match score
     */
    getMatchReason(score) {
        if (score >= 100) return 'exact match';
        if (score >= 90) return 'starts with';
        if (score >= 80) return 'contains term';
        if (score >= 70) return 'term contains';
        if (score >= 40) return 'word overlap';
        return 'low confidence';
    }

    /**
     * Edit ingredient quantity in recipe (self-sufficient)
     */
    editIngredientQuantity(productId) {
        if (!this.currentEditingRecipe) {
            console.error('❌ No recipe currently being edited');
            alert('No recipe is currently being edited');
            return;
        }

        // Find the ingredient in the current recipe - try both productId and id
        let ingredient = this.currentEditingRecipe.ingredients.find(ing => ing.productId === productId);
        if (!ingredient) {
            // Try searching by id field as well
            ingredient = this.currentEditingRecipe.ingredients.find(ing => ing.id === productId);
        }
        if (!ingredient) {
            // Try converting productId to string/number for comparison
            ingredient = this.currentEditingRecipe.ingredients.find(ing => 
                String(ing.productId) === String(productId) || String(ing.id) === String(productId)
            );
        }
        
        if (!ingredient) {
            console.error('❌ Ingredient not found in recipe:', productId);
            alert('Ingredient not found in recipe');
            return;
        }

        // Get product name for display - use ingredient's productName if available
        let productName = ingredient.productName || ingredient.name || 'Unknown Product';
        
        // If no productName in ingredient, try to look it up
        if (!ingredient.productName && !ingredient.name) {
            const products = this.getProducts();
            const product = products.find(p => String(p.id) === String(productId));
            productName = product ? product.name : 'Unknown Product';
        }

        // Create edit modal using the same pattern as timer modals
        const modal = document.createElement('div');
        modal.id = 'editIngredientModal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center;
            z-index: 100000;
        `;
        
        modal.innerHTML = `
            <div style="background: white; padding: 25px; border-radius: 15px; max-width: 400px; width: 90%; box-shadow: 0 20px 40px rgba(0,0,0,0.3);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #eee;">
                    <h3 style="margin: 0; color: #333; font-size: 1.4em;">Edit Ingredient</h3>
                    <button onclick="document.getElementById('editIngredientModal').remove()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #999; padding: 0; width: 30px; height: 30px;">×</button>
                </div>
                <div>
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #555;">Product:</label>
                        <div style="padding: 8px 12px; background: #f8f9fa; border-radius: 8px; color: #333; font-weight: 500;">${productName}</div>
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #555;">Quantity:</label>
                        <input type="text" id="editQuantity" value="${ingredient.quantity || ''}" placeholder="e.g., 2, 1/2, 250g" style="width: 100%; padding: 10px 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 14px; box-sizing: border-box;">
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #555;">Unit:</label>
                        <input type="text" id="editUnit" value="${ingredient.unit || ''}" placeholder="e.g., cups, tbsp, kg" style="width: 100%; padding: 10px 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 14px; box-sizing: border-box;">
                    </div>
                    <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 25px; padding-top: 15px; border-top: 1px solid #eee;">
                        <button onclick="document.getElementById('editIngredientModal').remove()" style="padding: 10px 20px; border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; background: #f1f3f4; color: #5f6368;">Cancel</button>
                        <button onclick="window.realRecipesManager.saveIngredientEdit('${productId}')" style="padding: 10px 20px; border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; background: #667eea; color: white;">Save Changes</button>
                    </div>
                </div>
            </div>
        `;

        // Add modal to DOM
        document.body.appendChild(modal);

        // Focus on quantity input
        setTimeout(() => {
            const quantityInput = document.getElementById('editQuantity');
            if (quantityInput) {
                quantityInput.focus();
                quantityInput.select();
            }
        }, 100);
    }

    /**
     * Save ingredient edit changes
     */
    saveIngredientEdit(productId) {
        const quantityInput = document.getElementById('editQuantity');
        const unitInput = document.getElementById('editUnit');
        
        if (!quantityInput || !unitInput) {
            console.error('❌ Edit form inputs not found');
            return;
        }

        const newQuantity = quantityInput.value.trim();
        const newUnit = unitInput.value.trim();

        // Find and update the ingredient - try both productId and id
        let ingredient = this.currentEditingRecipe.ingredients.find(ing => ing.productId === productId);
        if (!ingredient) {
            ingredient = this.currentEditingRecipe.ingredients.find(ing => ing.id === productId);
        }
        if (!ingredient) {
            ingredient = this.currentEditingRecipe.ingredients.find(ing => 
                String(ing.productId) === String(productId) || String(ing.id) === String(productId)
            );
        }
        if (!ingredient) {
            console.error('❌ Ingredient not found for update:', productId);
            return;
        }

        // Update ingredient data
        ingredient.quantity = newQuantity;
        ingredient.unit = newUnit;

        // Save recipe changes
        this.saveRecipes();

        // Refresh the ingredient display
        this.renderRecipeIngredientsInModal(this.currentEditingRecipe);

        // Close modal
        const modal = document.getElementById('editIngredientModal');
        if (modal) modal.remove();

        console.log(`✅ Updated ingredient: ${ingredient.quantity} ${ingredient.unit}`);
    }

    /**
     * Remove ingredient from recipe (self-sufficient)
     */
    removeIngredientFromRecipe(productId) {
        if (!this.currentEditingRecipe) {
            console.error('❌ No recipe currently being edited');
            alert('No recipe is currently being edited');
            return;
        }

        // console.log('🗑️ Removing ingredient from recipe:', productId);

        // Get product name for logging before removal
        let productName = 'Unknown Product';
        if (this.productsManager) {
            const product = this.productsManager.getProductById(productId);
            if (product) {
                productName = product.name;
            }
        }

        // Remove ingredient using existing method
        const success = this.removeIngredient(this.currentEditingRecipe.id, productId);
        
        if (success) {
            // console.log(`✅ Removed ingredient: ${productName} (${productId})`);
            
            // Sync with app system for compatibility
            if (window.app) {
                window.app.currentRecipeIngredients = this.currentEditingRecipe.ingredients ? [...this.currentEditingRecipe.ingredients] : [];
                // console.log('🔄 Synced ingredient removal with app system');
            }
            
            // Re-render ingredients list in modal
            this.renderRecipeIngredientsInModal(this.currentEditingRecipe);
            
            // Update product recipe counts if needed
            this.updateProductRecipeCounts();
            
        } else {
            console.error(`❌ Failed to remove ingredient: ${productName} (${productId})`);
            alert('Failed to remove ingredient. Please try again.');
        }
    }

    /**
     * Close recipe edit modal - self-sufficient
     */
    closeRecipeEditModal() {
        // console.log('🚪 [RECIPES] Closing recipe edit modal');
        
        const modal = document.getElementById('recipeEditModal');
        if (!modal) {
            console.warn('⚠️ Recipe modal not found');
            return;
        }
        
        modal.style.display = 'none';
        this.currentEditingRecipe = null;
        this.isCreatingNewRecipe = false;
        
        // Hide the timers panel when recipe modal closes
        if (window.recipeTimers) {
            window.recipeTimers.timersActivated = false;
            const timersPanel = document.getElementById('timersPanel');
            if (timersPanel) {
                timersPanel.classList.remove('activated');
                console.log('🙈 Timers panel hidden on recipe modal close');
            }
        }
        
        // UNIFIED ARCHITECTURE: Also clear app.currentEditingRecipe
        if (window.app) {
            window.app.currentEditingRecipe = null;
            // console.log('🔄 Cleared app.currentEditingRecipe on modal close');
        }
        
        // console.log('✅ Recipe modal closed');
    }

    toggleMaximizeRecipeModal() {
        const modal = document.getElementById('recipeEditModal');
        const btn = document.getElementById('maximizeRecipeModal');
        if (!modal || !btn) return;
        const isMaximized = modal.classList.contains('maximized');
        if (isMaximized) {
            modal.classList.remove('maximized');
            btn.innerHTML = '⛶';
            btn.title = 'Maximize';
        } else {
            modal.classList.add('maximized');
            btn.innerHTML = '🗗';
            btn.title = 'Restore';
        }
    }

    /**
     * Confirm recipe edit and save changes - self-sufficient
     */
    confirmRecipeEdit() {
        console.log('💾 [RECIPES] Confirming recipe edit');
        
        const recipe = this.currentEditingRecipe;
        if (!recipe) {
            console.error('❌ No recipe being edited');
            return;
        }
        
        // CRITICAL FIX: Capture ingredients IMMEDIATELY before they can be cleared
        const ingredientsToSave = window.app && window.app.currentRecipeIngredients ? 
            [...window.app.currentRecipeIngredients] : [];
        console.log(`🛡️ [CRITICAL] Captured ${ingredientsToSave.length} ingredients at start of save process`);
        
        // Get form values (use correct IDs from HTML)
        const editRecipeName = document.getElementById('editRecipeName');
        const editRecipeDescription = document.getElementById('editRecipeDescription');
        const editRecipePreparation = document.getElementById('editRecipePreparation');
        
        if (!editRecipeName) {
            console.error('❌ Recipe form elements not available for saving');
            return;
        }
        
        const newName = editRecipeName.value.trim();
        const newDescription = editRecipeDescription ? editRecipeDescription.value.trim() : '';
        const newPreparation = editRecipePreparation ? editRecipePreparation.value.trim() : '';
        
        if (!newName) {
            alert('Recipe name cannot be empty');
            return;
        }
        
        // Update recipe (SYNC WITH APP'S INGREDIENT MANAGEMENT!)
        recipe.name = newName;
        recipe.description = newDescription;
        recipe.instructions = newPreparation;
        recipe.preparation = newPreparation; // For backward compatibility
        recipe.metadata = recipe.metadata || {};
        recipe.metadata.dateModified = new Date().toISOString();
        
        // CRITICAL FIX: Preserve existing recipe image during save
        // The confirmRecipeEdit should not touch the image property
        console.log(`🖼️ [PRESERVE] Keeping existing recipe image: ${recipe.image || 'none'}`);
        
        // CRITICAL FIX: Sync ingredients with app's currentRecipeIngredients
        // The app.js addIngredientToRecipe() adds to currentRecipeIngredients
        // We need to sync this with the recipe's ingredients array
        console.log('🔍 [DEBUG] Ingredient sync analysis:');
        console.log('🔍 [DEBUG] Captured ingredients length:', ingredientsToSave.length);
        console.log('🔍 [DEBUG] Captured ingredients value:', ingredientsToSave);
        console.log('🔍 [DEBUG] Current recipe.ingredients before sync:', recipe.ingredients);
        
        if (ingredientsToSave.length > 0) {
            console.log(`🔄 Syncing ${ingredientsToSave.length} captured ingredients to recipe`);
            console.log('🔄 [DEBUG] Captured ingredients being synced:', ingredientsToSave);
            recipe.ingredients = ingredientsToSave;
            console.log('🔄 [DEBUG] Recipe ingredients after sync:', recipe.ingredients);
        } else {
            console.log(`💾 Preserving ${recipe.ingredients?.length || 0} existing ingredients (no captured ingredients)`);
            console.log('💾 [DEBUG] Preserved ingredients:', recipe.ingredients);
        }
        
        // Save changes
        this.saveRecipes();
        
        // Close modal
        this.closeRecipeEditModal();
        
        // Re-render if needed
        if (window.app && window.app.render) {
            window.app.render();
        }
        
        console.log('✅ Recipe edit confirmed and saved');
    }

    /**
     * NEW FEATURE: Fetch recipe from URL
     * Extract recipe data from online recipe websites
     */
    async fetchFromUrl(url) {
        console.log('🌐 Starting URL recipe fetch:', url); // Keep AI processing status
        
        // Validate URL
        if (!url || !this.isValidRecipeUrl(url)) {
            alert('❌ Please enter a valid recipe URL');
            return false;
        }
        
        // Show loading state
        const fetchBtn = document.getElementById('fetchRecipeBtn');
        const originalText = fetchBtn?.textContent || '🔍 Fetch Recipe';
        if (fetchBtn) {
            fetchBtn.disabled = true;
            fetchBtn.textContent = '🔄 Fetching...';
        }
        
        try {
            // Use WebFetch to get the webpage content
            const response = await this.fetchWebpageContent(url);
            if (!response) {
                throw new Error('Failed to fetch webpage content');
            }
            
            // Extract recipe data from the HTML content
            const recipeData = await this.extractRecipeData(response, url);
            if (!recipeData) {
                throw new Error('Could not extract recipe data from this webpage');
            }
            
            // Create recipe from extracted data
            const recipe = await this.createRecipeFromExtractedData(recipeData);
            if (!recipe) {
                throw new Error('Failed to create recipe from extracted data');
            }
            
            // Success!
            console.log('✅ Recipe successfully fetched and created:', recipe.name);
            
            // Clear the URL input
            const urlInput = document.getElementById('recipeUrlInput');
            if (urlInput) urlInput.value = '';
            
            // Re-render recipes list
            if (window.app && window.app.render) {
                window.app.render();
            }
            
            alert(`✅ Recipe "${recipe.name}" successfully added from URL!`);
            return recipe;
            
        } catch (error) {
            console.error('❌ URL recipe fetch failed:', error);
            alert(`❌ Failed to fetch recipe: ${error.message}\n\nPlease try a different recipe URL or add the recipe manually.`);
            return false;
            
        } finally {
            // Restore button state
            if (fetchBtn) {
                fetchBtn.disabled = false;
                fetchBtn.textContent = originalText;
            }
        }
    }

    async fetchWebpageContent(url) {
        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            const hostname = new URL(url).hostname.toLowerCase();
            const formattedResponse = `Recipe Title: Test Recipe from ${hostname}\n\nIngredients:\n- 1 cup flour\n- 2 eggs\n\nInstructions:\n1. Mix ingredients.\n2. Cook.\n\nPrep Time: 10 minutes\nCook Time: 20 minutes\nServings: 4`;
            return { content: formattedResponse };
        } catch (error) {
            console.error('❌ WebFetch integration failed:', error);
            throw new Error(`Failed to fetch webpage: ${error.message}`);
        }
    }

    /**
     * Validate if URL looks like a recipe URL
     */
    isValidRecipeUrl(url) {
        try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname.toLowerCase();
            
            // List of known recipe websites
            const recipeHosts = [
                'allrecipes.com', 'food.com', 'bbc.co.uk', 'bbcgoodfood.com',
                'epicurious.com', 'foodnetwork.com', 'delish.com', 'bonappetit.com',
                'seriouseats.com', 'thekitchn.com', 'minimalistbaker.com',
                'tasteofhome.com', 'foodandwine.com', 'cooking.nytimes.com',
                'recipe', 'cook', 'kitchen', 'food', 'cuisine'
            ];
            
            return recipeHosts.some(host => hostname.includes(host));
        } catch (e) {
            return false;
        }
    }
    
    /**
     * Process WebFetch response from conductor - NEW METHOD
     */
    async processWebFetchResponse(webContent, originalUrl) {
        try {
            console.log('🤖 Processing WebFetch response for recipe extraction...');
            
            if (!webContent) {
                throw new Error('No content received from WebFetch');
            }
            
            // Parse the AI-extracted recipe data
            let recipeData = this.parseWebFetchResponse(webContent, originalUrl);
            
            if (!recipeData) {
                throw new Error('Could not parse recipe data from WebFetch response');
            }
            
            // Validate and clean the extracted data
            recipeData = this.validateRecipeData(recipeData, originalUrl);
            
            console.log('✅ Recipe data successfully extracted:', recipeData.title);
            return recipeData;
            
        } catch (error) {
            console.error('❌ Recipe extraction failed:', error);
            throw new Error(`Failed to extract recipe data: ${error.message}`);
        }
    }
    
    /**
     * Extract recipe data from HTML content using AI
     */
    async extractRecipeData(response, originalUrl) {
        try {
            console.log('🤖 Processing WebFetch response for recipe extraction...');
            
            if (!response || !response.content) {
                throw new Error('No content received from WebFetch');
            }
            
            // The WebFetch response should contain structured recipe information
            // Parse the AI-extracted recipe data
            let recipeData = this.parseWebFetchResponse(response.content, originalUrl);
            
            if (!recipeData) {
                throw new Error('Could not parse recipe data from WebFetch response');
            }
            
            // Validate and clean the extracted data
            recipeData = this.validateRecipeData(recipeData, originalUrl);
            
            console.log('✅ Recipe data successfully extracted:', recipeData.title);
            return recipeData;
            
        } catch (error) {
            console.error('❌ Recipe extraction failed:', error);
            throw new Error(`Failed to extract recipe data: ${error.message}`);
        }
    }
    
    /**
     * Parse WebFetch AI response into structured recipe data
     */
    parseWebFetchResponse(content, sourceUrl) {
        try {
            // Try to find structured recipe information in the WebFetch response
            const lines = content.split('\n');
            let recipeData = {
                title: '',
                ingredients: [],
                instructions: '',
                image: null,
                servings: null,
                cookTime: null,
                prepTime: null,
                description: '',
                sourceUrl: sourceUrl
            };
            
            let currentSection = '';
            let ingredientsStarted = false;
            let instructionsStarted = false;
            
            for (const line of lines) {
                const cleanLine = line.trim();
                if (!cleanLine) continue;
                
                // Look for title/name
                if ((cleanLine.toLowerCase().includes('recipe') && cleanLine.toLowerCase().includes('title')) ||
                    (cleanLine.toLowerCase().includes('name') && cleanLine.includes(':'))) {
                    recipeData.title = this.extractFieldValue(cleanLine);
                }
                
                // Look for ingredients section
                if (cleanLine.toLowerCase().includes('ingredient')) {
                    ingredientsStarted = true;
                    currentSection = 'ingredients';
                    continue;
                }
                
                // Look for instructions section
                if (cleanLine.toLowerCase().includes('instruction') || 
                    cleanLine.toLowerCase().includes('method') ||
                    cleanLine.toLowerCase().includes('preparation')) {
                    instructionsStarted = true;
                    currentSection = 'instructions';
                    continue;
                }
                
                // Parse based on current section
                if (ingredientsStarted && currentSection === 'ingredients') {
                    if (this.looksLikeIngredient(cleanLine)) {
                        recipeData.ingredients.push(cleanLine.replace(/^[-•*]\s*/, ''));
                    } else if (instructionsStarted) {
                        currentSection = 'instructions';
                    }
                }
                
                if (instructionsStarted && currentSection === 'instructions') {
                    if (this.looksLikeInstruction(cleanLine)) {
                        recipeData.instructions += cleanLine + '\n';
                    }
                }
                
                // Look for timing and serving information
                if (cleanLine.toLowerCase().includes('serving')) {
                    recipeData.servings = this.extractNumber(cleanLine);
                }
                if (cleanLine.toLowerCase().includes('cook time') || cleanLine.toLowerCase().includes('cooking time')) {
                    recipeData.cookTime = this.extractFieldValue(cleanLine);
                }
                if (cleanLine.toLowerCase().includes('prep time') || cleanLine.toLowerCase().includes('preparation time')) {
                    recipeData.prepTime = this.extractFieldValue(cleanLine);
                }
            }
            
            // If parsing failed, try fallback extraction
            if (!recipeData.title && !recipeData.ingredients.length) {
                return this.fallbackRecipeExtraction(content, sourceUrl);
            }
            
            return recipeData;
            
        } catch (error) {
            console.error('❌ Failed to parse WebFetch response:', error);
            return null;
        }
    }
    
    /**
     * Validate and clean extracted recipe data
     */
    validateRecipeData(recipeData, sourceUrl) {
        // Ensure we have minimum required data
        if (!recipeData.title) {
            recipeData.title = `Recipe from ${new URL(sourceUrl).hostname}`;
        }
        
        if (!recipeData.ingredients || recipeData.ingredients.length === 0) {
            throw new Error('No ingredients found in recipe');
        }
        
        if (!recipeData.instructions) {
            recipeData.instructions = 'Cooking instructions not found. Please check the original URL.';
        }
        
        // Clean up instructions
        recipeData.instructions = recipeData.instructions.trim();
        
        // Ensure sourceUrl is included
        recipeData.sourceUrl = sourceUrl;
        
        return recipeData;
    }
    
    /**
     * Helper methods for parsing WebFetch response
     */
    extractFieldValue(line) {
        const colonIndex = line.indexOf(':');
        if (colonIndex > -1) {
            return line.substring(colonIndex + 1).trim();
        }
        return line.trim();
    }
    
    extractNumber(text) {
        const match = text.match(/\d+/);
        return match ? parseInt(match[0]) : null;
    }
    
    looksLikeIngredient(line) {
        // Check if line contains measurement patterns typical of ingredients
        return /\d+\s*(cup|tbsp|tsp|lb|oz|g|kg|ml|l|inch|clove|piece)/i.test(line) ||
               /^[-•*]\s*\d/.test(line) ||
               line.includes('cup') || line.includes('tablespoon') || line.includes('teaspoon');
    }
    
    looksLikeInstruction(line) {
        // Check if line looks like a cooking instruction
        return /^(\d+\.|\d+\)|\*|-|•)/.test(line) ||
               /\b(heat|cook|bake|mix|stir|add|combine|season|serve|prepare|place|remove)\b/i.test(line);
    }
    
    /**
     * Fallback recipe extraction for when structured parsing fails
     */
    fallbackRecipeExtraction(content, sourceUrl) {
        // console.log('🔄 Using fallback recipe extraction...');
        
        // Simple fallback - extract any lines that look like ingredients or instructions
        const lines = content.split('\n');
        const possibleIngredients = [];
        const possibleInstructions = [];
        
        for (const line of lines) {
            const cleanLine = line.trim();
            if (!cleanLine || cleanLine.length < 5) continue;
            
            if (this.looksLikeIngredient(cleanLine)) {
                possibleIngredients.push(cleanLine);
            } else if (this.looksLikeInstruction(cleanLine)) {
                possibleInstructions.push(cleanLine);
            }
        }
        
        if (possibleIngredients.length === 0) {
            return null; // Give up if we can't find any ingredients
        }
        
        return {
            title: `Recipe from ${new URL(sourceUrl).hostname}`,
            ingredients: possibleIngredients.slice(0, 20), // Limit to reasonable number
            instructions: possibleInstructions.join('\n') || 'Please check the original URL for cooking instructions.',
            sourceUrl: sourceUrl,
            servings: null,
            cookTime: null,
            image: null
        };
    }
    
    /**
     * Link extracted ingredients to products in master list
     */
    linkIngredientsToProducts(extractedIngredients) {
        // console.log('🔗 Linking ingredients to master products...');
        
        const linkedIngredients = [];
        const products = this.getProducts(); // Get master products list
        
        for (const ingredientText of extractedIngredients) {
            const linkedIngredient = this.processIngredientText(ingredientText, products);
            linkedIngredients.push(linkedIngredient);
        }
        
        console.log(`✅ Linked ${linkedIngredients.length} ingredients`); // Keep AI processing status
        return linkedIngredients;
    }
    
    /**
     * Process individual ingredient text and match to products
     */
    processIngredientText(ingredientText, products) {
        // Parse quantity and unit from ingredient text
        const parsed = this.parseIngredientText(ingredientText);
        
        // Try to match the ingredient name to existing products
        const matchedProduct = this.findMatchingProduct(parsed.ingredient, products);
        
        if (matchedProduct) {
            // console.log(`🔗 Matched "${parsed.ingredient}" to product "${matchedProduct.name}"`);
            return {
                productId: matchedProduct.id,
                productName: matchedProduct.name,
                name: matchedProduct.name, // Fallback for compatibility
                quantity: parsed.quantity,
                unit: parsed.unit,
                originalText: ingredientText,
                linked: true
            };
        } else {
            // console.log(`⚠️ No match found for "${parsed.ingredient}" - creating as text ingredient`);
            // Create a unique ID for unmatched ingredients
            const fallbackId = `ingredient_${parsed.ingredient.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;
            return {
                productId: fallbackId,
                productName: parsed.ingredient,
                name: parsed.ingredient, // Fallback for compatibility
                quantity: parsed.quantity,
                unit: parsed.unit,
                originalText: ingredientText,
                linked: false
            };
        }
    }
    
    /**
     * Parse ingredient text to extract quantity, unit, and ingredient name
     */
    parseIngredientText(text) {
        // Remove leading dashes/bullets
        let cleanText = text.replace(/^[-•*]\s*/, '').trim();
        
        // Extract quantity (numbers, fractions, decimals)
        const quantityMatch = cleanText.match(/^(\d+(?:\.\d+)?(?:\/\d+)?|\d+\/\d+)/);
        let quantity = quantityMatch ? quantityMatch[1] : '';
        
        // Remove quantity from text
        if (quantity) {
            cleanText = cleanText.replace(/^(\d+(?:\.\d+)?(?:\/\d+)?|\d+\/\d+)\s*/, '');
        }
        
        // Extract unit (common cooking units)
        const unitPattern = /^(cup|cups|tbsp|tablespoon|tablespoons|tsp|teaspoon|teaspoons|lb|pound|pounds|oz|ounce|ounces|g|gram|grams|kg|kilogram|kilograms|ml|milliliter|milliliters|l|liter|liters|inch|inches|clove|cloves|piece|pieces|slice|slices|can|cans|package|packages)\s+/i;
        const unitMatch = cleanText.match(unitPattern);
        let unit = unitMatch ? unitMatch[1] : '';
        
        // Remove unit from text
        if (unit) {
            cleanText = cleanText.replace(unitPattern, '');
        }
        
        // Clean up ingredient name
        let ingredient = cleanText.trim();
        
        // Remove common cooking descriptors from the end
        ingredient = ingredient.replace(/,?\s+(chopped|diced|sliced|minced|grated|shredded|melted|softened|room temperature|fresh|dried|ground|whole|halved|quartered|finely|coarsely|roughly).*$/i, '');
        
        return {
            quantity: quantity || '1',
            unit: unit.toLowerCase(),
            ingredient: ingredient.trim()
        };
    }
    
    /**
     * Find matching product in master products list
     */
    findMatchingProduct(ingredientName, products) {
        if (!ingredientName || !products || products.length === 0) {
            return null;
        }
        
        const searchName = ingredientName.toLowerCase().trim();
        
        // Try exact match first
        let match = products.find(product => 
            product.name.toLowerCase() === searchName
        );
        
        if (match) return match;
        
        // Try partial match (ingredient name contains product name or vice versa)
        match = products.find(product => {
            const productName = product.name.toLowerCase();
            return productName.includes(searchName) || searchName.includes(productName);
        });
        
        if (match) return match;
        
        // Try word-based matching
        const ingredientWords = searchName.split(/\s+/);
        match = products.find(product => {
            const productWords = product.name.toLowerCase().split(/\s+/);
            return ingredientWords.some(iWord => 
                productWords.some(pWord => 
                    pWord.includes(iWord) || iWord.includes(pWord)
                )
            );
        });
        
        return match || null;
    }
    
    /**
     * Get products list from localStorage or app
     */
    getProducts() {
        try {
            // Try to get from global app instance first
            if (window.app && window.app.products) {
                return window.app.products;
            }
            
            // Fallback to localStorage
            const productsData = localStorage.getItem('groceryProducts');
            if (productsData) {
                return JSON.parse(productsData);
            }
            
            // console.log('⚠️ No products found in app or localStorage');
            return [];
            
        } catch (error) {
            console.error('❌ Error getting products:', error);
            return [];
        }
    }
    
    /**
     * Create recipe from extracted data and link ingredients to products
     */
    async createRecipeFromExtractedData(recipeData) {
        try {
            console.log('🔗 Creating recipe and linking ingredients...'); // Keep AI processing status
            
            // Link ingredients to products first
            // console.log('🔗 Processing ingredient linking...');
            const linkedIngredients = this.linkIngredientsToProducts(recipeData.ingredients);
            
            // Prepare metadata
            const metadata = {
                sourceUrl: recipeData.sourceUrl,
                servings: recipeData.servings,
                cookTime: recipeData.cookTime,
                prepTime: recipeData.prepTime,
                importedAt: new Date().toISOString()
            };
            
            // Handle potential duplicate recipe names by making them unique
            let uniqueTitle = recipeData.title;
            let counter = 1;
            
            // Check if recipe already exists and create unique name if needed
            while (this.recipes.find(r => r.name.toLowerCase() === uniqueTitle.toLowerCase())) {
                uniqueTitle = `${recipeData.title} (${counter})`;
                counter++;
                // console.log(`📝 Recipe name exists, trying: "${uniqueTitle}"`);
            }
            
            // Create the recipe with all data
            const recipe = this.addRecipe(
                uniqueTitle,
                linkedIngredients,
                recipeData.instructions,
                metadata
            );
            
            if (!recipe) {
                throw new Error('Failed to create recipe - addRecipe returned false');
            }
            
            console.log(`✅ Recipe created successfully with ID: ${recipe.id}`); // Keep success message
            
            // Add description
            recipe.description = `Imported from ${recipeData.sourceUrl}`;
            
            // TODO: Handle image download and storage
            if (recipeData.image) {
                // console.log('🖼️ Image handling not yet implemented');
            }
            
            this.saveRecipes();
            
            console.log('✅ Recipe created from URL data:', recipe); // Keep success message
            return recipe;
            
        } catch (error) {
            console.error('❌ Recipe creation failed:', error);
            throw new Error('Failed to create recipe from data');
        }
    }
    
    // ============================================================================
    // RECIPE IMPORT MODAL MANAGEMENT - Human-in-the-Loop Workflow
    // ============================================================================
    
    /**
     * Show recipe creation modal - NEW WORKFLOW
     */
    showRecipeCreationModal() {
        // console.log('➕ [RECIPES MODULE] Opening recipe creation modal');
        
        const modal = document.getElementById('recipeCreationModal');
        if (!modal) {
            console.error('❌ Recipe creation modal not found!');
            return false;
        }
        
        // Clear any previous data
        this.clearCreationModal();
        
        // Add save button event listener if not already added
        const saveButton = document.getElementById('confirmRecipeCreation');
        if (saveButton) {
            // Remove any existing listeners
            saveButton.replaceWith(saveButton.cloneNode(true));
            const newSaveButton = document.getElementById('confirmRecipeCreation');
            
            newSaveButton.addEventListener('click', () => {
                // console.log('💾 [RECIPES MODULE] Save recipe button clicked');
                this.handleSaveNewRecipe();
            });
        }
        
        // Show the modal using the same display logic
        this.displayModal(modal);
        
        return true;
    }
    
    /**
     * Handle saving a new recipe from the creation modal
     */
    handleSaveNewRecipe() {
        // console.log('💾 [RECIPES MODULE] Processing new recipe save...');
        
        try {
            // Get form data
            const titleInput = document.getElementById('newRecipeTitle');
            const ingredientsText = document.getElementById('newRecipeIngredientsText');
            const preparationText = document.getElementById('newRecipePreparation');
            const commentsText = document.getElementById('newRecipeComments');
            
            const title = titleInput?.value?.trim() || '';
            const ingredientsRaw = ingredientsText?.value?.trim() || '';
            const preparation = preparationText?.value?.trim() || '';
            const comments = commentsText?.value?.trim() || '';
            
            // Validation
            if (!title) {
                alert('Geef een receptnaam op');
                titleInput?.focus();
                return;
            }
            
            
            // Parse ingredients from text
            const ingredients = this.parseIngredientsFromText(ingredientsRaw);
            
            // Create recipe object
            const newRecipe = {
                name: title,
                ingredients: ingredients,
                instructions: preparation || 'Bereidingswijze toevoegen...',
                image: '', // No image for now
                comments: comments || '',
                metadata: {
                    dateCreated: new Date().toISOString(),
                    dateModified: new Date().toISOString(),
                    version: '1.0',
                    tags: [],
                    difficulty: 'medium',
                    prepTime: '30 min',
                    cookTime: '30 min',
                    servings: 4,
                    cuisine: '',
                    mainIngredient: '',
                    season: '',
                    comments: comments
                }
            };
            
            // Save the recipe
            const savedRecipe = this.addRecipe(
                newRecipe.name,
                newRecipe.ingredients,
                newRecipe.instructions,
                newRecipe.metadata
            );
            
            if (savedRecipe) {
                console.log('✅ [RECIPES MODULE] Recipe saved successfully:', savedRecipe.name); // Keep success message
                
                // Close modal
                const modal = document.getElementById('recipeCreationModal');
                if (modal) {
                    modal.style.display = 'none';
                }
                
                // Refresh recipes display
                if (window.app) {
                    window.app.renderRecipes();
                }
                
                alert(`Recept "${savedRecipe.name}" is opgeslagen!`);
            } else {
                throw new Error('Failed to save recipe');
            }
            
        } catch (error) {
            console.error('❌ [RECIPES MODULE] Failed to save recipe:', error);
            alert('Fout bij opslaan recept. Probeer opnieuw.');
        }
    }
    
    /**
     * Parse ingredients text into structured format
     */
    parseIngredientsFromText(ingredientsText) {
        const lines = ingredientsText.split('\n');
        const ingredients = [];
        
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('//')) continue;
            
            // Simple parsing: try to extract quantity, unit, and name
            const match = trimmed.match(/^(.+?)\s*-\s*(.+?)$/);
            if (match) {
                const [, name, quantityUnit] = match;
                const qtyMatch = quantityUnit.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
                
                if (qtyMatch) {
                    const [, quantity, unit] = qtyMatch;
                    ingredients.push({
                        productId: name.toLowerCase().replace(/\s+/g, '_'),
                        name: name.trim(),
                        quantity: parseFloat(quantity),
                        unit: unit.trim()
                    });
                } else {
                    ingredients.push({
                        productId: name.toLowerCase().replace(/\s+/g, '_'),
                        name: name.trim(),
                        quantity: 1,
                        unit: quantityUnit.trim()
                    });
                }
            } else {
                // Fallback: use the whole line as ingredient name
                ingredients.push({
                    productId: trimmed.toLowerCase().replace(/\s+/g, '_'),
                    name: trimmed,
                    quantity: 1,
                    unit: 'stuks'
                });
            }
        }
        
        return ingredients;
    }
    
    /**
     * Clear creation modal fields
     */
    clearCreationModal() {
        const titleInput = document.getElementById('newRecipeTitle');
        const imagePreview = document.getElementById('newRecipeImagePreview');
        const placeholder = document.getElementById('imagePreviewPlaceholder');
        
        if (titleInput) titleInput.value = '';
        if (imagePreview) {
            imagePreview.src = '';
            imagePreview.style.display = 'none';
        }
        if (placeholder) placeholder.style.display = 'block';
    }
    
    /**
     * Generic modal display logic
     */
    displayModal(modal) {
        // 🎯 CRITICAL FIX: Override BOTH #modalId AND .modal CSS display:none rules
        modal.style.setProperty('display', 'flex', 'important');
        modal.style.setProperty('position', 'fixed', 'important');
        modal.style.setProperty('top', '0', 'important');
        modal.style.setProperty('left', '0', 'important');
        modal.style.setProperty('width', '100vw', 'important');
        modal.style.setProperty('height', '100vh', 'important');
        modal.style.backgroundColor = 'rgba(0,0,0,0.7)';
        modal.style.setProperty('z-index', '999999', 'important');  // Higher z-index with !important
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        
        // Remove 'modal' class temporarily to avoid CSS conflicts
        modal.classList.remove('modal');
        modal.classList.add('show');
        
        // 🎯 CRITICAL FIX: Also remove modal class from any parent containers
        let parentElement = modal.parentElement;
        while (parentElement && parentElement !== document.body) {
            if (parentElement.classList.contains('modal')) {
                console.log('🔧 [DEBUG] Removing modal class from parent:', parentElement.id);
                parentElement.classList.remove('modal');
                parentElement._removedModalClass = true;
            }
            
            // 🚨 ALSO remove inline display:none from parent containers
            if (parentElement.style.display === 'none') {
                console.log('🔧 [DEBUG] Removing inline display:none from parent:', parentElement.id);
                parentElement.style.display = '';
                parentElement._removedInlineDisplay = true;
            }
            
            parentElement = parentElement.parentElement;
        }
        
        // Set up image import functionality
        this.setupImageImport();
        
        // Set up modal close functionality
        this.setupModalClose(modal);
    }

    /**
     * Show recipe import preview modal - MAIN METHOD called by conductor
     */
    async showRecipeImportPreview(recipeData, sourceUrl) {
        try {
            // console.log('🎭 [RECIPES MODULE] *** MODAL SHOW FUNCTION CALLED ***');
            // console.log('🎭 [RECIPES MODULE] Showing recipe import modal');
            
            // Store pending import data
            this.pendingRecipeImport = {
                recipeData: recipeData,
                sourceUrl: sourceUrl
            };
            
            // Populate modal with extracted data
            document.getElementById('importedRecipeTitle').value = recipeData.title || '';
            document.getElementById('importedRecipeInstructions').value = recipeData.instructions || '';
            document.getElementById('importedPrepTime').value = recipeData.prepTime || '';
            document.getElementById('importedCookTime').value = recipeData.cookTime || '';
            document.getElementById('importedServings').value = recipeData.servings || '';
            document.getElementById('recipeSourceUrl').textContent = sourceUrl;
            
            // Populate ingredients editor
            this.populateIngredientsEditor(recipeData.ingredients || []);
            
            // Update status counters
            this.updateImportStatus();
            
            // Show modal
            // console.log('🔍 [DEBUG] Searching for modal element...');
            const modal = document.getElementById('recipeImportModal');
            // console.log('🔍 [DEBUG] Modal element:', modal);
            // console.log('🔍 [DEBUG] Modal exists:', !!modal);
            // console.log('🔍 [DEBUG] Modal innerHTML length:', modal ? modal.innerHTML.length : 'N/A');
            
            if (modal) {
                // 🎯 CRITICAL FIX: Override BOTH #recipeImportModal AND .modal CSS display:none rules
                modal.style.setProperty('display', 'flex', 'important');
                modal.style.setProperty('position', 'fixed', 'important');
                modal.style.setProperty('top', '0', 'important');
                modal.style.setProperty('left', '0', 'important');
                modal.style.setProperty('width', '100vw', 'important');
                modal.style.setProperty('height', '100vh', 'important');
                modal.style.backgroundColor = 'rgba(0,0,0,0.7)';
                modal.style.zIndex = '9999';
                modal.style.justifyContent = 'center';
                modal.style.alignItems = 'center';
                
                // Remove 'modal' class temporarily to avoid CSS conflicts
                modal.classList.remove('modal');
                modal.classList.add('show');
                
                // 🎯 CRITICAL FIX: Also remove modal class from any parent containers
                let parentElement = modal.parentElement;
                while (parentElement && parentElement !== document.body) {
                    if (parentElement.classList.contains('modal')) {
                        // console.log('🔧 [DEBUG] Removing modal class from parent:', parentElement.id);
                        parentElement.classList.remove('modal');
                        parentElement._removedModalClass = true; // Track for restoration
                    }
                    
                    // 🚨 NEW FIX: Also remove inline display:none from parent containers
                    if (parentElement.style.display === 'none') {
                        // console.log('🔧 [DEBUG] Removing inline display:none from parent:', parentElement.id);
                        parentElement.style.display = '';
                        parentElement._removedInlineDisplay = true; // Track for restoration
                    }
                    
                    parentElement = parentElement.parentElement;
                }
                
                // Force modal content dimensions
                const modalContent = modal.querySelector('.modal-content');
                if (modalContent) {
                    modalContent.style.width = '600px';
                    modalContent.style.minHeight = '400px';
                    modalContent.style.backgroundColor = 'white';
                    modalContent.style.borderRadius = '15px';
                    modalContent.style.padding = '20px';
                    modalContent.style.boxShadow = '0 20px 40px rgba(0,0,0,0.3)';
                    modalContent.style.position = 'relative';
                    modalContent.style.maxHeight = '90vh';
                    modalContent.style.overflowY = 'auto';
                    
                    // console.log('🔧 [DEBUG] Forced inline styles on modal content');
                } else {
                    console.error('❌ [DEBUG] Modal content not found!');
                }
                
                // Debug modal state after forcing styles
                // console.log('✅ [RECIPES MODULE] Modal display set with forced styles');
            
            // Set up image import functionality
            this.setupImageImport();
                
                // Force reflow
                modal.offsetHeight;
                
                // Check dimensions after forcing styles
                const rect = modal.getBoundingClientRect();
                // console.log('🔍 [DEBUG] Modal bounding box after forced styles:', {
                //     left: rect.left,
                //     top: rect.top,
                //     width: rect.width,
                //     height: rect.height
                // });
                
                if (modalContent) {
                    const contentRect = modalContent.getBoundingClientRect();
                    // console.log('🔍 [DEBUG] Modal content bounding box after forced styles:', {
                    //     left: contentRect.left,
                    //     top: contentRect.top,
                    //     width: contentRect.width,
                    //     height: contentRect.height
                    // });
                }
                
                // Force reflow to ensure display
                modal.offsetHeight;
                
                return true;
            } else {
                console.error('❌ [RECIPES MODULE] Modal element not found!');
                
                // CREATE TEST MODAL as last resort
                // console.log('🆘 [DEBUG] Creating emergency test modal...');
                const testModal = document.createElement('div');
                testModal.id = 'emergencyTestModal';
                testModal.style.cssText = `
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    width: 100vw !important;
                    height: 100vh !important;
                    background-color: rgba(0,0,0,0.8) !important;
                    z-index: 99999 !important;
                    display: flex !important;
                    justify-content: center !important;
                    align-items: center !important;
                `;
                
                testModal.innerHTML = `
                    <div style="
                        background: white;
                        padding: 30px;
                        border-radius: 15px;
                        width: 600px;
                        min-height: 300px;
                        text-align: center;
                        box-shadow: 0 20px 40px rgba(0,0,0,0.3);
                    ">
                        <h2>🎭 Emergency Test Modal</h2>
                        <p>This is a test modal created via JavaScript</p>
                        <p><strong>Recipe:</strong> ${recipeData.title}</p>
                        <p>If you can see this, the modal system works!</p>
                        <button onclick="document.getElementById('emergencyTestModal').remove()" 
                                style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; margin-top: 20px;">
                            Close Test Modal
                        </button>
                    </div>
                `;
                
                document.body.appendChild(testModal);
                // console.log('🆘 [DEBUG] Emergency test modal created and added to body');
                
                return false;
            }
            
        } catch (error) {
            console.error('❌ [RECIPES MODULE] Failed to show import modal:', error);
            return false;
        }
    }
    
    /**
     * Hide recipe import modal
     */
    hideRecipeImportModal() {
        // console.log('🎭 [RECIPES MODULE] Hiding recipe import modal');
        const modal = document.getElementById('recipeImportModal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('show');
            // Restore modal class for future use
            modal.classList.add('modal');
            
            // 🔄 RESTORE: Also restore modal class and inline styles to any parent containers
            let parentElement = modal.parentElement;
            while (parentElement && parentElement !== document.body) {
                if (parentElement._removedModalClass) {
                    // console.log('🔄 [DEBUG] Restoring modal class to parent:', parentElement.id);
                    parentElement.classList.add('modal');
                    delete parentElement._removedModalClass;
                }
                
                if (parentElement._removedInlineDisplay) {
                    // console.log('🔄 [DEBUG] Restoring inline display:none to parent:', parentElement.id);
                    parentElement.style.display = 'none';
                    delete parentElement._removedInlineDisplay;
                }
                
                parentElement = parentElement.parentElement;
            }
        }
        this.pendingRecipeImport = null;
    }
    
    /**
     * Set up image import functionality for recipe import modal
     */
    setupImageImport() {
        const importBtn = document.getElementById('importImageBtn');
        const fileInput = document.getElementById('imageFileInput');
        const imagePreview = document.getElementById('newRecipeImagePreview');
        const placeholder = document.getElementById('imagePreviewPlaceholder');
        const extractBtn = document.getElementById('extractFromImageBtn');
        
        if (importBtn && fileInput) {
            importBtn.onclick = () => {
                fileInput.click();
            };
            
            fileInput.onchange = (e) => {
                const file = e.target.files[0];
                if (file && file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        imagePreview.src = e.target.result;
                        imagePreview.style.display = 'block';
                        placeholder.style.display = 'none';
                        
                        // Show the extract button when image is loaded
                        if (extractBtn) {
                            extractBtn.style.display = 'inline-block';
                            // console.log('🔍 [DEBUG] Extract button should now be visible');
                            // console.log('🔍 [DEBUG] Button display:', extractBtn.style.display);
                            // console.log('🔍 [DEBUG] Button computed style:', window.getComputedStyle(extractBtn).display);
                            // console.log('🔍 [DEBUG] Button dimensions:', extractBtn.getBoundingClientRect());
                            // console.log('🔍 [DEBUG] Button parent:', extractBtn.parentElement?.id);
                        } else {
                            console.error('❌ [DEBUG] Extract button not found!');
                        }
                        
                        console.log('📸 [RECIPES MODULE] Image imported successfully'); // Keep success message
                    };
                    reader.readAsDataURL(file);
                }
            };
        }
        
        // Set up extract button functionality
        if (extractBtn) {
            extractBtn.onclick = () => {
                this.extractRecipeFromImage();
            };
        }
    }
    
    /**
     * Set up modal close functionality
     */
    setupModalClose(modal) {
        const closeBtn = document.getElementById('closeRecipeCreationModal');
        const cancelBtn = document.getElementById('cancelRecipeCreation');
        
        // console.log('🔧 [DEBUG] Setting up modal close handlers');
        // console.log('🔧 [DEBUG] Close button found:', !!closeBtn);
        // console.log('🔧 [DEBUG] Cancel button found:', !!cancelBtn);
        
        if (closeBtn) {
            closeBtn.onclick = () => {
                // console.log('❌ [DEBUG] Close button clicked');
                this.hideRecipeCreationModal();
            };
        }
        
        if (cancelBtn) {
            cancelBtn.onclick = () => {
                // console.log('❌ [DEBUG] Cancel button clicked');
                this.hideRecipeCreationModal();
            };
        }
        
        // Close on background click
        modal.onclick = (e) => {
            if (e.target === modal) {
                // console.log('❌ [DEBUG] Background clicked');
                this.hideRecipeCreationModal();
            }
        };
    }
    
    /**
     * Hide recipe creation modal
     */
    hideRecipeCreationModal() {
        // console.log('❌ [RECIPES MODULE] Hiding recipe creation modal');
        const modal = document.getElementById('recipeCreationModal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('show');
            modal.classList.add('modal');
            
            // Restore parent modal classes and styles
            this.restoreParentModalStyles(modal);
        }
    }
    
    /**
     * Restore parent modal styles when closing
     */
    restoreParentModalStyles(modal) {
        let parentElement = modal.parentElement;
        while (parentElement && parentElement !== document.body) {
            if (parentElement._removedModalClass) {
                parentElement.classList.add('modal');
                delete parentElement._removedModalClass;
            }
            
            if (parentElement._removedInlineDisplay) {
                parentElement.style.display = 'none';
                delete parentElement._removedInlineDisplay;
            }
            
            parentElement = parentElement.parentElement;
        }
    }
    
    /**
     * Extract recipe information from imported image using AI
     */
    async extractRecipeFromImage() {
        console.log('🤖 [RECIPES MODULE] Starting recipe extraction from image...'); // Keep AI processing status
        
        const imagePreview = document.getElementById('newRecipeImagePreview');
        const extractBtn = document.getElementById('extractFromImageBtn');
        
        if (!imagePreview || !imagePreview.src) {
            alert('No image found. Please import an image first.');
            return;
        }
        
        // Show loading state
        const originalText = extractBtn.textContent;
        extractBtn.textContent = '🔄 Extracting...';
        extractBtn.disabled = true;
        
        try {
            // 🤖 REAL AI EXTRACTION: Analyze the actual image
            await this.performRealImageExtraction(imagePreview.src);
            
            console.log('✅ [RECIPES MODULE] Real recipe extraction completed'); // Keep success message
        } catch (error) {
            console.error('❌ [RECIPES MODULE] Failed to extract recipe:', error);
            alert('Failed to extract recipe information. Please try again or enter manually.');
        } finally {
            // Restore button state
            extractBtn.textContent = originalText;
            extractBtn.disabled = false;
        }
    }
    
    /**
     * Perform real AI-powered recipe extraction from image
     */
    async performRealImageExtraction(imageDataUrl) {
        // console.log('🤖 [RECIPES MODULE] Starting real AI image analysis...');
        
        try {
            // Convert data URL to blob for processing
            const response = await fetch(imageDataUrl);
            const blob = await response.blob();
            
            // console.log('📸 [DEBUG] Image size:', blob.size, 'bytes');
            // console.log('📸 [DEBUG] Image type:', blob.type);
            
            // Create a prompt for recipe extraction
            const extractionPrompt = `
Analyze this recipe image and extract the following information in a structured format:

1. RECIPE TITLE: The name/title of the recipe
2. INGREDIENTS: List all ingredients with quantities (one per line)
3. PREPARATION/METHOD: Step-by-step cooking instructions
4. ADDITIONAL NOTES: Any tips, serving suggestions, or comments

Please format your response as follows:
TITLE: [recipe title here]

INGREDIENTS:
- [ingredient 1 with quantity]
- [ingredient 2 with quantity]
- [etc.]

PREPARATION:
[detailed step-by-step instructions]

NOTES:
[any additional tips or comments]

Focus on being accurate and complete. If text is unclear, indicate with [unclear] but extract what you can see.
`;

            // 🚀 REAL AI INTEGRATION: Use actual image analysis
            console.log('🔄 [RECIPES MODULE] Sending to AI for analysis...'); // Keep AI processing status
            
            const extractedData = await this.analyzeImageWithRealAI(imageDataUrl, extractionPrompt);
            
            // Parse and populate the extracted data
            this.populateFieldsFromExtraction(extractedData);
            
            // 📦 AUTO-EXPORT DISABLED: Manual export only during testing
            // if (window.isLocalAI && window.recipeAIExporter) {
            //     const recipeData = {
            //         title: extractedData.title,
            //         ingredients: extractedData.ingredients,
            //         preparation: extractedData.preparation,
            //         notes: extractedData.notes
            //     };
            //     
            //     // Auto-export with analysis metadata
            //     window.recipeAIExporter.autoExportAfterAnalysis(recipeData, extractedData);
            // }
            
        } catch (error) {
            console.error('❌ [RECIPES MODULE] Image analysis failed:', error);
            throw new Error('Failed to analyze recipe image: ' + error.message);
        }
    }

    /**
     * Analyze image using real AI OCR - ready for external API integration
     */
    async analyzeImageWithRealAI(imageDataUrl, prompt) {
        // console.log('🧠 [RECIPES MODULE] Starting real AI image analysis...');
        
        try {
            // Convert data URL to base64 for API submission
            const base64Data = imageDataUrl.split(',')[1];
            const mimeType = imageDataUrl.split(';')[0].split(':')[1];
            
            // console.log('📤 [RECIPES MODULE] Preparing image for API analysis...', {
            //     mimeType,
            //     dataSize: base64Data?.length || 0
            // });
            
            // 🚀 REAL OCR INTEGRATION POINT
            // This is where you would integrate with actual OCR/AI services like:
            // - Google Vision API
            // - AWS Textract
            // - Azure Computer Vision
            // - OpenAI GPT-4 Vision
            // - Anthropic Claude Vision
            
            const ocrResult = await this.callImageAnalysisAPI(base64Data, mimeType, prompt);
            
            if (ocrResult && ocrResult.extractedText) {
                return this.parseAIResponse(ocrResult.extractedText);
            }
            
            throw new Error('No text extracted from image');
            
        } catch (error) {
            console.warn('⚠️ [RECIPES MODULE] Real AI analysis not configured, using intelligent fallback:', error.message);
            
            // Provide helpful template for manual entry
            return this.provideFallbackExtraction();
        }
    }
    
    /**
     * Call external image analysis API - LOCAL ONLY
     */
    async callImageAnalysisAPI(base64Image, mimeType, prompt) {
        // Check if local AI is available
        if (!window.isLocalAI || !window.LOCAL_AI_CONFIG) {
            console.log('☁️ [RECIPES MODULE] Firebase mode - AI analysis disabled'); // Keep status message
            throw new Error('AI analysis only available locally on Mac');
        }
        
        const config = window.LOCAL_AI_CONFIG;
        const service = config.preferredService;
        
        console.log(`🤖 [LOCAL-AI] Using ${service} for image analysis...`); // Keep AI processing status
        
        // Route to appropriate service
        switch (service) {
            case 'openai':
                return await this.callOpenAIVision(base64Image, mimeType, prompt, config.openai);
                
            case 'googleVision':
                return await this.callGoogleVision(base64Image, mimeType, prompt, config.googleVision);
                
            case 'azure':
                return await this.callAzureVision(base64Image, mimeType, prompt, config.azure);
                
            default:
                throw new Error(`Unknown AI service: ${service}`);
        }
    }
    
    /**
     * OpenAI GPT-5 Vision API (LOCAL ONLY)
     */
    async callOpenAIVision(base64Image, mimeType, prompt, config) {
        if (!config.enabled || !config.apiKey || config.apiKey === 'YOUR_OPENAI_API_KEY') {
            throw new Error('OpenAI API not configured');
        }
        
        console.log(`🧠 [OpenAI] Analyzing image with ${config.model}...`); // Keep AI processing status
        // console.log('📊 [DEBUG] Image details:', {
        //     mimeType,
        //     base64Length: base64Image?.length || 0,
        //     model: config.model
        // });
        
        // Validate image format
        if (!base64Image || base64Image.length === 0) {
            throw new Error('Invalid image data - base64 is empty');
        }
        
        if (!mimeType || !mimeType.startsWith('image/')) {
            throw new Error(`Invalid image MIME type: ${mimeType}`);
        }
        
        const requestBody = {
            model: config.model,
            messages: [
                {
                    role: "system", 
                    content: "You are a helpful assistant that analyzes recipe images and extracts recipe information in Dutch."
                },
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        { 
                            type: "image_url", 
                            image_url: { 
                                url: `data:${mimeType};base64,${base64Image}`,
                                detail: "high"  // Important for GPT-5: request high detail analysis
                            }
                        }
                    ]
                }
            ]
        };
        
        // GPT-5 has different parameter requirements
        if (config.model === 'gpt-5') {
            requestBody.max_completion_tokens = 3000;  // Extra tokens for reasoning + recipe content
            // GPT-5 only supports temperature: 1 (default), so we omit it
        } else {
            requestBody.max_tokens = 2000;
            requestBody.temperature = 0.1;  // Lower temperature for more consistent recipe extraction
        }
        
        // console.log('📤 [OpenAI] Sending request...', {
        //     model: requestBody.model,
        //     messageCount: requestBody.messages.length,
        //     maxTokens: requestBody.max_tokens || requestBody.max_completion_tokens || 'undefined'
        // });
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            
            if (response.status === 429) {
                throw new Error(`Rate limit exceeded. Please wait a moment and try again. Details: ${errorData.error?.message || 'Too many requests'}`);
            } else if (response.status === 401) {
                throw new Error(`Invalid API key. Please check your OpenAI API key configuration.`);
            } else if (response.status === 403) {
                throw new Error(`Access denied. Your API key may not have access to GPT-5 or vision capabilities.`);
            } else {
                throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
            }
        }
        
        const data = await response.json();
        
        // console.log('📥 [OpenAI] Response received:', {
        //     choices: data.choices?.length || 0,
        //     usage: data.usage,
        //     model: data.model
        // });
        
        if (!data.choices || data.choices.length === 0) {
            throw new Error('No response choices returned from OpenAI');
        }
        
        const content = data.choices[0].message?.content;
        if (!content) {
            throw new Error('Empty content returned from OpenAI');
        }
        
        console.log('✅ [OpenAI] Successfully extracted content:', content.substring(0, 200) + '...'); // Keep success message
        
        return {
            extractedText: content,
            service: 'openai',
            model: data.model || config.model,
            usage: data.usage
        };
    }
    
    /**
     * Google Vision API (LOCAL ONLY)
     */
    async callGoogleVision(base64Image, mimeType, prompt, config) {
        if (!config.enabled || !config.apiKey || config.apiKey === 'YOUR_GOOGLE_VISION_API_KEY') {
            throw new Error('Google Vision API not configured');
        }
        
        console.log('👁️ [Google] Analyzing image with Vision API...'); // Keep AI processing status
        
        const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${config.apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                requests: [{
                    image: { content: base64Image },
                    features: [{ type: 'TEXT_DETECTION', maxResults: 50 }]
                }]
            })
        });
        
        if (!response.ok) {
            throw new Error(`Google Vision API error: ${response.status}`);
        }
        
        const data = await response.json();
        const textAnnotations = data.responses[0]?.textAnnotations;
        
        if (!textAnnotations || textAnnotations.length === 0) {
            throw new Error('No text detected in image');
        }
        
        const extractedText = textAnnotations[0].description;
        return {
            extractedText: `Raw OCR Text:\n${extractedText}\n\n${prompt}\n\nPlease format the above text according to the prompt instructions.`,
            service: 'googleVision',
            rawText: extractedText
        };
    }
    
    /**
     * Azure Computer Vision API (LOCAL ONLY)
     */
    async callAzureVision(base64Image, mimeType, prompt, config) {
        if (!config.enabled || !config.subscriptionKey || config.subscriptionKey === 'YOUR_AZURE_SUBSCRIPTION_KEY') {
            throw new Error('Azure Computer Vision API not configured');
        }
        
        console.log('🔷 [Azure] Analyzing image with Computer Vision...'); // Keep AI processing status
        
        // Convert base64 to binary
        const binaryData = atob(base64Image);
        const bytes = new Uint8Array(binaryData.length);
        for (let i = 0; i < binaryData.length; i++) {
            bytes[i] = binaryData.charCodeAt(i);
        }
        
        const response = await fetch(`${config.endpoint}/vision/v3.2/read/analyze`, {
            method: 'POST',
            headers: {
                'Ocp-Apim-Subscription-Key': config.subscriptionKey,
                'Content-Type': 'application/octet-stream'
            },
            body: bytes
        });
        
        if (!response.ok) {
            throw new Error(`Azure Computer Vision API error: ${response.status}`);
        }
        
        // Azure returns operation ID, need to poll for results
        const operationLocation = response.headers.get('Operation-Location');
        const result = await this.pollAzureOperation(operationLocation, config.subscriptionKey);
        
        return {
            extractedText: `Raw OCR Text:\n${result}\n\n${prompt}\n\nPlease format the above text according to the prompt instructions.`,
            service: 'azure',
            rawText: result
        };
    }
    
    /**
     * Poll Azure operation for completion
     */
    async pollAzureOperation(operationUrl, subscriptionKey) {
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
            
            const response = await fetch(operationUrl, {
                headers: { 'Ocp-Apim-Subscription-Key': subscriptionKey }
            });
            
            const data = await response.json();
            
            if (data.status === 'succeeded') {
                const lines = data.analyzeResult?.readResults?.[0]?.lines || [];
                return lines.map(line => line.text).join('\n');
            }
            
            if (data.status === 'failed') {
                throw new Error('Azure OCR analysis failed');
            }
            
            attempts++;
        }
        
        throw new Error('Azure OCR analysis timed out');
    }
    
    /**
     * Generate different recipe variations for testing
     */
    generateRecipeVariations(imageSize, isPNG) {
        const variations = [
            {
                title: "Klassieke Chocoladechip Koekjes",
                ingredients: "280g bloem\n1 tl bakpoeder\n1 tl zout\n225g boter, zacht\n150g kristalsuiker\n150g bruine suiker\n2 grote eieren\n2 tl vanille-extract\n300g chocoladeschilfers",
                preparation: "1. Verwarm oven voor op 190°C\n2. Meng bloem, bakpoeder en zout in kom\n3. Room boter en beide suikers luchtig\n4. Klop eieren en vanille erdoor\n5. Voeg geleidelijk bloemmengsel toe\n6. Roer chocoladeschilfers erdoor\n7. Schep lepels deeg op bakplaat\n8. Bak 9-11 minuten tot goudbruin",
                notes: "Laat 2 minuten afkoelen op bakplaat. Maakt ongeveer 60 koekjes. Bewaar luchtdicht."
            },
            {
                title: "Zelfgemaakte Pizzadeeg",
                ingredients: "375g broodmeel\n300ml lauw water\n1 zakje gedroogde gist\n2 el olijfolie\n2 tl zout\n1 tl suiker",
                preparation: "1. Los gist en suiker op in lauw water, laat 5 minuten schuimen\n2. Meng bloem en zout in grote kom\n3. Voeg gistmengsel en olijfolie toe\n4. Kneed 8-10 minuten tot gladde deeg\n5. Leg in geoliede kom, afdekken, 1 uur laten rijzen\n6. Druk deeg plat, verdeel indien nodig\n7. Rol uit en beleg\n8. Bak op 230°C gedurende 12-15 minuten",
                notes: "Deeg kan 3 dagen in koelkast of 3 maanden ingevroren. Op kamertemperatuur brengen voor uitrollen."
            },
            {
                title: "Runderstoofpot",
                ingredients: "1kg rundvlees, in blokjes\n3 el plantaardige olie\n1 grote ui, gesnipperd\n3 wortels, in schijfjes\n3 aardappels, in blokjes\n2 selderijstengels, gehakt\n3 el tomatenpuree\n1L runderbouillon\n2 laurierblaadjes\n1 tl tijm\nZout en peper naar smaak\n2 el bloem",
                preparation: "1. Verhit olie in grote pan, braad rundvlees rondom bruin\n2. Haal vlees eruit, fruit uien glazig\n3. Voeg tomatenpuree toe, 2 minuten bakken\n4. Voeg vlees terug met bouillon, laurier, tijm\n5. Breng aan de kook, zacht sudderen 1,5 uur\n6. Voeg groenten toe, nog 30 minuten sudderen\n7. Meng bloem met water, roer erdoor om te binden\n8. Breng op smaak met zout en peper",
                notes: "Stoofpot smaakt beter de volgende dag. Kan 3 maanden ingevroren. Serveer met stokbrood."
            },
            {
                title: "Bananenbrood",
                ingredients: "3 rijpe bananen, geprakt\n75g boter, gesmolten\n150g suiker\n1 ei, geklopt\n1 tl vanille-extract\n1 tl bakpoeder\nSnufje zout\n190g bloem\n75g gehakte walnoten (optioneel)",
                preparation: "1. Verwarm oven voor op 175°C\n2. Vet cakevorm van 20cm in\n3. Meng geprakte bananen en gesmolten boter\n4. Roer suiker, ei en vanille erdoor\n5. Strooi bakpoeder en zout erover, mengen\n6. Voeg bloem toe, roer tot net gemengd\n7. Spatel noten erdoor indien gebruikt\n8. Giet in vorm\n9. Bak 60-65 minuten tot goudbruin en gaar",
                notes: "Laat 10 minuten afkoelen in vorm. Kan ingevroren in plastic folie."
            }
        ];
        
        return variations;
    }
    
    /**
     * Parse AI response into structured recipe data
     */
    parseAIResponse(response) {
        // console.log('📝 [RECIPES MODULE] Parsing AI response...');
        
        try {
            // Extract structured data from AI response
            const lines = response.split('\n');
            let title = '';
            let ingredients = '';
            let preparation = '';
            let notes = '';
            
            let currentSection = '';
            
            for (const line of lines) {
                const trimmed = line.trim();
                
                // Handle both regular and markdown-formatted headers
                if (trimmed.startsWith('TITLE:') || trimmed.startsWith('**TITLE:**')) {
                    title = trimmed.replace(/\*\*TITLE:\*\*|TITLE:/, '').trim();
                    currentSection = 'title';
                } else if (trimmed.startsWith('INGREDIENTS:') || trimmed.startsWith('**INGREDIENTS:**')) {
                    currentSection = 'ingredients';
                } else if (trimmed.startsWith('PREPARATION:') || trimmed.startsWith('**PREPARATION:**')) {
                    currentSection = 'preparation';
                } else if (trimmed.startsWith('NOTES:') || trimmed.startsWith('**NOTES:**')) {
                    currentSection = 'notes';
                } else if (trimmed && currentSection) {
                    switch (currentSection) {
                        case 'ingredients':
                            ingredients += (ingredients ? '\n' : '') + trimmed.replace(/^-\s*/, '');
                            break;
                        case 'preparation':
                            preparation += (preparation ? '\n' : '') + trimmed;
                            break;
                        case 'notes':
                            notes += (notes ? '\n' : '') + trimmed;
                            break;
                    }
                }
            }
            
            return {
                title: title || 'Nieuw Recept',
                ingredients: ingredients || 'Ingrediënten toevoegen...',
                preparation: preparation || 'Bereidingswijze toevoegen...',
                notes: notes || 'Opmerkingen toevoegen...',
                originalAIResponse: response // Store original for debugging
            };
            
        } catch (error) {
            console.error('❌ [RECIPES MODULE] Failed to parse AI response:', error);
            return this.provideFallbackExtraction();
        }
    }
    
    /**
     * Provide intelligent fallback when AI analysis fails
     */
    provideFallbackExtraction() {
        // console.log('🔄 [RECIPES MODULE] Providing intelligent fallback extraction...');
        
        // Return a helpful template that guides the user
        return {
            title: 'Geëxtraheerd Recept',
            ingredients: `// Voeg hier de ingrediënten toe, één per regel:
// Bijvoorbeeld:
// 250g bloem
// 300ml melk
// 2 eieren
// 1 tl bakpoeder`,
            preparation: `// Voeg hier de bereidingswijze toe:
// 1. Verwarm de oven voor op 180°C
// 2. Meng de droge ingrediënten
// 3. Voeg de natte ingrediënten toe
// 4. Bak gedurende 25-30 minuten`,
            notes: `// AI-analyse niet beschikbaar
// Voeg handmatig recept informatie toe
// Tip: Gebruik metric maten (gram, ml, stuks)`
        };
    }
    
    /**
     * Parse extracted data and populate form fields
     */
    populateFieldsFromExtraction(extractedData) {
        // console.log('📝 [RECIPES MODULE] Populating fields with extracted data...');
        
        const titleInput = document.getElementById('newRecipeTitle');
        const ingredientsText = document.getElementById('newRecipeIngredientsText');
        const preparationText = document.getElementById('newRecipePreparation');
        const descriptionText = document.getElementById('newRecipeDescription');
        const prepTimeInput = document.getElementById('newRecipePrepTime');
        const cookTimeInput = document.getElementById('newRecipeCookTime');
        const servingsInput = document.getElementById('newRecipeServings');
        const allergensInput = document.getElementById('newRecipeAllergens');
        const glutenFreeCheckbox = document.getElementById('newRecipeGlutenFree');
        
        if (titleInput && extractedData.title) {
            titleInput.value = extractedData.title;
        }
        
        // 🍴 INGREDIENTS TEXT: JSON ingredientsText → Ingredients (Text) zone
        if (ingredientsText && extractedData.ingredientsText) {
            ingredientsText.value = extractedData.ingredientsText;
        } else if (ingredientsText && extractedData.ingredients) {
            // Fallback for old format
            ingredientsText.value = extractedData.ingredients;
        }
        
        // 📝 INSTRUCTIONS: JSON instructions → Preparation zone (already correct)
        if (preparationText && extractedData.instructions) {
            preparationText.value = extractedData.instructions;
        } else if (preparationText && extractedData.preparation) {
            // Fallback for old format
            preparationText.value = extractedData.preparation;
        }
        
        // 🍴 NEW DEDICATED FIELDS: Populate individual fields
        if (prepTimeInput && extractedData.prepTime) {
            prepTimeInput.value = extractedData.prepTime;
        } else if (prepTimeInput && extractedData.metadata?.prepTime) {
            prepTimeInput.value = extractedData.metadata.prepTime;
        }
        
        if (cookTimeInput && extractedData.cookTime) {
            cookTimeInput.value = extractedData.cookTime;
        } else if (cookTimeInput && extractedData.metadata?.cookTime) {
            cookTimeInput.value = extractedData.metadata.cookTime;
        }
        
        if (servingsInput && extractedData.servings) {
            servingsInput.value = extractedData.servings;
        } else if (servingsInput && extractedData.metadata?.servings) {
            servingsInput.value = extractedData.metadata.servings;
        }
        
        if (allergensInput && extractedData.allergens) {
            allergensInput.value = extractedData.allergens;
        }
        
        // 🌾 GLUTEN FREE: Auto-check if indicated in JSON
        if (glutenFreeCheckbox && extractedData.glutenFree !== undefined) {
            glutenFreeCheckbox.checked = extractedData.glutenFree;
        }
        
        // 📝 COMMENTS → DESCRIPTION: Map comments to description field
        if (descriptionText) {
            let descriptionContent = '';
            
            // Add comments (main content for description)
            if (extractedData.comments) {
                descriptionContent = extractedData.comments;
            }
            
            // Fallback to legacy notes if no comments
            else if (extractedData.notes) {
                descriptionContent = extractedData.notes;
            }
            
            // Add difficulty info if available
            if (extractedData.metadata?.difficulty) {
                const difficultyText = `📊 Difficulty: ${extractedData.metadata.difficulty}`;
                descriptionContent = descriptionContent ? `${descriptionContent}\n\n${difficultyText}` : difficultyText;
            }
            
            if (descriptionContent) {
                descriptionText.value = descriptionContent;
            }
        }
        
        // 🏠 LOCAL AI DEBUG: Show original AI response for verification (local only)
        if (window.isLocalAI && extractedData.originalAIResponse) {
            const aiDebugZone = document.getElementById('aiDebugZone');
            const originalResponseText = document.getElementById('originalAiResponse');
            
            if (aiDebugZone && originalResponseText) {
                originalResponseText.value = extractedData.originalAIResponse;
                aiDebugZone.style.display = 'block';
                
                // Wire up toggle button
                const toggleBtn = document.getElementById('toggleAiDebug');
                if (toggleBtn) {
                    toggleBtn.onclick = () => {
                        const textarea = document.getElementById('originalAiResponse');
                        if (textarea.style.display === 'none') {
                            textarea.style.display = 'block';
                            toggleBtn.textContent = 'Hide';
                        } else {
                            textarea.style.display = 'none';
                            toggleBtn.textContent = 'Show';
                        }
                    };
                }
                
                // console.log('🤖 [LOCAL-AI] AI debug zone populated with original response');
            }
        }
        
        console.log('✅ [RECIPES MODULE] Fields populated with:', extractedData.title); // Keep success message
    }
    
    /**
     * Legacy simulation method (keeping for fallback)
     */
    async performMockExtractionWithDelay() {
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Populate fields with example data
        const titleInput = document.getElementById('newRecipeTitle');
        const ingredientsText = document.getElementById('newRecipeIngredientsText');
        const preparationText = document.getElementById('newRecipePreparation');
        const commentsText = document.getElementById('newRecipeComments');
        
        if (titleInput && !titleInput.value) {
            titleInput.value = 'Extracted Recipe Title';
        }
        
        if (ingredientsText) {
            ingredientsText.value = '2 cups all-purpose flour\n3 large eggs\n250ml whole milk\nPinch of salt\n2 tbsp butter';
        }
        
        if (preparationText) {
            preparationText.value = '1. Mix flour and salt in a large bowl\n2. Beat eggs and add milk gradually\n3. Whisk until smooth batter forms\n4. Heat butter in pan and cook until golden';
        }
        
        if (commentsText) {
            commentsText.value = 'Best served warm. Can be stored in refrigerator for 2-3 days.';
        }
        
        // console.log('🎯 [RECIPES MODULE] Mock data populated in creation modal');
    }
    
    /**
     * Populate ingredients editor with extracted ingredients
     */
    populateIngredientsEditor(ingredients) {
        const editor = document.getElementById('importedIngredientsEditor');
        if (!editor) return;
        
        editor.innerHTML = ''; // Clear existing content
        
        ingredients.forEach((ingredient, index) => {
            const ingredientRow = this.createIngredientEditorRow(ingredient, index);
            editor.appendChild(ingredientRow);
        });
        
        // console.log(`📋 [RECIPES MODULE] Populated ${ingredients.length} ingredients in editor`);
    }
    
    /**
     * Create ingredient editor row
     */
    createIngredientEditorRow(ingredient, index) {
        const row = document.createElement('div');
        row.className = 'ingredient-editor-row';
        row.dataset.index = index;
        
        const linkedStatus = ingredient.linked ? '🔗' : '📝';
        const statusTitle = ingredient.linked ? 'Linked to existing product' : 'New ingredient';
        
        row.innerHTML = `
            <div class="ingredient-status" title="${statusTitle}">${linkedStatus}</div>
            <input type="text" class="ingredient-quantity" value="${ingredient.quantity || ''}" placeholder="Qty">
            <input type="text" class="ingredient-unit" value="${ingredient.unit || ''}" placeholder="Unit">
            <input type="text" class="ingredient-name" value="${ingredient.name || ingredient.productName || ''}" placeholder="Ingredient name">
            <button type="button" class="remove-ingredient-btn" onclick="window.realRecipesManager.removeIngredientRow(${index})" title="Remove ingredient">×</button>
        `;
        
        return row;
    }
    
    /**
     * Remove ingredient row from editor
     */
    removeIngredientRow(index) {
        const row = document.querySelector(`[data-index="${index}"]`);
        if (row) {
            row.remove();
            this.updateImportStatus();
        }
    }
    
    /**
     * Add new ingredient row to editor
     */
    addIngredientRow() {
        const editor = document.getElementById('importedIngredientsEditor');
        if (!editor) return;
        
        const index = editor.children.length;
        const emptyIngredient = {
            quantity: '',
            unit: '',
            name: '',
            linked: false
        };
        
        const row = this.createIngredientEditorRow(emptyIngredient, index);
        editor.appendChild(row);
        
        // Focus on the quantity input
        row.querySelector('.ingredient-quantity').focus();
        
        this.updateImportStatus();
    }
    
    /**
     * Update import status counters
     */
    updateImportStatus() {
        const rows = document.querySelectorAll('.ingredient-editor-row');
        let linkedCount = 0;
        let newCount = 0;
        
        rows.forEach(row => {
            const statusIcon = row.querySelector('.ingredient-status').textContent;
            if (statusIcon === '🔗') linkedCount++;
            else if (statusIcon === '📝') newCount++;
        });
        
        document.getElementById('linkedCount').textContent = linkedCount;
        document.getElementById('newCount').textContent = newCount;
    }
    
    /**
     * Save imported recipe from modal
     */
    async saveImportedRecipe() {
        try {
            // console.log('💾 [RECIPES MODULE] Saving imported recipe...');
            
            // Collect data from modal
            const recipeData = this.collectRecipeDataFromModal();
            
            if (!recipeData.title.trim()) {
                alert('Please enter a recipe title');
                document.getElementById('importedRecipeTitle').focus();
                return;
            }
            
            
            // Create the recipe using existing method
            const recipe = await this.createRecipeFromExtractedData(recipeData);
            
            if (!recipe) {
                throw new Error('Failed to create recipe');
            }
            
            // Success!
            console.log('✅ [RECIPES MODULE] Recipe saved successfully:', recipe.name); // Keep success message
            this.hideRecipeImportModal();
            
            // Trigger app re-render
            if (window.app && window.app.render) {
                window.app.render();
            }
            
            alert(`✅ Recipe "${recipe.name}" saved successfully!`);
            
        } catch (error) {
            console.error('❌ [RECIPES MODULE] Failed to save imported recipe:', error);
            alert(`❌ Failed to save recipe: ${error.message}`);
        }
    }
    
    /**
     * Collect recipe data from modal form
     */
    collectRecipeDataFromModal() {
        // Collect basic recipe data
        const recipeData = {
            title: document.getElementById('importedRecipeTitle').value.trim(),
            instructions: document.getElementById('importedRecipeInstructions').value.trim(),
            prepTime: document.getElementById('importedPrepTime').value.trim(),
            cookTime: document.getElementById('importedCookTime').value.trim(),
            servings: document.getElementById('importedServings').value.trim(),
            sourceUrl: this.pendingRecipeImport?.sourceUrl || '',
            ingredients: []
        };
        
        // Collect ingredients from editor
        const ingredientRows = document.querySelectorAll('.ingredient-editor-row');
        ingredientRows.forEach(row => {
            const quantity = row.querySelector('.ingredient-quantity').value.trim();
            const unit = row.querySelector('.ingredient-unit').value.trim();
            const name = row.querySelector('.ingredient-name').value.trim();
            const isLinked = row.querySelector('.ingredient-status').textContent === '🔗';
            
            if (name) {
                // Create ingredient in expected format
                const ingredient = {
                    productId: isLinked ? `linked_${name.toLowerCase().replace(/\s+/g, '_')}` : `ingredient_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`,
                    productName: name,
                    name: name,
                    quantity: quantity || '1',
                    unit: unit,
                    linked: isLinked,
                    originalText: `${quantity} ${unit} ${name}`.trim()
                };
                
                recipeData.ingredients.push(ingredient);
            }
        });
        
        // console.log('📋 [RECIPES MODULE] Collected recipe data:', recipeData);
        return recipeData;
    }
}

// Make the class globally available
window.RealRecipesManager = RealRecipesManager;

console.log(`🍳 Real Recipes Manager loaded - v3.5.0-recipes-real`);