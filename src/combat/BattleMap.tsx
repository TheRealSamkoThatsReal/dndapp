import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, isLive } from '../db/db'
import {
  DEFAULT_GRID,
  moveCombatantPos,
  moveToken,
  setGrid,
  toggleWall,
} from '../db/repo'
import type { Combatant, Encounter, GridPos } from '../db/types'
import { useAuth } from '../auth/AuthProvider'
import { spriteFor } from './sprites'

const CELL = 44

type Role = 'dm' | 'player'

export function BattleMap({
  encounter,
  role,
}: {
  encounter: Encounter
  role: Role
}) {
  const active = encounter.active
  const { user } = useAuth()
  const authorName = user?.email?.split('@')[0] ?? 'A player'

  const [wallMode, setWallMode] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [infoId, setInfoId] = useState<string | null>(null)

  // token overrides for PC positions (players write these)
  const tokens = useLiveQuery(
    () =>
      db.sharedEntities
        .filter((e) => isLive(e) && e.token?.encounterId === encounter.id)
        .toArray(),
    [encounter.id],
  )
  // the current user's characters (a player only has their own → their movable tokens)
  const myChars = useLiveQuery(
    () => db.characters.filter(isLive).toArray().then((r) => r.map((c) => c.id)),
    [],
  )

  if (!active) return null
  const grid = active.grid ?? DEFAULT_GRID
  const walls = new Set(active.walls ?? [])
  const combatants = active.combatants
  const currentId = combatants[active.turnIndex]?.id
  const myCharSet = new Set(myChars ?? [])

  const tokenMap = new Map<string, GridPos>()
  for (const t of tokens ?? []) {
    if (t.token) tokenMap.set(t.token.sourceId ?? t.token.combatantId, { x: t.token.x, y: t.token.y })
  }

  // resolve each combatant's cell: PC token override → stored pos → default slot
  let pcN = 0
  let foeN = 0
  const placed = combatants.map((c) => {
    let pos: GridPos
    const override = c.isPC ? tokenMap.get(c.sourceId ?? c.id) : undefined
    if (override) pos = override
    else if (c.pos) pos = c.pos
    else pos = defaultPos(c.isPC ? pcN : foeN, c.isPC, grid)
    if (c.isPC) pcN++
    else foeN++
    return { c, pos }
  })
  const occupant = new Map<string, Combatant>()
  for (const { c, pos } of placed) occupant.set(`${pos.x},${pos.y}`, c)

  const canMove = (c: Combatant) =>
    role === 'dm'
      ? !c.isPC
      : c.isPC && myCharSet.has(c.sourceId ?? '') && currentId === c.id

  function onCell(x: number, y: number) {
    if (wallMode && role === 'dm') {
      toggleWall(encounter, x, y)
      return
    }
    const sel = selectedId ? combatants.find((c) => c.id === selectedId) : null
    if (sel && canMove(sel)) {
      const key = `${x},${y}`
      if (walls.has(key) || occupant.has(key)) return // blocked / occupied
      if (sel.isPC) moveToken(encounter.campaignId, encounter.id, sel, x, y, authorName)
      else moveCombatantPos(encounter, sel.id, x, y)
      setSelectedId(null)
      return
    }
    setSelectedId(null)
    setInfoId(null)
  }

  function onToken(c: Combatant) {
    setInfoId(c.id)
    if (canMove(c)) setSelectedId((prev) => (prev === c.id ? null : c.id))
  }

  const info = infoId ? combatants.find((c) => c.id === infoId) : null

  return (
    <div className="space-y-3">
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {role === 'dm' ? (
          <>
            <button
              onClick={() => setWallMode((w) => !w)}
              className={`rounded-lg px-3 py-1 ${
                wallMode
                  ? 'bg-ember-500 text-ink-950'
                  : 'border border-ink-700 text-parchment-100'
              }`}
            >
              🧱 Walls {wallMode ? 'on' : 'off'}
            </button>
            <GridStepper grid={grid} onChange={(c, r) => setGrid(encounter, c, r)} />
            <span className="text-xs text-parchment-300/50">
              {wallMode ? 'Tap cells to build walls.' : 'Tap a monster, then a cell to move it.'}
            </span>
          </>
        ) : (
          <span className="text-xs text-parchment-300/60">
            Tap a creature for info. On your turn, tap your token then a cell to move.
          </span>
        )}
      </div>

      {/* map */}
      <div className="overflow-auto rounded-xl border border-ink-700 bg-ink-950/40 p-2">
        <div
          className="relative"
          style={{ width: grid.cols * CELL, height: grid.rows * CELL }}
        >
          {/* grid cells */}
          <div
            className="absolute inset-0 grid"
            style={{
              gridTemplateColumns: `repeat(${grid.cols}, ${CELL}px)`,
              gridTemplateRows: `repeat(${grid.rows}, ${CELL}px)`,
            }}
          >
            {Array.from({ length: grid.rows * grid.cols }, (_, i) => {
              const x = i % grid.cols
              const y = Math.floor(i / grid.cols)
              const isWall = walls.has(`${x},${y}`)
              return (
                <div
                  key={i}
                  onClick={() => onCell(x, y)}
                  className={`border-[0.5px] border-ink-700/40 ${
                    isWall ? 'bg-ink-700' : 'hover:bg-ink-700/20'
                  }`}
                  style={{
                    backgroundImage: isWall
                      ? 'repeating-linear-gradient(45deg,rgba(0,0,0,.25) 0 4px,transparent 4px 8px)'
                      : undefined,
                  }}
                />
              )
            })}
          </div>

          {/* tokens */}
          {placed.map(({ c, pos }) => (
            <Token
              key={c.id}
              c={c}
              x={pos.x}
              y={pos.y}
              current={c.id === currentId}
              selected={c.id === selectedId}
              onClick={() => onToken(c)}
            />
          ))}
        </div>
      </div>

      {info && <InfoCard c={info} role={role} onClose={() => setInfoId(null)} />}
    </div>
  )
}

