"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Database, Plus, RefreshCw, FileText, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

interface Sample {
    id: string;
    filename: string;
    preview: string;
    content?: string;
    size: number;
    updatedAt: string;
}

interface VectorStatus {
    built: boolean;
    count: number;
    updatedAt: string | null;
}

export default function VectorsAdminPage() {
    const router = useRouter();
    const [samples, setSamples] = useState<Sample[]>([]);
    const [status, setStatus] = useState<VectorStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // Build state
    const [isBuilding, setIsBuilding] = useState(false);
    const [buildProgress, setBuildProgress] = useState("");
    
    // Form state
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/admin/vectors/list");
            const data = await res.json();
            if (data.ok) {
                setSamples(data.samples);
                setStatus(data.status);
            }
        } catch (error) {
            console.error("Failed to fetch vectors data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSave = async () => {
        if (!title.trim() || !content.trim()) {
            setMessage({ type: 'error', text: '标题和内容不能为空' });
            return;
        }

        setIsSaving(true);
        setMessage(null);

        try {
            const res = await fetch("/api/admin/vectors/upload", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, content })
            });
            const data = await res.json();

            if (data.ok) {
                setMessage({ type: 'success', text: '保存成功！' });
                setTitle("");
                setContent("");
                fetchData(); // 刷新列表
            } else {
                setMessage({ type: 'error', text: data.error || '保存失败' });
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || '网络错误' });
        } finally {
            setIsSaving(false);
            setTimeout(() => setMessage(null), 3000);
        }
    };

    const handleBuild = async () => {
        setIsBuilding(true);
        setMessage(null);
        setBuildProgress("准备拉取完整样本数据...");

        try {
            // 1. 获取包含全文的完整列表
            const listRes = await fetch("/api/admin/vectors/list?full=true");
            const listData = await listRes.json();
            if (!listData.ok || listData.samples.length === 0) {
                throw new Error("没有可用的样本数据");
            }
            const fullSamples: Sample[] = listData.samples;

            setBuildProgress("初始化本地 AI 引擎 (首次会自动下载模型权重，请耐心等待 1-2 分钟)...");

            // 动态导入避免 SSR 报错，由于我们使用客户端进行向量提取，完全零 API 成本
            const { pipeline, env } = await import("@xenova/transformers");
            
            // 确保使用 CDN 获取模型（国内可用）
            env.allowLocalModels = false;
            env.useBrowserCache = true;

            // 加载轻量级中文向量模型
            const extractor = await pipeline('feature-extraction', 'Xenova/bge-small-zh-v1.5', {
                progress_callback: (info: any) => {
                    if (info.status === 'downloading') {
                        setBuildProgress(`正在下载模型: ${info.file} (${Math.round(info.progress || 0)}%)`);
                    } else if (info.status === 'ready') {
                        setBuildProgress("模型加载完成，准备生成向量...");
                    }
                }
            });

            const vectorDB = [];
            
            for (let i = 0; i < fullSamples.length; i++) {
                const sample = fullSamples[i];
                if (!sample.content) continue;
                
                setBuildProgress(`正在处理 (${i + 1}/${fullSamples.length}): ${sample.id}`);
                
                // 获取 Embedding
                const output = await extractor(sample.content, { pooling: 'cls', normalize: true });
                const embedding = Array.from(output.data);
                
                vectorDB.push({
                    id: sample.id,
                    tags: [sample.id],
                    content: sample.content,
                    embedding: embedding
                });
            }

            setBuildProgress("正在保存向量库...");

            // 将生成的向量保存到服务器
            const saveRes = await fetch("/api/admin/vectors/build", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ vectors: vectorDB })
            });
            const saveData = await saveRes.json();

            if (saveData.ok) {
                setMessage({ type: 'success', text: `构建成功！纯本地处理了 ${saveData.count} 条样本。` });
                fetchData();
            } else {
                throw new Error(saveData.error || '保存向量库失败');
            }
        } catch (error: any) {
            console.error(error);
            setMessage({ type: 'error', text: error.message || '构建过程中发生错误' });
        } finally {
            setIsBuilding(false);
            setBuildProgress("");
        }
    };

    return (
        <div className="min-h-screen bg-black text-white p-6 md:p-12 font-sans selection:bg-indigo-500/30">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => router.back()}
                            className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-white/70" />
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-indigo-500/20">
                                <Database className="w-6 h-6 text-indigo-400" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-medium tracking-tight">纯本地向量库管理</h1>
                                <p className="text-sm text-white/50 mt-1">完全不依赖外部 API 的本地终端侧 RAG 向量引擎</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                        <button
                            onClick={handleBuild}
                            disabled={isBuilding || isLoading}
                            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:hover:bg-indigo-500 rounded-xl font-medium transition-all shadow-lg shadow-indigo-500/20"
                        >
                            {isBuilding ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <RefreshCw className="w-4 h-4" />
                            )}
                            <span>{isBuilding ? "向量构建中..." : "纯本地构建向量库"}</span>
                        </button>
                        {isBuilding && buildProgress && (
                            <span className="text-xs text-indigo-400 animate-pulse font-mono max-w-[250px] truncate text-right">
                                {buildProgress}
                            </span>
                        )}
                    </div>
                </div>

                {/* Status Bar */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-4">
                        <div className="p-3 bg-blue-500/10 rounded-xl">
                            <FileText className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-sm text-white/50">本地样本数量</p>
                            <p className="text-2xl font-semibold mt-1">{samples.length}</p>
                        </div>
                    </div>
                    
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${status?.built ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
                            {status?.built ? (
                                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                            ) : (
                                <AlertCircle className="w-6 h-6 text-amber-400" />
                            )}
                        </div>
                        <div>
                            <p className="text-sm text-white/50">向量库状态</p>
                            <p className="text-lg font-medium mt-1">
                                {status?.built ? `已构建 (${status.count}条)` : "未构建"}
                            </p>
                        </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col justify-center">
                        <p className="text-sm text-white/50 mb-1">最后构建时间</p>
                        <p className="text-base text-white/80">
                            {status?.updatedAt ? new Date(status.updatedAt).toLocaleString() : "暂无记录"}
                        </p>
                    </div>
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* Add New Sample */}
                    <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 md:p-8 flex flex-col h-full">
                        <h2 className="text-xl font-medium mb-6 flex items-center gap-2">
                            <Plus className="w-5 h-5 text-indigo-400" />
                            添加新样本
                        </h2>
                        
                        <div className="space-y-5 flex-1 flex flex-col">
                            <div>
                                <label className="block text-sm text-white/60 mb-2">标题 (作为文件名标识)</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    placeholder="例如: 焦虑缓解_深度呼吸"
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                />
                            </div>
                            
                            <div className="flex-1 flex flex-col min-h-[300px]">
                                <label className="block text-sm text-white/60 mb-2">冥想引导文案</label>
                                <textarea
                                    value={content}
                                    onChange={e => setContent(e.target.value)}
                                    placeholder="请粘贴长篇冥想引导词稿件..."
                                    className="w-full flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all resize-none font-mono text-sm leading-relaxed"
                                />
                            </div>

                            {message && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
                                        message.type === 'success' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                                    }`}
                                >
                                    {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                    {message.text}
                                </motion.div>
                            )}

                            <button
                                onClick={handleSave}
                                disabled={isSaving || !title.trim() || !content.trim() || isBuilding}
                                className="w-full py-3 bg-white/10 hover:bg-white/15 disabled:opacity-50 disabled:hover:bg-white/10 rounded-xl font-medium transition-colors"
                            >
                                {isSaving ? "保存中..." : "保存文本"}
                            </button>
                        </div>
                    </div>

                    {/* Existing Samples */}
                    <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 md:p-8 flex flex-col h-full">
                        <h2 className="text-xl font-medium mb-6 flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <FileText className="w-5 h-5 text-indigo-400" />
                                现有样本池
                            </span>
                            <span className="text-sm font-normal text-white/40 bg-white/5 px-3 py-1 rounded-full">
                                {samples.length} 篇
                            </span>
                        </h2>

                        <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar" style={{ maxHeight: '500px' }}>
                            {isLoading ? (
                                <div className="flex justify-center items-center h-40 text-white/30">
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                </div>
                            ) : samples.length === 0 ? (
                                <div className="text-center py-12 text-white/30 border border-dashed border-white/10 rounded-2xl">
                                    暂无文本样本，请在左侧添加
                                </div>
                            ) : (
                                samples.map(sample => (
                                    <div key={sample.id} className="bg-black/40 border border-white/5 hover:border-white/15 p-4 rounded-xl transition-colors group">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-medium text-white/90 group-hover:text-indigo-300 transition-colors">
                                                {sample.id}
                                            </h3>
                                            <span className="text-xs text-white/30">
                                                {(sample.size / 1024).toFixed(1)} KB
                                            </span>
                                        </div>
                                        <p className="text-sm text-white/50 line-clamp-2 leading-relaxed">
                                            {sample.preview}
                                        </p>
                                        <p className="text-xs text-white/20 mt-3">
                                            修改于 {new Date(sample.updatedAt).toLocaleString()}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                </div>
            </div>
            
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.02);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.2);
                }
            `}</style>
        </div>
    );
}
