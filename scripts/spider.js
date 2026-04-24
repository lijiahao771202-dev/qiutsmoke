const fs = require('fs');
const path = require('path');
const { HttpsProxyAgent } = require('https-proxy-agent');

const PROXY = 'http://127.0.0.1:7897';
const agent = new HttpsProxyAgent(PROXY);
const OUTPUT_DIR = path.join(__dirname, '../lib/data/raw_scripts');

const delay = ms => new Promise(r => setTimeout(r, ms));

async function fetchHtml(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, { agent, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      if (i === 2) throw e;
      await delay(2000);
    }
  }
}

async function translateText(text) {
  if (!text || text.trim() === '') return '';
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=${encodeURIComponent(text)}`;
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, { agent, headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data[0].map(item => item[0]).join('');
    } catch (e) {
      if (i === 2) return text; // 返回原文
      await delay(2000);
    }
  }
}

async function scrapeAndTranslate() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log("正在从 mindfulnessexercises.com 抓取页面...");
  let html;
  try {
    html = await fetchHtml('https://mindfulnessexercises.com/free-guided-meditation-scripts/');
  } catch (e) {
    console.error("获取首页失败:", e);
    return;
  }

  const regex = /<a href="(https:\/\/mindfulnessexercises\.com\/[^"]+)"/g;
  let match;
  const links = new Set();
  while ((match = regex.exec(html)) !== null) {
    const link = match[1];
    if (link.includes('category') || link.includes('tag') || link.includes('author') || link.includes('page/')) continue;
    if (link !== 'https://mindfulnessexercises.com/free-guided-meditation-scripts/') {
      links.add(link);
    }
  }

  const uniqueLinks = Array.from(links).slice(0, 10); // 先抓10篇以防封锁，证明抓取有效
  console.log(`共找到候选脚本，本次演示抓取 ${uniqueLinks.length} 篇...`);

  let count = 0;
  for (let i = 0; i < uniqueLinks.length; i++) {
    const url = uniqueLinks[i];
    try {
      console.log(`[${i + 1}/${uniqueLinks.length}] 正在抓取: ${url}`);
      const pageHtml = await fetchHtml(url);
      
      const titleMatch = pageHtml.match(/<h1[^>]*>(.*?)<\/h1>/i);
      let title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : `Meditation_${i}`;
      
      const pRegex = /<p[^>]*>(.*?)<\/p>/gi;
      let pMatch;
      const paragraphs = [];
      while ((pMatch = pRegex.exec(pageHtml)) !== null) {
        const text = pMatch[1].replace(/<[^>]+>/g, '').trim();
        if (text.length > 30 && !text.includes('Copyright') && !text.includes('Mindfulness Exercises')) {
          paragraphs.push(text);
        }
      }

      if (paragraphs.length < 5) {
        console.log(`  -> 内容过少，跳过。`);
        continue;
      }

      const translatedTitle = await translateText(title);
      
      let translatedBody = '';
      // 将多个段落合并成较大的块来减少请求次数
      let chunk = "";
      for (const p of paragraphs) {
        if ((chunk.length + p.length) < 1500) {
            chunk += p + '\n\n';
        } else {
            const transChunk = await translateText(chunk);
            translatedBody += transChunk + '\n\n';
            chunk = p + '\n\n';
            await delay(1000); 
        }
      }
      if (chunk.length > 0) {
          const transChunk = await translateText(chunk);
          translatedBody += transChunk + '\n\n';
      }

      const markdown = `# ${translatedTitle}\n\n**来源**: 爬虫抓取 (${url})\n\n## 引导文案\n\n${translatedBody}`;
      const fileIndex = (count + 6).toString().padStart(2, '0');
      const safeTitle = translatedTitle.replace(/[:/\\*?"<>|]/g, '').trim() || `脚本_${i}`;
      const filename = `${fileIndex}_${safeTitle}.md`;
      
      fs.writeFileSync(path.join(OUTPUT_DIR, filename), markdown, 'utf8');
      console.log(`  ✅ 已保存: ${filename}`);
      count++;
      
      await delay(3000); // 整体延迟
    } catch (e) {
      console.error(`  ❌ 抓取失败 ${url}:`, e.message);
    }
  }

  console.log(`🎉 任务完成！真实爬取并翻译了 ${count} 篇文本，请检查。`);
}

scrapeAndTranslate();
