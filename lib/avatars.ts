/**
 * 预设头像数据 - 类似 iPhone 拟我表情风格
 * 使用 SVG 或 Emoji 组合实现可爱的卡通头像
 */

// 拟我表情风格头像 - 使用渐变和 emoji 组合
export const AVATAR_PRESETS = [
    // 动物系列
    { id: 'cat', emoji: '🐱', name: '小猫咪', bgGradient: 'from-orange-400 to-amber-500' },
    { id: 'dog', emoji: '🐶', name: '小狗狗', bgGradient: 'from-amber-400 to-yellow-500' },
    { id: 'panda', emoji: '🐼', name: '大熊猫', bgGradient: 'from-gray-100 to-gray-300' },
    { id: 'fox', emoji: '🦊', name: '小狐狸', bgGradient: 'from-orange-500 to-red-500' },
    { id: 'rabbit', emoji: '🐰', name: '小兔子', bgGradient: 'from-pink-300 to-pink-400' },
    { id: 'bear', emoji: '🐻', name: '小熊', bgGradient: 'from-amber-600 to-amber-700' },
    { id: 'koala', emoji: '🐨', name: '考拉', bgGradient: 'from-gray-400 to-gray-500' },
    { id: 'lion', emoji: '🦁', name: '狮子王', bgGradient: 'from-yellow-500 to-orange-500' },
    { id: 'tiger', emoji: '🐯', name: '小老虎', bgGradient: 'from-orange-500 to-amber-600' },
    { id: 'owl', emoji: '🦉', name: '猫头鹰', bgGradient: 'from-amber-700 to-amber-800' },

    // 自然系列
    { id: 'sun', emoji: '🌞', name: '小太阳', bgGradient: 'from-yellow-400 to-orange-400' },
    { id: 'moon', emoji: '🌙', name: '小月亮', bgGradient: 'from-indigo-400 to-purple-500' },
    { id: 'star', emoji: '⭐', name: '小星星', bgGradient: 'from-yellow-300 to-yellow-500' },
    { id: 'flower', emoji: '🌸', name: '樱花', bgGradient: 'from-pink-300 to-pink-500' },
    { id: 'rainbow', emoji: '🌈', name: '彩虹', bgGradient: 'from-red-400 via-yellow-400 to-blue-400' },
    { id: 'cloud', emoji: '☁️', name: '云朵', bgGradient: 'from-blue-200 to-blue-300' },
    { id: 'tree', emoji: '🌳', name: '大树', bgGradient: 'from-green-400 to-green-600' },
    { id: 'leaf', emoji: '🍃', name: '树叶', bgGradient: 'from-green-300 to-emerald-500' },

    // 食物系列
    { id: 'avocado', emoji: '🥑', name: '牛油果', bgGradient: 'from-green-400 to-green-600' },
    { id: 'peach', emoji: '🍑', name: '蜜桃', bgGradient: 'from-orange-300 to-pink-400' },
    { id: 'strawberry', emoji: '🍓', name: '草莓', bgGradient: 'from-red-400 to-red-500' },
    { id: 'grape', emoji: '🍇', name: '葡萄', bgGradient: 'from-purple-400 to-purple-600' },
    { id: 'watermelon', emoji: '🍉', name: '西瓜', bgGradient: 'from-green-400 to-red-400' },
    { id: 'lemon', emoji: '🍋', name: '柠檬', bgGradient: 'from-yellow-300 to-yellow-500' },

    // 表情系列
    { id: 'smile', emoji: '😊', name: '微笑', bgGradient: 'from-yellow-400 to-amber-400' },
    { id: 'cool', emoji: '😎', name: '酷', bgGradient: 'from-blue-400 to-indigo-500' },
    { id: 'angel', emoji: '😇', name: '天使', bgGradient: 'from-cyan-300 to-blue-400' },
    { id: 'heart-eyes', emoji: '😍', name: '心动', bgGradient: 'from-pink-400 to-rose-500' },
    { id: 'thinking', emoji: '🤔', name: '思考', bgGradient: 'from-amber-400 to-yellow-500' },
    { id: 'nerd', emoji: '🤓', name: '学霸', bgGradient: 'from-blue-400 to-cyan-500' },

    // 宇宙系列
    { id: 'rocket', emoji: '🚀', name: '火箭', bgGradient: 'from-slate-700 to-slate-900' },
    { id: 'alien', emoji: '👽', name: '外星人', bgGradient: 'from-green-400 to-teal-500' },
    { id: 'robot', emoji: '🤖', name: '机器人', bgGradient: 'from-gray-400 to-gray-600' },
    { id: 'ufo', emoji: '🛸', name: 'UFO', bgGradient: 'from-purple-500 to-indigo-600' },
    { id: 'crystal', emoji: '💎', name: '水晶', bgGradient: 'from-cyan-400 to-blue-500' },
    { id: 'magic', emoji: '✨', name: '魔法', bgGradient: 'from-purple-400 to-pink-500' },
];

// 默认头像
export const DEFAULT_AVATAR = AVATAR_PRESETS[0];

// 根据 ID 获取头像
export function getAvatarById(id: string) {
    return AVATAR_PRESETS.find(a => a.id === id) || DEFAULT_AVATAR;
}
