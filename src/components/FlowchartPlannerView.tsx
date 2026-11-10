import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Clock,
  Calendar,
  CheckSquare,
  GitBranch,
  Plus,
  Play,
  Check,
  Trash2,
  Edit3,
  Code2,
  Sparkles,
  Copy,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronDown,
  ChevronRight,
  GripHorizontal,
  X,
  Zap,
  Circle,
  Disc,
  CheckCircle2,
  FolderPlus,
} from 'lucide-react';
import {
  BlockCategory,
  CATEGORY_THEMES,
  DrawerMode,
  FlowEdge,
  FlowNode,
  FlowNodeStatus,
  FlowProject,
  HUD_VISUAL_THEMES,
  TimeBlock,
  WindowStateConfig,
} from '../types/hud';
import {
  autoLayoutFlowGraph,
  computeFlowProjectProgress,
  getAiPromptTemplate,
  parseFlowCode,
  serializeFlowToCode,
} from '../utils/flowCodeParser';
import { soundFx } from '../utils/soundFx';

interface FlowchartPlannerViewProps {
  now: Date;
  projects: FlowProject[];
  activeProjectId: string;
  activeBlock: TimeBlock | null;
  windowConfig: WindowStateConfig;
  onStartDrag: (e: React.MouseEvent<HTMLDivElement>) => void;
  onSetDrawerMode: (mode: DrawerMode) => void;
  onSelectProject: (projectId: string) => void;
  onUpdateProject: (updated: FlowProject) => void;
  onCreateProject: (project: FlowProject) => void;
  onDeleteProject: (projectId: string) => void;
  onScheduleFlowNode: (
    project: FlowProject,
    node: FlowNode,
    startNow?: boolean
  ) => void;
  onAutoScheduleReadyNodes: (project: FlowProject) => number;
  onFinishActiveBlockEarly: () => void;
}

type NodeFilterMode = 'all' | 'next' | 'doing' | 'done';

const DEFAULT_NODE_WIDTH = 220;

