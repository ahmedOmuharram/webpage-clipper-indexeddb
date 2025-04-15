/**
 * Popup script for the Webpage Clipper extension
 * Handles user interaction with the popup UI
 */

document.addEventListener('DOMContentLoaded', () => {
  // Get UI elements
  const clipButton = document.getElementById('clipButton');
  const openSidebarButton = document.getElementById('openSidebar');
  
  // Clip the current page when the clip button is clicked
  clipButton.addEventListener('click', () => {
    // Query the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        // First check if content script is ready by sending a ping
        chrome.tabs.sendMessage(tabs[0].id, { action: 'ping' }, (response) => {
          if (chrome.runtime.lastError) {
            console.log('Need to inject content script first');
            // Content script isn't ready, inject it
            chrome.scripting.executeScript({
              target: { tabId: tabs[0].id },
              files: ['content.js']
            }, () => {
              if (chrome.runtime.lastError) {
                console.error('Failed to inject content script:', chrome.runtime.lastError);
                return;
              }
              // Now try to clip the page again
              setTimeout(() => clipPage(tabs[0].id), 100);
            });
          } else {
            // Content script is ready, clip the page
            clipPage(tabs[0].id);
          }
        });
      }
    });
  });
  
  // Helper function to clip the page
  function clipPage(tabId) {
    chrome.tabs.sendMessage(tabId, { action: 'clipPage' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error sending message:', chrome.runtime.lastError);
        return;
      }
      
      if (response && response.success) {
        // Show success message
        clipButton.textContent = 'Page Clipped!';
        setTimeout(() => {
          clipButton.textContent = 'Clip Current Page';
        }, 1500);
      }
    });
  }
  
  // Open the sidebar when the button is clicked
  openSidebarButton.addEventListener('click', () => {
    chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
    window.close(); // Close the popup
  });
});
