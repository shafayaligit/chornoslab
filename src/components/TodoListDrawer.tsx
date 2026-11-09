import React, { useState } from 'react';
import {
  Check,
  Plus,
  Trash2,
  Sparkles,
  GripVertical,
  GitBranch,
  Play,
} from 'lucide-react';
import {
  CATEGORY_THEMES,
  FlowNode,
  FlowProject,
  TimeBlock,
  TodoItem,
  TodoPriority,
} from '../types/hud';
import { computeFlowProjectProgress } from '../utils/flowCodeParser';

interface TodoListDrawerProps {
  todos: TodoItem[];
  blocks: TimeBlock[];
  activeBlock: TimeBlock | null;
  selectedBlockId: string | null;
  flowProjects?: FlowProject[];
  activeFlowProjectId?: string;
  onAddTodo: (
    title: string,
    priority: TodoPriority,
    boundBlockId?: string
  ) => void;
  onToggleTodo: (todoId: string) => void;
  onBindTodoToBlock: (todoId: string, blockId?: string) => void;
  onDeleteTodo: (todoId: string) => void;
  onToggleFlowSubtask?: (nodeId: string, subtaskId: string) => void;
  onAddFlowSubtask?: (nodeId: string, title: string) => void;
  onScheduleFlowNode?: (project: FlowProject, node: FlowNode, startNow?: boolean) => void;
  onOpenFlowView?: () => void;
}

