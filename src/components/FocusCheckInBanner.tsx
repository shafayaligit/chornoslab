import React, { useState } from 'react';
import { BellRing, Check, X, RotateCcw, ArrowRightLeft, Flame } from 'lucide-react';
import { CATEGORY_THEMES, TimeBlock, TodoItem } from '../types/hud';

interface FocusCheckInBannerProps {
  activeBlock: TimeBlock | null;
  activeTodo?: TodoItem;
  streak: number;
  intervalMinutes: number;
  onConfirmYes: () => void;
  onRefocusNow: () => void;
  onSwitchTask: () => void;
  onFinishEarly: () => void;
  onChangeInterval: (mins: 10 | 15 | 20 | 30) => void;
}

export const FocusCheckInBanner: React.FC<FocusCheckInBannerProps> = ({
  activeBlock,
  activeTodo,
  streak,
  intervalMinutes,
  onConfirmYes,
  onRefocusNow,
  onSwitchTask,
  onFinishEarly,
  onChangeInterval,
}) => {
  const [step, setStep] = useState<'ask' | 'distracted'>('ask');

  const theme = activeBlock
    ? CATEGORY_THEMES[activeBlock.category]
    : CATEGORY_THEMES['deep-work'];

  const targetLabel = activeBlock ? activeBlock.title : 'your focus session';

  return (
    <div
      style={{
        background:
          step === 'ask'
            ? theme.pillGradient
            : 'linear-gradient(135deg, #fb2c56 0%, #d97706 100%)',
        boxShadow: `0 16px 36px -4px ${theme.glowRgba}, 0 0 0 2px rgba(255,255,255,0.45), inset 0 2px 2px rgba(255,255,255,0.4)`,
      }}
      className="shrink-0 rounded-2xl p-3.5 flex flex-col gap-2.5 text-white relative overflow-hidden transition-all"
    >
      {/* Top Row: Check-In Badge + Streak + Interval Selector */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="p-1 rounded-full bg-white/20 animate-bounce">
            <BellRing className="w-3.5 h-3.5 text-white" />
          </span>
          <span className="text-[10px] font-extrabold uppercase tracking-wider bg-black/25 px-2 py-0.5 rounded-full">
            Focus Check-In
          </span>
          {streak > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-mono font-extrabold bg-amber-400/30 border border-amber-300/50 text-amber-100 px-2 py-0.5 rounded-full">
              <Flame className="w-3 h-3 fill-amber-300 text-amber-300" />
              <span>{streak}</span>
            </span>
          )}
        </div>

        {/* Interval Pills */}
        <div className="flex items-center gap-1 bg-black/25 p-0.5 rounded-lg text-[9px] font-mono">
          {([10, 15, 20, 30] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onChangeInterval(m)}
              className={`px-1.5 py-0.5 rounded transition-colors ${
                intervalMinutes === m
                  ? 'bg-white text-slate-950 font-extrabold'
                  : 'text-white/70 hover:text-white'
              }`}
              title={`Check in every ${m} minutes`}
            >
              {m}m
            </button>
          ))}
        </div>
      </div>

      {step === 'ask' ? (
        <>
          {/* Question */}
          <div className="flex flex-col">
            <h3 className="text-sm font-extrabold tracking-tight leading-snug drop-shadow-sm">
              Are you still doing <span className="underline decoration-white/60">{targetLabel}</span>?
            </h3>
            {activeTodo && (
              <span className="text-[11px] font-medium text-white/85 truncate mt-0.5">
                Task: {activeTodo.title}
              </span>
            )}
          </div>

          {/* Yes / Finish Early / No Tactile Buttons */}
          <div className="grid grid-cols-3 gap-1.5 pt-0.5">
            <button
              type="button"
              onClick={onConfirmYes}
              className="py-2 px-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-extrabold text-[11px] flex items-center justify-center gap-1 shadow-lg transition-transform active:scale-95"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>Focused</span>
            </button>

            <button
              type="button"
              onClick={onFinishEarly}
              className="py-2 px-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-extrabold text-[11px] flex items-center justify-center gap-1 shadow-lg transition-transform active:scale-95"
              title="Finish block early and convert remaining time to Free Time"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>Done Early</span>
            </button>

            <button
              type="button"
              onClick={() => setStep('distracted')}
              className="py-2 px-2 rounded-xl bg-black/30 hover:bg-black/45 border border-white/25 text-white font-bold text-[11px] flex items-center justify-center gap-1 transition-transform active:scale-95"
            >
              <X className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Distracted</span>
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col">
            <h3 className="text-sm font-extrabold tracking-tight leading-snug">
              No worries — let&apos;s reset your focus:
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <button
              type="button"
              onClick={onRefocusNow}
              className="py-2 px-3 rounded-xl bg-white hover:bg-emerald-200 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-lg transition-transform active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Refocus (+5m)</span>
            </button>

            <button
              type="button"
              onClick={onSwitchTask}
              className="py-2 px-3 rounded-xl bg-black/35 hover:bg-black/50 border border-white/25 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-transform active:scale-95"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Switch Task</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
