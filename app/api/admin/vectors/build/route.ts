import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const API_KEY = process.env.SILICONFLOW_API_KEY || ''; // 建议在 .env.local 中配置
const API_URL = 'https://api.siliconflow.cn/v1/embeddings';
const MODEL_NAME = 'BAAI/bge-m3';

// 输出文件路径
const OUTPUT_FILE = path.join(process.cwd(), 'lib', 'data', 'meditation_vectors.json');
const RAW_SCRIPTS_DIR = path.join(process.cwd(), 'lib', 'data', 'raw_scripts');

/**
 * 从本地文件夹读取所有冥想文本
 */
function loadRawScripts() {
    const samples = [];
    if (!fs.existsSync(RAW_SCRIPTS_DIR)) return samples;

    const files = fs.readdirSync(RAW_SCRIPTS_DIR);
    for (const file of files) {
        if (file.endsWith('.md') || file.endsWith('.txt')) {
            const filePath = path.join(RAW_SCRIPTS_DIR, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            const id = path.basename(file, path.extname(file));
            samples.push({
                id: id,
                tags: [id],
                content: content
            });
        }
    }
    return samples;
}

/**
 * 调用 BGE API 获取向量
 */
async function getEmbedding(text: string) {
    if (!API_KEY) throw new Error("SILICONFLOW_API_KEY 未配置，请先在代码或环境变量中配置。");

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${API_KEY.startsWith('sk-') ? API_KEY : 'sk-' + API_KEY}`, // 简单容错
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: MODEL_NAME,
            input: text,
            encoding_format: 'float'
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API 请求失败: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
}

export async function POST(req: Request) {
    try {
        const rawSamples = loadRawScripts();
        if (rawSamples.length === 0) {
            return NextResponse.json(
                { ok: false, error: "没有找到任何样本数据，请先添加文件" },
                { status: 400 }
            );
        }

        const vectorDB = [];

        for (let i = 0; i < rawSamples.length; i++) {
            const sample = rawSamples[i];
            const embedding = await getEmbedding(sample.content);
            vectorDB.push({
                id: sample.id,
                tags: sample.tags,
                content: sample.content,
                embedding: embedding
            });
            // 稍微停顿，防止 API 频率限制
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        const dir = path.dirname(OUTPUT_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(vectorDB, null, 2), 'utf-8');

        return NextResponse.json({ 
            ok: true, 
            message: "向量库构建成功", 
            count: vectorDB.length 
        });
    } catch (error: any) {
        console.error("Build vector DB failed:", error);
        return NextResponse.json(
            { ok: false, error: error.message || "内部服务器错误" },
            { status: 500 }
        );
    }
}
