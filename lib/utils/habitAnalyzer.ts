/**
 * 习惯分析工具
 * 分析用户冥想习惯，推荐最佳冥想时间
 */

interface MeditationSession {
    id: string;
    duration_seconds: number;
    completed_at: string;
}

interface HourlyStats {
    hour: number;
    count: number;
    percentage: number;
}

/**
 * 分析冥想记录，找出用户最常冥想的时间段
 * @param sessions 最近的冥想记录
 * @returns 按冥想次数排序的小时统计
 */
export function analyzeMeditationHabits(sessions: MeditationSession[]): HourlyStats[] {
    if (!sessions || sessions.length === 0) {
        return [];
    }

    // 统计每个小时的冥想次数
    const hourCounts: Record<number, number> = {};

    for (const session of sessions) {
        const date = new Date(session.completed_at);
        const hour = date.getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    }

    // 转换为数组并排序
    const total = sessions.length;
    const stats: HourlyStats[] = Object.entries(hourCounts)
        .map(([hour, count]) => ({
            hour: parseInt(hour, 10),
            count,
            percentage: Math.round((count / total) * 100),
        }))
        .sort((a, b) => b.count - a.count);

    return stats;
}

/**
 * 获取推荐的提醒时间
 * 基于用户习惯，返回最常冥想的 1-3 个时间点
 * 推荐时间会比实际冥想时间提前 15 分钟
 * @param sessions 冥想记录
 * @param maxRecommendations 最多推荐几个时间
 */
export function getRecommendedTimes(
    sessions: MeditationSession[],
    maxRecommendations: number = 2
): string[] {
    const stats = analyzeMeditationHabits(sessions);

    if (stats.length === 0) {
        // 没有记录时返回默认推荐
        return ["08:00", "21:00"];
    }

    // 取前 N 个最常冥想的时间
    const topHours = stats
        .slice(0, maxRecommendations)
        .filter((s) => s.percentage >= 10); // 至少占 10% 的时间才推荐

    if (topHours.length === 0) {
        // 如果没有明显的习惯，返回排名第一的时间
        const topHour = stats[0].hour;
        return [formatTimeWithOffset(topHour, 0, -15)];
    }

    // 提前 15 分钟提醒
    return topHours.map((s) => formatTimeWithOffset(s.hour, 0, -15));
}

/**
 * 格式化时间，支持偏移
 */
function formatTimeWithOffset(hour: number, minute: number, offsetMinutes: number): string {
    let totalMinutes = hour * 60 + minute + offsetMinutes;

    // 处理跨天
    if (totalMinutes < 0) {
        totalMinutes += 24 * 60;
    } else if (totalMinutes >= 24 * 60) {
        totalMinutes -= 24 * 60;
    }

    const newHour = Math.floor(totalMinutes / 60);
    const newMinute = totalMinutes % 60;

    return `${String(newHour).padStart(2, "0")}:${String(newMinute).padStart(2, "0")}`;
}

/**
 * 计算距离上次冥想的天数
 * @param sessions 冥想记录（按时间倒序）
 */
export function getDaysSinceLastMeditation(sessions: MeditationSession[]): number {
    if (!sessions || sessions.length === 0) {
        return -1; // 没有记录
    }

    const lastSession = sessions[0];
    const lastDate = new Date(lastSession.completed_at);
    const now = new Date();

    const diffMs = now.getTime() - lastDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    return diffDays;
}
