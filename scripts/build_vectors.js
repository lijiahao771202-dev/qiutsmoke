import fs from 'fs';
import path from 'path';

// ============================================================================
// ⚙️ 配置区
// ============================================================================

// 我们使用 SiliconFlow (硅基流动) 提供的 BGE-m3 API，兼容 OpenAI 格式。
// 它是目前调用 BGE 最好用、且免费额度极高的平台。
// 申请地址: https://cloud.siliconflow.cn/
const API_KEY = process.env.SILICONFLOW_API_KEY || 'sk-请在这里填入你的API_KEY';
const API_URL = 'https://api.siliconflow.cn/v1/embeddings';
const MODEL_NAME = 'BAAI/bge-m3';

// 输出文件路径
const OUTPUT_FILE = path.join(process.cwd(), 'lib', 'data', 'meditation_vectors.json');
const RAW_SCRIPTS_DIR = path.join(process.cwd(), 'lib', 'data', 'raw_scripts');

// ============================================================================
// 🧠 核心逻辑
// ============================================================================

/**
 * 从本地文件夹读取所有冥想文本
 */
function loadRawScripts() {
  const samples = [];
  
  if (!fs.existsSync(RAW_SCRIPTS_DIR)) {
    console.warn(`⚠️ 找不到文件夹 ${RAW_SCRIPTS_DIR}，请确保里面有 .md 或 .txt 文件`);
    return samples;
  }

  const files = fs.readdirSync(RAW_SCRIPTS_DIR);
  
  for (const file of files) {
    if (file.endsWith('.md') || file.endsWith('.txt')) {
      const filePath = path.join(RAW_SCRIPTS_DIR, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // 用文件名作为 ID，去掉后缀
      const id = path.basename(file, path.extname(file));
      
      samples.push({
        id: id,
        tags: [id], // 简单以文件名为标签，你也可以在文件头部加 YAML 来解析更多 metadata
        content: content
      });
    }
  }
  
  return samples;
}

/**
 * 调用 BGE API 获取向量
 */
async function getEmbedding(text) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
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

/**
 * 主函数：生成向量库
 */
async function buildVectorDB() {
  console.log(`🚀 开始构建本地向量库，使用模型: ${MODEL_NAME}...`);
  
  const rawSamples = loadRawScripts();
  if (rawSamples.length === 0) {
    console.error('❌ 没有找到任何样本数据，请在 lib/data/raw_scripts 中添加 .md 文件！');
    return;
  }

  const vectorDB = [];

  for (let i = 0; i < rawSamples.length; i++) {
    const sample = rawSamples[i];
    console.log(`⏳ 正在处理 [${i + 1}/${rawSamples.length}]: ${sample.id}`);
    
    try {
      // 获取向量
      const embedding = await getEmbedding(sample.content);
      
      // 存入结构中
      vectorDB.push({
        id: sample.id,
        tags: sample.tags,
        content: sample.content,
        embedding: embedding
      });
      
      // 稍微停顿，防止 API 频率限制
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`❌ 处理 ${sample.id} 时出错:`, error);
    }
  }

  // 确保目录存在
  const dir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // 写入 JSON 文件
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(vectorDB, null, 2), 'utf-8');
  console.log(`\n✅ 向量库构建成功！共保存 ${vectorDB.length} 条数据。`);
  console.log(`📁 文件位置: ${OUTPUT_FILE}`);
}

// 运行
buildVectorDB();
