import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// 输出文件路径
const OUTPUT_FILE = path.join(process.cwd(), 'lib', 'data', 'meditation_vectors.json');

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { vectors } = body;

        if (!vectors || !Array.isArray(vectors)) {
            return NextResponse.json(
                { ok: false, error: "无效的向量数据格式" },
                { status: 400 }
            );
        }

        const dir = path.dirname(OUTPUT_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(vectors, null, 2), 'utf-8');

        return NextResponse.json({ 
            ok: true, 
            message: "向量库构建并保存成功", 
            count: vectors.length 
        });
    } catch (error: any) {
        console.error("Save vector DB failed:", error);
        return NextResponse.json(
            { ok: false, error: error.message || "内部服务器错误" },
            { status: 500 }
        );
    }
}
