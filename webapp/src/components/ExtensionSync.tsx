"use client";

import { useEffect } from 'react';

export default function ExtensionSync({ token }: { token: string | undefined }) {
  useEffect(() => {
    if (token) {
      // Sync the JWT to the Chrome Extension
      window.postMessage({ type: 'LC_AUTH_TOKEN', token }, '*');
    } else {
      // If logged out, remove token from extension
      window.postMessage({ type: 'LC_AUTH_LOGOUT' }, '*');
    }
  }, [token]);

  return null;
}
