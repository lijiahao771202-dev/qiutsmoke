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
    const protectedPaths = ['/meditate', '/stats', '/tts-studio', '/push-test'];
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

    // 使用 getSession() 只读取 Cookie，不发网络请求
    const { data: { session } } = await supabase.auth.getSession()

    // 如果没有 session，重定向到登录页
    if (!session) {
        const redirectUrl = new URL('/auth', request.url)
        redirectUrl.searchParams.set('next', pathname)
        return NextResponse.redirect(redirectUrl)
    }

    return response
}

export const config = {
    matcher: [
        // 匹配所有页面路由，排除静态资源和 API
        '/((?!_next/static|_next/image|favicon.ico|api|manifest.json|sw.js|icon-|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|js|css|json)$).*)',
    ],
}


