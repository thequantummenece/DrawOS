// content/main_content_script.js - Acts as a bridge between background and main world scripts.
// This script is injected by manifest.json into the ISOLATED world.

// Flag to track if the main world scripts (drawing_core.js, floating_ui.js) have been injected.
// They are injected ONCE per page load and then their elements/listeners are managed.
let mainWorldScriptsInjected = false;

const SCRIPT_ID_CORE = 'screendraw-drawing-core-script';
const SCRIPT_ID_UI = 'screendraw-floating-ui-script';

/**
 * Injects a JavaScript file into the page's main world by creating a <script> tag.
 * This is a common and reliable pattern for MV3 content scripts to run code in the page's context.
 * @param {string} filePath - The path to the JavaScript file (relative to extension root).
 * @param {string} id - A unique ID for the script element.
 * @returns {Promise<void>} A promise that resolves when the script is loaded, or rejects on error.
 */
function injectScriptIntoMainWorld(filePath, id) {
  return new Promise((resolve, reject) => {
    if (document.getElementById(id)) {
      console.warn(`ScreenDraw Main Content Script: Script with ID ${id} already exists. Skipping injection.`);
      resolve(); // Already injected, resolve immediately
      return;
    }
    const s = document.createElement('script');
    s.src = chrome.runtime.getURL(filePath); // Get the full URL for the extension resource
    s.id = id;
    s.onload = () => {
      console.log(`ScreenDraw Main Content Script: Successfully loaded and injected ${filePath} into main world.`);
      resolve();
    };
    s.onerror = (e) => {
      console.error(`ScreenDraw Main Content Script: Failed to load and inject ${filePath}. Error:`, e);
      reject(e);
    };
    (document.head || document.documentElement).appendChild(s); // Append to head or document element
    console.log(`ScreenDraw Main Content Script: Attempting to inject ${filePath} into main world.`);
  });
}

/**
 * Toggles the visibility and interaction of the drawing tools (canvas and toolbar)
 * by sending a message to the main world scripts.
 * @param {boolean} activate - True to activate/show, false to deactivate/hide.
 */
function toggleDrawingToolsVisibility(activate) {
  // Send a message to the main world scripts (drawing_core.js and floating_ui.js)
  // to tell them to show/hide their elements and activate/deactivate interaction.
  window.postMessage({ type: 'SCREEN_DRAW_TOGGLE_VISIBILITY_REQUEST', show: activate }, '*');
  console.log(`ScreenDraw Main Content Script: Sent toggle visibility request to main world: ${activate}`);
}

/**
 * Initializes the main world scripts (drawing_core.js and floating_ui.js) ONCE.
 * This should only be called if they haven't been injected yet.
 * @returns {Promise<void>} A promise that resolves when both scripts are injected.
 */
async function initializeMainWorldScripts() {
  if (mainWorldScriptsInjected) {
    console.log('ScreenDraw Main Content Script: Main world scripts already initialized.');
    return;
  }
  console.log('ScreenDraw Main Content Script: Initializing main world scripts...');
  try {
    // Inject core first, then UI, ensuring order for dependency
    await injectScriptIntoMainWorld('content/drawing_core.js', SCRIPT_ID_CORE);
    await injectScriptIntoMainWorld('content/floating_ui.js', SCRIPT_ID_UI);
    mainWorldScriptsInjected = true;
    console.log('ScreenDraw Main Content Script: Main world script injection sequence complete.');
  } catch (error) {
    console.error('ScreenDraw Main Content Script: Error during main world script injection:', error);
    mainWorldScriptsInjected = false; // Mark as not fully injected on error
  }
}

/**
 * Handles the toggle request from the background script.
 * This function is exposed globally in the isolated world for chrome.scripting.executeScript.
 * @param {boolean} activate - True to activate tools, false to deactivate.
 */
async function handleToggleRequest(activate) {
  console.log(`ScreenDraw Main Content Script: handleToggleRequest received with activate: ${activate}`);
  await initializeMainWorldScripts(); // Ensure scripts are injected and ready

  if (mainWorldScriptsInjected) { // Only toggle if injection was successful
    toggleDrawingToolsVisibility(activate);
  } else {
    console.error("ScreenDraw Main Content Script: Cannot toggle visibility, main world scripts not injected.");
  }
}

// --- Message Listeners ---

// Listen for messages from the background script (via chrome.tabs.sendMessage)
// This is the primary way the background script communicates with this content script.
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  console.log("ScreenDraw Main Content Script: Received message from background (chrome.runtime.onMessage):", message);
  // This listener is primarily for ping/pong or other non-critical messages.
  // The main toggle is now handled by chrome.scripting.executeScript calling handleToggleRequest.

  if (message.action === 'ping') { // Respond to ping messages for readiness check
    sendResponse({ status: 'pong' });
    console.log("ScreenDraw Main Content Script: Responded to ping.");
    return true; // Asynchronous response
  }
  // This content script might also listen for requests from background to get its state
  else if (message.action === 'getDrawingToolsState') {
    sendResponse({ isActive: mainWorldScriptsInjected }); // Report if scripts are injected
    return true; // Asynchronous response
  }
});

// Listen for messages from the Main World scripts (drawing_core.js, floating_ui.js)
// These messages are sent using window.postMessage for cross-world communication.
window.addEventListener('message', (event) => {
  // Ensure the message is from the expected source (the page itself) and has the correct type
  if (event.source === window && event.data) {
    if (event.data.type === 'SCREEN_DRAW_CLEANUP_CONFIRMED') {
      console.log('ScreenDraw Main Content Script: Cleanup confirmed by main world scripts.');
      // Inform background script that cleanup is complete
      chrome.runtime.sendMessage({ action: 'cleanupConfirmed' });
    }
    // Forward state updates from floating_ui.js to background.js
    else if (event.data.type === 'SCREEN_DRAW_FLOATING_UI_STATE_UPDATE') {
      chrome.runtime.sendMessage({ action: 'floatingUiStateUpdate', isVisible: event.data.isVisible });
    }
  }
});

console.log('ScreenDraw Main Content Script: Initialized in isolated world. Waiting for toggle message from background...');

// Expose the handleToggleRequest function globally in the isolated world
// so that background.js can call it directly via chrome.scripting.executeScript.
window.ScreenDrawMainContentScript = {
  handleToggleRequest: handleToggleRequest
};
