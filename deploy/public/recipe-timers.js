/**
 * RECIPE TIMERS SYSTEM
 * 
 * Provides timer functionality for cooking recipes with:
 * - Multiple concurrent timers
 * - Automatic time detection in recipe text
 * - Mobile-friendly interface
 * - Audio notifications
 */

class RecipeTimersManager {
    constructor() {
        console.log('🔧 RecipeTimersManager constructor called...');
        this.timers = new Map(); // Active timers
        this.nextTimerId = 1;
        this.soundEnabled = true;

        this.savedRecipeTimers = []; // Timers saved with the recipe
        this.currentRecipeId = null; // Track which recipe is being edited
        this.timersActivated = false; // Track if user has explicitly activated timers


        // Persist timers when leaving the page
        window.addEventListener('beforeunload', () => this.saveState());

        this.init();
    }

    init() {
        console.log('🔧 Initializing Recipe Timers System...');

        const onReady = () => {
            this.setupEventListeners();
            // Load any timers from previous sessions
            this.loadState();
        };

        // Wait for DOM to be ready before rendering timers
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', onReady);
        } else {
            onReady();
        }
    }

    setupEventListeners() {
        // Panel toggle
        const toggleBtn = document.getElementById('toggleTimersPanel');
        const panelHeader = document.querySelector('.timers-header');
        
        if (toggleBtn && panelHeader) {
            const togglePanel = () => {
                const panel = document.getElementById('timersPanel');
                panel.classList.toggle('collapsed');
                toggleBtn.textContent = panel.classList.contains('collapsed') ? '+' : '−';
            };
            
            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                togglePanel();
            });
            
            panelHeader.addEventListener('click', togglePanel);
        }

        // Add timer button click (direct event listener)
        const addTimerBtn = document.getElementById('addTimerBtn');
        if (addTimerBtn) {
            console.log('🔍 Add Timer button found during setup');
            addTimerBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('➕ Add Timer button clicked');
                this.addCustomTimer();
            });
        } else {
            console.log('⚠️ Add Timer button not found during setup');
        }

        // Add timer button (use event delegation in case element is recreated)
        document.addEventListener('click', (e) => {

            const btn = e.target.closest && e.target.closest('#addTimerBtn');
            if (btn) {
                e.stopPropagation();

                console.log('➕ Add Timer button clicked');
                this.addCustomTimer();
            }
        });

        // Allow Enter key in timer inputs
        const timerInputs = document.querySelectorAll('#timerMinutes, #timerSeconds, #timerDescription');
        timerInputs.forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.addCustomTimer();
                }
            });
        });

        console.log('✅ Recipe Timers event listeners setup complete');

        // Load any timers from previous sessions
        this.loadState();
    }

    /**
     * Add a custom timer from the input fields
     */
    async addCustomTimer() {
        const minutesInput = document.getElementById('timerMinutes');
        const secondsInput = document.getElementById('timerSeconds');
        const descriptionInput = document.getElementById('timerDescription');
        
        const minutes = parseInt(minutesInput.value) || 0;
        const seconds = parseInt(secondsInput.value) || 0;
        const description = descriptionInput.value.trim() || 'Custom Timer';
        
        if (minutes === 0 && seconds === 0) {
            alert('Please enter a time for the timer');
            return;
        }

        const totalSeconds = (minutes * 60) + seconds;
        const label = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        // Create staged timer that waits for user to click start (user explicitly requested)
        // Get current recipe context if available
        const currentRecipe = this.getCurrentRecipeContext();
        const timerLabel = currentRecipe ? `${currentRecipe}: ${label}` : `Custom Timer (${label})`;
        
        const timerId = this.createTimer(totalSeconds, timerLabel, description);

        // Attempt to save timer to current recipe context
        this.currentRecipeId = this.getCurrentRecipeId();
        console.log('🔍 DEBUG: getCurrentRecipeId() returned:', this.currentRecipeId);
        if (this.currentRecipeId) {
            console.log('✅ Recipe ID found, saving timer to recipe...');
            await this.saveTimerToRecipe(timerId);

            // Refresh timer suggestions/saved list without reopening recipe
            console.log('🔍 Checking for instructions element before refreshing timer buttons');
            const instructionsEl = document.getElementById('editRecipePreparation');
            console.log('📘 Instructions element found:', !!instructionsEl);
            const instructions = instructionsEl?.value || '';
            this.addTimerButtonsToRecipe(instructions);
        } else {
            alert('No recipe selected. Timer was not saved to a recipe.');
        }
        
        console.log(`⏲️ Created staged custom timer: ${timerLabel} - "${description}" (${totalSeconds}s)`);
        
        // Clear inputs
        minutesInput.value = '';
        secondsInput.value = '';
        descriptionInput.value = '';
    }

    /**
     * Get current recipe context for timer association
     */
    getCurrentRecipeContext() {
        // Check if we're in a recipe modal by looking for the recipe name field
        const recipeNameField = document.getElementById('editRecipeName');
        if (recipeNameField && recipeNameField.value.trim()) {
            return recipeNameField.value.trim();
        }
        
        // Fallback: check for any visible recipe name in the UI
        const recipeTitle = document.querySelector('.recipe-title, .modal-title');
        if (recipeTitle && recipeTitle.textContent.trim()) {
            return recipeTitle.textContent.trim();
        }
        
        return null;
    }

    /**
     * Get current recipe ID for persistence
     */
    getCurrentRecipeId() {
        // Look for recipe ID in modal form data
        const editForm = document.querySelector('#recipeEditModal');
        if (editForm && editForm.dataset.recipeId) {
            return Number(editForm.dataset.recipeId); // Keep as float, not parseInt
        }

        // Try to get from app context if available
        if (window.app && window.app.currentRecipeEditId) {
            return window.app.currentRecipeEditId;
        }

        // Fallback to recipes manager's current editing recipe
        if (window.realRecipesManager && window.realRecipesManager.currentEditingRecipe) {
            return window.realRecipesManager.currentEditingRecipe.id;
        }

        return null;
    }

    /**
     * Wait until the real recipes manager is available
     */
    async waitForRecipesManager(maxAttempts = 50) {
        let attempts = 0;
        while (attempts < maxAttempts) {
            const manager = window.app?.realRecipesManager || window.realRecipesManager;
            if (manager) {
                return manager;
            }
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        console.warn('⚠️ Recipes manager not initialized after waiting');
        return null;
    }

    /**
     * Save timer to current recipe
     */
    async saveTimerToRecipe(timerId) {
        const recipeId = this.getCurrentRecipeId() || this.currentRecipeId;
        if (!recipeId) {
            console.log('⚠️ No recipe context found, timer not saved to recipe');
            return;
        }

        const timer = this.timers.get(timerId);
        if (!timer) return;

        // Get recipes manager and save timer to recipe
        const recipesManager = await this.waitForRecipesManager();
        if (!recipesManager) {
            console.warn('⚠️ Recipes manager undefined; timer not saved');
            return;
        }

        console.log('🔍 DEBUG: Looking for recipe with ID:', recipeId);
        console.log('🔍 DEBUG: Available recipes:', recipesManager.getAllRecipes().map(r => `${r.id} (${r.name})`));
        
        const recipe = recipesManager.getRecipeById(recipeId);
        if (!recipe) {
            console.warn(`⚠️ Recipe not found for ID ${recipeId}; timer not saved`);
            console.warn('🔍 DEBUG: Available recipe IDs:', recipesManager.getAllRecipes().map(r => r.id));
            console.warn('🔍 DEBUG: ID types - Looking for:', typeof recipeId, 'Available:', recipesManager.getAllRecipes().map(r => typeof r.id));
            return;
        }

        if (!recipe.timers) {
            recipe.timers = [];
        }

        // Save timer data (without the DOM interval)
        const timerData = {
            id: timer.id,
            duration: timer.duration,
            label: timer.label,
            description: timer.description,
            dateCreated: new Date().toISOString()
        };

        // Check if timer already exists (avoid duplicates)
        const existingIndex = recipe.timers.findIndex(t => t.id === timer.id);
        if (existingIndex >= 0) {
            recipe.timers[existingIndex] = timerData;
        } else {
            recipe.timers.push(timerData);
        }


            // Mirror to in-memory saved timers list for UI
            const savedIdx = this.savedRecipeTimers.findIndex(t => t.id === timer.id);
            if (savedIdx >= 0) {
                this.savedRecipeTimers[savedIdx] = timerData;
            } else {
                this.savedRecipeTimers.push(timerData);
            }

        // Save recipe changes
        recipesManager.saveRecipes();
        console.log(`💾 Saved timer "${timer.label}" to recipe "${recipe.name}"`);
        console.log(`🔍 Recipe now has ${recipe.timers.length} timer(s):`, recipe.timers.map(t => t.label));
    }

    /**
     * Remove timer from current recipe
     */
    removeTimerFromRecipe(timerId) {
        const recipeId = this.getCurrentRecipeId() || this.currentRecipeId;
        if (!recipeId) {
            return;
        }

        const recipesManager = window.app?.realRecipesManager || window.realRecipesManager;
        if (!recipesManager) return;

        const recipe = recipesManager.getRecipeById(recipeId);

        if (recipe && Array.isArray(recipe.timers)) {
            const idx = recipe.timers.findIndex(t => t.id === timerId);
            if (idx >= 0) {
                recipe.timers.splice(idx, 1);

                // Keep in-memory list in sync
                const savedIdx = this.savedRecipeTimers.findIndex(t => t.id === timerId);
                if (savedIdx >= 0) {
                    this.savedRecipeTimers.splice(savedIdx, 1);
                }

                recipesManager.saveRecipes();
                console.log(`🗑️ Removed timer ${timerId} from recipe "${recipe.name}"`);
            }
        }
    }

    /**
     * Load timers from recipe when opening recipe modal
     */
    loadTimersFromRecipe(recipeId) {
        // Keep original recipe ID (don't normalize to integer)
        console.log(`📥 loadTimersFromRecipe called with recipeId: ${recipeId}`);
        this.savedRecipeTimers = [];
        this.currentRecipeId = recipeId;
        this.timersActivated = false; // Reset timer activation state for new recipe
        
        // Hide the floating timers panel for new recipe
        const timersPanel = document.getElementById('timersPanel');
        if (timersPanel) {
            timersPanel.classList.remove('activated');
            console.log('🙈 Timers panel hidden for new recipe');
        }
        if (!recipeId) {
            console.log('⚠️ No recipeId provided, skipping load');
            return;
        }

        const recipesManager = window.app?.realRecipesManager || window.realRecipesManager;
        if (!recipesManager) {
            console.log('⚠️ Recipes manager not available, cannot load timers');
            return;
        }

        console.log('🔍 DEBUG: Looking for recipe with ID:', recipeId);
        console.log('🔍 DEBUG: Available recipes:', recipesManager.getAllRecipes().map(r => `${r.id} (${r.name})`));
        
        const recipe = recipesManager.getRecipeById(recipeId);
        if (!recipe) {
            console.log(`⚠️ No recipe found for id ${recipeId}`);
            console.warn('🔍 DEBUG: Available recipe IDs:', recipesManager.getAllRecipes().map(r => r.id));
            console.warn('🔍 DEBUG: ID types - Looking for:', typeof recipeId, 'Available:', recipesManager.getAllRecipes().map(r => typeof r.id));
            return;
        }

        console.log(`🔍 Recipe data check:`, { 
            hasTimers: !!recipe.timers, 
            isArray: Array.isArray(recipe.timers), 
            length: recipe.timers?.length || 0,
            timers: recipe.timers 
        });

        if (recipe.timers && Array.isArray(recipe.timers) && recipe.timers.length > 0) {
            console.log(`📥 Loading ${recipe.timers.length} timers from recipe "${recipe.name}"`);
            recipe.timers.forEach((t, i) => console.log(`  ${i+1}. ${t.label} (${t.duration}s) - ${t.description}`));
            
            let maxId = 0;

            this.savedRecipeTimers = recipe.timers.map(timerData => {
                maxId = Math.max(maxId, timerData.id || 0);
                return { ...timerData };
            });
            this.nextTimerId = Math.max(this.nextTimerId, maxId + 1);
            console.log(`✅ Loaded ${this.savedRecipeTimers.length} timers into savedRecipeTimers`);
        } else {
            console.log(`ℹ️ Recipe "${recipe.name}" has no saved timers`);
        }
    }



    /**
     * Save current timers state to localStorage
     */
    saveState() {
        try {
            const timersArray = Array.from(this.timers.values()).map(t => ({
                id: t.id,
                duration: t.duration,
                remaining: t.remaining,
                label: t.label,
                description: t.description,
                status: t.status,
                startTime: t.startTime
            }));

            const state = {
                nextTimerId: this.nextTimerId,
                timers: timersArray
            };

            localStorage.setItem('recipeTimersState', JSON.stringify(state));
        } catch (e) {
            console.error('❌ Could not save timers state:', e);
        }
    }

    /**
     * Load timers state from localStorage
     */
    loadState() {
        try {
            const data = localStorage.getItem('recipeTimersState');
            if (!data) return;

            const state = JSON.parse(data);
            this.nextTimerId = state.nextTimerId || 1;

            (state.timers || []).forEach(t => {
                const id = this.createTimer(t.duration, t.label, t.description, t.id, false);
                const timer = this.timers.get(id);
                timer.remaining = typeof t.remaining === 'number' ? t.remaining : t.duration;
                timer.status = t.status || 'staged';
                timer.startTime = t.startTime || null;

                if (timer.status === 'running') {
                    const elapsed = Math.floor((Date.now() - timer.startTime) / 1000);
                    timer.remaining = Math.max(0, timer.duration - elapsed);
                    if (timer.remaining > 0) {
                        this.startTimer(timer.id);
                    } else {
                        this.finishTimer(timer.id);
                    }
                } else {
                    this.updateTimerDisplay(timer);
                }
            });

        } catch (e) {
            console.error('❌ Could not load timers state:', e);
        }
    }

    /**
     * Create a new timer (staged, not started)
     */
    createTimer(durationSeconds, label = 'Timer', description = '', id = null, persist = true) {
        const timerId = (id !== null) ? id : this.nextTimerId++;

        if (id !== null) {
            // Keep nextTimerId ahead of any manually assigned IDs
            this.nextTimerId = Math.max(this.nextTimerId, id + 1);
        }
        
        const timer = {
            id: timerId,
            duration: durationSeconds,
            remaining: durationSeconds,
            label: label,
            description: description,
            status: 'staged', // staged, running, paused, finished
            startTime: null,
            interval: null
        };

        this.timers.set(timerId, timer);
        this.renderTimer(timer);

        console.log(`⏲️ Created staged timer: ${label} (${durationSeconds}s)`);

        if (persist) {
            this.saveState();
        }

        return timerId;
    }

    /**
     * Create and immediately start a timer (for manual custom timers)
     */
    createAndStartTimer(durationSeconds, label = 'Timer') {
        const timerId = this.createTimer(durationSeconds, label);
        this.startTimer(timerId);
        return timerId;
    }

    /**
     * Start or resume a timer
     */
    startTimer(timerId) {
        const timer = this.timers.get(timerId);
        if (!timer) return;

        if (timer.interval) {
            clearInterval(timer.interval);
        }

        timer.status = 'running';
        timer.startTime = Date.now() - (timer.duration - timer.remaining) * 1000;

        timer.interval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - timer.startTime) / 1000);
            timer.remaining = Math.max(0, timer.duration - elapsed);

            this.updateTimerDisplay(timer);

            if (timer.remaining === 0) {
                this.finishTimer(timerId);
            }
        }, 1000);

        this.updateTimerDisplay(timer);

        this.saveState();
    }

    /**
     * Pause a timer
     */
    pauseTimer(timerId) {
        const timer = this.timers.get(timerId);
        if (!timer) return;

        if (timer.interval) {
            clearInterval(timer.interval);
            timer.interval = null;
        }

        timer.status = 'paused';
        this.updateTimerDisplay(timer);

        this.saveState();
    }

    /**
     * Stop and remove a timer
     */
    stopTimer(timerId) {
        const timer = this.timers.get(timerId);
        if (!timer) return;

        if (timer.interval) {
            clearInterval(timer.interval);
        }

        this.timers.delete(timerId);
        const timerElement = document.getElementById(`timer-${timerId}`);
        if (timerElement) {
            timerElement.remove();
        }

        // Remove persistence entry
        this.removeTimerFromRecipe(timerId);

        console.log(`🛑 Stopped timer: ${timer.label}`);

        this.saveState();
    }

    /**
     * Edit a staged timer (duration and description)
     */
    editTimer(timerId) {
        console.log(`🔧 Edit timer called for ID: ${timerId}`);
        const timer = this.timers.get(timerId);
        
        if (!timer) {
            console.log(`❌ Timer with ID ${timerId} not found`);
            alert(`Timer with ID ${timerId} not found`);
            return;
        }
        
        if (timer.status !== 'staged') {
            console.log(`⚠️ Can only edit staged timers. Current status: ${timer.status}`);
            alert(`Can only edit staged timers. This timer is ${timer.status}`);
            return;
        }
        
        console.log(`✅ Editing timer: ${timer.label} (${timer.description})`);
        

        // Create edit modal
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;
            z-index: 10000;
        `;
        
        const currentMinutes = Math.floor(timer.duration / 60);
        const currentSeconds = timer.duration % 60;
        
        modal.innerHTML = `
            <div style="background: white; padding: 20px; border-radius: 10px; max-width: 400px; width: 90%;">
                <h3>✏️ Edit Timer</h3>
                <div style="margin: 15px 0;">
                    <label>Duration:</label><br>
                    <input type="number" id="editMinutes" value="${currentMinutes}" min="0" max="240" style="width: 80px; padding: 5px; margin-right: 10px;">
                    <span>minutes</span>
                    <input type="number" id="editSeconds" value="${currentSeconds}" min="0" max="59" style="width: 80px; padding: 5px; margin: 0 10px;">
                    <span>seconds</span>
                </div>
                <div style="margin: 15px 0;">
                    <label>Description:</label><br>
                    <input type="text" id="editDescription" value="${timer.description || ''}" style="width: 100%; padding: 5px;">
                </div>
                <div style="margin-top: 20px; text-align: right;">
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" style="padding: 8px 15px; margin-right: 10px; background: #ccc; border: none; border-radius: 4px;">Cancel</button>
                    <button onclick="window.recipeTimers.saveTimerEdit(${timerId}, this.parentElement.parentElement.parentElement)" style="padding: 8px 15px; background: #27ae60; color: white; border: none; border-radius: 4px;">Save</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Focus on minutes input
        setTimeout(() => document.getElementById('editMinutes').focus(), 100);
    }

    /**
     * Save timer edit changes
     */
    async saveTimerEdit(timerId, modal) {
        const timer = this.timers.get(timerId);
        if (!timer) return;

        const minutes = parseInt(document.getElementById('editMinutes').value) || 0;
        const seconds = parseInt(document.getElementById('editSeconds').value) || 0;
        const description = document.getElementById('editDescription').value.trim();

        if (minutes === 0 && seconds === 0) {
            alert('Please enter a valid duration');
            return;
        }

        // Update timer
        const newDuration = (minutes * 60) + seconds;
        timer.duration = newDuration;
        timer.remaining = newDuration;
        timer.description = description || 'Timer';
        timer.label = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        // Re-render the timer
        this.renderTimerUpdate(timer);
        
        // Close modal
        modal.remove();

        console.log(`✏️ Edited timer: ${timer.label} (${timer.description})`);

        // Persist updated timer
        this.currentRecipeId = this.getCurrentRecipeId();
        if (this.currentRecipeId) {
            await this.saveTimerToRecipe(timerId);
        } else {
            alert('No recipe selected. Timer changes not saved to recipe.');
        }
        this.saveState();
    }

    /**
     * Update timer display after editing
     */
    renderTimerUpdate(timer) {
        const timerElement = document.getElementById(`timer-${timer.id}`);
        if (timerElement) {
            timerElement.remove();
        }
        this.renderTimer(timer);
    }

    /**
     * Finish a timer (time reached zero)
     */
    finishTimer(timerId) {
        const timer = this.timers.get(timerId);
        if (!timer) return;

        if (timer.interval) {
            clearInterval(timer.interval);
            timer.interval = null;
        }

        timer.status = 'finished';
        timer.remaining = 0;
        this.updateTimerDisplay(timer);

        // Play notification sound
        this.playNotificationSound();
        
        // Show notification if supported
        this.showNotification(timer.label);

        console.log(`✅ Timer finished: ${timer.label}`);

        this.saveState();
    }

    /**
     * Render a timer in the UI
     */
    renderTimer(timer) {
        const activeTimers = document.getElementById('activeTimers');
        if (!activeTimers) return;

        const timerElement = document.createElement('div');
        timerElement.id = `timer-${timer.id}`;
        timerElement.className = `timer-item ${timer.status}`;
        
        // Different rendering based on timer status
        console.log(`🎨 Rendering timer ${timer.id}: ${timer.label} (status: ${timer.status})`);
        if (timer.status === 'staged') {
            timerElement.innerHTML = `
                <div class="timer-display">${this.formatTime(timer.remaining)}</div>
                <div class="timer-info">
                    <div class="timer-label">${timer.label}</div>
                    ${timer.description ? `<div class="timer-description">${timer.description}</div>` : ''}
                    <div class="timer-staged">⏱️ Ready to start</div>
                </div>
                <div class="timer-actions">
                    <button class="timer-btn" onclick="window.recipeTimers.startTimer(${timer.id})" id="start-${timer.id}">▶️ Start</button>
                    <button class="timer-btn secondary" onclick="window.recipeTimers.editTimer(${timer.id})">✏️ Edit</button>
                    <button class="timer-btn secondary" onclick="window.recipeTimers.stopTimer(${timer.id})">🗑️</button>
                </div>
            `;
        } else {
            timerElement.innerHTML = `
                <div class="timer-display">${this.formatTime(timer.remaining)}</div>
                <div class="timer-info">
                    <div class="timer-label">${timer.label}</div>
                    ${timer.description ? `<div class="timer-description">${timer.description}</div>` : ''}
                </div>
                <div class="timer-actions">
                    <button class="timer-btn secondary" onclick="window.recipeTimers.pauseTimer(${timer.id})" id="pause-${timer.id}">⏸️</button>
                    <button class="timer-btn secondary" onclick="window.recipeTimers.stopTimer(${timer.id})">🗑️</button>
                </div>
            `;
        }

        activeTimers.appendChild(timerElement);
    }

    /**
     * Update timer display
     */
    updateTimerDisplay(timer) {
        const timerElement = document.getElementById(`timer-${timer.id}`);
        if (!timerElement) return;

        const displayElement = timerElement.querySelector('.timer-display');
        const pauseBtn = document.getElementById(`pause-${timer.id}`);

        if (displayElement) {
            displayElement.textContent = this.formatTime(timer.remaining);
        }

        // Update classes and button
        timerElement.className = `timer-item ${timer.status}`;
        
        if (pauseBtn) {
            if (timer.status === 'running') {
                pauseBtn.innerHTML = '⏸️';
                pauseBtn.onclick = () => this.pauseTimer(timer.id);
            } else if (timer.status === 'paused') {
                pauseBtn.innerHTML = '▶️';
                pauseBtn.onclick = () => this.startTimer(timer.id);
            } else if (timer.status === 'finished') {
                pauseBtn.innerHTML = '✅';
                pauseBtn.disabled = true;
            }
        }
    }

    /**
     * Format seconds to MM:SS
     */
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Play notification sound - Enhanced with multiple beeps
     */
    playNotificationSound() {
        if (!this.soundEnabled) return;

        try {
            // Create multiple beeps for better attention
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Play 3 beeps with increasing pitch
            const frequencies = [600, 800, 1000];
            
            frequencies.forEach((freq, index) => {
                setTimeout(() => {
                    const oscillator = audioContext.createOscillator();
                    const gainNode = audioContext.createGain();

                    oscillator.connect(gainNode);
                    gainNode.connect(audioContext.destination);

                    oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
                    oscillator.type = 'sine';

                    gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);

                    oscillator.start(audioContext.currentTime);
                    oscillator.stop(audioContext.currentTime + 0.4);
                }, index * 500); // 500ms between beeps
            });

            // Add a final longer beep after the sequence
            setTimeout(() => {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);

                oscillator.frequency.setValueAtTime(700, audioContext.currentTime);
                oscillator.type = 'square'; // Different waveform for final beep

                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1.0);

                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 1.0);
            }, 1500);

        } catch (error) {
            console.log('⚠️ Could not play timer sound:', error);
            // Fallback: try to use system beep
            try {
                // Multiple system alerts as fallback
                for (let i = 0; i < 3; i++) {
                    setTimeout(() => {
                        if (window.speechSynthesis) {
                            const utterance = new SpeechSynthesisUtterance('Timer finished');
                            utterance.volume = 0.1;
                            utterance.rate = 2;
                            window.speechSynthesis.speak(utterance);
                        }
                    }, i * 800);
                }
            } catch (fallbackError) {
                console.log('⚠️ Fallback sound also failed:', fallbackError);
            }
        }
    }

    /**
     * Show browser notification
     */
    showNotification(timerLabel) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Recipe Timer Finished! ⏰', {
                body: `${timerLabel} is complete`,
                icon: '/icon-192.png',
                tag: 'recipe-timer'
            });
        } else if ('Notification' in window && Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    this.showNotification(timerLabel);
                }
            });
        }
    }

    /**
     * Parse recipe instructions and suggest timers with enhanced patterns
     */
    parseRecipeTimers(instructionsText) {
        console.log('🔍 TIMER PARSING: Input text:', instructionsText.substring(0, 200) + '...');
        if (!instructionsText) return [];

        const suggestions = [];
        
        // Enhanced pattern detection including TTT: format
        const patterns = [
            // TTT: format (e.g., "TTT: 30 min Apples", "TTT:15min-Chicken")  
            {
                regex: /TTT:\s*(\d+)\s*(?:minutes?|mins?|min)\s*([^\n\r.]*)/gi,
                handler: (match) => ({
                    seconds: parseInt(match[1]) * 60,
                    label: `${match[1]} minutes`,
                    description: match[2].trim() || 'Timer',
                    format: 'TTT'
                })
            },
            
            // Standard time patterns with context
            {
                regex: /(\d+)\s*(?:hours?|hrs?)/gi,
                handler: (match) => ({
                    seconds: parseInt(match[1]) * 3600,
                    label: `${match[1]} hour${match[1] > 1 ? 's' : ''}`,
                    description: 'Timer', // Will be fixed in forEach loop
                    format: 'standard'
                })
            },
            
            {
                regex: /(\d+)\s*(?:minutes?|mins?)/gi,
                handler: (match) => ({
                    seconds: parseInt(match[1]) * 60,
                    label: `${match[1]} minute${match[1] > 1 ? 's' : ''}`,
                    description: 'Timer', // Will be fixed in forEach loop
                    format: 'standard'
                })
            },
            
            {
                regex: /(\d+)\s*(?:seconds?|secs?)/gi,
                handler: (match) => ({
                    seconds: parseInt(match[1]),
                    label: `${match[1]} second${match[1] > 1 ? 's' : ''}`,
                    description: 'Timer', // Will be fixed in forEach loop
                    format: 'standard'
                })
            },
            
            // MM:SS format
            {
                regex: /(\d+):(\d+)/g,
                handler: (match) => ({
                    seconds: parseInt(match[1]) * 60 + parseInt(match[2]),
                    label: `${match[1]}:${match[2].padStart(2, '0')}`,
                    description: 'Timer', // Will be fixed in forEach loop
                    format: 'time'
                })
            }
        ];

        patterns.forEach(({regex, handler}) => {
            let match;
            while ((match = regex.exec(instructionsText)) !== null) {
                const suggestion = handler(match);
                
                // Fix context extraction for non-TTT formats
                if (suggestion.format !== 'TTT' && suggestion.description === 'Timer') {
                    suggestion.description = this.extractContext(instructionsText, match.index);
                }
                
                if (suggestion.seconds > 0 && suggestion.seconds <= 14400) { // Max 4 hours
                    suggestions.push({
                        ...suggestion,
                        context: match[0],
                        staged: true // All timers start in staged mode
                    });
                }
            }
        });

        const filteredSuggestions = suggestions.filter((suggestion, index, self) => 
            index === self.findIndex(s => s.seconds === suggestion.seconds)
        );
        
        console.log('🔍 TIMER PARSING: Found', suggestions.length, 'total patterns,', filteredSuggestions.length, 'unique timers');
        filteredSuggestions.forEach((timer, i) => {
            console.log(`  ${i+1}. ${timer.label} (${timer.seconds}s) - "${timer.description}" - Context: "${timer.context}"`);
        });
        
        return filteredSuggestions;
    }

    /**
     * Extract context around a time mention
     */
    extractContext(text, index) {
        const start = Math.max(0, index - 40);
        const end = Math.min(text.length, index + 60);
        const context = text.substring(start, end).trim();
        
        // Try to extract food items or ingredients
        const foodItems = context.match(/\b(chicken|beef|pork|fish|bread|cake|sauce|rice|pasta|vegetables?|meat|dough|soup|stew)\b/i);
        if (foodItems) {
            return foodItems[0].toLowerCase();
        }
        
        // Extract cooking actions
        const cookingActions = context.match(/\b(bake|boil|simmer|fry|roast|cook|rest|chill|marinate|steep|sauté|grill|steam|poach|broil)\b/i);
        if (cookingActions) {
            return cookingActions[0].toLowerCase();
        }
        
        // Try to extract any meaningful words (avoid common words)
        const meaningfulWords = context.match(/\b(?!the|and|or|in|on|at|to|for|with|until|then|while)\w{4,}\b/i);
        if (meaningfulWords) {
            return meaningfulWords[0].toLowerCase();
        }
        
        return 'Timer';
    }

    /**
     * Prepare the timer zone in the recipe modal
     * Always shows an activation button first - user must explicitly choose to see timers
     * This prevents timers from auto-opening when just viewing recipe ingredients/instructions
     */
    prepareTimerZone(recipeInstructions) {
        console.log('🔧 prepareTimerZone invoked. Saved timers:', this.savedRecipeTimers.length, '(showing activation button only)');


        // Remove any existing zone
        const existing = document.getElementById('recipeTimerSuggestions');
        if (existing) {
            console.log('🔄 Removing existing timer zone');

            existing.remove();
        }

        console.log('🔍 Searching for instructions area (ID: editRecipePreparation)');
        const instructionsArea = document.getElementById('editRecipePreparation');
        console.log('📘 Instructions area found:', !!instructionsArea);

        if (!instructionsArea) {
            console.log('⚠️ Instructions area not found; cannot render timer zone');
            return;
        }


        // Always show activation button first, even if there are saved timers
        // User should explicitly choose to see timers (they might just be viewing the recipe)

        // Otherwise show activation button

        const zone = document.createElement('div');
        zone.id = 'recipeTimerSuggestions';
        zone.style.cssText = 'margin-top: 10px; padding: 10px; background: #f8f9fa; border-radius: 6px; border:1px solid #e9ecef; text-align: center;';

        const activateBtn = document.createElement('button');
        // Show different text based on whether there are saved timers
        if (this.savedRecipeTimers && this.savedRecipeTimers.length > 0) {
            activateBtn.textContent = `Show timers (${this.savedRecipeTimers.length} saved)`;
        } else {
            activateBtn.textContent = 'Activate timers';
        }
        activateBtn.className = 'timer-btn';
        activateBtn.onclick = () => {
            console.log('🟢 Timers activated by user');
            this.timersActivated = true; // User has now activated timers
            
            // Show the floating timers panel
            const timersPanel = document.getElementById('timersPanel');
            if (timersPanel) {
                timersPanel.classList.add('activated');
                console.log('👁️ Timers panel made visible');
            }
            
            zone.innerHTML = '';
            this.addTimerButtonsToRecipe(recipeInstructions);
        };

        zone.appendChild(activateBtn);

        instructionsArea.parentNode.insertBefore(zone, instructionsArea.nextSibling);

        console.log('👀 Activation button inserted for timers');


    }

    /**
     * Add quick timer buttons to recipe modal and auto-create TTT timers
     */
    async addTimerButtonsToRecipe(recipeInstructions) {
        console.log('🔧 addTimerButtonsToRecipe called');

        this.currentRecipeId = this.getCurrentRecipeId();

        const suggestions = this.parseRecipeTimers(recipeInstructions);

        console.log('⏰ TIMER CREATION: Got', suggestions.length, 'suggestions from parsing');
        if (suggestions.length === 0) {
            console.log('⏰ TIMER CREATION: No timer suggestions found');
        }

        // Auto-create TTT format timers immediately (but avoid duplicates)
        const tttTimers = suggestions.filter(s => s.format === 'TTT');
        const regularSuggestions = suggestions.filter(s => s.format !== 'TTT');
        
        let createdCount = 0;
        for (const timer of tttTimers) {
            const timerLabel = `TTT: ${timer.label}`;
            
            // Check if this TTT timer already exists
            const existingTimers = Array.from(this.timers.values());
            console.log(`🔍 Checking for duplicates. Current timers: ${existingTimers.length}`);
            existingTimers.forEach(t => console.log(`  - ${t.label} (${t.description})`));
            
            const exists = existingTimers.some(existingTimer => {
                const labelMatch = existingTimer.label === timerLabel;
                const descMatch = existingTimer.description === timer.description;
                console.log(`🔍 Comparing: "${existingTimer.label}" vs "${timerLabel}" (${labelMatch}) | "${existingTimer.description}" vs "${timer.description}" (${descMatch})`);
                return labelMatch && descMatch;
            });
            
            if (!exists) {
                console.log(`🎯 Auto-creating TTT timer: ${timer.label} (${timer.description})`);
                const timerId = this.createTimer(
                    timer.seconds,
                    timerLabel,
                    timer.description || 'TTT Timer'
                );
                // Persist timer with current recipe if available
                if (this.currentRecipeId) {
                    await this.saveTimerToRecipe(timerId);
                } else {
                    alert('No recipe selected. Timer was not saved to a recipe.');
                }
                createdCount++;
            } else {
                console.log(`⚠️ TTT timer already exists, skipping: ${timerLabel}`);
            }
        }
        
        if (createdCount > 0) {
            console.log(`✅ Auto-created ${createdCount} new TTT timer(s)`);
        }


        // Check if timers have been activated by the user
        if (!this.timersActivated) {
            console.log('🔘 Timers not activated by user yet - addTimerButtonsToRecipe will not display timer zone');
            return;
        }
        
        console.log('✅ Timers have been activated by user - proceeding to show timer zone');
        
        // Only show container if we have suggestions or saved timers
        if (regularSuggestions.length === 0 && (!this.savedRecipeTimers || this.savedRecipeTimers.length === 0)) {
            console.log('ℹ️ No suggestions or saved timers; timer zone will not be displayed');
            return;
        }

        // Find recipe modal instructions area
        console.log('🔍 Looking for instructions area (ID: editRecipePreparation) to insert timer suggestions');
        const instructionsArea = document.getElementById('editRecipePreparation');
        console.log('📘 Instructions area found:', !!instructionsArea);
        if (!instructionsArea) {
            console.log('⚠️ Instructions area not found; cannot insert timer suggestions');
            return;
        }

        // Create timer suggestions container
        let suggestionsContainer = document.getElementById('recipeTimerSuggestions');
        if (suggestionsContainer) {
            console.log('🔄 Replacing existing timer suggestions container');
            suggestionsContainer.remove();
        }

        // Create new container
        suggestionsContainer = document.createElement('div');
        suggestionsContainer.id = 'recipeTimerSuggestions';
        suggestionsContainer.style.cssText = 'margin-top: 10px; padding: 10px; background: #f8f9fa; border-radius: 6px; border: 1px solid #e9ecef;';

        const label = document.createElement('div');
        const tttCount = tttTimers.length;
        const labelText = tttCount > 0 ?
            `⏲️ Suggested Timers (${tttCount} TTT timer${tttCount > 1 ? 's' : ''} auto-created):` :
            '⏲️ Suggested Timers:';
        label.textContent = labelText;
        label.style.cssText = 'font-size: 12px; font-weight: 600; margin-bottom: 8px; color: #495057;';
        suggestionsContainer.appendChild(label);

        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.cssText = 'display: flex; gap: 6px; flex-wrap: wrap;';

        regularSuggestions.forEach(suggestion => {
            const button = document.createElement('button');

            // Enhanced button text with description
            const displayText = suggestion.description && suggestion.description !== 'Timer' ?
                `⏲️ ${suggestion.label} (${suggestion.description})` :
                `⏲️ ${suggestion.label}`;

            button.textContent = displayText;
            button.className = 'timer-btn';
            button.style.cssText = 'font-size: 11px; padding: 4px 8px; margin: 2px;';
            button.onclick = async () => {
                // Create staged timer with description
                const createdId = this.createTimer(
                    suggestion.seconds,
                    `Recipe: ${suggestion.label}`,
                    suggestion.description || 'Recipe timer'
                );

                // Save newly created timer to recipe if available
                this.currentRecipeId = this.getCurrentRecipeId();
                if (this.currentRecipeId) {
                    await this.saveTimerToRecipe(createdId);
                    // Refresh suggestions to show newly saved timer
                    this.addTimerButtonsToRecipe(recipeInstructions);
                } else {
                    alert('No recipe selected. Timer was not saved to a recipe.');
                }
            };
            buttonsContainer.appendChild(button);
        });

        suggestionsContainer.appendChild(buttonsContainer);

        // Saved timers zone
        if (this.savedRecipeTimers && this.savedRecipeTimers.length > 0) {
            const savedLabel = document.createElement('div');
            savedLabel.textContent = '💾 Saved Timers:';
            savedLabel.style.cssText = 'font-size: 12px; font-weight: 600; margin: 12px 0 8px; color: #495057;';
            suggestionsContainer.appendChild(savedLabel);

            this.savedRecipeTimers.forEach(saved => {
                const row = document.createElement('div');
                row.style.cssText = 'display: flex; gap: 6px; align-items: center; flex-wrap: wrap; margin-bottom: 4px;';

                const info = document.createElement('span');
                const infoText = saved.description ? `${saved.label} (${saved.description})` : saved.label;
                info.textContent = `⏲️ ${infoText}`;
                info.style.cssText = 'font-size: 11px;';
                row.appendChild(info);

                const addBtn = document.createElement('button');
                addBtn.textContent = 'Add';
                addBtn.className = 'timer-btn';
                addBtn.style.cssText = 'font-size: 11px; padding: 2px 6px;';
                addBtn.onclick = () => {
                    this.createTimer(saved.duration, saved.label, saved.description);
                    addBtn.textContent = '✅ Added';
                    setTimeout(() => { addBtn.textContent = 'Add'; }, 2000);
                };
                row.appendChild(addBtn);

                const startBtn = document.createElement('button');
                startBtn.textContent = 'Start';
                startBtn.className = 'timer-btn';
                startBtn.style.cssText = 'font-size: 11px; padding: 2px 6px;';
                startBtn.onclick = () => {
                    const id = this.createTimer(saved.duration, saved.label, saved.description);
                    this.startTimer(id);
                    startBtn.textContent = '▶️ Running';
                    setTimeout(() => { startBtn.textContent = 'Start'; }, 2000);
                };
                row.appendChild(startBtn);

                const editBtn = document.createElement('button');
                editBtn.textContent = 'Edit';
                editBtn.className = 'timer-btn';
                editBtn.style.cssText = 'font-size: 11px; padding: 2px 6px; background: #f39c12; border-color: #e67e22;';
                editBtn.onclick = () => {
                    this.editSavedTimer(saved.id);
                };
                row.appendChild(editBtn);

                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = 'Delete';
                deleteBtn.className = 'timer-btn';
                deleteBtn.style.cssText = 'font-size: 11px; padding: 2px 6px; background: #e74c3c; border-color: #c0392b;';
                deleteBtn.onclick = () => {
                    this.deleteSavedTimer(saved.id);
                };
                row.appendChild(deleteBtn);

                suggestionsContainer.appendChild(row);
            });
        }

        instructionsArea.parentNode.insertBefore(suggestionsContainer, instructionsArea.nextSibling);
        console.log('✅ Timer suggestions container inserted with', regularSuggestions.length, 'suggestions and', this.savedRecipeTimers.length, 'saved timers');

    }

    /**
     * Edit a saved timer (stored in recipe)
     */
    editSavedTimer(timerId) {
        console.log(`🔧 Edit saved timer called for ID: ${timerId}`);
        
        // Find the saved timer in the current recipe's timers
        const savedTimer = this.savedRecipeTimers.find(t => t.id === timerId);
        
        if (!savedTimer) {
            console.log(`❌ Saved timer with ID ${timerId} not found`);
            alert(`Saved timer with ID ${timerId} not found`);
            return;
        }
        
        console.log(`✅ Editing saved timer: ${savedTimer.label} (${savedTimer.description})`);
        
        // Create edit modal
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;
            z-index: 10000;
        `;
        
        const currentMinutes = Math.floor(savedTimer.duration / 60);
        const currentSeconds = savedTimer.duration % 60;
        
        modal.innerHTML = `
            <div style="background: white; padding: 20px; border-radius: 10px; max-width: 400px; width: 90%;">
                <h3>✏️ Edit Saved Timer</h3>
                <div style="margin: 15px 0;">
                    <label>Duration:</label><br>
                    <input type="number" id="editSavedMinutes" value="${currentMinutes}" min="0" max="240" style="width: 80px; padding: 5px; margin-right: 10px;">
                    <span>minutes</span>
                    <input type="number" id="editSavedSeconds" value="${currentSeconds}" min="0" max="59" style="width: 80px; padding: 5px; margin: 0 10px;">
                    <span>seconds</span>
                </div>
                <div style="margin: 15px 0;">
                    <label>Description:</label><br>
                    <input type="text" id="editSavedDescription" value="${savedTimer.description || ''}" style="width: 100%; padding: 5px;">
                </div>
                <div style="margin-top: 20px; text-align: right;">
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" style="padding: 8px 15px; margin-right: 10px; background: #ccc; border: none; border-radius: 4px;">Cancel</button>
                    <button onclick="window.recipeTimers.saveSavedTimerEdit(${timerId}, this.parentElement.parentElement.parentElement)" style="padding: 8px 15px; background: #27ae60; color: white; border: none; border-radius: 4px;">Save</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Focus on minutes input
        setTimeout(() => document.getElementById('editSavedMinutes').focus(), 100);
    }

    /**
     * Save changes to a saved timer
     */
    async saveSavedTimerEdit(timerId, modal) {
        const savedTimer = this.savedRecipeTimers.find(t => t.id === timerId);
        if (!savedTimer) {
            alert('Timer not found');
            return;
        }

        const minutes = parseInt(document.getElementById('editSavedMinutes').value) || 0;
        const seconds = parseInt(document.getElementById('editSavedSeconds').value) || 0;
        const description = document.getElementById('editSavedDescription').value.trim();

        if (minutes === 0 && seconds === 0) {
            alert('Please enter a valid duration');
            return;
        }

        // Update saved timer
        const newDuration = (minutes * 60) + seconds;
        savedTimer.duration = newDuration;
        savedTimer.description = description || 'Timer';
        savedTimer.label = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        // Update in recipe data
        const recipeId = this.getCurrentRecipeId() || this.currentRecipeId;
        if (recipeId) {
            const recipesManager = await this.waitForRecipesManager();
            const recipe = recipesManager.getRecipeById(recipeId);
            
            if (recipe && recipe.timers) {
                const recipeTimerIndex = recipe.timers.findIndex(t => t.id === timerId);
                if (recipeTimerIndex >= 0) {
                    recipe.timers[recipeTimerIndex] = { ...savedTimer };
                    recipesManager.saveRecipes();
                    console.log(`✏️ Updated saved timer: ${savedTimer.label} (${savedTimer.description})`);
                }
            }
        }
        
        // Close modal and refresh display
        modal.remove();
        
        // Refresh timer display
        const instructions = document.getElementById('editRecipePreparation').value || '';
        this.addTimerButtonsToRecipe(instructions);
    }

    /**
     * Delete a saved timer from recipe
     */
    deleteSavedTimer(timerId) {
        const savedTimer = this.savedRecipeTimers.find(t => t.id === timerId);
        if (!savedTimer) {
            alert('Timer not found');
            return;
        }

        if (!confirm(`Delete saved timer "${savedTimer.label} (${savedTimer.description})"?`)) {
            return;
        }

        // Remove from in-memory list
        const savedIdx = this.savedRecipeTimers.findIndex(t => t.id === timerId);
        if (savedIdx >= 0) {
            this.savedRecipeTimers.splice(savedIdx, 1);
        }

        // Remove from recipe data
        this.removeTimerFromRecipe(timerId);

        console.log(`🗑️ Deleted saved timer: ${savedTimer.label} (${savedTimer.description})`);

        // Refresh timer display
        const instructions = document.getElementById('editRecipePreparation').value || '';
        this.addTimerButtonsToRecipe(instructions);
    }

    /**
     * Clear all timers
     */
    clearAllTimers() {
        this.timers.forEach(timer => {
            if (timer.interval) {
                clearInterval(timer.interval);
            }
        });
        this.timers.clear();
        this.savedRecipeTimers = [];
        this.currentRecipeId = null;

        const activeTimers = document.getElementById('activeTimers');
        if (activeTimers) {
            activeTimers.innerHTML = '';
        }

        // Clear any existing suggestions container
        const suggestionsContainer = document.getElementById('recipeTimerSuggestions');
        if (suggestionsContainer) {
            suggestionsContainer.innerHTML = '';
        }

        // Reset timer ID counter for new recipe context
        this.nextTimerId = 1;

        this.saveState();
    }

    /**
     * Get timer statistics
     */
    getStats() {
        const running = Array.from(this.timers.values()).filter(t => t.status === 'running').length;
        const paused = Array.from(this.timers.values()).filter(t => t.status === 'paused').length;
        const finished = Array.from(this.timers.values()).filter(t => t.status === 'finished').length;
        
        return { total: this.timers.size, running, paused, finished };
    }
}

// Initialize the timers system
console.log('🔧 About to initialize RecipeTimersManager...');
try {
    window.recipeTimers = new RecipeTimersManager();
    console.log('✅ RecipeTimersManager initialized successfully:', !!window.recipeTimers);
} catch (error) {
    console.error('❌ Failed to initialize RecipeTimersManager:', error);
}

// Expose functions for HTML onclick handlers
window.addRecipeTimer = (seconds, label) => window.recipeTimers.createTimer(seconds, label);

// Expose edit function for debugging
window.editTimer = (timerId) => window.recipeTimers.editTimer(timerId);

// Debug function to test editing
window.testTimerEdit = () => {
    console.log('Testing timer edit functionality...');

    // Create a test timer
    const timerId = window.recipeTimers.createTimer(1800, 'Test Timer', 'Test Description');
    console.log(`Created test timer with ID: ${timerId}`);

    // Try to edit it
    setTimeout(() => {
        console.log('Attempting to edit timer...');
        window.recipeTimers.editTimer(timerId);
    }, 1000);
};

console.log('Recipe Timers System loaded successfully!');
console.log('Debug functions available: testTimerEdit(), editTimer(id)');

