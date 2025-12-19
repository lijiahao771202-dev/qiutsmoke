import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * 优化的 Middleware - 最小化延迟版本
 * - 使用 getSession() 代替 getUser()（只读 Cookie，不发网络请求）
 * - 只在首次访问和需要认证的请求时验证
 */
export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // 快速跳过不需要处理的路径（无需创建Supabase客户端）
    const skipPaths = [
        '/auth',           // 登录页本身
        '/api/',           // API 路由
        '/_next/',         // Next.js 内部资源
        '/favicon',        // 图标
        '/manifest',       // PWA manifest
        '/sw.js',          // Service Worker
        '/icon-',          // PWA icons
    ];

    if (skipPaths.some(path => pathname.startsWith(path))) {
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

    // 使用 getSession() 而不是 getUser()
    // getSession() 只读取 Cookie，不发网络请求，速度更快
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
        // 只匹配页面路由，排除所有静态资源
        '/((?!_next/static|_next/image|favicon.ico|api|auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|js|css|json)$).*)',
    ],
}
