import { createRoot, Root } from 'react-dom/client';
import Popup from './components/Popup';
import FailedPopup from './components/FailedPopup';
import tailwindCss from './index.css?inline';

let root: Root | null = null;
let shadowMountPoint: HTMLDivElement | null = null;

// Wait for body to be available to inject shadow root
const interval = setInterval(() => {
  if (document.body) {
    clearInterval(interval);
    
    // Inject our UI container
    const container = document.createElement('div');
    container.id = 'lc-companion-root';
    // Use fixed positioning so it overlays nicely, or absolute if needed
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.pointerEvents = 'none'; // let clicks pass through the overlay bg initially
    container.style.zIndex = '999999';
    document.body.appendChild(container);

    const shadowRoot = container.attachShadow({ mode: 'open' });
    
    const styleElement = document.createElement('style');
    styleElement.textContent = tailwindCss;
    shadowRoot.appendChild(styleElement);

    shadowMountPoint = document.createElement('div');
    shadowRoot.appendChild(shadowMountPoint);
    root = createRoot(shadowMountPoint);
  }
}, 100);

// Listen for the accepted and failed events from the main world interceptor
window.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'LC_COMPANION_ACCEPTED') {
    console.log('LC Companion: Received ACCEPTED event in content script!', event.data.payload);
    if (root && shadowMountPoint) {
      const payload = event.data.payload;
      
      const closePopup = () => {
        root?.render(null);
      };

      root.render(
        <Popup 
          data={payload} 
          onClose={closePopup} 
        />
      );
    }
  } else if (event.data && event.data.type === 'LC_COMPANION_FAILED') {
    console.log('LC Companion: Received FAILED event in content script!', event.data.payload);
    if (root && shadowMountPoint) {
      const payload = event.data.payload;
      
      const closePopup = () => {
        root?.render(null);
      };

      root?.render(
        <FailedPopup 
          data={payload} 
          onClose={closePopup} 
        />
      );
    }
  }
});
