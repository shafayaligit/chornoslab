export type BlockCategory =
  | 'deep-work'
  | 'routine'
  | 'transition'
  | 'wellness'
  | 'creative';

export type RecurrencePattern = 'daily' | 'weekdays' | 'weekends' | 'custom';

export interface RecurrenceRule {
  pattern: RecurrencePattern;
  daysOfWeek: number[];
}

export interface TimeBlock {
  id: string;
  title: string;
  category: BlockCategory;
  startMinutes: number;
  endMinutes: number;
  bufferMinutes: number;
  recurrence: RecurrenceRule;
  notes?: string;
  flowProjectId?: string;
  flowNodeId?: string;
}

export type TodoPriority = 'high' | 'medium' | 'low';

export interface TodoItem {
  id: string;
  title: string;
  completed: boolean;
  priority: TodoPriority;
  boundBlockId?: string;
  createdAt: string;
  completedAt?: string;
}

export type FlowNodeStatus = 'todo' | 'in-progress' | 'done';

export interface FlowSubtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface FlowNode {
  id: string;
  title: string;
  category: BlockCategory;
  estimatedMinutes?: number;
  status: FlowNodeStatus;
  x: number;
  y: number;
  subtasks: FlowSubtask[];
  notes?: string;
  scheduledBlockId?: string;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
}

export interface FlowProject {
  id: string;
  name: string;
  category: BlockCategory;
  nodes: FlowNode[];
  edges: FlowEdge[];
  rawCode?: string;
  createdAt: string;
}

export type DrawerMode = 'none' | 'calendar' | 'todos' | 'flow';

export type HudVisualTheme =
  | 'neutral'
  | 'space'
  | 'cats'
  | 'flowers'
  | 'otter'
  | 'monkeys';

export interface HudVisualThemeMeta {
  id: HudVisualTheme;
  label: string;
  mode: 'dark' | 'light';
  emoji: string;
  decorEmojis: [string, string];
  freeTimeHex: string;
  freeTimeGlow: string;
  freeTimeGradient: string;
}

export const HUD_VISUAL_THEMES: Record<HudVisualTheme, HudVisualThemeMeta> = {
  neutral: {
    id: 'neutral',
    label: 'Neutral',
    mode: 'dark',
    emoji: '◐',
    decorEmojis: ['', ''],
    freeTimeHex: '#06b6d4',
    freeTimeGlow: 'rgba(6, 182, 212, 0.42)',
    freeTimeGradient: 'linear-gradient(135deg, #0891b2 0%, #0d9488 100%)',
  },
  space: {
    id: 'space',
    label: 'Space',
    mode: 'dark',
    emoji: '🪐',
    decorEmojis: ['✨', '🚀'],
    freeTimeHex: '#6366f1',
    freeTimeGlow: 'rgba(99, 102, 241, 0.42)',
    freeTimeGradient: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
  },
  cats: {
    id: 'cats',
    label: 'Cats',
    mode: 'dark',
    emoji: '🐱',
    decorEmojis: ['🐾', '🧶'],
    freeTimeHex: '#f59e0b',
    freeTimeGlow: 'rgba(245, 158, 11, 0.42)',
    freeTimeGradient: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
  },
  flowers: {
    id: 'flowers',
    label: 'Tulip',
    mode: 'light',
    emoji: '🌷',
    decorEmojis: ['🌷', '🌿'],
    freeTimeHex: '#e11d48',
    freeTimeGlow: 'rgba(225, 29, 72, 0.35)',
    freeTimeGradient: 'linear-gradient(135deg, #f43f5e 0%, #db2777 100%)',
  },
  monkeys: {
    id: 'monkeys',
    label: 'Monkeys',
    mode: 'light',
    emoji: '🐵',
    decorEmojis: ['🍌', '🌴'],
    freeTimeHex: '#d97706',
    freeTimeGlow: 'rgba(217, 119, 6, 0.35)',
    freeTimeGradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  },
  otter: {
    id: 'otter',
    label: 'Otter',
    mode: 'light',
    emoji: '🦦',
    decorEmojis: ['🐚', '💧'],
    freeTimeHex: '#0284c7',
    freeTimeGlow: 'rgba(2, 132, 199, 0.35)',
    freeTimeGradient: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
  },
};

