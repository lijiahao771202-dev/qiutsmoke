const VOICES = [
    { id: "zh-CN-XiaoxiaoNeural", name: "晓晓" },
    { id: "zh-CN-YunxiNeural", name: "云希" },
    { id: "zh-CN-YunjianNeural", name: "云健" },
    { id: "zh-CN-XiaoyiNeural", name: "晓伊" },
    { id: "zh-CN-YunyangNeural", name: "云野" },
    { id: "zh-CN-XiaohanNeural", name: "晓涵" },
    { id: "zh-CN-XiaomengNeural", name: "晓梦" },
    { id: "zh-CN-XiaomoNeural", name: "晓墨" },
    { id: "zh-CN-XiaoqiuNeural", name: "晓秋" },
    { id: "zh-CN-XiaoruiNeural", name: "晓睿" },
    { id: "zh-CN-XiaoxuanNeural", name: "晓萱" },
    { id: "zh-CN-XiaoyanNeural", name: "晓颜" },
    { id: "zh-CN-XiaoyouNeural", name: "晓悠" },
    { id: "zh-CN-YunfengNeural", name: "云枫" },
    { id: "zh-CN-YunhaoNeural", name: "云皓" },
    { id: "zh-CN-YunxiaNeural", name: "云夏" },
    { id: "zh-CN-YunyeNeural", name: "云野" },
    { id: "zh-CN-YunzeNeural", name: "云泽" },
    { id: "zh-CN-liaoning-XiaobeiNeural", name: "晓北" },
    { id: "zh-CN-shaanxi-XiaoniNeural", name: "晓妮" },
    { id: "zh-CN-shandong-YunxiangNeural", name: "云翔" },
    { id: "zh-CN-sichuan-YunxiNeural", name: "云希-四川" },
    { id: "zh-HK-HiuGaaiNeural", name: "HiuGaai" },
    { id: "zh-HK-WanLungNeural", name: "WanLung" },
    { id: "zh-TW-HsiaoChenNeural", name: "晓臻" },
    { id: "zh-TW-YunJheNeural", name: "云哲" }
];

async function testVoice(voice) {
    try {
        const res = await fetch("http://localhost:3000/api/tts-impl", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: "测试音频", voice: voice.id }),
        });
        
        if (res.ok) {
            const buffer = await res.arrayBuffer();
            console.log(`✅ ${voice.id}: Success (${buffer.byteLength} bytes)`);
            return true;
        } else {
            console.log(`❌ ${voice.id}: HTTP ${res.status}`);
            return false;
        }
    } catch (e) {
        console.log(`❌ ${voice.id}: Error (${e.message})`);
        return false;
    }
}

async function run() {
    let success = 0;
    let failed = 0;
    for (const voice of VOICES) {
        const isOk = await testVoice(voice);
        if (isOk) success++; else failed++;
    }
    console.log(`\nSummary: ${success} Passed, ${failed} Failed`);
}

run();
