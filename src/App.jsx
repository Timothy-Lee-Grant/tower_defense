import React from 'react'
import { useGameStore, PHASE } from './store/gameStore.js'
import MainMenu from './components/MainMenu.jsx'
import GameScreen from './components/GameScreen.jsx'
import ResultsScreen from './components/ResultsScreen.jsx'
import VictoryScreen from './components/VictoryScreen.jsx'
import CampaignMap from './components/CampaignMap.jsx'

export default function App() {
  const phase = useGameStore(s => s.phase)

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {phase === PHASE.MENU         && <MainMenu />}
      {phase === PHASE.CAMPAIGN     && <CampaignMap />}
      {(phase === PHASE.PLAN || phase === PHASE.WAVE) && <GameScreen />}
      {phase === PHASE.RESULTS      && <ResultsScreen />}
      {phase === PHASE.VICTORY      && <VictoryScreen />}
    </div>
  )
}
