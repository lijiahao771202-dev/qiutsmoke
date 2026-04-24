const fs = require('fs');
const path = require('path');
const { pipeline, env } = require('@xenova/transformers');

// Prevent downloading to default cache dir if needed, but default is fine for node.
env.allowLocalModels = true; 

const RAW_SCRIPTS_DIR = path.join(__dirname, '..', 'lib', 'data', 'raw_scripts');
const VECTORS_FILE = path.join(__dirname, '..', 'lib', 'data', 'meditation_vectors.json');

async function main() {
    console.log("Loading feature-extraction pipeline...");
    const extractor = await pipeline('feature-extraction', 'Xenova/bge-small-zh-v1.5');
    
    console.log("Loading samples...");
    const files = fs.readdirSync(RAW_SCRIPTS_DIR).filter(f => f.endsWith('.md') || f.endsWith('.txt'));
    
    const vectorDB = [];
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const filePath = path.join(RAW_SCRIPTS_DIR, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const id = path.basename(file, path.extname(file));
        
        console.log(`Processing (${i + 1}/${files.length}): ${id}`);
        
        const output = await extractor(content, { pooling: 'cls', normalize: true });
        const embedding = Array.from(output.data);
        
        vectorDB.push({
            id: id,
            tags: [id],
            content: content,
            embedding: embedding
        });
    }
    
    fs.writeFileSync(VECTORS_FILE, JSON.stringify(vectorDB, null, 2));
    console.log(`Successfully built and saved vectors for ${vectorDB.length} samples to ${VECTORS_FILE}`);
}

main().catch(console.error);
