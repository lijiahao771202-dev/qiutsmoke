import { NextResponse } from 'next/server'

// 极简 middleware - 不做任何认证检查，让页面切换更快
// 认证由各个页面/API自己处理
export async function middleware() {
    // 直接放行所有请求
    return NextResponse.next()
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder files (manifest.json, etc)
         */
        '/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
