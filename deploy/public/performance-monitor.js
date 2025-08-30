/**
 * PERFORMANCE MONITORING MODULE
 * 
 * Handles performance optimizations and monitoring for the Grocery App
 * Version: 2.6.0-modular
 */

class PerformanceMonitor {
    constructor(app) {
        this.app = app;
        this.INITIAL_RENDER_LIMIT = 200;
    }

    /**
     * Check if we should limit rendering for performance
     */
    shouldLimitRender(forceShowAll, totalProducts) {
        return !forceShowAll && totalProducts > this.INITIAL_RENDER_LIMIT;
    }

    /**
     * Get products to render with performance optimization
     */
    getProductsToRender(filteredProducts, shouldLimitRender, searchTerm, stockFilter) {
        let productsToRender = filteredProducts;
        let hasMoreProducts = false;

        if (shouldLimitRender && !searchTerm && !stockFilter && filteredProducts.length > this.INITIAL_RENDER_LIMIT) {
            productsToRender = filteredProducts.slice(0, this.INITIAL_RENDER_LIMIT);
            hasMoreProducts = true;
            console.log(`🚀 Performance mode: Rendering ${this.INITIAL_RENDER_LIMIT} of ${filteredProducts.length} products`);
        }

        return {
            productsToRender,
            hasMoreProducts,
            totalProducts: filteredProducts.length
        };
    }

    /**
     * Generate "Load More" button HTML
     */
    generateLoadMoreButton(filteredProducts) {
        const remainingProducts = filteredProducts - this.INITIAL_RENDER_LIMIT;
        
        return `<div class="load-more-section">
            <button class="load-more-btn" onclick="window.app.loadAllProducts()">
                📋 Load All Products (${remainingProducts} more)
            </button>
            <p class="load-more-info">Showing ${this.INITIAL_RENDER_LIMIT} of ${filteredProducts} products for better performance</p>
        </div>`;
    }

    /**
     * Log performance information for rendering
     */
    logRenderingPerformance(productsToRender, totalProducts, renderStart) {
        const renderTime = performance.now() - renderStart;
        console.log(`✅ Products list rendered with ${productsToRender} of ${totalProducts} products in ${renderTime.toFixed(2)}ms`);
    }

    /**
     * Monitor Firebase quota usage
     */
    monitorFirebaseQuota() {
        // Track Firebase operations for quota protection
        this.quotaWarningThreshold = 1000; // Adjust based on daily quota
        this.quotaOperationCount = 0;
    }

    /**
     * Check if we're approaching Firebase quota limits
     */
    checkQuotaWarning() {
        if (this.quotaOperationCount > this.quotaWarningThreshold) {
            console.warn('⚠️ Approaching Firebase quota limit - switching to local-only mode');
            return true;
        }
        return false;
    }

    /**
     * Increment quota counter
     */
    incrementQuotaCounter(operationType = 'read') {
        this.quotaOperationCount++;
        
        if (this.quotaOperationCount % 100 === 0) {
            console.log(`📊 Firebase operations: ${this.quotaOperationCount} (${operationType})`);
        }
    }

    /**
     * Memory usage monitoring
     */
    checkMemoryUsage() {
        if (performance.memory) {
            const memInfo = {
                used: Math.round(performance.memory.usedJSHeapSize / 1048576), // MB
                total: Math.round(performance.memory.totalJSHeapSize / 1048576), // MB
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576) // MB
            };

            console.log(`💾 Memory: ${memInfo.used}MB used of ${memInfo.total}MB total (limit: ${memInfo.limit}MB)`);
            
            // Warn if memory usage is high
            if (memInfo.used / memInfo.limit > 0.8) {
                console.warn('⚠️ High memory usage detected - consider refreshing the app');
            }

            return memInfo;
        }
        return null;
    }

    /**
     * Measure function execution time
     */
    measureExecutionTime(functionName, fn) {
        const start = performance.now();
        const result = fn();
        const end = performance.now();
        
        console.log(`⏱️ ${functionName} took ${(end - start).toFixed(2)}ms`);
        return result;
    }

    /**
     * Debounce function for performance optimization
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Throttle function for performance optimization
     */
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Performance report for debugging
     */
    generatePerformanceReport() {
        const report = {
            timestamp: new Date().toISOString(),
            renderLimit: this.INITIAL_RENDER_LIMIT,
            quotaOperations: this.quotaOperationCount,
            memoryUsage: this.checkMemoryUsage(),
            deviceInfo: DebugUtils.getDeviceInfo(),
            isLargeScreen: DebugUtils.isLargeScreen(),
            isMobile: DebugUtils.isMobileDevice()
        };

        console.log('📊 Performance Report:', report);
        return report;
    }
}

// Make available globally
window.PerformanceMonitor = PerformanceMonitor;

// Performance monitor loaded