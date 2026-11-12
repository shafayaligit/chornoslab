import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  GitBranch,
  SlidersHorizontal,
} from 'lucide-react';
import {
  BlockCategory,
  CATEGORY_THEMES,
  FlowProject,
  RecurrencePattern,
  TimeBlock,
  TodoItem,
  getOrdinalDay,
} from '../types/hud';
import { computeFlowProjectProgress } from '../utils/flowCodeParser';
import { TimeRangeSelector } from './TimeRangeSelector';

interface TimelineCalendarDrawerProps {
  now: Date;
  blocks: TimeBlock[];
  todos: TodoItem[];
  flowProjects?: FlowProject[];
  activeFlowProjectId?: string;
  selectedBlockId: string | null;
  onSelectBlock: (blockId: string | null) => void;
  onAddBlock: (newBlock: Omit<TimeBlock, 'id'>) => void;
  onUpdateBlock: (updated: TimeBlock) => void;
  onDeleteBlock: (blockId: string) => void;
  onDropTodoOnBlock: (todoId: string, blockId: string) => void;
  onOpenFlowView?: () => void;
}

const FULL_DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const SHORT_DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function formatBlockRailTime(totalMinutes: number): string {
  const clamped = ((totalMinutes % 1440) + 1440) % 1440;
  const h24 = Math.floor(clamped / 60);
  const mins = clamped % 60;
  const period = h24 >= 12 ? 'pm' : 'am';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  if (mins === 0) {
    return `${h12} ${period}`;
  }
  return `${h12}:${String(mins).padStart(2, '0')}`;
}

