const { pipeline } = require('@xenova/transformers');

async function testLocalEmbedding() {
    console.log("Testing Local Embedding with Xenova/all-MiniLM-L6-v2...");
    try {
        const pipe = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
            // quantized: false 
        });

        const output = await pipe('This is a test sentence for embedding.', { pooling: 'mean', normalize: true });

        console.log("Success! Output tensor:", output);
        // data might be in output.data or direct
        const data = output.data;
        console.log("Embedding length:", data.length);

        if (data.length === 384) {
            console.log("✅ Verification Passed: Dimension is 384.");
        } else {
            console.error("❌ Verification Failed: Dimension mismatch.");
        }

    } catch (e) {
        console.error("Embedding generation failed:", e);
    }
}

testLocalEmbedding();
