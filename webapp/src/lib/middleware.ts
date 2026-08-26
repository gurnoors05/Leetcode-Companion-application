import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getJwtAccessSecret } from './env';

export type AuthenticatedRequest = NextRequest & {
  user?: any;
};

type RouteHandler = (
  req: AuthenticatedRequest,
  context: any
) => Promise<NextResponse> | NextResponse;

export function withAuth(handler: RouteHandler): RouteHandler {
  return async (req: AuthenticatedRequest, context: any) => {
    let token: string | undefined;

    // 1. Try to read from HttpOnly cookie
    const cookieToken = req.cookies.get('jwt_token')?.value;
    if (cookieToken) {
      token = cookieToken;
    } else {
      // 2. Fallback to Authorization header
      const authHeader = req.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    try {
      const payload = jwt.verify(token, getJwtAccessSecret(), { algorithms: ['HS256'] });
      req.user = payload;
      return await handler(req, context);
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        return NextResponse.json({ error: 'Token expired' }, { status: 401 });
      }
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
  };
}

export function withOptionalAuth(handler: RouteHandler): RouteHandler {
  return async (req: AuthenticatedRequest, context: any) => {
    let token: string | undefined;

    // 1. Try to read from HttpOnly cookie
    const cookieToken = req.cookies.get('jwt_token')?.value;
    if (cookieToken) {
      token = cookieToken;
    } else {
      // 2. Fallback to Authorization header
      const authHeader = req.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    if (token) {
      try {
        const payload = jwt.verify(token, getJwtAccessSecret(), { algorithms: ['HS256'] });
        req.user = payload;
      } catch (error: any) {
        // Ignore invalid token, just leave req.user undefined
      }
    }

    return await handler(req, context);
  };
}

export function withValidation(schemas: { body?: any; query?: any; params?: any }) {
  return function (handler: RouteHandler): RouteHandler {
    return async (req: AuthenticatedRequest, context: any) => {
      try {
        if (schemas.params && context.params) {
          // Wait, context.params in Next.js 16 is a Promise (or sync depending on exact version), 
          // usually in Next.js App Router we await it or it's resolved before. Let's assume standard behavior.
          // Wait, context.params is a Promise in Next.js 15+! 
          // Let's resolve it first to be safe.
          const params = await Promise.resolve(context.params);
          context.params = schemas.params.parse(params);
        }
        
        if (schemas.query) {
          const url = new URL(req.url);
          const queryParams = Object.fromEntries(url.searchParams.entries());
          // Parse string values based on schema. zod might need coercion, which we added in validators.ts
          context.query = schemas.query.parse(queryParams);
        }

        if (schemas.body) {
          // Need to clone the request or safely parse JSON, since we can only read body once.
          // In App router we usually `await req.json()`
          const body = await req.json().catch(() => ({}));
          context.body = schemas.body.parse(body);
        }

        return await handler(req, context);
      } catch (error: any) {
        if (error && error.name === 'ZodError') {
          const issues = error.errors || error.issues || [];
          const formattedErrors = issues.map((err: any) => ({
            path: err.path.join('.'),
            message: err.message,
          }));
          return NextResponse.json({
            error: 'Validation failed',
            details: formattedErrors,
          }, { status: 400 });
        }
        console.error('Validation unexpected error:', error);
        return NextResponse.json({ error: 'Internal server error during validation' }, { status: 500 });
      }
    };
  };
}