function Token({
  c,
  x,
  y,
  current,
  selected,
  onClick,
}: {
  c: Combatant
  x: number
  y: number
  current: boolean
  selected: boolean
  onClick: () => void
}) {
  const frac = Math.max(0, Math.min(1, c.currentHp / Math.max(1, c.maxHp)))
  const down = c.currentHp <= 0
  const ring = frac > 0.5 ? '#5cc85c' : frac > 0.25 ? '#f0c000' : '#e05050'
  const R = CELL / 2 - 3.5
  const C = 2 * Math.PI * R

  return (
    <button
      onClick={onClick}
      className="absolute grid place-items-center"
      style={{ left: x * CELL, top: y * CELL, width: CELL, height: CELL }}
    >
      {/* HP ring */}
      <svg width={CELL} height={CELL} className="absolute inset-0 -rotate-90">
        <circle cx={CELL / 2} cy={CELL / 2} r={R} fill="none" stroke="rgba(0,0,0,.4)" strokeWidth="3" />
        <circle
          cx={CELL / 2}
          cy={CELL / 2}
          r={R}
          fill="none"
          stroke={down ? '#e05050' : ring}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={down ? C : C * (1 - frac)}
        />
      </svg>
      {/* body */}
      <span
        className={`grid place-items-center rounded-full text-lg shadow ${
          current ? 'ring-2 ring-yellow-300' : ''
        } ${selected ? 'ring-2 ring-white' : ''}`}
        style={{
          width: CELL - 12,
          height: CELL - 12,
          background: c.isPC ? '#2f6fd0' : '#c23b3b',
          filter: down ? 'grayscale(1) brightness(0.7)' : undefined,
        }}
      >
        {spriteFor(c)}
      </span>
    </button>
  )
}

function InfoCard({ c, role, onClose }: { c: Combatant; role: Role; onClose: () => void }) {
  const frac = c.currentHp / Math.max(1, c.maxHp)
  const health =
    c.currentHp <= 0 ? 'Down' : frac <= 0.25 ? 'Critical' : frac <= 0.5 ? 'Bloodied' : frac < 1 ? 'Hurt' : 'Healthy'
  return (
    <div className="flex items-start gap-3 rounded-xl border border-ink-700 bg-ink-800 p-3">
      <span
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-xl"
        style={{ background: c.isPC ? '#2f6fd0' : '#c23b3b' }}
      >
        {spriteFor(c)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-serif text-parchment-50">{c.name}</span>
          <span className="text-xs text-parchment-300/50">
            {c.isPC ? 'Ally' : c.type || 'Enemy'} · AC {c.ac}
          </span>
        </div>
        <div className="mt-0.5 text-sm">
          {role === 'dm' ? (
            <span className="text-parchment-100">
              HP {Math.max(0, c.currentHp)}/{c.maxHp}
              {c.tempHp > 0 && <span className="text-arcane-500"> (+{c.tempHp})</span>}
            </span>
          ) : (
            <span className="text-parchment-300/70">{health}</span>
          )}
        </div>
        {c.conditions.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {c.conditions.map((cond) => (
              <span key={cond.name} className="rounded-full bg-arcane-500/20 px-2 py-0.5 text-xs text-arcane-500">
                {cond.name}
                {cond.rounds !== null && ` (${cond.rounds})`}
              </span>
            ))}
          </div>
        )}
      </div>
      <button onClick={onClose} className="text-parchment-300/50 hover:text-parchment-100">
        ✕
      </button>
    </div>
  )
}

function GridStepper({
  grid,
  onChange,
}: {
  grid: { cols: number; rows: number }
  onChange: (cols: number, rows: number) => void
}) {
  const clamp = (n: number) => Math.max(6, Math.min(40, n))
  return (
    <div className="flex items-center gap-1 text-xs text-parchment-300/60">
      <span>Grid</span>
      <Stepper label="W" value={grid.cols} onChange={(v) => onChange(clamp(v), grid.rows)} />
      <Stepper label="H" value={grid.rows} onChange={(v) => onChange(grid.cols, clamp(v))} />
    </div>
  )
}
function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <span className="inline-flex items-center overflow-hidden rounded-lg border border-ink-700">
      <button onClick={() => onChange(value - 1)} className="px-1.5 text-parchment-100 hover:bg-ink-700">−</button>
      <span className="w-10 text-center text-parchment-100">{label} {value}</span>
      <button onClick={() => onChange(value + 1)} className="px-1.5 text-parchment-100 hover:bg-ink-700">+</button>
    </span>
  )
}

function defaultPos(i: number, isPC: boolean, grid: { cols: number; rows: number }): GridPos {
  const col = i % grid.cols
  const band = Math.floor(i / grid.cols)
  const y = isPC ? grid.rows - 1 - band : band
  return { x: col, y: Math.max(0, Math.min(grid.rows - 1, y)) }
}
