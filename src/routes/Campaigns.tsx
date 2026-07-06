import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, isLive } from '../db/db'
import { createCampaign } from '../db/repo'
import { useAuth } from '../auth/AuthProvider'
import { joinCampaign } from '../sync/engine'
import { Button, Card, EmptyState, PageHeader } from '../ui/kit'
import { roleFor } from './CampaignLayout'

const ACCENTS = ['#d6872b', '#b23a3a', '#6b8a4f', '#7c6bd6', '#3a7ca5', '#c05e9e']

export default function Campaigns() {
  const navigate = useNavigate()
  const { user, configured } = useAuth()
  const myUid = user?.id ?? null

  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [joining, setJoining] = useState(false)
  const [code, setCode] = useState('')
  const [joinMsg, setJoinMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const campaigns = useLiveQuery(
    () =>
      db.campaigns.orderBy('updatedAt').reverse().filter(isLive).toArray(),
    [],
  )

  async function submitCreate() {
    const accent = ACCENTS[(campaigns?.length ?? 0) % ACCENTS.length]
    const c = await createCampaign(name, accent)
    setName('')
    setCreating(false)
    navigate(`/c/${c.id}`)
  }

  async function submitJoin() {
    if (!myUid) return
    setBusy(true)
    setJoinMsg(null)
    const res = await joinCampaign(myUid, code)
    setBusy(false)
    if (!res.ok) {
      setJoinMsg(res.error ?? 'Could not join.')
      return
    }
    setCode('')
    setJoining(false)
    if (res.campaignId) navigate(`/c/${res.campaignId}/combat`)
  }

  const open = (id: string, role: 'dm' | 'player') =>
    navigate(role === 'player' ? `/c/${id}/combat` : `/c/${id}`)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Your Campaigns"
        subtitle="Everything lives on this device and syncs to your account."
        actions={
          <>
            {configured && (
              <Button onClick={() => setJoining(true)} disabled={!user}>
                {user ? 'Join with code' : 'Sign in to join'}
              </Button>
            )}
            <Button variant="primary" onClick={() => setCreating(true)}>
              + New Campaign
            </Button>
          </>
        }
      />

      {joining && (
        <Card className="p-4">
          <label className="mb-2 block text-sm text-parchment-300/70">
            Enter your DM's invite code
          </label>
          <div className="flex gap-2">
            <input
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && submitJoin()}
              placeholder="ABC123"
              className="flex-1 rounded-lg border border-ink-700 bg-ink-950/50 px-3 py-2 font-mono tracking-widest text-parchment-50 outline-none focus:border-ember-500"
            />
            <Button variant="primary" onClick={submitJoin} disabled={busy || !code}>
              {busy ? '…' : 'Join'}
            </Button>
            <Button onClick={() => setJoining(false)}>Cancel</Button>
          </div>
          {joinMsg && <p className="mt-2 text-sm text-blood-500">{joinMsg}</p>}
        </Card>
      )}

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
              onKeyDown={(e) => e.key === 'Enter' && submitCreate()}
              placeholder="Curse of the Ashen Crown"
              className="flex-1 rounded-lg border border-ink-700 bg-ink-950/50 px-3 py-2 text-parchment-50 outline-none focus:border-ember-500"
            />
            <Button variant="primary" onClick={submitCreate}>
              Create
            </Button>
            <Button onClick={() => setCreating(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      {campaigns && campaigns.length === 0 && !creating && !joining && (
        <EmptyState
          icon="🗡️"
          title="No campaigns yet"
          hint="Create a campaign to run as DM, or join one with an invite code from your DM."
          action={
            <Button variant="primary" onClick={() => setCreating(true)}>
              + New Campaign
            </Button>
          }
        />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {campaigns?.map((c) => {
          const role = roleFor(c, myUid)
          return (
            <Card key={c.id} onClick={() => open(c.id, role)} className="overflow-hidden">
              <div className="h-2" style={{ background: c.accent }} />
              <div className="p-4">
                <div className="flex items-center gap-2">
                  <h3 className="flex-1 font-serif text-lg font-semibold text-parchment-50">
                    {c.name}
                  </h3>
                  {role === 'player' && (
                    <span className="rounded-full bg-arcane-500/20 px-2 py-0.5 text-xs text-arcane-500">
                      Player
                    </span>
                  )}
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-parchment-300/60">
                  {c.blurb || (role === 'player' ? 'A campaign you joined.' : 'No description yet.')}
                </p>
                <p className="mt-3 text-xs text-parchment-300/40">
                  Updated {new Date(c.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
