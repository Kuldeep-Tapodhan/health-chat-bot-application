import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Paths that require authentication
const protectedPaths = [
    '/dashboard',
    '/chat',
    '/reports',
    '/hospitals',
    '/admin'
];

// Paths that are public (auth not required)
const publicPaths = [
    '/',
    '/login',
    '/signup',
    '/reset-password'
];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Check if the path is protected
    const isProtected = protectedPaths.some(path => pathname.startsWith(path));

    // Get the auth token — stored as 'token' cookie (set alongside localStorage)
    const hasSession = request.cookies.has('token');

    // Redirect to login if accessing protected route without session
    if (isProtected && !hasSession) {
        const url = new URL('/login', request.url);
        url.searchParams.set('redirect', pathname);
        return NextResponse.redirect(url);
    }

    // Redirect to dashboard if accessing auth pages while logged in
    if (hasSession && (pathname === '/login' || pathname === '/signup')) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
