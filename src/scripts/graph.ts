// graph.ts — Cytoscape-based force-directed graph for the landing page.
// Teenage Engineering register: dark default, bright orange accent, generous spacing.
// fcose layout is used so the six clusters actually fan out around the center.

import cytoscape from 'cytoscape';
// @ts-ignore — no types shipped
import fcose from 'cytoscape-fcose';
import type { Core, ElementDefinition } from 'cytoscape';
import {
  CAPABILITIES,
  CENTER,
  CENTER_ID,
  EDGE_SEEDS,
  type Capability,
} from '../data/capabilities';

// Register fcose once.
let fcoseRegistered = false;
function ensureFcose() {
  if (fcoseRegistered) return;
  try {
    cytoscape.use(fcose);
    fcoseRegistered = true;
  } catch (e) {
    // already registered — ignore
    fcoseRegistered = true;
  }
}

type ThemeName = 'light' | 'dark';

function readTheme(): ThemeName {
  return (document.documentElement.getAttribute('data-theme') as ThemeName) || 'dark';
}

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function dedupeEdges(seeds: { from: string; to: string }[]) {
  const seen = new Set<string>();
  const out: ElementDefinition[] = [];
  for (const s of seeds) {
    const key = [s.from, s.to].sort().join('::');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ data: { id: `e-${key}`, source: s.from, target: s.to, kind: 'reinforce' } });
  }
  return out;
}

// Deterministic hexagonal seed positions for the six capability nodes.
// The order matches CAPABILITIES (01..06): technical, soft-power, ai, infrastructure, design, aesthetic.
// Starting at -90° (top) and stepping clockwise gives a stable, canonical fan-out
// that fcose refines (randomize:false) without re-rolling per refresh.
const SEED_RADIUS = 320;
function seedPositionFor(capId: string): { x: number; y: number } | null {
  const ix = CAPABILITIES.findIndex((c) => c.id === capId);
  if (ix < 0) return null;
  const angle = (-Math.PI / 2) + (ix * (2 * Math.PI) / CAPABILITIES.length);
  return {
    x: Math.cos(angle) * SEED_RADIUS,
    y: Math.sin(angle) * SEED_RADIUS,
  };
}

function buildElements(): ElementDefinition[] {
  const nodes: ElementDefinition[] = [
    {
      data: { id: CENTER.id, label: CENTER.label.toLowerCase(), kind: 'center' },
      position: { x: 0, y: 0 },
    },
    ...CAPABILITIES.map<ElementDefinition>((c) => {
      const pos = seedPositionFor(c.id);
      const node: ElementDefinition = {
        data: {
          id: c.id,
          label: `${c.number}  ${c.label.toLowerCase()}`,
          kind: 'capability',
          number: c.number,
        },
      };
      if (pos) node.position = pos;
      return node;
    }),
  ];
  // Spoke edges from center to each capability.
  const spokes: ElementDefinition[] = CAPABILITIES.map((c) => ({
    data: { id: `s-${c.id}`, source: CENTER_ID, target: c.id, kind: 'spoke' },
  }));
  // Reinforcement edges between capabilities.
  const reinforcements = dedupeEdges(EDGE_SEEDS);
  return [...nodes, ...spokes, ...reinforcements];
}

function styleFor(_theme: ThemeName): cytoscape.Stylesheet[] {
  const ink = cssVar('--ink');
  const ink2 = cssVar('--ink-2');
  const ink3 = cssVar('--ink-3');
  const paper = cssVar('--paper');
  const accent = cssVar('--accent');
  const edge = cssVar('--edge');
  const edgeActive = cssVar('--edge-active');
  const node = cssVar('--node');

  return [
    // ---- Capability nodes: filled circles, larger, label below ----
    {
      selector: 'node[kind = "capability"]',
      style: {
        'background-color': node,
        'border-color': node,
        'border-width': 0,
        width: 28,
        height: 28,
        label: 'data(label)',
        'font-family': 'Inter, Helvetica Neue, Helvetica, Arial, sans-serif',
        'font-size': 13,
        'font-weight': 500,
        color: ink2,
        'text-margin-y': 14,
        'text-valign': 'bottom',
        'text-halign': 'center',
        'text-background-color': paper,
        'text-background-opacity': 0.92,
        'text-background-padding': '6px',
        'text-background-shape': 'roundrectangle',
        'transition-property': 'background-color, border-color, width, height, color',
        'transition-duration': 200,
      },
    },
    {
      selector: 'node[kind = "capability"]:active, node[kind = "capability"].hover',
      style: {
        'background-color': accent,
        'border-color': accent,
        width: 36,
        height: 36,
        color: accent,
      },
    },
    {
      selector: 'node[kind = "capability"].selected',
      style: {
        'background-color': accent,
        'border-color': accent,
        width: 40,
        height: 40,
        color: accent,
      },
    },

    // ---- Center node: smaller filled, with subtle accent ring on hover ----
    {
      selector: 'node[kind = "center"]',
      style: {
        'background-color': accent,
        'border-color': accent,
        'border-width': 0,
        width: 14,
        height: 14,
        label: 'data(label)',
        'font-family': 'JetBrains Mono, IBM Plex Mono, monospace',
        'font-size': 11,
        'font-weight': 500,
        'letter-spacing': 1,
        color: ink,
        'text-margin-y': 14,
        'text-valign': 'bottom',
        'text-halign': 'center',
        'text-background-color': paper,
        'text-background-opacity': 0.92,
        'text-background-padding': '6px',
      },
    },
    {
      selector: 'node[kind = "center"].hover, node[kind = "center"]:active',
      style: {
        width: 20,
        height: 20,
      },
    },

    // ---- Edges ----
    {
      selector: 'edge',
      style: {
        width: 1.5,
        'line-color': edge,
        'curve-style': 'straight',
        opacity: 1,
        'transition-property': 'line-color, width, opacity',
        'transition-duration': 200,
      },
    },
    {
      selector: 'edge[kind = "spoke"]',
      style: {
        'line-style': 'dashed',
        'line-dash-pattern': [4, 6],
        opacity: 0.7,
        width: 1.2,
      },
    },
    {
      selector: 'edge.active',
      style: {
        'line-color': edgeActive,
        width: 2.2,
        opacity: 1,
        'line-style': 'solid',
      },
    },

    {
      selector: 'core',
      style: {
        'active-bg-color': accent,
        'active-bg-opacity': 0.08,
      } as any,
    },

    // Faded state
    {
      selector: 'node.faded',
      style: {
        opacity: 0.25,
      },
    },
    {
      selector: 'edge.faded',
      style: {
        opacity: 0.12,
      },
    },
  ];
}

