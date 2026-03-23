import { memo, useEffect } from 'react'
import Dashboard from './Dashboard'
import useSettingsStore from '../store/useSettingsStore'

const ProgramDashboard = memo(function ProgramDashboard() {
  const setPage = useSettingsStore((state) => state.setPage)

  useEffect(() => {
    setPage('dashboard')
  }, [setPage])

  return <Dashboard />
})

export default ProgramDashboard
