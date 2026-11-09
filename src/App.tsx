import React, { useEffect, useRef, useState } from 'react';
import {
  CATEGORY_THEMES,
  DrawerMode,
  FlowNode,
  FlowNodeStatus,
  FlowProject,
  HUD_VISUAL_THEMES,
  HudPersistedState,
  HudVisualTheme,
  OnboardingProfile,
  ScreenEdge,
  TimeBlock,
  TodoPriority,
  createInitialSeedState,
  generateRoutineFromOnboarding,
} from './types/hud';
import {
  centerNativeWindowTop,
  isRunningInTauri,
  loadPersistedHudState,
  savePersistedHudState,
  setNativeAlwaysOnTop,
  setNativeAutostart,
  setNativeGhostMode,
  startNativeWindowDrag,
  syncNativeWindowBounds,
} from './services/tauriBridge';
import { soundFx } from './utils/soundFx';
import { computeFlowProjectProgress } from './utils/flowCodeParser';
import { AmbientClockHud } from './components/AmbientClockHud';
import { TimelineCalendarDrawer } from './components/TimelineCalendarDrawer';
import { TodoListDrawer } from './components/TodoListDrawer';
import { FlowchartPlannerView } from './components/FlowchartPlannerView';
import { OnboardingWizard } from './components/OnboardingWizard';
import {
  QuickAddCommandModal,
  QuickAddMode,
} from './components/QuickAddCommandModal';
import { FocusCheckInBanner } from './components/FocusCheckInBanner';
import {
  Ghost,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Flame,
  GripHorizontal,
  GripVertical,
  PanelTop,
  PanelBottom,
  PanelLeft,
  PanelRight,
} from 'lucide-react';

