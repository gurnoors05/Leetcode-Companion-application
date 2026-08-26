window.addEventListener('message', (event) => {
  // Verify origin matches our frontend
  const allowedOrigins = ['http://localhost:3000', 'https://leetcode-companion-application.vercel.app'];
  if (!allowedOrigins.includes(event.origin)) return;

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
