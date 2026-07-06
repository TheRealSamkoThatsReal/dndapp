import { useOutletContext } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, isLive } from '../db/db'
import type { Combatant } from '../db/types'
import { EmptyState } from '../ui/kit'
import type { CampaignContext } from '../routes/CampaignLayout'

// A Pokémon-style battle screen for players: the party on one platform, the
// enemies on the other, gameboy HP bars, and status badges. Read-only —
// updates stream in over sync/realtime as the DM runs the fight.
export default function PlayerCombatView() {
  const { campaign } = useOutletContext<CampaignContext>()

  const encounter = useLiveQuery(
    () =>
      db.encounters
        .where({ campaignId: campaign.id })
        .filter((e) => isLive(e) && !!e.active)
        .toArray()
        .then((rows) => rows[0]),
    [campaign.id],
  )

  if (encounter === undefined) {
    return <div className="py-16 text-center text-parchment-300/40">Loading…</div>
  }
  if (!encounter?.active) {
    return (
      <EmptyState
        icon="⚔️"
        title="No battle in progress"
        hint="When your DM starts a fight, the battlefield will appear here — live."
      />
    )
  }

  const { round, turnIndex, combatants } = encounter.active
  const currentId = combatants[turnIndex]?.id
  const party = combatants.filter((c) => c.isPC)
  const foes = combatants.filter((c) => !c.isPC)

  return (
    <div className="space-y-3">
      <TurnRibbon combatants={combatants} currentId={currentId} round={round} />

      <div className="relative overflow-hidden rounded-2xl border border-ink-700">
        {/* battlefield backdrop */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg,#2a3550 0%,#3a4a6a 42%,#5a6b4a 58%,#3f5236 100%)',
          }}
        />
        <div className="relative grid gap-4 p-4 sm:p-6">
          {/* enemies — upper right */}
          <Side
            combatants={foes}
            currentId={currentId}
            align="end"
            hideNumbers
            emptyLabel="No enemies"
          />
          {/* party — lower left */}
          <Side
            combatants={party}
            currentId={currentId}
            align="start"
            hideNumbers={false}
            emptyLabel="No party members"
          />
        </div>
      </div>

      <p className="text-center text-xs text-parchment-300/40">
        Enemy HP is shown as a bar only — your party shows exact HP.
      </p>
    </div>
  )
}

function Side({
  combatants,
  currentId,
  align,
  hideNumbers,
  emptyLabel,
}: {
  combatants: Combatant[]
  currentId: string | undefined
  align: 'start' | 'end'
  hideNumbers: boolean
  emptyLabel: string
}) {
  return (
    <div
      className={`flex flex-wrap gap-3 sm:gap-5 ${
        align === 'end' ? 'justify-end' : 'justify-start'
      }`}
    >
      {combatants.length === 0 ? (
        <span className="text-xs text-white/40">{emptyLabel}</span>
      ) : (
        combatants.map((c, i) => (
          <BattlePlate
            key={c.id}
            c={c}
            active={c.id === currentId}
            hideNumbers={hideNumbers}
            facingLeft={align === 'end'}
            delay={i}
          />
        ))
      )}
    </div>
  )
}

