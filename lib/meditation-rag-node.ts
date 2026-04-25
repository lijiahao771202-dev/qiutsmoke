import fs from "fs";
import path from "path";
import type { MeditationVectorRecord } from "./meditation-rag.ts";
import {
  chunkMeditationSample,
  embedTextsWithNvidia,
  parseMeditationSampleFile,
} from "./meditation-rag.ts";

export const VECTOR_SAMPLES_DIR = path.join(process.cwd(), "lib", "data", "vector_samples");
export const VECTORS_FILE = path.join(process.cwd(), "lib", "data", "meditation_vectors.json");

export function readMeditationSamples() {
  if (!fs.existsSync(VECTOR_SAMPLES_DIR)) {
    return [];
  }

  return fs
    .readdirSync(VECTOR_SAMPLES_DIR)
    .filter((file) => file.endsWith(".md") || file.endsWith(".txt"))
    .sort()
    .map((file) => {
      const raw = fs.readFileSync(path.join(VECTOR_SAMPLES_DIR, file), "utf-8");
      return parseMeditationSampleFile(file, raw);
    });
}

export async function buildMeditationVectors(samples = readMeditationSamples()) {
  const chunks = samples.flatMap((sample) => chunkMeditationSample(sample));
  const batchSize = 8;
  const vectors: MeditationVectorRecord[] = [];

  for (let index = 0; index < chunks.length; index += batchSize) {
    const batch = chunks.slice(index, index + batchSize);
    const embeddings = await embedTextsWithNvidia(batch.map((chunk) => chunk.searchableText));
    batch.forEach((chunk, batchIndex) => {
      vectors.push({
        ...chunk,
        embedding: embeddings[batchIndex] || [],
      });
    });
  }

  return vectors;
}

export function saveMeditationVectors(vectors: MeditationVectorRecord[]) {
  const dir = path.dirname(VECTORS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(VECTORS_FILE, JSON.stringify(vectors, null, 2), "utf-8");
}
