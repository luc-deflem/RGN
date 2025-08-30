/**
 * Extract all products from the application for ChatGPT reference
 * Run this in browser console: copy(getAllProductsAlphabetical())
 */

function getAllProductsAlphabetical() {
    console.log('🔍 Extracting all products for ChatGPT reference...');
    
    let allProducts = [];
    
    // Try multiple sources for products
    if (window.realProductsCategoriesManager && window.realProductsCategoriesManager.getAllProducts) {
        allProducts = window.realProductsCategoriesManager.getAllProducts();
        console.log(`✅ Got ${allProducts.length} products from realProductsCategoriesManager`);
    } else if (window.app && window.app.allProducts) {
        allProducts = window.app.allProducts;
        console.log(`✅ Got ${allProducts.length} products from app.allProducts`);
    } else {
        // Fallback to localStorage
        const saved = localStorage.getItem('allProducts');
        if (saved) {
            allProducts = JSON.parse(saved);
            console.log(`✅ Got ${allProducts.length} products from localStorage`);
        } else {
            console.error('❌ No products found in any source');
            return 'No products found';
        }
    }
    
    if (!allProducts || allProducts.length === 0) {
        return 'No products available';
    }
    
    // Extract product names and sort alphabetically
    const productNames = allProducts
        .map(product => product.name)
        .filter(name => name && name.trim()) // Remove empty names
        .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    
    // Remove duplicates
    const uniqueNames = [...new Set(productNames)];
    
    console.log(`📋 Generated alphabetical list of ${uniqueNames.length} unique products`);
    
    // Format for ChatGPT
    const formattedList = `# Available Products (${uniqueNames.length} items)

${uniqueNames.map((name, index) => `${index + 1}. ${name}`).join('\n')}

---
Generated on: ${new Date().toISOString()}
Total products: ${uniqueNames.length}
Source: ${window.realProductsCategoriesManager ? 'Products Manager' : window.app ? 'App' : 'localStorage'}
`;
    
    return formattedList;
}

// Also create a JSON version for programmatic use
function getAllProductsJSON() {
    console.log('🔍 Extracting products as JSON...');
    
    let allProducts = [];
    
    if (window.realProductsCategoriesManager && window.realProductsCategoriesManager.getAllProducts) {
        allProducts = window.realProductsCategoriesManager.getAllProducts();
    } else if (window.app && window.app.allProducts) {
        allProducts = window.app.allProducts;
    } else {
        const saved = localStorage.getItem('allProducts');
        if (saved) {
            allProducts = JSON.parse(saved);
        }
    }
    
    if (!allProducts || allProducts.length === 0) {
        return {};
    }
    
    // Create a clean JSON structure with just names and categories
    const productsData = allProducts
        .filter(product => product.name && product.name.trim())
        .map(product => ({
            name: product.name.trim(),
            category: product.category || 'unknown',
            id: product.id
        }))
        .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
    
    return {
        count: productsData.length,
        products: productsData,
        generated: new Date().toISOString()
    };
}

// Make functions available globally
window.getAllProductsAlphabetical = getAllProductsAlphabetical;
window.getAllProductsJSON = getAllProductsJSON;

console.log('📋 Product extraction utilities loaded!');
console.log('🔧 Usage:');
console.log('  - getAllProductsAlphabetical() - Get formatted list for ChatGPT');
console.log('  - getAllProductsJSON() - Get JSON data for programmatic use');
console.log('  - copy(getAllProductsAlphabetical()) - Copy to clipboard');