export const TimelineCalendarDrawer: React.FC<TimelineCalendarDrawerProps> = ({
  now,
  blocks,
  flowProjects = [],
  activeFlowProjectId,
  selectedBlockId,
  onSelectBlock,
  onAddBlock,
  onUpdateBlock,
  onDeleteBlock,
  onDropTodoOnBlock,
  onOpenFlowView,
}) => {
  const currentDayOfWeek = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [selectedDay, setSelectedDay] = useState<number>(currentDayOfWeek);
  const [editingBlock, setEditingBlock] = useState<TimeBlock | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editorScreen, setEditorScreen] = useState<'quick' | 'custom'>('quick');
  const [dragOverBlockId, setDragOverBlockId] = useState<string | null>(null);

  const [draftTitle, setDraftTitle] = useState('');
  const [draftCategory, setDraftCategory] = useState<BlockCategory>('deep-work');
  const [draftStart, setDraftStart] = useState(540);
  const [draftEnd, setDraftEnd] = useState(600);
  const [draftRecurrence, setDraftRecurrence] = useState<RecurrencePattern>('custom');
  const [draftCustomDays, setDraftCustomDays] = useState<number[]>([selectedDay]);
  const [draftFlowProjectId, setDraftFlowProjectId] = useState<string>('');
  const [draftFlowNodeId, setDraftFlowNodeId] = useState<string>('');

  const activeFlowProject =
    flowProjects.find((p) => p.id === activeFlowProjectId) || flowProjects[0];
  const activeFlowProgress = activeFlowProject
    ? computeFlowProjectProgress(activeFlowProject)
    : null;

  const dayOffset = selectedDay - currentDayOfWeek;
  const targetDate = new Date(now);
  targetDate.setDate(now.getDate() + dayOffset);
  const targetDateStr = `${targetDate.getFullYear()}-${String(
    targetDate.getMonth() + 1
  ).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
  const ordinalDateLabel = getOrdinalDay(targetDate.getDate());

  const dayBlocks = blocks
    .filter((b) => {
      if (b.recurrence.pattern === 'once' && b.recurrence.specificDate) {
        return b.recurrence.specificDate === targetDateStr;
      }
      return b.recurrence.daysOfWeek.includes(selectedDay);
    })
    .sort((a, b) => a.startMinutes - b.startMinutes);

  const totalScheduledMinutes = dayBlocks.reduce(
    (sum, b) => sum + Math.max(0, b.endMinutes - b.startMinutes),
    0
  );
  const totalHours = Math.floor(totalScheduledMinutes / 60);
  const totalRemMins = totalScheduledMinutes % 60;
  const totalDurationLabel =
    totalRemMins > 0 ? `${totalHours}h ${totalRemMins}m` : `${totalHours}h`;

  const openCreateEditor = () => {
    const rawNow = now.getHours() * 60 + now.getMinutes();
    const roundedNow = Math.round(rawNow / 15) * 15;
    const lastEnd =
      dayBlocks.length > 0
        ? dayBlocks[dayBlocks.length - 1].endMinutes
        : roundedNow;
    const start = Math.min(1380, Math.max(0, lastEnd));
    setDraftTitle('');
    setDraftCategory('deep-work');
    setDraftStart(start);
    setDraftEnd(Math.min(1440, start + 60));
    setDraftRecurrence('custom');
    setDraftCustomDays([selectedDay]);
    setDraftFlowProjectId('');
    setDraftFlowNodeId('');
    setEditingBlock(null);
    setEditorScreen('quick');
    setIsCreating(true);
  };

  const openEditModal = (blk: TimeBlock) => {
    setDraftTitle(blk.title);
    setDraftCategory(blk.category);
    setDraftStart(blk.startMinutes);
    setDraftEnd(blk.endMinutes);
    setDraftRecurrence(blk.recurrence.pattern);
    setDraftCustomDays(
      blk.recurrence.daysOfWeek && blk.recurrence.daysOfWeek.length > 0
        ? blk.recurrence.daysOfWeek
        : [selectedDay]
    );
    setDraftFlowProjectId(blk.flowProjectId || '');
    setDraftFlowNodeId(blk.flowNodeId || '');
    setEditingBlock(blk);
    setEditorScreen('quick');
    setIsCreating(true);
  };

  const handleSelectFlowNodeForBlock = (val: string) => {
    if (!val) {
      setDraftFlowProjectId('');
      setDraftFlowNodeId('');
      return;
    }
    const [projId, nodeId] = val.split('::');
    const proj = flowProjects.find((p) => p.id === projId);
    const node = proj?.nodes.find((n) => n.id === nodeId);
    if (!proj || !node) return;

    setDraftFlowProjectId(proj.id);
    setDraftFlowNodeId(node.id);
    setDraftTitle(node.title);
    setDraftCategory(node.category || proj.category);
    if (node.estimatedMinutes && node.estimatedMinutes >= 15) {
      setDraftEnd(Math.min(1440, draftStart + node.estimatedMinutes));
    }
  };

  const handleSaveSlot = (saveType: 'once' | 'repeat-day' | 'custom') => {
    if (!draftTitle.trim()) return;

    const validStart = Math.max(0, Math.min(1410, draftStart));
    const validEnd = Math.max(validStart + 15, Math.min(1440, draftEnd));

    let pattern: RecurrencePattern = 'custom';
    let daysOfWeek: number[] = [selectedDay];
    let specificDate: string | undefined = undefined;

    if (saveType === 'once') {
      pattern = 'once';
      daysOfWeek = [selectedDay];
      specificDate = targetDateStr;
    } else if (saveType === 'repeat-day') {
      pattern = 'custom';
      daysOfWeek = [selectedDay];
    } else {
      // 'custom' from Screen 2
      pattern = draftRecurrence;
      if (pattern === 'daily') {
        daysOfWeek = [0, 1, 2, 3, 4, 5, 6];
      } else if (pattern === 'weekdays') {
        daysOfWeek = [1, 2, 3, 4, 5];
      } else if (pattern === 'weekends') {
        daysOfWeek = [0, 6];
      } else {
        daysOfWeek = draftCustomDays.length > 0 ? draftCustomDays : [selectedDay];
      }
    }

    if (editingBlock) {
      onUpdateBlock({
        ...editingBlock,
        title: draftTitle.trim(),
        category: draftCategory,
        startMinutes: validStart,
        endMinutes: validEnd,
        recurrence: { pattern, daysOfWeek, specificDate },
        flowProjectId: draftFlowProjectId || undefined,
        flowNodeId: draftFlowNodeId || undefined,
      });
    } else {
      onAddBlock({
        title: draftTitle.trim(),
        category: draftCategory,
        startMinutes: validStart,
        endMinutes: validEnd,
        bufferMinutes: 5,
        recurrence: { pattern, daysOfWeek, specificDate },
        flowProjectId: draftFlowProjectId || undefined,
        flowNodeId: draftFlowNodeId || undefined,
      });
    }

    setIsCreating(false);
    setEditingBlock(null);
  };

  const nudgeBlockDuration = (blk: TimeBlock, deltaMinutes: number) => {
    const nextEnd = Math.max(
      blk.startMinutes + 30,
      Math.min(1440, blk.endMinutes + deltaMinutes)
    );
    onUpdateBlock({
      ...blk,
      endMinutes: nextEnd,
    });
  };

  return (
    <div
      className={`clay-card rounded-2xl p-3.5 flex flex-col gap-2.5 overflow-hidden select-none transition-all ${
        isCreating
          ? editorScreen === 'custom'
            ? 'min-h-[380px] max-h-[460px]'
            : 'min-h-[320px] max-h-[420px]'
          : 'h-[330px]'
      }`}
    >
      {/* Fixed Header inside Card */}
      <div className="flex items-center justify-between px-1 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold tracking-tight text-slate-100">
            {FULL_DAY_NAMES[selectedDay]}
          </span>
          <div className="flex items-center">
            <button
              onClick={() => setSelectedDay((selectedDay + 6) % 7)}
              className="p-0.5 text-slate-400 hover:text-white transition-colors"
              title="Previous day"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setSelectedDay((selectedDay + 1) % 7)}
              className="p-0.5 text-slate-400 hover:text-white transition-colors"
              title="Next day"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <span className="text-xs font-bold text-slate-400 ml-1">
            {ordinalDateLabel} • {totalDurationLabel}
          </span>
        </div>

        <button
          onClick={openCreateEditor}
          className="clay-button p-1.5 rounded-xl text-slate-200 hover:text-white transition-all"
          title="Add time block"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="h-[1px] w-full bg-white/10 shrink-0" />

      {/* Inline Slot Creator / Editor Modal (Smooth Accordion Expand/Collapse) */}
      <div
        className={`soft-collapse shrink-0 ${
          isCreating ? 'soft-collapse-open' : 'soft-collapse-closed -my-1'
        }`}
      >
        <div className="overflow-hidden">
          <div className="clay-well rounded-2xl p-2.5 flex flex-col gap-2 border border-white/15">
            {editorScreen === 'quick' ? (
              /* SCREEN 1: FAST & CLEAN ESSENTIALS */
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200">
                    {editingBlock ? 'Edit Block' : 'New Block'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <input
                  type="text"
                  autoFocus
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveSlot('repeat-day');
                    }
                  }}
                  placeholder="What are you working on?..."
                  className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-400 select-text"
                />

                <TimeRangeSelector
                  startMinutes={draftStart}
                  endMinutes={draftEnd}
                  onChange={(nextStart, nextEnd) => {
                    setDraftStart(nextStart);
                    setDraftEnd(nextEnd);
                  }}
                />

                {/* The 3 Action Buttons */}
                <div className="flex items-center gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => handleSaveSlot('once')}
                    className="flex-1 py-1.5 px-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-[11px] font-semibold text-slate-200 hover:text-white transition-all text-center"
                    title={`Schedule strictly once for this ${FULL_DAY_NAMES[selectedDay]}`}
                  >
                    Just once
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveSlot('repeat-day')}
                    className="flex-1 py-1.5 px-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-[11px] font-bold text-white shadow-md transition-all text-center flex items-center justify-center gap-1"
                    title={`Repeat on every ${FULL_DAY_NAMES[selectedDay]}`}
                  >
                    <Check className="w-3 h-3" />
                    <span>Every {SHORT_DAY_NAMES[selectedDay]}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditorScreen('custom')}
                    className="clay-button py-1.5 px-2.5 rounded-xl text-[11px] font-semibold text-slate-200 hover:text-white transition-all flex items-center gap-1 shrink-0"
                    title="More options (repeat days, color, flowchart step)"
                  >
                    <span>More...</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ) : (
              /* SCREEN 2: CUSTOMIZATION & MORE OPTIONS */
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setEditorScreen('quick')}
                    className="text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-0.5 transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                    More Options
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Repeat Days Selection */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Repeat on Days
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setDraftRecurrence('daily');
                          setDraftCustomDays([0, 1, 2, 3, 4, 5, 6]);
                        }}
                        className={`text-[10px] px-2 py-0.5 rounded-lg border transition-all ${
                          draftRecurrence === 'daily'
                            ? 'bg-blue-500/25 border-blue-400 text-blue-200 font-bold'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        Everyday
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDraftRecurrence('weekdays');
                          setDraftCustomDays([1, 2, 3, 4, 5]);
                        }}
                        className={`text-[10px] px-2 py-0.5 rounded-lg border transition-all ${
                          draftRecurrence === 'weekdays'
                            ? 'bg-blue-500/25 border-blue-400 text-blue-200 font-bold'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        Weekdays
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {SHORT_DAY_NAMES.map((dayName, idx) => {
                      const isSelected = draftCustomDays.includes(idx);
                      return (
                        <button
                          type="button"
                          key={dayName}
                          onClick={() => {
                            setDraftRecurrence('custom');
                            if (isSelected) {
                              if (draftCustomDays.length > 1) {
                                setDraftCustomDays(
                                  draftCustomDays.filter((d) => d !== idx)
                                );
                              }
                            } else {
                              setDraftCustomDays(
                                [...draftCustomDays, idx].sort()
                              );
                            }
                          }}
                          className={`py-1 rounded-xl text-center text-[10px] font-bold transition-all ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400'
                              : 'bg-white/10 hover:bg-white/20 border border-white/15 text-slate-300 hover:text-white'
                          }`}
                          title={FULL_DAY_NAMES[idx]}
                        >
                          {DAY_LETTERS[idx]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Color / Category Selection */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Category Color
                  </span>
                  <div className="flex items-center gap-1.5">
                    {(Object.keys(CATEGORY_THEMES) as BlockCategory[]).map(
                      (catKey) => {
                        const theme = CATEGORY_THEMES[catKey];
                        const active = draftCategory === catKey;
                        return (
                          <button
                            type="button"
                            key={catKey}
                            onClick={() => setDraftCategory(catKey)}
                            style={{ backgroundColor: theme.solidHex }}
                            className={`h-5 flex-1 rounded-md transition-all duration-300 ${
                              active
                                ? 'ring-2 ring-white scale-105'
                                : 'opacity-70 hover:opacity-100'
                            }`}
                            title={theme.label}
                          />
                        );
                      }
                    )}
                  </div>
                </div>

                {/* Flow Step Link (Optional) */}
                {flowProjects.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Link Flow Step (Optional)
                    </span>
                    <div className="flex items-center gap-1.5">
                      <GitBranch className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <select
                        value={
                          draftFlowProjectId && draftFlowNodeId
                            ? `${draftFlowProjectId}::${draftFlowNodeId}`
                            : ''
                        }
                        onChange={(e) =>
                          handleSelectFlowNodeForBlock(e.target.value)
                        }
                        className="flex-1 min-w-0 bg-slate-900/90 text-slate-200 border border-slate-700/80 rounded-xl px-2 py-1 text-[10px] truncate focus:outline-none focus:border-cyan-400"
                      >
                        <option value="">None</option>
                        {activeFlowProject &&
                          activeFlowProject.nodes
                            .filter((n) => n.status !== 'done')
                            .map((n) => {
                              const isReady =
                                activeFlowProgress?.unlockedNodeIds.has(n.id);
                              return (
                                <option
                                  key={n.id}
                                  value={`${activeFlowProject.id}::${n.id}`}
                                >
                                  {isReady ? '⚡ ' : ''}
                                  {n.title}
                                  {n.estimatedMinutes
                                    ? ` (${n.estimatedMinutes}m)`
                                    : ''}
                                </option>
                              );
                            })}
                        {flowProjects
                          .filter((p) => p.id !== activeFlowProject?.id)
                          .flatMap((p) =>
                            p.nodes
                              .filter((n) => n.status !== 'done')
                              .map((n) => (
                                <option key={n.id} value={`${p.id}::${n.id}`}>
                                  [{p.name}] {n.title}
                                </option>
                              ))
                          )}
                      </select>
                    </div>
                  </div>
                )}

                {/* Save Custom Block Button */}
                <div className="flex items-center justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => handleSaveSlot('custom')}
                    className="clay-button px-4 py-1.5 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 shadow-md bg-blue-600 hover:bg-blue-500 transition-all"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Custom Block</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Unified Scrollable Timeline: Left Hour Rail + Stacked Solid Color Blocks Scroll Together */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden pr-1 flex flex-col gap-2">
        {dayBlocks.length === 0 && !isCreating && (
          <div className="clay-well rounded-2xl p-5 flex flex-col items-center justify-center gap-2 text-center my-auto">
            <span className="text-xs font-semibold text-slate-300">
              No time blocks scheduled
            </span>
            <button
              type="button"
              onClick={openCreateEditor}
              className="clay-button px-3 py-1.5 rounded-xl text-xs font-bold text-white flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Time Block</span>
            </button>
          </div>
        )}
        {dayBlocks.map((blk) => {
          const theme = CATEGORY_THEMES[blk.category];
          const durationMins = Math.max(30, blk.endMinutes - blk.startMinutes);
          const blockHeightPx = Math.min(82, Math.max(48, Math.round(durationMins * 0.62)));

          const isNowActive =
            selectedDay === currentDayOfWeek &&
            currentMinutes >= blk.startMinutes &&
            currentMinutes < blk.endMinutes;
          const isSelected = selectedBlockId === blk.id;

          const linkedFlowNode = blk.flowNodeId
            ? flowProjects
                .flatMap((p) => p.nodes)
                .find((n) => n.id === blk.flowNodeId)
            : undefined;
          const doneSubsCount = linkedFlowNode
            ? linkedFlowNode.subtasks.filter((s) => s.completed).length
            : 0;
          const totalSubsCount = linkedFlowNode
            ? linkedFlowNode.subtasks.length
            : 0;

          return (
            <div
              key={blk.id}
              className="flex items-stretch gap-2 shrink-0 min-w-0"
              style={{ height: `${blockHeightPx}px` }}
            >
              {/* Left Recessed Hour Tab: Shows Start Time, End Time, and Duration */}
              <div className="w-16 shrink-0 rounded-l-2xl rounded-r-md clay-well flex flex-col justify-between py-1.5 px-2 text-right">
                <span
                  className={`text-[10px] font-mono font-bold leading-none ${
                    isNowActive ? 'text-white' : 'text-slate-300'
                  }`}
                >
                  {formatBlockRailTime(blk.startMinutes)}
                </span>
                <span className="text-[9.5px] font-mono font-semibold text-slate-400 leading-none">
                  {formatBlockRailTime(blk.endMinutes)}
                </span>
                <span className="text-[8.5px] font-mono text-slate-500 leading-none">
                  {durationMins}m
                </span>
              </div>

              {/* Right Vibrant Solid Rounded Block */}
              <div
                onClick={() => onSelectBlock(isSelected ? null : blk.id)}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverBlockId(blk.id);
                }}
                onDragLeave={() => setDragOverBlockId(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverBlockId(null);
                  const todoId = e.dataTransfer.getData('text/plain');
                  if (todoId) {
                    onDropTodoOnBlock(todoId, blk.id);
                  }
                }}
                style={{
                  background: theme.pillGradient,
                  boxShadow: isNowActive
                    ? `0 8px 20px -2px ${theme.glowRgba}, inset 0 0 0 2px #ffffff`
                    : `0 4px 12px -2px ${theme.glowRgba}, inset 0 1.5px 1px rgba(255,255,255,0.28), inset 0 -2px 3px rgba(0,0,0,0.25)`,
                }}
                className={`group flex-1 min-w-0 relative rounded-2xl px-3.5 py-2 cursor-pointer flex items-center justify-between gap-2 transition-all duration-150 ${
                  isSelected ? 'ring-2 ring-white' : ''
                } ${
                  dragOverBlockId === blk.id ? 'ring-2 ring-emerald-300' : ''
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {isNowActive && (
                    <span className="px-2 py-0.5 rounded-full bg-white text-slate-950 text-[9px] font-extrabold uppercase tracking-wider shrink-0 shadow">
                      NOW
                    </span>
                  )}
                  <span className="text-xs font-bold text-white tracking-tight truncate drop-shadow-sm">
                    {blk.title}
                  </span>
                  {linkedFlowNode && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenFlowView && onOpenFlowView();
                      }}
                      className="px-1.5 py-0.5 rounded-md bg-black/25 hover:bg-black/40 border border-white/20 text-[9px] font-mono font-bold text-white flex items-center gap-1 shrink-0"
                      title="Open in Flowchart Planner"
                    >
                      <GitBranch className="w-2.5 h-2.5" />
                      {totalSubsCount > 0 && (
                        <span>
                          {doneSubsCount}/{totalSubsCount}
                        </span>
                      )}
                    </button>
                  )}
                </div>

                {/* Default Right Pill: End Time & Duration (switches to controls on hover) */}
                <span className="group-hover:hidden px-2 py-0.5 rounded-lg bg-black/20 text-[10px] font-mono font-semibold text-white/90 shrink-0">
                  → {formatBlockRailTime(blk.endMinutes)} • {durationMins}m
                </span>

                {/* Hover-Only Controls */}
                <div
                  className="hidden group-hover:flex items-center gap-1 transition-opacity shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => nudgeBlockDuration(blk, -15)}
                    className="px-1.5 py-0.5 rounded-md bg-black/25 hover:bg-black/40 text-[10px] font-mono text-white"
                  >
                    -15
                  </button>
                  <button
                    onClick={() => nudgeBlockDuration(blk, 15)}
                    className="px-1.5 py-0.5 rounded-md bg-black/25 hover:bg-black/40 text-[10px] font-mono text-white"
                  >
                    +15
                  </button>
                  <button
                    onClick={() => openEditModal(blk)}
                    className="p-1 rounded-md bg-black/25 hover:bg-black/40 text-white"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onDeleteBlock(blk.id)}
                    className="p-1 rounded-md bg-black/25 hover:bg-black/40 text-white"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
