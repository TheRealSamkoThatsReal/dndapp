import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { addMonsterEntity } from '../db/repo'
import { Button } from '../ui/kit'
import { importCompendium, type ImportProgress } from './import'
import { ITEM_TYPES, SCHOOLS, type CompMonster } from './types'

type Tab = 'monster' | 'spell' | 'item'

export function CompendiumModal({
  campaignId,
  onClose,
}: {
  campaignId: string
  onClose: () => void
}) {
  const [tab, setTab] = useState<Tab>('monster')
  const [q, setQ] = useState('')
  const [progress, setProgress] = useState<ImportProgress | null>(null)
  const [importing, setImporting] = useState(false)
  const [added, setAdded] = useState<Record<string, boolean>>({})

  const counts = useLiveQuery(async () => ({
    monster: await db.compMonsters.count(),
    spell: await db.compSpells.count(),
    item: await db.compItems.count(),
  }))
  const empty = counts && counts.monster + counts.spell + counts.item === 0

  const results = useLiveQuery(async () => {
    const needle = q.trim().toLowerCase()
    const table =
      tab === 'monster' ? db.compMonsters
      : tab === 'spell' ? db.compSpells
      : db.compItems
    const coll = needle
      ? table.filter((r) => r.search.includes(needle))
      : table.toCollection()
    return coll.limit(50).toArray()
  }, [tab, q, counts])

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setProgress({ monsters: 0, spells: 0, items: 0, done: false })
    try {
      await importCompendium(file, setProgress)
    } catch (err) {
      console.error(err)
      alert('Import failed — see console for details.')
    }
    setImporting(false)
    e.target.value = ''
  }

  async function add(m: CompMonster) {
    await addMonsterEntity(campaignId, m)
    setAdded((a) => ({ ...a, [m.name + m.cr]: true }))
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-ink-950/70 p-4" onClick={onClose}>
      <div
        className="flex h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-ink-700 bg-ink-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center justify-between border-b border-ink-700 px-4 py-3">
          <h2 className="font-serif text-lg text-parchment-50">📖 Compendium</h2>
          <button onClick={onClose} className="text-parchment-300/60 hover:text-parchment-100">✕</button>
        </div>

        {/* import bar */}
        <div className="border-b border-ink-700 px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <label className="cursor-pointer rounded-lg border border-ember-500/50 px-3 py-1.5 text-sm text-ember-400 hover:bg-ember-500/10">
              {empty ? 'Import Fight Club XML…' : 'Re-import XML…'}
              <input type="file" accept=".xml,text/xml" className="hidden" onChange={onFile} disabled={importing} />
            </label>
            {counts && !empty && (
              <span className="text-xs text-parchment-300/50">
                {counts.monster.toLocaleString()} monsters · {counts.spell.toLocaleString()} spells · {counts.item.toLocaleString()} items
              </span>
            )}
            {progress && (
              <span className="text-xs text-ember-400">
                {progress.done ? '✓ Imported ' : 'Importing… '}
                {progress.monsters.toLocaleString()}m / {progress.spells.toLocaleString()}s / {progress.items.toLocaleString()}i
              </span>
            )}
          </div>
          {empty && !importing && (
            <p className="mt-2 text-xs text-parchment-300/50">
              Import a Fight Club / Game Master 5e XML compendium. It's stored on this device only (not synced) — add the monsters you need to your campaign individually.
            </p>
          )}
        </div>

        {!empty && (
          <>
            {/* tabs + search */}
            <div className="flex items-center gap-2 border-b border-ink-700 px-4 py-2">
              {(['monster', 'spell', 'item'] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`rounded-full px-3 py-1 text-xs capitalize ${
                    tab === t ? 'bg-ember-500 text-ink-950' : 'border border-ink-700 text-parchment-300/70'
                  }`}
                >
                  {t}s
                </button>
              ))}
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search…"
                className="ml-auto flex-1 rounded-lg border border-ink-700 bg-ink-950/50 px-3 py-1.5 text-sm text-parchment-50 outline-none focus:border-ember-500"
              />
            </div>

            {/* results */}
            <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-4">
              {results?.length === 0 && (
                <p className="py-8 text-center text-sm text-parchment-300/40">No matches.</p>
              )}
              {tab === 'monster' &&
                (results as CompMonster[] | undefined)?.map((m) => (
                  <MonsterRow
                    key={m.id}
                    m={m}
                    added={!!added[m.name + m.cr]}
                    onAdd={() => add(m)}
                  />
                ))}
              {tab === 'spell' &&
                (results as any[] | undefined)?.map((s) => <SpellRow key={s.id} s={s} />)}
              {tab === 'item' &&
                (results as any[] | undefined)?.map((it) => <ItemRow key={it.id} it={it} />)}
              {results && results.length >= 50 && (
                <p className="pt-2 text-center text-xs text-parchment-300/40">
                  Showing first 50 — refine your search.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Expandable({ title, subtitle, right, children }: {
  title: string; subtitle: string; right?: React.ReactNode; children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-lg border border-ink-700/60 bg-ink-950/30">
      <div className="flex items-center gap-2 px-3 py-2">
        <button onClick={() => setOpen(!open)} className="min-w-0 flex-1 text-left">
          <div className="truncate text-sm text-parchment-50">{title}</div>
          <div className="truncate text-xs text-parchment-300/50">{subtitle}</div>
        </button>
        {right}
      </div>
      {open && <div className="border-t border-ink-700/60 px-3 py-2 text-xs text-parchment-300/80 whitespace-pre-wrap">{children}</div>}
    </div>
  )
}

function MonsterRow({ m, added, onAdd }: { m: CompMonster; added: boolean; onAdd: () => void }) {
  return (
    <Expandable
      title={m.name}
      subtitle={`CR ${m.cr} · ${[m.size, m.type].filter(Boolean).join(' ')} · AC ${m.ac} · ${m.hp} HP`}
      right={
        <Button variant={added ? 'ghost' : 'primary'} className="text-xs" onClick={onAdd} disabled={added}>
          {added ? '✓ Added' : '+ Campaign'}
        </Button>
      }
    >
      <div className="space-y-1">
        <div>STR {m.str} · DEX {m.dex} · CON {m.con} · INT {m.int} · WIS {m.wis} · CHA {m.cha}</div>
        {m.actions.map((a, i) => (
          <div key={i}>
            <span className="text-parchment-100">{a.name}.</span>{' '}
            {a.toHit !== undefined && `+${a.toHit} to hit, `}
            {a.damage && `${a.damage} dmg`}
          </div>
        ))}
      </div>
    </Expandable>
  )
}

function SpellRow({ s }: { s: any }) {
  return (
    <Expandable
      title={s.name}
      subtitle={`${s.level === '0' ? 'Cantrip' : `Level ${s.level}`} · ${SCHOOLS[s.school] ?? s.school}`}
    >
      {`${s.time} · ${s.range} · ${s.duration}\nComponents: ${s.components}\n\n${s.text}`}
    </Expandable>
  )
}

function ItemRow({ it }: { it: any }) {
  return (
    <Expandable
      title={it.name}
      subtitle={[ITEM_TYPES[it.type] ?? it.type, it.detail].filter(Boolean).join(' · ')}
    >
      {it.text || '—'}
    </Expandable>
  )
}
