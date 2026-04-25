import { NextResponse } from "next/server";
import fs from "fs";
import {
  parseMeditationSampleFile,
} from "@/lib/meditation-rag";
import { VECTOR_SAMPLES_DIR, VECTORS_FILE } from "@/lib/meditation-rag-node";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const full = searchParams.get('full') === 'true';

        const samples = [];
        if (fs.existsSync(VECTOR_SAMPLES_DIR)) {
            const files = fs.readdirSync(VECTOR_SAMPLES_DIR);
            for (const file of files) {
                if (file.endsWith('.md') || file.endsWith('.txt')) {
                    const filePath = `${VECTOR_SAMPLES_DIR}/${file}`;
                    const stats = fs.statSync(filePath);
                    const content = fs.readFileSync(filePath, 'utf-8');
                    const sample = parseMeditationSampleFile(file, content);
                    samples.push({
                        id: sample.id,
                        filename: file,
                        preview: sample.summary,
                        content: full ? content : undefined,
                        size: stats.size,
                        updatedAt: stats.mtime.toISOString(),
                        title: sample.title,
                        guidanceLevel: sample.guidanceLevel,
                        durationMinutes: sample.durationMinutes,
                    });
                }
            }
        }

        let vectorsBuilt = false;
        let vectorsCount = 0;
        let vectorsUpdatedAt = null;

        if (fs.existsSync(VECTORS_FILE)) {
            vectorsBuilt = true;
            const stats = fs.statSync(VECTORS_FILE);
            vectorsUpdatedAt = stats.mtime.toISOString();
            const data = JSON.parse(fs.readFileSync(VECTORS_FILE, 'utf-8'));
            vectorsCount = Array.isArray(data) ? data.length : 0;
        }

        // 排序：按更新时间倒序
        samples.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

        return NextResponse.json({
            ok: true,
            samples,
            status: {
                built: vectorsBuilt,
                count: vectorsCount,
                updatedAt: vectorsUpdatedAt
            }
        });
    } catch (error: any) {
        return NextResponse.json(
            { ok: false, error: error.message },
            { status: 500 }
        );
    }
}
