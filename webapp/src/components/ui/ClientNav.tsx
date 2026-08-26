"use client";

import Link from 'next/link';

export default function ClientNav() {
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.postMessage({ type: 'LC_AUTH_LOGOUT' }, '*');
    window.location.href = '/login';
  };

  return (
    <div className="flex items-center gap-4">
      <Link href="/" className="text-gray-300 hover:text-white transition-colors">Dashboard</Link>
      <button 
        onClick={handleLogout}
        className="text-gray-300 hover:text-white transition-colors"
      >
        Logout
      </button>
    </div>
  );
}
