import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import { AuthProvider } from './auth/AuthProvider.tsx'
import { SyncProvider } from './sync/SyncProvider.tsx'
import { DiceProvider } from './dice/DiceContext.tsx'
import RootLayout from './App.tsx'
import Campaigns from './routes/Campaigns.tsx'
import CampaignLayout from './routes/CampaignLayout.tsx'
import EntitiesTab from './routes/EntitiesTab.tsx'
import SessionsTab from './routes/SessionsTab.tsx'
import CombatTab from './routes/CombatTab.tsx'
import CharactersTab from './routes/CharactersTab.tsx'

// Vite's BASE_URL is '/dndapp/' in the Pages build and '/' in dev.
// React Router wants a basename without a trailing slash.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

const router = createBrowserRouter(
  [
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Campaigns /> },
      {
        path: 'c/:campaignId',
        element: <CampaignLayout />,
        children: [
          { index: true, element: <EntitiesTab /> },
          { path: 'sessions', element: <SessionsTab /> },
          { path: 'combat', element: <CombatTab /> },
          { path: 'characters', element: <CharactersTab /> },
        ],
      },
    ],
  },
  ],
  { basename },
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <SyncProvider>
        <DiceProvider>
          <RouterProvider router={router} />
        </DiceProvider>
      </SyncProvider>
    </AuthProvider>
  </StrictMode>,
)
