import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Auth Callback 路由
 * 处理 OAuth 登录回调和邮箱确认
 */
export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/'

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            // 登录成功，重定向到目标页面
            return NextResponse.redirect(`${origin}${next}`)
        }
    }

    // 如果没有 code 或交换失败，重定向到登录页
    return NextResponse.redirect(`${origin}/auth?error=auth_callback_failed`)
}
