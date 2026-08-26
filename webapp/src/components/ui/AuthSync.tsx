"use client";

import { useEffect } from "react";

export default function AuthSync({ token }: { token: string }) {
  useEffect(() => {
    if (token) {
      window.postMessage({ 
        type: 'LC_AUTH_TOKEN', 
        token: token 
      }, '*');
    }
  }, [token]);

  return null;
}
