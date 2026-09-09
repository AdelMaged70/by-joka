'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { Navigation } from '@/components/navigation'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { CheckCircle2, ChevronRight, ShoppingBag } from 'lucide-react'

function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const orderId = searchParams.get('orderId')
  const [countdown, setCountdown] = useState(15)

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          router.push('/')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [router])

  return (
    <div className="relative z-10 max-w-lg w-full mx-auto bg-black/40 backdrop-blur-xl border border-emerald-500/20 rounded-3xl p-8 md:p-10 text-center shadow-2xl">
      {/* Decorative pulse effect */}
      <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full bg-emerald-500/10 blur-xl pointer-events-none animate-pulse" />
      
      <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mb-8 shadow-lg shadow-emerald-500/20 animate-bounce">
        <CheckCircle2 className="w-10 h-10 text-white" />
      </div>

      <h1 className="text-3xl font-extrabold mb-4 text-white tracking-tight">
        تم الدفع بنجاح!
      </h1>
      
      <p className="text-emerald-400 font-semibold mb-6 flex items-center justify-center gap-1.5 bg-emerald-500/5 py-2 px-4 rounded-xl border border-emerald-500/10 w-fit mx-auto text-sm">
        شكرًا لطلبك من by Joka
      </p>

      <p className="text-muted-foreground text-sm mb-8 leading-relaxed max-w-sm mx-auto">
        تم تأكيد عملية الدفع عبر المحفظة الإلكترونية بنجاح. سنقوم بتحضير طلبك وتوصيله إليك بأسرع وقت ممكن!
      </p>

      {orderId && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-8 text-right space-y-2">
          <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
            <span className="text-muted-foreground">رقم الطلب:</span>
            <span className="font-mono text-xs text-yellow-400 select-all font-semibold">{orderId}</span>
          </div>
          <div className="flex justify-between items-center text-sm pt-1">
            <span className="text-muted-foreground">حالة الدفع:</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-ping"></span>
              مقبول (مدفوع)
            </span>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <Button
          size="lg"
          className="w-full gap-2 cursor-pointer py-6 rounded-2xl text-base font-bold bg-white text-black hover:bg-white/90 shadow-xl flex items-center justify-center transition-all duration-200 active:scale-98"
          onClick={() => router.push('/')}
        >
          <ShoppingBag className="w-5 h-5 ml-1" />
          <span>العودة للرئيسية</span>
        </Button>

        <p className="text-xs text-muted-foreground">
          سيتم تحويلك تلقائيًا للرئيسية خلال <span className="text-yellow-400 font-bold">{countdown}</span> ثانية.
        </p>
      </div>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#0a0e1a] text-white">
      <Navigation />
      
      <main className="flex-1 flex items-center justify-center py-20 px-4 relative overflow-hidden">
        {/* Neon Backdrop */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-950/20 via-black to-[#0a0e1a] pointer-events-none" />
        
        <Suspense fallback={
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">جاري تحميل تفاصيل الدفع...</p>
          </div>
        }>
          <PaymentSuccessContent />
        </Suspense>
      </main>

      <Footer />
    </div>
  )
}
