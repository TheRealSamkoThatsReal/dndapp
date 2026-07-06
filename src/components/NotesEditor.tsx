import { useState } from 'react'

/** Lightweight markdown → HTML for the essentials, plus [[wikilink]] chips.
 *  Deliberately dependency-free; swap for a full parser later if needed. */
function render(md: string, known: Set<string>): string {
  const esc = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

  const lines = esc(md).split('\n')
  const out: string[] = []
  let inList = false
  const closeList = () => {
    if (inList) {
      out.push('</ul>')
      inList = false
    }
  }

  for (const raw of lines) {
    let line = raw
    // inline: bold, italic, code
    line = line
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
    // wikilinks
    line = line.replace(/\[\[([^\]]+)\]\]/g, (_, name: string) => {
      const trimmed = name.trim()
      const cls = known.has(trimmed)
        ? 'text-ember-400 border-ember-500/40'
        : 'text-arcane-500 border-arcane-500/40 border-dashed'
      return `<span class="rounded border px-1 ${cls}">${trimmed}</span>`
    })

    if (/^#{1,3}\s/.test(raw)) {
      closeList()
      const level = raw.match(/^#+/)![0].length
      const text = line.replace(/^#+\s/, '')
      out.push(`<h${level + 1} class="font-serif font-semibold text-parchment-50">${text}</h${level + 1}>`)
    } else if (/^[-*]\s/.test(raw)) {
      if (!inList) {
        out.push('<ul class="list-disc pl-5">')
        inList = true
      }
      out.push(`<li>${line.replace(/^[-*]\s/, '')}</li>`)
    } else if (raw.trim() === '') {
      closeList()
    } else {
      closeList()
      out.push(`<p>${line}</p>`)
    }
  }
  closeList()
  return out.join('\n')
}

export function NotesEditor({
  value,
  onChange,
  entityNames,
}: {
  value: string
  onChange: (v: string) => void
  entityNames: string[]
}) {
  const [tab, setTab] = useState<'write' | 'preview'>('write')
  const known = new Set(entityNames.map((n) => n.trim()))

  return (
    <div className="rounded-xl border border-ink-700/60">
      <div className="flex items-center gap-1 border-b border-ink-700/60 px-2 py-1.5">
        {(['write', 'preview'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded px-2 py-1 text-xs capitalize transition-colors ${
              tab === t
                ? 'bg-ink-700/60 text-parchment-50'
                : 'text-parchment-300/60 hover:text-parchment-100'
            }`}
          >
            {t}
          </button>
        ))}
        <span className="ml-auto text-xs text-parchment-300/40">
          markdown · [[links]]
        </span>
      </div>

      {tab === 'write' ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Description, secrets, plot hooks…  Link others with [[Name]]."
          className="min-h-[320px] w-full resize-y bg-transparent px-4 py-3 font-mono text-sm leading-relaxed text-parchment-100 outline-none"
        />
      ) : (
        <div
          className="prose-invert min-h-[320px] space-y-2 px-4 py-3 text-sm leading-relaxed text-parchment-100 [&_code]:rounded [&_code]:bg-ink-950/60 [&_code]:px-1"
          dangerouslySetInnerHTML={{ __html: render(value, known) || '<p class="text-parchment-300/40">Nothing written yet.</p>' }}
        />
      )}
    </div>
  )
}
