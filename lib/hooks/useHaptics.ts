import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { useCallback } from 'react';

export const useHaptics = () => {
    /**
     * 轻触 (Light): 像水滴落在水面
     * 场景: 按钮点击, 开关切换, 选项改变
     */
    const triggerLight = useCallback(async () => {
        try {
            await Haptics.impact({ style: ImpactStyle.Light });
        } catch (e) { }
    }, []);

    /**
     * 中度 (Medium): 标准的机械按键感
     * 场景: 重要按钮, 菜单展开
     */
    const triggerMedium = useCallback(async () => {
        try {
            await Haptics.impact({ style: ImpactStyle.Medium });
        } catch (e) { }
    }, []);

    /**
     * 重度 (Heavy): 深沉的心跳
     * 场景: 长按, 删除警告, 呼吸节拍
     */
    const triggerHeavy = useCallback(async () => {
        try {
            await Haptics.impact({ style: ImpactStyle.Heavy });
        } catch (e) { }
    }, []);

    /**
     * 成功 (Success): 上升的愉悦共鸣
     * 场景: 完成任务, 保存成功, 生成完成
     */
    const triggerSuccess = useCallback(async () => {
        try {
            await Haptics.notification({ type: NotificationType.Success });
        } catch (e) { }
    }, []);

    /**
     * 警告/错误 (Error): 快速的双重震动
     * 场景: 操作失败, 校验未通过
     */
    const triggerError = useCallback(async () => {
        try {
            await Haptics.notification({ type: NotificationType.Error });
        } catch (e) { }
    }, []);

    return {
        triggerLight,
        triggerMedium,
        triggerHeavy,
        triggerSuccess,
        triggerError
    };
};
