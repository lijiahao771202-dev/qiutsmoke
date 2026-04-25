import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { VECTOR_SAMPLES_DIR } from "@/lib/meditation-rag-node";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { title, content } = body;

        if (!title || !content) {
            return NextResponse.json(
                { ok: false, error: "标题和内容不能为空" },
                { status: 400 }
            );
        }

        // 安全处理文件名，去除非法字符
        const safeTitle = title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, "_");
        const filename = `${Date.now()}_${safeTitle}.md`;

        // 确保目录存在
        if (!fs.existsSync(VECTOR_SAMPLES_DIR)) {
            fs.mkdirSync(VECTOR_SAMPLES_DIR, { recursive: true });
        }

        const filePath = path.join(VECTOR_SAMPLES_DIR, filename);
        fs.writeFileSync(filePath, content, "utf-8");

        return NextResponse.json({ ok: true, filename });
    } catch (error: any) {
        console.error("Save vector text failed:", error);
        return NextResponse.json(
            { ok: false, error: error.message || "内部服务器错误" },
            { status: 500 }
        );
    }
}
