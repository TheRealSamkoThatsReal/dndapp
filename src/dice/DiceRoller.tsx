import { useState } from 'react'
import { describeRoll, type RollMode } from '../lib/dice'
import { useDice } from './DiceContext'

const QUICK = [4, 6, 8, 10, 12, 20, 100]

export function DiceRoller() {
  const { history, open, setOpen, roll, clear } = useDice()
  const [mode, setMode] = useState<RollMode>('normal')
  const [expr, setExpr] = useState('')

  return (
    <>
      {/* floating toggle */}
      <button
        onClick={() => setOpen(!open)}
        aria-label="Dice roller"
        className="fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center rounded-full border border-ember-600 bg-ember-500 text-2xl text-ink-950 shadow-xl transition-transform hover:scale-105 active:scale-95"
      >
        🎲
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-40 flex max-h-[70vh] w-80 flex-col rounded-2xl border border-ink-700 bg-ink-800 shadow-2xl">
          <div className="flex items-center justify-between border-b border-ink-700 px-4 py-2">
            <span className="font-serif text-parchment-50">Dice</span>
            <button
              onClick={() => setOpen(false)}
              className="text-parchment-300/60 hover:text-parchment-100"
            >
              ✕
            </button>
          </div>

          {/* adv / normal / dis */}
          <div className="flex gap-1 px-4 pt-3">
            {(
              [
                ['dis', 'Disadv'],
                ['normal', 'Normal'],
                ['adv', 'Advantage'],
              ] as [RollMode, string][]
            ).map(([m, label]) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 rounded-lg px-2 py-1 text-xs transition-colors ${
                  mode === m
                    ? 'bg-ember-500 text-ink-950'
                    : 'border border-ink-700 text-parchment-300/70 hover:text-parchment-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* quick dice */}
          <div className="grid grid-cols-4 gap-1.5 px-4 pt-3">
            {QUICK.map((s) => (
              <button
                key={s}
                onClick={() => roll(`1d${s}`, s === 20 ? mode : 'normal')}
                className="rounded-lg border border-ink-700 py-2 text-sm text-parchment-100 hover:border-ember-500/60 hover:bg-ink-700/40"
              >
                d{s}
              </button>
            ))}
          </div>

          {/* custom expression */}
          <div className="flex gap-1.5 px-4 pt-3">
            <input
              value={expr}
              onChange={(e) => setExpr(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && expr.trim()) {
                  roll(expr, mode)
                  setExpr('')
                }
              }}
              placeholder="2d6+3"
              className="flex-1 rounded-lg border border-ink-700 bg-ink-950/50 px-3 py-1.5 text-sm text-parchment-50 outline-none focus:border-ember-500"
            />
            <button
              onClick={() => {
                if (expr.trim()) {
                  roll(expr, mode)
                  setExpr('')
                }
              }}
              className="rounded-lg bg-ember-500 px-3 text-sm font-medium text-ink-950"
            >
              Roll
            </button>
          </div>

          {/* history */}
          <div className="mt-3 flex items-center justify-between px-4">
            <span className="text-xs text-parchment-300/50">History</span>
            {history.length > 0 && (
              <button
                onClick={clear}
                className="text-xs text-parchment-300/50 hover:text-blood-500"
              >
                Clear
              </button>
            )}
          </div>
          <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-4 pb-4 pt-1.5">
            {history.length === 0 && (
              <p className="py-4 text-center text-xs text-parchment-300/40">
                Roll something.
              </p>
            )}
            {history.map((r) => (
              <div
                key={r.id}
                className="rounded-lg border border-ink-700/60 bg-ink-950/40 px-3 py-2"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-xs text-parchment-300/60">
                    {r.label ?? r.expression}
                    {r.mode !== 'normal' && (
                      <span className="ml-1 text-ember-400">
                        ({r.mode === 'adv' ? 'adv' : 'dis'})
                      </span>
                    )}
                  </span>
                  <span
                    className={`font-serif text-lg font-semibold ${
                      r.crit === 'hit'
                        ? 'text-moss-500'
                        : r.crit === 'miss'
                          ? 'text-blood-500'
                          : 'text-parchment-50'
                    }`}
                  >
                    {r.total}
                  </span>
                </div>
                <div className="text-[11px] text-parchment-300/40">
                  {describeRoll(r)}
                  {r.crit === 'hit' && ' · nat 20!'}
                  {r.crit === 'miss' && ' · nat 1'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
