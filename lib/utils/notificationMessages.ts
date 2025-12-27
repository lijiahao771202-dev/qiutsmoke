/**
 * 智能通知文案生成器
 * 根据用户冥想统计数据生成个性化通知文案
 */

interface UserStats {
    totalSessions: number;
    totalMinutes: number;
    currentStreak: number;
    daysSinceLastMeditation: number;
    preferredHour?: number; // 最常冥想的小时
}

interface NotificationMessage {
    title: string;
    body: string;
}

// 基础正念文案（无统计数据时使用）
const BASE_MESSAGES: NotificationMessage[] = [
    { title: "🧘 冥想时刻", body: "给自己几分钟，回到当下" },
    { title: "🌿 呼吸提醒", body: "深呼吸三次，感受此刻" },
    { title: "✨ 正念邀请", body: "暂停一下，觉察你的身体" },
    { title: "🌸 宁静时光", body: "让思绪沉淀，让心灵休息" },
    { title: "🍃 轻柔提醒", body: "此刻，你可以选择平静" },
];

// 连续天数激励文案
const STREAK_MESSAGES: Record<string, NotificationMessage[]> = {
    early: [ // 1-3 天
        { title: "🌱 新旅程", body: "每一次冥想都是新的开始" },
        { title: "💫 继续保持", body: "你已经迈出了第一步" },
    ],
    building: [ // 4-7 天
        { title: "🔥 连续 {streak} 天", body: "你的习惯正在形成！" },
        { title: "⭐ 太棒了", body: "连续 {streak} 天，继续前进" },
    ],
    strong: [ // 8-14 天
        { title: "🏆 {streak} 天连续", body: "你的坚持令人敬佩" },
        { title: "💪 习惯养成", body: "{streak} 天的练习，你做到了" },
    ],
    master: [ // 15+ 天
        { title: "🎯 冥想大师", body: "连续 {streak} 天，了不起！" },
        { title: "🌟 {streak} 天成就", body: "你的内心越来越平静" },
    ],
};

// 断档唤回文案（根据断档天数）
const BREAK_MESSAGES: Record<string, NotificationMessage[]> = {
    short: [ // 2-3 天
        { title: "🌱 想念你", body: "已经 {days} 天了，今天来个 5 分钟？" },
        { title: "💫 温柔提醒", body: "你的冥想花园在等你" },
    ],
    medium: [ // 4-7 天
        { title: "🌿 回来吧", body: "冥想不需要完美，只需要开始" },
        { title: "🧘 {days} 天了", body: "一次呼吸，就是一次回归" },
    ],
    long: [ // 8+ 天
        { title: "🌸 新的开始", body: "每一天都是重新开始的机会" },
        { title: "✨ 欢迎回来", body: "你曾经做到过，你还可以" },
    ],
};

// 时段相关文案
const TIME_BASED_MESSAGES: Record<string, NotificationMessage[]> = {
    morning: [ // 5:00-11:00
        { title: "🌅 早安冥想", body: "用宁静开启新的一天" },
        { title: "☀️ 晨间正念", body: "让清晨的第一缕阳光照进内心" },
    ],
    afternoon: [ // 11:00-17:00
        { title: "🌤 午间休憩", body: "给忙碌的大脑一个喘息" },
        { title: "☕ 正念时刻", body: "暂停一下，重新充电" },
    ],
    evening: [ // 17:00-21:00
        { title: "🌆 傍晚冥想", body: "放下一天的疲惫" },
        { title: "🌙 归心时刻", body: "让身心在傍晚沉淀" },
    ],
    night: [ // 21:00-5:00
        { title: "🌙 夜间冥想", body: "在宁静中结束这一天" },
        { title: "✨ 晚安正念", body: "让平静伴你入眠" },
    ],
};

/**
 * 获取当前时段
 */
function getTimeOfDay(hour: number): "morning" | "afternoon" | "evening" | "night" {
    if (hour >= 5 && hour < 11) return "morning";
    if (hour >= 11 && hour < 17) return "afternoon";
    if (hour >= 17 && hour < 21) return "evening";
    return "night";
}

/**
 * 获取连续天数类别
 */
function getStreakCategory(streak: number): "early" | "building" | "strong" | "master" {
    if (streak <= 3) return "early";
    if (streak <= 7) return "building";
    if (streak <= 14) return "strong";
    return "master";
}

/**
 * 获取断档天数类别
 */
function getBreakCategory(days: number): "short" | "medium" | "long" {
    if (days <= 3) return "short";
    if (days <= 7) return "medium";
    return "long";
}

/**
 * 替换文案中的占位符
 */
function replacePlaceholders(message: NotificationMessage, data: { streak?: number; days?: number }): NotificationMessage {
    let title = message.title;
    let body = message.body;

    if (data.streak !== undefined) {
        title = title.replace("{streak}", String(data.streak));
        body = body.replace("{streak}", String(data.streak));
    }
    if (data.days !== undefined) {
        title = title.replace("{days}", String(data.days));
        body = body.replace("{days}", String(data.days));
    }

    return { title, body };
}

/**
 * 随机选择一个消息
 */
function pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * 生成每日提醒的智能文案
 * @param hour 提醒时间（小时）
 * @param stats 用户统计数据
 */
export function generateDailyReminderMessage(hour: number, stats?: UserStats): NotificationMessage {
    // 如果有连续天数，优先使用激励文案
    if (stats && stats.currentStreak > 0) {
        const category = getStreakCategory(stats.currentStreak);
        const messages = STREAK_MESSAGES[category];
        const message = pickRandom(messages);
        return replacePlaceholders(message, { streak: stats.currentStreak });
    }

    // 根据时段选择文案
    const timeOfDay = getTimeOfDay(hour);
    const timeMessages = TIME_BASED_MESSAGES[timeOfDay];

    // 50% 概率使用时段文案，50% 使用基础文案
    if (Math.random() > 0.5 && timeMessages) {
        return pickRandom(timeMessages);
    }

    return pickRandom(BASE_MESSAGES);
}

/**
 * 生成断档唤回的智能文案
 * @param daysSinceLastMeditation 距离上次冥想的天数
 * @param stats 用户统计数据
 */
export function generateBreakReminderMessage(daysSinceLastMeditation: number, stats?: UserStats): NotificationMessage {
    const category = getBreakCategory(daysSinceLastMeditation);
    const messages = BREAK_MESSAGES[category];
    const message = pickRandom(messages);
    return replacePlaceholders(message, { days: daysSinceLastMeditation });
}

/**
 * 批量生成多个不同的文案（用于多个提醒时间）
 * @param hours 提醒时间数组
 * @param stats 用户统计数据
 */
export function generateMultipleDailyMessages(hours: number[], stats?: UserStats): NotificationMessage[] {
    const usedTitles = new Set<string>();
    const messages: NotificationMessage[] = [];

    for (const hour of hours) {
        let attempts = 0;
        let message: NotificationMessage;

        // 尝试生成不重复的文案
        do {
            message = generateDailyReminderMessage(hour, stats);
            attempts++;
        } while (usedTitles.has(message.title) && attempts < 5);

        usedTitles.add(message.title);
        messages.push(message);
    }

    return messages;
}
