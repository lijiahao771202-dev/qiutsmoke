import { NextResponse } from "next/server";
import { NVIDIA_EMBEDDING_MODEL } from "@/lib/meditation-rag";
import {
  buildMeditationVectors,
  readMeditationSamples,
  saveMeditationVectors,
} from "@/lib/meditation-rag-node";

export async function POST() {
  try {
    const samples = readMeditationSamples();
    if (samples.length === 0) {
      return NextResponse.json(
        { ok: false, error: "没有可用的高质量样本，请先添加或保留默认样本。" },
        { status: 400 }
      );
    }

    const vectors = await buildMeditationVectors(samples);
    saveMeditationVectors(vectors);

    return NextResponse.json({
      ok: true,
      count: vectors.length,
      sampleCount: samples.length,
      model: NVIDIA_EMBEDDING_MODEL,
      message: "向量库构建完成",
    });
  } catch (error: any) {
    console.error("Save vector DB failed:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "内部服务器错误" },
      { status: 500 }
    );
  }
}