export const FlowchartPlannerView: React.FC<FlowchartPlannerViewProps> = ({
  now,
  projects,
  activeProjectId,
  activeBlock,
  windowConfig,
  onStartDrag,
  onSetDrawerMode,
  onSelectProject,
  onUpdateProject,
  onCreateProject,
  onDeleteProject,
  onScheduleFlowNode,
  onAutoScheduleReadyNodes,
  onFinishActiveBlockEarly,
}) => {
  const activeThemeKey = windowConfig.visualTheme || 'neutral';
  const isLightMode = HUD_VISUAL_THEMES[activeThemeKey]?.mode === 'light';

  const themeNodeSurface =
    activeThemeKey === 'space'
      ? 'bg-[#261952]/95'
      : activeThemeKey === 'cats'
      ? 'bg-[#3d2419]/95'
      : activeThemeKey === 'flowers'
      ? 'bg-[#fff5f9]/95'
      : activeThemeKey === 'monkeys'
      ? 'bg-[#fffdf2]/95'
      : activeThemeKey === 'otter'
      ? 'bg-[#f4faff]/95'
      : 'bg-[#151d2d]/95';

  const themeFloatingBarSurface =
    activeThemeKey === 'space'
      ? 'bg-[#191038]/95 border-violet-400/35'
      : activeThemeKey === 'cats'
      ? 'bg-[#281710]/95 border-amber-400/35'
      : activeThemeKey === 'flowers'
      ? 'bg-[#fff0f6]/95 border-pink-600/30'
      : activeThemeKey === 'monkeys'
      ? 'bg-[#fef9e7]/95 border-amber-700/30'
      : activeThemeKey === 'otter'
      ? 'bg-[#eef8ff]/95 border-sky-700/30'
      : 'bg-[#0f1522]/95 border-sky-400/25';
  const activeProject = useMemo(
    () =>
      projects.find((p) => p.id === activeProjectId) ||
      projects[0] || {
        id: 'proj-default',
        name: 'My Flowchart',
        category: 'deep-work' as BlockCategory,
        nodes: [],
        edges: [],
        createdAt: new Date().toISOString(),
      },
    [projects, activeProjectId]
  );

  useEffect(() => {
    if (projects.length === 0) {
      onCreateProject({
        id: `proj-${Date.now()}`,
        name: 'My Flowchart',
        category: 'deep-work',
        nodes: [],
        edges: [],
        createdAt: new Date().toISOString(),
      });
    }
  }, [projects.length, onCreateProject]);

  const progress = useMemo(
    () => computeFlowProjectProgress(activeProject),
    [activeProject]
  );

  // Canvas Pan & Zoom state
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 28, y: 24 });
  const [zoom, setZoom] = useState<number>(0.95);
  const [filterMode, setFilterMode] = useState<NodeFilterMode>('all');

  // Instant 60fps local drag position state (commits to parent only on mouseup)
  const [liveDragNode, setLiveDragNode] = useState<{
    id: string;
    x: number;
    y: number;
  } | null>(null);

  // Track dynamic DOM width & height of each node so Bezier arrows and Auto-Layout space accurately
  const [nodeWidths, setNodeWidths] = useState<Record<string, number>>({});
  const [nodeHeights, setNodeHeights] = useState<Record<string, number>>({});
  const nodeElementsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const autoFixedProjectsRef = useRef<Set<string>>(new Set());

  // Subtasks are COLLAPSED by default; only expand when clicked on!
  const [expandedSubtasksIds, setExpandedSubtasksIds] = useState<Set<string>>(
    new Set()
  );
  const [addingSubtaskNodeId, setAddingSubtaskNodeId] = useState<string | null>(
    null
  );
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [newSubtaskInputs, setNewSubtaskInputs] = useState<
    Record<string, string>
  >({});
  const [editingSubtaskKey, setEditingSubtaskKey] = useState<string | null>(
    null
  );
  const [editingSubtaskText, setEditingSubtaskText] = useState<string>('');

  // Project CRUD modals/popovers
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectCategory, setNewProjectCategory] =
    useState<BlockCategory>('deep-work');

  const [isEditingProjectMeta, setIsEditingProjectMeta] = useState(false);
  const [editProjectName, setEditProjectName] = useState(activeProject.name);

  // AI Code Drawer state
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [codeDraft, setCodeDraft] = useState('');
  const [copiedPromptToast, setCopiedPromptToast] = useState(false);
  const [statusToast, setStatusToast] = useState<string | null>(null);

  // Refs for zero-latency pointer tracking
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const activeProjectRef = useRef(activeProject);
  activeProjectRef.current = activeProject;
  const onUpdateProjectRef = useRef(onUpdateProject);
  onUpdateProjectRef.current = onUpdateProject;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const panRef = useRef(pan);
  panRef.current = pan;

  const panDragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  }>({ active: false, startX: 0, startY: 0, originX: 0, originY: 0 });

  const nodeDragRef = useRef<{
    nodeId: string | null;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    currentX: number;
    currentY: number;
    moved: boolean;
  }>({
    nodeId: null,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    currentX: 0,
    currentY: 0,
    moved: false,
  });

  const [connectingFromNodeId, setConnectingFromNodeId] = useState<
    string | null
  >(null);
  const connectingRef = useRef<string | null>(null);
  connectingRef.current = connectingFromNodeId;
  const [connectCursor, setConnectCursor] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  useEffect(() => {
    setEditProjectName(activeProject.name);
  }, [activeProject.id, activeProject.name]);

  // Measure dynamic node widths & heights whenever nodes or their content change
  useEffect(() => {
    const nextWidths: Record<string, number> = {};
    const nextHeights: Record<string, number> = {};
    const measuredSizes: Record<string, { w: number; h: number }> = {};

    nodeElementsRef.current.forEach((el, id) => {
      if (el) {
        const w = el.offsetWidth || DEFAULT_NODE_WIDTH;
        const h = el.offsetHeight || 110;
        nextWidths[id] = w;
        nextHeights[id] = h;
        measuredSizes[id] = { w, h };
      }
    });

    setNodeWidths((prev) => {
      const changed = Object.keys(nextWidths).some(
        (k) => prev[k] !== nextWidths[k]
      );
      return changed ? nextWidths : prev;
    });
    setNodeHeights((prev) => {
      const changed = Object.keys(nextHeights).some(
        (k) => prev[k] !== nextHeights[k]
      );
      return changed ? nextHeights : prev;
    });

    // If any two nodes in this project overlap (e.g. from older tight colGap), auto-layout once automatically
    if (
      activeProject.nodes.length > 1 &&
      !autoFixedProjectsRef.current.has(activeProject.id)
    ) {
      let hasOverlap = false;
      const nodes = activeProject.nodes;
      for (let i = 0; i < nodes.length && !hasOverlap; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const aw = nextWidths[a.id] || 310;
          const ah = nextHeights[a.id] || 115;
          const bw = nextWidths[b.id] || 310;
          const bh = nextHeights[b.id] || 115;
          const overlapX = a.x < b.x + bw + 24 && a.x + aw + 24 > b.x;
          const overlapY = a.y < b.y + bh + 16 && a.y + ah + 16 > b.y;
          if (overlapX && overlapY) {
            hasOverlap = true;
            break;
          }
        }
      }
      autoFixedProjectsRef.current.add(activeProject.id);
      if (hasOverlap) {
        const laidOut = autoLayoutFlowGraph(
          activeProject.nodes,
          activeProject.edges,
          measuredSizes
        );
        onUpdateProjectRef.current({
          ...activeProject,
          nodes: laidOut,
        });
      }
    }
  }, [
    activeProject.id,
    activeProject.nodes,
    activeProject.edges,
    expandedSubtasksIds,
    editingNodeId,
    addingSubtaskNodeId,
  ]);

  const showToast = (msg: string) => {
    setStatusToast(msg);
    window.setTimeout(() => {
      setStatusToast((prev) => (prev === msg ? null : prev));
    }, 2200);
  };

  // Single persistent window listener for 0ms lag node dragging & canvas panning
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (panDragRef.current.active) {
        const dx = e.clientX - panDragRef.current.startX;
        const dy = e.clientY - panDragRef.current.startY;
        setPan({
          x: panDragRef.current.originX + dx,
          y: panDragRef.current.originY + dy,
        });
        return;
      }

      if (nodeDragRef.current.nodeId) {
        const z = zoomRef.current;
        const dx = (e.clientX - nodeDragRef.current.startX) / z;
        const dy = (e.clientY - nodeDragRef.current.startY) / z;
        const nextX = Math.round(nodeDragRef.current.originX + dx);
        const nextY = Math.round(nodeDragRef.current.originY + dy);
        nodeDragRef.current.currentX = nextX;
        nodeDragRef.current.currentY = nextY;
        nodeDragRef.current.moved = true;

        setLiveDragNode({
          id: nodeDragRef.current.nodeId,
          x: nextX,
          y: nextY,
        });
        return;
      }

      if (connectingRef.current && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const p = panRef.current;
        const z = zoomRef.current;
        const canvasX = (e.clientX - rect.left - p.x) / z;
        const canvasY = (e.clientY - rect.top - p.y) / z;
        setConnectCursor({ x: canvasX, y: canvasY });
      }
    };

    const handleMouseUp = () => {
      if (panDragRef.current.active) {
        panDragRef.current.active = false;
      }

      if (nodeDragRef.current.nodeId) {
        const draggedId = nodeDragRef.current.nodeId;
        const finalX = nodeDragRef.current.currentX;
        const commitY = nodeDragRef.current.currentY;
        const wasMoved = nodeDragRef.current.moved;

        nodeDragRef.current.nodeId = null;
        nodeDragRef.current.moved = false;
        setLiveDragNode(null);

        if (wasMoved) {
          const proj = activeProjectRef.current;
          onUpdateProjectRef.current({
            ...proj,
            nodes: proj.nodes.map((n) =>
              n.id === draggedId ? { ...n, x: finalX, y: commitY } : n
            ),
          });
        }
      }

      if (connectingRef.current) {
        setConnectingFromNodeId(null);
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Merge live drag coordinates so both the dragged card and connected SVG arrows update at 60fps
  const displayNodes = useMemo(() => {
    if (!liveDragNode) return activeProject.nodes;
    return activeProject.nodes.map((n) =>
      n.id === liveDragNode.id
        ? { ...n, x: liveDragNode.x, y: liveDragNode.y }
        : n
    );
  }, [activeProject.nodes, liveDragNode]);

  const nodeById = useMemo(() => {
    const map = new Map<string, FlowNode>();
    displayNodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [displayNodes]);

  const hours24 = now.getHours();
  const minutes = now.getMinutes();
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const clockLabel = `${String(hours12).padStart(2, '0')}:${String(
    minutes
  ).padStart(2, '0')} ${hours24 >= 12 ? 'PM' : 'AM'}`;

  const formatDurationLabel = (mins: number) => {
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  // --- Node & Subtask Mutations ---
  const handleCycleNodeStatus = (node: FlowNode) => {
    const order: FlowNodeStatus[] = ['todo', 'in-progress', 'done'];
    const nextStatus = order[(order.indexOf(node.status) + 1) % order.length];
    if (nextStatus === 'done') {
      soundFx.playTaskComplete();
    } else {
      soundFx.playTactileClick(1.05);
    }

    onUpdateProject({
      ...activeProject,
      nodes: activeProject.nodes.map((n) =>
        n.id === node.id
          ? {
              ...n,
              status: nextStatus,
              subtasks:
                nextStatus === 'done'
                  ? n.subtasks.map((s) => ({ ...s, completed: true }))
                  : n.subtasks,
            }
          : n
      ),
    });
  };

  const handleUpdateNodeFields = (
    nodeId: string,
    patch: Partial<FlowNode>
  ) => {
    onUpdateProject({
      ...activeProject,
      nodes: activeProject.nodes.map((n) =>
        n.id === nodeId ? { ...n, ...patch } : n
      ),
    });
  };

  const handleDeleteNode = (nodeId: string) => {
    soundFx.playTactileClick(0.85);
    onUpdateProject({
      ...activeProject,
      nodes: activeProject.nodes.filter((n) => n.id !== nodeId),
      edges: activeProject.edges.filter(
        (e) => e.source !== nodeId && e.target !== nodeId
      ),
    });
    if (editingNodeId === nodeId) setEditingNodeId(null);
  };

  const handleAddStandaloneNode = () => {
    soundFx.playPhaseTransition();
    const id = `step_${Date.now().toString().slice(-4)}`;

    let newX = Math.round((220 - pan.x) / zoom);
    let newY = Math.round((180 - pan.y) / zoom);

    if (activeProject.nodes.length > 0) {
      const maxX = Math.max(...activeProject.nodes.map((n) => n.x));
      const rightmost =
        activeProject.nodes.find((n) => n.x === maxX) ||
        activeProject.nodes[activeProject.nodes.length - 1];
      const rightW = nodeWidths[rightmost.id] || DEFAULT_NODE_WIDTH;
      newX = rightmost.x + rightW + 80;
      newY = rightmost.y;
    }

    const newNode: FlowNode = {
      id,
      title: `Step ${activeProject.nodes.length + 1}`,
      category: activeProject.category || 'deep-work',
      status: 'todo',
      x: Math.max(40, newX),
      y: Math.max(40, newY),
      subtasks: [],
    };
    onUpdateProject({
      ...activeProject,
      nodes: [...activeProject.nodes, newNode],
    });
    setEditingNodeId(id);
    showToast(`Added "${newNode.title}"`);
  };

  const handleAddChildNode = (parentNode: FlowNode) => {
    soundFx.playPhaseTransition();
    const id = `step_${Date.now().toString().slice(-4)}`;
    const existingChildren = activeProject.edges
      .filter((e) => e.source === parentNode.id)
      .map((e) => activeProject.nodes.find((n) => n.id === e.target))
      .filter(Boolean) as FlowNode[];

    const offsetY =
      existingChildren.length === 0
        ? 0
        : existingChildren.length % 2 === 1
        ? 140 * Math.ceil(existingChildren.length / 2)
        : -140 * Math.ceil(existingChildren.length / 2);

    const parentW = nodeWidths[parentNode.id] || DEFAULT_NODE_WIDTH;
    const newNode: FlowNode = {
      id,
      title: 'Next Step',
      category: parentNode.category,
      status: 'todo',
      x: parentNode.x + parentW + 85,
      y: Math.max(24, parentNode.y + offsetY),
      subtasks: [],
    };

    const newEdge: FlowEdge = {
      id: `e-${parentNode.id}-${id}`,
      source: parentNode.id,
      target: id,
    };

    onUpdateProject({
      ...activeProject,
      nodes: [...activeProject.nodes, newNode],
      edges: [...activeProject.edges, newEdge],
    });
    setEditingNodeId(id);
  };

  const handleCompletePortConnection = (targetNodeId: string) => {
    if (!connectingFromNodeId || connectingFromNodeId === targetNodeId) {
      setConnectingFromNodeId(null);
      return;
    }
    const exists = activeProject.edges.some(
      (e) =>
        (e.source === connectingFromNodeId && e.target === targetNodeId) ||
        (e.source === targetNodeId && e.target === connectingFromNodeId)
    );
    if (!exists) {
      soundFx.playTactileClick(1.15);
      onUpdateProject({
        ...activeProject,
        edges: [
          ...activeProject.edges,
          {
            id: `e-${connectingFromNodeId}-${targetNodeId}`,
            source: connectingFromNodeId,
            target: targetNodeId,
          },
        ],
      });
    }
    setConnectingFromNodeId(null);
  };

  const handleDeleteEdge = (edgeId: string) => {
    soundFx.playTactileClick(0.85);
    onUpdateProject({
      ...activeProject,
      edges: activeProject.edges.filter((e) => e.id !== edgeId),
    });
  };

  // --- Subtask CRUD inside a Node ---
  const handleToggleSubtask = (nodeId: string, subtaskId: string) => {
    const node = activeProject.nodes.find((n) => n.id === nodeId);
    if (!node) return;

    const updatedSubtasks = node.subtasks.map((s) =>
      s.id === subtaskId ? { ...s, completed: !s.completed } : s
    );
    const allCompleted =
      updatedSubtasks.length > 0 && updatedSubtasks.every((s) => s.completed);
    const anyCompleted = updatedSubtasks.some((s) => s.completed);

    let nextStatus: FlowNodeStatus = node.status;
    if (allCompleted) {
      nextStatus = 'done';
      soundFx.playTaskComplete();
    } else if (anyCompleted && node.status === 'todo') {
      nextStatus = 'in-progress';
      soundFx.playTactileClick(1.08);
    } else if (!allCompleted && node.status === 'done') {
      nextStatus = 'in-progress';
      soundFx.playTactileClick(0.95);
    } else {
      soundFx.playTactileClick(1.0);
    }

    handleUpdateNodeFields(nodeId, {
      subtasks: updatedSubtasks,
      status: nextStatus,
    });
  };

  const handleAddSubtask = (nodeId: string) => {
    const raw = (newSubtaskInputs[nodeId] || '').trim();
    if (!raw) {
      setAddingSubtaskNodeId(null);
      return;
    }
    const node = activeProject.nodes.find((n) => n.id === nodeId);
    if (!node) return;

    soundFx.playTactileClick(1.1);
    const newSt = {
      id: `st-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      title: raw,
      completed: false,
    };

    handleUpdateNodeFields(nodeId, {
      subtasks: [...node.subtasks, newSt],
      status: node.status === 'done' ? 'in-progress' : node.status,
    });
    setNewSubtaskInputs((prev) => ({ ...prev, [nodeId]: '' }));
    // Keep this node's subtasks expanded so user sees the added subtask
    setExpandedSubtasksIds((prev) => new Set(prev).add(nodeId));
  };

  const handleSaveSubtaskEdit = (nodeId: string, subtaskId: string) => {
    const trimmed = editingSubtaskText.trim();
    setEditingSubtaskKey(null);
    if (!trimmed) return;
    const node = activeProject.nodes.find((n) => n.id === nodeId);
    if (!node) return;
    handleUpdateNodeFields(nodeId, {
      subtasks: node.subtasks.map((s) =>
        s.id === subtaskId ? { ...s, title: trimmed } : s
      ),
    });
  };

  const handleDeleteSubtask = (nodeId: string, subtaskId: string) => {
    soundFx.playTactileClick(0.85);
    const node = activeProject.nodes.find((n) => n.id === nodeId);
    if (!node) return;
    handleUpdateNodeFields(nodeId, {
      subtasks: node.subtasks.filter((s) => s.id !== subtaskId),
    });
  };

  // --- Auto-Layout & Fit-to-Viewport ---
  const fitGraphInViewport = (
    targetNodes: FlowNode[],
    sizes?: Record<string, { w: number; h: number }>
  ) => {
    if (targetNodes.length === 0) {
      setPan({ x: 36, y: 36 });
      setZoom(0.95);
      return;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const n of targetNodes) {
      const w = sizes?.[n.id]?.w || nodeWidths[n.id] || DEFAULT_NODE_WIDTH;
      const h = sizes?.[n.id]?.h || nodeHeights[n.id] || 76;
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + w);
      maxY = Math.max(maxY, n.y + h);
    }

    const graphW = Math.max(240, maxX - minX);
    const graphH = Math.max(120, maxY - minY);
    const canvasW = canvasRef.current?.clientWidth || 920;
    const canvasH = canvasRef.current?.clientHeight || 580;

    const padX = 64;
    const padY = 64;
    const scaleX = (canvasW - padX * 2) / graphW;
    const scaleY = (canvasH - padY * 2) / graphH;
    const idealZoom = Number(
      Math.max(0.55, Math.min(1.0, Math.min(scaleX, scaleY))).toFixed(2)
    );

    const centeredX = Math.round(
      (canvasW - graphW * idealZoom) / 2 - minX * idealZoom
    );
    const centeredY = Math.round(
      Math.max(28, (canvasH - graphH * idealZoom) / 2 - minY * idealZoom)
    );

    setZoom(idealZoom);
    setPan({ x: centeredX, y: centeredY });
  };

  const handleAutoLayout = () => {
    soundFx.playPhaseTransition();
    const measuredSizes: Record<string, { w: number; h: number }> = {};
    nodeElementsRef.current.forEach((el, id) => {
      if (el) {
        measuredSizes[id] = {
          w: el.offsetWidth || DEFAULT_NODE_WIDTH,
          h: el.offsetHeight || 76,
        };
      }
    });
    const laidOut = autoLayoutFlowGraph(
      activeProject.nodes,
      activeProject.edges,
      measuredSizes
    );
    onUpdateProject({
      ...activeProject,
      nodes: laidOut,
    });
    fitGraphInViewport(laidOut, measuredSizes);
    showToast('Flowchart auto-aligned & centered');
  };

  // --- Project Management ---
  const handleCreateNewProject = () => {
    const name = newProjectName.trim() || 'Untitled Project';
    soundFx.playPhaseTransition();
    const created: FlowProject = {
      id: `proj-${Date.now()}`,
      name,
      category: newProjectCategory,
      createdAt: new Date().toISOString(),
      nodes: [
        {
          id: 'kickoff',
          title: `${name} Kickoff`,
          category: newProjectCategory,
          status: 'todo',
          x: 60,
          y: 160,
          subtasks: [
            {
              id: `st-${Date.now()}-1`,
              title: 'Define scope & goals',
              completed: false,
            },
          ],
        },
      ],
      edges: [],
    };
    onCreateProject(created);
    setNewProjectName('');
    setIsNewProjectOpen(false);
    showToast(`Created "${name}"`);
  };

  const handleResetProjectProgress = () => {
    soundFx.playTactileClick(0.95);
    onUpdateProject({
      ...activeProject,
      nodes: activeProject.nodes.map((n) => ({
        ...n,
        status: 'todo',
        subtasks: n.subtasks.map((s) => ({ ...s, completed: false })),
      })),
    });
    showToast('Project progress reset');
  };

  // --- AI Code Modal Handlers ---
  const handleOpenCodeModal = () => {
    soundFx.playTactileClick(1.1);
    const existingCode = serializeFlowToCode(activeProject);
    if (!existingCode || activeProject.nodes.length === 0) {
      setCodeDraft(
`project "${activeProject.name || 'My Flowchart'}" #deep-work

[research] "Research & Outline" (doing)
  - Define core scope
  - Review references

[design] "Architecture Design"
  - Database schema
  - API endpoints

[build] "Implementation"
  - Core features
  - Integration tests

[ship] "Review & Deploy"
  - Final QA check

research --> design
design --> build
build --> ship`
      );
    } else {
      setCodeDraft(existingCode);
    }
    setIsCodeModalOpen(true);
  };

  const handleCopyAiPrompt = async () => {
    soundFx.playTactileClick(1.15);
    const template = getAiPromptTemplate();
    try {
      await navigator.clipboard.writeText(template);
      setCopiedPromptToast(true);
      window.setTimeout(() => setCopiedPromptToast(false), 2500);
    } catch {
      setCodeDraft(template);
    }
  };

  const handleRenderCodeIntoCurrentProject = () => {
    if (!codeDraft.trim()) return;
    soundFx.playPhaseTransition();
    const parsed = parseFlowCode(
      codeDraft,
      activeProject.name,
      activeProject.category
    );
    onUpdateProject({
      ...activeProject,
      name: parsed.name || activeProject.name,
      category: parsed.category || activeProject.category,
      nodes: parsed.nodes,
      edges: parsed.edges,
      rawCode: codeDraft,
    });
    setIsCodeModalOpen(false);
    setPan({ x: 28, y: 24 });
    setZoom(0.95);
    showToast(`Rendered ${parsed.nodes.length} flowchart nodes`);
  };

  const handleRenderCodeAsNewProject = () => {
    if (!codeDraft.trim()) return;
    soundFx.playPhaseTransition();
    const parsed = parseFlowCode(codeDraft, 'AI Project Plan', 'deep-work');
    const created: FlowProject = {
      id: `proj-${Date.now()}`,
      name: parsed.name,
      category: parsed.category,
      nodes: parsed.nodes,
      edges: parsed.edges,
      rawCode: codeDraft,
      createdAt: new Date().toISOString(),
    };
    onCreateProject(created);
    setIsCodeModalOpen(false);
    setPan({ x: 28, y: 24 });
    setZoom(0.95);
    showToast(`Created "${created.name}" (${created.nodes.length} nodes)`);
  };

  const isNodeMatchesFilter = (node: FlowNode): boolean => {
    if (filterMode === 'all') return true;
    if (filterMode === 'done') return node.status === 'done';
    if (filterMode === 'doing') return node.status === 'in-progress';
    if (filterMode === 'next') return progress.unlockedNodeIds.has(node.id);
    return true;
  };

  const isCornerStart =
    (windowConfig.dockOffsetRatio ?? 0.5) < 0.28;

  return (
    <div className="flex flex-col gap-2 w-full h-[calc(100vh-32px)] min-h-[380px] max-h-[735px] select-none relative">
      {/* 1. CLEAN UNCLUTTERED PROJECT & NAVIGATION BAR */}
      <div
        onMouseDown={onStartDrag}
        data-tauri-drag-region
        className="clay-well rounded-2xl px-3 py-2 flex items-center justify-between gap-3 shrink-0 border border-white/10"
      >
        {/* Left: Drag Handle (shifts to right if in corner) + Full-Width Project Switcher + Project Actions */}
        <div
          className="flex items-center gap-1.5 flex-1 min-w-0"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {!isCornerStart && (
            <div
              onMouseDown={onStartDrag}
              className="p-1 text-slate-400 hover:text-white cursor-grab active:cursor-grabbing shrink-0"
              title="Drag Window"
            >
              <GripHorizontal className="w-3.5 h-3.5" />
            </div>
          )}

          {/* Project Selector / Inline Rename */}
          {isEditingProjectMeta ? (
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <input
                type="text"
                value={editProjectName}
                onChange={(e) => setEditProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onUpdateProject({
                      ...activeProject,
                      name: editProjectName.trim() || activeProject.name,
                    });
                    setIsEditingProjectMeta(false);
                  } else if (e.key === 'Escape') {
                    setIsEditingProjectMeta(false);
                  }
                }}
                autoFocus
                className={`px-2.5 py-1 rounded-xl border border-cyan-400/50 text-xs font-bold flex-1 min-w-0 focus:outline-none ${
                  isLightMode
                    ? 'bg-white/95 text-slate-900'
                    : 'bg-slate-900 text-white'
                }`}
              />
              <button
                onClick={() => {
                  onUpdateProject({
                    ...activeProject,
                    name: editProjectName.trim() || activeProject.name,
                  });
                  setIsEditingProjectMeta(false);
                }}
                className="p-1 rounded-lg bg-emerald-500/30 text-emerald-200 hover:bg-emerald-500/50 shrink-0"
                title="Save Name"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleResetProjectProgress}
                className="p-1 rounded-lg bg-white/5 text-slate-400 hover:text-amber-300 shrink-0"
                title="Reset All Progress"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              {projects.length > 1 && (
                <button
                  onClick={() => {
                    onDeleteProject(activeProject.id);
                    setIsEditingProjectMeta(false);
                    showToast('Deleted project');
                  }}
                  className="p-1 rounded-lg bg-rose-500/15 text-rose-300 hover:bg-rose-500/30 shrink-0"
                  title="Delete Project"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <select
                value={activeProject.id}
                onChange={(e) => onSelectProject(e.target.value)}
                className={`px-2.5 py-1 rounded-xl border text-xs font-extrabold focus:outline-none cursor-pointer flex-1 min-w-0 ${
                  isLightMode
                    ? 'bg-white/90 border-slate-900/20 text-slate-900 shadow-sm'
                    : 'bg-slate-900/90 border-white/15 text-white'
                }`}
                title={activeProject.name}
              >
                {projects.length === 0 ? (
                  <option value={activeProject.id}>
                    {activeProject.name || 'My Flowchart'}
                  </option>
                ) : (
                  projects.map((p) => (
                    <option
                      key={p.id}
                      value={p.id}
                      className={
                        isLightMode
                          ? 'bg-white text-slate-900'
                          : 'bg-slate-900 text-white'
                      }
                    >
                      {p.name} {p.nodes.length > 0 ? `(${p.nodes.length})` : ''}
                    </option>
                  ))
                )}
              </select>

              <button
                onClick={() => setIsEditingProjectMeta(true)}
                className={`p-1.5 rounded-xl transition-colors shrink-0 ${
                  isLightMode
                    ? 'bg-white/60 hover:bg-white/90 text-slate-800 border border-slate-900/15'
                    : 'bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white'
                }`}
                title="Rename / Manage Project"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setIsNewProjectOpen((prev) => !prev)}
                className={`p-1.5 rounded-xl border transition-colors shrink-0 ${
                  isLightMode
                    ? 'bg-emerald-500/25 hover:bg-emerald-500/35 text-emerald-950 border-emerald-700/35'
                    : 'bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 border-emerald-400/30'
                }`}
                title="New Project"
              >
                <FolderPlus className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Right: AI Code + View Switcher Tabs (includes Drag Handle when in corner) */}
        <div
          className="flex items-center gap-2 shrink-0"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {isCornerStart && (
            <div
              onMouseDown={onStartDrag}
              className="p-1 text-slate-400 hover:text-white cursor-grab active:cursor-grabbing shrink-0"
              title="Drag Window"
            >
              <GripHorizontal className="w-3.5 h-3.5" />
            </div>
          )}
          <button
            onClick={handleOpenCodeModal}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold border flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              isLightMode
                ? 'bg-violet-600/20 hover:bg-violet-600/30 text-violet-950 border-violet-700/40'
                : 'text-violet-200 border-violet-400/40 bg-violet-500/20 hover:bg-violet-500/35'
            }`}
            title="Paste or Edit AI Flowchart Code"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>AI Code</span>
          </button>

          <div
            className={`flex items-center gap-0.5 p-0.5 rounded-xl border ${
              isLightMode
                ? 'bg-white/65 border-slate-900/15'
                : 'bg-black/40 border-white/10'
            }`}
          >
            <button
              onClick={() => onSetDrawerMode('none')}
              className={`p-1.5 rounded-lg border transition-all ${
                isLightMode
                  ? 'bg-rose-500/20 hover:bg-rose-500/35 text-rose-700 border-rose-600/40 shadow-[0_0_8px_rgba(244,63,94,0.25)] hover:scale-105'
                  : 'bg-rose-500/25 hover:bg-rose-500/40 text-rose-200 border-rose-400/50 shadow-[0_0_10px_rgba(244,63,94,0.35)] hover:scale-105'
              }`}
              title="Exit Flowchart & Return to HUD"
            >
              <Clock className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onSetDrawerMode('calendar')}
              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-300 transition-colors"
              title="Timeline View"
            >
              <Calendar className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onSetDrawerMode('todos')}
              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-300 transition-colors"
              title="Tasks View"
            >
              <CheckSquare className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onSetDrawerMode('flow')}
              className={`px-2 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 ${
                isLightMode
                  ? 'bg-cyan-600/25 text-cyan-950 border-cyan-700/40'
                  : 'bg-cyan-500/25 text-cyan-200 border-cyan-400/40'
              }`}
              title="Flowchart Planner"
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>Flow</span>
            </button>
          </div>
        </div>
      </div>

      {/* Inline New Project Bar (when + New Project clicked) */}
      <div
        className={`soft-collapse shrink-0 ${
          isNewProjectOpen ? 'soft-collapse-open' : 'soft-collapse-closed -my-1'
        }`}
      >
        <div className="overflow-hidden">
          <div className="clay-card rounded-2xl px-3.5 py-2.5 flex items-center justify-between gap-2 border border-emerald-400/35">
            <div className="flex items-center gap-2 flex-1">
              <span
                className={`text-xs font-extrabold uppercase tracking-wider ${
                  isLightMode ? 'text-emerald-800' : 'text-emerald-300'
                }`}
              >
                New Project:
              </span>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateNewProject();
                  if (e.key === 'Escape') setIsNewProjectOpen(false);
                }}
                placeholder="e.g. Mobile App v2, Exam Prep, YouTube Launch..."
                autoFocus
                className={`px-3 py-1 rounded-xl border text-xs font-semibold flex-1 focus:outline-none focus:border-emerald-400 ${
                  isLightMode
                    ? 'bg-white/90 border-slate-900/20 text-slate-900 placeholder-slate-400'
                    : 'bg-slate-900/90 border-white/15 text-white'
                }`}
              />
              <div className="flex items-center gap-1">
                {(Object.keys(CATEGORY_THEMES) as BlockCategory[]).map(
                  (cat) => (
                    <button
                      key={cat}
                      onClick={() => setNewProjectCategory(cat)}
                      style={{ backgroundColor: CATEGORY_THEMES[cat].solidHex }}
                      className={`w-4 h-4 rounded-full transition-transform ${
                        newProjectCategory === cat
                          ? 'scale-125 ring-2 ring-white'
                          : 'opacity-50 hover:opacity-90'
                      }`}
                      title={CATEGORY_THEMES[cat].label}
                    />
                  )
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleCreateNewProject}
                className="px-3 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold"
              >
                Create
              </button>
              <button
                onClick={() => setIsNewProjectOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. PROJECT PROGRESS TRACKER & FILTER BAR */}
      <div className="clay-well rounded-2xl px-3.5 py-1.5 flex flex-wrap items-center justify-between gap-3 shrink-0 border border-white/10">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span
              className={`font-mono text-xs font-extrabold ${
                isLightMode ? 'text-emerald-800' : 'text-emerald-300'
              }`}
            >
              {progress.percent}%
            </span>
            <div
              className={`w-24 h-2 rounded-full overflow-hidden p-0.5 border ${
                isLightMode
                  ? 'bg-slate-900/15 border-slate-900/15'
                  : 'bg-black/45 border-white/10'
              }`}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.max(
                    progress.percent > 0 ? 6 : 0,
                    progress.percent
                  )}%`,
                  background:
                    'linear-gradient(90deg, #10b981 0%, #06b6d4 100%)',
                }}
              />
            </div>
          </div>

          <span className="text-[11px] font-semibold text-slate-300">
            {progress.doneNodes}/{progress.totalNodes} Nodes
          </span>

          {progress.totalSubtasks > 0 && (
            <span className="text-[11px] font-semibold text-slate-400">
              • {progress.doneSubtasks}/{progress.totalSubtasks} Subtasks
            </span>
          )}

          {progress.totalEstimatedMinutes > 0 && (
            <span
              className="text-[11px] font-mono text-slate-400"
              title="Optional estimated time remaining"
            >
              • {formatDurationLabel(progress.remainingEstimatedMinutes)} left
            </span>
          )}
        </div>

        {/* Non-Strict Visual Filter Pills */}
        <div className="flex items-center gap-1">
          {(
            [
              { id: 'all', label: `All (${progress.totalNodes})` },
              {
                id: 'next',
                label: `⚡ Next (${progress.unlockedNodeIds.size})`,
              },
              { id: 'doing', label: `Doing (${progress.doingNodes})` },
              { id: 'done', label: `Done (${progress.doneNodes})` },
            ] as { id: NodeFilterMode; label: string }[]
          ).map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterMode(f.id)}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-colors ${
                filterMode === f.id
                  ? isLightMode
                    ? 'bg-cyan-600/25 text-cyan-950 border border-cyan-700/40'
                    : 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/40'
                  : isLightMode
                  ? 'text-slate-700 hover:text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. INTERACTIVE FULL-WINDOW FLOWCHART CANVAS */}
      <div
        ref={canvasRef}
        onMouseDown={(e) => {
          if (
            e.target === e.currentTarget ||
            (e.target as HTMLElement).dataset.canvasBg === 'true'
          ) {
            panDragRef.current = {
              active: true,
              startX: e.clientX,
              startY: e.clientY,
              originX: pan.x,
              originY: pan.y,
            };
          }
        }}
        onWheel={(e) => {
          e.preventDefault();
          const delta = e.deltaY < 0 ? 0.08 : -0.08;
          setZoom((z) =>
            Math.max(0.45, Math.min(1.5, Number((z + delta).toFixed(2))))
          );
        }}
        data-canvas-bg="true"
        style={{
          backgroundImage: isLightMode
            ? 'radial-gradient(rgba(15, 23, 42, 0.18) 1px, transparent 1px)'
            : 'radial-gradient(rgba(255, 255, 255, 0.11) 1px, transparent 1px)',
          backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
        className="relative flex-1 rounded-2xl clay-well overflow-hidden cursor-grab active:cursor-grabbing border border-white/10"
      >
        {/* Status Toast Notification */}
        {statusToast && (
          <div
            className={`absolute top-3 left-1/2 -translate-x-1/2 z-40 px-3.5 py-1 rounded-full border text-xs font-extrabold shadow-lg pointer-events-none ${
              isLightMode
                ? 'bg-white/95 border-cyan-600/45 text-cyan-900'
                : 'bg-slate-900/95 border-cyan-400/50 text-cyan-200'
            }`}
          >
            {statusToast}
          </div>
        )}

        {/* Empty Canvas Friendly Welcome / Call-to-action */}
        {activeProject.nodes.length === 0 && (
          <div
            onMouseDown={(e) => e.stopPropagation()}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
          >
            <div
              className={`pointer-events-auto flex flex-col items-center text-center max-w-sm p-6 rounded-3xl border shadow-2xl backdrop-blur-md transition-all ${
                isLightMode
                  ? 'bg-white/90 border-slate-900/15 text-slate-800'
                  : 'bg-slate-900/90 border-white/15 text-slate-100'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-3">
                <GitBranch className="w-6 h-6 stroke-[2]" />
              </div>
              <h3 className="text-sm font-extrabold tracking-wide mb-1">
                Your Flowchart is Empty
              </h3>
              <p className="text-xs opacity-75 mb-4 leading-relaxed">
                Add your first step or open AI Code to generate a visual workflow.
              </p>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={handleAddStandaloneNode}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Add First Step</span>
                </button>
                <button
                  onClick={handleOpenCodeModal}
                  className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all ${
                    isLightMode
                      ? 'bg-slate-900/5 hover:bg-slate-900/10 border-slate-900/20 text-slate-900'
                      : 'bg-white/5 hover:bg-white/15 border-white/15 text-white'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>AI Code</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Transform Viewport Plane (No CSS transition so dragging is 0ms instant) */}
        <div
          data-canvas-bg="true"
          style={{
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
          className="absolute inset-0 pointer-events-none"
        >
          {/* SVG Cubic Bezier Dependency Arrows (Zero CSS transition lag, dynamic node width aware) */}
          <svg
            className="overflow-visible absolute inset-0 w-full h-full pointer-events-none"
            style={{ zIndex: 1 }}
          >
            <defs>
              <marker
                id="flow-arrow-done"
                viewBox="0 0 10 10"
                refX="7"
                refY="5"
                markerWidth="5.5"
                markerHeight="5.5"
                orient="auto-start-reverse"
              >
                <path
                  d="M 0 1 L 10 5 L 0 9 z"
                  fill={isLightMode ? '#059669' : '#10b981'}
                />
              </marker>
              <marker
                id="flow-arrow-next"
                viewBox="0 0 10 10"
                refX="7"
                refY="5"
                markerWidth="5.5"
                markerHeight="5.5"
                orient="auto-start-reverse"
              >
                <path
                  d="M 0 1 L 10 5 L 0 9 z"
                  fill={isLightMode ? '#0284c7' : '#38bdf8'}
                />
              </marker>
              <marker
                id="flow-arrow-default"
                viewBox="0 0 10 10"
                refX="7"
                refY="5"
                markerWidth="5.5"
                markerHeight="5.5"
                orient="auto-start-reverse"
              >
                <path
                  d="M 0 1 L 10 5 L 0 9 z"
                  fill={isLightMode ? '#475569' : '#64748b'}
                />
              </marker>
            </defs>

            {activeProject.edges.map((edge) => {
              const src = nodeById.get(edge.source);
              const tgt = nodeById.get(edge.target);
              if (!src || !tgt) return null;

              const srcW = nodeWidths[src.id] || DEFAULT_NODE_WIDTH;
              const srcH = nodeHeights[src.id] || 76;
              const tgtW = nodeWidths[tgt.id] || DEFAULT_NODE_WIDTH;
              const tgtH = nodeHeights[tgt.id] || 76;

              // 4-Way Smart Port Selection (Supports L->R DAGs, R->L Serpentine rows, and vertical row drops)
              const isTargetBelow = tgt.y >= src.y + srcH * 0.72;
              const isTargetAbove = tgt.y + tgtH <= src.y + srcH * 0.28;
              const isTargetLeftSameRow =
                !isTargetBelow &&
                !isTargetAbove &&
                tgt.x + tgtW * 0.5 < src.x;

              let pathD = '';
              let midX = 0;
              let midY = 0;

              if (isTargetBelow) {
                // Exit Bottom Center of src -> Enter Top Center of tgt
                const x1 = Math.round(src.x + srcW / 2);
                const y1 = src.y + srcH;
                const x2 = Math.round(tgt.x + tgtW / 2);
                const y2 = tgt.y;
                const dy = Math.max(28, Math.abs(y2 - y1) * 0.5);
                pathD = `M ${x1} ${y1} C ${x1} ${y1 + dy}, ${x2} ${y2 - dy}, ${x2} ${y2}`;
                midX = (x1 + x2) / 2;
                midY = (y1 + y2) / 2;
              } else if (isTargetAbove) {
                // Exit Top Center of src -> Enter Bottom Center of tgt
                const x1 = Math.round(src.x + srcW / 2);
                const y1 = src.y;
                const x2 = Math.round(tgt.x + tgtW / 2);
                const y2 = tgt.y + tgtH;
                const dy = Math.max(28, Math.abs(y1 - y2) * 0.5);
                pathD = `M ${x1} ${y1} C ${x1} ${y1 - dy}, ${x2} ${y2 + dy}, ${x2} ${y2}`;
                midX = (x1 + x2) / 2;
                midY = (y1 + y2) / 2;
              } else if (isTargetLeftSameRow) {
                // Exit Left Center of src -> Enter Right Center of tgt (Serpentine odd row R -> L)
                const x1 = src.x;
                const y1 = Math.round(src.y + srcH / 2);
                const x2 = tgt.x + tgtW;
                const y2 = Math.round(tgt.y + tgtH / 2);
                const dx = Math.max(36, Math.abs(x1 - x2) * 0.45);
                pathD = `M ${x1} ${y1} C ${x1 - dx} ${y1}, ${x2 + dx} ${y2}, ${x2} ${y2}`;
                midX = (x1 + x2) / 2;
                midY = (y1 + y2) / 2;
              } else {
                // Standard Left -> Right: Exit Right Center of src -> Enter Left Center of tgt
                const x1 = src.x + srcW;
                const y1 = Math.round(src.y + srcH / 2);
                const x2 = tgt.x;
                const y2 = Math.round(tgt.y + tgtH / 2);
                const dx = Math.max(36, Math.abs(x2 - x1) * 0.45);
                pathD = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
                midX = (x1 + x2) / 2;
                midY = (y1 + y2) / 2;
              }

              const isBothDone = src.status === 'done' && tgt.status === 'done';
              const isUnlockedFlow =
                src.status === 'done' && tgt.status !== 'done';

              const strokeColor = isBothDone
                ? isLightMode
                  ? '#059669'
                  : '#10b981'
                : isUnlockedFlow
                ? isLightMode
                  ? '#0284c7'
                  : '#38bdf8'
                : isLightMode
                ? 'rgba(51, 65, 85, 0.55)'
                : 'rgba(148, 163, 184, 0.45)';

              const markerEnd = isBothDone
                ? 'url(#flow-arrow-done)'
                : isUnlockedFlow
                ? 'url(#flow-arrow-next)'
                : 'url(#flow-arrow-default)';

              return (
                <g key={edge.id} className="group/edge pointer-events-auto">
                  <path
                    d={pathD}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={14}
                    className="cursor-pointer"
                    onClick={() => handleDeleteEdge(edge.id)}
                  />
                  <path
                    d={pathD}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={isUnlockedFlow ? 2.5 : 2}
                    strokeDasharray={isUnlockedFlow ? '6 4' : undefined}
                    markerEnd={markerEnd}
                  />
                  <g
                    transform={`translate(${midX}, ${midY})`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteEdge(edge.id);
                    }}
                    className="opacity-0 group-hover/edge:opacity-100 cursor-pointer transition-opacity"
                  >
                    <circle
                      r="8"
                      fill={isLightMode ? '#ffffff' : '#0f172a'}
                      stroke="#f43f5e"
                      strokeWidth="1.5"
                    />
                    <text
                      textAnchor="middle"
                      dy="3.5"
                      fill={isLightMode ? '#e11d48' : '#fda4af'}
                      fontSize="10"
                      fontWeight="bold"
                    >
                      ×
                    </text>
                  </g>
                </g>
              );
            })}

            {/* Active drag-to-connect preview wire */}
            {connectingFromNodeId && nodeById.get(connectingFromNodeId) && (
              <path
                d={(() => {
                  const src = nodeById.get(connectingFromNodeId)!;
                  const srcW = nodeWidths[src.id] || DEFAULT_NODE_WIDTH;
                  const x1 = src.x + srcW;
                  const y1 = src.y + 24;
                  const x2 = connectCursor.x;
                  const y2 = connectCursor.y;
                  const dx = Math.max(50, Math.abs(x2 - x1) * 0.45);
                  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
                })()}
                fill="none"
                stroke={isLightMode ? '#0284c7' : '#38bdf8'}
                strokeWidth={2.2}
                strokeDasharray="5 4"
              />
            )}
          </svg>

          {/* Dynamic-Width, Zero-Layout-Shift Flowchart Node Cards */}
          {displayNodes.map((node) => {
            const theme =
              CATEGORY_THEMES[node.category] || CATEGORY_THEMES['deep-work'];
            const isNextUp = progress.unlockedNodeIds.has(node.id);
            const isDone = node.status === 'done';
            const isDoing = node.status === 'in-progress';
            const matchesFilter = isNodeMatchesFilter(node);

            const doneSubs = node.subtasks.filter((s) => s.completed).length;
            const totalSubs = node.subtasks.length;
            // Subtasks are collapsed by default; only open when clicked
            const isSubsExpanded = expandedSubtasksIds.has(node.id);
            const isEditingThisNode = editingNodeId === node.id;
            const isAddingSubtask = addingSubtaskNodeId === node.id;
            const isDraggingThis = liveDragNode?.id === node.id;

            return (
              <div
                key={node.id}
                ref={(el) => {
                  if (el) nodeElementsRef.current.set(node.id, el);
                  else nodeElementsRef.current.delete(node.id);
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  nodeDragRef.current = {
                    nodeId: node.id,
                    startX: e.clientX,
                    startY: e.clientY,
                    originX: node.x,
                    originY: node.y,
                    currentX: node.x,
                    currentY: node.y,
                    moved: false,
                  };
                }}
                style={{
                  transform: `translate3d(${node.x}px, ${node.y}px, 0)`,
                  zIndex: isDraggingThis || isEditingThisNode ? 30 : 10,
                  borderColor: isDone
                    ? isLightMode
                      ? 'rgba(5, 150, 105, 0.5)'
                      : 'rgba(16, 185, 129, 0.45)'
                    : isDoing
                    ? theme.solidHex
                    : isNextUp
                    ? isLightMode
                      ? 'rgba(2, 132, 199, 0.5)'
                      : 'rgba(56, 189, 248, 0.45)'
                    : isLightMode
                    ? 'rgba(15, 23, 42, 0.16)'
                    : activeThemeKey === 'space'
                    ? 'rgba(167, 139, 250, 0.28)'
                    : activeThemeKey === 'cats'
                    ? 'rgba(251, 191, 36, 0.28)'
                    : 'rgba(148, 163, 184, 0.22)',
                  boxShadow: isDraggingThis
                    ? isLightMode
                      ? '0 16px 32px -6px rgba(15, 23, 42, 0.28)'
                      : '0 18px 36px -6px rgba(0, 0, 0, 0.75)'
                    : isDoing
                    ? `0 10px 24px -6px ${theme.glowRgba}`
                    : isLightMode
                    ? '0 6px 16px -4px rgba(15, 23, 42, 0.14)'
                    : '0 8px 20px -6px rgba(0, 0, 0, 0.5)',
                }}
                className={`group/node absolute left-0 top-0 pointer-events-auto min-w-[195px] max-w-[330px] w-max rounded-2xl border px-3.5 py-2.5 flex flex-col gap-1.5 cursor-grab active:cursor-grabbing ${themeNodeSurface} ${
                  matchesFilter ? 'opacity-100' : 'opacity-25'
                }`}
              >
                {/* Top Thin Accent Bar */}
                <div
                  style={{
                    backgroundColor: isDone ? '#10b981' : theme.solidHex,
                  }}
                  className="absolute top-0 inset-x-4 h-[2px] rounded-b-full opacity-80"
                />

                {/* FLOATING HOVER ACTION TOOLBAR (Absolute so text NEVER shifts on hover!) */}
                <div
                  onMouseDown={(e) => e.stopPropagation()}
                  className={`absolute -top-3.5 right-2 z-20 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border shadow-lg transition-opacity ${themeFloatingBarSurface} ${
                    isEditingThisNode
                      ? 'opacity-100 pointer-events-auto'
                      : 'opacity-0 pointer-events-none group-hover/node:opacity-100 group-hover/node:pointer-events-auto'
                  }`}
                >
                  {!isDone && (
                    <button
                      onClick={() => {
                        onScheduleFlowNode(activeProject, node, !activeBlock);
                        showToast(
                          !activeBlock
                            ? `Started "${node.title}"`
                            : `Scheduled "${node.title}"`
                        );
                      }}
                      className={`p-1 rounded-full ${
                        isLightMode
                          ? 'text-cyan-700 hover:bg-cyan-500/15'
                          : 'text-cyan-300 hover:bg-cyan-500/20'
                      }`}
                      title={
                        node.estimatedMinutes
                          ? `Focus / Schedule (${node.estimatedMinutes}m)`
                          : 'Focus / Schedule step'
                      }
                    >
                      <Play className="w-2.5 h-2.5 fill-current" />
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setExpandedSubtasksIds((prev) =>
                        new Set(prev).add(node.id)
                      );
                      setAddingSubtaskNodeId(node.id);
                    }}
                    className={`p-1 rounded-full ${
                      isLightMode
                        ? 'text-emerald-700 hover:bg-emerald-500/15'
                        : 'text-emerald-300 hover:bg-emerald-500/20'
                    }`}
                    title="Add subtask"
                  >
                    <Plus className="w-2.5 h-2.5 stroke-[2.5]" />
                  </button>

                  <button
                    onClick={() =>
                      setEditingNodeId(isEditingThisNode ? null : node.id)
                    }
                    className={`p-1 rounded-full ${
                      isEditingThisNode
                        ? isLightMode
                          ? 'text-cyan-700 bg-cyan-500/20'
                          : 'text-cyan-300 bg-cyan-500/20'
                        : isLightMode
                        ? 'text-slate-600 hover:text-slate-950 hover:bg-slate-900/10'
                        : 'text-slate-300 hover:text-white hover:bg-white/10'
                    }`}
                    title="Edit step details & notes"
                  >
                    <Edit3 className="w-2.5 h-2.5" />
                  </button>

                  <button
                    onClick={() => handleDeleteNode(node.id)}
                    className={`p-1 rounded-full ${
                      isLightMode
                        ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-500/15'
                        : 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/15'
                    }`}
                    title="Delete step"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                </div>

                {/* Left Input Port (Only visible when hovering node or dragging a wire) */}
                <div
                  onMouseUp={(e) => {
                    e.stopPropagation();
                    handleCompletePortConnection(node.id);
                  }}
                  title="Drop connection here"
                  className={`absolute -left-2 top-4 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center cursor-crosshair transition-opacity ${
                    connectingFromNodeId && connectingFromNodeId !== node.id
                      ? 'opacity-100 bg-cyan-400 border-white scale-125'
                      : isLightMode
                      ? 'opacity-0 group-hover/node:opacity-100 bg-white border-slate-500 hover:border-cyan-600'
                      : 'opacity-0 group-hover/node:opacity-100 bg-slate-900 border-slate-400 hover:border-cyan-300'
                  }`}
                />

                {/* Right Output Port + "+" Branch Button (Absolute outside card so zero text shift) */}
                <div
                  className={`absolute -right-2.5 top-3 flex flex-col items-center gap-1 transition-opacity ${
                    connectingFromNodeId === node.id
                      ? 'opacity-100'
                      : 'opacity-0 group-hover/node:opacity-100'
                  }`}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddChildNode(node);
                    }}
                    title="Add connected step (+)"
                    className="w-4 h-4 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold flex items-center justify-center shadow-md"
                  >
                    <Plus className="w-2.5 h-2.5 stroke-[3]" />
                  </button>
                  <div
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      const nodeW = nodeWidths[node.id] || DEFAULT_NODE_WIDTH;
                      setConnectingFromNodeId(node.id);
                      setConnectCursor({
                        x: node.x + nodeW + 16,
                        y: node.y + 24,
                      });
                    }}
                    title="Drag to connect to another node"
                    className={`w-3 h-3 rounded-full border-2 hover:scale-125 cursor-crosshair ${
                      isLightMode
                        ? 'bg-white border-cyan-600'
                        : 'bg-slate-900 border-cyan-400'
                    }`}
                  />
                </div>

                {/* Header Row: Status Icon + Dynamic Unclipped Title + Static Duration Badge */}
                <div
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    nodeDragRef.current = {
                      nodeId: node.id,
                      startX: e.clientX,
                      startY: e.clientY,
                      originX: node.x,
                      originY: node.y,
                      currentX: node.x,
                      currentY: node.y,
                      moved: false,
                    };
                  }}
                  onDoubleClick={() => setEditingNodeId(node.id)}
                  className="flex items-start justify-between gap-2.5 cursor-grab active:cursor-grabbing"
                >
                  <div className="flex items-start gap-2 min-w-0">
                    <button
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={() => handleCycleNodeStatus(node)}
                      title="Click to cycle status: Todo → Doing → Done"
                      style={{
                        color: isDone
                          ? isLightMode
                            ? '#059669'
                            : '#10b981'
                          : isDoing
                          ? isLightMode
                            ? '#d97706'
                            : '#fbbf24'
                          : theme.solidHex,
                      }}
                      className="mt-0.5 shrink-0 hover:scale-110 transition-transform"
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : isDoing ? (
                        <Disc className="w-4 h-4 animate-spin" />
                      ) : (
                        <Circle className="w-4 h-4" />
                      )}
                    </button>

                    <div className="flex flex-col">
                      <h3
                        className={`text-xs font-bold leading-snug break-words ${
                          isDone
                            ? 'line-through text-slate-400'
                            : isLightMode
                            ? 'text-slate-900'
                            : 'text-white'
                        }`}
                      >
                        {node.title}
                      </h3>

                      {/* Only show note when node subtasks/details are expanded */}
                      {isSubsExpanded &&
                        node.notes &&
                        node.notes.trim() &&
                        !isEditingThisNode && (
                          <p
                            className={`text-[10px] mt-1 leading-relaxed break-words ${
                              isLightMode ? 'text-slate-600' : 'text-slate-400'
                            }`}
                          >
                            {node.notes}
                          </p>
                        )}
                    </div>
                  </div>

                  {/* Static Duration Badge (Never hides/swaps on hover, so text never moves!) */}
                  {node.estimatedMinutes && node.estimatedMinutes > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold shrink-0 ${
                        isLightMode
                          ? 'bg-slate-900/10 text-slate-700'
                          : 'bg-white/5 text-slate-400'
                      }`}
                    >
                      {node.estimatedMinutes}m
                    </span>
                  )}
                </div>

                {/* Inline Node Inspector (Only open when ✎ clicked or double-clicked) */}
                {isEditingThisNode && (
                  <div
                    onMouseDown={(e) => e.stopPropagation()}
                    className={`animate-soft-popover p-2 rounded-xl border flex flex-col gap-2 mt-0.5 w-[240px] ${
                      isLightMode
                        ? 'bg-slate-100/95 border-slate-300'
                        : 'bg-slate-950/95 border-white/15'
                    }`}
                  >
                    <input
                      type="text"
                      value={node.title}
                      onChange={(e) =>
                        handleUpdateNodeFields(node.id, {
                          title: e.target.value,
                        })
                      }
                      placeholder="Step title..."
                      autoFocus
                      className={`px-2 py-1 rounded-lg border text-xs font-bold focus:outline-none focus:border-cyan-400 ${
                        isLightMode
                          ? 'bg-white border-slate-300 text-slate-900'
                          : 'bg-slate-900 border-white/15 text-white'
                      }`}
                    />

                    <textarea
                      value={node.notes || ''}
                      onChange={(e) =>
                        handleUpdateNodeFields(node.id, {
                          notes: e.target.value,
                        })
                      }
                      placeholder="Optional note or link..."
                      rows={2}
                      className={`w-full px-2 py-1 rounded-lg border text-[11px] placeholder-slate-500 focus:outline-none focus:border-cyan-400 resize-none ${
                        isLightMode
                          ? 'bg-white border-slate-300 text-slate-800'
                          : 'bg-slate-900 border-white/10 text-slate-200'
                      }`}
                    />

                    {/* Optional Duration Pills */}
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-[9px] font-bold uppercase text-slate-500 mr-1">
                        Est:
                      </span>
                      {[undefined, 15, 30, 45, 60, 90, 120].map((mins) => (
                        <button
                          key={mins ?? 'none'}
                          onClick={() =>
                            handleUpdateNodeFields(node.id, {
                              estimatedMinutes: mins,
                            })
                          }
                          className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                            node.estimatedMinutes === mins
                              ? 'bg-cyan-500 text-slate-950'
                              : isLightMode
                              ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                              : 'bg-white/5 text-slate-400 hover:bg-white/15'
                          }`}
                        >
                          {mins ? `${mins}m` : 'None'}
                        </button>
                      ))}
                    </div>

                    {/* Category Swatches + Done Button */}
                    <div className="flex items-center justify-between pt-0.5">
                      <div className="flex items-center gap-1.5">
                        {(Object.keys(CATEGORY_THEMES) as BlockCategory[]).map(
                          (cat) => (
                            <button
                              key={cat}
                              onClick={() =>
                                handleUpdateNodeFields(node.id, {
                                  category: cat,
                                })
                              }
                              style={{
                                backgroundColor: CATEGORY_THEMES[cat].solidHex,
                              }}
                              className={`w-3.5 h-3.5 rounded-full ${
                                node.category === cat
                                  ? 'ring-2 ring-white scale-110'
                                  : 'opacity-45 hover:opacity-100'
                              }`}
                              title={CATEGORY_THEMES[cat].label}
                            />
                          )
                        )}
                      </div>
                      <button
                        onClick={() => setEditingNodeId(null)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          isLightMode
                            ? 'bg-emerald-600/20 text-emerald-900'
                            : 'bg-emerald-500/25 text-emerald-200'
                        }`}
                      >
                        Done
                      </button>
                    </div>
                  </div>
                )}

                {/* Collapsible Subtasks Section (Collapsed by default, click to expand!) */}
                {(totalSubs > 0 || isAddingSubtask) && (
                  <div
                    className={`flex flex-col gap-1 pt-1 border-t ${
                      isLightMode ? 'border-slate-900/10' : 'border-white/10'
                    }`}
                  >
                    {totalSubs > 0 && (
                      <div className="flex items-center justify-between gap-2">
                        <button
                          onClick={() => {
                            if (nodeDragRef.current.moved) return;
                            setExpandedSubtasksIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(node.id)) next.delete(node.id);
                              else next.add(node.id);
                              return next;
                            });
                          }}
                          className={`flex items-center gap-1 text-[10px] font-semibold transition-colors ${
                            isLightMode
                              ? 'text-slate-600 hover:text-slate-950'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {isSubsExpanded ? (
                            <ChevronDown
                              className={`w-3 h-3 ${
                                isLightMode ? 'text-cyan-700' : 'text-cyan-300'
                              }`}
                            />
                          ) : (
                            <ChevronRight className="w-3 h-3" />
                          )}
                          <span>
                            {doneSubs}/{totalSubs} subtasks
                          </span>
                        </button>
                      </div>
                    )}

                    <div
                      className={`soft-collapse ${
                        isSubsExpanded || isAddingSubtask
                          ? 'soft-collapse-open'
                          : 'soft-collapse-closed'
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="flex flex-col gap-1 pt-0.5">
                          {node.subtasks.map((st) => {
                            const subKey = `${node.id}:${st.id}`;
                            const isEditingSub = editingSubtaskKey === subKey;
                            return (
                              <div
                                key={st.id}
                                className={`flex items-start justify-between gap-2 group/sub text-[11px] py-0.5 px-1 rounded ${
                                  isLightMode
                                    ? 'hover:bg-slate-900/5'
                                    : 'hover:bg-white/5'
                                }`}
                              >
                                <div className="flex items-start gap-1.5 min-w-0 flex-1">
                                  <button
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={() =>
                                      handleToggleSubtask(node.id, st.id)
                                    }
                                    className={`mt-0.5 w-3 h-3 rounded-[4px] border flex items-center justify-center shrink-0 transition-colors ${
                                      st.completed
                                        ? 'bg-emerald-500 border-emerald-500 text-white'
                                        : isLightMode
                                        ? 'border-slate-400 hover:border-slate-800'
                                        : 'border-slate-500 hover:border-white'
                                    }`}
                                  >
                                    {st.completed && (
                                      <Check className="w-2 h-2 stroke-[3]" />
                                    )}
                                  </button>

                                  {isEditingSub ? (
                                    <input
                                      type="text"
                                      value={editingSubtaskText}
                                      onMouseDown={(e) => e.stopPropagation()}
                                      onChange={(e) =>
                                        setEditingSubtaskText(e.target.value)
                                      }
                                      onBlur={() =>
                                        handleSaveSubtaskEdit(node.id, st.id)
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter')
                                          handleSaveSubtaskEdit(node.id, st.id);
                                        if (e.key === 'Escape')
                                          setEditingSubtaskKey(null);
                                      }}
                                      autoFocus
                                      className={`border border-cyan-500/50 rounded px-1 py-0.5 text-[11px] w-full focus:outline-none ${
                                        isLightMode
                                          ? 'bg-white text-slate-900'
                                          : 'bg-slate-900 text-white'
                                      }`}
                                    />
                                  ) : (
                                    <span
                                      onClick={() => {
                                        if (nodeDragRef.current.moved) return;
                                        setEditingSubtaskKey(subKey);
                                        setEditingSubtaskText(st.title);
                                      }}
                                      className={`break-words leading-snug cursor-text ${
                                        st.completed
                                          ? 'line-through text-slate-400'
                                          : isLightMode
                                          ? 'text-slate-800'
                                          : 'text-slate-200'
                                      }`}
                                    >
                                      {st.title}
                                    </span>
                                  )}
                                </div>

                                <button
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onClick={() =>
                                    handleDeleteSubtask(node.id, st.id)
                                  }
                                  className="opacity-0 group-hover/sub:opacity-100 text-slate-500 hover:text-rose-400 p-0.5 shrink-0"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            );
                          })}

                          {isAddingSubtask ? (
                            <input
                              type="text"
                              value={newSubtaskInputs[node.id] || ''}
                              onMouseDown={(e) => e.stopPropagation()}
                              onChange={(e) =>
                                setNewSubtaskInputs((prev) => ({
                                  ...prev,
                                  [node.id]: e.target.value,
                                }))
                              }
                              onBlur={() => handleAddSubtask(node.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAddSubtask(node.id);
                                if (e.key === 'Escape')
                                  setAddingSubtaskNodeId(null);
                              }}
                              placeholder="Subtask title + Enter..."
                              autoFocus
                              className={`mt-0.5 border border-cyan-500/45 rounded-lg px-2 py-1 text-[10px] placeholder-slate-500 focus:outline-none ${
                                isLightMode
                                  ? 'bg-slate-100 text-slate-900'
                                  : 'bg-black/40 text-white'
                              }`}
                            />
                          ) : (
                            <button
                              onClick={() => {
                                if (nodeDragRef.current.moved) return;
                                setAddingSubtaskNodeId(node.id);
                              }}
                              className={`flex items-center gap-1 text-[10px] font-semibold px-1 py-0.5 self-start ${
                                isLightMode
                                  ? 'text-slate-600 hover:text-cyan-700'
                                  : 'text-slate-500 hover:text-cyan-300'
                              }`}
                            >
                              <Plus className="w-2.5 h-2.5" />
                              <span>Add subtask</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Ultra-thin Bottom Progress Bar (Only if node has subtasks) */}
                {totalSubs > 0 && (
                  <div
                    className={`absolute bottom-0 inset-x-3 h-[2px] overflow-hidden rounded-full ${
                      isLightMode ? 'bg-slate-900/10' : 'bg-white/5'
                    }`}
                  >
                    <div
                      className="h-full bg-emerald-400 transition-all duration-300"
                      style={{
                        width: `${Math.round((doneSubs / totalSubs) * 100)}%`,
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom-Right Floating Canvas Controls */}
        <div
          onMouseDown={(e) => e.stopPropagation()}
          className={`absolute bottom-3 right-3 z-30 flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl border shadow-lg ${themeFloatingBarSurface}`}
        >
          <button
            onClick={handleAddStandaloneNode}
            className={`px-2.5 py-1 rounded-xl border text-[11px] font-extrabold flex items-center gap-1 ${
              isLightMode
                ? 'bg-emerald-600/20 border-emerald-700/35 text-emerald-950 hover:bg-emerald-600/30'
                : 'bg-emerald-500/25 border-emerald-400/40 text-emerald-200 hover:bg-emerald-500/35'
            }`}
            title="Add New Node to Canvas"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Node</span>
          </button>

          <button
            onClick={handleAutoLayout}
            className={`px-2.5 py-1 rounded-xl border text-[11px] font-extrabold flex items-center gap-1 ${
              isLightMode
                ? 'bg-cyan-600/20 border-cyan-700/35 text-cyan-950 hover:bg-cyan-600/30'
                : 'bg-cyan-500/20 border-cyan-400/35 text-cyan-200 hover:bg-cyan-500/30'
            }`}
            title="Auto-align Flowchart Layout"
          >
            <Sparkles className="w-3 h-3" />
            <span>Auto-Layout</span>
          </button>

          <button
            onClick={() => {
              const count = onAutoScheduleReadyNodes(activeProject);
              if (count > 0) {
                showToast(
                  `Scheduled ${count} ready step${count > 1 ? 's' : ''} into today`
                );
              } else {
                showToast('No unscheduled Next Up nodes');
              }
            }}
            className={`px-2.5 py-1 rounded-xl border text-[11px] font-extrabold flex items-center gap-1 ${
              isLightMode
                ? 'bg-amber-600/20 border-amber-700/35 text-amber-950 hover:bg-amber-600/30'
                : 'bg-amber-500/20 border-amber-400/35 text-amber-200 hover:bg-amber-500/30'
            }`}
            title="Time-block Ready nodes into today's free slots"
          >
            <Zap
              className={`w-3 h-3 ${
                isLightMode ? 'text-amber-700' : 'text-amber-300'
              }`}
            />
            <span>Auto-Block</span>
          </button>

          <div
            className={`h-3.5 w-[1px] mx-0.5 ${
              isLightMode ? 'bg-slate-900/20' : 'bg-white/15'
            }`}
          />

          <button
            onClick={() =>
              setZoom((z) => Math.max(0.45, Number((z - 0.1).toFixed(2))))
            }
            className={`p-1 rounded-lg ${
              isLightMode
                ? 'text-slate-700 hover:text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span
            className={`font-mono text-[10px] font-bold min-w-[36px] text-center ${
              isLightMode ? 'text-slate-800' : 'text-slate-300'
            }`}
          >
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() =>
              setZoom((z) => Math.min(1.5, Number((z + 0.1).toFixed(2))))
            }
            className={`p-1 rounded-lg ${
              isLightMode
                ? 'text-slate-700 hover:text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => fitGraphInViewport(activeProject.nodes)}
            className={`p-1 rounded-lg ${
              isLightMode
                ? 'text-slate-700 hover:text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
            title="Fit & Center Flowchart"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 4. AI CODE-TO-FLOWCHART MODAL / DRAWER */}
      {isCodeModalOpen && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          className={`animate-soft-popover absolute inset-0 z-50 rounded-3xl backdrop-blur-md border p-4 flex flex-col gap-3 ${
            isLightMode
              ? 'bg-white/95 border-violet-600/40'
              : 'bg-slate-950/95 border-violet-400/40'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div
                className={`p-1.5 rounded-xl border ${
                  isLightMode
                    ? 'bg-violet-600/20 border-violet-600/40 text-violet-900'
                    : 'bg-violet-500/20 border-violet-400/40 text-violet-300'
                }`}
              >
                <Code2 className="w-4 h-4" />
              </div>
              <h2
                className={`text-sm font-extrabold ${
                  isLightMode ? 'text-slate-900' : 'text-white'
                }`}
              >
                Flowchart Code
              </h2>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleCopyAiPrompt}
                className="px-3 py-1.5 rounded-xl bg-violet-500 hover:bg-violet-400 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 shadow-md whitespace-nowrap"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>
                  {copiedPromptToast ? '✓ Copied!' : '✨ Copy AI Prompt'}
                </span>
              </button>

              <button
                onClick={() => setIsCodeModalOpen(false)}
                className={`p-1.5 rounded-xl ${
                  isLightMode
                    ? 'bg-slate-900/10 text-slate-700 hover:text-slate-950'
                    : 'bg-white/10 text-slate-300 hover:text-white'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <textarea
            value={codeDraft}
            onChange={(e) => setCodeDraft(e.target.value)}
            placeholder={`project "My Project"\n\n[step1] "Planning"\n  - First subtask\n  - Second subtask\n\n[step2] "Prototype"\n  - Build UI\n\nstep1 --> step2`}
            className={`flex-1 w-full rounded-2xl border p-3.5 font-mono text-xs focus:outline-none focus:border-violet-400 resize-none leading-relaxed ${
              isLightMode
                ? 'bg-slate-900 border-slate-700 text-emerald-200 placeholder-slate-500'
                : 'bg-black/60 border-white/15 text-emerald-200 placeholder-slate-600'
            }`}
          />

          <div className="flex items-center justify-end gap-2">
            <button
              onClick={handleRenderCodeAsNewProject}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border whitespace-nowrap ${
                isLightMode
                  ? 'bg-slate-900/10 hover:bg-slate-900/20 text-slate-900 border-slate-900/20'
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/15'
              }`}
            >
              + New Project
            </button>
            <button
              onClick={handleRenderCodeIntoCurrentProject}
              className="px-4 py-1.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-extrabold shadow-md whitespace-nowrap"
            >
              Render Flowchart
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
