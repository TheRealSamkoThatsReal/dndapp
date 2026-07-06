import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, isLive } from '../db/db'
import { createCampaign } from '../db/repo'
import { Button, Card, EmptyState, PageHeader } from '../ui/kit'

const ACCENTS = ['#d6872b', '#b23a3a', '#6b8a4f', '#7c6bd6', '#3a7ca5', '#c05e9e']

export default function Campaigns() {
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')

  const campaigns = useLiveQuery(
    () =>
      db.campaigns
        .orderBy('updatedAt')
        .reverse()
        .filter(isLive)
        .toArray(),
    [],
  )

  async function submit() {
    const accent = ACCENTS[(campaigns?.length ?? 0) % ACCENTS.length]
    const c = await createCampaign(name, accent)
    setName('')
    setCreating(false)
    navigate(`/c/${c.id}`)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Your Campaigns"
        subtitle="Everything lives on this device and syncs to your account."
        actions={
          <Button variant="primary" onClick={() => setCreating(true)}>
            + New Campaign
          </Button>
        }
      />

      {creating && (
        <Card className="p-4">
          <label className="mb-2 block text-sm text-parchment-300/70">
            Campaign name
          </label>
          <div className="flex gap-2">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="Curse of the Ashen Crown"
              className="flex-1 rounded-lg border border-ink-700 bg-ink-950/50 px-3 py-2 text-parchment-50 outline-none focus:border-ember-500"
            />
            <Button variant="primary" onClick={submit}>
              Create
            </Button>
            <Button onClick={() => setCreating(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      {campaigns && campaigns.length === 0 && !creating && (
        <EmptyState
          icon="🗡️"
          title="No campaigns yet"
          hint="Create your first campaign to start tracking NPCs, sessions, encounters, and characters."
          action={
            <Button variant="primary" onClick={() => setCreating(true)}>
              + New Campaign
            </Button>
          }
        />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {campaigns?.map((c) => (
          <Card
            key={c.id}
            onClick={() => navigate(`/c/${c.id}`)}
            className="overflow-hidden"
          >
            <div className="h-2" style={{ background: c.accent }} />
            <div className="p-4">
              <h3 className="font-serif text-lg font-semibold text-parchment-50">
                {c.name}
              </h3>
              <p className="mt-1 line-clamp-2 text-sm text-parchment-300/60">
                {c.blurb || 'No description yet.'}
              </p>
              <p className="mt-3 text-xs text-parchment-300/40">
                Updated {new Date(c.updatedAt).toLocaleDateString()}
              </p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
