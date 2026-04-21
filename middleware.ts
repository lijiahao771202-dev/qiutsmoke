import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * 超轻量级 Middleware
 * - 只在需要认证的页面才检查 session
 * - 其他页面直接放行
 */
export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // 需要认证的页面
    const protectedPaths = ['/meditate', '/stats', '/push-test'];
    const needsAuth = protectedPaths.some(path => pathname === path || pathname.startsWith(path + '/'));

    // 不需要认证的页面直接放行
    if (!needsAuth) {
        return NextResponse.next();
    }

    let response = NextResponse.next({
        request: { headers: request.headers },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    response = NextResponse.next({
                        request: { headers: request.headers },
                    })
                    cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
                },
            },
        }
    )

    // "Zero Latency" 策略：getSession 最多等 200ms
    // 超时则直接放行，让前端 AuthGuard 处理鉴权
    // 这样即使 Supabase 慢，页面切换也不会被阻塞
    const SESSION_TIMEOUT = 200;
    await Promise.race([
        supabase.auth.getSession(),
        new Promise(resolve => setTimeout(resolve, SESSION_TIMEOUT)),
    ])

    return response
}

export const config = {
    matcher: [
        // 匹配所有页面路由，排除静态资源和 API
        '/((?!_next/static|_next/image|favicon.ico|api|manifest.json|sw.js|icon-|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|js|css|json)$).*)',
    ],
}


