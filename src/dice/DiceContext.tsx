import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react'
import { rollExpression, type RollMode, type RollResult } from '../lib/dice'

interface DiceState {
  history: RollResult[]
  last: RollResult | null
  open: boolean
  setOpen: (o: boolean) => void
  /** Roll and record. Opening the panel gives visible feedback. */
  roll: (expr: string, mode?: RollMode, label?: string) => RollResult
  clear: () => void
}

const DiceContext = createContext<DiceState | null>(null)
const MAX_HISTORY = 50

export function DiceProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<RollResult[]>([])
  const [open, setOpen] = useState(false)

  const roll = useCallback(
    (expr: string, mode: RollMode = 'normal', label?: string) => {
      const result = rollExpression(expr, mode, label)
      setHistory((h) => [result, ...h].slice(0, MAX_HISTORY))
      setOpen(true)
      return result
    },
    [],
  )

  const clear = useCallback(() => setHistory([]), [])

  return (
    <DiceContext.Provider
      value={{ history, last: history[0] ?? null, open, setOpen, roll, clear }}
    >
      {children}
    </DiceContext.Provider>
  )
}

export function useDice() {
  const ctx = useContext(DiceContext)
  if (!ctx) throw new Error('useDice must be used within DiceProvider')
  return ctx
}
