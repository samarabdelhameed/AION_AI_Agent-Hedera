import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import HederaIntegration from './pages/HederaIntegration'
import ComparisonDashboard from './pages/ComparisonDashboard'
import './App.css'

function App() {
  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <h1>AION AI Agent - Hedera Integration</h1>
          <nav>
            <a href="/">Dashboard</a>
            <a href="/hedera">Hedera Integration</a>
            <a href="/comparison">Performance Comparison</a>
          </nav>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/hedera" element={<HederaIntegration />} />
            <Route path="/comparison" element={<ComparisonDashboard />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App