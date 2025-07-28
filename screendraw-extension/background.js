// background.js - Service Worker for ScreenDraw Extension

// Stores the active state of drawing tools per tab.
// Map<tabId, boolean> where true means tools are currently active/injected.
let activeTabsDrawingState = new Map();

/**
 * Handles messages received from other parts of the extension (popup, content scripts).
 * @param {object} message - The message object.
 * @param {object} sender - Information about the sender of the message.
 * @param {function} sendResponse - Function to send a response back to the sender.
 * @returns {boolean} - True if sendResponse will be called asynchronously.
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Background: Received message:", message, "from sender:", sender);

  // Handle message to toggle drawing tools on a specific tab (from popup)
  if (message.action === "toggleDrawingTools") {
    const activate = message.activate;

    // When message comes from popup, sender.tab is undefined.
    // We need to query for the active tab explicitly.
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (chrome.runtime.lastError) {
        console.error("Background: Error querying active tab:", chrome.runtime.lastError.message);
        sendResponse({ success: false, error: "Could not find active tab." });
        return;
      }
      if (tabs.length === 0) {
        console.warn("Background: No active tab found to toggle drawing tools.");
        sendResponse({ success: false, error: "No active tab found." });
        return;
      }

      const tab = tabs[0];
      const tabId = tab.id;
      const tabUrl = tab.url;

      // Update internal state immediately based on intent
      activeTabsDrawingState.set(tabId, activate);
      console.log(`Background: Toggle tools for tab ${tabId} to ${activate}.`);

      // NEW: Send response to popup immediately, based on the intended action.
      // This breaks the dependency on the content script's response.
      sendResponse({ success: true, isActive: activate });

      // Use chrome.scripting.executeScript to directly call a function in main_content_script.js
      // This is more robust for initial activation/deactivation.
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tabId },
          function: (activateTools) => {
            // This function runs in the isolated world of main_content_script.js
            // It calls the globally exposed function from main_content_script.js
            if (typeof window.ScreenDrawMainContentScript !== 'undefined' && typeof window.ScreenDrawMainContentScript.handleToggleRequest !== 'undefined') {
              window.ScreenDrawMainContentScript.handleToggleRequest(activateTools);
            } else {
              console.error("ScreenDraw Background: main_content_script.js or its handler not found in isolated world.");
            }
          },
          args: [activate], // Pass the 'activate' argument to the function
          world: "ISOLATED" // Ensure this runs in the isolated world where main_content_script.js is
        });
        console.log(`Background: Successfully executed toggle function in main_content_script.js for tab ${tabId}.`);
      } catch (error) {
        console.error(`Background: Failed to execute toggle function in main_content_script.js for tab ${tabId}:`, error);
        // If execution fails, revert the state in background, as the action didn't complete.
        activeTabsDrawingState.set(tabId, !activate); // Revert state
        // Also inform popup if it's still open, as its state might be out of sync.
        chrome.runtime.sendMessage({ action: 'drawingToolsStateUpdate', isActive: !activate });
      }
    });
    return true; // Indicates that sendResponse will be called asynchronously
  }
  // Handle message to get the current drawing tools state for a tab (from popup)
  else if (message.action === 'getDrawingToolsState') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        console.error("Background: Error querying active tab for state:", chrome.runtime.lastError.message);
        sendResponse({ isActive: false, error: "Could not find active tab." });
        return;
      }
      if (tabs.length === 0) {
        sendResponse({ isActive: false, error: "No active tab found." });
        return;
      }
      const tabId = tabs[0].id;
      const isActive = activeTabsDrawingState.get(tabId) || false;
      console.log(`Background: Get tools state for tab ${tabId}: ${isActive}`);
      sendResponse({ isActive: isActive });
    });
    return true; // Indicates asynchronous response
  }
  // Handle state updates from the floating UI (e.g., when user clicks 'Hide Tools')
  // This message comes from floating_ui.js (main world) -> main_content_script.js (isolated world) -> background.js
  else if (message.action === 'floatingUiStateUpdate') {
    if (!sender.tab || typeof sender.tab.id === 'undefined') {
      console.error("Background: Received floatingUiStateUpdate from unexpected sender (no tab ID).", sender);
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
          const tabId = tabs[0].id;
          activeTabsDrawingState.set(tabId, message.isVisible);
          console.log(`Background: Floating UI state updated for fallback tab ${tabId}: ${message.isVisible}`);
          chrome.runtime.sendMessage({ action: 'drawingToolsStateUpdate', isActive: message.isVisible });
        }
      });
    } else {
      const tabId = sender.tab.id;
      activeTabsDrawingState.set(tabId, message.isVisible);
      console.log(`Background: Floating UI state updated for tab ${tabId}: ${message.isVisible}`);
      chrome.runtime.sendMessage({ action: 'drawingToolsStateUpdate', isActive: message.isVisible });
    }
  }
  // Handle cleanup confirmation from main world scripts (via main_content_script.js)
  else if (message.action === 'cleanupConfirmed') {
    if (!sender.tab || typeof sender.tab.id === 'undefined') {
      console.error("Background: Received cleanupConfirmed from unexpected sender (no tab ID).", sender);
    } else {
      console.log(`Background: Cleanup confirmed from tab ${sender.tab.id}.`);
    }
  }
});

/**
 * Cleans up the state when a tab is closed.
 * @param {number} tabId - The ID of the tab that was removed.
 */
chrome.tabs.onRemoved.addListener((tabId) => {
  activeTabsDrawingState.delete(tabId);
  console.log(`Background: Tab ${tabId} removed, state cleared.`);
});

/**
 * Resets the activeTabsDrawingState when the extension is installed or browser starts.
 * This prevents stale state across browser sessions or updates.
 */
chrome.runtime.onInstalled.addListener(() => {
  activeTabsDrawingState.clear();
  console.log('Background: Extension installed, states cleared.');
});
chrome.runtime.onStartup.addListener(() => {
  activeTabsDrawingState.clear();
  console.log('Background: Browser started, states cleared.');
});