function BattlePlate({
  c,
  active,
  hideNumbers,
  facingLeft,
  delay,
}: {
  c: Combatant
  active: boolean
  hideNumbers: boolean
  facingLeft: boolean
  delay: number
}) {
  const pct = Math.max(0, Math.min(100, (c.currentHp / Math.max(1, c.maxHp)) * 100))
  const down = c.currentHp <= 0
  const barColor = pct > 50 ? '#5cc85c' : pct > 20 ? '#f0c000' : '#e05050'

  return (
    <div
      className="flex flex-col items-center gap-1"
      style={{ animation: `plate-in 0.35s ease-out ${delay * 0.06}s both` }}
    >
      {/* HP box (gameboy style) */}
      <div
        className={`w-44 rounded-lg border-2 px-2.5 py-1.5 shadow-lg ${
          active ? 'border-yellow-300' : 'border-ink-950/70'
        }`}
        style={{ background: '#f7f3e2' }}
      >
        <div className="flex items-baseline justify-between gap-1">
          <span className="truncate text-sm font-bold text-ink-900">{c.name}</span>
          {active && (
            <span className="shrink-0 rounded bg-yellow-400 px-1 text-[9px] font-bold text-ink-900">
              TURN
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-1">
          <span className="text-[9px] font-black italic text-amber-600">HP</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full border border-ink-900/40 bg-ink-900/20">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: barColor }}
            />
          </div>
        </div>
        <div className="mt-0.5 flex min-h-4 items-center justify-between">
          <div className="flex flex-wrap gap-0.5">
            {c.conditions.map((cond) => (
              <StatusBadge key={cond.name} name={cond.name} rounds={cond.rounds} />
            ))}
          </div>
          {!hideNumbers && (
            <span className="text-[10px] font-bold text-ink-800">
              {Math.max(0, c.currentHp)}/{c.maxHp}
            </span>
          )}
        </div>
      </div>

      {/* sprite on a platform */}
      <div className="relative mt-1 grid h-16 w-24 place-items-end justify-center">
        <div
          className="absolute bottom-0 h-4 w-20 rounded-[50%]"
          style={{ background: 'rgba(0,0,0,0.28)' }}
        />
        <div
          className="relative text-4xl"
          style={{
            transform: facingLeft ? 'scaleX(-1)' : undefined,
            animation: down
              ? 'faint 0.6s ease-out both'
              : active
                ? 'bob 1.1s ease-in-out infinite'
                : undefined,
            filter: down ? 'grayscale(1)' : undefined,
          }}
        >
          {spriteFor(c)}
        </div>
      </div>
    </div>
  )
}

// ── status badges (Pokémon PSN / PAR style) ─────────────────────
const STATUS: Record<string, { abbr: string; bg: string }> = {
  Poisoned: { abbr: 'PSN', bg: '#a040a0' },
  Paralyzed: { abbr: 'PAR', bg: '#c8a000' },
  Stunned: { abbr: 'STN', bg: '#c8a000' },
  Unconscious: { abbr: 'KO', bg: '#b03030' },
  Prone: { abbr: 'PRN', bg: '#7c8a99' },
  Restrained: { abbr: 'RST', bg: '#d07020' },
  Grappled: { abbr: 'GRP', bg: '#d07020' },
  Frightened: { abbr: 'FRN', bg: '#7048a0' },
  Charmed: { abbr: 'CHM', bg: '#d0508a' },
  Blinded: { abbr: 'BLN', bg: '#606a78' },
  Deafened: { abbr: 'DEF', bg: '#606a78' },
  Petrified: { abbr: 'PET', bg: '#7c8a99' },
  Incapacitated: { abbr: 'INC', bg: '#606a78' },
  Invisible: { abbr: 'INV', bg: '#4098c8' },
  Concentration: { abbr: 'CNC', bg: '#40a060' },
}

function StatusBadge({ name, rounds }: { name: string; rounds: number | null }) {
  const s = STATUS[name] ?? { abbr: name.slice(0, 3).toUpperCase(), bg: '#606a78' }
  return (
    <span
      title={rounds !== null ? `${name} (${rounds} rounds)` : name}
      className="rounded px-1 text-[8px] font-black leading-tight text-white"
      style={{ background: s.bg }}
    >
      {s.abbr}
    </span>
  )
}

// ── sprite picker (emoji stand-ins, stable per name) ────────────
const HEROES = ['🧝', '🧙', '🧚', '🦸', '🧛', '🥷', '👸', '🤴', '🧑‍🎤']
const FOES = ['👹', '👺', '🐉', '🐺', '🦇', '🕷️', '🧟', '👻', '🐗', '🦂', '🐍', '🦑', '👿', '☠️', '🦖', '🐙']

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}
function spriteFor(c: Combatant): string {
  const pool = c.isPC ? HEROES : FOES
  return pool[hash(c.name) % pool.length]
}

// ── turn-order ribbon ───────────────────────────────────────────
function TurnRibbon({
  combatants,
  currentId,
  round,
}: {
  combatants: Combatant[]
  currentId: string | undefined
  round: number
}) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto rounded-xl border border-ink-700/60 bg-ink-800/60 px-3 py-2">
      <span className="shrink-0 font-serif text-sm font-semibold text-ember-400">
        Round {round}
      </span>
      <span className="text-ink-700">|</span>
      {combatants.map((c) => (
        <span
          key={c.id}
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
            c.id === currentId
              ? 'bg-ember-500 text-ink-950'
              : c.currentHp <= 0
                ? 'text-parchment-300/30 line-through'
                : c.isPC
                  ? 'text-arcane-500'
                  : 'text-parchment-300/70'
          }`}
        >
          {c.name}
        </span>
      ))}
    </div>
  )
}
