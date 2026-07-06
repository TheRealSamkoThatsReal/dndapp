import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, isLive } from '../db/db'
import { createSession, deleteSession, updateSession } from '../db/repo'
import { Button, Card, EmptyState } from '../ui/kit'
import type { CampaignContext } from './CampaignLayout'
import { NotesEditor } from '../components/NotesEditor'

type Pane = 'prep' | 'log' | 'recap'

export default function SessionsTab() {
  const { campaign } = useOutletContext<CampaignContext>()
  const [openId, setOpenId] = useState<string | null>(null)
  const [pane, setPane] = useState<Pane>('prep')

  const sessions = useLiveQuery(
    () =>
      db.sessions
        .where({ campaignId: campaign.id })
        .filter(isLive)
        .toArray()
        .then((rows) => rows.sort((a, b) => b.number - a.number)),
    [campaign.id],
  )

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <p className="text-sm text-parchment-300/60">
          {sessions?.length ?? 0} session{sessions?.length === 1 ? '' : 's'}
        </p>
        <Button
          variant="primary"
          onClick={async () => {
            const s = await createSession(campaign.id)
            setOpenId(s.id)
            setPane('prep')
          }}
        >
          + New Session
        </Button>
      </div>

      {sessions && sessions.length === 0 && (
        <EmptyState
          icon="📅"
          title="No sessions logged"
          hint="Plan prep before play, capture notes during, and write a recap after — each session in one place."
        />
      )}

      <div className="space-y-2">
        {sessions?.map((s) => (
          <Card key={s.id} className="overflow-hidden">
            <button
              onClick={() => setOpenId(openId === s.id ? null : s.id)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left"
            >
              <span className="grid h-9 w-9 place-items-center rounded-full bg-ink-700/60 font-serif text-sm text-ember-400">
                {s.number}
              </span>
              <input
                value={s.title}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => updateSession(s.id, { title: e.target.value })}
                className="flex-1 bg-transparent font-medium text-parchment-50 outline-none"
              />
              <input
                type="date"
                value={s.date ?? ''}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) =>
                  updateSession(s.id, { date: e.target.value || null })
                }
                className="rounded border border-ink-700 bg-ink-950/40 px-2 py-1 text-xs text-parchment-300/70 outline-none"
              />
            </button>

            {openId === s.id && (
              <div className="space-y-3 border-t border-ink-700/60 p-4">
                <div className="flex gap-1">
                  {(['prep', 'log', 'recap'] as Pane[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPane(p)}
                      className={`rounded-full px-3 py-1 text-xs capitalize transition-colors ${
                        pane === p
                          ? 'bg-ember-500 text-ink-950'
                          : 'border border-ink-700 text-parchment-300/70'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <Button
                    variant="danger"
                    className="ml-auto text-xs"
                    onClick={() => {
                      deleteSession(s.id)
                      setOpenId(null)
                    }}
                  >
                    Delete
                  </Button>
                </div>
                <NotesEditor
                  key={pane}
                  value={s[pane]}
                  onChange={(v) => updateSession(s.id, { [pane]: v })}
                  entityNames={[]}
                />
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
