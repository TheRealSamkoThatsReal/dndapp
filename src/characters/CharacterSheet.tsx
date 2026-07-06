import { updateCharacter } from '../db/repo'
import {
  ABILITY_KEYS,
  abilityMod,
  formatMod,
  type Ability,
  type Character,
} from '../db/types'
import { useDice } from '../dice/DiceContext'
import { Card } from '../ui/kit'

const SKILLS: [string, keyof Ability][] = [
  ['Acrobatics', 'dex'], ['Animal Handling', 'wis'], ['Arcana', 'int'],
  ['Athletics', 'str'], ['Deception', 'cha'], ['History', 'int'],
  ['Insight', 'wis'], ['Intimidation', 'cha'], ['Investigation', 'int'],
  ['Medicine', 'wis'], ['Nature', 'int'], ['Perception', 'wis'],
  ['Performance', 'cha'], ['Persuasion', 'cha'], ['Religion', 'int'],
  ['Sleight of Hand', 'dex'], ['Stealth', 'dex'], ['Survival', 'wis'],
]

export function CharacterSheet({ character: c }: { character: Character }) {
  const { roll } = useDice()
  const set = (patch: Partial<Character>) => updateCharacter(c.id, patch)

  const isProf = (key: string) => c.proficiencies.includes(key)
  const toggleProf = (key: string) =>
    set({
      proficiencies: isProf(key)
        ? c.proficiencies.filter((p) => p !== key)
        : [...c.proficiencies, key],
    })

  const skillMod = (ability: keyof Ability, name: string) =>
    abilityMod(c.abilities[ability]) + (isProf(name) ? c.proficiencyBonus : 0)
  const saveMod = (ability: keyof Ability) =>
    abilityMod(c.abilities[ability]) +
    (isProf(`save:${ability}`) ? c.proficiencyBonus : 0)

  const rollCheck = (mod: number, label: string) =>
    roll(`1d20${formatMod(mod)}`, 'normal', `${c.name} · ${label}`)

  return (
    <div className="space-y-4">
      {/* identity */}
      <Card className="p-4">
        <input
          value={c.name}
          onChange={(e) => set({ name: e.target.value })}
          className="w-full bg-transparent font-serif text-2xl font-semibold text-parchment-50 outline-none"
        />
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Text label="Player" value={c.playerName} onChange={(v) => set({ playerName: v })} />
          <Text label="Ancestry" value={c.ancestry} onChange={(v) => set({ ancestry: v })} />
          <Text label="Class" value={c.className} onChange={(v) => set({ className: v })} />
          <Num label="Level" value={c.level} onChange={(v) => set({ level: v })} />
          <Num label="Prof. bonus" value={c.proficiencyBonus} onChange={(v) => set({ proficiencyBonus: v })} />
        </div>
      </Card>

      {/* vitals */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Armor Class"><Num value={c.ac} onChange={(v) => set({ ac: v })} big /></Stat>
        <Stat label="Speed"><Num value={c.speed} onChange={(v) => set({ speed: v })} big /></Stat>
        <Stat label="Hit Points">
          <div className="flex items-center justify-center gap-1">
            <Num value={c.currentHp} onChange={(v) => set({ currentHp: v })} big />
            <span className="text-parchment-300/50">/</span>
            <Num value={c.maxHp} onChange={(v) => set({ maxHp: v })} big />
          </div>
        </Stat>
        <Stat label="Temp HP"><Num value={c.tempHp} onChange={(v) => set({ tempHp: v })} big /></Stat>
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        {/* abilities + saves */}
        <div className="space-y-3">
          {ABILITY_KEYS.map((k) => {
            const mod = abilityMod(c.abilities[k])
            return (
              <Card key={k} className="flex items-center gap-3 p-3">
                <div className="text-center">
                  <div className="text-[10px] uppercase tracking-wide text-parchment-300/50">
                    {k}
                  </div>
                  <input
                    type="number"
                    value={c.abilities[k]}
                    onChange={(e) =>
                      set({ abilities: { ...c.abilities, [k]: Number(e.target.value) } })
                    }
                    className="w-14 rounded border border-ink-700 bg-ink-950/50 py-1 text-center font-serif text-lg text-parchment-50 outline-none"
                  />
                </div>
                <button
                  onClick={() => rollCheck(mod, `${k.toUpperCase()} check`)}
                  className="grid h-9 w-11 place-items-center rounded-lg bg-ink-700/50 font-serif text-lg text-ember-400 hover:bg-ink-700"
                  title="Roll check"
                >
                  {formatMod(mod)}
                </button>
                <button
                  onClick={() => rollCheck(saveMod(k), `${k.toUpperCase()} save`)}
                  className={`ml-auto flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs ${
                    isProf(`save:${k}`) ? 'text-parchment-50' : 'text-parchment-300/50'
                  }`}
                  title="Roll save"
                >
                  <span
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleProf(`save:${k}`)
                    }}
                    className={`h-2.5 w-2.5 rounded-full border ${
                      isProf(`save:${k}`)
                        ? 'border-ember-500 bg-ember-500'
                        : 'border-ink-700'
                    }`}
                  />
                  save {formatMod(saveMod(k))}
                </button>
              </Card>
            )
          })}
        </div>

        {/* skills */}
        <Card className="p-4">
          <h3 className="mb-2 font-serif text-parchment-50">Skills</h3>
          <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-2">
            {SKILLS.map(([name, ability]) => {
              const mod = skillMod(ability, name)
              return (
                <div
                  key={name}
                  className="flex items-center gap-2 rounded px-2 py-1 hover:bg-ink-700/30"
                >
                  <button
                    onClick={() => toggleProf(name)}
                    className={`h-3 w-3 shrink-0 rounded-full border ${
                      isProf(name) ? 'border-ember-500 bg-ember-500' : 'border-ink-700'
                    }`}
                    title="Toggle proficiency"
                  />
                  <span className="flex-1 text-sm text-parchment-100">{name}</span>
                  <span className="text-xs text-parchment-300/40">{ability}</span>
                  <button
                    onClick={() => rollCheck(mod, name)}
                    className="w-10 rounded bg-ink-700/50 py-0.5 text-center text-sm text-ember-400 hover:bg-ink-700"
                  >
                    {formatMod(mod)}
                  </button>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      <SpellSlots character={c} />
      <Inventory character={c} />

      {/* notes */}
      <Card className="p-4">
        <h3 className="mb-2 font-serif text-parchment-50">Notes</h3>
        <textarea
          value={c.notes}
          onChange={(e) => set({ notes: e.target.value })}
          placeholder="Features, backstory, bonds, anything…"
          className="min-h-32 w-full resize-y bg-transparent text-sm text-parchment-100 outline-none"
        />
      </Card>
    </div>
  )
}

function SpellSlots({ character: c }: { character: Character }) {
  const set = (level: number, patch: { max?: number; used?: number }) => {
    const cur = c.spellSlots[level] ?? { max: 0, used: 0 }
    const next = { ...c.spellSlots, [level]: { ...cur, ...patch } }
    updateCharacter(c.id, { spellSlots: next })
  }
  return (
    <Card className="p-4">
      <h3 className="mb-3 font-serif text-parchment-50">Spell Slots</h3>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-9">
        {Array.from({ length: 9 }, (_, i) => i + 1).map((lvl) => {
          const slot = c.spellSlots[lvl] ?? { max: 0, used: 0 }
          return (
            <div key={lvl} className="rounded-lg border border-ink-700/60 p-2 text-center">
              <div className="text-[10px] text-parchment-300/50">Lvl {lvl}</div>
              <input
                type="number"
                value={slot.max}
                onChange={(e) => set(lvl, { max: Number(e.target.value), used: Math.min(slot.used, Number(e.target.value)) })}
                title="Max slots"
                className="w-10 rounded border border-ink-700 bg-ink-950/50 py-0.5 text-center text-parchment-50 outline-none"
              />
              <div className="mt-1 flex items-center justify-center gap-1">
                <button
                  onClick={() => set(lvl, { used: Math.max(0, slot.used - 1) })}
                  disabled={slot.used <= 0}
                  className="text-parchment-300/60 disabled:opacity-30"
                >
                  −
                </button>
                <span className="text-xs text-ember-400">{slot.used}</span>
                <button
                  onClick={() => set(lvl, { used: Math.min(slot.max, slot.used + 1) })}
                  disabled={slot.used >= slot.max}
                  className="text-parchment-300/60 disabled:opacity-30"
                >
                  +
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function Inventory({ character: c }: { character: Character }) {
  const update = (inv: Character['inventory']) => updateCharacter(c.id, { inventory: inv })
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-serif text-parchment-50">Inventory</h3>
        <button
          onClick={() => update([...c.inventory, { name: '', qty: 1, notes: '' }])}
          className="rounded-lg border border-ink-700 px-2 py-1 text-xs text-parchment-100 hover:bg-ink-700/40"
        >
          + Item
        </button>
      </div>
      <div className="space-y-1">
        {c.inventory.length === 0 && (
          <p className="text-sm text-parchment-300/40">Nothing carried yet.</p>
        )}
        {c.inventory.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="number"
              value={item.qty}
              onChange={(e) =>
                update(c.inventory.map((it, idx) => (idx === i ? { ...it, qty: Number(e.target.value) } : it)))
              }
              className="w-12 rounded border border-ink-700 bg-ink-950/50 px-1 py-1 text-center text-parchment-50 outline-none"
            />
            <input
              value={item.name}
              placeholder="Item"
              onChange={(e) =>
                update(c.inventory.map((it, idx) => (idx === i ? { ...it, name: e.target.value } : it)))
              }
              className="flex-1 rounded border border-ink-700 bg-ink-950/50 px-2 py-1 text-parchment-50 outline-none"
            />
            <input
              value={item.notes}
              placeholder="notes"
              onChange={(e) =>
                update(c.inventory.map((it, idx) => (idx === i ? { ...it, notes: e.target.value } : it)))
              }
              className="flex-1 rounded border border-ink-700 bg-ink-950/50 px-2 py-1 text-sm text-parchment-300/70 outline-none"
            />
            <button
              onClick={() => update(c.inventory.filter((_, idx) => idx !== i))}
              className="text-parchment-300/40 hover:text-blood-500"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ── small inputs ────────────────────────────────────────────────
function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Card className="p-3 text-center">
      <div className="mb-1 text-[10px] uppercase tracking-wide text-parchment-300/50">
        {label}
      </div>
      {children}
    </Card>
  )
}
function Text({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase tracking-wide text-parchment-300/50">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-ink-700 bg-ink-950/50 px-2 py-1 text-parchment-50 outline-none focus:border-ember-500"
      />
    </label>
  )
}
function Num({ label, value, onChange, big }: { label?: string; value: number; onChange: (v: number) => void; big?: boolean }) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1 block text-[10px] uppercase tracking-wide text-parchment-300/50">{label}</span>
      )}
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`rounded border border-ink-700 bg-ink-950/50 text-center text-parchment-50 outline-none focus:border-ember-500 ${
          big ? 'w-16 py-1 font-serif text-xl' : 'w-full px-2 py-1'
        }`}
      />
    </label>
  )
}
