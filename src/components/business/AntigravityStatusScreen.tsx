import React, { useState, useEffect } from 'react';
import { Activity, RefreshCw, Power, Server, ShieldAlert, Loader2 } from 'lucide-react';
import './AntigravityStatusScreen.css';

interface AntigravityStatusScreenProps {
    onRetry?: () => void;
}

type Variant = 'nebula' | 'tech' | 'minimal';

export const AntigravityStatusScreen: React.FC<AntigravityStatusScreenProps> = ({ onRetry }) => {
    // 默认使用 'nebula' 风格，你可以修改这里或者添加 UI 来切换
    const [variant, setVariant] = useState<Variant>('minimal');
    const [dots, setDots] = useState('');

    // 简单的打点动画
    useEffect(() => {
        const interval = setInterval(() => {
            setDots(prev => prev.length >= 3 ? '' : prev + '.');
        }, 500);
        return () => clearInterval(interval);
    }, []);

    // 渲染不同的变体
    const renderVariant = () => {
        switch (variant) {
            case 'tech':
                return <TechVariant dots={dots} onRetry={onRetry} />;
            case 'minimal':
                return <MinimalVariant dots={dots} onRetry={onRetry} />;
            case 'nebula':
            default:
                return <NebulaVariant dots={dots} onRetry={onRetry} />;
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center font-sans">
            {renderVariant()}

            {/* 风格切换器 (开发调试用，实际发布可隐藏) */}
            <div className="absolute bottom-4 right-4 flex gap-2 opacity-20 hover:opacity-100 transition-opacity">
                <button onClick={() => setVariant('nebula')} className={`px-2 py-1 text-xs rounded ${variant === 'nebula' ? 'bg-white text-black' : 'bg-black text-white'}`}>Nebula</button>
                <button onClick={() => setVariant('tech')} className={`px-2 py-1 text-xs rounded ${variant === 'tech' ? 'bg-green-500 text-black' : 'bg-black text-green-500'}`}>Tech</button>
                <button onClick={() => setVariant('minimal')} className={`px-2 py-1 text-xs rounded ${variant === 'minimal' ? 'bg-gray-200 text-black' : 'bg-gray-800 text-white'}`}>Minimal</button>
            </div>
        </div>
    );
};

// ==========================================
// 变体 1: 星云 (Nebula) - 现代、深色、高级感
// ==========================================
const NebulaVariant = ({ dots, onRetry }: { dots: string, onRetry?: () => void }) => (
    <div className="ag-nebula-bg w-full h-full flex items-center justify-center text-white">
        <div className="ag-nebula-orb ag-nebula-orb-1"></div>
        <div className="ag-nebula-orb ag-nebula-orb-2"></div>

        <div className="ag-nebula-content relative z-10 p-10 rounded-2xl max-w-md w-full text-center mx-4">
            <div className="mb-8 relative inline-block">
                <div className="absolute inset-0 bg-blue-500 blur-xl opacity-20 rounded-full animate-pulse"></div>
                <div className="relative bg-gradient-to-br from-blue-500 to-purple-600 p-4 rounded-full shadow-lg">
                    <Activity className="w-10 h-10 text-white animate-pulse" />
                </div>
            </div>

            <h2 className="text-3xl font-bold mb-3 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-200">
                Antigravity 未在运行
            </h2>

            <p className="text-blue-200/70 mb-8 text-lg font-light">
                或者正在重新启动{dots}
            </p>

            <div className="space-y-3">
                <div className="flex items-center justify-center gap-2 text-sm text-blue-300/50 bg-black/20 py-2 px-4 rounded-full mx-auto w-fit">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>自动检测中</span>
                </div>

                {onRetry && (
                    <button
                        onClick={onRetry}
                        className="mt-4 px-6 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-sm transition-all duration-200"
                    >
                        手动刷新
                    </button>
                )}
            </div>
        </div>
    </div>
);

// ==========================================
// 变体 2: 科技 (Tech) - 黑客、矩阵风格
// ==========================================
const TechVariant = ({ dots, onRetry }: { dots: string, onRetry?: () => void }) => (
    <div className="ag-tech-bg w-full h-full flex items-center justify-center text-[#00ff46] font-mono">
        <div className="ag-tech-scanner"></div>

        <div className="ag-tech-card relative z-10 p-8 rounded-lg max-w-md w-full text-center mx-4 border border-[#00ff46]/30">
            <div className="mb-6 flex justify-center">
                <Server className="w-12 h-12 text-[#00ff46]" />
            </div>

            <h2 className="text-2xl font-bold mb-4 uppercase tracking-widest">
                SYSTEM OFFLINE
            </h2>

            <div className="mb-6 text-[#00ff46]/80 text-sm">
                <p className="mb-2">ERROR: CONNECTION_LOST</p>
                <p className="mb-4">MSG: Antigravity 未在运行 或者 正在重新启动{dots}</p>
            </div>

            <div className="h-1 w-full bg-[#003300] rounded-full overflow-hidden mb-6">
                <div className="h-full bg-[#00ff46] w-1/3 animate-[shimmer_2s_infinite]"></div>
            </div>

            <div className="flex flex-col gap-4 items-center">
                <div className="text-xs text-[#00ff46]/50">
                    TARGET: ANTIGRAVITY_CORE<br />
                    PORT: SCANNING...
                </div>

                {onRetry && (
                    <button
                        onClick={onRetry}
                        className="group relative px-6 py-2 bg-[#003300] hover:bg-[#004400] border border-[#00ff46] text-[#00ff46] text-sm font-bold uppercase tracking-wider transition-all duration-200 hover:shadow-[0_0_10px_rgba(0,255,70,0.5)]"
                    >
                        <span className="flex items-center gap-2">
                            <RefreshCw className="w-4 h-4 group-hover:animate-spin" />
                            RETRY_CONNECTION
                        </span>
                    </button>
                )}
            </div>
        </div>
    </div>
);

// ==========================================
// 变体 3: 极简 (Minimal) - 干净、苹果风格
// ==========================================
const MinimalVariant = ({ dots, onRetry }: { dots: string, onRetry?: () => void }) => (
    <div className="ag-minimal-bg w-full h-full flex items-center justify-center bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors duration-300">
        <div className="ag-minimal-circle ag-minimal-circle-1"></div>
        <div className="ag-minimal-circle ag-minimal-circle-2"></div>
        <div className="ag-minimal-circle ag-minimal-circle-3"></div>

        <div className="relative z-10 text-center max-w-sm mx-auto px-6">
            <div className="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 shadow-sm">
                <Power className="w-8 h-8 text-slate-400 dark:text-slate-500" />
            </div>

            <h2 className="text-2xl font-semibold mb-2">
                服务未启动
            </h2>

            <p className="text-slate-500 dark:text-slate-400 mb-8">
                Antigravity 似乎没有在运行，或者正在重启中。请稍候{dots}
            </p>

            <div className="flex justify-center">
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-full text-xs font-medium text-slate-400 dark:text-slate-500">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    正在等待服务响应
                </div>
            </div>
        </div>
    </div>
);
