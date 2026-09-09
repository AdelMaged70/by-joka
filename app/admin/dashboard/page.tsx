'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getBranchOrders, updateOrderStatus, deleteOrder, getBranchStatus, updateBranchStatus } from '@/app/actions/admin-actions'
import { supabaseClient } from '@/lib/supabase-admin'

// ────── NOTIFICATION TYPES ──────
interface PendingNotification {
  orderId: string
  customerName: string
  total: number
  time: string
}

interface Cashier {
  id: string
  email: string
  name: string
  branchId: string
  branchName: string
  branchCity: string
}

interface OrderItem {
  id: string
  product_name: string
  product_name_ar?: string
  product_id: string
  quantity: number
  price: number
}

interface Order {
  id: string
  customer_name: string
  customer_phone: string
  customer_email: string
  customer_address: string
  total_price: number
  status: 'pending' | 'done' | 'canceled'
  notes: string
  created_at: string
  order_items: OrderItem[]
}

const STATUS_CONFIG = {
  pending: { label: 'قيد الانتظار', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', icon: '⏳', next: 'done' as const },
  done:    { label: 'مكتمل',       color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', icon: '✅', next: 'canceled' as const },
  canceled:{ label: 'ملغى',        color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)',  icon: '❌', next: 'pending' as const },
}

const POLL_INTERVAL = 30000 // 30 seconds
const NOTIFY_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'

function formatTime(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
}
function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [cashier, setCashier] = useState<Cashier | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'done' | 'canceled'>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [isStoreOpen, setIsStoreOpen] = useState(true)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [realtimeStatus, setRealtimeStatus] = useState<'CONNECTING' | 'SUBSCRIBED' | 'ERROR' | 'OFF'>('OFF')
  
  // ────── NEW: Unacknowledged orders state ──────
  const [unacknowledgedOrders, setUnacknowledgedOrders] = useState<PendingNotification[]>([])

  const pollRef = useRef<NodeJS.Timeout | null>(null)
  const branchRef = useRef<string>('')
  const soundLoopRef = useRef<NodeJS.Timeout | null>(null)
  const titleFlashRef = useRef<NodeJS.Timeout | null>(null)
  const originalTitleRef = useRef('by Joka - Dashboard')

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const playNotificationSound = useCallback(() => {
    if (!notificationsEnabled) return
    try {
      const audio = new Audio(NOTIFY_SOUND_URL)
      audio.volume = 1
      const playPromise = audio.play()
      if (playPromise !== undefined) {
        playPromise.catch(() => {})
      }
    } catch {
      // Silently ignore errors
    }
  }, [notificationsEnabled])

  // ────── NEW: Start repeating sound loop until acknowledged ──────
  const startSoundLoop = useCallback(() => {
    // Clear any existing loop
    if (soundLoopRef.current) clearInterval(soundLoopRef.current)
    // Play immediately
    playNotificationSound()
    // Then repeat every 5 seconds
    soundLoopRef.current = setInterval(() => {
      playNotificationSound()
    }, 5000)
  }, [playNotificationSound])

  const stopSoundLoop = useCallback(() => {
    if (soundLoopRef.current) {
      clearInterval(soundLoopRef.current)
      soundLoopRef.current = null
    }
  }, [])

  // ────── NEW: Title flashing for browser tab ──────
  const startTitleFlash = useCallback(() => {
    if (titleFlashRef.current) return
    let isOriginal = true
    titleFlashRef.current = setInterval(() => {
      document.title = isOriginal ? '🔔 طلب جديد!' : originalTitleRef.current
      isOriginal = !isOriginal
    }, 1000)
  }, [])

  const stopTitleFlash = useCallback(() => {
    if (titleFlashRef.current) {
      clearInterval(titleFlashRef.current)
      titleFlashRef.current = null
    }
    document.title = originalTitleRef.current
  }, [])

  // ────── NEW: Send native browser notification ──────
  const sendBrowserNotification = useCallback(async (customerName: string, total: number, count: number) => {
    console.log('🔔 Triggering notification:', { customerName, total, count });
    
    if (!('Notification' in window)) return;
    
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }
    
    if (Notification.permission !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }

    try {
      // ────── AGGREGATION & RESET LOGIC ──────
      // Use a fixed tag so the OS knows to replace the old alert with the new one
      const notificationTag = 'shrimp-house-alert';
      
      const title = count > 1 ? `🔔 ولديك ${count} طلبات جديدة!` : 'طلب جديد - by Joka';
      const body = count > 1 
        ? `هناك ${count} طلبات تنتظر مراجعتك الآن`
        : `${customerName} - ${total.toFixed(0)} ج.م`;

      const options: any = {
        body,
        icon: '/images/logo.png', // Verified path
        badge: '/images/logo.png',
        tag: notificationTag,
        requireInteraction: true,
        vibrate: [200, 100, 200],
        silent: false,
        renotify: true, // Forces sound/vibration even with same tag
        actions: [
          { action: 'view', title: '👁️ عرض الطلبات' }
        ]
      };

      // We prefer the standard Notification for dashboard focus 
      // but we will close any existing one with the same tag if possible via SW 
      // or just trust the 'renotify: true' behavior.
      
      let notif: Notification | null = null;

      // Try SW first for actions support
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          // Explicitly close old ones to ensure the new one "pops"
          const old = await reg.getNotifications({ tag: notificationTag });
          old.forEach(n => n.close());
          
          await reg.showNotification(title, options);
          
          // Auto-close after 10 seconds
          setTimeout(async () => {
            const current = await reg.getNotifications({ tag: notificationTag });
            current.forEach(n => n.close());
          }, 10000);
          return;
        }
      }

      // Fallback to standard
      notif = new Notification(title, options);
      notif.onclick = () => {
        window.focus();
        notif?.close();
      };
      
      // Auto-close after 10 seconds
      setTimeout(() => notif?.close(), 10000);
    } catch (e) {
      console.error('Notification error detail:', e);
    }
  }, [])

  // ────── NEW: Acknowledge all pending notifications ──────
  const acknowledgeOrders = useCallback(() => {
    setUnacknowledgedOrders([])
    stopSoundLoop()
    stopTitleFlash()
  }, [stopSoundLoop, stopTitleFlash])

  // ────── NEW: Handle incoming new order notification ──────
  const handleNewOrderNotification = useCallback((orderData: { id: string; customer_name?: string; total_price?: number; created_at?: string }) => {
    const notification: PendingNotification = {
      orderId: orderData.id || 'unknown',
      customerName: orderData.customer_name || 'عميل',
      total: Number(orderData.total_price) || 0,
      time: orderData.created_at || new Date().toISOString(),
    }
    
    setUnacknowledgedOrders(prev => {
      // Avoid duplicates
      if (prev.some(n => n.orderId === notification.orderId)) return prev
      const newList = [...prev, notification]
      
      // Native browser notification with the new count
      sendBrowserNotification(notification.customerName, notification.total, newList.length)
      
      return newList
    })

    // Start repeating sound
    startSoundLoop()
    // Flash title
    startTitleFlash()
    // Toast
    showToast('🔔 طلب جديد وارد الآن!', 'success')
  }, [startSoundLoop, startTitleFlash, sendBrowserNotification])

  const testNotification = (e: React.MouseEvent) => {
    e.stopPropagation()
    handleNewOrderNotification({
      id: 'test-' + Date.now(),
      customer_name: 'تجربة',
      total_price: 150,
      created_at: new Date().toISOString(),
    })
  }

  const fetchStatus = useCallback(async (branchId: string) => {
    const res = await getBranchStatus(branchId)
    if (res.success) setIsStoreOpen(res.isOpen)
  }, [])

  const handleStoreStatusToggle = async () => {
    if (!cashier || isUpdatingStatus) return
    setIsUpdatingStatus(true)
    const newValue = !isStoreOpen
    const res = await updateBranchStatus(cashier.branchId, newValue)
    if (res.success) {
      setIsStoreOpen(newValue)
      showToast(newValue ? 'تم فتح المطعم لاستقبال الطلبات' : 'تم إغلاق المطعم وتوقف استقبال الطلبات', newValue ? 'success' : 'error')
    } else {
      showToast('فشل تحديث حالة المطعم', 'error')
    }
    setIsUpdatingStatus(false)
  }

  const fetchOrders = useCallback(async (branchId: string, silent = false) => {
    if (!silent) setIsLoading(true)
    try {
      // Sync any recently completed Paymob payments automatically
      await fetch('/api/paymob/sync-status').catch(() => {})
    } catch {
      // Silently ignore sync errors
    }

    const result = await getBranchOrders(branchId)
    if (result.success) {
      setOrders(result.orders as Order[])
      setLastRefresh(new Date())
    } else if (!silent) {
      showToast('فشل تحميل الطلبات', 'error')
    }
    if (!silent) setIsLoading(false)
  }, [])

  useEffect(() => {
    const stored = localStorage.getItem('cashier')
    if (!stored) { router.push('/admin/login'); return }
    const c = JSON.parse(stored) as Cashier
    setCashier(c)
    branchRef.current = c.branchId
    fetchOrders(c.branchId)
    fetchStatus(c.branchId)

    const notifySetting = localStorage.getItem(`notifications_${c.branchId}`)
    if (notifySetting === 'true') setNotificationsEnabled(true)

    pollRef.current = setInterval(() => {
      if (branchRef.current) fetchOrders(branchRef.current, true)
    }, POLL_INTERVAL)

    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [fetchOrders, router, fetchStatus])

  // ────── NEW: Register Service Worker for better notifications ──────
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.error('Service Worker registration failed:', err)
      })
    }
  }, [])

  // ────── NEW: Listen for Service Worker messages and Tab Focus to acknowledge orders ──────
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'NOTIFICATION_CLICKED') {
        acknowledgeOrders()
      }
    }

    const handleFocus = () => {
      if (document.visibilityState === 'visible' || document.hasFocus()) {
        acknowledgeOrders()
      }
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleMessage)
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleFocus)

    // Handle initial state if page is focused
    if (document.visibilityState === 'visible' || document.hasFocus()) {
      const timer = setTimeout(handleFocus, 500)
      return () => {
        clearTimeout(timer)
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.removeEventListener('message', handleMessage)
        }
        window.removeEventListener('focus', handleFocus)
        document.removeEventListener('visibilitychange', handleFocus)
      }
    }

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleMessage)
      }
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleFocus)
    }
  }, [acknowledgeOrders])

  // ────── NEW: Request browser notification permission when notifications enabled ──────
  useEffect(() => {
    if (notificationsEnabled && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [notificationsEnabled])

  // ────── NEW: Cleanup sound loop and title flash on unmount ──────
  useEffect(() => {
    return () => {
      stopSoundLoop()
      stopTitleFlash()
    }
  }, [stopSoundLoop, stopTitleFlash])

  const ordersRef = useRef<Order[]>([])
  useEffect(() => {
    ordersRef.current = orders
  }, [orders])

  // Realtime Subscription with improved logging
  useEffect(() => {
    if (!notificationsEnabled || !cashier) {
      setRealtimeStatus('OFF')
      return
    }

    setRealtimeStatus('CONNECTING')
    console.log('Attempting to subscribe to orders for branch:', cashier.branchId)

    const channel = supabaseClient
      .channel(`orders-branch-${cashier.branchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          console.log('REALTIME: Received postgres event!', payload.eventType, payload)
          
          // Verify it's for this branch
          if (payload.new && (payload.new as any).branch_id === cashier.branchId) {
            const newOrder = payload.new as any
            const isPending = newOrder.status === 'pending'

            if (isPending) {
              // Trigger notification:
              // 1. If it's a new INSERT order that is pending
              // 2. OR it is an UPDATE and the order was not pending in our active dashboard state
              const previouslyPending = ordersRef.current.some(o => o.id === newOrder.id && o.status === 'pending')
              
              if (!previouslyPending) {
                console.log('MATCH: New active order alert triggered!')
                fetchOrders(cashier.branchId, true)
                handleNewOrderNotification({
                  id: newOrder.id,
                  customer_name: newOrder.customer_name,
                  total_price: newOrder.total_price,
                  created_at: newOrder.created_at
                })
                return
              }
            }
            
            // Otherwise, silently refresh to update state
            fetchOrders(cashier.branchId, true)
          }
        }
      )
      .subscribe((status, err) => {
        console.log('Realtime Status:', status, err || '')
        if (status === 'SUBSCRIBED') {
          setRealtimeStatus('SUBSCRIBED')
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setRealtimeStatus('ERROR')
          console.error('Realtime connection issue detected:', status)
          // Delayed reload for Chrome as requested
          setTimeout(() => {
            window.location.reload()
          }, 3000)
        }
      })

    return () => {
      console.log('Cleaning up realtime channel')
      supabaseClient.removeChannel(channel)
    }
  }, [notificationsEnabled, cashier, fetchOrders, handleNewOrderNotification])

  const toggleNotifications = async () => {
    const newValue = !notificationsEnabled
    setNotificationsEnabled(newValue)
    if (cashier) {
      localStorage.setItem(`notifications_${cashier.branchId}`, String(newValue))
    }
    // Unlock audio on first user interaction
    if (newValue) {
      try {
        const testAudio = new Audio(NOTIFY_SOUND_URL)
        testAudio.volume = 0
        await testAudio.play()
        testAudio.pause()
      } catch {
        // Silently ignore - will try again on next notification
      }
    }
    showToast(newValue ? 'تم تفعيل التنبيهات' : 'تم إيقاف التنبيهات')
  }

  const handleStatusChange = async (orderId: string, status: 'pending' | 'done' | 'canceled') => {
    if (!cashier || updatingId) return
    setUpdatingId(orderId)
    const result = await updateOrderStatus(orderId, status, cashier.branchId)
    if (result.success) {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o))
      showToast('تم تحديث حالة الطلب')
    } else {
      showToast('فشل تحديث الحالة', 'error')
    }
    setUpdatingId(null)
  }

  const handleDelete = async (orderId: string) => {
    if (!cashier) return
    setDeletingId(orderId)
    setConfirmDelete(null)
    const result = await deleteOrder(orderId, cashier.branchId)
    if (result.success) {
      setOrders(prev => prev.filter(o => o.id !== orderId))
      showToast('تم حذف الطلب بنجاح')
    } else {
      showToast('فشل حذف الطلب', 'error')
    }
    setDeletingId(null)
  }

  const handleLogout = () => {
    localStorage.removeItem('cashier')
    router.push('/admin/login')
  }

  const filtered = orders.filter(o => statusFilter === 'all' || o.status === statusFilter)
  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    done: orders.filter(o => o.status === 'done').length,
    canceled: orders.filter(o => o.status === 'canceled').length,
    revenue: orders.filter(o => o.status !== 'canceled').reduce((s, o) => s + Number(o.total_price), 0),
  }

  if (!cashier) return null

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }

        .dash-page {
          min-height: 100vh;
          background: #080d16;
          color: #e2e8f0;
          font-family: 'Tajawal', sans-serif;
          direction: rtl;
        }

        /* ────── HEADER ────── */
        .dash-header {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(8, 13, 22, 0.95);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(0,160,220,0.15);
          padding: 0 1.5rem;
        }

        .dash-header-inner {
          max-width: 1400px;
          margin: 0 auto;
          height: 65px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }

        .header-brand {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .brand-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: linear-gradient(135deg, #0070c0, #00b4d8);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
          flex-shrink: 0;
        }

        .brand-name { font-weight: 800; font-size: 1.1rem; color: #fff; line-height: 1.1; }
        .brand-branch { font-size: 0.78rem; color: rgba(0,200,255,0.7); font-weight: 500; }

        .header-right {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .cashier-pill {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.4rem 0.9rem;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 50px;
          font-size: 0.82rem;
          color: rgba(255,255,255,0.6);
        }

        .refresh-info {
          font-size: 0.72rem;
          color: rgba(255,255,255,0.25);
          white-space: nowrap;
        }

        .header-btn {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.5rem 1rem;
          border: 1px solid rgba(0,160,220,0.3);
          border-radius: 10px;
          background: transparent;
          color: rgba(0,200,255,0.8);
          font-family: 'Tajawal', sans-serif;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .header-btn:hover { background: rgba(0,160,220,0.1); border-color: rgba(0,160,220,0.5); }
        .header-btn.logout { border-color: rgba(239,68,68,0.3); color: rgba(255,100,100,0.8); }
        .header-btn.logout:hover { background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.5); }

        /* ────── BODY ────── */
        .dash-body {
          max-width: 1400px;
          margin: 0 auto;
          padding: 1.5rem;
        }

        /* ────── STATS CARDS ────── */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .stat-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          padding: 1.25rem;
          transition: all 0.2s;
          cursor: pointer;
        }

        .stat-card:hover { border-color: rgba(0,160,220,0.25); background: rgba(0,160,220,0.04); }
        .stat-card.active { border-color: rgba(0,160,220,0.5); background: rgba(0,160,220,0.08); }

        .stat-icon { font-size: 1.5rem; margin-bottom: 0.5rem; }
        .stat-value { font-size: 2rem; font-weight: 800; color: #fff; line-height: 1; margin-bottom: 0.25rem; }
        .stat-label { font-size: 0.8rem; color: rgba(255,255,255,0.4); font-weight: 500; }

        .stat-card.pending .stat-value  { color: #f59e0b; }
        .stat-card.done .stat-value    { color: #10b981; }
        .stat-card.canceled .stat-value { color: #ef4444; }
        .stat-card.revenue .stat-value  { font-size: 1.4rem; color: #60a5fa; }

        /* ────── FILTERS ────── */
        .filter-bar {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1.25rem;
          flex-wrap: wrap;
        }

        .filter-btn {
          padding: 0.45rem 1rem;
          border-radius: 50px;
          border: 1px solid rgba(255,255,255,0.1);
          background: transparent;
          color: rgba(255,255,255,0.5);
          font-family: 'Tajawal', sans-serif;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .filter-btn:hover { border-color: rgba(255,255,255,0.25); color: rgba(255,255,255,0.8); }
        .filter-btn.active {
          background: linear-gradient(135deg, #0070c0, #00b4d8);
          border-color: transparent;
          color: #fff;
        }

        .filter-count {
          margin-right: 0.4rem;
          padding: 0 0.4rem;
          background: rgba(255,255,255,0.15);
          border-radius: 50px;
          font-size: 0.7rem;
        }

        .refresh-btn {
          margin-right: auto;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.45rem 0.9rem;
          border: 1px solid rgba(0,160,220,0.25);
          border-radius: 50px;
          background: transparent;
          color: rgba(0,200,255,0.7);
          font-family: 'Tajawal', sans-serif;
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .refresh-btn:hover { background: rgba(0,160,220,0.1); }
        .refresh-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; display: inline-block; }

        /* ────── ORDERS ────── */
        .orders-grid {
          display: grid;
          gap: 1rem;
        }

        .order-card {
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 18px;
          overflow: hidden;
          transition: all 0.2s;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

        .order-card:hover { border-color: rgba(0,160,220,0.2); box-shadow: 0 4px 24px rgba(0,0,0,0.2); }
        .order-card.pending { border-right: 3px solid #f59e0b; }
        .order-card.done    { border-right: 3px solid #10b981; }
        .order-card.canceled { border-right: 3px solid #ef4444; }

        .order-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.25rem;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          gap: 1rem;
          flex-wrap: wrap;
        }

        .order-customer {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .customer-avatar {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: linear-gradient(135deg, rgba(0,112,192,0.3), rgba(0,180,216,0.3));
          border: 1px solid rgba(0,160,220,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.1rem;
          flex-shrink: 0;
        }

        .customer-name { font-weight: 700; font-size: 1rem; color: #fff; }
        .customer-phone { font-size: 0.82rem; color: rgba(0,200,255,0.7); direction: ltr; }

        .order-meta {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .order-time {
          font-size: 0.78rem;
          color: rgba(255,255,255,0.3);
          text-align: left;
        }

        .order-id {
          font-size: 0.72rem;
          color: rgba(255,255,255,0.2);
          font-family: monospace;
        }

        /* ────── ORDER BODY ────── */
        .order-body {
          padding: 1rem 1.25rem;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        @media (max-width: 640px) {
          .order-body { grid-template-columns: 1fr; }
        }

        .items-section { }

        .section-title {
          font-size: 0.78rem;
          font-weight: 700;
          color: rgba(255,255,255,0.35);
          text-transform: uppercase;
          letter-spacing: 0.8px;
          margin-bottom: 0.6rem;
        }

        .item-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.4rem 0;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          font-size: 0.88rem;
        }

        .item-name { color: rgba(255,255,255,0.8); }
        .item-qty { color: rgba(255,255,255,0.4); font-size: 0.8rem; margin-right: 0.4rem; }
        .item-price { color: #60a5fa; font-weight: 600; font-size: 0.82rem; }

        .total-row {
          display: flex;
          justify-content: space-between;
          padding-top: 0.6rem;
          margin-top: 0.25rem;
          font-weight: 800;
          font-size: 1rem;
          color: #fff;
        }

        .total-amount { color: #10b981; }

        .notes-box {
          background: rgba(245,158,11,0.07);
          border: 1px solid rgba(245,158,11,0.2);
          border-radius: 10px;
          padding: 0.6rem 0.75rem;
          font-size: 0.85rem;
          color: rgba(245,158,11,0.9);
          margin-top: 0.5rem;
        }

        .notes-label { font-size: 0.72rem; color: rgba(245,158,11,0.5); margin-bottom: 0.2rem; font-weight: 700; }

        .info-section { }

        .info-row {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          font-size: 0.84rem;
          color: rgba(255,255,255,0.55);
          padding: 0.3rem 0;
        }

        .info-icon { flex-shrink: 0; font-size: 0.9rem; margin-top: 1px; }
        .info-text { color: rgba(255,255,255,0.7); }

        /* ────── ORDER FOOTER ────── */
        .order-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.9rem 1.25rem;
          border-top: 1px solid rgba(255,255,255,0.05);
          background: rgba(0,0,0,0.15);
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .status-btns {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .status-btn {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.45rem 0.9rem;
          border-radius: 8px;
          border: 1px solid;
          font-family: 'Tajawal', sans-serif;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .status-btn.pending {
          border-color: rgba(245,158,11,0.35);
          background: rgba(245,158,11,0.1);
          color: #f59e0b;
        }
        .status-btn.pending:hover, .status-btn.pending.current {
          background: rgba(245,158,11,0.2);
          border-color: rgba(245,158,11,0.6);
        }

        .status-btn.done {
          border-color: rgba(16,185,129,0.35);
          background: rgba(16,185,129,0.1);
          color: #10b981;
        }
        .status-btn.done:hover, .status-btn.done.current {
          background: rgba(16,185,129,0.2);
          border-color: rgba(16,185,129,0.6);
        }

        .status-btn.canceled {
          border-color: rgba(239,68,68,0.35);
          background: rgba(239,68,68,0.1);
          color: #ef4444;
        }
        .status-btn.canceled:hover, .status-btn.canceled.current {
          background: rgba(239,68,68,0.2);
          border-color: rgba(239,68,68,0.6);
        }

        .status-btn.current { box-shadow: 0 0 8px rgba(255,255,255,0.1); }
        .status-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .delete-btn {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.45rem 0.9rem;
          border-radius: 8px;
          border: 1px solid rgba(239,68,68,0.25);
          background: transparent;
          color: rgba(239,68,68,0.6);
          font-family: 'Tajawal', sans-serif;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .delete-btn:hover { background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.5); color: #ef4444; }
        .delete-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        /* ────── CONFIRM DIALOG ────── */
        .confirm-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(4px);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }

        .confirm-box {
          background: #0d1929;
          border: 1px solid rgba(239,68,68,0.35);
          border-radius: 20px;
          padding: 2rem;
          max-width: 380px;
          width: 100%;
          text-align: center;
          animation: popIn 0.25s ease;
        }

        @keyframes popIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }

        .confirm-icon { font-size: 2.5rem; margin-bottom: 0.75rem; }
        .confirm-title { font-size: 1.1rem; font-weight: 800; color: #fff; margin-bottom: 0.5rem; }
        .confirm-desc { font-size: 0.88rem; color: rgba(255,255,255,0.45); margin-bottom: 1.5rem; }

        .confirm-btns { display: flex; gap: 0.75rem; justify-content: center; }

        .btn-cancel-confirm {
          flex: 1;
          padding: 0.7rem;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          background: transparent;
          color: rgba(255,255,255,0.6);
          font-family: 'Tajawal', sans-serif;
          font-size: 0.9rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-cancel-confirm:hover { background: rgba(255,255,255,0.05); }

        .btn-confirm-delete {
          flex: 1;
          padding: 0.7rem;
          border: none;
          border-radius: 10px;
          background: linear-gradient(135deg, #dc2626, #ef4444);
          color: #fff;
          font-family: 'Tajawal', sans-serif;
          font-size: 0.9rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-confirm-delete:hover { opacity: 0.9; transform: translateY(-1px); }

        /* ────── EMPTY STATE ────── */
        .empty-state {
          text-align: center;
          padding: 4rem 1rem;
          color: rgba(255,255,255,0.25);
        }
        .empty-icon { font-size: 3rem; margin-bottom: 1rem; }
        .empty-title { font-size: 1.1rem; font-weight: 700; margin-bottom: 0.4rem; }
        .empty-sub { font-size: 0.88rem; }

        /* ────── LOADING ────── */
        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem;
          gap: 1rem;
          color: rgba(255,255,255,0.3);
        }

        .loading-ring {
          width: 48px;
          height: 48px;
          border: 3px solid rgba(0,160,220,0.15);
          border-top-color: rgba(0,160,220,0.7);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        /* ────── TOAST ────── */
        .toast {
          position: fixed;
          bottom: 1.5rem;
          left: 50%;
          transform: translateX(-50%);
          z-index: 200;
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.75rem 1.25rem;
          border-radius: 14px;
          font-size: 0.9rem;
          font-weight: 700;
          animation: slideUp 0.3s ease;
          backdrop-filter: blur(16px);
          white-space: nowrap;
        }

        @keyframes slideUp { from { opacity: 0; transform: translateX(-50%) translateY(16px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }

        .toast.success {
          background: rgba(16,185,129,0.2);
          border: 1px solid rgba(16,185,129,0.4);
          color: #6ee7b7;
        }

        .toast.error {
          background: rgba(239,68,68,0.2);
          border: 1px solid rgba(239,68,68,0.4);
          color: #fca5a5;
        }

        /* ────── STORE STATUS TOGGLE ────── */
        .store-toggle {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.4rem 0.8rem;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
          user-select: none;
        }
        .store-toggle:hover { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.15); }
        .store-toggle.open { border-color: rgba(16,185,129,0.3); background: rgba(16,185,129,0.05); }
        .store-toggle.closed { border-color: rgba(239,68,68,0.3); background: rgba(239,68,68,0.05); }

        .store-status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #ef4444;
        }
        .store-toggle.open .store-status-dot { background: #10b981; box-shadow: 0 0 8px #10b981; }
        .store-toggle.closed .store-status-dot { background: #ef4444; box-shadow: 0 0 8px #ef4444; }

        .store-label { font-size: 0.78rem; font-weight: 700; color: rgba(255,255,255,0.5); }
        .store-toggle.open .store-label { color: rgba(255,255,255,0.8); }
        .store-toggle.closed .store-label { color: #fca5a5; }

        /* ────── NOTIFICATION TOGGLE ────── */
        .notify-toggle {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.4rem 0.8rem;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
          user-select: none;
        }
        .notify-toggle:hover { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.15); }
        .notify-toggle.on { border-color: rgba(16,185,129,0.3); background: rgba(16,185,129,0.05); }
        .notify-toggle.on .toggle-status { color: #10b981; }

        .notify-test-btn {
          font-size: 0.65rem;
          padding: 0.2rem 0.5rem;
          background: rgba(0,160,220,0.15);
          border: 1px solid rgba(0,160,220,0.3);
          border-radius: 6px;
          color: #00b4d8;
          cursor: pointer;
          margin-right: 0.5rem;
          transition: all 0.2s;
        }
        .notify-test-btn:hover { background: rgba(0,160,220,0.3); color: #fff; }

        .conn-status {
          font-size: 0.6rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 0.3rem;
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          background: rgba(0,0,0,0.3);
        }
        .conn-status.SUBSCRIBED { color: #10b981; }
        .conn-status.CONNECTING { color: #f59e0b; }
        .conn-status.ERROR      { color: #ef4444; }
        .conn-status.OFF        { color: rgba(255,255,255,0.2); }

        .status-dot-small { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }

        .toggle-switch {
          width: 32px;
          height: 18px;
          background: rgba(255,255,255,0.1);
          border-radius: 20px;
          position: relative;
          transition: all 0.3s;
        }
        .notify-toggle.on .toggle-switch { background: #10b981; }
        .toggle-circle {
          width: 14px;
          height: 14px;
          background: #fff;
          border-radius: 50%;
          position: absolute;
          top: 2px;
          right: 2px;
          transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }
        .notify-toggle.on .toggle-circle { transform: translateX(-14px); }
        .toggle-label { font-size: 0.78rem; font-weight: 700; color: rgba(255,255,255,0.5); }
        .notify-toggle.on .toggle-label { color: rgba(255,255,255,0.8); }
        .toggle-status { font-size: 0.65rem; font-weight: 800; color: rgba(255,255,255,0.15); text-transform: uppercase; letter-spacing: 0.5px; }

        /* ────── LIVE INDICATOR ────── */
        .live-dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #10b981;
          animation: pulse 2s ease-in-out infinite;
          margin-left: 6px;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(16,185,129,0.4); }
          50% { opacity: 0.7; box-shadow: 0 0 0 6px rgba(16,185,129,0); }
        }

        /* ────── NEW ORDER ALERT BANNER ────── */
        .new-order-banner {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 999;
          background: linear-gradient(135deg, #dc2626, #b91c1c);
          border-bottom: 3px solid #fbbf24;
          padding: 0;
          animation: bannerSlideDown 0.4s ease;
          box-shadow: 0 8px 32px rgba(220,38,38,0.4);
        }

        @keyframes bannerSlideDown {
          from { transform: translateY(-100%); }
          to { transform: translateY(0); }
        }

        @keyframes bannerPulse {
          0%, 100% { background: linear-gradient(135deg, #dc2626, #b91c1c); }
          50% { background: linear-gradient(135deg, #ef4444, #dc2626); }
        }

        .new-order-banner-inner {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0.75rem 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          animation: bannerPulse 2s ease-in-out infinite;
        }

        .banner-left {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex: 1;
          min-width: 0;
        }

        .banner-bell {
          font-size: 1.8rem;
          animation: bellShake 0.5s ease-in-out infinite;
          flex-shrink: 0;
        }

        @keyframes bellShake {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(15deg); }
          75% { transform: rotate(-15deg); }
        }

        .banner-text {
          color: #fff;
          font-weight: 800;
          font-size: 1.1rem;
          line-height: 1.4;
        }

        .banner-text-sub {
          font-size: 0.82rem;
          font-weight: 500;
          color: rgba(255,255,255,0.85);
          margin-top: 0.15rem;
        }

        .banner-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 28px;
          height: 28px;
          background: #fbbf24;
          color: #7c2d12;
          font-weight: 900;
          font-size: 0.9rem;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .banner-ack-btn {
          padding: 0.6rem 1.5rem;
          background: #fbbf24;
          color: #7c2d12;
          border: none;
          border-radius: 10px;
          font-family: 'Tajawal', sans-serif;
          font-size: 0.95rem;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .banner-ack-btn:hover {
          background: #f59e0b;
          transform: scale(1.05);
        }

        .banner-orders-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }

        .banner-order-chip {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.3rem 0.6rem;
          background: rgba(255,255,255,0.15);
          border-radius: 8px;
          font-size: 0.78rem;
          color: #fff;
          font-weight: 600;
          backdrop-filter: blur(4px);
        }

        .banner-order-chip .chip-total {
          color: #fde68a;
          font-weight: 800;
        }

        /* ────── NOTIFICATION BADGE ────── */
        .notify-badge {
          position: absolute;
          top: -6px;
          right: -6px;
          min-width: 18px;
          height: 18px;
          background: #ef4444;
          color: #fff;
          font-size: 0.65rem;
          font-weight: 900;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #080d16;
          animation: badgePop 0.3s ease;
        }

        @keyframes badgePop {
          0% { transform: scale(0); }
          50% { transform: scale(1.3); }
          100% { transform: scale(1); }
        }

        .notify-toggle {
          position: relative;
        }
      `}</style>

      <div className="dash-page">
        {/* ── NEW ORDER ALERT BANNER ── */}
        {unacknowledgedOrders.length > 0 && (
          <div className="new-order-banner">
            <div className="new-order-banner-inner">
              <div className="banner-left">
                <div className="banner-bell">🔔</div>
                <div>
                  <div className="banner-text">
                    <span className="banner-count">{unacknowledgedOrders.length}</span>
                    {' '}
                    {unacknowledgedOrders.length === 1 ? 'طلب جديد وارد!' : 'طلبات جديدة واردة!'}
                  </div>
                  <div className="banner-orders-list">
                    {unacknowledgedOrders.map(n => (
                      <div key={n.orderId} className="banner-order-chip">
                        👤 {n.customerName} — <span className="chip-total">{n.total.toFixed(0)} ج</span> — {formatTime(n.time)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <button className="banner-ack-btn" onClick={acknowledgeOrders}>
                ✅ تم المراجعة
              </button>
            </div>
          </div>
        )}
        {/* ── HEADER ── */}
        <header className="dash-header">
          <div className="dash-header-inner">
            <div className="header-brand">
              <div className="brand-icon" style={{ background: 'transparent' }}>
                <img src="/images/logo.png" alt="by Joka" style={{ height: '32px', width: 'auto' }} />
              </div>
              <div>
                <div className="brand-name">by Joka</div>
                <div className="brand-branch">فرع {cashier.branchName} <span className="live-dot" /></div>
              </div>
            </div>

            <div className="header-right">
              <div 
                className={`store-toggle ${isStoreOpen ? 'open' : 'closed'}`}
                onClick={handleStoreStatusToggle}
                title={isStoreOpen ? 'إغلاق استقبال الطلبات' : 'فتح استقبال الطلبات'}
              >
                <div className="store-status-dot" />
                <div className="store-label">{isStoreOpen ? 'المطعم مفتوح' : 'المطعم مغلق'}</div>
              </div>

              <div 
                className={`notify-toggle ${notificationsEnabled ? 'on' : ''}`}
                onClick={toggleNotifications}
                title={notificationsEnabled ? 'إيقاف التنبيهات' : 'تفعيل التنبيهات'}
              >
                {unacknowledgedOrders.length > 0 && (
                  <div className="notify-badge">{unacknowledgedOrders.length}</div>
                )}
                <div className="toggle-label">🔔 الإشعارات</div>
                
                {notificationsEnabled && (
                  <>
                    <button className="notify-test-btn" onClick={testNotification}>تجربة</button>
                    <div className={`conn-status ${realtimeStatus}`}>
                      <div className="status-dot-small" />
                      {realtimeStatus === 'SUBSCRIBED' ? 'متصل' : realtimeStatus === 'CONNECTING' ? 'جاري الاتصال' : 'خطأ'}
                    </div>
                  </>
                )}

                <div className="toggle-switch">
                  <div className="toggle-circle" />
                </div>
                <div className="toggle-status">{notificationsEnabled ? 'ON' : 'OFF'}</div>
              </div>

              <div className="cashier-pill">
                👤 {cashier.name}
              </div>
              <div className="refresh-info">
                آخر تحديث: {formatTime(lastRefresh.toISOString())}
              </div>
              <button
                className="header-btn logout"
                onClick={handleLogout}
                id="logout-btn"
              >
                🚪 خروج
              </button>
            </div>
          </div>
        </header>

        {/* ── BODY ── */}
        <div className="dash-body">

          {/* ── STATS ── */}
          <div className="stats-grid">
            <div
              className={`stat-card ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              <div className="stat-icon">📋</div>
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">إجمالي الطلبات</div>
            </div>
            <div
              className={`stat-card pending ${statusFilter === 'pending' ? 'active' : ''}`}
              onClick={() => setStatusFilter('pending')}
            >
              <div className="stat-icon">⏳</div>
              <div className="stat-value">{stats.pending}</div>
              <div className="stat-label">قيد الانتظار</div>
            </div>
            <div
              className={`stat-card done ${statusFilter === 'done' ? 'active' : ''}`}
              onClick={() => setStatusFilter('done')}
            >
              <div className="stat-icon">✅</div>
              <div className="stat-value">{stats.done}</div>
              <div className="stat-label">مكتملة</div>
            </div>
            <div
              className={`stat-card canceled ${statusFilter === 'canceled' ? 'active' : ''}`}
              onClick={() => setStatusFilter('canceled')}
            >
              <div className="stat-icon">❌</div>
              <div className="stat-value">{stats.canceled}</div>
              <div className="stat-label">ملغية</div>
            </div>
            <div className="stat-card revenue">
              <div className="stat-icon">💰</div>
              <div className="stat-value">{stats.revenue.toLocaleString('ar-EG')} ج</div>
              <div className="stat-label">إجمالي الإيرادات</div>
            </div>
          </div>

          {/* ── FILTER BAR ── */}
          <div className="filter-bar">
            <button
              className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              الكل <span className="filter-count">{stats.total}</span>
            </button>
            <button
              className={`filter-btn ${statusFilter === 'pending' ? 'active' : ''}`}
              onClick={() => setStatusFilter('pending')}
            >
              ⏳ انتظار <span className="filter-count">{stats.pending}</span>
            </button>
            <button
              className={`filter-btn ${statusFilter === 'done' ? 'active' : ''}`}
              onClick={() => setStatusFilter('done')}
            >
              ✅ مكتمل <span className="filter-count">{stats.done}</span>
            </button>
            <button
              className={`filter-btn ${statusFilter === 'canceled' ? 'active' : ''}`}
              onClick={() => setStatusFilter('canceled')}
            >
              ❌ ملغى <span className="filter-count">{stats.canceled}</span>
            </button>

            <button
              className="refresh-btn"
              onClick={() => cashier && fetchOrders(cashier.branchId)}
              disabled={isLoading}
            >
              <span className={isLoading ? 'spin' : ''}>🔄</span>
              تحديث يدوي
            </button>
          </div>

          {/* ── ORDERS ── */}
          {isLoading ? (
            <div className="loading-state">
              <div className="loading-ring" />
              <span>جاري تحميل طلبات فرع {cashier.branchName}...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                {statusFilter === 'all' ? '🍽️' : statusFilter === 'pending' ? '⏳' : statusFilter === 'done' ? '✅' : '❌'}
              </div>
              <div className="empty-title">لا توجد طلبات</div>
              <div className="empty-sub">
                {statusFilter === 'all'
                  ? 'لم يصل أي طلب لهذا الفرع بعد'
                  : `لا توجد طلبات بحالة "${STATUS_CONFIG[statusFilter].label}"`
                }
              </div>
            </div>
          ) : (
            <div className="orders-grid">
              {filtered.map(order => (
                <div key={order.id} className={`order-card ${order.status}`}>
                  {/* Header */}
                  <div className="order-header">
                    <div className="order-customer">
                      <div className="customer-avatar">👤</div>
                      <div>
                        <div className="customer-name">{order.customer_name}</div>
                        <div className="customer-phone">📱 {order.customer_phone}</div>
                      </div>
                    </div>
                    <div className="order-meta">
                      <div className="order-time">
                        <div>{formatDate(order.created_at)}</div>
                        <div>{formatTime(order.created_at)}</div>
                      </div>
                      <div className="order-id">#{order.id.slice(0,8)}</div>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="order-body">
                    {/* Items + total */}
                    <div className="items-section">
                      <div className="section-title">🍽️ الطلبات</div>
                      {order.order_items?.map(item => (
                        <div key={item.id} className="item-row">
                          <span className="item-name">
                            {item.product_name_ar || item.product_name}
                            <span className="item-qty">× {item.quantity}</span>
                          </span>
                          <span className="item-price">{(item.price * item.quantity).toFixed(0)} ج</span>
                        </div>
                      ))}
                      <div className="total-row">
                        <span>الإجمالي</span>
                        <span className="total-amount">{Number(order.total_price).toFixed(0)} ج</span>
                      </div>

                      {order.notes && (
                        <div className="notes-box">
                          <div className="notes-label">💬 ملاحظات</div>
                          {order.notes}
                        </div>
                      )}
                    </div>

                    {/* Customer info */}
                    <div className="info-section">
                      <div className="section-title">📋 بيانات العميل</div>
                      {order.customer_email && (
                        <div className="info-row">
                          <span className="info-icon">✉️</span>
                          <span className="info-text">{order.customer_email}</span>
                        </div>
                      )}
                      {order.customer_address && (
                        <div className="info-row">
                          <span className="info-icon">📍</span>
                          <span className="info-text">{order.customer_address}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="order-footer">
                    <div className="status-btns">
                      {(['pending', 'done', 'canceled'] as const).map(s => (
                        <button
                          key={s}
                          className={`status-btn ${s} ${order.status === s ? 'current' : ''}`}
                          onClick={() => order.status !== s && handleStatusChange(order.id, s)}
                          disabled={updatingId === order.id}
                        >
                          {STATUS_CONFIG[s].icon} {STATUS_CONFIG[s].label}
                        </button>
                      ))}
                    </div>

                    <button
                      className="delete-btn"
                      onClick={() => setConfirmDelete(order.id)}
                      disabled={deletingId === order.id}
                      id={`delete-order-${order.id.slice(0,8)}`}
                    >
                      {deletingId === order.id ? '⌛' : '🗑️'} حذف
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── CONFIRM DELETE DIALOG ── */}
      {confirmDelete && (
        <div className="confirm-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="confirm-box" onClick={e => e.stopPropagation()}>
            <div className="confirm-icon">🗑️</div>
            <div className="confirm-title">تأكيد الحذف</div>
            <div className="confirm-desc">هل أنت متأكد من حذف هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء.</div>
            <div className="confirm-btns">
              <button className="btn-cancel-confirm" onClick={() => setConfirmDelete(null)}>إلغاء</button>
              <button className="btn-confirm-delete" onClick={() => handleDelete(confirmDelete)}>نعم، احذف</button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST ── */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
        </div>
      )}
    </>
  )
}
