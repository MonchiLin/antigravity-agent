import React from 'react';
import { motion, useMotionTemplate, useMotionValue, useSpring } from 'framer-motion';
import { Tooltip } from 'antd';
import { cn } from "@/lib/utils.ts";
import { Avatar } from "@/components/ui/avatar.tsx";
import { ArrowLeftRight, Crown, Gem, Trash2, TriangleAlert } from 'lucide-react';
import { BaseButton } from "@/components/base-ui/BaseButton.tsx";
import { Variants } from "motion/react";
import { LiquidProgressBar } from "@/components/ui/liquid-progress-bar.tsx";

// ==========================================
// 类型定义
// ==========================================
type UserTier = 'free-tier' | 'g1-pro-tier' | 'g1-ultra-tier';

interface UserSessionCardProps {
  nickName: string;
  userAvatar: string;
  email: string;
  tier: UserTier;
  geminiProQuote: number | -1
  geminiProQuoteRestIn: string
  geminiFlashQuote: number | -1
  geminiFlashQuoteRestIn: string
  geminiImageQuote: number | -1
  geminiImageQuoteRestIn: string
  claudeQuote: number | -1
  claudeQuoteRestIn: string
  isCurrentUser: boolean;
  onSelect: () => void
  onSwitch: () => void
  onDelete: () => void
}

// ==========================================
// 视觉样式配置
// ==========================================

type TierVisualStyles = Pick<React.CSSProperties, 'background' | 'borderColor' | 'boxShadow' | 'backdropFilter' | 'WebkitBackdropFilter'> & {
  hoverBoxShadow?: string;
};

const tierVisualStyles: Record<UserTier, TierVisualStyles> = {
  "free-tier": {
    background: 'linear-gradient(to bottom, #f8fafc, #ffffff)',
    borderColor: '#e2e8f0',
    boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    hoverBoxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  },
  "g1-pro-tier": {
    background: 'linear-gradient(to bottom, rgba(255, 251, 235, 0.95), rgba(255, 255, 255, 0.6))',
    borderColor: 'rgba(252, 211, 77, 0.7)',
    boxShadow: '0 20px 40px -10px rgba(251, 191, 36, 0.25), 0 10px 20px -5px rgba(251, 191, 36, 0.1), inset 0 0 20px -10px rgba(251, 191, 36, 0.1)',
    hoverBoxShadow: '0 25px 50px -12px rgba(251, 191, 36, 0.5), 0 15px 30px -5px rgba(251, 191, 36, 0.3), inset 0 0 30px -10px rgba(251, 191, 36, 0.2)',
  },
  "g1-ultra-tier": {
    background: 'radial-gradient(ellipse at top left, rgba(233, 213, 255, 0.75), rgba(245, 208, 254, 0.5), rgba(207, 250, 254, 0.3))',
    borderColor: 'rgba(167, 139, 250, 0.8)',
    boxShadow: '0 0 60px -15px rgba(139, 92, 246, 0.4), 0 20px 40px -10px rgba(139, 92, 246, 0.2), inset 0 0 30px -15px rgba(233, 213, 255, 0.5)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    hoverBoxShadow: '0 0 80px -10px rgba(139, 92, 246, 0.6), 0 30px 60px -10px rgba(139, 92, 246, 0.4), inset 0 0 50px -10px rgba(233, 213, 255, 0.8)',
  },
};

const unknownStyle: TierVisualStyles = {
  background: 'repeating-linear-gradient(45deg, #f8fafc, #f8fafc 10px, #f1f5f9 10px, #f1f5f9 20px)',
  borderColor: '#cbd5e1',
  boxShadow: 'none',
  hoverBoxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
};

const tierBadgeMap: Record<UserTier, React.ReactNode> = {
  "free-tier": <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-md leading-none border border-slate-200 shadow-sm">Free</span>,
  "g1-pro-tier": <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 text-[10px] font-bold rounded-md leading-none border border-amber-200/60 flex items-center gap-0.5 shadow-sm"><Crown size={10} className="fill-current" />Pro</span>,
  "g1-ultra-tier": <span className="px-1.5 py-0.5 bg-violet-50 text-violet-600 text-[10px] font-bold rounded-md leading-none border border-violet-200/60 flex items-center gap-0.5 shadow-sm"><Gem size={10} className="fill-current" />Ultra</span>,
};

const tooltipInnerStyle: React.CSSProperties = {
  maxWidth: 520,
  wordBreak: 'break-all',
};

