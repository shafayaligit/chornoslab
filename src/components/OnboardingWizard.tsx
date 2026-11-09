import React, { useState } from 'react';
import {
  Palette,
  Clock,
  Sparkles,
  Check,
  ArrowRight,
  ArrowLeft,
  GripHorizontal,
} from 'lucide-react';
import {
  HUD_VISUAL_THEMES,
  HudVisualTheme,
  OnboardingProfile,
} from '../types/hud';
import { ThemeBackdropArtwork, ThemeIconSvg } from './ThemeArtworkSvg';
import { TimeRangeSelector } from './TimeRangeSelector';
import { soundFx } from '../utils/soundFx';

interface OnboardingWizardProps {
  currentTheme: HudVisualTheme;
  onSelectTheme: (theme: HudVisualTheme) => void;
  onStartDrag: (e: React.MouseEvent<HTMLDivElement>) => void;
  onComplete: (profile: OnboardingProfile) => void;
  onSkip: () => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  currentTheme,
  onSelectTheme,
  onStartDrag,
  onComplete,
  onSkip,
}) => {
  const nowMins =
    Math.floor((new Date().getHours() * 60 + new Date().getMinutes()) / 15) *
    15;

  const [step, setStep] = useState<number>(0);
  const [wakeMinutes, setWakeMinutes] = useState<number>(nowMins);
  const [endMinutes, setEndMinutes] = useState<number>(
    Math.min(1440, nowMins + 60)
  );
  const [primaryProject, setPrimaryProject] = useState<string>('');
  const [task1, setTask1] = useState<string>('');

  const hasUserTypedAnything =
    primaryProject.trim().length > 0 || task1.trim().length > 0;

  const handleNext = () => {
    soundFx.playTactileClick(1.1);
    if (step < 1) {
      setStep(step + 1);
    } else {
      const customTasks = [task1.trim()].filter(Boolean);
      onComplete({
        wakeMinutes,
        archetype: 'coding',
        primaryProject: primaryProject.trim(),
        secondaryTopic: '',
        customTasks,
        blockLength: Math.max(15, endMinutes - wakeMinutes),
        anchors: [],
      });
    }
  };

  const handleBack = () => {
    soundFx.playTactileClick(0.9);
    if (step > 0) setStep(step - 1);
  };

  const isLightMode = HUD_VISUAL_THEMES[currentTheme]?.mode === 'light';

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Draggable Top Bar */}
      <div
        onMouseDown={onStartDrag}
        data-tauri-drag-region
        className="flex items-center justify-between px-3 py-1.5 rounded-2xl clay-well cursor-grab active:cursor-grabbing select-none"
      >
        <div className="flex items-center gap-1.5 text-slate-300">
          <GripHorizontal className="w-4 h-4 text-violet-400/80" />
          <span className="text-[11px] font-semibold tracking-wider uppercase">
            Quick Setup
          </span>
        </div>

        <div
          className="flex items-center gap-2"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <span className="font-mono text-[11px] font-bold text-violet-300">
            {step + 1}/2
          </span>
          <button
            onClick={onSkip}
            className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-lg border transition-colors ${
              isLightMode
                ? 'bg-emerald-600/20 text-emerald-950 border-emerald-700/35 hover:bg-emerald-600/30'
                : 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30 hover:bg-emerald-500/35'
            }`}
          >
            Done
          </button>
        </div>
      </div>

      {/* 2-Step Progress Bar */}
      <div className="grid grid-cols-2 gap-2 px-1">
        {[0, 1].map((idx) => (
          <div
            key={idx}
            onClick={() => setStep(idx)}
            className={`h-1.5 rounded-full cursor-pointer transition-all duration-300 ${
              idx <= step
                ? 'bg-gradient-to-r from-violet-400 to-emerald-400 shadow-[0_0_8px_rgba(167,139,250,0.45)]'
                : 'clay-well'
            }`}
          />
        ))}
      </div>

      {/* Step Card */}
      <div className="clay-card rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden">
        <div className="flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            {step === 0 ? (
              <Palette
                className={`w-4 h-4 ${
                  isLightMode ? 'text-pink-700' : 'text-pink-300'
                }`}
              />
            ) : (
              <Clock
                className={`w-4 h-4 ${
                  isLightMode ? 'text-sky-700' : 'text-sky-300'
                }`}
              />
            )}
            <h2
              className={`text-sm font-extrabold ${
                isLightMode ? 'text-slate-950' : 'text-white'
              }`}
            >
              {step === 0 ? 'Choose Theme' : 'First Time Block (Optional)'}
            </h2>
          </div>
          {step === 1 && (
            <span className="text-[10px] font-mono text-slate-400">
              Leave blank for empty
            </span>
          )}
        </div>

        {/* STEP 0: Visual Theme Picker (Dark: Neutral, Space, Cats | Light: Tulip, Monkeys, Otter) */}
        {step === 0 && (
          <div className="flex flex-col gap-2.5 z-10">
            {/* Live Artwork Preview Banner */}
            <div className="h-16 rounded-xl clay-well relative overflow-hidden flex items-center px-3 border border-white/10">
              <ThemeBackdropArtwork theme={currentTheme} />
              <div className="z-10 flex items-center gap-2">
                <ThemeIconSvg theme={currentTheme} className="w-5 h-5" />
                <div className="flex flex-col">
                  <span
                    className={`text-xs font-extrabold ${
                      isLightMode ? 'text-slate-950' : 'text-white drop-shadow'
                    }`}
                  >
                    {HUD_VISUAL_THEMES[currentTheme].label} Theme
                  </span>
                  <span
                    className={`text-[10px] font-medium ${
                      isLightMode ? 'text-slate-800' : 'text-slate-300'
                    }`}
                  >
                    {HUD_VISUAL_THEMES[currentTheme].mode === 'light'
                      ? 'Light Mode • Soft pastel surface & dark text'
                      : 'Dark Mode • Deep surface & crisp light text'}
                  </span>
                </div>
              </div>
            </div>

            {/* Group 1: Dark Mode (Neutral, Space, Cats) */}
            <div className="flex flex-col gap-1">
              <span className="text-[9.5px] font-mono font-bold uppercase tracking-wider text-slate-400 px-0.5">
                Dark Mode
              </span>
              <div className="grid grid-cols-3 gap-2">
                {(['neutral', 'space', 'cats'] as HudVisualTheme[]).map(
                  (tKey) => {
                    const t = HUD_VISUAL_THEMES[tKey];
                    const active = currentTheme === tKey;
                    return (
                      <button
                        key={tKey}
                        type="button"
                        onClick={() => onSelectTheme(tKey)}
                        className={`clay-button py-2 px-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                          active
                            ? isLightMode
                              ? 'text-slate-950 font-extrabold ring-2 ring-violet-600 bg-white/80 scale-[1.02]'
                              : 'text-white font-extrabold ring-2 ring-violet-400 bg-white/20 scale-[1.02]'
                            : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        <ThemeIconSvg
                          theme={tKey}
                          className="w-4 h-4 shrink-0"
                        />
                        <span className="truncate">{t.label}</span>
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            {/* Group 2: Light Mode (Tulip, Monkeys, Otter) */}
            <div className="flex flex-col gap-1">
              <span className="text-[9.5px] font-mono font-bold uppercase tracking-wider text-slate-400 px-0.5">
                Light Mode
              </span>
              <div className="grid grid-cols-3 gap-2">
                {(['flowers', 'monkeys', 'otter'] as HudVisualTheme[]).map(
                  (tKey) => {
                    const t = HUD_VISUAL_THEMES[tKey];
                    const active = currentTheme === tKey;
                    return (
                      <button
                        key={tKey}
                        type="button"
                        onClick={() => onSelectTheme(tKey)}
                        className={`clay-button py-2 px-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                          active
                            ? isLightMode
                              ? 'text-slate-950 font-extrabold ring-2 ring-pink-600 !bg-white/95 scale-[1.02]'
                              : 'text-white font-extrabold ring-2 ring-pink-400 bg-white/20 scale-[1.02]'
                            : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        <ThemeIconSvg
                          theme={tKey}
                          className="w-4 h-4 shrink-0"
                        />
                        <span className="truncate">{t.label}</span>
                      </button>
                    );
                  }
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 1: Simple Optional First Block & Task (No Generic Presets) */}
        {step === 1 && (
          <div className="flex flex-col gap-2.5 z-10">
            <input
              type="text"
              value={primaryProject}
              onChange={(e) => setPrimaryProject(e.target.value)}
              placeholder="Time block name (optional)..."
              className={`w-full px-3 py-2 rounded-xl text-xs font-medium focus:outline-none select-text ${
                isLightMode
                  ? 'bg-white/90 border border-slate-900/20 text-slate-900 placeholder-slate-500 focus:border-violet-600'
                  : 'clay-well text-white placeholder-slate-400 focus:border-violet-400/60'
              }`}
            />

            <input
              type="text"
              value={task1}
              onChange={(e) => setTask1(e.target.value)}
              placeholder="First to-do task (optional)..."
              className={`w-full px-3 py-2 rounded-xl text-xs font-medium focus:outline-none select-text ${
                isLightMode
                  ? 'bg-white/90 border border-slate-900/20 text-slate-900 placeholder-slate-500 focus:border-emerald-600'
                  : 'clay-well text-white placeholder-slate-400 focus:border-emerald-400/60'
              }`}
            />

            {/* Start & End Time Selector (applied if a time block name is entered) */}
            <TimeRangeSelector
              startMinutes={wakeMinutes}
              endMinutes={endMinutes}
              onChange={(nextStart, nextEnd) => {
                setWakeMinutes(nextStart);
                setEndMinutes(nextEnd);
              }}
            />
          </div>
        )}
      </div>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between gap-2">
        {step > 0 ? (
          <button
            onClick={handleBack}
            className="clay-button px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
        ) : (
          <div />
        )}

        <button
          onClick={handleNext}
          className="clay-button px-4 py-2 rounded-xl text-xs font-extrabold text-emerald-300 border-emerald-400/40 flex items-center gap-1.5"
        >
          <span>
            {step === 0
              ? 'Next'
              : hasUserTypedAnything
              ? 'Save & Start'
              : 'Start Empty'}
          </span>
          {step === 0 ? (
            <ArrowRight className="w-3.5 h-3.5" />
          ) : hasUserTypedAnything ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </div>
  );
};
