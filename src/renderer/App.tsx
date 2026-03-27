import { HashRouter, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import Loading from './pages/Loading'
import GetStarted from './pages/GetStarted'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import ExcelSheet from './pages/ExcelSheet'
import Settings from './pages/Settings'

function App() {
  useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark')
    }
  }, [])

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Loading />} />
        <Route path="/get-started" element={<GetStarted />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/excel" element={<ExcelSheet />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </HashRouter>
  )
}

export default App