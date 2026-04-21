const fs = require('fs');

const newUrl = 'https://pcevqfegtkkwodmiwgwa.supabase.co';
const newServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjZXZxZmVndGtrd29kbWl3Z3dhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc3NjU2NiwiZXhwIjoyMDkyMzUyNTY2fQ.rY6O7sOg6qk2NOgiFyLV8QC6nP8a9v3ONUjPy2iY9BY';

async function main() {
    console.log("Uploading local mock_cards.json to tts_cards...");
    const mockCards = JSON.parse(fs.readFileSync('mock_cards.json', 'utf8'));
    
    // Set user_id to null for all cards so they are public system cards
    const payload = mockCards.map(c => ({
        id: c.id,
        title: c.title,
        content: c.content,
        voice_id: c.voice_id || 'zh-CN-XiaoxiaoNeural',
        rate: c.rate || '0%',
        created_at: c.created_at || new Date().toISOString()
    }));
    
    const insertRes = await fetch(`${newUrl}/rest/v1/tts_cards`, {
        method: 'POST',
        headers: {
            'apikey': newServiceKey,
            'Authorization': `Bearer ${newServiceKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        },
        body: JSON.stringify(payload)
    });
    
    if (!insertRes.ok) {
        console.error("Insert Error:", await insertRes.text());
    } else {
        console.log(`Successfully inserted ${payload.length} public records into tts_cards!`);
    }
}

main();
