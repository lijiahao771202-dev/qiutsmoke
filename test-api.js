const req = {
    json: async () => ({
        mood: "calm",
        mode: "urge_surfing",
        elapsedTime: 0,
        totalTime: 900,
        sessionPhase: "start",
        diagnosisProfile: "test"
    })
};
const { POST } = require("./.next/server/app/api/generate-reminder/route.js");
POST(req).then(res => res.json()).then(console.log).catch(console.error);
