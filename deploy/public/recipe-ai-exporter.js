/**
 * Recipe AI Export/Import System
 * 🏠 LOCAL-ONLY for transferring AI-analyzed recipes to Firebase version
 */

class RecipeAIExporter {
    constructor() {
        this.isLocalMode = window.isLocalAI || false;
        console.log(`📦 [AI-EXPORTER] Initialized in ${this.isLocalMode ? 'LOCAL' : 'FIREBASE'} mode`);
    }
    
    /**
     * Export analyzed recipe to JSON for Firebase upload
     */
    exportAnalyzedRecipe(recipe, analysisData = null) {
        if (!this.isLocalMode) {
            console.warn('⚠️ [AI-EXPORTER] Export only available in local mode');
            return null;
        }
        
        const exportData = {
            // Core recipe data
            name: recipe.name || recipe.title,
            ingredients: this.parseIngredientsFromText(recipe.ingredients),
            instructions: recipe.instructions || recipe.preparation,
            image: recipe.image || '',
            
            // Metadata
            metadata: {
                dateCreated: new Date().toISOString(),
                dateModified: new Date().toISOString(),
                version: '1.0',
                source: 'ai-analysis',
                aiService: analysisData?.service || 'unknown',
                aiModel: analysisData?.model || 'unknown',
                difficulty: 'medium',
                prepTime: '30 min',
                cookTime: '30 min',
                servings: 4,
                tags: [],
                cuisine: '',
                mainIngredient: '',
                season: ''
            },
            
            // Comments/notes
            comments: recipe.notes || recipe.comments || '',
            
            // Analysis metadata
            aiAnalysis: {
                extractedAt: new Date().toISOString(),
                service: analysisData?.service,
                model: analysisData?.model,
                rawText: analysisData?.rawText,
                confidence: 'ai-generated'
            }
        };
        
        return exportData;
    }
    
    /**
     * Parse ingredients text into structured format
     */
    parseIngredientsFromText(ingredientsText) {
        if (!ingredientsText) return [];
        
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
     * Download recipe as JSON file
     */
    downloadRecipeJSON(recipe, analysisData = null) {
        const exportData = this.exportAnalyzedRecipe(recipe, analysisData);
        if (!exportData) return;
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai-recipe-${exportData.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        console.log('📥 [AI-EXPORTER] Recipe downloaded:', exportData.name);
    }
    
    /**
     * Upload multiple recipe JSON files
     */
    uploadRecipeJSONFiles() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.multiple = true;
        
        input.onchange = async (e) => {
            const files = Array.from(e.target.files);
            console.log(`📤 [AI-EXPORTER] Processing ${files.length} recipe files...`);
            
            for (const file of files) {
                try {
                    const text = await file.text();
                    const recipeData = JSON.parse(text);
                    
                    // Validate recipe data
                    if (!recipeData.name || !recipeData.ingredients) {
                        console.warn(`⚠️ [AI-EXPORTER] Invalid recipe data in ${file.name}`);
                        continue;
                    }
                    
                    // Add to recipes via the real recipes manager
                    if (window.realRecipesManager) {
                        const created = window.realRecipesManager.addRecipe(
                            recipeData.name,
                            recipeData.ingredients || [],
                            recipeData.instructions || '',
                            recipeData.metadata || {}
                        );
                        if (created) {
                            console.log(`✅ [AI-EXPORTER] Imported: ${recipeData.name}`);
                        }
                    } else {
                        console.warn('⚠️ [AI-EXPORTER] Recipe manager not available');
                    }
                    
                } catch (error) {
                    console.error(`❌ [AI-EXPORTER] Failed to import ${file.name}:`, error);
                }
            }
        };
        
        input.click();
    }
    
    /**
     * Auto-export after AI analysis
     */
    autoExportAfterAnalysis(recipe, analysisData) {
        if (!this.isLocalMode) return;
        
        setTimeout(() => {
            const shouldExport = confirm(
                `Recipe "${recipe.title || recipe.name}" has been analyzed!\n\n` +
                `Would you like to download the JSON file for Firebase upload?`
            );
            
            if (shouldExport) {
                this.downloadRecipeJSON(recipe, analysisData);
            }
        }, 1000);
    }
}

// Initialize global exporter
window.recipeAIExporter = new RecipeAIExporter();

// Add export/import buttons to UI if in local mode
if (window.isLocalAI) {
    document.addEventListener('DOMContentLoaded', () => {
        const recipesSection = document.querySelector('.recipes-section');
        if (recipesSection) {
            const exportControls = document.createElement('div');
            exportControls.className = 'ai-export-controls';
            exportControls.innerHTML = `
                <div style="margin: 10px 0; padding: 10px; border: 2px solid #4CAF50; border-radius: 8px; background: #f0f8f0;">
                    <h4>🏠 Local AI Mode</h4>
                    <button onclick="window.recipeAIExporter.uploadRecipeJSONFiles()" 
                            style="background: #4CAF50; color: white; padding: 8px 16px; border: none; border-radius: 4px; margin-right: 10px;">
                        📤 Import AI Recipes (JSON)
                    </button>
                    <small>Export happens automatically after AI analysis</small>
                </div>
            `;
            recipesSection.insertBefore(exportControls, recipesSection.firstChild);
        }
    });
}