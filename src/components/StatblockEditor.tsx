import { ABILITY_KEYS, abilityMod, formatMod } from '../db/types'
import type { Entity, Statblock, StatblockAction } from '../db/types'
import { updateEntity } from '../db/repo'
import { useDice } from '../dice/DiceContext'
import { Button } from '../ui/kit'

const EMPTY: Statblock = {
  ac: 12,
  hp: 10,
  hitDice: '2d8',
  speed: '30 ft',
  cr: '1/4',
  abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  actions: [],
}

export function StatblockEditor({ entity }: { entity: Entity }) {
  const { roll } = useDice()
  const sb = entity.statblock

  const patch = (p: Partial<Statblock>) =>
    updateEntity(entity.id, { statblock: { ...(sb ?? EMPTY), ...p } })

  if (!sb) {
    return (
      <div className="rounded-xl border border-dashed border-ink-700/60 p-4 text-center">
        <p className="mb-2 text-sm text-parchment-300/60">
          No statblock — add one so this creature can drop into combat.
        </p>
        <Button onClick={() => updateEntity(entity.id, { statblock: EMPTY })}>
          + Add statblock
        </Button>
      </div>
    )
  }

  const setAction = (i: number, p: Partial<StatblockAction>) => {
    const actions = sb.actions.map((a, idx) => (idx === i ? { ...a, ...p } : a))
    patch({ actions })
  }

  return (
    <div className="space-y-4 rounded-xl border border-ink-700/60 p-4">
      {/* core stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Field label="AC">
          <NumInput value={sb.ac} onChange={(ac) => patch({ ac })} />
        </Field>
        <Field label="HP">
          <NumInput value={sb.hp} onChange={(hp) => patch({ hp })} />
        </Field>
        <Field label="Hit dice">
          <TextInput value={sb.hitDice} onChange={(hitDice) => patch({ hitDice })} />
        </Field>
        <Field label="Speed">
          <TextInput value={sb.speed} onChange={(speed) => patch({ speed })} />
        </Field>
        <Field label="CR">
          <TextInput value={sb.cr} onChange={(cr) => patch({ cr })} />
        </Field>
      </div>

      {/* abilities with roll-a-check buttons */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {ABILITY_KEYS.map((k) => {
          const score = sb.abilities[k]
          const mod = abilityMod(score)
          return (
            <div
              key={k}
              className="rounded-lg border border-ink-700/60 bg-ink-950/40 p-2 text-center"
            >
              <div className="text-[10px] uppercase tracking-wide text-parchment-300/50">
                {k}
              </div>
              <NumInput
                value={score}
                onChange={(v) =>
                  patch({ abilities: { ...sb.abilities, [k]: v } })
                }
                center
              />
              <button
                onClick={() =>
                  roll(
                    `1d20${mod >= 0 ? '+' : ''}${mod}`,
                    'normal',
                    `${entity.name} · ${k.toUpperCase()} check`,
                  )
                }
                className="mt-1 w-full rounded bg-ink-700/50 py-0.5 text-xs text-ember-400 hover:bg-ink-700"
              >
                {formatMod(mod)}
              </button>
            </div>
          )
        })}
      </div>

      {/* actions */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-parchment-300/70">Actions</span>
          <Button
            className="text-xs"
            onClick={() =>
              patch({
                actions: [
                  ...sb.actions,
                  { name: 'Attack', desc: '', toHit: 4, damage: '1d6+2' },
                ],
              })
            }
          >
            + Action
          </Button>
        </div>
        {sb.actions.map((a, i) => (
          <div
            key={i}
            className="space-y-2 rounded-lg border border-ink-700/60 bg-ink-950/40 p-2"
          >
            <div className="flex items-center gap-2">
              <input
                value={a.name}
                onChange={(e) => setAction(i, { name: e.target.value })}
                className="flex-1 bg-transparent text-sm font-medium text-parchment-50 outline-none"
              />
              <Button
                variant="danger"
                className="text-xs"
                onClick={() =>
                  patch({ actions: sb.actions.filter((_, idx) => idx !== i) })
                }
              >
                ✕
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <label className="flex items-center gap-1 text-parchment-300/60">
                +hit
                <NumInput
                  value={a.toHit ?? 0}
                  onChange={(toHit) => setAction(i, { toHit })}
                  small
                />
              </label>
              <button
                onClick={() =>
                  roll(
                    `1d20${(a.toHit ?? 0) >= 0 ? '+' : ''}${a.toHit ?? 0}`,
                    'normal',
                    `${entity.name} · ${a.name} to hit`,
                  )
                }
                className="rounded bg-ink-700/50 px-2 py-1 text-ember-400 hover:bg-ink-700"
              >
                🎲 hit
              </button>
              <label className="flex items-center gap-1 text-parchment-300/60">
                dmg
                <input
                  value={a.damage ?? ''}
                  onChange={(e) => setAction(i, { damage: e.target.value })}
                  placeholder="1d6+2"
                  className="w-20 rounded border border-ink-700 bg-ink-950/50 px-1.5 py-0.5 text-parchment-50 outline-none"
                />
              </label>
              <button
                onClick={() =>
                  a.damage &&
                  roll(a.damage, 'normal', `${entity.name} · ${a.name} damage`)
                }
                className="rounded bg-ink-700/50 px-2 py-1 text-blood-500 hover:bg-ink-700"
              >
                🎲 dmg
              </button>
            </div>
            <input
              value={a.desc}
              onChange={(e) => setAction(i, { desc: e.target.value })}
              placeholder="Notes / effect (optional)"
              className="w-full bg-transparent text-xs text-parchment-300/70 outline-none"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase tracking-wide text-parchment-300/50">
        {label}
      </span>
      {children}
    </label>
  )
}

function NumInput({
  value,
  onChange,
  center,
  small,
}: {
  value: number
  onChange: (v: number) => void
  center?: boolean
  small?: boolean
}) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className={`rounded border border-ink-700 bg-ink-950/50 py-1 text-parchment-50 outline-none focus:border-ember-500 ${
        small ? 'w-12 px-1' : 'w-full px-2'
      } ${center ? 'text-center' : ''}`}
    />
  )
}

function TextInput({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded border border-ink-700 bg-ink-950/50 px-2 py-1 text-parchment-50 outline-none focus:border-ember-500"
    />
  )
}
