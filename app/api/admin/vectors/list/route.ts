import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const RAW_SCRIPTS_DIR = path.join(process.cwd(), 'lib', 'data', 'raw_scripts');
const VECTORS_FILE = path.join(process.cwd(), 'lib', 'data', 'meditation_vectors.json');

export async function GET() {
    try {
        const samples = [];
        if (fs.existsSync(RAW_SCRIPTS_DIR)) {
            const files = fs.readdirSync(RAW_SCRIPTS_DIR);
            for (const file of files) {
                if (file.endsWith('.md') || file.endsWith('.txt')) {
                    const filePath = path.join(RAW_SCRIPTS_DIR, file);
                    const stats = fs.statSync(filePath);
                    const content = fs.readFileSync(filePath, 'utf-8');
                    samples.push({
                        id: path.basename(file, path.extname(file)),
                        filename: file,
                        preview: content.substring(0, 100) + (content.length > 100 ? "..." : ""),
                        size: stats.size,
                        updatedAt: stats.mtime.toISOString(),
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