export type ScreenEdge = 'top' | 'bottom' | 'left' | 'right';

export interface WindowStateConfig {
  x: number;
  y: number;
  dockMode?: 'notch' | 'floating';
  dockEdge?: ScreenEdge;
  dockOffsetRatio?: number;
  visualTheme?: HudVisualTheme;
  launchOnBoot?: boolean;
  checkInIntervalMinutes?: 10 | 15 | 20 | 30;
  focusStreak?: number;
  isGhostMode: boolean;
  alwaysOnTop: boolean;
  drawerMode: DrawerMode;
  isometric3D: boolean;
  soundEnabled: boolean;
  showDesktopBackdropPreview: boolean;
}

export type FocusArchetype = 'coding' | 'study' | 'creative' | 'founder';

export type DailyAnchorId =
  | 'morning'
  | 'workout'
  | 'sync'
  | 'reading'
  | 'shutdown';

export interface OnboardingProfile {
  wakeMinutes: number;
  archetype: FocusArchetype;
  primaryProject: string;
  secondaryTopic: string;
  customTasks: string[];
  blockLength: number;
  anchors: DailyAnchorId[];
}

export interface HudPersistedState {
  version: number;
  hasCompletedOnboarding: boolean;
  windowConfig: WindowStateConfig;
  blocks: TimeBlock[];
  todos: TodoItem[];
  flowProjects?: FlowProject[];
  activeFlowProjectId?: string;
}

export interface CategoryTheme {
  id: BlockCategory;
  label: string;
  accentHex: string;
  solidHex: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  badgeClass: string;
  glowRgba: string;
  pillGradient: string;
}

export const CATEGORY_THEMES: Record<BlockCategory, CategoryTheme> = {
  'deep-work': {
    id: 'deep-work',
    label: 'Focus',
    accentHex: '#4f7df3',
    solidHex: '#4f7df3', // Cobalt Blue (top & bottom blocks in reference)
    bgClass: 'bg-blue-500/20',
    borderClass: 'border-blue-400/40',
    textClass: 'text-blue-300',
    badgeClass: 'bg-blue-500/25 text-blue-200 border-blue-400/40',
    glowRgba: 'rgba(79, 125, 243, 0.4)',
    pillGradient: 'linear-gradient(180deg, #5683f5 0%, #4672e6 100%)',
  },
  routine: {
    id: 'routine',
    label: 'Routine',
    accentHex: '#38a832',
    solidHex: '#38a832', // Vivid Green (2nd block in reference)
    bgClass: 'bg-emerald-500/20',
    borderClass: 'border-emerald-400/40',
    textClass: 'text-emerald-300',
    badgeClass: 'bg-emerald-500/25 text-emerald-200 border-emerald-400/40',
    glowRgba: 'rgba(56, 168, 50, 0.4)',
    pillGradient: 'linear-gradient(180deg, #40b23a 0%, #32992c 100%)',
  },
  creative: {
    id: 'creative',
    label: 'Creative',
    accentHex: '#fb2c56',
    solidHex: '#fb2c56', // Coral Crimson (3rd block in reference)
    bgClass: 'bg-rose-500/20',
    borderClass: 'border-rose-400/40',
    textClass: 'text-rose-300',
    badgeClass: 'bg-rose-500/25 text-rose-200 border-rose-400/40',
    glowRgba: 'rgba(251, 44, 86, 0.4)',
    pillGradient: 'linear-gradient(180deg, #fc3860 0%, #eb214a 100%)',
  },
  wellness: {
    id: 'wellness',
    label: 'Wellness',
    accentHex: '#852df7',
    solidHex: '#852df7', // Electric Purple (4th block in reference)
    bgClass: 'bg-purple-500/20',
    borderClass: 'border-purple-400/40',
    textClass: 'text-purple-300',
    badgeClass: 'bg-purple-500/25 text-purple-200 border-purple-400/40',
    glowRgba: 'rgba(133, 45, 247, 0.4)',
    pillGradient: 'linear-gradient(180deg, #8e3bf8 0%, #7822e6 100%)',
  },
  transition: {
    id: 'transition',
    label: 'Sync',
    accentHex: '#e5a91a',
    solidHex: '#e5a91a', // Golden Amber (5th block in reference)
    bgClass: 'bg-amber-500/20',
    borderClass: 'border-amber-400/40',
    textClass: 'text-amber-300',
    badgeClass: 'bg-amber-500/25 text-amber-200 border-amber-400/40',
    glowRgba: 'rgba(229, 169, 26, 0.4)',
    pillGradient: 'linear-gradient(180deg, #ebb124 0%, #d89c12 100%)',
  },
};

