'use client'

import { Navigation } from '@/components/navigation'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCart } from '@/contexts/cart-context'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { getBranches, createOrder } from '@/app/actions/admin-actions'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useToast } from '@/hooks/use-toast'
import { CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'

interface Branch {
  id: string
  name: string
  nameAr: string
  city: string
}

export default function CheckoutPage() {
  const { items, totalPrice, clearCart } = useCart()
  const router = useRouter()
  const { toast } = useToast()
  const { user, loading: authLoading, signInWithGoogle } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [branches, setBranches] = useState<Branch[]>([])
  const [branchesLoading, setBranchesLoading] = useState(true)
  const [walletNumber, setWalletNumber] = useState('')
  const isOrderCompletedRef = useRef(false)

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    branch: '',
    paymentMethod: 'cash',
    notes: '',
  })

  // Prefill the user's name from Google metadata when they load
  // useEffect(() => {
  //   if (user) {
  //     setFormData((prev) => ({
  //       ...prev,
  //       name: prev.name || user.user_metadata?.full_name || '',
  //     }))
  //   }
  // }, [user])

  // Wait for cart to load before checking if empty
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true)
      if (items.length === 0 && !isOrderCompletedRef.current) {
        router.push('/cart')
      }
    }, 100)
    
    return () => clearTimeout(timer)
  }, [items.length, router])

  // Fetch branches dynamically from Supabase
  useEffect(() => {
    async function fetchBranches() {
      setBranchesLoading(true)
      const result = await getBranches()
      if (result.branches) {
        setBranches(result.branches)
      } else {
        toast({
          title: 'تحذير',
          description: 'تعذّر تحميل الفروع، حاول تحديث الصفحة',
          variant: 'destructive',
        })
      }
      setBranchesLoading(false)
    }
    fetchBranches()
  }, [])

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.phone || !formData.address || !formData.branch) {
      toast({
        title: 'خطأ',
        description: 'الرجاء ملء جميع الحقول المطلوبة',
        variant: 'destructive',
      })
      return
    }

    if (!user) {
      toast({
        title: 'خطأ',
        description: 'يجب تسجيل الدخول لإتمام الطلب',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Find the selected branch ID
      const selectedBranch = branches.find((b: Branch) => b.id === formData.branch)
      if (!selectedBranch) {
        throw new Error('الفرع غير صحيح')
      }

      // Prepare order items
      const orderItems = items.map(item => ({
        productName: item.nameAr || item.name || 'منتج',
        productId: item.id || (item as any).productId || 'unknown',
        quantity: item.quantity,
        price: item.price
      }))

      if (formData.paymentMethod === 'wallet' || formData.paymentMethod === 'card') {
        if (formData.paymentMethod === 'wallet' && !walletNumber) {
          throw new Error('الرجاء إدخال رقم المحفظة الإلكترونية لإتمام عملية الدفع')
        }

        const walletRes = await fetch('/api/paymob/create-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            branchId: selectedBranch.id,
            customerName: formData.name,
            customerPhone: formData.phone,
            customerEmail: user.email || '',
            customerAddress: formData.address,
            totalPrice: totalPrice,
            items: orderItems,
            notes: formData.notes,
            walletNumber: walletNumber,
            paymentType: formData.paymentMethod // 'wallet' | 'card'
          })
        })

        const walletData = await walletRes.json()
        if (!walletRes.ok || walletData.error) {
          throw new Error(walletData.error || 'فشلت عملية تهيئة الدفع من Paymob')
        }

        toast({
          title: formData.paymentMethod === 'card' ? 'جاري تحويلك لبوابة الدفع...' : 'جاري تحويلك لبوابة الدفع...',
          description: 'برجاء الانتظار لاتمام العملية',
        })

        isOrderCompletedRef.current = true
        clearCart()
        
        // Redirect to Paymob payment page
        window.location.href = walletData.redirectUrl
        return
      }

      // Create order in database (Cash payment)
      const result = await createOrder(
        selectedBranch.id,
        formData.name,
        formData.phone,
        user.email || '',
        formData.address,
        totalPrice,
        orderItems,
        formData.notes
      )

      if (result.error) {
        throw new Error(result.error)
      }

      toast({
        title: 'تم إرسال طلبك بنجاح!',
        description: 'سيتم التواصل معك قريبًا لتأكيد الطلب',
      })

      isOrderCompletedRef.current = true
      clearCart()
      router.push('/order-success')
    } catch (error) {
      console.error('Order submission error:', error)
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل إرسال الطلب',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Show loading while auth or cart is loading
  if (authLoading || !isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground bg-primary/0">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  // Show login required state if user is not signed in
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col justify-between">
        <Navigation />
        <main className="flex-1 flex items-center justify-center py-16 px-4 bg-[#0a0e1a] text-white relative overflow-hidden">
          {/* Neon/Premium styling for sign in prompt */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-black to-red-950/20 pointer-events-none" />
          <div className="relative z-10 max-w-md w-full mx-auto bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center shadow-2xl">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-3xl mb-6 shadow-lg">
              🔒
            </div>
            <h2 className="text-2xl font-bold mb-3 text-white">تسجيل الدخول مطلوب</h2>
            <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
              من فضلك قم بتسجيل الدخول بحساب Google الخاص بك لتتمكن من إتمام عملية الطلب ومتابعتها بسهولة.
            </p>
            <Button
              size="lg"
              className="w-full gap-3 cursor-pointer py-6 rounded-2xl text-base font-bold bg-white text-black hover:bg-white/95 shadow-xl flex items-center justify-center transition-all duration-200 active:scale-98"
              onClick={() => signInWithGoogle(window.location.href)}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5.04c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31l3.57 2.77c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
              </svg>
              <span>تسجيل الدخول باستخدام Google</span>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  // Show nothing while redirecting
  if (items.length === 0 && !isOrderCompletedRef.current) {
    return null
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1">
        {/* Header */}
        <section className="bg-primary text-primary-foreground py-12">
          <div className="container mx-auto px-4">
            <h1 className="text-4xl md:text-5xl font-bold text-center">
              إتمام الطلب
            </h1>
          </div>
        </section>

        {/* Checkout Form */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Customer Information */}
                <div className="lg:col-span-2 space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-2xl">معلومات التواصل</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">
                            الاسم الكامل <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            placeholder="أدخل اسمك" 
                            autoComplete="off"
                            className="text-primary placeholder:opacity-50"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="phone">
                            رقم الهاتف <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="phone"
                            name="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={handleInputChange}
                            placeholder="01234567890"
                            className="text-primary placeholder:opacity-50"
                            required
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-2xl">معلومات التوصيل</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="address">
                          العنوان <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                          id="address"
                          name="address"
                          value={formData.address}
                          onChange={handleInputChange}
                          placeholder="أدخل عنوانك بالتفصيل"
                          rows={3}
                          className="text-primary placeholder:opacity-50"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="branch" >
                          الفرع الأقرب <span className="text-destructive">*</span>
                        </Label>
                        <Select
                          value={formData.branch}
                          onValueChange={(value) =>
                            setFormData({ ...formData, branch: value })
                          }
                          required
                        >
                          <SelectTrigger className="text-primary data-[placeholder]:opacity-50">
                            <SelectValue placeholder={branchesLoading ? 'جاري تحميل الفروع...' : 'اختر الفرع'} />
                          </SelectTrigger>
                          <SelectContent>
                            {branchesLoading ? (
                              <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" />
                                جاري تحميل الفروع...
                              </div>
                            ) : branches.length === 0 ? (
                              <div className="p-4 text-sm text-center text-muted-foreground">لا توجد فروع متاحة</div>
                            ) : (
                              branches.map((branch: Branch) => (
                                <SelectItem key={branch.id} value={branch.id} className="bg-red-700 text-yellow-400 focus:bg-red-800 focus:text-yellow-400 data-[highlighted]:bg-red-800 data-[highlighted]:text-yellow-400">
                                  {branch.nameAr}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="notes">ملاحظات إضافية (اختياري)</Label>
                        <Textarea
                          id="notes"
                          name="notes"
                          value={formData.notes}
                          onChange={handleInputChange}
                          placeholder="أ�� ملاحظات أو طلبات خاصة"
                          className="text-primary placeholder:opacity-50"
                          rows={3}
                        />
                      </div>
                    </CardContent>
                  </Card>

                      {/* <Card>
                        <CardHeader>
                          <CardTitle className="text-2xl">طريقة الدفع</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <RadioGroup
                            value={formData.paymentMethod}
                            onValueChange={(value) =>
                              setFormData({ ...formData, paymentMethod: value })
                            }
                          >
                            <div className="flex items-center space-x-2 space-x-reverse p-4 border rounded-lg cursor-pointer hover:bg-muted">
                              <RadioGroupItem value="cash" id="cash" />
                              <Label htmlFor="cash" className="flex-1 cursor-pointer">
                                <div className="font-semibold text-primary">الدفع عند الاستلام</div>
                                <div className="text-sm text-primary">
                                  ادفع نقدًا عند استلام الطلب
                                </div>
                              </Label>
                            </div>

                            <div className="flex items-center space-x-2 space-x-reverse p-4 border rounded-lg cursor-pointer hover:bg-muted mt-2">
                               <RadioGroupItem value="wallet" id="wallet" />
                               <Label htmlFor="wallet" className="flex-1 cursor-pointer">
                                 <div className="font-semibold text-primary">المحفظة الإلكترونية (Vodafone / Orange / Etisalat / WE Cash)</div>
                                 <div className="text-sm text-primary">
                                   ادفع مباشرة وبأمان باستخدام محفظتك المحمولة عبر بوابة Paymob
                                 </div>
                               </Label>
                             </div>

                             <div className="flex items-center space-x-2 space-x-reverse p-4 border rounded-lg cursor-pointer hover:bg-muted mt-2">
                               <RadioGroupItem value="card" id="card" />
                               <Label htmlFor="card" className="flex-1 cursor-pointer">
                                 <div className="font-semibold text-primary flex items-center gap-2">
                                   <span>بطاقة ائتمانية (Visa / Mastercard)</span>
                                   <span className="flex gap-1">
                                     <span className="inline-block bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">VISA</span>
                                     <span className="inline-block bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">MC</span>
                                   </span>
                                 </div>
                                 <div className="text-sm text-primary">
                                   ادفع ببطاقتك البنكية بأمان تام عبر بوابة Paymob المشفرة
                                 </div>
                               </Label>
                             </div>
                          </RadioGroup>

                          {formData.paymentMethod === 'wallet' && (
                            <div className="mt-4 p-4 bg-muted/40 border border-white/5 rounded-xl space-y-2">
                              <Label htmlFor="walletNumber" className="text-sm font-semibold">
                                رقم فيزا/محفظة الكاش للجوال <span className="text-destructive">*</span>
                              </Label>
                              <Input
                                id="walletNumber"
                                name="walletNumber"
                                type="tel"
                                value={walletNumber}
                                onChange={(e) => setWalletNumber(e.target.value)}
                                placeholder="010XXXXXXXX (مثال: 01012345678)"
                                className="text-primary placeholder:opacity-50"
                                required
                              />
                              <p className="text-xs text-muted-foreground">
                                يرجى كتابة رقم الهاتف المرتبط بالمحفظة. سيتم توجيهك لصفحة الدفع الآمنة فورًا.
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card> */}
                </div>

                {/* Order Summary */}
                <div className="lg:col-span-1">
                  <Card className="sticky top-20">
                    <CardHeader>
                      <CardTitle className="text-2xl">ملخص الطلب</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Order Items */}
                      <div className="space-y-3 max-h-60 overflow-y-auto">
                        {items.map((item) => (
                          <div
                            key={item.id}
                            className="flex justify-between text-sm"
                          >
                            <span className="flex-1">
                              {item.nameAr} × {item.quantity}
                            </span>
                            <span className="font-semibold">
                              {(item.price * item.quantity).toFixed(0)} جنيه
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="border-t pt-4 space-y-3">
                        <div className="flex justify-between text-lg">
                          <span className="text-muted-foreground">
                            المجموع الفرعي
                          </span>
                          <span className="font-semibold">
                            {totalPrice.toFixed(0)} جنيه
                          </span>
                        </div>
                        <div className="flex justify-between text-lg">
                          <span className="text-muted-foreground">
                            رسوم التوصيل
                          </span>
                          <span className="font-semibold text-green-600">
                            مجانًا
                          </span>
                        </div>
                        <div className="border-t pt-3">
                          <div className="flex justify-between text-2xl font-bold">
                            <span>الإجمالي</span>
                            <span className="text-primary">
                              {totalPrice.toFixed(0)} جنيه
                            </span>
                          </div>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        size="lg"
                        className="w-full text-lg cursor-pointer"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? 'جاري إرسال الطلب...' : 'تأكيد الطلب'}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </form>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
