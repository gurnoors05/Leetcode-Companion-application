window.addEventListener('message', (event) => {
  // Verify origin matches our frontend
  if (event.origin !== 'http://localhost:3000') return;

  if (event.data?.type === 'LC_AUTH_TOKEN' && event.data?.token) {
    chrome.storage.local.set({ jwt: event.data.token }, () => {
      console.log('LC Companion: Auth token saved to extension storage');
    });
  } else if (event.data?.type === 'LC_AUTH_LOGOUT') {
    chrome.storage.local.remove('jwt', () => {
      console.log('LC Companion: Auth token removed from extension storage');
    });
  }
});
