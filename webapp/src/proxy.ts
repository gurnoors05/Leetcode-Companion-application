import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  // Only apply CORS for API routes
  if (request.nextUrl.pathname.startsWith('/api')) {
    const response = NextResponse.next();
    const origin = request.headers.get('origin') || '';

    // Allow leetcode.com and chrome extension origins
    if (origin === 'https://leetcode.com' || origin.startsWith('chrome-extension://')) {
      response.headers.set("Access-Control-Allow-Origin", origin);
    } else {
      // Default to leetcode
      response.headers.set("Access-Control-Allow-Origin", "https://leetcode.com");
    }

    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Access-Control-Allow-Methods", "GET, DELETE, PATCH, POST, PUT, OPTIONS");
    response.headers.set(
      "Access-Control-Allow-Headers",
      "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
    );

    // Handle preflight OPTIONS request
    if (request.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 204,
        headers: response.headers,
      });
    }

    return response;
  }
}

export const config = {
  matcher: '/api/:path*',
};
