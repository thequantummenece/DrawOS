// popup/popup.js - Manages the extension popup UI and communicates with background script.

document.addEventListener('DOMContentLoaded', () => {
  const toggleDrawingToolsBtn = document.getElementById('toggleDrawingToolsBtn');
  let areToolsActive = false; // Local state to track if tools are active on the current tab

  /**
   * Updates the text and styling of the toggle button based on the current state.
   */
  function updateToggleButtonUI() {
    if (areToolsActive) {
      toggleDrawingToolsBtn.textContent = 'Deactivate Drawing Tools';
      toggleDrawingToolsBtn.classList.add('active'); // Add 'active' class for styling (red)
    } else {
      toggleDrawingToolsBtn.textContent = 'Activate Drawing Tools';
      toggleDrawingToolsBtn.classList.remove('active'); // Remove 'active' class for styling (green)
    }
  }

  // Event listener for the main toggle button click
  toggleDrawingToolsBtn.addEventListener('click', () => {
    areToolsActive = !areToolsActive; // Toggle local state immediately for responsiveness
    updateToggleButtonUI(); // Update UI based on new local state

    // Send message to the background script to toggle the drawing tools on the active tab
    chrome.runtime.sendMessage({ action: 'toggleDrawingTools', activate: areToolsActive }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("ScreenDraw Popup: Error sending message to background:", chrome.runtime.lastError.message);
        // If background script is not reachable, revert UI state as action likely failed
        areToolsActive = !areToolsActive;
        updateToggleButtonUI();
      } else if (response) {
        // Sync with actual state received from background script (e.g., if injection failed)
        areToolsActive = response.isActive;
        updateToggleButtonUI();
      }
    });
  });

  // Listener for messages from the background script to sync UI state
  // This is important if the state changes due to other reasons (e.g., user clicks 'Hide Tools' on floating UI)
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'drawingToolsStateUpdate') {
      areToolsActive = message.isActive;
      updateToggleButtonUI();
    }
  });

  // Initial check: Request current state from background script when popup opens
  // This ensures the button's text and color are correct when the popup first appears.
  chrome.runtime.sendMessage({ action: 'getDrawingToolsState' }, (response) => {
    if (chrome.runtime.lastError) {
      console.error("ScreenDraw Popup: Error getting initial state from background:", chrome.runtime.lastError.message);
      // If background script isn't responsive, assume tools are inactive
      areToolsActive = false;
      updateToggleButtonUI();
    } else if (response && typeof response.isActive !== 'undefined') {
      areToolsActive = response.isActive;
      updateToggleButtonUI();
    }
  });
});
