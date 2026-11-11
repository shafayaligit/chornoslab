import React, { useEffect, useRef, useState } from 'react';
import { CheckSquare, Calendar, CornerDownLeft, X, GitBranch } from 'lucide-react';
import {
  BlockCategory,
  CATEGORY_THEMES,
  FlowProject,
  TimeBlock,
  TodoPriority,
} from '../types/hud';
import { soundFx } from '../utils/soundFx';

export type QuickAddMode = 'task' | 'block';

interface QuickAddCommandModalProps {
  isOpen: boolean;
  initialMode: QuickAddMode;
  blocks: TimeBlock[];
  activeBlock: TimeBlock | null;
  nextBlock: TimeBlock | null;
  flowProjects?: FlowProject[];
  activeFlowProjectId?: string;
  now: Date;
  onClose: () => void;
  onQuickAddTodo: (
    title: string,
    priority: TodoPriority,
    boundBlockId?: string
  ) => void;
  onQuickAddFlowSubtask?: (nodeId: string, title: string) => void;
  onQuickAddBlock: (newBlock: Omit<TimeBlock, 'id'>) => void;
}

export const QuickAddCommandModal: React.FC<QuickAddCommandModalProps> = ({
  isOpen,
  initialMode,
  blocks,
  activeBlock,
  nextBlock,
  flowProjects = [],
  activeFlowProjectId,
  now,
  onClose,
  onQuickAddTodo,
  onQuickAddFlowSubtask,
  onQuickAddBlock,
}) => {
  const [mode, setMode] = useState<QuickAddMode>(initialMode);
  const [title, setTitle] = useState('');

  // Task options
  const [priority, setPriority] = useState<TodoPriority>('high');
  const [boundBlockId, setBoundBlockId] = useState<string>('');

  // Block options
  const [category, setCategory] = useState<BlockCategory>('deep-work');
  const [duration, setDuration] = useState<number>(60);
  const [startTiming, setStartTiming] = useState<'now' | 'next'>('now');
  const [linkedFlowNodeRef, setLinkedFlowNodeRef] = useState<string>('');

  const inputRef = useRef<HTMLInputElement>(null);

  const activeFlowProject =
    flowProjects.find((p) => p.id === activeFlowProjectId) || flowProjects[0];

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setTitle('');
      setBoundBlockId(activeBlock?.id || nextBlock?.id || '');
      setLinkedFlowNodeRef('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 20);
    }
  }, [isOpen, initialMode, activeBlock, nextBlock]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (mode === 'task') {
      if (boundBlockId.startsWith('flow::')) {
        const nodeId = boundBlockId.replace('flow::', '');
        onQuickAddFlowSubtask && onQuickAddFlowSubtask(nodeId, title.trim());
      } else {
        onQuickAddTodo(
          title.trim(),
          priority,
          boundBlockId ? boundBlockId : undefined
        );
      }
    } else {
      const currentMins = now.getHours() * 60 + now.getMinutes();
      const alignedNow = Math.floor(currentMins / 15) * 15;
      const lastEnd =
        blocks.length > 0
          ? Math.max(...blocks.map((b) => b.endMinutes))
          : alignedNow;

      const startMins =
        startTiming === 'now'
          ? alignedNow
          : Math.min(1380, Math.max(alignedNow, lastEnd));
      const endMins = Math.min(1440, startMins + duration);

      const [fProjId, fNodeId] = linkedFlowNodeRef
        ? linkedFlowNodeRef.split('::')
        : ['', ''];

      onQuickAddBlock({
        title: title.trim(),
        category,
        startMinutes: startMins,
        endMinutes: endMins,
        bufferMinutes: 5,
        recurrence: {
          pattern: 'custom',
          daysOfWeek: [now.getDay()],
        },
        flowProjectId: fProjId || undefined,
        flowNodeId: fNodeId || undefined,
      });
    }

    setTitle('');
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      soundFx.playTactileClick(1.05);
      setMode((prev) => (prev === 'task' ? 'block' : 'task'));
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-14 bg-transparent"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
        className="clay-slab rounded-2xl p-3 w-[90vw] max-w-[390px] flex flex-col gap-2.5 border border-white/20"
      >
        {/* Top Row: Mode Switcher + Input + Close */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              soundFx.playTactileClick(1.05);
              setMode(mode === 'task' ? 'block' : 'task');
              inputRef.current?.focus();
            }}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1.5 shrink-0 transition-all ${
              mode === 'task'
                ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/40'
                : 'bg-blue-500/25 text-blue-300 border border-blue-400/40'
            }`}
            title="Press Tab to switch between Task and Block"
          >
            {mode === 'task' ? (
              <>
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Task</span>
              </>
            ) : (
              <>
                <Calendar className="w-3.5 h-3.5" />
                <span>Block</span>
              </>
            )}
          </button>

          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              mode === 'task' ? 'Type task & hit Enter...' : 'Type block name & hit Enter...'
            }
            className="flex-1 bg-transparent text-xs font-medium text-white placeholder-slate-400 focus:outline-none select-text"
          />

          <button
            type="submit"
            className="clay-button p-1.5 rounded-xl text-emerald-300 hover:text-white shrink-0"
            title="Submit (Enter)"
          >
            <CornerDownLeft className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white shrink-0"
            title="Esc"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Bottom Compact Options Row */}
        {mode === 'task' ? (
          <div className="flex items-center justify-between pt-1.5 border-t border-white/10 text-[10px]">
            <div className="flex items-center gap-1">
              {(['high', 'medium', 'low'] as TodoPriority[]).map((p, idx) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`px-2 py-0.5 rounded-md font-mono font-bold transition-all ${
                    priority === p
                      ? 'bg-white/15 text-white'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  P{idx + 1}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <select
                value={boundBlockId}
                onChange={(e) => setBoundBlockId(e.target.value)}
                className="bg-slate-900/90 text-slate-200 border border-slate-700/80 rounded-lg px-2 py-0.5 text-[10px] max-w-[155px] truncate focus:outline-none"
              >
                <option value="">Inbox</option>
                {blocks.map((b) => (
                  <option key={b.id} value={b.id}>
                    Slot: {b.title}
                  </option>
                ))}
                {activeFlowProject &&
                  activeFlowProject.nodes
                    .filter((n) => n.status !== 'done')
                    .map((n) => (
                      <option key={n.id} value={`flow::${n.id}`}>
                        Flow: {n.title}
                      </option>
                    ))}
              </select>
              <span className="font-mono text-slate-500">Tab ⇄</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5 pt-1.5 border-t border-white/10 text-[10px]">
            {activeFlowProject && (
              <div className="flex items-center gap-1.5">
                <GitBranch className="w-3 h-3 text-cyan-400 shrink-0" />
                <select
                  value={linkedFlowNodeRef}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLinkedFlowNodeRef(val);
                    if (val) {
                      const [, nId] = val.split('::');
                      const node = activeFlowProject.nodes.find(
                        (n) => n.id === nId
                      );
                      if (node) {
                        setTitle(node.title);
                        setCategory(node.category || activeFlowProject.category);
                        if (node.estimatedMinutes) {
                          setDuration(node.estimatedMinutes);
                        }
                      }
                    }
                  }}
                  className="flex-1 min-w-0 bg-slate-900/90 text-slate-200 border border-slate-700/80 rounded-lg px-2 py-0.5 text-[10px] truncate focus:outline-none focus:border-cyan-400"
                >
                  <option value="">Link Flow Step (optional)...</option>
                  {activeFlowProject.nodes
                    .filter((n) => n.status !== 'done')
                    .map((n) => (
                      <option
                        key={n.id}
                        value={`${activeFlowProject.id}::${n.id}`}
                      >
                        {n.title}
                        {n.estimatedMinutes ? ` (${n.estimatedMinutes}m)` : ''}
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div className="flex items-center justify-between">
              {/* Color Swatch Dots */}
              <div className="flex items-center gap-1.5">
                {(Object.keys(CATEGORY_THEMES) as BlockCategory[]).map((cat) => {
                  const theme = CATEGORY_THEMES[cat];
                  const active = category === cat;
                  return (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => setCategory(cat)}
                      style={{ backgroundColor: theme.solidHex }}
                      className={`w-4 h-4 rounded-full transition-transform ${
                        active ? 'ring-2 ring-white scale-110' : 'opacity-60 hover:opacity-100'
                      }`}
                      title={theme.label}
                    />
                  );
                })}
              </div>

              {/* Duration Pills */}
              <div className="flex items-center gap-1">
                {[30, 60, 90].map((mins) => (
                  <button
                    type="button"
                    key={mins}
                    onClick={() => setDuration(mins)}
                    className={`px-1.5 py-0.5 rounded font-mono font-bold ${
                      duration === mins
                        ? 'bg-white/15 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>

              {/* Start Now vs Next */}
              <div className="flex items-center gap-1">
                {(['now', 'next'] as const).map((st) => (
                  <button
                    type="button"
                    key={st}
                    onClick={() => setStartTiming(st)}
                    className={`px-1.5 py-0.5 rounded uppercase font-mono font-bold ${
                      startTiming === st
                        ? 'bg-blue-500/25 text-blue-200 border border-blue-400/40'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
