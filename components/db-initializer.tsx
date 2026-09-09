'use client'

import { useEffect } from 'react'
import { loginCashier } from '@/app/actions/admin-actions'

export function DbInitializer() {
  useEffect(() => {
    // Initialize database on first load
    const initDb = async () => {
      try {
        // Try to login with test credentials to trigger database initialization
        await loginCashier('desouk@admin.com', 'password123').catch(() => {})
      } catch (error) {
        console.error('Database initialization error:', error)
      }
    }

    // Initialize database once per session
    const hasInitialized = sessionStorage.getItem('db-initialized')
    if (!hasInitialized) {
      initDb()
      sessionStorage.setItem('db-initialized', 'true')
    }
  }, [])

  return null
}
