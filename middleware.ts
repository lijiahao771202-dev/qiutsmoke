import { NextResponse } from 'next/server'

// 极简 middleware - 不做任何认证检查，让页面切换更快
// 认证由各个页面/API自己处理
export async function middleware() {
    // 直接放行所有请求
    return NextResponse.next()
}

export const config = {
    matcher: [
        // 只匹配需要特殊处理的路由，这里暂时留空
        // 如果需要重定向逻辑，在各个页面的 useEffect 中处理
        '/((?!_next|favicon.ico|.*\\.).*)',
    ],
}
