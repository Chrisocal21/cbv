'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface NodeDef {
  id: string
  x: number
  y: number
  label: string
  sublabel: string
  persona?: string
  model?: string
  icon: 'prompt' | 'chef' | 'review' | 'synth' | 'fix' | 'story' | 'save'
  conditional?: boolean
  parallel?: boolean
  detail: string
}

interface EdgeDef {
  from: string
  to: string
  label?: string
  dashed?: boolean
  fork?: boolean
  join?: boolean
}

// ─── Persona colours ──────────────────────────────────────────────────────────

const PERSONA_STYLE: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  marco:   { bg: 'rgba(245,158,11,0.12)',  text: '#f59e0b', border: 'rgba(245,158,11,0.35)', dot: '#f59e0b' },
  celeste: { bg: 'rgba(244,63,94,0.12)',   text: '#fb7185', border: 'rgba(244,63,94,0.35)',  dot: '#fb7185' },
  nadia:   { bg: 'rgba(139,92,246,0.12)',  text: '#a78bfa', border: 'rgba(139,92,246,0.35)', dot: '#a78bfa' },
  theo:    { bg: 'rgba(14,165,233,0.12)',  text: '#38bdf8', border: 'rgba(14,165,233,0.35)', dot: '#38bdf8' },
  soren:   { bg: 'rgba(16,185,129,0.12)',  text: '#34d399', border: 'rgba(16,185,129,0.35)', dot: '#34d399' },
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function NodeIcon({ type, size = 20 }: { type: NodeDef['icon']; size?: number }) {
  const s = size
  const sw = 1.7
  switch (type) {
    case 'prompt': return (
      <svg width={s} height={s} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={sw}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
      </svg>
    )
    case 'chef': return (
      <svg width={s} height={s} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={sw}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.047 8.287 8.287 0 009 9.601a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
      </svg>
    )
    case 'review': return (
      <svg width={s} height={s} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={sw}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
    case 'synth': return (
      <svg width={s} height={s} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={sw}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    )
    case 'fix': return (
      <svg width={s} height={s} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={sw}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
      </svg>
    )
    case 'story': return (
      <svg width={s} height={s} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={sw}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    )
    case 'save': return (
      <svg width={s} height={s} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={sw}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 2.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125m16.5 2.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
      </svg>
    )
    default: return null
  }
}

// ─── Pipeline data ────────────────────────────────────────────────────────────

const NODE_W = 130
const NODE_H = 90

const INITIAL_NODES: NodeDef[] = [
  {
    id: 'prompt', x: 40, y: 200,
    label: 'Prompt', sublabel: 'Admin input',
    icon: 'prompt',
    detail: "You type a prompt and pick a staff persona. That's the only manual step — everything after is automated.",
  },
  {
    id: 'generate', x: 240, y: 200,
    label: 'Generate draft', sublabel: 'Chef persona',
    persona: 'marco', model: 'gpt-4o · 0.8',
    icon: 'chef',
    detail: 'The selected chef persona generates a complete recipe JSON: title, subtitle, description, ingredients, steps, nutrition, timing, mood tags, and gradient. Celeste uses a baking-specific skill; Soren uses a street-food skill; everyone else uses the standard generate skill.',
  },
  {
    id: 'review-technique', x: 500, y: 52,
    label: 'Technique', sublabel: 'Marco reviews',
    persona: 'marco', model: 'gpt-4o-mini · 0.3',
    icon: 'review', parallel: true,
    detail: 'Checks heat levels, vessel compatibility, timing accuracy, doneness cues, rest steps, and ingredient ratios. Returns verdict (pass / flag / reject) + specific issues.',
  },
  {
    id: 'review-flavour', x: 500, y: 162,
    label: 'Flavour', sublabel: 'Celeste reviews',
    persona: 'celeste', model: 'gpt-4o-mini · 0.3',
    icon: 'review', parallel: true,
    detail: "Checks seasoning balance, acid/fat/sweet harmony, ingredient affinities, and whether the description's flavour promises match what the technique actually produces.",
  },
  {
    id: 'review-homecook', x: 500, y: 272,
    label: 'Home cook', sublabel: 'Nadia reviews',
    persona: 'nadia', model: 'gpt-4o-mini · 0.3',
    icon: 'review', parallel: true,
    detail: 'Checks ingredient accessibility, equipment assumptions, clarity for non-professional cooks, and whether substitutions are offered where specialist items appear.',
  },
  {
    id: 'review-qa', x: 500, y: 382,
    label: 'QA / Sanity', sublabel: 'Nadia reviews',
    persona: 'nadia', model: 'gpt-4o-mini · 0.3',
    icon: 'review', parallel: true,
    detail: "Sanity checks time totals, verifies description vs actual result, and flags specific fixable issues as a numbered list. The 'does what it says on the tin' check.",
  },
  {
    id: 'synthesis', x: 710, y: 200,
    label: 'Synthesis', sublabel: 'Theo decides',
    persona: 'theo', model: 'gpt-4o-mini · 0.2',
    icon: 'synth',
    detail: 'Theo reads all four judge verdicts and issues one recommendation: approve / revise / reject. Also produces a confidence score (0–100) and a plain-language summary of key issues.',
  },
  {
    id: 'revise', x: 910, y: 200,
    label: 'Auto-revision', sublabel: 'If revise',
    persona: 'marco', model: 'gpt-4o · 0.4',
    icon: 'fix', conditional: true,
    detail: 'Only runs if Theo recommends revise. All flagged issues from all four judges are consolidated and sent back to the chef persona to fix in one pass. Non-fatal — if it fails, the original draft proceeds.',
  },
  {
    id: 'origin', x: 1110, y: 200,
    label: 'Origin story', sublabel: 'If missing',
    persona: 'theo', model: 'gpt-4o · 0.7',
    icon: 'story', conditional: true,
    detail: "Theo writes a 2–3 sentence cultural context note if generation didn't produce one (or produced under 60 characters). Non-fatal — skipped silently if it fails.",
  },
  {
    id: 'save', x: 1310, y: 200,
    label: 'Save to DB', sublabel: 'pending_review',
    icon: 'save',
    detail: 'The final recipe is written to the database with status pending_review. A submission record is created with all four verdicts, confidence score, and synthesis notes. Staff activity is logged.',
  },
]

const EDGES: EdgeDef[] = [
  { from: 'prompt',           to: 'generate' },
  { from: 'generate',         to: 'review-technique', fork: true,  label: 'Court review' },
  { from: 'generate',         to: 'review-flavour',   fork: true },
  { from: 'generate',         to: 'review-homecook',  fork: true },
  { from: 'generate',         to: 'review-qa',        fork: true },
  { from: 'review-technique', to: 'synthesis',        join: true },
  { from: 'review-flavour',   to: 'synthesis',        join: true },
  { from: 'review-homecook',  to: 'synthesis',        join: true },
  { from: 'review-qa',        to: 'synthesis',        join: true },
  { from: 'synthesis',        to: 'revise',           dashed: true, label: 'if revise' },
  { from: 'revise',           to: 'origin',           dashed: true },
  { from: 'synthesis',        to: 'origin',           dashed: true, label: 'if approve' },
  { from: 'origin',           to: 'save' },
]

const PARALLEL_IDS = ['review-technique', 'review-flavour', 'review-homecook', 'review-qa']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nodeCentre(node: NodeDef) {
  return { x: node.x + NODE_W / 2, y: node.y + NODE_H / 2 }
}

function bezierPath(x1: number, y1: number, x2: number, y2: number) {
  const cx = (x1 + x2) / 2
  return `M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2}`
}

function edgePath(nodes: NodeDef[], edge: EdgeDef): string {
  const fromNode = nodes.find((n) => n.id === edge.from)
  const toNode   = nodes.find((n) => n.id === edge.to)
  if (!fromNode || !toNode) return ''
  const x1 = fromNode.x + NODE_W
  const y1 = nodeCentre(fromNode).y
  const x2 = toNode.x
  const y2 = nodeCentre(toNode).y
  return bezierPath(x1, y1, x2, y2)
}

// ─── Animated dot ─────────────────────────────────────────────────────────────

function AnimatedDot({ pathId, color, delay }: { pathId: string; color: string; delay: number }) {
  return (
    <circle r="3.5" fill={color} opacity="0.9">
      <animateMotion dur="2.6s" repeatCount="indefinite" begin={`${delay}s`}>
        <mpath href={`#${pathId}`} />
      </animateMotion>
    </circle>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function PipelineViewer() {
  const [nodes, setNodes] = useState<NodeDef[]>(INITIAL_NODES)
  const [selected, setSelected] = useState<string | null>(null)
  const [dragging, setDragging] = useState<{ id: string; ox: number; oy: number } | null>(null)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [panning, setPanning] = useState<{ sx: number; sy: number; px: number; py: number } | null>(null)
  const [zoom, setZoom] = useState(0.72)
  const svgRef = useRef<SVGSVGElement>(null)

  const selectedNode = nodes.find((n) => n.id === selected) ?? null

  useEffect(() => { setZoom(0.72) }, [])

  function svgPoint(e: React.MouseEvent) {
    const svg = svgRef.current!
    const pt = svg.createSVGPoint()
    pt.x = e.clientX; pt.y = e.clientY
    return pt.matrixTransform(svg.getScreenCTM()!.inverse())
  }

  const onNodeMouseDown = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setSelected(id)
    const node = nodes.find((n) => n.id === id)!
    const p = svgPoint(e)
    // Convert from screen space back to canvas space
    const svg = svgRef.current!
    const w = svg.clientWidth
    const h = svg.clientHeight
    const tx = pan.x * zoom + w * (1 - zoom) / 2
    const ty = pan.y * zoom + h * (1 - zoom) / 2
    const cx = (p.x - tx) / zoom
    const cy = (p.y - ty) / zoom
    setDragging({ id, ox: cx - node.x, oy: cy - node.y })
  }, [nodes, pan, zoom])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragging) {
      const svg = svgRef.current!
      const w = svg.clientWidth
      const h = svg.clientHeight
      const p = svgPoint(e)
      const tx = pan.x * zoom + w * (1 - zoom) / 2
      const ty = pan.y * zoom + h * (1 - zoom) / 2
      const cx = (p.x - tx) / zoom
      const cy = (p.y - ty) / zoom
      setNodes((prev) => prev.map((n) =>
        n.id === dragging.id ? { ...n, x: cx - dragging.ox, y: cy - dragging.oy } : n
      ))
    } else if (panning) {
      setPan({
        x: panning.px + (e.clientX - panning.sx) / zoom,
        y: panning.py + (e.clientY - panning.sy) / zoom,
      })
    }
  }, [dragging, panning, pan, zoom])

  const onMouseUp = useCallback(() => {
    setDragging(null)
    setPanning(null)
  }, [])

  const onCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as SVGElement
    if (target === svgRef.current || target.classList.contains('cbg')) {
      setSelected(null)
      setPanning({ sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y })
    }
  }, [pan])

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    setZoom((z) => Math.max(0.35, Math.min(2.0, z - e.deltaY * 0.0008)))
  }, [])

  function resetView() {
    setPan({ x: 0, y: 0 })
    setZoom(0.72)
    setNodes(INITIAL_NODES)
  }

  // Parallel zone bounding box
  const reviewNodes = nodes.filter((n) => PARALLEL_IDS.includes(n.id))
  const minX = Math.min(...reviewNodes.map((n) => n.x)) - 14
  const minY = Math.min(...reviewNodes.map((n) => n.y)) - 28
  const maxX = Math.max(...reviewNodes.map((n) => n.x)) + NODE_W + 14
  const maxY = Math.max(...reviewNodes.map((n) => n.y)) + NODE_H + 14

  const containerW = typeof window !== 'undefined' ? (svgRef.current?.clientWidth ?? 800) : 800
  const containerH = typeof window !== 'undefined' ? (svgRef.current?.clientHeight ?? 460) : 460

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-ink mb-0.5">Generation pipeline</h2>
          <p className="text-sm text-ink-ghost">Drag nodes · scroll to zoom · click any node to inspect</p>
        </div>
        <button onClick={resetView} className="text-xs text-ink-ghost hover:text-ink border border-line rounded-lg px-3 py-1.5 transition-colors">
          Reset view
        </button>
      </div>

      {/* Canvas */}
      <div className="relative rounded-2xl border border-line overflow-hidden bg-[#0c0c0c]" style={{ height: 460 }}>
        <svg
          ref={svgRef}
          width="100%" height="100%"
          className="select-none"
          style={{ cursor: dragging ? 'grabbing' : panning ? 'grabbing' : 'grab' }}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onMouseDown={onCanvasMouseDown}
          onWheel={onWheel}
        >
          <defs>
            <pattern id="pgrid" width="26" height="26" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.7" fill="rgba(255,255,255,0.055)" />
            </pattern>
            <marker id="arr"  markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="rgba(255,255,255,0.22)" /></marker>
            <marker id="arr-sel" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#C2603A" /></marker>
            <marker id="arr-dash" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="rgba(245,158,11,0.65)" /></marker>
          </defs>

          <g transform={`translate(${pan.x * zoom + (containerW) * (1 - zoom) / 2}, ${pan.y * zoom + (containerH) * (1 - zoom) / 2}) scale(${zoom})`}>
            {/* Grid */}
            <rect className="cbg" x="-4000" y="-4000" width="10000" height="10000" fill="url(#pgrid)" />

            {/* Parallel zone */}
            <rect x={minX} y={minY} width={maxX - minX} height={maxY - minY} rx="14"
              fill="rgba(14,165,233,0.04)" stroke="rgba(14,165,233,0.18)" strokeWidth="1.5" strokeDasharray="5 4" />
            <text x={minX + 10} y={minY + 17} fontSize="9" fontWeight="700" fill="rgba(14,165,233,0.55)"
              fontFamily="system-ui,sans-serif" letterSpacing="0.12em">PARALLEL</text>

            {/* Edges */}
            {EDGES.map((edge, i) => {
              const path = edgePath(nodes, edge)
              if (!path) return null
              const pid = `ep${i}`
              const isSel = selected === edge.from || selected === edge.to
              const stroke = isSel ? '#C2603A' : edge.dashed ? 'rgba(245,158,11,0.42)' : 'rgba(255,255,255,0.14)'
              const dotColor = isSel ? '#C2603A' : edge.dashed ? '#f59e0b' : 'rgba(255,255,255,0.45)'
              const marker = isSel ? 'url(#arr-sel)' : edge.dashed ? 'url(#arr-dash)' : 'url(#arr)'

              // Edge mid label
              const fromNode = nodes.find((n) => n.id === edge.from)
              const toNode   = nodes.find((n) => n.id === edge.to)
              const mx = fromNode && toNode ? (fromNode.x + NODE_W + toNode.x) / 2 : 0
              const my = fromNode && toNode ? (nodeCentre(fromNode).y + nodeCentre(toNode).y) / 2 - 9 : 0

              return (
                <g key={i}>
                  <path id={pid} d={path} fill="none"
                    stroke={stroke} strokeWidth={isSel ? 2 : 1.4}
                    strokeDasharray={edge.dashed ? '6 4' : undefined}
                    markerEnd={marker} />
                  <AnimatedDot pathId={pid} color={dotColor} delay={i * 0.16} />
                  {edge.label && (
                    <text x={mx} y={my} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.3)"
                      fontFamily="system-ui,sans-serif" letterSpacing="0.05em">{edge.label}</text>
                  )}
                </g>
              )
            })}

            {/* Nodes */}
            {nodes.map((node) => {
              const isSel = selected === node.id
              const ps = node.persona ? PERSONA_STYLE[node.persona] : null

              return (
                <g key={node.id} transform={`translate(${node.x},${node.y})`}
                  onMouseDown={(e) => onNodeMouseDown(e, node.id)}
                  style={{ cursor: dragging?.id === node.id ? 'grabbing' : 'pointer' }}>

                  {/* Glow ring */}
                  {isSel && (
                    <rect x="-4" y="-4" width={NODE_W + 8} height={NODE_H + 8} rx="16"
                      fill="none" stroke="rgba(194,96,58,0.38)" strokeWidth="7" />
                  )}

                  {/* Card body */}
                  <rect x="0" y="0" width={NODE_W} height={NODE_H} rx="12"
                    fill={isSel ? 'rgba(194,96,58,0.1)' : 'rgba(255,255,255,0.04)'}
                    stroke={isSel ? '#C2603A' : 'rgba(255,255,255,0.11)'}
                    strokeWidth={isSel ? 1.8 : 1.3} />

                  {/* Conditional amber stripe */}
                  {node.conditional && (
                    <rect x="0" y="0" width={NODE_W} height="3" rx="2" fill="rgba(245,158,11,0.55)" />
                  )}

                  {/* Icon */}
                  <g transform={`translate(${NODE_W / 2 - 10}, 11)`}
                    style={{ color: isSel ? '#C2603A' : ps?.text ?? 'rgba(255,255,255,0.45)' }}>
                    <NodeIcon type={node.icon} size={20} />
                  </g>

                  {/* Label */}
                  <text x={NODE_W / 2} y={48} textAnchor="middle" fontSize="11" fontWeight="700"
                    fill={isSel ? '#C2603A' : 'rgba(255,255,255,0.88)'}
                    fontFamily="system-ui,sans-serif">{node.label}</text>

                  {/* Sublabel */}
                  <text x={NODE_W / 2} y={62} textAnchor="middle" fontSize="9"
                    fill="rgba(255,255,255,0.36)" fontFamily="system-ui,sans-serif">{node.sublabel}</text>

                  {/* Persona pill */}
                  {ps && node.persona && (
                    <g transform={`translate(${NODE_W / 2 - 22}, 70)`}>
                      <rect x="0" y="0" width="44" height="14" rx="7" fill={ps.bg} stroke={ps.border} strokeWidth="1" />
                      <circle cx="8" cy="7" r="2.5" fill={ps.dot} />
                      <text x="14" y="10" fontSize="7.5" fontWeight="700" fill={ps.text}
                        fontFamily="system-ui,sans-serif" letterSpacing="0.09em">{node.persona.toUpperCase()}</text>
                    </g>
                  )}

                  {/* Model (no persona) */}
                  {!ps && node.model && (
                    <text x={NODE_W / 2} y={79} textAnchor="middle" fontSize="8"
                      fill="rgba(255,255,255,0.22)" fontFamily="monospace">{node.model}</text>
                  )}
                </g>
              )
            })}
          </g>
        </svg>

        {/* Zoom HUD */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1">
          <button onClick={() => setZoom((z) => Math.min(2.0, z + 0.1))}
            className="w-7 h-7 rounded-md bg-panel/80 border border-line text-ink-ghost hover:text-ink text-sm font-bold flex items-center justify-center backdrop-blur-sm">+</button>
          <span className="text-[10px] text-ink-ghost w-9 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.max(0.35, z - 0.1))}
            className="w-7 h-7 rounded-md bg-panel/80 border border-line text-ink-ghost hover:text-ink text-sm font-bold flex items-center justify-center backdrop-blur-sm">−</button>
        </div>

        <div className="absolute top-3 left-3 text-[10px] text-white/20 font-mono pointer-events-none">
          {nodes.length} nodes · {EDGES.length} edges
        </div>
      </div>

      {/* Detail panel */}
      <div className={`rounded-2xl border transition-all duration-200 overflow-hidden ${selectedNode ? 'border-ember/40 bg-ember/5' : 'border-line bg-panel'}`}>
        {selectedNode ? (
          <div className="p-5 flex gap-5 items-start">
            <div className="p-2.5 rounded-xl bg-ember/10 text-ember flex-shrink-0">
              <NodeIcon type={selectedNode.icon} size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <h3 className="font-display font-bold text-ink text-base">{selectedNode.label}</h3>
                {selectedNode.conditional && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">conditional</span>
                )}
                {selectedNode.parallel && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30">parallel</span>
                )}
              </div>
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                {selectedNode.persona && PERSONA_STYLE[selectedNode.persona] && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border"
                    style={{ background: PERSONA_STYLE[selectedNode.persona].bg, color: PERSONA_STYLE[selectedNode.persona].text, borderColor: PERSONA_STYLE[selectedNode.persona].border }}>
                    {selectedNode.persona}
                  </span>
                )}
                {selectedNode.model && (
                  <span className="text-[10px] font-mono text-ink-ghost bg-page border border-line px-2 py-0.5 rounded">{selectedNode.model}</span>
                )}
              </div>
              <p className="text-sm text-ink-dim leading-relaxed">{selectedNode.detail}</p>
            </div>
            <button onClick={() => setSelected(null)} className="text-ink-ghost hover:text-ink transition-colors flex-shrink-0">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="px-5 py-4 text-sm text-ink-ghost">Click any node to inspect it.</div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 flex-wrap text-xs text-ink-ghost pb-1">
        <div className="flex items-center gap-1.5">
          <div className="w-6 border-t border-white/20" />
          <span>Always runs</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-6 border-t border-dashed border-amber-500/50" />
          <span>Conditional path</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded border border-dashed border-sky-500/40 bg-sky-500/10" />
          <span>Parallel block</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-8 h-[3px] rounded" style={{ background: 'rgba(245,158,11,0.5)' }} />
          <span>Conditional node</span>
        </div>
      </div>
    </div>
  )
}
