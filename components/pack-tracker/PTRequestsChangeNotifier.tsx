'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { RefreshCw } from 'lucide-react'

export default function PTRequestsChangeNotifier() {
  const [hasUpdate, setHasUpdate] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel('pt-requests-watch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pt_requests' }, () => {
        setHasUpdate(true)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase])

  if (!hasUpdate) return null

  return (
    <button
      onClick={() => window.location.reload()}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold shadow-lg transition-all hover:scale-105"
      style={{
        background: 'var(--accent-secondary)',
        color: 'var(--text-primary)',
        boxShadow: 'var(--shadow-teal)',
      }}
    >
      <RefreshCw size={14} />
      Requests updated — tap to refresh
    </button>
  )
}
