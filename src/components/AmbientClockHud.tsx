import React from 'react';
import {
  Clock,
  Ghost,
  MousePointerClick,
  Volume2,
  VolumeX,
  Calendar,
  CheckSquare,
  GripHorizontal,
  Plus,
  Play,
  Check,
  Wand2,
  Move,
  PanelTop,
  Lock,
  Unlock,
  Power,
  BellRing,
  GitBranch,
  Pin,
  PinOff,
} from 'lucide-react';
import {
  CATEGORY_THEMES,
  DrawerMode,
  FlowNode,
  FlowProject,
  HUD_VISUAL_THEMES,
  HudVisualTheme,
  ScreenEdge,
  TimeBlock,
  TodoItem,
  WindowStateConfig,
  formatMinutesToTime,
} from '../types/hud';
import { computeFlowProjectProgress } from '../utils/flowCodeParser';
import { ThemeBackdropArtwork } from './ThemeArtworkSvg';

interface AmbientClockHudProps {
  now: Date;
  activeBlock: TimeBlock | null;
  nextBlock: TimeBlock | null;
  activeFlowNode?: FlowNode | null;
  activeFlowProject?: FlowProject | null;
  todos: TodoItem[];
  windowConfig: WindowStateConfig;
  isNotchLockedOpen: boolean;
  onToggleNotchLock: () => void;
  onStartDrag: (e: React.MouseEvent<HTMLDivElement>) => void;
  onToggleDockMode: () => void;
  onToggleGhostMode: () => void;
  onToggleAlwaysOnTop: () => void;
  onToggleSound: () => void;
  onToggleDesktopPreview: () => void;
  onSetDrawerMode: (mode: DrawerMode) => void;
  onExtendActiveBlock: (minutes: number) => void;
  onFinishActiveBlockEarly: () => void;
  onStartBlockNow: (blockId: string) => void;
  onScheduleFlowNode?: (project: FlowProject, node: FlowNode, startNow?: boolean) => void;
  onToggleTodo: (todoId: string) => void;
  onToggleFlowSubtask?: (nodeId: string, subtaskId: string) => void;
  onReopenSetup: () => void;
  onToggleLaunchOnBoot: () => void;
  onTriggerCheckIn: () => void;
}

