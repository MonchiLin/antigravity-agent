import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";
import { Clock, HelpCircle } from 'lucide-react';
import ClaudeIcon from '@/assets/icons/claude.png'
import GeminiImageIcon from '@/assets/icons/nano_banana.png'
import GeminiProIcon from '@/assets/icons/gemini_pro.png'
import GeminiFlashIcon from '@/assets/icons/gemini_flash.png'
import dayjs from "dayjs";
import { Tooltip } from "antd";

type LiquidProgressBarType = 'gemini-pro' | 'gemini-flash' | 'claude' | 'gemini-image';

interface LiquidProgressBarProps {
    type: LiquidProgressBarType;
    /**
     * 0-1. If 1, timer is hidden. -1 for unknown.
     */
    percentage: number;
    /**
     * ISO Date string (e.g. "2025-12-18T20:19:38Z")
     */
    resetIn?: string;
    className?: string;
}

// Configuration for each type
const typeConfig: Record<LiquidProgressBarType, {
    label: string;
    iconSrc: string;
    colorFrom: string;
    colorTo: string;
    iconColor: string;
}> = {
    'gemini-pro': {
        label: 'Gemini Pro',
        iconSrc: GeminiProIcon,
        colorFrom: '#3b82f6', // blue-500
        colorTo: '#2563eb',   // blue-600
        iconColor: 'text-blue-600'
    },
    'gemini-flash': {
        label: 'Gemini Flash',
        iconSrc: GeminiFlashIcon,
        colorFrom: '#0ea5e9', // sky-500
        colorTo: '#0284c7',   // sky-600
        iconColor: 'text-sky-600'
    },
    'claude': {
        label: 'Claude',
        iconSrc: ClaudeIcon,
        colorFrom: '#8b5cf6', // violet-500
        colorTo: '#d946ef',   // fuchsia-500
        iconColor: 'text-violet-600'
    },
    'gemini-image': {
        label: 'Gemini Image',
        iconSrc: GeminiImageIcon,
        colorFrom: '#10b981', // emerald-500
        colorTo: '#059669',   // emerald-600
        iconColor: 'text-emerald-600'
    }
};

// Helper to determine color based on percentage
const getProgressColor = (type: LiquidProgressBarType, percentage: number, config: typeof typeConfig) => {
    const isUnknown = percentage === -1;
    if (isUnknown) return { from: config[type].colorFrom, to: config[type].colorTo };

    // Strict thresholds for "Tension"
    if (percentage <= 0.2) {
        // Critical: Red/Rose - "Danger"
        return { from: '#f43f5e', to: '#e11d48' }; // rose-500 to rose-600
    } else if (percentage <= 0.45) {
        // Warning: Amber/Orange - "Caution"
        return { from: '#fbbf24', to: '#d97706' }; // amber-400 to amber-600
    } else {
        // Safe: Original Brand Color
        return { from: config[type].colorFrom, to: config[type].colorTo };
    }
};

export function LiquidProgressBar({
    type,
    percentage,
    resetIn,
    className
}: LiquidProgressBarProps) {
    const { label, iconSrc, colorFrom, colorTo, iconColor } = typeConfig[type];

    const isUnknown = percentage === -1;
    const safePercentage = isUnknown ? 0 : Math.min(100, Math.max(0, Math.round(percentage * 100)));

    // Logic: Always show resetIn if available (User Request) to verify refresh trigger
    const showTimer = resetIn && !isUnknown;

    const relativeTime = useMemo(() => dayjs().to(dayjs(resetIn), true), [resetIn]);

    // Determine dynamic colors
    const currentColors = getProgressColor(type, percentage, typeConfig);

    // If calculation failed or time passed, hide timer
    const finalShowTimer = showTimer && relativeTime;

    return (
        <div className={cn(
            "flex w-full h-[32px] rounded-full border border-slate-200 bg-white overflow-hidden shadow-sm select-none items-stretch",
            className
        )}>

            {/* 1. Left Section: Icon & Name */}
            <div className="flex items-center gap-2 pl-2 pr-3 bg-slate-50 border-r border-slate-100 shrink-0 w-[130px]">
                <img src={iconSrc} alt={label} className="w-4 h-4 object-contain shrink-0" />
                <span className="text-xs font-bold text-slate-700 truncate">{label}</span>
            </div>

            {/* 2. Right Section: Progress Track */}
            {/* ADDED Padding (p-1) to act as the "gap" constraint for the inner bar */}
            <div className="flex-1 relative bg-slate-50/50 flex items-center overflow-hidden p-1">

                {/* Unknown State Background */}
                {isUnknown && (
                    <div className="absolute inset-0 bg-slate-50 flex items-center justify-center">
                    </div>
                )}

                {/* Progress Fill (Only when known) */}
                {/* Changed from absolute to static block with h-full to fit inside padding */}
                {!isUnknown && (
                    <motion.div
                        className="h-full rounded-full relative"
                        style={{
                            background: `linear-gradient(90deg, ${currentColors.from}, ${currentColors.to})`
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${safePercentage}%` }}
                        transition={{ type: "spring", stiffness: 45, damping: 15 }}
                    >
                        {/* Optional: Add Pulse animation if critical */}
                        {percentage <= 0.2 && (
                            <div className="absolute inset-0 bg-white/30 animate-pulse rounded-full" />
                        )}
                    </motion.div>
                )}

                {/* Right Content */}
                <div className="absolute right-2 top-0 bottom-0 flex items-center z-10">

                    {/* "Unknown" Badge */}
                    {isUnknown && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-200/50 text-slate-500 border border-slate-200/50">
                            <HelpCircle size={10} />
                            <span className="text-[10px] font-medium">Unknown</span>
                        </div>
                    )}

                    {/* Timer Badge */}
                    {!isUnknown && finalShowTimer && (
                        <Tooltip title={`重置时间: ${dayjs.utc(resetIn).toDate().toLocaleString()}`} placement="top">
                            <div className={cn(
                                "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none cursor-help transition-colors",
                                // Visual contrast check
                                safePercentage > 90
                                    ? "text-white drop-shadow-md bg-white/10 backdrop-blur-[2px]"
                                    : "bg-white/80 text-slate-500 shadow-sm border border-slate-100/50 hover:bg-white"
                            )}>
                                <Clock size={9} className="stroke-[2.5]" />
                                <span>{relativeTime}</span>
                            </div>
                        </Tooltip>
                    )}
                </div>
            </div>
        </div>
    );
}
