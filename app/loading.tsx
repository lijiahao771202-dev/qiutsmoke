/**
 * 🚀 全局页面过渡 Loading
 * 
 * Next.js 在路由切换时会立即显示这个组件，
 * 让用户感觉页面"瞬间"切换了，消除微小的空白延迟。
 * 
 * 设计：极简透明过渡，不打断视觉流
 */
export default function Loading() {
    return (
        <div className="fixed inset-0 z-40 pointer-events-none">
            {/* 极微弱的呼吸脉冲，暗示正在加载 */}
            <div 
                className="absolute inset-0 bg-black/5"
                style={{
                    animation: 'pulse-subtle 1.5s ease-in-out infinite',
                }}
            />
            <style>{`
                @keyframes pulse-subtle {
                    0%, 100% { opacity: 0; }
                    50% { opacity: 1; }
                }
            `}</style>
        </div>
    );
}