interface BootOptions {
  containerId: string;
  panel: PanelController;
}

export interface PanelController {
  open(capability: Capability): void;
  close(): void;
  navigateCenter(): void;
}

export function bootGraph(opts: BootOptions): Core | null {
  ensureFcose();
  const container = document.getElementById(opts.containerId);
  if (!container) return null;

  const cy = cytoscape({
    container,
    elements: buildElements(),
    style: styleFor(readTheme()),
    minZoom: 0.5,
    maxZoom: 2.4,
    wheelSensitivity: 0.18,
    autoungrabify: false,
    layout: {
      name: 'fcose',
      animate: true,
      animationDuration: 600,
      animationEasing: 'ease-out',
      randomize: false,
      quality: 'proof',
      // Refinement-only: small step counts so fcose nudges from the hex seed
      // rather than re-rolling the layout.
      idealEdgeLength: 260,
      nodeRepulsion: 4_500_000,
      edgeElasticity: 0.25,
      gravity: 0.25,
      gravityRange: 2.0,
      gravityCompound: 1.0,
      numIter: 400,
      tile: false,
      uniformNodeDimensions: true,
      nodeSeparation: 160,
      packComponents: false,
      fit: true,
      padding: 80,
    } as any,
  });

  // Anchor the center node near the middle. After initial layout, lock it.
  cy.ready(() => {
    setTimeout(() => {
      const center = cy.getElementById(CENTER_ID);
      if (center) {
        const ext = cy.extent();
        const cx = (ext.x1 + ext.x2) / 2;
        const cy2 = (ext.y1 + ext.y2) / 2;
        center.position({ x: cx, y: cy2 });
        center.lock();
        cy.fit(cy.elements(), 120);
      }
    }, 950);
  });

  // Hover effects — capability node hovered: highlight it + light up all connected edges
  cy.on('mouseover', 'node[kind = "capability"]', (e) => {
    e.target.addClass('hover');
    e.target.connectedEdges().addClass('active');
    document.body.style.cursor = 'pointer';
  });
  cy.on('mouseout', 'node[kind = "capability"]', (e) => {
    e.target.removeClass('hover');
    // Only clear active edges if no node is currently selected
    if (cy.nodes('.selected').length === 0) {
      e.target.connectedEdges().removeClass('active');
    } else {
      // Restore the selected node's active edges
      const sel = cy.nodes('.selected');
      cy.edges().removeClass('active');
      sel.connectedEdges().addClass('active');
    }
    document.body.style.cursor = '';
  });
  cy.on('mouseover', 'node[kind = "center"]', (e) => {
    e.target.addClass('hover');
    document.body.style.cursor = 'pointer';
  });
  cy.on('mouseout', 'node[kind = "center"]', (e) => {
    e.target.removeClass('hover');
    document.body.style.cursor = '';
  });

  // Click: capability nodes open the panel; center node navigates to /about.
  cy.on('tap', 'node[kind = "capability"]', (e) => {
    const id = e.target.id();
    const cap = CAPABILITIES.find((c) => c.id === id);
    if (!cap) return;

    cy.elements().removeClass('selected faded');
    cy.edges().removeClass('active');
    cy.elements().addClass('faded');

    e.target.removeClass('faded').addClass('selected');
    e.target.connectedEdges().removeClass('faded').addClass('active');
    e.target.neighborhood().removeClass('faded');

    opts.panel.open(cap);
  });

  cy.on('tap', 'node[kind = "center"]', () => {
    opts.panel.navigateCenter();
  });

  // Tap on background clears selection.
  cy.on('tap', (e) => {
    if (e.target === cy) {
      cy.elements().removeClass('selected faded');
      cy.edges().removeClass('active');
      opts.panel.close();
    }
  });

  // Theme switch — re-apply stylesheet so colours update without re-layout.
  document.addEventListener('cy:theme', () => {
    cy.style(styleFor(readTheme()));
  });

  // Resize handling
  window.addEventListener('resize', () => {
    cy.resize();
  });

  return cy;
}
