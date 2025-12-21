console.log("1. Starting script...");
(async () => {
  try {
    console.log("2. Fetching...");
    const res = await fetch("http://localhost:3000/api/tts-impl", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "test", voice: "zh-CN-XiaoxiaoNeural" })
    });
    console.log("3. Status:", res.status);
    const txt = await res.text();
    console.log("4. Body length:", txt.length);
  } catch (e) {
    console.error("3. Error:", e);
  }
})();
