import { POST } from './app/api/generate-reminder/route.ts';
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
POST(req as any).then(async res => {
    console.log(res.status);
    console.log(await res.text());
}).catch(console.error);
