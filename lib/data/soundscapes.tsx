import React from 'react';
import {
    Trees, Waves, Flame, CloudRain, CloudLightning, Umbrella, Tent,
    Car, Train, Plane, Anchor, Building2, Store, Church,
    Coffee, Warehouse, Keyboard, Monitor, Clock, Fan,
    Radio, Activity, Signal, Zap, Dog, Cat, Bird,
    Bug, Music, Ghost
} from 'lucide-react';
import { BINAURAL_PRESETS } from '@/lib/hooks/useBinauralBeats';

// -----------------------------------------------------------------------------
// Type Definitions
// -----------------------------------------------------------------------------

export interface SoundPreset {
    id: string;
    label: string;
    description?: string; // Optional description (e.g. for binaural beats)
    icon: React.ReactNode;
    src: string; // Remote URL or local asset path
    category: string;
}

export interface SoundCategory {
    id: string;
    title: string;
    icon: React.ReactNode;
    sounds: SoundPreset[];
}

export type Categories = SoundCategory[];

// -----------------------------------------------------------------------------
// Helper: Remote Asset Path
// -----------------------------------------------------------------------------
// Use the repo's structure: /sounds/nature/river.mp3
// In production (Capacitor), this might point to the remote URL if configured.
// But for standard <audio> src, we can use relative paths within 'public'.
const getAssetPath = (path: string) => path;

// -----------------------------------------------------------------------------
// Sound Data (Ported from Moodist + Custom Binaural Integration)
// -----------------------------------------------------------------------------