export const TodoListDrawer: React.FC<TodoListDrawerProps> = ({
  todos,
  blocks,
  activeBlock,
  selectedBlockId,
  flowProjects = [],
  activeFlowProjectId,
  onAddTodo,
  onToggleTodo,
  onDeleteTodo,
  onToggleFlowSubtask,
  onAddFlowSubtask,
  onScheduleFlowNode,
  onOpenFlowView,
}) => {
  const [titleInput, setTitleInput] = useState('');
  const [priority, setPriority] = useState<TodoPriority>('high');
  const [selectedBindId, setSelectedBindId] = useState<string>(
    selectedBlockId || activeBlock?.id || ''
  );
  const [filterTab, setFilterTab] = useState<
    'all' | 'flow' | 'active-block' | 'completed'
  >('all');
  const [burstTodoId, setBurstTodoId] = useState<string | null>(null);

  const activeFlowProject =
    flowProjects.find((p) => p.id === activeFlowProjectId) || flowProjects[0];
  const activeFlowProgress = activeFlowProject
    ? computeFlowProjectProgress(activeFlowProject)
    : null;

  // Gather actionable Flowchart nodes (in-progress or unlocked Next Up, or the node linked to active/selected block)
  const targetBlock = blocks.find(
    (b) => b.id === (selectedBlockId || activeBlock?.id)
  );
  const actionableFlowNodes = activeFlowProject
    ? activeFlowProject.nodes.filter((n) => {
        if (filterTab === 'completed') {
          return n.status === 'done' || n.subtasks.some((s) => s.completed);
        }
        if (filterTab === 'active-block' && targetBlock) {
          return targetBlock.flowNodeId === n.id;
        }
        return (
          n.status === 'in-progress' ||
          activeFlowProgress?.unlockedNodeIds.has(n.id) ||
          targetBlock?.flowNodeId === n.id
        );
      })
    : [];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleInput.trim()) return;
    if (selectedBindId.startsWith('flow::')) {
      const nodeId = selectedBindId.replace('flow::', '');
      if (onAddFlowSubtask) {
        onAddFlowSubtask(nodeId, titleInput.trim());
      }
      setTitleInput('');
      return;
    }
    onAddTodo(
      titleInput.trim(),
      priority,
      selectedBindId ? selectedBindId : undefined
    );
    setTitleInput('');
  };

  const handleTick = (todo: TodoItem) => {
    if (!todo.completed) {
      setBurstTodoId(todo.id);
      setTimeout(() => {
        setBurstTodoId((prev) => (prev === todo.id ? null : prev));
      }, 650);
    }
    onToggleTodo(todo.id);
  };

  const targetBlockId = selectedBlockId || activeBlock?.id;

  const filteredTodos = todos.filter((t) => {
    if (filterTab === 'flow') return false;
    if (filterTab === 'active-block') {
      return targetBlockId ? t.boundBlockId === targetBlockId : true;
    }
    if (filterTab === 'completed') {
      return t.completed;
    }
    return true;
  });

  const priorityDotColor: Record<TodoPriority, string> = {
    high: '#fb7185',
    medium: '#fbbf24',
    low: '#38bdf8',
  };

  return (
    <div className="clay-card rounded-2xl p-3.5 flex flex-col gap-2.5 h-[330px] overflow-hidden">
      {/* Minimal Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
            Tasks
          </h3>
          {activeFlowProject && activeFlowProgress && (
            <button
              type="button"
              onClick={onOpenFlowView}
              className="px-1.5 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-400/30 text-[9.5px] font-mono font-bold text-cyan-300 hover:bg-cyan-500/25 flex items-center gap-1 truncate max-w-[115px]"
              title="Open Flowchart Project"
            >
              <GitBranch className="w-2.5 h-2.5 shrink-0" />
              <span>{activeFlowProgress.percent}%</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 p-1 clay-well rounded-xl text-[10px]">
          <button
            onClick={() => setFilterTab('all')}
            className={`px-2 py-0.5 rounded-lg font-medium transition-all ${
              filterTab === 'all'
                ? 'clay-button text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterTab('flow')}
            className={`px-2 py-0.5 rounded-lg font-medium transition-all ${
              filterTab === 'flow'
                ? 'clay-button text-cyan-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Flow
          </button>
          <button
            onClick={() => setFilterTab('active-block')}
            className={`px-2 py-0.5 rounded-lg font-medium transition-all ${
              filterTab === 'active-block'
                ? 'clay-button text-violet-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Slot
          </button>
          <button
            onClick={() => setFilterTab('completed')}
            className={`px-2 py-0.5 rounded-lg font-medium transition-all ${
              filterTab === 'completed'
                ? 'clay-button text-emerald-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Done
          </button>
        </div>
      </div>

      {/* Compact Add Task Bar */}
      <form
        onSubmit={handleCreate}
        className="clay-well rounded-2xl p-2 flex flex-col gap-2"
      >
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            placeholder={
              selectedBindId.startsWith('flow::')
                ? 'Add subtask to Flow step...'
                : 'Add task...'
            }
            className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none px-1.5 select-text"
          />
          <button
            type="submit"
            className="clay-button px-2.5 py-1 rounded-xl text-xs font-medium text-emerald-300 flex items-center gap-1 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5 text-[10px]">
          <div className="flex items-center gap-1">
            {(['high', 'medium', 'low'] as TodoPriority[]).map((p, idx) => (
              <button
                type="button"
                key={p}
                onClick={() => setPriority(p)}
                className={`px-1.5 py-0.5 rounded font-mono transition-all ${
                  priority === p
                    ? 'bg-white/10 text-white'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                P{idx + 1}
              </button>
            ))}
          </div>

          <select
            value={selectedBindId}
            onChange={(e) => setSelectedBindId(e.target.value)}
            className="bg-slate-900/90 text-slate-300 border border-slate-700/80 rounded-lg px-2 py-0.5 text-[10px] max-w-[155px] truncate focus:outline-none focus:border-violet-400"
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
        </div>
      </form>

      {/* Single-Line Task Items + Flowchart Subtasks */}
      <div className="flex flex-col gap-1.5 flex-1 overflow-y-auto pr-1">
        {actionableFlowNodes.map((node) => {
          const isUnlocked = activeFlowProgress?.unlockedNodeIds.has(node.id);
          const visibleSubs = node.subtasks.filter((s) =>
            filterTab === 'completed' ? s.completed : true
          );
          if (visibleSubs.length === 0 && filterTab === 'completed') return null;

          return (
            <div
              key={node.id}
              className="clay-well rounded-xl p-2 flex flex-col gap-1 border border-cyan-400/20"
            >
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <GitBranch className="w-3 h-3 text-cyan-400 shrink-0" />
                  <span className="text-[11px] font-bold text-cyan-200 truncate">
                    {node.title}
                  </span>
                  {isUnlocked && (
                    <span className="px-1 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[8.5px] font-mono font-extrabold uppercase shrink-0">
                      Next
                    </span>
                  )}
                </div>

                {activeFlowProject && onScheduleFlowNode && node.status !== 'done' && (
                  <button
                    type="button"
                    onClick={() =>
                      onScheduleFlowNode(activeFlowProject, node, false)
                    }
                    className="px-1.5 py-0.5 rounded-md bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-400/30 text-cyan-200 text-[9px] font-mono font-bold flex items-center gap-1 shrink-0"
                    title="Schedule a focus block for this Flow step"
                  >
                    <Play className="w-2.5 h-2.5 fill-current" />
                    <span>
                      {node.estimatedMinutes ? `${node.estimatedMinutes}m` : 'Slot'}
                    </span>
                  </button>
                )}
              </div>

              {visibleSubs.map((st) => (
                <div
                  key={st.id}
                  onClick={() =>
                    onToggleFlowSubtask && onToggleFlowSubtask(node.id, st.id)
                  }
                  className="flex items-center gap-2 px-1.5 py-1 rounded-lg hover:bg-white/[0.04] cursor-pointer transition-colors"
                >
                  <div
                    className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 transition-all ${
                      st.completed
                        ? 'bg-emerald-500/30 border border-emerald-400 text-emerald-300'
                        : 'clay-well border border-slate-600'
                    }`}
                  >
                    {st.completed && <Check className="w-2.5 h-2.5 stroke-[2.5]" />}
                  </div>
                  <span
                    className={`text-xs truncate ${
                      st.completed
                        ? 'line-through text-slate-500'
                        : 'text-slate-100'
                    }`}
                  >
                    {st.title}
                  </span>
                </div>
              ))}
            </div>
          );
        })}

        {filteredTodos.length === 0 && actionableFlowNodes.length === 0 ? (
          <div className="clay-well rounded-xl py-5 text-center text-xs text-slate-500">
            Empty
          </div>
        ) : (
          filteredTodos.map((todo) => {
            const boundBlock = blocks.find((b) => b.id === todo.boundBlockId);
            const blockTheme = boundBlock
              ? CATEGORY_THEMES[boundBlock.category]
              : null;
            const isBursting = burstTodoId === todo.id;

            return (
              <div
                key={todo.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', todo.id);
                }}
                className={`clay-card clay-card-interactive rounded-xl px-2.5 py-2 flex items-center justify-between gap-2 relative overflow-hidden transition-all ${
                  todo.completed ? 'opacity-55' : ''
                }`}
              >
                {isBursting && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-emerald-400/15 animate-pulse">
                    <Sparkles className="w-5 h-5 text-emerald-300 animate-ping" />
                  </div>
                )}

                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <GripVertical className="w-3 h-3 text-slate-600 cursor-grab shrink-0" />

                  <button
                    onClick={() => handleTick(todo)}
                    className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 transition-all ${
                      todo.completed
                        ? 'bg-emerald-500/30 border border-emerald-400 text-emerald-300'
                        : 'clay-well hover:border-violet-400/50 text-transparent'
                    }`}
                  >
                    <Check className="w-3 h-3 stroke-[2.5]" />
                  </button>

                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: priorityDotColor[todo.priority] }}
                  />

                  <span
                    className={`text-xs font-medium truncate ${
                      todo.completed
                        ? 'line-through text-slate-400'
                        : 'text-slate-100'
                    }`}
                  >
                    {todo.title}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {boundBlock && blockTheme && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md border truncate max-w-[95px] ${blockTheme.badgeClass}`}
                    >
                      {boundBlock.title}
                    </span>
                  )}

                  <button
                    onClick={() => onDeleteTodo(todo.id)}
                    className="clay-button p-1 rounded-lg text-slate-400 hover:text-rose-400"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