export const AmbientClockHud: React.FC<AmbientClockHudProps> = ({
  now,
  activeBlock,
  nextBlock,
  activeFlowNode,
  activeFlowProject,
  todos,
  windowConfig,
  isNotchLockedOpen,
  onToggleNotchLock,
  onStartDrag,
  onToggleDockMode,
  onToggleGhostMode,
  onToggleAlwaysOnTop,
  onToggleSound,
  onSetDrawerMode,
  onExtendActiveBlock,
  onFinishActiveBlockEarly,
  onStartBlockNow,
  onScheduleFlowNode,
  onToggleTodo,
  onToggleFlowSubtask,
  onReopenSetup,
  onToggleLaunchOnBoot,
  onTriggerCheckIn,
}) => {
  const hours24 = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  const currentTotalMinutes = hours24 * 60 + minutes + seconds / 60;

  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const formattedHours = String(hours12).padStart(2, '0');
  const formattedMinutes = String(minutes).padStart(2, '0');
  const formattedSeconds = String(seconds).padStart(2, '0');
  const amPm = hours24 >= 12 ? 'PM' : 'AM';

  const dateLabel = now.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  let progressPercent = 0;
  let remainingMinutes = 0;

  if (activeBlock) {
    const duration = Math.max(1, activeBlock.endMinutes - activeBlock.startMinutes);
    const elapsed = Math.max(0, currentTotalMinutes - activeBlock.startMinutes);
    progressPercent = Math.min(100, Math.max(0, (elapsed / duration) * 100));
    remainingMinutes = Math.max(0, Math.ceil(activeBlock.endMinutes - currentTotalMinutes));
  } else {
    progressPercent = (currentTotalMinutes / 1440) * 100;
  }

  const visualThemeKey: HudVisualTheme = windowConfig.visualTheme || 'neutral';
  const visualTheme = HUD_VISUAL_THEMES[visualThemeKey] || HUD_VISUAL_THEMES.neutral;

  const freeTimeAccent = visualTheme.freeTimeHex;
  const freeTimeGlow = visualTheme.freeTimeGlow;
  const freeTimeGradient = visualTheme.freeTimeGradient;

  const activeTheme = activeBlock
    ? CATEGORY_THEMES[activeBlock.category]
    : null;

  const nextTheme = nextBlock
    ? CATEGORY_THEMES[nextBlock.category]
    : null;

  const dialColor = activeTheme ? activeTheme.solidHex : freeTimeAccent;
  const dialGlow = activeTheme ? activeTheme.glowRgba : freeTimeGlow;

  const currentActionTodo =
    todos.find(
      (t) =>
        !t.completed &&
        activeBlock &&
        t.boundBlockId === activeBlock.id
    ) || todos.find((t) => !t.completed);

  const freeMinutesUntilNext = nextBlock
    ? Math.max(0, Math.ceil(nextBlock.startMinutes - currentTotalMinutes))
    : null;

  const flowProgress = activeFlowProject
    ? computeFlowProjectProgress(activeFlowProject)
    : null;
  const nextFlowStepNode = activeFlowProject
    ? activeFlowProject.nodes.find((n) => n.status === 'in-progress') ||
      activeFlowProject.nodes.find((n) => flowProgress?.unlockedNodeIds.has(n.id))
    : null;

  const isFloating = windowConfig.dockMode === 'floating';
  const isCornerStart =
    !isFloating && (windowConfig.dockOffsetRatio ?? 0.5) < 0.28;

  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (progressPercent / 100) * circumference;

  return (
    <div className="relative flex flex-col gap-3 shrink-0">
      {/* 1. Clean Organized Control Bar (No App Title, No Spilling Buttons) */}
      <div
        onMouseDown={onStartDrag}
        data-tauri-drag-region
        className={`flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-2xl clay-well select-none overflow-hidden ${
          isFloating ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
        }`}
      >
        {/* Left: Drag Handle (shifts to right if in corner) + Mode Toggles */}
        <div
          className="flex items-center gap-1 shrink-0"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {!isCornerStart && (
            <div
              onMouseDown={onStartDrag}
              className="p-0.5 text-slate-400 hover:text-white cursor-grab active:cursor-grabbing"
              title="Drag along border or snap to any screen edge"
            >
              <GripHorizontal className="w-3.5 h-3.5" />
            </div>
          )}

          <button
            onClick={onToggleDockMode}
            className={`clay-button flex items-center gap-1 px-2 py-1 rounded-xl text-[10px] font-semibold ${
              isFloating
                ? 'text-cyan-300 border-cyan-400/40 bg-cyan-500/20'
                : 'text-violet-300 border-violet-400/35'
            }`}
            title={isFloating ? 'Snap to Screen Notch Border' : 'Switch to Free Floating Mode'}
          >
            {isFloating ? (
              <>
                <Move className="w-3 h-3" />
                <span>Free</span>
              </>
            ) : (
              <>
                <PanelTop className="w-3 h-3" />
                <span>Docked</span>
              </>
            )}
          </button>

          <button
            onClick={onToggleGhostMode}
            className={`clay-button flex items-center gap-1 px-2 py-1 rounded-xl text-[10px] font-semibold ${
              windowConfig.isGhostMode
                ? 'text-amber-300 border-amber-400/40 bg-amber-500/20'
                : 'text-emerald-300 border-emerald-400/30'
            }`}
            title="Ghost Mode (Ctrl+Shift+G)"
          >
            {windowConfig.isGhostMode ? (
              <>
                <Ghost className="w-3 h-3" />
                <span>Ghost</span>
              </>
            ) : (
              <>
                <MousePointerClick className="w-3 h-3 text-emerald-400" />
                <span>Live</span>
              </>
            )}
          </button>
        </div>

        {/* Right: Compact Icon Controls (includes Drag Handle when in corner) */}
        <div
          className="flex items-center gap-1 shrink-0"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {isCornerStart && (
            <div
              onMouseDown={onStartDrag}
              className="p-0.5 text-slate-400 hover:text-white cursor-grab active:cursor-grabbing mr-0.5"
              title="Drag along border or snap to any screen edge"
            >
              <GripHorizontal className="w-3.5 h-3.5" />
            </div>
          )}
          {/* Always On Top / Desktop Mode Toggle */}
          <button
            onClick={onToggleAlwaysOnTop}
            className={`clay-button p-1.5 rounded-xl transition-all ${
              windowConfig.alwaysOnTop !== false
                ? 'text-cyan-300 border-cyan-400/40 bg-cyan-500/10'
                : 'text-slate-500 hover:text-slate-300'
            }`}
            title={
              windowConfig.alwaysOnTop !== false
                ? 'Always on Top: ON (Stays above windows). Click to keep on Desktop.'
                : 'Always on Top: OFF (Desktop Mode — sits behind other apps). Click to pin on top.'
            }
          >
            {windowConfig.alwaysOnTop !== false ? (
              <Pin className="w-3 h-3" />
            ) : (
              <PinOff className="w-3 h-3" />
            )}
          </button>

          <button
            onClick={onToggleNotchLock}
            className={`clay-button p-1.5 rounded-xl ${
              isNotchLockedOpen
                ? 'text-blue-300 border-blue-400/40'
                : 'text-slate-400'
            }`}
            title={
              isNotchLockedOpen
                ? 'Pinned Open (Click to Auto-Collapse)'
                : 'Auto-Collapse on Mouse Leave (Click to Pin Open)'
            }
          >
            {isNotchLockedOpen ? (
              <Lock className="w-3 h-3" />
            ) : (
              <Unlock className="w-3 h-3" />
            )}
          </button>

          <button
            onClick={onToggleSound}
            className={`clay-button p-1.5 rounded-xl ${
              windowConfig.soundEnabled
                ? 'text-sky-300 border-sky-400/35'
                : 'text-slate-500'
            }`}
            title="Sound"
          >
            {windowConfig.soundEnabled ? (
              <Volume2 className="w-3 h-3" />
            ) : (
              <VolumeX className="w-3 h-3" />
            )}
          </button>

          <button
            onClick={onTriggerCheckIn}
            className="clay-button p-1.5 rounded-xl text-amber-300 hover:text-white"
            title={`Focus Check-In (Every ${windowConfig.checkInIntervalMinutes || 15}m)`}
          >
            <BellRing className="w-3 h-3" />
          </button>

          <button
            onClick={onToggleLaunchOnBoot}
            className={`clay-button p-1.5 rounded-xl ${
              windowConfig.launchOnBoot !== false
                ? 'text-emerald-300 border-emerald-400/40'
                : 'text-slate-500'
            }`}
            title={
              windowConfig.launchOnBoot !== false
                ? 'Launch on Windows Boot: ON'
                : 'Launch on Windows Boot: OFF'
            }
          >
            <Power className="w-3 h-3" />
          </button>

          <button
            onClick={onReopenSetup}
            className="clay-button p-1.5 rounded-xl text-violet-300 hover:text-white"
            title="Setup & Themes"
          >
            <Wand2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 2. Clock + Radial Gauge (With Multi-Layered Vector Backdrop Artwork) */}
      <div className="clay-card rounded-2xl px-4 py-3 flex items-center justify-between gap-4 relative overflow-hidden">
        <div
          className="absolute -top-8 -left-8 w-44 h-44 rounded-full blur-3xl pointer-events-none opacity-35 transition-all duration-700"
          style={{ background: dialColor }}
        />

        {/* Polished Multi-Layer Background SVG Scene */}
        <ThemeBackdropArtwork theme={visualThemeKey} />

        {/* Left Contrast Scrim so Clock & Date are 100% High-Visibility in every theme */}
        {visualThemeKey !== 'neutral' && (
          <div
            className="absolute inset-y-0 left-0 w-48 pointer-events-none"
            style={{
              background:
                visualTheme.mode === 'light'
                  ? 'linear-gradient(90deg, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.15) 65%, rgba(255, 255, 255, 0) 100%)'
                  : 'linear-gradient(90deg, rgba(8, 10, 18, 0.72) 0%, rgba(8, 10, 18, 0.35) 65%, rgba(8, 10, 18, 0) 100%)',
            }}
          />
        )}

        <div className="flex flex-col z-10">
          <span
            className={`text-[11px] font-extrabold uppercase tracking-widest drop-shadow-sm mb-0.5 ${
              visualTheme.mode === 'light' ? 'text-slate-600' : 'text-slate-200'
            }`}
          >
            {dateLabel}
          </span>

          <div className="flex items-baseline gap-1.5">
            <span
              className={`font-mono text-4xl font-extrabold tracking-tight clock-3d-text leading-none ${
                visualTheme.mode === 'light' ? 'text-slate-900' : 'text-white'
              }`}
            >
              {formattedHours}:{formattedMinutes}
            </span>
            <div className="flex flex-col">
              <span
                className="font-mono text-xs font-bold leading-tight"
                style={{ color: dialColor }}
              >
                {amPm}
              </span>
              <span
                className={`font-mono text-[11px] leading-tight ${
                  visualTheme.mode === 'light' ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                :{formattedSeconds}
              </span>
            </div>
          </div>
        </div>

        {/* Radial Progress */}
        <div className="relative flex items-center justify-center w-20 h-20 shrink-0 clay-well rounded-full p-1">
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 80 80">
            <circle
              cx="40"
              cy="40"
              r={radius}
              fill="transparent"
              stroke={
                visualTheme.mode === 'light'
                  ? 'rgba(15, 23, 42, 0.1)'
                  : 'rgba(255,255,255,0.08)'
              }
              strokeWidth="7"
            />
            <circle
              cx="40"
              cy="40"
              r={radius}
              fill="transparent"
              stroke={dialColor}
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{
                filter: `drop-shadow(0 0 8px ${dialGlow})`,
                transition: 'stroke-dashoffset 0.5s ease-out, stroke 0.4s ease',
              }}
            />
          </svg>
          <span
            className={`absolute font-mono text-xs font-extrabold ${
              visualTheme.mode === 'light' ? 'text-slate-900' : 'text-white'
            }`}
          >
            {Math.round(progressPercent)}%
          </span>
        </div>
      </div>

      {/* 3. CURRENT STATE SLAB (Clean Single Label, No Redundant Top Pill) */}
      {activeBlock && activeTheme ? (
        <div
          style={{
            background: activeTheme.pillGradient,
            boxShadow: `0 14px 30px -6px ${activeTheme.glowRgba}, inset 0 2px 1.5px rgba(255,255,255,0.35), inset 0 -3px 4px rgba(0,0,0,0.3)`,
          }}
          className="rounded-2xl p-3.5 flex flex-col gap-2.5 relative overflow-hidden border border-white/25 transition-all"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-extrabold text-white tracking-tight truncate drop-shadow-sm">
              {activeBlock.title}
            </h2>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="font-mono text-xs font-extrabold text-white bg-black/25 px-2 py-0.5 rounded-lg">
                {remainingMinutes}m
              </span>
              <button
                onClick={() => onExtendActiveBlock(15)}
                className="px-2 py-0.5 rounded-lg bg-white/20 hover:bg-white/30 text-[11px] font-mono font-bold text-white flex items-center gap-0.5 transition-colors"
                title="Extend block by 15 minutes"
              >
                <Plus className="w-3 h-3" />
                <span>15m</span>
              </button>
              <button
                onClick={onFinishActiveBlockEarly}
                className="px-2 py-0.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-[11px] font-extrabold text-slate-950 flex items-center gap-1 shadow-sm transition-transform active:scale-95"
                title="Finish early and convert remaining time to Free Time"
              >
                <Check className="w-3 h-3 stroke-[3]" />
                <span>Finish</span>
              </button>
            </div>
          </div>

          {activeFlowNode && activeFlowNode.subtasks.length > 0 ? (
            <div className="flex flex-col gap-1 bg-black/25 rounded-xl p-2 border border-white/15">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-white/80">
                <span className="flex items-center gap-1">
                  <GitBranch className="w-3 h-3" />
                  <span>Flow Subtasks</span>
                </span>
                <span>
                  {activeFlowNode.subtasks.filter((s) => s.completed).length}/
                  {activeFlowNode.subtasks.length}
                </span>
              </div>
              <div className="flex flex-col gap-0.5 max-h-[110px] overflow-y-auto pr-0.5">
                {activeFlowNode.subtasks.map((st) => (
                  <div
                    key={st.id}
                    onClick={() =>
                      onToggleFlowSubtask &&
                      onToggleFlowSubtask(activeFlowNode.id, st.id)
                    }
                    className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-black/25 cursor-pointer transition-colors"
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                        st.completed
                          ? 'bg-emerald-400 border-emerald-400 text-slate-950'
                          : 'border-white/75'
                      }`}
                    >
                      {st.completed && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                    <span
                      className={`text-xs font-semibold truncate ${
                        st.completed ? 'line-through text-white/55' : 'text-white'
                      }`}
                    >
                      {st.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            currentActionTodo && (
              <div
                onClick={() => onToggleTodo(currentActionTodo.id)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/25 hover:bg-black/35 border border-white/15 cursor-pointer transition-all group"
              >
                <div className="w-4 h-4 rounded-md border-2 border-white/80 group-hover:bg-emerald-400 group-hover:border-emerald-400 flex items-center justify-center shrink-0 transition-colors">
                  <Check className="w-3 h-3 text-transparent group-hover:text-slate-950 stroke-[3]" />
                </div>
                <span className="text-xs font-semibold text-white truncate">
                  {currentActionTodo.title}
                </span>
              </div>
            )
          )}

          <div className="w-full h-2 bg-black/30 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full rounded-full bg-white transition-all duration-500"
              style={{
                width: `${Math.max(5, progressPercent)}%`,
                boxShadow: '0 0 10px rgba(255,255,255,0.9)',
              }}
            />
          </div>
        </div>
      ) : (
        /* PUNCHY FREE TIME SLAB (With Quick-Start Next Flow Step) */
        <div
          style={{
            background: freeTimeGradient,
            boxShadow: `0 14px 28px -6px ${freeTimeGlow}, inset 0 2px 1.5px rgba(255,255,255,0.35), inset 0 -3px 4px rgba(0,0,0,0.3)`,
          }}
          className="rounded-2xl px-4 py-3 flex flex-col gap-2 relative overflow-hidden border border-white/25 transition-all"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-extrabold text-white tracking-tight drop-shadow-sm">
              Free Time
            </h2>

            <div className="flex items-center gap-2 shrink-0">
              {freeMinutesUntilNext !== null && (
                <span className="font-mono text-xs font-extrabold text-white bg-black/25 px-2.5 py-1 rounded-lg">
                  {freeMinutesUntilNext}m
                </span>
              )}
              <button
                onClick={() => onSetDrawerMode('calendar')}
                className="px-2.5 py-1 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-all"
              >
                + Slot
              </button>
            </div>
          </div>

          {activeFlowProject && nextFlowStepNode && onScheduleFlowNode && (
            <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-black/25 border border-white/15">
              <button
                type="button"
                onClick={() => onSetDrawerMode('flow')}
                className="flex items-center gap-1.5 min-w-0 text-left hover:opacity-90"
                title="Open Flowchart Project"
              >
                <GitBranch className="w-3.5 h-3.5 text-white/90 shrink-0" />
                <span className="text-xs font-semibold text-white truncate">
                  {nextFlowStepNode.title}
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  onScheduleFlowNode(activeFlowProject, nextFlowStepNode, true)
                }
                className="px-2 py-0.5 rounded-lg bg-white text-slate-950 hover:bg-emerald-200 text-[10px] font-extrabold flex items-center gap-1 shrink-0 shadow-sm transition-transform active:scale-95"
                title="Start focus block on this Flowchart step right now"
              >
                <Play className="w-2.5 h-2.5 fill-current" />
                <span>Start</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 4. Up Next Ribbon */}
      {nextBlock && nextTheme && (
        <div className="clay-well rounded-xl px-3 py-2 flex items-center justify-between text-xs border border-white/10">
          <div className="flex items-center gap-2 min-w-0 truncate">
            <span
              style={{ backgroundColor: nextTheme.solidHex }}
              className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md text-white shrink-0"
            >
              Next
            </span>
            <span className="font-semibold text-white truncate">
              {nextBlock.title}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            <span className="font-mono text-[11px] font-medium text-slate-300">
              {formatMinutesToTime(nextBlock.startMinutes)}
            </span>
            {!activeBlock && (
              <button
                onClick={() => onStartBlockNow(nextBlock.id)}
                className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-bold text-emerald-300 flex items-center gap-1 transition-colors"
                title="Start this block now"
              >
                <Play className="w-2.5 h-2.5 fill-current" />
                <span>Start</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 5. Module Switcher Tabs */}
      <div className="grid grid-cols-4 gap-1 p-1 clay-well rounded-2xl">
        <button
          onClick={() => onSetDrawerMode('none')}
          className={`flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-xl text-[11px] font-medium transition-all ${
            windowConfig.drawerMode === 'none'
              ? 'clay-button text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>HUD</span>
        </button>

        <button
          onClick={() => onSetDrawerMode('calendar')}
          className={`flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-xl text-[11px] font-medium transition-all ${
            windowConfig.drawerMode === 'calendar'
              ? 'clay-button text-blue-300'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Timeline</span>
        </button>

        <button
          onClick={() => onSetDrawerMode('todos')}
          className={`flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-xl text-[11px] font-medium transition-all ${
            windowConfig.drawerMode === 'todos'
              ? 'clay-button text-emerald-300'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5" />
          <span>Tasks</span>
        </button>

        <button
          onClick={() => onSetDrawerMode('flow')}
          className={`flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-xl text-[11px] font-medium transition-all ${
            windowConfig.drawerMode === 'flow'
              ? 'clay-button text-cyan-300'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <GitBranch className="w-3.5 h-3.5" />
          <span>Flow</span>
        </button>
      </div>
    </div>
  );
};
