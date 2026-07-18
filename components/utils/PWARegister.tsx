'use client'

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_KEY

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PWARegister() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Capture the install prompt so we can trigger it from our own UI
    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // Hide banner if already installed
    const installedHandler = () => setInstallPrompt(null)
    window.addEventListener('appinstalled', installedHandler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installedHandler)
    }
  }, [])

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then(async (registration) => {
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data?.type === 'PT_SYNC_COMPLETE') {
            console.info(`[PackTracker] ${event.data.count} queued action(s) synced.`)
          }
        })

        if (!VAPID_PUBLIC_KEY) return
        if (Notification.permission === 'denied') return

        const existing = await registration.pushManager.getSubscription()
        if (existing) return

        if (Notification.permission !== 'granted') {
          const permission = await Notification.requestPermission()
          if (permission !== 'granted') return
        }

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        })

        await fetch('/api/packtracker/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription.toJSON()),
        }).catch(() => {})
      })
      .catch(() => {})
  }, [])

  async function handleInstall() {
    if (!installPrompt) return
    await installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') setInstallPrompt(null)
    else setDismissed(true)
  }

  if (!installPrompt || dismissed) return null

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border"
      style={{
        background: 'var(--background-card)',
        borderColor: 'var(--border-crimson)',
        boxShadow: 'var(--shadow-crimson), var(--shadow-lg)',
        maxWidth: '320px',
      }}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: 'rgba(71,0,0,0.25)', border: '1px solid var(--border-crimson)' }}
      >
        <Download size={18} style={{ color: 'var(--accent-primary)' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
          Install House Wolf
        </p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Add to home screen for offline access
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={handleInstall}
          className="px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all hover:brightness-110"
          style={{ background: 'var(--accent-primary)', color: 'var(--text-primary)' }}
        >
          Install
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="w-7 h-7 flex items-center justify-center rounded-md transition-all hover:brightness-125"
          style={{ color: 'var(--text-muted)' }}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}
