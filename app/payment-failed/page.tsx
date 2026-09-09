'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { Navigation } from '@/components/navigation'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { XCircle, RefreshCw, ChevronLeft } from 'lucide-react'
import { Suspense } from 'react'

function PaymentFailedContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const orderId = searchParams.get('orderId')
  const errorMsg = searchParams.get('error')

  return (
    <div className="relative z-10 max-w-lg w-full mx-auto bg-black/40 backdrop-blur-xl border border-red-500/20 rounded-3xl p-8 md:p-10 text-center shadow-2xl">
      {/* Decorative pulse effect */}
      <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full bg-red-500/10 blur-xl pointer-events-none animate-pulse" />
      
      <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center mb-8 shadow-lg shadow-red-500/20">
        <XCircle className="w-10 h-10 text-white" />
      </div>

      <h1 className="text-3xl font-extrabold mb-4 text-white tracking-tight">
        فشلت عملية الدفع!
      </h1>
      
      <p className="text-red-400 font-semibold mb-6 flex items-center justify-center gap-1.5 bg-red-500/5 py-2 px-4 rounded-xl border border-red-500/10 w-fit mx-auto text-sm">
        لم نتمكن من معالجة عملية خصم رصيد المحفظة
      </p>

      <p className="text-muted-foreground text-sm mb-8 leading-relaxed max-w-sm mx-auto">
        حدث فشل أثناء تحصيل المبلغ من حساب المحفظة الإلكترونية الخاصة بك. يرجى التأكد من توفر رصيد كافٍ بالمحفظة والمحاولة مرة أخرى.
      </p>

      {orderId && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-8 text-right space-y-2">
          <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
            <span className="text-muted-foreground">رمز الطلب المرجعي:</span>
            <span className="font-mono text-xs text-red-300 select-all font-semibold">{orderId}</span>
          </div>
          <div className="flex justify-between items-center text-sm pt-1">
            <span className="text-muted-foreground">حالة المعاملة:</span>
            <span className="text-red-400 font-semibold flex items-center gap-1">
              مرفوضة / ملغاة
            </span>
          </div>
          {errorMsg && (
            <div className="text-xs text-red-300 mt-2 bg-red-950/20 p-2 rounded border border-red-900/35">
              تفاصيل الخطأ: {errorMsg}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Button
          size="lg"
          variant="outline"
          className="w-full gap-2 cursor-pointer py-6 rounded-2xl text-base font-bold border-white/10 hover:bg-white/5 text-white flex items-center justify-center transition-all duration-200 active:scale-98"
          onClick={() => router.push('/')}
        >
          <span>العودة للرئيسية</span>
        </Button>

        <Button
          size="lg"
          className="w-full gap-2 cursor-pointer py-6 rounded-2xl text-base font-bold bg-[#e31e24] hover:bg-[#c1151a] text-white flex items-center justify-center transition-all duration-200 active:scale-98 shadow-xl"
          onClick={() => router.push('/checkout')}
        >
          <RefreshCw className="w-4 h-4 ml-1 animate-spin-slow" />
          <span>إعادة محاولة الطلب</span>
        </Button>
      </div>
    </div>
  )
}

export default function PaymentFailedPage() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#0a0e1a] text-white">
      <Navigation />
      
      <main className="flex-1 flex items-center justify-center py-20 px-4 relative overflow-hidden">
        {/* Neon Backdrop */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-950/20 via-black to-[#0a0e1a] pointer-events-none" />
        
        <Suspense fallback={
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground font-semibold">جاري تحميل تفاصيل الخطأ...</p>
          </div>
        }>
          <PaymentFailedContent />
        </Suspense>
      </main>

      <Footer />
    </div>
  )
}