export const App: React.FC = () => {
  const [hudState, setHudState] = useState<HudPersistedState>(() =>
    createInitialSeedState()
  );
  const [isLoaded, setIsLoaded] = useState(false);
  const [now, setNow] = useState<Date>(() => new Date());
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  // Notch hover & pin-lock mechanics
  const [isNotchHovered, setIsNotchHovered] = useState(false);
  const [isNotchLockedOpen, setIsNotchLockedOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddMode, setQuickAddMode] = useState<QuickAddMode>('task');
  const [isCheckInActive, setIsCheckInActive] = useState(false);
  const hoverTimeoutRef = useRef<number | null>(null);

  // Dragging state when undocked in Free Move mode
  const dragRef = useRef<{
    dragging: boolean;
    startMouseX: number;
    startMouseY: number;
    startWinX: number;
    startWinY: number;
  }>({
    dragging: false,
    startMouseX: 0,
    startMouseY: 0,
    startWinX: 48,
    startWinY: 36,
  });

  // Dynamic rail snap dragging state (docked mode)
  const [isRailDragging, setIsRailDragging] = useState(false);
  const [railDragEdge, setRailDragEdge] = useState<ScreenEdge>('top');
  const [railDragRatio, setRailDragRatio] = useState<number>(0.5);
  const isRailDraggingRef = useRef(false);
  const railDragEdgeRef = useRef<ScreenEdge>('top');
  const railDragRatioRef = useRef<number>(0.5);

  const prevActiveBlockIdRef = useRef<string | null>(null);

  useEffect(() => {
    loadPersistedHudState().then((loaded) => {
      // Always start in interactive (non-ghost) mode so user is never locked out
      setNativeGhostMode(false);
      const legacyGenericBlockIds = new Set([
        'blk-focus-1',
        'blk-morning',
        'blk-creative',
        'blk-workout',
        'blk-sync',
        'blk-focus-2',
      ]);
      const legacyGenericProjectNames = new Set([
        'Core Project',
        'Rust Engine',
        'Full-Stack App',
        'AI Agent',
        'Organic Chem',
        'Algorithms',
        'MCAT Prep',
        '3D Design System',
        'Brand Identity',
        'Game Assets',
        'v1.0 Launch',
        'Seed Pitch Deck',
        'Growth Sprint',
      ]);
      const legacyGenericTodoTitles = new Set([
        'Implement raycaster',
        'Optimize frame loop',
        'Write unit tests',
        'Finalize pricing page',
        'Record demo video',
        'Build login flow',
        'Write API routes',
        'Tune tool prompts',
        'Benchmark latency',
        'Ch. 4 reaction mechanisms',
        'Matrix eigenvalues',
        'Render clay icons',
        'Spring transition curves',
      ]);

      const fallbackProjects = (loaded.flowProjects || []).filter(
        (p) =>
          !(p.id === 'proj-starter-1' && legacyGenericProjectNames.has(p.name))
      );
      let resolvedProjects = fallbackProjects;
      if (resolvedProjects.length === 0) {
        resolvedProjects = [
          {
            id: `proj-${Date.now()}`,
            name: 'My Flowchart',
            category: 'deep-work',
            nodes: [],
            edges: [],
            createdAt: new Date().toISOString(),
          },
        ];
      }
      const rawDrawerMode = loaded.windowConfig.drawerMode as string;
      const safeDrawerMode: DrawerMode =
        rawDrawerMode === 'both'
          ? 'calendar'
          : (rawDrawerMode as DrawerMode) || 'none';
      const rawTheme = loaded.windowConfig.visualTheme as string | undefined;
      const safeVisualTheme: HudVisualTheme =
        rawTheme === 'frog'
          ? 'otter'
          : (rawTheme as HudVisualTheme) || 'neutral';
      const cleanedBlocks = loaded.blocks
        .filter((b) => !legacyGenericBlockIds.has(b.id))
        .map((b) => {
          if (b.flowProjectId && b.title.includes(': ')) {
            const proj = resolvedProjects.find((p) => p.id === b.flowProjectId);
            if (proj && b.title.startsWith(`${proj.name}: `)) {
              return {
                ...b,
                title: b.title.slice(`${proj.name}: `.length),
              };
            }
          }
          return b;
        });
      const cleanedTodos = (loaded.todos || []).filter(
        (t) =>
          !legacyGenericTodoTitles.has(t.title) &&
          !(t.boundBlockId && legacyGenericBlockIds.has(t.boundBlockId))
      );
      const safeActiveFlowProjectId =
        resolvedProjects.find((p) => p.id === loaded.activeFlowProjectId)?.id ||
        resolvedProjects[0].id;
      setHudState({
        ...loaded,
        blocks: cleanedBlocks,
        todos: cleanedTodos,
        flowProjects: resolvedProjects,
        activeFlowProjectId: safeActiveFlowProjectId,
        windowConfig: {
          ...loaded.windowConfig,
          visualTheme: safeVisualTheme,
          drawerMode: safeDrawerMode,
          dockMode: loaded.windowConfig.dockMode || 'notch',
          alwaysOnTop: loaded.windowConfig.alwaysOnTop ?? true,
          isGhostMode: false,
          showDesktopBackdropPreview: false,
        },
      });
      if (loaded.windowConfig.alwaysOnTop !== undefined) {
        setNativeAlwaysOnTop(loaded.windowConfig.alwaysOnTop);
      }
      soundFx.enabled = loaded.windowConfig.soundEnabled;
      setIsLoaded(true);
    });
  }, []);

  // Expose global hooks for native OS-level Rust hotkey thread (Ctrl+Shift+G, Alt+T, Alt+B)
  useEffect(() => {
    const w = window as unknown as {
      __CHRONOSLAB_SYNC_GHOST__?: (ghost: boolean) => void;
      __CHRONOSLAB_QUICK_ADD__?: (mode: 'task' | 'block') => void;
    };
    w.__CHRONOSLAB_SYNC_GHOST__ = (ghost: boolean) => {
      soundFx.playGhostToggle(ghost);
      if (ghost) {
        setIsNotchHovered(false);
        setIsNotchLockedOpen(false);
      } else {
        setIsNotchHovered(true);
      }
      setHudState((prev) => ({
        ...prev,
        windowConfig: {
          ...prev.windowConfig,
          isGhostMode: ghost,
        },
      }));
    };
    w.__CHRONOSLAB_QUICK_ADD__ = (mode: 'task' | 'block') => {
      soundFx.playTactileClick(1.15);
      setIsNotchHovered(true);
      setQuickAddMode(mode);
      setQuickAddOpen(true);
    };
    return () => {
      delete w.__CHRONOSLAB_SYNC_GHOST__;
      delete w.__CHRONOSLAB_QUICK_ADD__;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    soundFx.enabled = hudState.windowConfig.soundEnabled;
    savePersistedHudState(hudState);
  }, [hudState, isLoaded]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + Shift + G: Toggle Ghost Mode
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        toggleGhostMode();
        return;
      }

      // Alt + T or Ctrl + Shift + T: Quick-Add Task
      if (
        (e.altKey && e.key.toLowerCase() === 't') ||
        (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 't')
      ) {
        e.preventDefault();
        soundFx.playTactileClick(1.15);
        setQuickAddMode('task');
        setQuickAddOpen(true);
        return;
      }

      // Alt + B or Ctrl + Shift + B: Quick-Add Time Block
      if (
        (e.altKey && e.key.toLowerCase() === 'b') ||
        (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'b')
      ) {
        e.preventDefault();
        soundFx.playTactileClick(1.15);
        setQuickAddMode('block');
        setQuickAddOpen(true);
        return;
      }

      // Ctrl + K: Quick Command Bar
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        soundFx.playTactileClick(1.15);
        setQuickAddOpen((prev) => !prev);
        return;
      }

      // Alt + N: Toggle Notch Expand Lock
      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        soundFx.playTactileClick(1.05);
        setIsNotchLockedOpen((prev) => !prev);
        return;
      }

      // Alt + P: Toggle Always on Top / Desktop Mode
      if (e.altKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        toggleAlwaysOnTop();
        return;
      }

      // Alt + E: Cycle Dock Border Edge (Top -> Right -> Bottom -> Left)
      if (e.altKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        cycleDockEdge();
        return;
      }

      // Alt + C: Trigger Focus Check-In
      if (e.altKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        triggerCheckInNow();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Pointer drag listeners for Free Move and Rail Snap
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isRailDraggingRef.current) {
        const inTauri = isRunningInTauri();
        const coordX = inTauri && e.screenX > 0 ? e.screenX : e.clientX;
        const coordY = inTauri && e.screenY > 0 ? e.screenY : e.clientY;
        const totalW = inTauri && window.screen.width > 0 ? window.screen.width : window.innerWidth;
        const totalH = inTauri && window.screen.height > 0 ? window.screen.height : window.innerHeight;

        const dTop = coordY;
        const dBottom = totalH - coordY;
        const dLeft = coordX;
        const dRight = totalW - coordX;

        // Automatically switch edges only when moving close to another border (< 100px)
        let targetEdge = railDragEdgeRef.current;
        const edges: { edge: ScreenEdge; dist: number }[] = [
          { edge: 'top', dist: dTop },
          { edge: 'bottom', dist: dBottom },
          { edge: 'left', dist: dLeft },
          { edge: 'right', dist: dRight },
        ];
        edges.sort((a, b) => a.dist - b.dist);
        if (edges[0].dist < 100) {
          targetEdge = edges[0].edge;
        }

        let ratio = 0.5;
        if (targetEdge === 'top' || targetEdge === 'bottom') {
          ratio = coordX / totalW;
        } else {
          ratio = coordY / totalH;
        }
        ratio = Math.max(0.08, Math.min(0.92, ratio));

        railDragEdgeRef.current = targetEdge;
        railDragRatioRef.current = ratio;
        setRailDragEdge(targetEdge);
        setRailDragRatio(ratio);

        // Smooth continuous real-time movement: moves smoothly right under the mouse!
        setHudState((prev) => ({
          ...prev,
          windowConfig: {
            ...prev.windowConfig,
            dockEdge: targetEdge,
            dockOffsetRatio: ratio,
          },
        }));
        return;
      }

      if (!dragRef.current.dragging) return;
      const dx = e.clientX - dragRef.current.startMouseX;
      const dy = e.clientY - dragRef.current.startMouseY;
      const nextX = Math.max(12, dragRef.current.startWinX + dx);
      const nextY = Math.max(12, dragRef.current.startWinY + dy);

      setHudState((prev) => ({
        ...prev,
        windowConfig: {
          ...prev.windowConfig,
          x: nextX,
          y: nextY,
        },
      }));
    };

    const handleMouseUp = () => {
      if (isRailDraggingRef.current) {
        isRailDraggingRef.current = false;
        setIsRailDragging(false);
        soundFx.playTactileClick(1.15);
      }
      dragRef.current.dragging = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const currentDay = now.getDay();
  const hours24 = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  const currentMins = hours24 * 60 + minutes;
  const currentTotalMinsFloat = currentMins + seconds / 60;

  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const formattedHours = String(hours12).padStart(2, '0');
  const formattedMinutes = String(minutes).padStart(2, '0');
  const amPm = hours24 >= 12 ? 'PM' : 'AM';
  const clockShort = `${formattedHours}:${formattedMinutes} ${amPm}`;

  const todaysBlocks = hudState.blocks
    .filter((b) => b.recurrence.daysOfWeek.includes(currentDay))
    .sort((a, b) => a.startMinutes - b.startMinutes);

  const activeBlock =
    todaysBlocks.find(
      (b) => currentMins >= b.startMinutes && currentMins < b.endMinutes
    ) ?? null;

  const nextBlock =
    todaysBlocks.find((b) => b.startMinutes > currentMins) ?? null;

  const activeTheme = activeBlock
    ? CATEGORY_THEMES[activeBlock.category]
    : null;

  const currentVisualTheme =
    HUD_VISUAL_THEMES[hudState.windowConfig.visualTheme || 'neutral'] ||
    HUD_VISUAL_THEMES.neutral;

  // Theme-aware Free Time color vs Active Block's punchy color
  const notchAccentHex = activeTheme
    ? activeTheme.solidHex
    : currentVisualTheme.freeTimeHex;
  const notchGlowRgba = activeTheme
    ? activeTheme.glowRgba
    : currentVisualTheme.freeTimeGlow;

  let remainingMinutes = 0;
  if (activeBlock) {
    remainingMinutes = Math.max(
      0,
      Math.ceil(activeBlock.endMinutes - currentTotalMinsFloat)
    );
  }

  const topTodo =
    hudState.todos.find(
      (t) => !t.completed && activeBlock && t.boundBlockId === activeBlock.id
    ) || hudState.todos.find((t) => !t.completed);

  useEffect(() => {
    if (!isLoaded) return;
    if (
      activeBlock &&
      prevActiveBlockIdRef.current !== null &&
      prevActiveBlockIdRef.current !== activeBlock.id
    ) {
      soundFx.playPhaseTransition();
    }
    prevActiveBlockIdRef.current = activeBlock ? activeBlock.id : null;
  }, [activeBlock, isLoaded]);

  const triggerCheckInNow = () => {
    soundFx.playCheckInPing();
    setNativeGhostMode(false);
    setHudState((prev) => ({
      ...prev,
      windowConfig: {
        ...prev.windowConfig,
        isGhostMode: false,
      },
    }));
    setIsCheckInActive(true);

    if (isRunningInTauri() && typeof window !== 'undefined' && 'Notification' in window) {
      const targetName = activeBlock ? activeBlock.title : 'your focus session';
      if (Notification.permission === 'granted') {
        new Notification('Focus Check-In', {
          body: `Are you still doing ${targetName}?`,
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
    }
  };

  // Periodic interval timer during active time blocks
  useEffect(() => {
    if (!isLoaded || !hudState.hasCompletedOnboarding || !activeBlock) return;
    const intervalMins = hudState.windowConfig.checkInIntervalMinutes || 15;
    const ms = intervalMins * 60 * 1000;
    const timer = window.setInterval(() => {
      triggerCheckInNow();
    }, ms);
    return () => window.clearInterval(timer);
  }, [
    isLoaded,
    hudState.hasCompletedOnboarding,
    activeBlock?.id,
    hudState.windowConfig.checkInIntervalMinutes,
  ]);

  const handleCheckInConfirmYes = () => {
    soundFx.playTaskComplete();
    setIsCheckInActive(false);
    setHudState((prev) => ({
      ...prev,
      windowConfig: {
        ...prev.windowConfig,
        focusStreak: (prev.windowConfig.focusStreak || 0) + 1,
      },
    }));
  };

  const handleCheckInRefocus = () => {
    soundFx.playPhaseTransition();
    setIsCheckInActive(false);
    if (activeBlock) {
      extendActiveBlock(5);
    }
  };

  const handleCheckInSwitchTask = () => {
    soundFx.playTactileClick(1.0);
    setIsCheckInActive(false);
    setIsNotchLockedOpen(true);
    setDrawerMode('todos');
  };

  const handleChangeCheckInInterval = (mins: 10 | 15 | 20 | 30) => {
    soundFx.playTactileClick(1.05);
    setHudState((prev) => ({
      ...prev,
      windowConfig: {
        ...prev.windowConfig,
        checkInIntervalMinutes: mins,
      },
    }));
  };

  const handleMouseEnterNotch = () => {
    if (hudState.windowConfig.isGhostMode) return;
    if (hoverTimeoutRef.current) {
      window.clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    if (!isNotchHovered) {
      soundFx.playTactileClick(1.15);
      setIsNotchHovered(true);
    }
  };

  const handleMouseLeaveNotch = () => {
    if (hoverTimeoutRef.current) {
      window.clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = window.setTimeout(() => {
      setIsNotchHovered(false);
    }, 240);
  };

  const handleStartDrag = (e: React.MouseEvent<HTMLDivElement | HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (hudState.windowConfig.dockMode === 'floating') {
      if (isRunningInTauri()) {
        startNativeWindowDrag();
        return;
      }
      dragRef.current = {
        dragging: true,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startWinX: hudState.windowConfig.x,
        startWinY: hudState.windowConfig.y,
      };
      return;
    }
    // Intuitive border drag: smoothly slides in real time right under the cursor
    const currentEdge = hudState.windowConfig.dockEdge || 'top';
    const currentRatio = hudState.windowConfig.dockOffsetRatio ?? 0.5;
    isRailDraggingRef.current = true;
    railDragEdgeRef.current = currentEdge;
    railDragRatioRef.current = currentRatio;
    setIsRailDragging(true);
    setRailDragEdge(currentEdge);
    setRailDragRatio(currentRatio);
  };

  const handleStartRailDrag = handleStartDrag;

  const toggleDockMode = () => {
    soundFx.playPhaseTransition();
    setHudState((prev) => {
      const nextMode =
        prev.windowConfig.dockMode === 'floating' ? 'notch' : 'floating';
      return {
        ...prev,
        windowConfig: {
          ...prev.windowConfig,
          dockMode: nextMode,
        },
      };
    });
  };

  const cycleDockEdge = () => {
    soundFx.playTactileClick(1.1);
    setHudState((prev) => {
      const current = prev.windowConfig.dockEdge || 'top';
      const order: ScreenEdge[] = ['top', 'right', 'bottom', 'left'];
      const nextIdx = (order.indexOf(current) + 1) % order.length;
      const nextEdge = order[nextIdx];
      return {
        ...prev,
        windowConfig: {
          ...prev.windowConfig,
          dockMode: 'notch',
          dockEdge: nextEdge,
        },
      };
    });
  };

  const handleSetDockOffsetRatio = (ratio: number) => {
    setHudState((prev) => ({
      ...prev,
      windowConfig: {
        ...prev.windowConfig,
        dockMode: 'notch',
        dockOffsetRatio: Math.max(0.08, Math.min(0.92, ratio)),
      },
    }));
  };

  const toggleGhostMode = () => {
    setHudState((prev) => {
      const nextGhost = !prev.windowConfig.isGhostMode;
      soundFx.playGhostToggle(nextGhost);
      setNativeGhostMode(nextGhost);
      if (nextGhost) {
        setIsNotchHovered(false);
        setIsNotchLockedOpen(false);
      } else {
        setIsNotchHovered(true);
      }
      return {
        ...prev,
        windowConfig: {
          ...prev.windowConfig,
          isGhostMode: nextGhost,
        },
      };
    });
  };

  const toggleAlwaysOnTop = () => {
    soundFx.playTactileClick(1.1);
    setHudState((prev) => {
      const nextTop = !prev.windowConfig.alwaysOnTop;
      setNativeAlwaysOnTop(nextTop);
      return {
        ...prev,
        windowConfig: {
          ...prev.windowConfig,
          alwaysOnTop: nextTop,
        },
      };
    });
  };

  const toggleLaunchOnBoot = () => {
    soundFx.playTactileClick(1.15);
    setHudState((prev) => {
      const nextBoot = prev.windowConfig.launchOnBoot === false ? true : false;
      setNativeAutostart(nextBoot);
      return {
        ...prev,
        windowConfig: {
          ...prev.windowConfig,
          launchOnBoot: nextBoot,
        },
      };
    });
  };

  const toggleSound = () => {
    setHudState((prev) => {
      const nextSound = !prev.windowConfig.soundEnabled;
      soundFx.enabled = nextSound;
      if (nextSound) soundFx.playTactileClick(1.2);
      return {
        ...prev,
        windowConfig: {
          ...prev.windowConfig,
          soundEnabled: nextSound,
        },
      };
    });
  };

  const toggleDesktopPreview = () => {
    soundFx.playTactileClick(1.0);
    setHudState((prev) => ({
      ...prev,
      windowConfig: {
        ...prev.windowConfig,
        showDesktopBackdropPreview: !prev.windowConfig.showDesktopBackdropPreview,
      },
    }));
  };

  const setDrawerMode = (mode: DrawerMode) => {
    soundFx.playTactileClick(1.05);
    setHudState((prev) => ({
      ...prev,
      windowConfig: {
        ...prev.windowConfig,
        drawerMode: mode,
      },
    }));
  };

  const setVisualTheme = (theme: HudVisualTheme) => {
    soundFx.playPhaseTransition();
    setHudState((prev) => ({
      ...prev,
      windowConfig: {
        ...prev.windowConfig,
        visualTheme: theme,
      },
    }));
  };

  const extendActiveBlock = (deltaMinutes: number) => {
    if (!activeBlock) return;
    soundFx.playTactileClick(1.15);
    setHudState((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) =>
        b.id === activeBlock.id
          ? { ...b, endMinutes: Math.min(1440, b.endMinutes + deltaMinutes) }
          : b
      ),
    }));
  };

  const finishActiveBlockEarly = () => {
    if (!activeBlock) return;
    soundFx.playTaskComplete();
    setIsCheckInActive(false);
    const nowMins = now.getHours() * 60 + now.getMinutes();
    setHudState((prev) => {
      const updatedProjects = (prev.flowProjects || []).map((proj) => {
        if (
          activeBlock.flowProjectId &&
          proj.id !== activeBlock.flowProjectId
        ) {
          return proj;
        }
        return {
          ...proj,
          nodes: proj.nodes.map((node) =>
            node.id === activeBlock.flowNodeId
              ? {
                  ...node,
                  status: 'done' as FlowNodeStatus,
                  subtasks: node.subtasks.map((s) => ({
                    ...s,
                    completed: true,
                  })),
                }
              : node
          ),
        };
      });

      return {
        ...prev,
        flowProjects: updatedProjects,
        blocks: prev.blocks
          .map((b) => {
            if (b.id !== activeBlock.id) return b;
            return {
              ...b,
              endMinutes: nowMins,
            };
          })
          .filter((b) => b.endMinutes > b.startMinutes),
      };
    });
  };

  const handleStartBlockNow = (blockId: string) => {
    soundFx.playPhaseTransition();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    setHudState((prev) => {
      const target = prev.blocks.find((b) => b.id === blockId);
      if (!target) return prev;
      const delta = nowMins - target.startMinutes;
      return {
        ...prev,
        blocks: prev.blocks.map((b) => {
          if (b.startMinutes >= target.startMinutes) {
            const dur = b.endMinutes - b.startMinutes;
            const nextStart = Math.max(0, Math.min(1410, b.startMinutes + delta));
            return {
              ...b,
              startMinutes: nextStart,
              endMinutes: Math.min(1440, nextStart + dur),
            };
          }
          return b;
        }),
      };
    });
  };

  const handleCompleteOnboarding = (profile: OnboardingProfile) => {
    soundFx.playPhaseTransition();
    const generated = generateRoutineFromOnboarding(profile);
    setHudState((prev) => {
      const existingProjects = prev.flowProjects || [];
      let nextProjects =
        generated.flowProjects.length > 0
          ? [...existingProjects, ...generated.flowProjects]
          : existingProjects;
      if (nextProjects.length === 0) {
        nextProjects = [
          {
            id: `proj-${Date.now()}`,
            name: 'My Flowchart',
            category: 'deep-work',
            nodes: [],
            edges: [],
            createdAt: new Date().toISOString(),
          },
        ];
      }
      return {
        ...prev,
        hasCompletedOnboarding: true,
        blocks: generated.blocks,
        todos: generated.todos,
        flowProjects: nextProjects,
        activeFlowProjectId:
          generated.flowProjects[0]?.id ||
          prev.activeFlowProjectId ||
          nextProjects[0]?.id,
      };
    });
  };

  // --- Flowchart Project Planner Handlers ---
  const handleSelectFlowProject = (projectId: string) => {
    soundFx.playTactileClick(1.05);
    setHudState((prev) => ({
      ...prev,
      activeFlowProjectId: projectId,
    }));
  };

  const handleUpdateFlowProject = (updated: FlowProject) => {
    setHudState((prev) => {
      const existing = prev.flowProjects || [];
      const index = existing.findIndex((p) => p.id === updated.id);
      let nextProjects: FlowProject[];
      if (index >= 0) {
        nextProjects = existing.map((p, i) => (i === index ? updated : p));
      } else {
        nextProjects = [...existing, updated];
      }
      return {
        ...prev,
        flowProjects: nextProjects,
        activeFlowProjectId: updated.id,
      };
    });
  };

  const handleCreateFlowProject = (created: FlowProject) => {
    setHudState((prev) => ({
      ...prev,
      flowProjects: [...(prev.flowProjects || []), created],
      activeFlowProjectId: created.id,
    }));
  };

  const handleDeleteFlowProject = (projectId: string) => {
    setHudState((prev) => {
      let remaining = (prev.flowProjects || []).filter(
        (p) => p.id !== projectId
      );
      if (remaining.length === 0) {
        remaining = [
          {
            id: `proj-${Date.now()}`,
            name: 'My Flowchart',
            category: 'deep-work',
            nodes: [],
            edges: [],
            createdAt: new Date().toISOString(),
          },
        ];
      }
      return {
        ...prev,
        flowProjects: remaining,
        activeFlowProjectId:
          prev.activeFlowProjectId === projectId
            ? remaining[0]?.id
            : prev.activeFlowProjectId || remaining[0]?.id,
      };
    });
  };

  const handleToggleFlowSubtaskFromHud = (
    nodeId: string,
    subtaskId: string
  ) => {
    setHudState((prev) => {
      const updatedProjects = (prev.flowProjects || []).map((proj) => ({
        ...proj,
        nodes: proj.nodes.map((node) => {
          if (node.id !== nodeId) return node;
          const nextSubs = node.subtasks.map((s) =>
            s.id === subtaskId ? { ...s, completed: !s.completed } : s
          );
          const allDone =
            nextSubs.length > 0 && nextSubs.every((s) => s.completed);
          if (allDone) {
            soundFx.playTaskComplete();
          } else {
            soundFx.playTactileClick(1.05);
          }
          return {
            ...node,
            subtasks: nextSubs,
            status: (allDone
              ? 'done'
              : nextSubs.some((s) => s.completed) && node.status === 'todo'
              ? 'in-progress'
              : node.status) as FlowNodeStatus,
          };
        }),
      }));
      return {
        ...prev,
        flowProjects: updatedProjects,
      };
    });
  };

  const handleAddFlowSubtaskFromHud = (nodeId: string, title: string) => {
    soundFx.playTactileClick(1.1);
    setHudState((prev) => {
      const updatedProjects = (prev.flowProjects || []).map((proj) => ({
        ...proj,
        nodes: proj.nodes.map((node) => {
          if (node.id !== nodeId) return node;
          return {
            ...node,
            subtasks: [
              ...node.subtasks,
              {
                id: `sub-${Date.now()}`,
                title,
                completed: false,
              },
            ],
            status:
              node.status === 'done'
                ? ('in-progress' as FlowNodeStatus)
                : node.status,
          };
        }),
      }));
      return {
        ...prev,
        flowProjects: updatedProjects,
      };
    });
  };

  // Find the earliest open time slot starting at or after `fromMins` for `durationMins`
  const findNextFreeSlotStart = (
    existingBlocks: TimeBlock[],
    fromMins: number,
    durationMins: number
  ): number => {
    const sorted = [...existingBlocks]
      .filter((b) => b.recurrence.daysOfWeek.includes(currentDay))
      .sort((a, b) => a.startMinutes - b.startMinutes);

    let candidate = Math.max(0, fromMins);
    for (const blk of sorted) {
      if (blk.endMinutes <= candidate) continue;
      if (candidate + durationMins <= blk.startMinutes) {
        break;
      }
      candidate = blk.endMinutes + 5;
    }
    return Math.min(1440 - durationMins, candidate);
  };

  const handleScheduleFlowNode = (
    project: FlowProject,
    node: FlowNode,
    startNow = false
  ) => {
    soundFx.playPhaseTransition();
    const duration = node.estimatedMinutes || 45;
    const startBase = startNow ? currentMins : currentMins + 5;

    setHudState((prev) => {
      const slotStart = startNow && !activeBlock
        ? currentMins
        : findNextFreeSlotStart(prev.blocks, startBase, duration);

      const newBlockId = `blk-flow-${Date.now()}`;
      const newBlock: TimeBlock = {
        id: newBlockId,
        title: node.title,
        category: node.category || project.category,
        startMinutes: slotStart,
        endMinutes: Math.min(1440, slotStart + duration),
        bufferMinutes: 5,
        recurrence: { pattern: 'daily', daysOfWeek: [0, 1, 2, 3, 4, 5, 6] },
        flowProjectId: project.id,
        flowNodeId: node.id,
      };

      const updatedProjects = (prev.flowProjects || []).map((p) =>
        p.id === project.id
          ? {
              ...p,
              nodes: p.nodes.map((n) =>
                n.id === node.id
                  ? {
                      ...n,
                      status:
                        n.status === 'todo'
                          ? ('in-progress' as FlowNodeStatus)
                          : n.status,
                      scheduledBlockId: newBlockId,
                    }
                  : n
              ),
            }
          : p
      );

      return {
        ...prev,
        blocks: [...prev.blocks, newBlock],
        flowProjects: updatedProjects,
      };
    });
  };

  const handleAutoScheduleReadyNodes = (project: FlowProject): number => {
    const prog = computeFlowProjectProgress(project);
    const readyNodes = project.nodes.filter((n) =>
      prog.unlockedNodeIds.has(n.id)
    );
    if (readyNodes.length === 0) return 0;

    soundFx.playPhaseTransition();
    let scheduledCount = 0;

    setHudState((prev) => {
      let workingBlocks = [...prev.blocks];
      let cursor = currentMins;
      const scheduledMap = new Map<string, string>();

      for (const node of readyNodes) {
        const alreadyScheduledToday = workingBlocks.some(
          (b) =>
            b.flowNodeId === node.id &&
            b.endMinutes > currentMins &&
            b.recurrence.daysOfWeek.includes(currentDay)
        );
        if (alreadyScheduledToday) continue;

        const duration = node.estimatedMinutes || 45;
        const slotStart = findNextFreeSlotStart(workingBlocks, cursor, duration);
        if (slotStart + duration > 1435) break;

        const blkId = `blk-flow-${Date.now()}-${scheduledCount}`;
        workingBlocks.push({
          id: blkId,
          title: node.title,
          category: node.category || project.category,
          startMinutes: slotStart,
          endMinutes: slotStart + duration,
          bufferMinutes: 5,
          recurrence: { pattern: 'daily', daysOfWeek: [0, 1, 2, 3, 4, 5, 6] },
          flowProjectId: project.id,
          flowNodeId: node.id,
        });
        scheduledMap.set(node.id, blkId);
        cursor = slotStart + duration + 5;
        scheduledCount += 1;
      }

      if (scheduledCount === 0) return prev;

      const updatedProjects = (prev.flowProjects || []).map((p) =>
        p.id === project.id
          ? {
              ...p,
              nodes: p.nodes.map((n) =>
                scheduledMap.has(n.id)
                  ? {
                      ...n,
                      status:
                        n.status === 'todo'
                          ? ('in-progress' as FlowNodeStatus)
                          : n.status,
                      scheduledBlockId: scheduledMap.get(n.id),
                    }
                  : n
              ),
            }
          : p
      );

      return {
        ...prev,
        blocks: workingBlocks,
        flowProjects: updatedProjects,
      };
    });

    return readyNodes.length;
  };

  const handleSkipOnboarding = () => {
    soundFx.playTactileClick(1.0);
    setHudState((prev) => ({
      ...prev,
      hasCompletedOnboarding: true,
    }));
  };

  const handleReopenOnboarding = () => {
    soundFx.playTactileClick(1.05);
    setHudState((prev) => ({
      ...prev,
      hasCompletedOnboarding: false,
    }));
  };

  const handleAddBlock = (newBlock: Omit<TimeBlock, 'id'>) => {
    soundFx.playPhaseTransition();
    const created: TimeBlock = {
      ...newBlock,
      id: `blk-${Date.now()}`,
    };
    setHudState((prev) => ({
      ...prev,
      blocks: [...prev.blocks, created],
    }));
  };

  const handleUpdateBlock = (updated: TimeBlock) => {
    soundFx.playTactileClick(1.0);
    setHudState((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => (b.id === updated.id ? updated : b)),
    }));
  };

  const handleDeleteBlock = (blockId: string) => {
    soundFx.playTactileClick(0.8);
    setHudState((prev) => ({
      ...prev,
      blocks: prev.blocks.filter((b) => b.id !== blockId),
      todos: prev.todos.map((t) =>
        t.boundBlockId === blockId ? { ...t, boundBlockId: undefined } : t
      ),
    }));
  };

  const handleAddTodo = (
    title: string,
    priority: TodoPriority,
    boundBlockId?: string
  ) => {
    soundFx.playTactileClick(1.1);
    const created = {
      id: `todo-${Date.now()}`,
      title,
      completed: false,
      priority,
      boundBlockId,
      createdAt: new Date().toISOString(),
    };
    setHudState((prev) => ({
      ...prev,
      todos: [created, ...prev.todos],
    }));
  };

  const handleToggleTodo = (todoId: string) => {
    setHudState((prev) => {
      const target = prev.todos.find((t) => t.id === todoId);
      if (target && !target.completed) {
        soundFx.playTaskComplete();
      } else {
        soundFx.playTactileClick(0.9);
      }
      return {
        ...prev,
        todos: prev.todos.map((t) =>
          t.id === todoId
            ? {
                ...t,
                completed: !t.completed,
                completedAt: !t.completed ? new Date().toISOString() : undefined,
              }
            : t
        ),
      };
    });
  };

  const handleBindTodoToBlock = (todoId: string, blockId?: string) => {
    soundFx.playTactileClick(1.08);
    setHudState((prev) => ({
      ...prev,
      todos: prev.todos.map((t) =>
        t.id === todoId ? { ...t, boundBlockId: blockId } : t
      ),
    }));
  };

  const handleDeleteTodo = (todoId: string) => {
    soundFx.playTactileClick(0.85);
    setHudState((prev) => ({
      ...prev,
      todos: prev.todos.filter((t) => t.id !== todoId),
    }));
  };

  const { windowConfig, hasCompletedOnboarding } = hudState;
  const isFlowMode = windowConfig.drawerMode === 'flow';
  const isWideMode = isFlowMode;
  const isFloatingMode = windowConfig.dockMode === 'floating';

  const flowProjects = hudState.flowProjects || [];
  const activeFlowProjectId =
    hudState.activeFlowProjectId || flowProjects[0]?.id || '';
  const activeFlowProject =
    flowProjects.find((p) => p.id === activeFlowProjectId) ||
    flowProjects[0] ||
    null;

  const activeFlowNode = activeBlock?.flowNodeId
    ? flowProjects
        .flatMap((p) => p.nodes)
        .find((n) => n.id === activeBlock.flowNodeId) || null
    : null;

  const nextOpenFlowSubtask = activeFlowNode?.subtasks.find(
    (s) => !s.completed
  );
  const effectiveActiveTodo = nextOpenFlowSubtask
    ? {
        id: nextOpenFlowSubtask.id,
        title: nextOpenFlowSubtask.title,
        completed: false,
        priority: 'high' as TodoPriority,
        createdAt: '',
      }
    : topTodo;

  // Both Notch Mode and Free Mode stay compact by default and expand on hover (or when pinned/modal/flow active)
  const isExpanded =
    !windowConfig.isGhostMode &&
    (!hasCompletedOnboarding ||
      isNotchHovered ||
      isNotchLockedOpen ||
      isFlowMode ||
      quickAddOpen ||
      isCheckInActive);

  const hasDrawerOpen =
    !hasCompletedOnboarding ||
    windowConfig.drawerMode !== 'none' ||
    isCheckInActive;

  const lastDrawerRef = useRef<'calendar' | 'todos'>('calendar');
  if (
    windowConfig.drawerMode === 'calendar' ||
    windowConfig.drawerMode === 'todos'
  ) {
    lastDrawerRef.current = windowConfig.drawerMode;
  }
  const activeOrClosingDrawer =
    windowConfig.drawerMode === 'calendar' ||
    windowConfig.drawerMode === 'todos'
      ? windowConfig.drawerMode
      : lastDrawerRef.current;

  const currentDockEdge: ScreenEdge = hudState.windowConfig.dockEdge || 'top';
  const currentDockOffsetRatio: number =
    hudState.windowConfig.dockOffsetRatio ?? 0.5;
  const isCornerStart: boolean =
    !isFloatingMode && currentDockOffsetRatio < 0.28;
  const isVerticalEdge =
    !isFloatingMode &&
    (currentDockEdge === 'left' || currentDockEdge === 'right');

  useEffect(() => {
    if (isExpanded) {
      // Immediately expand native window bounds so CSS can animate freely without OS clipping
      syncNativeWindowBounds(
        true,
        isWideMode && hasCompletedOnboarding,
        isFloatingMode,
        hasDrawerOpen,
        windowConfig.alwaysOnTop !== false,
        currentDockEdge,
        currentDockOffsetRatio
      );
      return;
    }

    // When collapsing, wait for the smooth CSS transition to finish before shrinking native window
    const timer = window.setTimeout(
      () => {
        syncNativeWindowBounds(
          false,
          isWideMode && hasCompletedOnboarding,
          isFloatingMode,
          hasDrawerOpen,
          windowConfig.alwaysOnTop !== false,
          currentDockEdge,
          currentDockOffsetRatio
        );
      },
      380
    );
    return () => window.clearTimeout(timer);
  }, [
    isExpanded,
    isWideMode,
    hasCompletedOnboarding,
    isFloatingMode,
    hasDrawerOpen,
    windowConfig.alwaysOnTop,
    currentDockEdge,
    currentDockOffsetRatio,
  ]);

  const getContainerStyles = (): React.CSSProperties | undefined => {
    if (isFloatingMode && !isRunningInTauri()) {
      return {
        left: windowConfig.x,
        top: windowConfig.y,
      };
    }
    if (!isRunningInTauri()) {
      const pct = Math.round(currentDockOffsetRatio * 100);
      const isFlow = isExpanded && isFlowMode;
      const approxW = isExpanded ? (isFlow ? 880 : 420) : (isVerticalEdge ? 38 : 310);
      const halfW = Math.round(approxW / 2);
      const approxH = isExpanded ? 520 : (isVerticalEdge ? 310 : 38);
      const halfH = Math.round(approxH / 2);

      switch (currentDockEdge) {
        case 'bottom':
          return {
            left: `clamp(12px, calc(${pct}vw - ${halfW}px), calc(100vw - ${approxW + 12}px))`,
            bottom: 52,
          };
        case 'left':
          return {
            top: `clamp(12px, calc(${pct}vh - ${halfH}px), calc(100vh - ${approxH + 12}px))`,
            left: 0,
          };
        case 'right':
          return {
            top: `clamp(12px, calc(${pct}vh - ${halfH}px), calc(100vh - ${approxH + 12}px))`,
            right: 0,
          };
        case 'top':
        default:
          return {
            left: `clamp(12px, calc(${pct}vw - ${halfW}px), calc(100vw - ${approxW + 12}px))`,
            top: 0,
          };
      }
    }
    switch (currentDockEdge) {
      case 'bottom':
        return { bottom: 0, left: 0, right: 0 };
      case 'left':
        return { left: 0, top: 0, bottom: 0 };
      case 'right':
        return { right: 0, top: 0, bottom: 0 };
      case 'top':
      default:
        return { top: 0, left: 0, right: 0 };
    }
  };

  const getContainerClassName = (): string => {
    if (isFloatingMode && !isRunningInTauri()) {
      return 'fixed z-40 pointer-events-none';
    }
    if (!isRunningInTauri()) {
      switch (currentDockEdge) {
        case 'bottom':
          return 'fixed bottom-0 z-40 pointer-events-none flex justify-center items-end';
        case 'left':
          return 'fixed left-0 z-40 pointer-events-none flex items-center justify-start';
        case 'right':
          return 'fixed right-0 z-40 pointer-events-none flex items-center justify-end';
        case 'top':
        default:
          return 'fixed top-0 z-40 pointer-events-none flex justify-center items-start';
      }
    }
    switch (currentDockEdge) {
      case 'bottom':
        return 'fixed bottom-0 inset-x-0 z-40 pointer-events-none flex justify-center items-end';
      case 'left':
        return 'fixed inset-y-0 left-0 z-40 pointer-events-none flex items-center justify-start';
      case 'right':
        return 'fixed inset-y-0 right-0 z-40 pointer-events-none flex items-center justify-end';
      case 'top':
      default:
        return 'fixed top-0 inset-x-0 z-40 pointer-events-none flex justify-center items-start';
    }
  };

  return (
    <div
      data-hud-theme={windowConfig.visualTheme || 'neutral'}
      className={`relative w-screen h-screen overflow-hidden select-none transition-colors duration-500 ${
        !isRunningInTauri()
          ? 'bg-gradient-to-br from-[#0c101c] via-[#070a12] to-[#04060a]'
          : 'bg-transparent'
      }`}
    >
      {/* MAIN CONTAINER: Dynamic Border Snapping Notch OR Undocked Free Move */}
      <div
        style={getContainerStyles()}
        className={getContainerClassName()}
      >
        <div
          onMouseEnter={handleMouseEnterNotch}
          onMouseLeave={handleMouseLeaveNotch}
          className={`hud-perspective-stage transition-opacity duration-300 pointer-events-auto ${
            windowConfig.isGhostMode
              ? 'opacity-60 saturate-75'
              : 'opacity-100'
          }`}
        >
          {!isExpanded ? (
            /* COMPACT MINIMAL PILL: Horizontal (Top/Bottom/Free) or Vertical (Left/Right) */
            isVerticalEdge ? (
              <div
                key="compact-pill-vertical"
                onMouseDown={isFloatingMode ? handleStartDrag : handleStartRailDrag}
                style={{
                  borderRightColor:
                    currentDockEdge === 'left' ? notchAccentHex : undefined,
                  borderLeftColor:
                    currentDockEdge === 'right' ? notchAccentHex : undefined,
                  boxShadow:
                    currentDockEdge === 'left'
                      ? `8px 0 20px -4px ${notchGlowRgba}, inset -1.5px 0 1px rgba(255,255,255,0.2)`
                      : `-8px 0 20px -4px ${notchGlowRgba}, inset 1.5px 0 1px rgba(255,255,255,0.2)`,
                }}
                className={`${
                  currentDockEdge === 'left'
                    ? 'notch-shell rounded-r-[24px] border-r-2'
                    : 'notch-shell rounded-l-[24px] border-l-2'
                } animate-soft-panel flex flex-col items-center justify-between py-4 px-1.5 h-[310px] w-[38px] cursor-pointer group`}
              >
                {/* Drag Handle at top (shifts to bottom if near corner) */}
                {!isCornerStart && (
                  <div
                    className="flex items-center justify-center p-1 rounded-lg text-slate-400 hover:text-white cursor-grab active:cursor-grabbing shrink-0"
                    title="Drag along border or snap to any screen edge"
                    onMouseDown={handleStartRailDrag}
                  >
                    <GripVertical className="w-3.5 h-3.5" />
                  </div>
                )}

                {/* Middle: Task Pill + Active Todo + Clock (All in uniform vertical orientation) */}
                <div className="flex flex-col items-center gap-2.5 my-auto flex-1 min-h-0 justify-center">
                  <span
                    style={{ backgroundColor: notchAccentHex }}
                    className="px-1.5 py-2.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider text-white flex items-center gap-1.5 shadow-sm max-h-[140px] shrink-0 [writing-mode:vertical-rl] rotate-180"
                    title={activeBlock ? activeBlock.title : 'Free Time'}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0" />
                    <span className="truncate">
                      {activeBlock ? activeBlock.title : 'Free Time'}
                    </span>
                  </span>

                  {activeBlock && effectiveActiveTodo && (
                    <span
                      className={`text-[11px] font-semibold truncate max-h-[80px] [writing-mode:vertical-rl] rotate-180 ${
                        currentVisualTheme.mode === 'light'
                          ? 'text-slate-900'
                          : 'text-slate-300'
                      }`}
                      title={effectiveActiveTodo.title}
                    >
                      {effectiveActiveTodo.title}
                    </span>
                  )}

                  {activeBlock && !windowConfig.isGhostMode && (
                    <span
                      style={{ color: notchAccentHex }}
                      className="font-mono text-xs font-extrabold [writing-mode:vertical-rl] rotate-180 shrink-0"
                    >
                      {remainingMinutes}m
                    </span>
                  )}

                  {(windowConfig.focusStreak || 0) > 0 &&
                    !windowConfig.isGhostMode && (
                      <span
                        className={`inline-flex items-center gap-0.5 text-[9px] font-mono font-extrabold shrink-0 [writing-mode:vertical-rl] rotate-180 ${
                          currentVisualTheme.mode === 'light'
                            ? 'text-amber-800'
                            : 'text-amber-300'
                        }`}
                        title="Focus Streak"
                      >
                        <Flame className="w-2.5 h-2.5 fill-amber-500 text-amber-500 rotate-90" />
                        <span>{windowConfig.focusStreak}</span>
                      </span>
                    )}

                  {windowConfig.isGhostMode && (
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleGhostMode();
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (windowConfig.isGhostMode) {
                          toggleGhostMode();
                        }
                      }}
                      className="pointer-events-auto p-1.5 rounded-full bg-amber-500/35 border border-amber-400 text-amber-200 flex items-center justify-center hover:bg-amber-500/55 shadow-md cursor-pointer shrink-0 transition-transform hover:scale-110 animate-pulse my-0.5"
                      title="Ghost Mode Active: Click to Un-Ghost (or press Ctrl+Shift+G)"
                    >
                      <Ghost className="w-3.5 h-3.5 text-amber-300" />
                    </button>
                  )}

                  <div
                    className={`w-3 h-[1px] shrink-0 ${
                      currentVisualTheme.mode === 'light'
                        ? 'bg-slate-900/20'
                        : 'bg-white/15'
                    }`}
                  />

                  {/* Time: Same vertical orientation as the task pill */}
                  <span
                    className={`font-mono text-xs font-extrabold tracking-tight [writing-mode:vertical-rl] rotate-180 shrink-0 ${
                      currentVisualTheme.mode === 'light'
                        ? 'text-slate-950'
                        : 'text-white'
                    }`}
                  >
                    {clockShort}
                  </span>
                </div>

                {/* Bottom: Arrow pointing into screen + Drag Handle when in corner */}
                <div className="flex flex-col items-center justify-center pt-1 shrink-0 gap-1">
                  {currentDockEdge === 'left' ? (
                    <ChevronRight
                      className={`w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform ${
                        currentVisualTheme.mode === 'light'
                          ? 'text-slate-700 group-hover:text-slate-950'
                          : 'text-slate-400 group-hover:text-white'
                      }`}
                    />
                  ) : (
                    <ChevronLeft
                      className={`w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform ${
                        currentVisualTheme.mode === 'light'
                          ? 'text-slate-700 group-hover:text-slate-950'
                          : 'text-slate-400 group-hover:text-white'
                      }`}
                    />
                  )}
                  {isCornerStart && (
                    <div
                      className="flex items-center justify-center p-1 rounded-lg text-slate-400 hover:text-white cursor-grab active:cursor-grabbing shrink-0 mt-0.5"
                      title="Drag along border or snap to any screen edge"
                      onMouseDown={handleStartRailDrag}
                    >
                      <GripVertical className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div
                key="compact-pill-horizontal"
                onMouseDown={isFloatingMode ? handleStartDrag : handleStartRailDrag}
                style={{
                  borderBottomColor:
                    currentDockEdge === 'top' || isFloatingMode
                      ? notchAccentHex
                      : undefined,
                  borderTopColor:
                    currentDockEdge === 'bottom' ? notchAccentHex : undefined,
                  boxShadow:
                    currentDockEdge === 'bottom'
                      ? `0 -8px 20px -4px ${notchGlowRgba}, inset 0 1.5px 1px rgba(255,255,255,0.2)`
                      : `0 8px 20px -4px ${notchGlowRgba}, inset 0 -1.5px 1px rgba(255,255,255,0.2)`,
                }}
                className={`${
                  isFloatingMode
                    ? 'clay-slab rounded-[22px] mt-1.5 px-3.5 py-2 cursor-grab active:cursor-grabbing border-b-2'
                    : currentDockEdge === 'bottom'
                    ? 'notch-shell rounded-[22px] mb-1.5 px-4 py-2 cursor-pointer border-t-2'
                    : 'notch-shell rounded-b-[24px] px-4 py-2 cursor-pointer border-b-2'
                } animate-soft-panel flex items-center justify-between gap-3.5 min-w-[310px] max-w-[460px] group`}
              >
                {/* Left: Drag Handle (shifts to right if in corner) + Current State Pill */}
                <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
                  {!isCornerStart && (
                    <div
                      className="p-1 -ml-1 text-slate-400 hover:text-white cursor-grab active:cursor-grabbing shrink-0"
                      title="Drag along border or snap to any screen edge"
                      onMouseDown={handleStartRailDrag}
                    >
                      <GripHorizontal className="w-3.5 h-3.5" />
                    </div>
                  )}
                  <span
                    style={{ backgroundColor: notchAccentHex }}
                    className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider text-white flex items-center gap-1.5 min-w-0 max-w-[185px] shadow-sm"
                    title={activeBlock ? activeBlock.title : 'Free Time'}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0" />
                    <span className="truncate">
                      {activeBlock ? activeBlock.title : 'Free Time'}
                    </span>
                  </span>

                  {activeBlock && effectiveActiveTodo && (
                    <span
                      className={`text-xs font-semibold truncate flex-1 min-w-0 ${
                        currentVisualTheme.mode === 'light'
                          ? 'text-slate-900'
                          : 'text-slate-300'
                      }`}
                    >
                      {effectiveActiveTodo.title}
                    </span>
                  )}
                </div>

                {/* Right: Un-Ghost button (when ghosted) OR Remaining Minutes + Live Clock */}
                <div className="flex items-center gap-2 shrink-0">
                  {windowConfig.isGhostMode && (
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleGhostMode();
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (windowConfig.isGhostMode) {
                          toggleGhostMode();
                        }
                      }}
                      className="pointer-events-auto p-1.5 rounded-full bg-amber-500/35 border border-amber-400 text-amber-200 flex items-center justify-center hover:bg-amber-500/55 shadow-md cursor-pointer shrink-0 transition-transform hover:scale-110 animate-pulse"
                      title="Ghost Mode Active: Click to Un-Ghost (or press Ctrl+Shift+G)"
                    >
                      <Ghost className="w-3.5 h-3.5 text-amber-300" />
                    </button>
                  )}

                  {activeBlock && !windowConfig.isGhostMode && (
                    <span
                      style={{ color: notchAccentHex }}
                      className="font-mono text-xs font-extrabold"
                    >
                      {remainingMinutes}m
                    </span>
                  )}

                  {(windowConfig.focusStreak || 0) > 0 &&
                    !windowConfig.isGhostMode && (
                      <span
                        className={`inline-flex items-center gap-0.5 text-[10px] font-mono font-extrabold ${
                          currentVisualTheme.mode === 'light'
                            ? 'text-amber-800'
                            : 'text-amber-300'
                        }`}
                        title="Focus Check-In Streak"
                      >
                        <Flame className="w-3 h-3 fill-amber-500 text-amber-500" />
                        <span>{windowConfig.focusStreak}</span>
                      </span>
                    )}

                  <div
                    className={`h-3 w-[1px] ${
                      currentVisualTheme.mode === 'light'
                        ? 'bg-slate-900/20'
                        : 'bg-white/15'
                    }`}
                  />

                  <span
                    className={`font-mono text-xs font-extrabold tracking-tight ${
                      currentVisualTheme.mode === 'light'
                        ? 'text-slate-950'
                        : 'text-white'
                    }`}
                  >
                    {clockShort}
                  </span>

                  {currentDockEdge === 'bottom' ? (
                    <ChevronUp
                      className={`w-3.5 h-3.5 group-hover:-translate-y-0.5 transition-transform ${
                        currentVisualTheme.mode === 'light'
                          ? 'text-slate-700 group-hover:text-slate-950'
                          : 'text-slate-400 group-hover:text-white'
                      }`}
                    />
                  ) : (
                    <ChevronDown
                      className={`w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform ${
                        currentVisualTheme.mode === 'light'
                          ? 'text-slate-700 group-hover:text-slate-950'
                          : 'text-slate-400 group-hover:text-white'
                      }`}
                    />
                  )}

                  {isCornerStart && (
                    <div
                      className="p-1 -mr-1 text-slate-400 hover:text-white cursor-grab active:cursor-grabbing shrink-0 ml-0.5"
                      title="Drag along border or snap to any screen edge"
                      onMouseDown={handleStartRailDrag}
                    >
                      <GripHorizontal className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              </div>
            )
          ) : (
            /* EXPANDED NOTCH OR FREE-FLOATING HUD COMMAND CENTER (Distinct key + clean subtle fade) */
            <div
              key="expanded-hud"
              className={`${
                isFloatingMode
                  ? 'clay-slab rounded-[28px] p-4'
                  : currentDockEdge === 'bottom'
                  ? 'notch-shell rounded-t-[32px] rounded-b-[20px] mb-1.5 p-4'
                  : currentDockEdge === 'left'
                  ? 'notch-shell rounded-r-[32px] p-4'
                  : currentDockEdge === 'right'
                  ? 'notch-shell rounded-l-[32px] p-4'
                  : 'notch-shell rounded-b-[32px] p-4'
              } animate-soft-panel flex flex-col gap-3 max-h-[calc(100vh-16px)] overflow-y-auto ${
                !hasCompletedOnboarding
                  ? 'w-[92vw] max-w-[370px]'
                  : isFlowMode
                  ? 'w-[96vw] max-w-[880px]'
                  : 'w-[92vw] max-w-[400px]'
              }`}
            >
              {!hasCompletedOnboarding ? (
                <OnboardingWizard
                  currentTheme={windowConfig.visualTheme || 'neutral'}
                  onSelectTheme={setVisualTheme}
                  onStartDrag={handleStartDrag}
                  onComplete={handleCompleteOnboarding}
                  onSkip={handleSkipOnboarding}
                />
              ) : isFlowMode && !isCheckInActive ? (
                <div key="flow-view" className="animate-soft-popover">
                  <FlowchartPlannerView
                    now={now}
                    projects={flowProjects}
                    activeProjectId={activeFlowProjectId}
                    activeBlock={activeBlock}
                    windowConfig={windowConfig}
                    onStartDrag={handleStartDrag}
                    onSetDrawerMode={setDrawerMode}
                    onSelectProject={handleSelectFlowProject}
                    onUpdateProject={handleUpdateFlowProject}
                    onCreateProject={handleCreateFlowProject}
                    onDeleteProject={handleDeleteFlowProject}
                    onScheduleFlowNode={handleScheduleFlowNode}
                    onAutoScheduleReadyNodes={handleAutoScheduleReadyNodes}
                    onFinishActiveBlockEarly={finishActiveBlockEarly}
                  />
                </div>
              ) : (
                <div
                  key="hud-view"
                  className="flex flex-col gap-3 animate-soft-popover"
                >
                  {isCheckInActive && (
                    <FocusCheckInBanner
                      activeBlock={activeBlock}
                      activeTodo={effectiveActiveTodo}
                      streak={windowConfig.focusStreak || 0}
                      intervalMinutes={
                        windowConfig.checkInIntervalMinutes || 15
                      }
                      onConfirmYes={handleCheckInConfirmYes}
                      onRefocusNow={handleCheckInRefocus}
                      onSwitchTask={handleCheckInSwitchTask}
                      onFinishEarly={finishActiveBlockEarly}
                      onChangeInterval={handleChangeCheckInInterval}
                    />
                  )}

                  <AmbientClockHud
                    now={now}
                    activeBlock={activeBlock}
                    nextBlock={nextBlock}
                    activeFlowNode={activeFlowNode}
                    activeFlowProject={activeFlowProject}
                    todos={hudState.todos}
                    windowConfig={windowConfig}
                    isNotchLockedOpen={isNotchLockedOpen}
                    onToggleNotchLock={() => {
                      soundFx.playTactileClick(1.0);
                      setIsNotchLockedOpen(!isNotchLockedOpen);
                    }}
                    onStartDrag={handleStartDrag}
                    onToggleDockMode={toggleDockMode}
                    onToggleGhostMode={toggleGhostMode}
                    onToggleAlwaysOnTop={toggleAlwaysOnTop}
                    onToggleSound={toggleSound}
                    onToggleDesktopPreview={toggleDesktopPreview}
                    onSetDrawerMode={setDrawerMode}
                    onExtendActiveBlock={extendActiveBlock}
                    onFinishActiveBlockEarly={finishActiveBlockEarly}
                    onStartBlockNow={handleStartBlockNow}
                    onScheduleFlowNode={handleScheduleFlowNode}
                    onToggleTodo={handleToggleTodo}
                    onToggleFlowSubtask={handleToggleFlowSubtaskFromHud}
                    onReopenSetup={handleReopenOnboarding}
                    onToggleLaunchOnBoot={toggleLaunchOnBoot}
                    onTriggerCheckIn={triggerCheckInNow}
                  />

                  <div
                    className={`soft-collapse shrink-0 ${
                      windowConfig.drawerMode !== 'none' && !isCheckInActive
                        ? 'soft-collapse-open'
                        : 'soft-collapse-closed -mt-3'
                    }`}
                  >
                    <div className="overflow-hidden">
                      {activeOrClosingDrawer === 'calendar' && (
                        <div key="calendar" className="animate-soft-popover">
                          <TimelineCalendarDrawer
                            now={now}
                            blocks={hudState.blocks}
                            todos={hudState.todos}
                            flowProjects={flowProjects}
                            activeFlowProjectId={activeFlowProjectId}
                            selectedBlockId={selectedBlockId}
                            onSelectBlock={setSelectedBlockId}
                            onAddBlock={handleAddBlock}
                            onUpdateBlock={handleUpdateBlock}
                            onDeleteBlock={handleDeleteBlock}
                            onDropTodoOnBlock={(todoId, blockId) =>
                              handleBindTodoToBlock(todoId, blockId)
                            }
                            onOpenFlowView={() => setDrawerMode('flow')}
                          />
                        </div>
                      )}

                      {activeOrClosingDrawer === 'todos' && (
                        <div key="todos" className="animate-soft-popover">
                          <TodoListDrawer
                            todos={hudState.todos}
                            blocks={hudState.blocks}
                            activeBlock={activeBlock}
                            selectedBlockId={selectedBlockId}
                            flowProjects={flowProjects}
                            activeFlowProjectId={activeFlowProjectId}
                            onAddTodo={handleAddTodo}
                            onToggleTodo={handleToggleTodo}
                            onBindTodoToBlock={handleBindTodoToBlock}
                            onDeleteTodo={handleDeleteTodo}
                            onToggleFlowSubtask={
                              handleToggleFlowSubtaskFromHud
                            }
                            onAddFlowSubtask={handleAddFlowSubtaskFromHud}
                            onScheduleFlowNode={handleScheduleFlowNode}
                            onOpenFlowView={() => setDrawerMode('flow')}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Snap guide rail overlay when dragging along screen borders */}
      {isRailDragging && (
        <div className="fixed inset-0 pointer-events-none z-50">
          <div
            style={{
              borderColor: notchAccentHex,
              boxShadow: `0 0 24px ${notchGlowRgba}`,
            }}
            className={`absolute transition-all duration-150 ${
              railDragEdge === 'top'
                ? 'top-0 inset-x-0 h-2 border-b-2 bg-purple-500/15'
                : railDragEdge === 'bottom'
                ? 'bottom-[52px] inset-x-0 h-2 border-t-2 bg-purple-500/15'
                : railDragEdge === 'left'
                ? 'left-0 inset-y-0 w-2 border-r-2 bg-purple-500/15'
                : 'right-0 inset-y-0 w-2 border-l-2 bg-purple-500/15'
            }`}
          />
        </div>
      )}

      {/* Quick-Add Command Bar (Alt+T / Alt+B / Ctrl+K) */}
      <QuickAddCommandModal
        isOpen={quickAddOpen}
        initialMode={quickAddMode}
        blocks={hudState.blocks}
        activeBlock={activeBlock}
        nextBlock={nextBlock}
        flowProjects={flowProjects}
        activeFlowProjectId={activeFlowProjectId}
        now={now}
        onClose={() => setQuickAddOpen(false)}
        onQuickAddTodo={handleAddTodo}
        onQuickAddFlowSubtask={handleAddFlowSubtaskFromHud}
        onQuickAddBlock={handleAddBlock}
      />
    </div>
  );
};

export default App;