export function formatMinutesToTime(totalMinutes: number, use24h = false): string {
  const clamped = ((totalMinutes % 1440) + 1440) % 1440;
  const hours24 = Math.floor(clamped / 60);
  const mins = clamped % 60;
  const mm = String(mins).padStart(2, '0');
  if (use24h) {
    return `${String(hours24).padStart(2, '0')}:${mm}`;
  }
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${mm} ${period}`;
}

export function formatHourShort(hour24: number): string {
  const h = ((hour24 % 24) + 24) % 24;
  const period = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12} ${period}`;
}

export function getOrdinalDay(dayNum: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = dayNum % 100;
  return dayNum + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function createStarterFlowProjects(
  mainTopic = 'Core Project',
  secondTopic = 'Release Polish'
): FlowProject[] {
  const projId = 'proj-starter-1';
  return [
    {
      id: projId,
      name: mainTopic,
      category: 'deep-work',
      createdAt: new Date().toISOString(),
      nodes: [
        {
          id: 'scope',
          title: 'Scope & Architecture',
          category: 'deep-work',
          status: 'done',
          x: 60,
          y: 160,
          notes: 'Core requirements and key milestones defined.',
          subtasks: [
            { id: 'st-1', title: 'Outline project goals', completed: true },
            { id: 'st-2', title: 'Map key dependencies', completed: true },
          ],
        },
        {
          id: 'core',
          title: `${mainTopic} Core`,
          category: 'deep-work',
          estimatedMinutes: 60,
          status: 'in-progress',
          x: 350,
          y: 80,
          notes: 'Main implementation phase — check off subtasks as you go.',
          subtasks: [
            { id: 'st-3', title: 'Build core module', completed: true },
            { id: 'st-4', title: 'Wire state & persistence', completed: false },
            { id: 'st-5', title: 'Test edge cases', completed: false },
          ],
        },
        {
          id: 'design',
          title: secondTopic,
          category: 'creative',
          status: 'todo',
          x: 350,
          y: 280,
          notes: 'Visual polish and UX refinement.',
          subtasks: [
            { id: 'st-6', title: 'Refine UI layout & contrast', completed: false },
            { id: 'st-7', title: 'Add interactive feedback', completed: false },
          ],
        },
        {
          id: 'launch',
          title: 'Final Review & Ship',
          category: 'routine',
          estimatedMinutes: 45,
          status: 'todo',
          x: 650,
          y: 180,
          subtasks: [
            { id: 'st-8', title: 'End-to-end walkthrough', completed: false },
            { id: 'st-9', title: 'Package & ship release', completed: false },
          ],
        },
      ],
      edges: [
        { id: 'e-scope-core', source: 'scope', target: 'core' },
        { id: 'e-scope-design', source: 'scope', target: 'design' },
        { id: 'e-core-launch', source: 'core', target: 'launch' },
        { id: 'e-design-launch', source: 'design', target: 'launch' },
      ],
    },
  ];
}

export function generateRoutineFromOnboarding(profile: OnboardingProfile): {
  blocks: TimeBlock[];
  todos: TodoItem[];
  flowProjects: FlowProject[];
} {
  const allDays = [0, 1, 2, 3, 4, 5, 6];
  const blocks: TimeBlock[] = [];

  const mainTopic = profile.primaryProject.trim();
  const secondTopic = profile.secondaryTopic.trim();

  let cursor = profile.wakeMinutes;

  // Only create time blocks if the user explicitly typed a title
  if (mainTopic) {
    blocks.push({
      id: `blk-user-${Date.now()}-1`,
      title: mainTopic,
      category: 'deep-work',
      startMinutes: cursor,
      endMinutes: Math.min(1440, cursor + profile.blockLength),
      bufferMinutes: 5,
      recurrence: { pattern: 'daily', daysOfWeek: allDays },
    });
    cursor = Math.min(1410, cursor + profile.blockLength);
  }

  if (secondTopic) {
    blocks.push({
      id: `blk-user-${Date.now()}-2`,
      title: secondTopic,
      category: 'creative',
      startMinutes: cursor,
      endMinutes: Math.min(1440, cursor + profile.blockLength),
      bufferMinutes: 5,
      recurrence: { pattern: 'daily', daysOfWeek: allDays },
    });
  }

  blocks.sort((a, b) => a.startMinutes - b.startMinutes);

  // Only create tasks that the user explicitly typed
  const userProvidedTasks = profile.customTasks
    .map((t) => t.trim())
    .filter(Boolean);

  const priorities: TodoPriority[] = ['high', 'medium', 'low'];

  const todos: TodoItem[] = userProvidedTasks.map((title, idx) => ({
    id: `todo-${Date.now()}-${idx}`,
    title,
    completed: false,
    priority: priorities[idx % priorities.length],
    boundBlockId: blocks[0]?.id,
    createdAt: new Date().toISOString(),
  }));

  const flowProjects = mainTopic
    ? createStarterFlowProjects(mainTopic, secondTopic || 'Polish & Review')
    : [];

  return { blocks, todos, flowProjects };
}

export function createInitialSeedState(): HudPersistedState {
  const initialProjectId = 'proj-initial';
  return {
    version: 6,
    hasCompletedOnboarding: true,
    windowConfig: {
      x: 48,
      y: 36,
      dockMode: 'notch',
      dockEdge: 'top',
      dockOffsetRatio: 0.5,
      launchOnBoot: true,
      checkInIntervalMinutes: 15,
      focusStreak: 3,
      isGhostMode: false,
      alwaysOnTop: true,
      drawerMode: 'calendar',
      isometric3D: false,
      soundEnabled: true,
      showDesktopBackdropPreview: true,
    },
    blocks: [
      {
        id: 'blk-project-active',
        title: 'PROJECT',
        category: 'deep-work',
        startMinutes: 0,
        endMinutes: 1440,
        bufferMinutes: 0,
        recurrence: { pattern: 'daily', daysOfWeek: [0, 1, 2, 3, 4, 5, 6] },
        flowProjectId: initialProjectId,
      },
    ],
    todos: [
      {
        id: 'todo-1',
        title: 'Refactor UI & Snap Rails',
        completed: false,
        priority: 'high',
        createdAt: new Date().toISOString(),
        boundBlockId: 'blk-project-active',
      },
    ],
    flowProjects: [
      {
        id: initialProjectId,
        name: 'Main Sprint',
        category: 'deep-work',
        nodes: [],
        edges: [],
        createdAt: new Date().toISOString(),
      },
    ],
    activeFlowProjectId: initialProjectId,
  };
}
