// Robust Firebase Email/Password auth for the Sync tab with visible feedback
(function () {
  // Wait until Firebase is initialized
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  // Simple mobile debug for iPhone troubleshooting
  let debugPanel = null;
  let debugVisible = true;
  
  function createMobileDebugPanel() {
    if (!(/iPhone|iPad|iPod/i.test(navigator.userAgent)) || debugPanel) return;
    
    debugPanel = document.createElement('div');
    debugPanel.id = 'mobileDebugPanel';
    debugPanel.style.position = 'fixed';
    debugPanel.style.top = '60px';
    debugPanel.style.right = '5px';
    debugPanel.style.zIndex = '999999';
    debugPanel.style.background = '#000';
    debugPanel.style.color = '#0f0';
    debugPanel.style.padding = '5px';
    debugPanel.style.borderRadius = '3px';
    debugPanel.style.fontSize = '9px';
    debugPanel.style.fontFamily = 'monospace';
    debugPanel.style.maxWidth = '200px';
    debugPanel.style.maxHeight = '80px';
    debugPanel.style.overflowY = 'auto';
    debugPanel.style.border = '1px solid #333';
    
    // Add close functionality
    debugPanel.addEventListener('click', function() {
      if (debugVisible) {
        debugPanel.style.display = 'none';
        debugVisible = false;
      }
    });
    
    // Add initial content with version
    const version = document.title.includes('11.3.0') ? '11.3.0' : 'unknown';
    debugPanel.innerHTML = '<div style="color:#ff0;margin-bottom:2px;">📱 v' + version + ' (tap to close)</div>';
    
    document.body.appendChild(debugPanel);
  }
  
  function debugLog(msg) {
    console.log(msg);
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent) && debugPanel) {
      const logLine = document.createElement('div');
      logLine.textContent = new Date().toLocaleTimeString() + ': ' + msg;
      logLine.style.marginBottom = '2px';
      debugPanel.appendChild(logLine);
      debugPanel.scrollTop = debugPanel.scrollHeight;
    }
  }

  ready(() => {
    // Create mobile debug panel first
    createMobileDebugPanel();
    debugLog('🚀 Auth.js ready - DOM loaded');
    
    // iOS Firebase diagnostics
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      debugLog('🔍 iOS Diagnostics:');
      debugLog('Location: ' + window.location.protocol + '//' + window.location.hostname);
      debugLog('FIREBASE_DISABLED: ' + window.FIREBASE_DISABLED);
      debugLog('Scripts loading check in 2 seconds...');
      
      setTimeout(() => {
        debugLog('📦 Firebase objects after 2s:');
        debugLog('window.firebase: ' + !!window.firebase);
        debugLog('window.initializeSecureFirebase: ' + !!window.initializeSecureFirebase);
        
        // Check for script loading errors
        const scripts = document.querySelectorAll('script[src*="firebase"]');
        debugLog('Firebase scripts found: ' + scripts.length);
        
        if (scripts.length === 0) {
          debugLog('❌ No Firebase scripts loaded! Trying manual load...');
          // Try to manually load Firebase for iOS
          const testScript = document.createElement('script');
          testScript.src = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js';
          testScript.onload = () => debugLog('✅ Manual Firebase script loaded');
          testScript.onerror = () => debugLog('❌ Manual Firebase script failed');
          document.head.appendChild(testScript);
        }
      }, 2000);
    }
    
    const signedOut = document.getElementById('authSignedOut');
    const signedIn  = document.getElementById('authSignedIn');
    const emailEl   = document.getElementById('authEmail');
    const passEl    = document.getElementById('authPassword');
    const errEl     = document.getElementById('authError');
    const userEmail = document.getElementById('authUserEmail');
    const userUid   = document.getElementById('authUserUid');
    const copyUid   = document.getElementById('copyUidBtn');

    const signInBtn  = document.getElementById('signInBtn');
    const signOutBtn = document.getElementById('signOutBtn');

    const enableBtn  = document.getElementById('enableFirebaseBtn');
    const syncBtn    = document.getElementById('syncNowBtn');
    const disableBtn = document.getElementById('disableFirebaseBtn');
    
    debugLog('📋 Elements found: signInBtn=' + !!signInBtn + ', emailEl=' + !!emailEl + ', errEl=' + !!errEl);

    // TEST: Set up button styling BEFORE Firebase init (since initializeAuth might loop forever)
    if (signInBtn) {
      debugLog('🔧 EARLY button setup - before Firebase init');
      
      // Test user agent detection
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      debugLog('🔍 iOS detection: ' + isIOS);
      debugLog('🔍 User agent: ' + navigator.userAgent.substring(0, 50));
      
      // iOS button test - make button change color when clicked
      if (isIOS) {
        debugLog('📱 Applying iOS button styling...');
        signInBtn.style.backgroundColor = '#ff0000'; // Red to show we found it
        signInBtn.style.border = '3px solid #00ff00'; // Green border
        signInBtn.title = 'iOS Test Button - Should turn blue when clicked';
        debugLog('🎨 Button styling applied: red background, green border');
        
        // Add ALL event listeners here in early setup
        debugLog('👆 Adding iOS touch event listeners...');
        
        signInBtn.onclick = function() {
          debugLog('🔘 ONCLICK DETECTED!');
          signInBtn.style.backgroundColor = '#0000ff'; // Turn blue when clicked
        };
        
        signInBtn.addEventListener('touchstart', () => {
          debugLog('👆 TOUCHSTART DETECTED!');
        });
        
        signInBtn.addEventListener('touchend', () => {
          debugLog('👆 TOUCHEND DETECTED!');
        });
        
        signInBtn.addEventListener('click', (e) => {
          debugLog('🔘 CLICK EVENT DETECTED!');
          signInBtn.style.backgroundColor = '#0000ff'; // Turn blue
        });
        
        debugLog('✅ iOS event listeners added successfully');
        
        // iOS Firebase Auth Fix - manually initialize Firebase Auth
        debugLog('🔧 iOS: Attempting manual Firebase Auth initialization...');
        setTimeout(async () => {
          try {
            if (window.firebase && window.initializeSecureFirebase && !window.auth) {
              debugLog('📞 Calling initializeSecureFirebase manually for iOS...');
              await window.initializeSecureFirebase();
              debugLog('✅ Manual Firebase init completed. window.auth = ' + !!window.auth);
              
              if (window.auth) {
                debugLog('🎉 SUCCESS: Firebase Auth ready on iOS!');
                // Update error display
                showError('');
              }
            }
          } catch (error) {
            debugLog('❌ Manual Firebase init failed: ' + error.message);
          }
        }, 3000); // Wait 3 seconds for Firebase to fully load
      }
    }

    function showError(msg) {
      if (!errEl) return;
      errEl.textContent = msg || '';
      errEl.style.display = msg ? 'block' : 'none';
      
      // Enhanced mobile debugging - show device info in error
      if (msg && /iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        debugLog('❌ Auth Error: ' + msg);
        debugLog('Firebase: ' + (!!(window.firebase || window.auth)));
      }
    }
    function setButtonsEnabled(isAuthed) {
      if (enableBtn)  enableBtn.disabled  = !isAuthed;
      if (syncBtn)    syncBtn.disabled    = !isAuthed;
      if (disableBtn) disableBtn.disabled = !isAuthed;
    }

    // Function to initialize auth when Firebase is ready
    function initializeAuth() {
      debugLog('🔥 InitializeAuth called');
      // Special handling when Firebase disabled (e.g., Mac local dev)
      if (window.FIREBASE_DISABLED) {
        debugLog('🚫 Firebase disabled mode detected');
        console.log('🚫 auth.js: Firebase disabled - enabling dynamic load on sign-in');
        showError('Firebase authentication disabled in dev mode. Click sign in to connect.');

        if (signInBtn) {
          const manualHandler = async () => {
            try {
              showError('');
              signInBtn.textContent = 'Signing in…';
              signInBtn.disabled = true;

              const email = (emailEl && emailEl.value || '').trim();
              const pass  = (passEl  && passEl.value  || '').trim();
              if (!email || !pass) {
                showError('Enter email and password.');
                return;
              }

              // Dynamically load Firebase if available
              if (window.loadFirebaseDynamically) {
                await window.loadFirebaseDynamically();
              }
              if (window.initializeSecureFirebase) {
                await window.initializeSecureFirebase();
              }

              const auth = window.auth || (window.firebase && firebase.auth());
              if (!auth) {
                throw new Error('Firebase Auth not available');
              }

              await auth.signInWithEmailAndPassword(email, pass);

              // Firebase now enabled; remove handler and re-run initialization
              signInBtn.removeEventListener('click', manualHandler);
              initializeAuth();
            } catch (e) {
              console.error('auth.js sign-in error:', e);
              showError(e && e.message ? e.message : 'Sign-in failed');
            } finally {
              signInBtn.textContent = '🔑 Sign in';
              signInBtn.disabled = false;
            }
          };
          signInBtn.addEventListener('click', manualHandler);
        }
        return;
      }

      // Check if Firebase and auth are available (use window.auth which is set by initializeSecureFirebase)
      if (!window.auth && (!window.firebase || !firebase.auth)) {
        console.error('auth.js: Firebase Auth not available yet - retrying in 500ms');
        debugLog('❌ Firebase not ready: window.auth=' + !!window.auth + ', window.firebase=' + !!window.firebase);
        if (window.firebase) {
          debugLog('Firebase exists but firebase.auth=' + !!firebase.auth);
        }
        showError('Firebase initializing, please wait...');
        setTimeout(initializeAuth, 500); // Retry after 500ms
        return;
      }
      
      console.log('✅ Firebase Auth available - initializing authentication');
    const auth = window.auth || firebase.auth();

    // Listen for state changes
    auth.onAuthStateChanged((user) => {
      if (user) {
        if (signedOut) signedOut.style.display = 'none';
        if (signedIn)  signedIn.style.display  = 'block';
        if (userEmail) userEmail.textContent   = user.email || '(no email)';
        if (userUid)   userUid.textContent     = user.uid;
        setButtonsEnabled(true);
        showError('');
        console.log('✅ Authenticated as', user.uid);
      } else {
        if (signedOut) signedOut.style.display = 'block';
        if (signedIn)  signedIn.style.display  = 'none';
        setButtonsEnabled(false);
        console.log('ℹ️ Not signed in');
      }
    });

    // Sign in
    if (signInBtn) {
      debugLog('✅ Sign-in button found, adding listener');
      
      // Test user agent detection
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      debugLog('🔍 iOS detection: ' + isIOS);
      debugLog('🔍 User agent: ' + navigator.userAgent.substring(0, 50));
      
      // iOS button test - make button change color when clicked
      if (isIOS) {
        debugLog('📱 Applying iOS button styling...');
        signInBtn.style.backgroundColor = '#ff0000'; // Red to show we found it
        signInBtn.style.border = '3px solid #00ff00'; // Green border
        signInBtn.title = 'iOS Test Button - Should turn blue when clicked';
        debugLog('🎨 Button styling applied: red background, green border');
        
        // Multiple event listeners for iOS testing
        signInBtn.onclick = function() {
          debugLog('🔘 ONCLICK DETECTED!');
          signInBtn.style.backgroundColor = '#0000ff'; // Turn blue when clicked
        };
        
        signInBtn.addEventListener('touchstart', () => {
          debugLog('👆 TOUCHSTART DETECTED!');
        });
        
        signInBtn.addEventListener('touchend', () => {
          debugLog('👆 TOUCHEND DETECTED!');
        });
      }
      
      // Add click logging with simple confirmation
      signInBtn.addEventListener('click', (e) => {
        debugLog('🔘 BUTTON CLICK DETECTED!');
        debugLog('Button working: YES');
      });
      
      signInBtn.addEventListener('click', async () => {
        debugLog('🔘 Sign-in button clicked!');
        try {
          showError('');
          signInBtn.textContent = 'Signing in…';
          signInBtn.disabled = true;
          debugLog('🔄 Button state updated to "Signing in..."');
          
          // Enhanced iOS debugging
          const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
          if (isIOS) {
            debugLog('📱 iOS Sign-in attempt - checking auth objects...');
            debugLog('Auth object: ' + !!auth);
            debugLog('Firebase global: ' + !!window.firebase);
            debugLog('Auth global: ' + !!window.auth);
            debugLog('SignIn method: ' + (typeof auth?.signInWithEmailAndPassword));
          }
          
          const email = (emailEl && emailEl.value || '').trim();
          const pass  = (passEl  && passEl.value  || '').trim();
          if (!email || !pass) {
            showError('Enter email and password.');
            return;
          }
          
          // iOS-specific retry mechanism
          let signInResult;
          if (isIOS) {
            // Give Firebase extra time to initialize on iOS
            await new Promise(resolve => setTimeout(resolve, 100));
            if (!auth || typeof auth.signInWithEmailAndPassword !== 'function') {
              throw new Error('Firebase Auth not ready on iOS. Please try again.');
            }
          }
          
          signInResult = await auth.signInWithEmailAndPassword(email, pass);
          
          if (isIOS) {
            console.log('✅ iOS sign-in successful:', !!signInResult?.user);
          }
          
        } catch (e) {
          console.error('auth.js sign-in error:', e);
          const errorMsg = e && e.message ? e.message : 'Sign-in failed';
          showError(errorMsg);
          
          // iOS-specific error reporting
          if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
            console.log('📱 iOS Sign-in failed with details:', {
              error: errorMsg,
              code: e?.code,
              authAvailable: !!auth,
              methodAvailable: !!(auth && auth.signInWithEmailAndPassword)
            });
          }
        } finally {
          signInBtn.textContent = '🔑 Sign in';
          signInBtn.disabled = false;
        }
      });
    }

    // Sign out
    if (signOutBtn) {
      signOutBtn.addEventListener('click', async () => {
        try { await auth.signOut(); }
        catch (e) {
          console.error('auth.js sign-out error:', e);
          showError(e && e.message ? e.message : 'Sign-out failed');
        }
      });
    }

    // Copy UID
    if (copyUid) {
      copyUid.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(userUid.textContent || '');
          copyUid.textContent = 'Copied!';
          setTimeout(() => (copyUid.textContent = 'Copy UID'), 1200);
        } catch (e) {}
      });
    }

      // Disable buttons until auth known
      setButtonsEnabled(false);
      
      console.log('🔑 Firebase authentication initialized');
    } // End of initializeAuth function
    
    // Start the auth initialization
    debugLog('🚀 Starting auth initialization...');
    initializeAuth();
    
    // Check if we reach the end of the ready function
    debugLog('✅ Auth.js ready function completed');
  });
})();