// 容器变体：控制整体入场 + 协调子元素入场
const containerVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut",
      // 关键：staggerChildren 让子元素依次出现，0.1s 间隔
      staggerChildren: 0.1,
      delayChildren: 0.05
    }
  }
};

// 子元素变体：统一的上浮淡入效果
const childVariants: Variants = {
  hidden: { opacity: 0, y: 12, filter: 'blur(4px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.4, ease: "backOut" }
  }
};

export function AccountSessionListCard(props: UserSessionCardProps) {
  let { tier } = props;
  const unknownTier = !["free-tier", "g1-pro-tier", "g1-ultra-tier"].includes(tier);

  // 如果是未知层级，使用专门定义的未知样式，否则使用对应层级的样式
  const currentStyles = unknownTier ? unknownStyle : tierVisualStyles[tier];

  const { boxShadow, hoverBoxShadow, ...otherStyles } = currentStyles;

  // --- 1. 聚光灯 (Spotlight) 逻辑 ---
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // 使用 Spring 让光标跟随有轻微的物理延迟感，更高级
  const springX = useSpring(mouseX, { stiffness: 500, damping: 30 });
  const springY = useSpring(mouseY, { stiffness: 500, damping: 30 });

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <motion.div
      onClick={props.onSelect}
      onMouseMove={handleMouseMove}
      className={cn(
        "group w-[340px] rounded-2xl px-6 py-5 border cursor-pointer relative overflow-hidden",
        // 移除 hover:shadow-xl，因为我们完全用 JS 控制阴影
      )}
      style={otherStyles}

      // 应用动画
      variants={containerVariants}
      initial="hidden"
      animate="visible"

      // 交互状态
      whileHover={{
        y: -4,
        scale: 1.01,
        boxShadow: hoverBoxShadow || boxShadow
      }}
      transition={{
        duration: 0.4,
        ease: "easeOut",
        // 阴影变化要稍微慢一点，显得厚重
        boxShadow: { duration: 0.5, ease: "easeInOut" }
      }}
    >

      {props.isCurrentUser && <div title={"当前会话"} className="flex items-center gap-1 mt-1 h-2 absolute top-1.5 right-1.5">
        <div className="w-1 h-2 bg-blue-500 rounded-full animate-[bounce_1s_infinite]"></div>
        <div className="w-1 h-3 bg-blue-500 rounded-full animate-[bounce_1s_infinite_100ms]"></div>
        <div className="w-1 h-1.5 bg-blue-500 rounded-full animate-[bounce_1s_infinite_200ms]"></div>
      </div>}

      {/* --- 特效层 A: 聚光灯 (鼠标跟随) --- */}
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition duration-500 group-hover:opacity-100 z-0"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              650px circle at ${springX}px ${springY}px,
              ${tier === 'g1-ultra-tier' ? 'rgba(167, 139, 250, 0.15)' : 'rgba(255,255,255,0.4)'},
              transparent 80%
            )
          `
        }}
      />

      {/* --- 特效层 B: Ultra 专属呼吸边框 --- */}
      {tier === 'g1-ultra-tier' && (
        <motion.div
          className="absolute inset-0 rounded-2xl border border-violet-400/30 pointer-events-none z-0"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* --- 内容层 (z-10 确保在特效之上) --- */}
      <div className="relative z-10">

        {/* 头部区域 */}
        <motion.header
          className="flex items-center gap-4 mb-2 relative"
          variants={childVariants}
        >
          <Avatar
            className={cn(
              "h-12 w-12 rounded-full object-cover border-2 transition-all duration-300 shrink-0 ring-2 ring-offset-2",
              tier === 'g1-ultra-tier'
                ? "border-white/60 ring-white/20"
                : props.isCurrentUser
                  ? "border-blue-400 ring-blue-100"
                  : "border-gray-200 ring-gray-50 group-hover:border-blue-300 group-hover:ring-blue-50"
            )}
            src={props.userAvatar}
            alt={props.nickName}
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 min-w-0">
              <Tooltip title={props.nickName} styles={{ container: tooltipInnerStyle }}>
                <h2 className="flex-1 min-w-0 text-lg font-bold text-slate-900 leading-tight line-clamp-2 break-words">
                  {props.nickName}
                </h2>
              </Tooltip>
              <div className="mt-0.5 shrink-0">
                {tierBadgeMap[tier] || <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold rounded-md leading-none border border-gray-200 shadow-sm">Unknown</span>}
              </div>
            </div>
            <Tooltip title={props.email} styles={{ container: tooltipInnerStyle }}>
              {/* 高度用于统一一行和两行对其 */}
              <p className="text-sm text-slate-500 font-medium line-clamp-2 break-all h-[42px]">{props.email}</p>
            </Tooltip>
          </div>
        </motion.header>

        {/* 进度条区域 */}
        <motion.div className="space-y-2" variants={childVariants}>
          {props.geminiProQuote === -1 ? (
            <>
              <LiquidProgressBar
                type="gemini-pro"
                percentage={-1}
                resetIn={props.geminiProQuoteRestIn}
              />
              <LiquidProgressBar
                type="claude"
                percentage={-1}
                resetIn={props.claudeQuoteRestIn}
              />
              <LiquidProgressBar
                type="gemini-flash"
                percentage={-1}
                resetIn={props.geminiFlashQuoteRestIn}
              />
              <LiquidProgressBar
                type="gemini-image"
                percentage={-1}
                resetIn={props.geminiImageQuoteRestIn}
              />
            </>
          ) : (
            <>
              <LiquidProgressBar
                type="gemini-pro"
                percentage={props.geminiProQuote}
                resetIn={props.geminiProQuoteRestIn}
              />
              <LiquidProgressBar
                type="claude"
                percentage={props.claudeQuote}
                resetIn={props.claudeQuoteRestIn}
              />
              <LiquidProgressBar
                type="gemini-flash"
                percentage={props.geminiFlashQuote}
                resetIn={props.geminiFlashQuoteRestIn}
              />
              <LiquidProgressBar
                type="gemini-image"
                percentage={props.geminiImageQuote}
                resetIn={props.geminiImageQuoteRestIn}
              />
            </>
          )}
        </motion.div>

        {/* 底部交互区域 */}
        <motion.div
          className="mt-6 flex items-center justify-center relative"
          variants={childVariants}
        >
          <BaseButton
            onClick={e => {
              e.stopPropagation();
              props.onSwitch()
            }}
            disabled={props.isCurrentUser}
            variant="outline"
            leftIcon={<ArrowLeftRight className={"w-3 h-3"} />}
          >
            使用
          </BaseButton>
          <BaseButton
            onClick={e => {
              e.stopPropagation()
              props.onDelete()
            }}
            disabled={props.isCurrentUser}
            variant="ghost"
            rightIcon={<Trash2 className={"w-3 h-3"} />}
          >
            删除
          </BaseButton>
        </motion.div>
      </div>
      {(unknownTier) && (
        <div className="absolute bottom-3 right-3 z-50">
          <Tooltip title={
            <div className="flex flex-col gap-0.5">
              <span>
                当您看到这个符号说明开发者内置的数据未能覆盖当前账户层级 <span className="font-mono bg-white/10 px-1 rounded">[{props.tier}]</span>
              </span>
              <span>
                这不是您的问题, 为了解决这个问题, 您可以将该提示截图 <a href="https://github.com/MonchiLin/antigravity-agent/issues" target="_blank" rel="noreferrer" className="text-blue-300 hover:text-blue-200 underline decoration-auto underline-offset-2">提供给开发者</a>
              </span>
            </div>
          }>
            <TriangleAlert className="w-4 h-4 text-amber-500/80 hover:text-amber-600 transition-colors cursor-help" />
          </Tooltip>
        </div>
      )}
    </motion.div>
  );
}

// ==========================================
// 子组件：进度条
// ==========================================

function UsageItem({ label, percentage, color, trackColor }: {
  label: string,
  percentage: number,
  color: string,
  trackColor: string
}) {
  const isUnknown = percentage === -1;
  const displayPercentage = isUnknown ? 0 : Math.round(percentage * 100);

  return (
    <div className="group">
      <div className="flex justify-between mb-2 text-sm">
        <span className="text-slate-700 font-medium">{label}</span>
        <span className="text-slate-400 font-mono tabular-nums">
          {isUnknown ? 'Unknown' : `${displayPercentage}%`}
        </span>
      </div>
      <div className={cn("h-2.5 w-full rounded-full overflow-hidden transition-colors duration-300", trackColor)}>
        <motion.div
          className={cn("h-full rounded-full shadow-sm", color)}
          // 这里不需要 variants，因为它有自己独立的逻辑（width 动画）
          // 但它会被父级 Container 的 Stagger 影响开始时间，效果刚刚好
          initial={{ width: 0 }}
          animate={{ width: `${displayPercentage}%` }}
          transition={{ type: "spring", stiffness: 40, damping: 12, delay: 0.2 }}
        />
      </div>
    </div>
  );
}
