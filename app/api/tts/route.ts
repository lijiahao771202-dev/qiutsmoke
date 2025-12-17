import { EdgeTTS } from "node-edge-tts";
import os from "os";
import path from "path";
import fs from "fs";

export async function POST(req: Request) {
    try {
        const { text, voice, rate } = await req.json();
        if (!text || typeof text !== "string") {
            return new Response(JSON.stringify({ error: "缺少文本" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        const tts = new EdgeTTS({
            voice: voice || "zh-CN-XiaoxiaoNeural",
            lang: "zh-CN",
            outputFormat: "audio-24khz-48kbitrate-mono-mp3",
            rate: rate || "0%",
        });

        const tmp = path.join(
            os.tmpdir(),
            `tts-${Date.now()}-${Math.random().toString(36).slice(2)}.mp3`
        );

        await tts.ttsPromise(text, tmp);
        const buf = await fs.promises.readFile(tmp);
        try {
            await fs.promises.unlink(tmp);
        } catch { }

        return new Response(buf, {
            status: 200,
            headers: { "Content-Type": "audio/mpeg" },
        });
    } catch (e) {
        console.error("TTS API Error:", e);
        return new Response(JSON.stringify({
            error: "TTS 生成失败",
            details: e instanceof Error ? e.message : String(e),
            stack: e instanceof Error ? e.stack : undefined
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}

// Node.js runtime required for fs/os modules
// // export const runtime = 'edge'; // Disabled for stability // Disabled
