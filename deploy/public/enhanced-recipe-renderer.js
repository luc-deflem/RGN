/* enhanced-recipe-renderer.js — v3.3.4 */
console.log("🎨 Enhanced Recipe Renderer v3.3.4-clean-logging");

(function () {
  if (!window.smartImages || !window.smartImages.getImageUrl) {
    console.warn("⚠️ smartImages not ready - Enhanced rendering disabled.");
    return;
  }

  // Session cache: filename -> resolved URL
  const imageUrlCache = new Map();

  // Build title -> filename map from localStorage recipes
  function buildRecipeLookup() {
    try {
      const recipes = JSON.parse(localStorage.getItem("recipes") || "[]");
      const map = new Map();
      for (const r of recipes) {
        const title = (r.name || r.title || "").trim().toLowerCase();
        const filename = r.imageFilename || r.image || "";
        if (title && filename) map.set(title, filename);
      }
      return map;
    } catch {
      return new Map();
    }
  }

  const titleToFile = buildRecipeLookup();

  // Extract file name from a URL or path (fallback only)
  function extractFilenameFromPath(path) {
    if (!path) return "";
    try {
      return decodeURIComponent(path.split("/").pop().split("?")[0]);
    } catch {
      return "";
    }
  }

  // Resolve the intended filename for an <img>
  function resolveFilenameForImg(img) {
    // 1) Prefer explicit data attributes
    const attr =
      img.dataset.imageFilename ||
      img.getAttribute("data-image-filename") ||
      img.dataset.image ||
      img.getAttribute("data-image") ||
      img.dataset.filename ||
      img.getAttribute("data-filename");

    if (attr) return attr.trim();

    // 2) Use the alt/title (recipe name) to look up filename from localStorage
    const title = (img.alt || img.title || "").trim().toLowerCase();
    if (title && titleToFile.has(title)) return titleToFile.get(title);

    // 3) Fallback: try to parse from current src (often a data: gif, so usually empty)
    const parsed = extractFilenameFromPath(img.src);
    return parsed;
  }

  async function enhanceOneImage(img) {
    if (!img) return;

    const filename = resolveFilenameForImg(img);
    if (!filename) {
      // Keep existing image visible even if we can't resolve a filename
      img.style.display = "";
      return;
    }

    // Use session cache if available
    if (imageUrlCache.has(filename)) {
      const cached = imageUrlCache.get(filename);
      if (img.src !== cached) img.src = cached;
      img.style.display = "";
      return;
    }

    // Resolve via smartImages (Firebase with fallbacks)
      try {
        const url = await smartImages.getImageUrl(filename);
        if (url) {
          imageUrlCache.set(filename, url);
          if (img.src !== url) img.src = url;
        }
        // Always show the image, even if smartImages couldn't resolve a URL
        img.style.display = "";
      } catch (e) {
        // On errors, keep the existing image and still show it
        img.style.display = "";
        // console.warn(`Failed to load: ${filename}`, e);
      }
  }

  function enhanceAllRecipeImages(root = document) {
    const imgs = root.querySelectorAll(".recipe-image");
    imgs.forEach((img) => enhanceOneImage(img));
  }

  // Try to hook renderRecipes if present
  function tryHookRenderer() {
    const candidates = [
      () => window.renderRecipes,
      () => window.app && window.app.renderRecipes,
    ];
    let target = null, owner = null;
    for (const fn of candidates) {
      const r = fn();
      if (typeof r === "function") {
        target = r;
        owner = fn === candidates[1] ? window.app : window;
        break;
      }
    }
    if (!target) return false;

    const original = target;
    owner.renderRecipes = function (...args) {
      const result = original.apply(this, args);
      // Enhance shortly after DOM updates
      setTimeout(() => enhanceAllRecipeImages(document), 50);
      return result;
    };
    console.log("✅ Recipe rendering enhanced (hooked)");
    return true;
  }

  // Fallback: observe DOM changes (works if renderRecipes isn't exposed)
  function startMutationObserver() {
    const observer = new MutationObserver((mutations) => {
      let needsEnhance = false;
      for (const m of mutations) {
        if (m.addedNodes && m.addedNodes.length) {
          needsEnhance = true;
          break;
        }
      }
      if (needsEnhance) {
        // Debounce a tiny bit
        clearTimeout(startMutationObserver._t);
        startMutationObserver._t = setTimeout(() => enhanceAllRecipeImages(document), 60);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    console.log("🔎 MutationObserver active (no renderRecipes hook)");
  }

  // Boot
  document.addEventListener("DOMContentLoaded", () => {
    const hooked = tryHookRenderer();
    // Always do an initial pass (list may already be present)
    setTimeout(() => enhanceAllRecipeImages(document), 80);
    if (!hooked) startMutationObserver();
  });
})();
