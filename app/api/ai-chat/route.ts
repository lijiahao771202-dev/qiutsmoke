import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
    return NextResponse.json({
        status: 'ok',
        message: 'Minimal Edge API reached successfully',
        timestamp: new Date().toISOString()
    });
}

export async function POST(req: Request) {
    return NextResponse.json({
        error: "Work in progress",
        message: "API is being rebuilt for stability"
    }, { status: 503 });
}

