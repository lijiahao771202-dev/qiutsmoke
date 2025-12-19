/**
 * 正念提醒文案模板库
 * 用于智能正念提醒系统
 */

export interface MindfulnessMessage {
    title: string;
    body: string;
    url?: string;
}

/**
 * 日常定时提醒文案
 * 用于用户设定的每日冥想提醒时间
 */
export const DAILY_MESSAGES: MindfulnessMessage[] = [
    { title: "🧘 正念时刻", body: "现在是你的冥想时间，3分钟呼吸锚定正等着你", url: "/meditate" },
    { title: "🌿 放慢脚步", body: "停下来，感受此刻的呼吸", url: "/meditate" },
    { title: "✨ 觉察时刻", body: "给自己几分钟，与当下连接", url: "/meditate" },
    { title: "🌅 晨间正念", body: "用一次深呼吸开启觉察的一天", url: "/meditate" },
    { title: "🌙 夜间放松", body: "睡前放下一天的疲惫，回归平静", url: "/meditate" },
    { title: "💫 正念邀请", body: "此刻，你愿意给自己几分钟吗？", url: "/meditate" },
    { title: "🍃 轻柔提醒", body: "呼吸是锚，此刻是岸", url: "/meditate" },
    { title: "🌊 内心平静", body: "像海洋一样，让波浪来去自如", url: "/meditate" },
];

/**
 * 高危时段提醒文案
 * 用于用户标记的容易想抽烟的时间段
 */
export const DANGER_MESSAGES: MindfulnessMessage[] = [
    { title: "🛡️ 正念警报", body: "感觉到压力了吗？试试RAIN快速版", url: "/meditate" },
    { title: "💪 你可以的", body: "冲动是暂时的，用呼吸锚定自己", url: "/meditate" },
    { title: "🌊 驾驭冲浪", body: "像冲浪一样驾驭这股冲动，它会过去的", url: "/meditate" },
    { title: "🔥 识别冲动", body: "RAIN：识别→允许→探究→不认同", url: "/meditate" },
    { title: "🧘 暂停一下", body: "深呼吸三次，观察身体的感受", url: "/meditate" },
    { title: "🌟 温柔提醒", body: "你已经走了这么远，继续坚持", url: "/meditate" },
    { title: "🎯 聚焦当下", body: "不是抗拒冲动，而是观察它", url: "/meditate" },
    { title: "🌈 这会过去的", body: "冲动像云，终会飘散", url: "/meditate" },
    { title: "💎 自我关怀", body: "对自己温柔一点，你正在做很棒的事", url: "/meditate" },
    { title: "⚡ 三分钟锚定", body: "现在做一个快速呼吸练习", url: "/meditate" },
];

/**
 * 冥想断档提醒文案
 * 用于用户连续多天未冥想时
 */
export const MISSED_MESSAGES: MindfulnessMessage[] = [
    { title: "🤗 想念你了", body: "你已经{days}天没冥想了，今天来一个身体扫描吧", url: "/meditate" },
    { title: "🌱 小步前进", body: "哪怕只有3分钟，也是对自己的善意", url: "/meditate" },
    { title: "🌻 不带评判", body: "没关系，现在开始也不晚", url: "/meditate" },
    { title: "💚 自我接纳", body: "不完美也没关系，重新开始就好", url: "/meditate" },
];

/**
 * 里程碑庆祝文案
 */
export const MILESTONE_MESSAGES: Record<number, MindfulnessMessage> = {
    7: { title: "🎉 7天连续冥想！", body: "太棒了！正念力量正在生长", url: "/stats" },
    14: { title: "🌟 两周坚持！", body: "你的专注力正在提升", url: "/stats" },
    30: { title: "🏆 一个月里程碑！", body: "冥想已成为你生活的一部分", url: "/stats" },
    100: { title: "💎 百日修行！", body: "你已经是正念大师了", url: "/stats" },
};

/**
 * 随机获取一条文案
 */
export function getRandomMessage(messages: MindfulnessMessage[]): MindfulnessMessage {
    const index = Math.floor(Math.random() * messages.length);
    return messages[index];
}

/**
 * 获取日常提醒文案
 */
export function getDailyMessage(): MindfulnessMessage {
    return getRandomMessage(DAILY_MESSAGES);
}

/**
 * 获取高危时段提醒文案
 */
export function getDangerMessage(): MindfulnessMessage {
    return getRandomMessage(DANGER_MESSAGES);
}

/**
 * 获取断档提醒文案（替换天数占位符）
 */
export function getMissedMessage(days: number): MindfulnessMessage {
    const msg = getRandomMessage(MISSED_MESSAGES);
    return {
        ...msg,
        body: msg.body.replace("{days}", String(days))
    };
}