export const SOUND_DATA: Categories = [
    {
        id: 'nature',
        title: '自然',
        icon: <Trees className="w-5 h-5" />,
        sounds: [
            { id: 'river', label: '河流', icon: <Waves className="w-5 h-5" />, src: '/sounds/moodist/nature/river.mp3', category: 'nature' },
            { id: 'waves', label: '海浪', icon: <Waves className="w-5 h-5" />, src: '/sounds/moodist/nature/waves.mp3', category: 'nature' },
            { id: 'campfire', label: '篝火', icon: <Flame className="w-5 h-5" />, src: '/sounds/moodist/nature/campfire.mp3', category: 'nature' },
            { id: 'wind', label: '风声', icon: <Zap className="w-5 h-5" />, src: '/sounds/moodist/nature/wind.mp3', category: 'nature' },
            { id: 'howling-wind', label: '呼啸风声', icon: <Zap className="w-5 h-5" />, src: '/sounds/moodist/nature/howling-wind.mp3', category: 'nature' },
            { id: 'wind-in-trees', label: '林间风', icon: <Trees className="w-5 h-5" />, src: '/sounds/moodist/nature/wind-in-trees.mp3', category: 'nature' },
            { id: 'waterfall', label: '瀑布', icon: <Waves className="w-5 h-5" />, src: '/sounds/moodist/nature/waterfall.mp3', category: 'nature' },
            { id: 'walk-in-snow', label: '踏雪', icon: <Activity className="w-5 h-5" />, src: '/sounds/moodist/nature/walk-in-snow.mp3', category: 'nature' },
            { id: 'walk-on-leaves', label: '落叶', icon: <Trees className="w-5 h-5" />, src: '/sounds/moodist/nature/walk-on-leaves.mp3', category: 'nature' },
            { id: 'droplets', label: '水滴', icon: <CloudRain className="w-5 h-5" />, src: '/sounds/moodist/nature/droplets.mp3', category: 'nature' },
            { id: 'jungle', label: '丛林', icon: <Trees className="w-5 h-5" />, src: '/sounds/moodist/nature/jungle.mp3', category: 'nature' },
        ]
    },
    {
        id: 'rain',
        title: '雨声',
        icon: <CloudRain className="w-5 h-5" />,
        sounds: [
            { id: 'light-rain', label: '小雨', icon: <CloudRain className="w-5 h-5" />, src: '/sounds/moodist/rain/light-rain.mp3', category: 'rain' },
            { id: 'heavy-rain', label: '大雨', icon: <CloudRain className="w-5 h-5" />, src: '/sounds/moodist/rain/heavy-rain.mp3', category: 'rain' },
            { id: 'thunder', label: '雷雨', icon: <CloudLightning className="w-5 h-5" />, src: '/sounds/moodist/rain/thunder.mp3', category: 'rain' },
            { id: 'rain-on-window', label: '窗边雨', icon: <CloudRain className="w-5 h-5" />, src: '/sounds/moodist/rain/rain-on-window.mp3', category: 'rain' },
            { id: 'rain-on-car-roof', label: '车顶雨', icon: <Car className="w-5 h-5" />, src: '/sounds/moodist/rain/rain-on-car-roof.mp3', category: 'rain' },
            { id: 'rain-on-umbrella', label: '伞下雨', icon: <Umbrella className="w-5 h-5" />, src: '/sounds/moodist/rain/rain-on-umbrella.mp3', category: 'rain' },
            { id: 'rain-on-tent', label: '帐篷雨', icon: <Tent className="w-5 h-5" />, src: '/sounds/moodist/rain/rain-on-tent.mp3', category: 'rain' },
        ]
    },
    {
        id: 'animals',
        title: '动物', // Moodist "Animals"
        icon: <Bird className="w-5 h-5" />,
        sounds: [
            { id: 'birds', label: '鸟鸣', icon: <Bird className="w-5 h-5" />, src: '/sounds/moodist/animals/birds.mp3', category: 'animals' },
            { id: 'seagulls', label: '海鸥', icon: <Bird className="w-5 h-5" />, src: '/sounds/moodist/animals/seagulls.mp3', category: 'animals' },
            { id: 'crickets', label: '蟋蟀', icon: <Bug className="w-5 h-5" />, src: '/sounds/moodist/animals/crickets.mp3', category: 'animals' },
            { id: 'wolf', label: '狼嚎', icon: <Dog className="w-5 h-5" />, src: '/sounds/moodist/animals/wolf.mp3', category: 'animals' },
            { id: 'owl', label: '猫头鹰', icon: <Bird className="w-5 h-5" />, src: '/sounds/moodist/animals/owl.mp3', category: 'animals' },
            { id: 'frog', label: '蛙鸣', icon: <Bug className="w-5 h-5" />, src: '/sounds/moodist/animals/frog.mp3', category: 'animals' },
            { id: 'cat-purring', label: '猫咪呼噜', icon: <Cat className="w-5 h-5" />, src: '/sounds/moodist/animals/cat-purring.mp3', category: 'animals' },
            { id: 'whale', label: '鲸鱼', icon: <Waves className="w-5 h-5" />, src: '/sounds/moodist/animals/whale.mp3', category: 'animals' },
        ]
    },
    {
        id: 'urban',
        title: '城市',
        icon: <Building2 className="w-5 h-5" />,
        sounds: [
            { id: 'highway', label: '高速路', icon: <Car className="w-5 h-5" />, src: '/sounds/moodist/urban/highway.mp3', category: 'urban' },
            { id: 'busy-street', label: '街道', icon: <Building2 className="w-5 h-5" />, src: '/sounds/moodist/urban/busy-street.mp3', category: 'urban' },
            { id: 'crowd', label: '人群', icon: <Activity className="w-5 h-5" />, src: '/sounds/moodist/urban/crowd.mp3', category: 'urban' },
            { id: 'traffic', label: '车流', icon: <Car className="w-5 h-5" />, src: '/sounds/moodist/urban/traffic.mp3', category: 'urban' },
            { id: 'fireworks', label: '烟花', icon: <Zap className="w-5 h-5" />, src: '/sounds/moodist/urban/fireworks.mp3', category: 'urban' },
        ]
    },
    {
        id: 'places',
        title: '场所',
        icon: <Store className="w-5 h-5" />,
        sounds: [
            { id: 'cafe', label: '咖啡馆', icon: <Coffee className="w-5 h-5" />, src: '/sounds/moodist/places/cafe.mp3', category: 'places' },
            { id: 'airport', label: '机场', icon: <Plane className="w-5 h-5" />, src: '/sounds/moodist/places/airport.mp3', category: 'places' },
            { id: 'church', label: '教堂', icon: <Church className="w-5 h-5" />, src: '/sounds/moodist/places/church.mp3', category: 'places' },
            { id: 'construction-site', label: '工地', icon: <Activity className="w-5 h-5" />, src: '/sounds/moodist/places/construction-site.mp3', category: 'places' },
            { id: 'underwater', label: '水下', icon: <Waves className="w-5 h-5" />, src: '/sounds/moodist/places/underwater.mp3', category: 'places' },
            { id: 'night-village', label: '夜村', icon: <Building2 className="w-5 h-5" />, src: '/sounds/moodist/places/night-village.mp3', category: 'places' },
            { id: 'library', label: '图书馆', icon: <Building2 className="w-5 h-5" />, src: '/sounds/moodist/places/library.mp3', category: 'places' },
        ]
    },
    {
        id: 'things',
        title: '物品',
        icon: <Keyboard className="w-5 h-5" />,
        sounds: [
            { id: 'keyboard', label: '键盘', icon: <Keyboard className="w-5 h-5" />, src: '/sounds/moodist/things/keyboard.mp3', category: 'things' },
            { id: 'typewriter', label: '打字机', icon: <Keyboard className="w-5 h-5" />, src: '/sounds/moodist/things/typewriter.mp3', category: 'things' },
            { id: 'clock', label: '时钟', icon: <Clock className="w-5 h-5" />, src: '/sounds/moodist/things/clock.mp3', category: 'things' },
            { id: 'wind-chimes', label: '风铃', icon: <Music className="w-5 h-5" />, src: '/sounds/moodist/things/wind-chimes.mp3', category: 'things' },
            { id: 'singing-bowl', label: '颂钵', icon: <Music className="w-5 h-5" />, src: '/sounds/moodist/things/singing-bowl.mp3', category: 'things' },
            { id: 'ceiling-fan', label: '吊扇', icon: <Fan className="w-5 h-5" />, src: '/sounds/moodist/things/ceiling-fan.mp3', category: 'things' },
            { id: 'boiling-water', label: '烧水', icon: <Coffee className="w-5 h-5" />, src: '/sounds/moodist/things/boiling-water.mp3', category: 'things' },
            { id: 'tuning-radio', label: '调频收音机', icon: <Radio className="w-5 h-5" />, src: '/sounds/moodist/things/tuning-radio.mp3', category: 'things' },
            { id: 'morse-code', label: '摩斯密码', icon: <Signal className="w-5 h-5" />, src: '/sounds/moodist/things/morse-code.mp3', category: 'things' },
            { id: 'vinyl-effect', label: '黑胶底噪', icon: <Music className="w-5 h-5" />, src: '/sounds/moodist/things/vinyl-effect.mp3', category: 'things' },
        ]
    },
    {
        id: 'transport',
        title: '交通',
        icon: <Train className="w-5 h-5" />,
        sounds: [
            { id: 'train', label: '火车', icon: <Train className="w-5 h-5" />, src: '/sounds/moodist/transport/train.mp3', category: 'transport' },
            { id: 'airplane', label: '飞机', icon: <Plane className="w-5 h-5" />, src: '/sounds/moodist/transport/airplane.mp3', category: 'transport' },
            { id: 'sailboat', label: '帆船', icon: <Anchor className="w-5 h-5" />, src: '/sounds/moodist/transport/sailboat.mp3', category: 'transport' },
        ]
    },
    {
        id: 'noise',
        title: '噪音',
        icon: <Ghost className="w-5 h-5" />,
        sounds: [
            { id: 'white-noise', label: '白噪音', icon: <Ghost className="w-5 h-5" />, src: '/sounds/moodist/noise/white-noise.wav', category: 'noise' },
            { id: 'pink-noise', label: '粉红噪音', icon: <Ghost className="w-5 h-5" />, src: '/sounds/moodist/noise/pink-noise.wav', category: 'noise' },
            { id: 'brown-noise', label: '红噪音', icon: <Ghost className="w-5 h-5" />, src: '/sounds/moodist/noise/brown-noise.wav', category: 'noise' },
        ]
    },
    // 🔥 NEW: Binaural Beats (Dynamic)
    {
        id: 'binaural',
        title: '双耳节拍',
        icon: <Activity className="w-5 h-5" />,
        // We map the existing BINAURAL_PRESETS to the sound structure.
        // The 'src' is dummy/special because handling is different.
        sounds: BINAURAL_PRESETS.map(preset => ({
            id: `binaural-${preset.id}`,
            label: preset.name,
            description: preset.description,
            icon: <Activity className="w-5 h-5" />,
            src: 'BINAURAL_DYNAMIC', // Special flag
            category: 'binaural',
            // Store original preset info for logic to use
            originalPreset: preset
        }))
    }
];
