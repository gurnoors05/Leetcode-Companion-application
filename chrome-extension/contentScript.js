/**
 * Content Script for LeetCode Companion App
 * Injected onto the main React App origin (e.g. https://leetcode-companion.app)
 * Listens for authentication tokens broadcasted by the web app.
 */

// Replace this with the actual production URL of your frontend
const TRUSTED_FRONTEND_ORIGIN = 'http://localhost:5173';

window.addEventListener('message', (event) => {
  // CRITICAL SECURITY CHECK:
  // Ensure the message is actually coming from our trusted web app origin.
  // This prevents malicious scripts on other origins from feeding fake tokens.
  if (event.origin !== TRUSTED_FRONTEND_ORIGIN) {
    return; // Ignore messages from untrusted origins
  }

  // Ensure the message format matches what we expect
  if (event.data && event.data.type === 'LC_COMPANION_AUTH') {
    const { accessToken } = event.data.payload;
    
    if (accessToken) {
      console.log('Received auth tokens from web app, sending to extension background script...');
      
      // Relay the token securely to the extension's background service worker
      // (which has access to chrome.storage)
      chrome.runtime.sendMessage(
        { type: 'STORE_AUTH_TOKENS', payload: { accessToken } },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('Error sending message to background script:', chrome.runtime.lastError);
          } else {
            console.log('Tokens successfully stored in extension.', response);
          }
        }
      );
    }
  }
});
