const fs = require('fs');

const SUPABASE_URL = 'https://emgjxcqtnlkexpozmzzf.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtZ2p4Y3F0bmxrZXhwb3ptenpmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDMyMTAyOSwiZXhwIjoyMDc5ODk3MDI5fQ.QkMOLEKmiZz20wcdWzplMoTIpIScEzCZoMDuhw_7W4c';

async function backupTable(tableName) {
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?select=*`, {
            headers: {
                'apikey': SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
            }
        });
        
        if (!res.ok) {
            console.error(`Failed to fetch ${tableName}: ${res.status} ${res.statusText}`);
            return false;
        }
        
        const data = await res.json();
        fs.writeFileSync(`backup_${tableName}.json`, JSON.stringify(data, null, 2));
        console.log(`Successfully backed up ${data.length} records from ${tableName}.`);
        return true;
    } catch (e) {
        console.error(`Error backing up ${tableName}:`, e.message);
        return false;
    }
}

async function main() {
    console.log("Starting data backup using Supabase REST API...");
    const tables = [
        'tts_cards',
        'user_danger_times',
        'meditation_topics',
        'meditation_sessions',
        'push_subscriptions',
        'user_settings'
    ];
    
    for (const table of tables) {
        await backupTable(table);
    }
    console.log("Backup complete! Check the backup_*.json files in this folder.");
}

main();
