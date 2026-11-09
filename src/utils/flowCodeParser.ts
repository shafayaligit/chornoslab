import {
  BlockCategory,
  FlowEdge,
  FlowNode,
  FlowNodeStatus,
  FlowProject,
  FlowSubtask,
} from '../types/hud';

const VALID_CATEGORIES: BlockCategory[] = [
  'deep-work',
  'routine',
  'transition',
  'wellness',
  'creative',
];

function parseCategoryTag(raw: string): BlockCategory | undefined {
  const cleaned = raw.trim().toLowerCase().replace(/^#/, '');
  if (VALID_CATEGORIES.includes(cleaned as BlockCategory)) {
    return cleaned as BlockCategory;
  }
  if (cleaned === 'focus' || cleaned === 'code' || cleaned === 'work') {
    return 'deep-work';
  }
  if (cleaned === 'design' || cleaned === 'ui') {
    return 'creative';
  }
  if (cleaned === 'sync' || cleaned === 'meetings' || cleaned === 'meeting') {
    return 'transition';
  }
  if (cleaned === 'health' || cleaned === 'break') {
    return 'wellness';
  }
  return undefined;
}

function parseStatusTag(raw: string): FlowNodeStatus | undefined {
  const cleaned = raw.trim().toLowerCase();
  if (cleaned === 'done' || cleaned === 'complete' || cleaned === 'completed') {
    return 'done';
  }
  if (
    cleaned === 'active' ||
    cleaned === 'doing' ||
    cleaned === 'in-progress' ||
    cleaned === 'wip'
  ) {
    return 'in-progress';
  }
  if (cleaned === 'todo' || cleaned === 'pending') {
    return 'todo';
  }
  return undefined;
}

function parseDurationTag(raw: string): number | undefined {
  const cleaned = raw.trim().toLowerCase();
  const minMatch = cleaned.match(/^(\d+)\s*(m|min|mins|minute|minutes)$/);
  if (minMatch) {
    return Math.max(5, Math.min(480, parseInt(minMatch[1], 10)));
  }
  const hrMatch = cleaned.match(/^(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours)$/);
  if (hrMatch) {
    return Math.max(5, Math.min(480, Math.round(parseFloat(hrMatch[1]) * 60)));
  }
  return undefined;
}

function estimateNodeDimensions(
  node: FlowNode,
  measured?: { w: number; h: number }
): { w: number; h: number } {
  if (measured && measured.w > 0 && measured.h > 0) {
    return measured;
  }
  const estimatedW = Math.min(
    310,
    Math.max(210, Math.round(node.title.length * 7.2 + 64))
  );
  const titleLines = Math.max(
    1,
    Math.ceil((node.title.length * 7.0) / Math.max(120, estimatedW - 56))
  );
  const subtaskFooter = node.subtasks.length > 0 ? 24 : 0;
  const estimatedH = 38 + titleLines * 18 + subtaskFooter;

  return { w: estimatedW, h: Math.max(66, estimatedH) };
}

/**
 * Topological DAG Auto-Layout with Dynamic Card Sizing, Wide Arrow Channels,
 * and Smart Multi-Row Grid Wrapping for Long Sequential Flows
 */
export function autoLayoutFlowGraph(
  nodes: FlowNode[],
  edges: FlowEdge[],
  measuredSizes?: Record<string, { w: number; h: number }>
): FlowNode[] {
  if (nodes.length === 0) return [];

  const nodeIds = new Set(nodes.map((n) => n.id));
  const validEdges = edges.filter(
    (e) =>
      nodeIds.has(e.source) && nodeIds.has(e.target) && e.source !== e.target
  );

  const incoming = new Map<string, string[]>();
  const outgoing = new Map<string, string[]>();
  nodes.forEach((n) => {
    incoming.set(n.id, []);
    outgoing.set(n.id, []);
  });

  validEdges.forEach((e) => {
    incoming.get(e.target)?.push(e.source);
    outgoing.get(e.source)?.push(e.target);
  });

  // Compute longest-path column rank with cycle guard
  const rank = new Map<string, number>();
  const visiting = new Set<string>();

  function getRank(id: string): number {
    if (rank.has(id)) return rank.get(id)!;
    if (visiting.has(id)) return 0; // cycle breaker
    visiting.add(id);
    const parents = incoming.get(id) || [];
    let r = 0;
    for (const p of parents) {
      r = Math.max(r, getRank(p) + 1);
    }
    visiting.delete(id);
    rank.set(id, r);
    return r;
  }

  nodes.forEach((n) => getRank(n.id));

  // Group nodes by column rank
  const columns = new Map<number, FlowNode[]>();
  nodes.forEach((n) => {
    const c = rank.get(n.id) ?? 0;
    if (!columns.has(c)) columns.set(c, []);
    columns.get(c)!.push(n);
  });

  const sortedColIndices = Array.from(columns.keys()).sort((a, b) => a - b);
  const totalCols = sortedColIndices.length;
  const maxNodesInAnyCol = Math.max(
    1,
    ...Array.from(columns.values()).map((arr) => arr.length)
  );

  // Measure/estimate dimensions for every node
  const dims = new Map<string, { w: number; h: number }>();
  nodes.forEach((n) => {
    dims.set(n.id, estimateNodeDimensions(n, measuredSizes?.[n.id]));
  });

  const HORIZONTAL_GAP = 88; // Clean spacing between adjacent columns
  const VERTICAL_GAP = 48; // Clean vertical spacing between parallel nodes
  const BAND_VERTICAL_GAP = 72; // Clean vertical channel between wrapped rows
  const START_X = 44;
  const START_Y = 44;

  const yPosMap = new Map<string, number>();
  const xPosMap = new Map<string, number>();

  // If the flowchart has > 3 sequential columns and at most 2 parallel nodes per column,
  // use a Serpentine (Snake) 3-column grid so adjacent steps connect directly (Right->Right drop or Left->Left drop)
  // with ZERO long diagonal return wires cutting across the canvas!
  const shouldWrapBands = totalCols > 3 && maxNodesInAnyCol <= 2;
  const COLS_PER_BAND = 3;

  if (shouldWrapBands) {
    const totalBands = Math.ceil(totalCols / COLS_PER_BAND);

    // 1. Compute uniform slot widths (Slot 0 = Left, Slot 1 = Center, Slot 2 = Right)
    const slotWidths = [235, 235, 235];
    for (let band = 0; band < totalBands; band++) {
      const bandCols = sortedColIndices.slice(
        band * COLS_PER_BAND,
        (band + 1) * COLS_PER_BAND
      );
      const isReversedRow = band % 2 === 1;
      bandCols.forEach((colIdx, idxInBand) => {
        const slot = isReversedRow ? COLS_PER_BAND - 1 - idxInBand : idxInBand;
        const colNodes = columns.get(colIdx)!;
        for (const node of colNodes) {
          const d = dims.get(node.id)!;
          slotWidths[slot] = Math.max(slotWidths[slot], d.w);
        }
      });
    }

    const slotStartX = [
      START_X,
      START_X + slotWidths[0] + HORIZONTAL_GAP,
      START_X + slotWidths[0] + HORIZONTAL_GAP + slotWidths[1] + HORIZONTAL_GAP,
    ];

    // 2. Place nodes band by band, vertically centered within each band and horizontally centered within each slot
    let bandStartY = START_Y;

    for (let band = 0; band < totalBands; band++) {
      const bandCols = sortedColIndices.slice(
        band * COLS_PER_BAND,
        (band + 1) * COLS_PER_BAND
      );
      const isReversedRow = band % 2 === 1;

      // Compute height of each column in this band to find maxBandHeight
      let maxBandHeight = 76;
      const colHeightsInBand = new Map<number, number>();

      for (const colIdx of bandCols) {
        const colNodes = columns.get(colIdx)!;
        let colH = 0;
        colNodes.forEach((n, idx) => {
          const d = dims.get(n.id)!;
          colH += d.h + (idx > 0 ? VERTICAL_GAP : 0);
        });
        colHeightsInBand.set(colIdx, colH);
        maxBandHeight = Math.max(maxBandHeight, colH);
      }

      const bandCenterY = bandStartY + Math.round(maxBandHeight / 2);

      bandCols.forEach((colIdx, idxInBand) => {
        const slot = isReversedRow ? COLS_PER_BAND - 1 - idxInBand : idxInBand;
        const colNodes = columns.get(colIdx)!;
        const colH = colHeightsInBand.get(colIdx) || 76;
        let cursorY = Math.round(bandCenterY - colH / 2);

        for (const node of colNodes) {
          const d = dims.get(node.id)!;
          const centeredX =
            slotStartX[slot] + Math.round((slotWidths[slot] - d.w) / 2);
          xPosMap.set(node.id, centeredX);
          yPosMap.set(node.id, cursorY);
          cursorY += d.h + VERTICAL_GAP;
        }
      });

      bandStartY += maxBandHeight + BAND_VERTICAL_GAP;
    }
  } else {
    // Standard multi-column DAG layout with true width-aware column spacing
    let cursorX = START_X;

    // First pass: sort nodes in each column by parent barycenter and compute column heights
    const colHeights = new Map<number, number>();
    const colWidths = new Map<number, number>();

    sortedColIndices.forEach((colIdx) => {
      const colNodes = columns.get(colIdx)!;
      let hSum = 0;
      let wMax = 220;
      colNodes.forEach((n, idx) => {
        const d = dims.get(n.id)!;
        hSum += d.h + (idx > 0 ? VERTICAL_GAP : 0);
        wMax = Math.max(wMax, d.w);
      });
      colHeights.set(colIdx, hSum);
      colWidths.set(colIdx, wMax);
    });

    const tallestColHeight = Math.max(220, ...Array.from(colHeights.values()));
    const centerY = Math.round(START_Y + tallestColHeight / 2);

    sortedColIndices.forEach((colIdx) => {
      const colNodes = columns.get(colIdx)!;
      const colW = colWidths.get(colIdx) || 240;

      if (colIdx > 0) {
        colNodes.sort((a, b) => {
          const aParents = incoming.get(a.id) || [];
          const bParents = incoming.get(b.id) || [];
          const aAvg =
            aParents.length > 0
              ? aParents.reduce(
                  (sum, p) => sum + (yPosMap.get(p) ?? centerY),
                  0
                ) / aParents.length
              : centerY;
          const bAvg =
            bParents.length > 0
              ? bParents.reduce(
                  (sum, p) => sum + (yPosMap.get(p) ?? centerY),
                  0
                ) / bParents.length
              : centerY;
          return aAvg - bAvg;
        });
      }

      const colH = colHeights.get(colIdx) || 80;
      let cursorY = Math.max(START_Y, Math.round(centerY - colH / 2));

      colNodes.forEach((node) => {
        const d = dims.get(node.id)!;
        const centeredX = cursorX + Math.round((colW - d.w) / 2);
        xPosMap.set(node.id, centeredX);
        yPosMap.set(node.id, cursorY);
        cursorY += d.h + VERTICAL_GAP;
      });

      cursorX += colW + HORIZONTAL_GAP;
    });
  }

  return nodes.map((n) => ({
    ...n,
    x: xPosMap.get(n.id) ?? n.x,
    y: yPosMap.get(n.id) ?? n.y,
  }));
}

/**
 * Parse ChronoFlow DSL or Mermaid flowchart code into a structured FlowProject graph
 */
export function parseFlowCode(
  rawInput: string,
  fallbackName = 'Project Plan',
  fallbackCategory: BlockCategory = 'deep-work'
): {
  name: string;
  category: BlockCategory;
  nodes: FlowNode[];
  edges: FlowEdge[];
} {
  // Strip optional markdown code fences (```chronoflow, ```mermaid, ```text, etc.)
  const cleanedInput = rawInput
    .replace(/^```[a-zA-Z0-9_-]*\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  const lines = cleanedInput.split(/\r?\n/);

  let projectName = fallbackName;
  let projectCategory: BlockCategory = fallbackCategory;

  const nodesMap = new Map<string, FlowNode>();
  const edgesList: FlowEdge[] = [];
  let currentNodeId: string | null = null;

  const ensureNode = (
    id: string,
    title?: string,
    category?: BlockCategory,
    estimatedMinutes?: number,
    status?: FlowNodeStatus
  ): FlowNode => {
    const cleanId = id.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    const existing = nodesMap.get(cleanId);
    if (existing) {
      if (title && existing.title === existing.id) {
        existing.title = title;
      }
      if (category) existing.category = category;
      if (estimatedMinutes !== undefined) {
        existing.estimatedMinutes = estimatedMinutes;
      }
      if (status) existing.status = status;
      return existing;
    }
    const created: FlowNode = {
      id: cleanId,
      title: (title || id).trim(),
      category: category || projectCategory,
      estimatedMinutes,
      status: status || 'todo',
      x: 60,
      y: 120,
      subtasks: [],
    };
    nodesMap.set(cleanId, created);
    return created;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('//') || line.startsWith('%%')) {
      continue;
    }

    // Ignore Mermaid header line: flowchart LR / graph TD
    if (/^(flowchart|graph)\s+(LR|TD|TB|RL|BT)\b/i.test(line)) {
      continue;
    }

    // 1. Project Header: project "Name" #deep-work
    const projMatch = line.match(
      /^project\s+(?:"([^"]+)"|'([^']+)'|([^\s#]+))(?:\s+(#[a-zA-Z-]+))?/i
    );
    if (projMatch) {
      projectName = (projMatch[1] || projMatch[2] || projMatch[3] || fallbackName).trim();
      if (projMatch[4]) {
        const cat = parseCategoryTag(projMatch[4]);
        if (cat) projectCategory = cat;
      }
      continue;
    }

    // 2. Subtask line under current node: - Subtask OR - x Subtask OR - [x] Subtask
    if (currentNodeId && /^[-*]\s+/.test(line)) {
      const body = line.replace(/^[-*]\s+/, '').trim();
      let completed = false;
      let subtaskTitle = body;

      if (/^(\[x\]|x\s+)/i.test(body)) {
        completed = true;
        subtaskTitle = body.replace(/^(\[x\]|x)\s*/i, '').trim();
      } else if (/^\[\s?\]\s+/.test(body)) {
        completed = false;
        subtaskTitle = body.replace(/^\[\s?\]\s+/, '').trim();
      }

      const node = nodesMap.get(currentNodeId);
      if (node && subtaskTitle) {
        node.subtasks.push({
          id: `st-${node.id}-${node.subtasks.length + 1}`,
          title: subtaskTitle,
          completed,
        });
      }
      continue;
    }

    // 3. Note line under current node: > Note text
    if (currentNodeId && /^>\s+/.test(line)) {
      const noteText = line.replace(/^>\s+/, '').trim();
      const node = nodesMap.get(currentNodeId);
      if (node && noteText) {
        node.notes = node.notes ? `${node.notes}\n${noteText}` : noteText;
      }
      continue;
    }

    // 4. Edge / Connection line (ChronoFlow or Mermaid):
    // Supports: a --> b, a -> b, A["Title A"] --> B["Title B"], a --> b --> c
    if (line.includes('-->') || line.includes('->')) {
      currentNodeId = null;
      const segments = line.split(/\s*--?>\s*/);
      if (segments.length >= 2) {
        const parsedSegmentIds: string[] = [];

        for (const seg of segments) {
          const s = seg.trim();
          if (!s) continue;
          // Match Mermaid node inline e.g. A["Title"] or [id] "Title" or plain id
          const mermaidInline = s.match(
            /^([a-zA-Z0-9_-]+)\s*(?:\["([^"]+)"\]|\["?([^"\]]+)"?\]|\("?([^"\)]+)"?\))/
          );
          if (mermaidInline) {
            const id = mermaidInline[1];
            const label =
              mermaidInline[2] || mermaidInline[3] || mermaidInline[4] || id;
            const node = ensureNode(id, label);
            parsedSegmentIds.push(node.id);
          } else {
            const bracketInline = s.match(/^\[([a-zA-Z0-9_-]+)\](?:\s+"([^"]+)")?/);
            if (bracketInline) {
              const node = ensureNode(bracketInline[1], bracketInline[2]);
              parsedSegmentIds.push(node.id);
            } else {
              const simpleId = s.replace(/[^a-zA-Z0-9_-]/g, '');
              if (simpleId) {
                const node = ensureNode(simpleId);
                parsedSegmentIds.push(node.id);
              }
            }
          }
        }

        for (let i = 0; i < parsedSegmentIds.length - 1; i++) {
          const src = parsedSegmentIds[i];
          const tgt = parsedSegmentIds[i + 1];
          if (src && tgt && src !== tgt) {
            const edgeId = `e-${src}-${tgt}`;
            if (!edgesList.some((e) => e.source === src && e.target === tgt)) {
              edgesList.push({ id: edgeId, source: src, target: tgt });
            }
          }
        }
        continue;
      }
    }

    // 5. ChronoFlow Node Definition:
    // [id] "Title" (60m, #deep-work, done)
    // OR [id] "Title"
    // OR [id] Title
    const nodeMatch = line.match(
      /^\[([a-zA-Z0-9_-]+)\]\s*(?:"([^"]+)"|'([^']+)'|([^()\n]+?))?(?:\s*\(([^)]*)\))?\s*$/
    );
    if (nodeMatch) {
      const id = nodeMatch[1].trim();
      const rawTitle = (
        nodeMatch[2] ||
        nodeMatch[3] ||
        nodeMatch[4] ||
        id
      ).trim();
      const metaRaw = nodeMatch[5] || '';

      let estMinutes: number | undefined;
      let category: BlockCategory | undefined;
      let status: FlowNodeStatus | undefined;

      if (metaRaw) {
        const parts = metaRaw.split(',').map((p) => p.trim()).filter(Boolean);
        for (const part of parts) {
          const dur = parseDurationTag(part);
          if (dur !== undefined) {
            estMinutes = dur;
            continue;
          }
          if (part.startsWith('#') || parseCategoryTag(part)) {
            const cat = parseCategoryTag(part);
            if (cat) {
              category = cat;
              continue;
            }
          }
          const st = parseStatusTag(part);
          if (st) {
            status = st;
          }
        }
      }

      const node = ensureNode(id, rawTitle, category, estMinutes, status);
      currentNodeId = node.id;
      continue;
    }

    // 6. Standalone Mermaid Node Definition: id["Title"]
    const mermaidStandalone = line.match(
      /^([a-zA-Z0-9_-]+)\s*(?:\["([^"]+)"\]|\["?([^"\]]+)"?\]|\("?([^"\)]+)"?\))\s*$/
    );
    if (mermaidStandalone) {
      const id = mermaidStandalone[1];
      const title =
        mermaidStandalone[2] ||
        mermaidStandalone[3] ||
        mermaidStandalone[4] ||
        id;
      const node = ensureNode(id, title);
      currentNodeId = node.id;
      continue;
    }
  }

  // Auto-mark nodes as done if all subtasks are completed and status wasn't explicitly set
  const rawNodes = Array.from(nodesMap.values()).map((n) => {
    if (
      n.subtasks.length > 0 &&
      n.subtasks.every((s) => s.completed) &&
      n.status === 'todo'
    ) {
      return { ...n, status: 'done' as FlowNodeStatus };
    }
    return n;
  });

  const laidOutNodes = autoLayoutFlowGraph(rawNodes, edgesList);

  return {
    name: projectName,
    category: projectCategory,
    nodes: laidOutNodes,
    edges: edgesList,
  };
}

/**
 * Serialize a FlowProject back into human-readable ChronoFlow code (two-way sync)
 */
export function serializeFlowToCode(project: FlowProject): string {
  const lines: string[] = [];
  lines.push(`project "${project.name}" #${project.category}`);
  lines.push('');

  for (const node of project.nodes) {
    const metaParts: string[] = [];
    if (node.estimatedMinutes && node.estimatedMinutes > 0) {
      metaParts.push(`${node.estimatedMinutes}m`);
    }
    if (node.category && node.category !== project.category) {
      metaParts.push(`#${node.category}`);
    }
    if (node.status === 'done') {
      metaParts.push('done');
    } else if (node.status === 'in-progress') {
      metaParts.push('doing');
    }

    const metaSuffix = metaParts.length > 0 ? ` (${metaParts.join(', ')})` : '';
    lines.push(`[${node.id}] "${node.title}"${metaSuffix}`);

    if (node.notes && node.notes.trim()) {
      for (const noteLine of node.notes.split(/\r?\n/)) {
        if (noteLine.trim()) {
          lines.push(`  > ${noteLine.trim()}`);
        }
      }
    }

    for (const st of node.subtasks) {
      lines.push(`  - ${st.completed ? 'x ' : ''}${st.title}`);
    }

    lines.push('');
  }

  if (project.edges.length > 0) {
    for (const edge of project.edges) {
      lines.push(`${edge.source} --> ${edge.target}`);
    }
  }

  return lines.join('\n').trim();
}

export interface FlowProjectProgressSummary {
  percent: number;
  doneNodes: number;
  doingNodes: number;
  totalNodes: number;
  doneSubtasks: number;
  totalSubtasks: number;
  totalEstimatedMinutes: number;
  remainingEstimatedMinutes: number;
  unlockedNodeIds: Set<string>;
}

/**
 * Compute real-time project progress metrics (purely from Node & Subtask completion, with optional time stats)
 */
export function computeFlowProjectProgress(
  project: FlowProject
): FlowProjectProgressSummary {
  const totalNodes = project.nodes.length;
  let doneNodes = 0;
  let doingNodes = 0;
  let doneSubtasks = 0;
  let totalSubtasks = 0;
  let totalEstimatedMinutes = 0;
  let remainingEstimatedMinutes = 0;
  let weightedNodeCompletionSum = 0;

  const nodeById = new Map<string, FlowNode>();
  project.nodes.forEach((n) => nodeById.set(n.id, n));

  for (const node of project.nodes) {
    const nSub = node.subtasks.length;
    const nSubDone = node.subtasks.filter((s) => s.completed).length;
    totalSubtasks += nSub;
    doneSubtasks += nSubDone;

    if (node.estimatedMinutes && node.estimatedMinutes > 0) {
      totalEstimatedMinutes += node.estimatedMinutes;
      if (node.status !== 'done') {
        remainingEstimatedMinutes += node.estimatedMinutes;
      }
    }

    if (node.status === 'done') {
      doneNodes += 1;
      weightedNodeCompletionSum += 1;
    } else {
      if (node.status === 'in-progress') {
        doingNodes += 1;
      }
      if (nSub > 0) {
        weightedNodeCompletionSum += (nSubDone / nSub) * 0.85;
      } else if (node.status === 'in-progress') {
        weightedNodeCompletionSum += 0.35;
      }
    }
  }

  const percent =
    totalNodes > 0
      ? Math.min(100, Math.round((weightedNodeCompletionSum / totalNodes) * 100))
      : 0;

  // Determine which nodes are "Next Up" (not done, and all upstream dependencies are done)
  const unlockedNodeIds = new Set<string>();
  for (const node of project.nodes) {
    if (node.status === 'done') continue;
    const incomingSources = project.edges
      .filter((e) => e.target === node.id)
      .map((e) => nodeById.get(e.source))
      .filter(Boolean) as FlowNode[];

    const allParentsDone = incomingSources.every((p) => p.status === 'done');
    if (allParentsDone) {
      unlockedNodeIds.add(node.id);
    }
  }

  return {
    percent,
    doneNodes,
    doingNodes,
    totalNodes,
    doneSubtasks,
    totalSubtasks,
    totalEstimatedMinutes,
    remainingEstimatedMinutes,
    unlockedNodeIds,
  };
}

/**
 * Ready-to-copy prompt for ChatGPT, Claude, or Gemini so users can turn any project plan into a ChronoFlow graph
 */
export function getAiPromptTemplate(): string {
  return `Convert my project plan into a concise ChronoFlow code block for my flowchart planner.

Strict formatting rules:
1. Start with: project "Short Project Name" #deep-work
2. Keep every step title SHORT (2 to 5 words max) and subtasks concise (3 to 7 words max). Do NOT add long subtext or descriptions.
3. Define each step as:
   [short_id] "Short Title"
   - Subtask 1
   - Subtask 2
   (Use "- x Subtask" if already completed. You may optionally add (done) or (doing) or (#creative) after "Short Title", or omit them.)
4. Connect steps at the bottom using:
   first_id --> next_id

Example output:
\`\`\`chronoflow
project "SaaS MVP Launch" #deep-work

[auth] "Auth & Schema" (done)
  - x Design user tables
  - x Configure auth provider

[api] "Core API" (doing)
  - Build CRUD endpoints
  - Add input validation

[ui] "Dashboard UI" (#creative)
  - Build main layout
  - Connect state sync

[launch] "QA & Release"
  - Smoke test build
  - Publish installer

auth --> api
auth --> ui
api --> launch
ui --> launch
\`\`\`

Here is my project plan to convert:
[PASTE YOUR PROJECT PLAN HERE]`;
}
