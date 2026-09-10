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
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/auth-context'

interface Branch {
  id: string
  name: string
  nameAr: string
  city: string
}

export default function CheckoutPage() {
  const { items, totalPrice, clearCart, isLoadingCart } = useCart()
  const router = useRouter()
  const { toast } = useToast()
  const { user, loading: authLoading, signInWithGoogle } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [branches, setBranches] = useState<Branch[]>([])
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

  useEffect(() => {
    if (authLoading || isLoadingCart) return

    setIsReady(true)
    if (items.length === 0 && !isOrderCompletedRef.current) {
      router.push('/cart')
    }
  }, [items.length, authLoading, isLoadingCart, router])

  useEffect(() => {
    async function fetchDefaultBranch() {
      const result = await getBranches()
      if (result.branches && result.branches.length > 0) {
        setBranches(result.branches)
        setFormData((prev) => ({ ...prev, branch: result.branches[0].id }))
      } else {
        toast({
          title: 'تحذير',
          description: 'تعذّر جلب بيانات الفرع، حاول تحديث الصفحة',
          variant: 'destructive',
        })
      }
    }
    fetchDefaultBranch()
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
      const selectedBranch = branches.find((b: Branch) => b.id === formData.branch) || branches[0]
      if (!selectedBranch) {
        throw new Error('الفرع غير متوفر')
      }

      const orderItems = items.map(item => ({
        productName: item.nameAr || item.name || 'منتج',
        productId: item.id || (item as any).productId || 'unknown',
        quantity: item.quantity,
        price: item.price
      }))

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

  if (authLoading || isLoadingCart || !isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col justify-between">
        <Navigation />
        <main className="flex-1 flex items-center justify-center py-16 px-4 bg-[#0a0e1a] text-white">
          <div className="max-w-md w-full mx-auto bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center shadow-2xl">
            <h2 className="text-2xl font-bold mb-3 text-white">تسجيل الدخول مطلوب</h2>
            <p className="text-muted-foreground text-sm mb-8">
              من فضلك قم بتسجيل الدخول بحساب Google الخاص بك لإتمام الطلب.
            </p>
            <Button
              size="lg"
              className="w-full gap-3 py-6 rounded-2xl bg-white text-black hover:bg-white/95"
              onClick={() => signInWithGoogle(window.location.href)}
            >
              تسجيل الدخول باستخدام Google
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1">
        <section className="bg-primary text-primary-foreground py-12">
          <div className="container mx-auto px-4">
            <h1 className="text-4xl md:text-5xl font-bold text-center">إتمام الطلب</h1>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-2xl">معلومات التواصل</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">الاسم الكامل <span className="text-destructive">*</span></Label>
                          <Input
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            placeholder="أدخل اسمك"
                            className="placeholder:opacity-40"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">رقم الهاتف <span className="text-destructive">*</span></Label>
                          <Input
                            id="phone"
                            name="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={handleInputChange}
                            placeholder="01234567890"
                            className="placeholder:opacity-40"
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
                        <Label htmlFor="address">العنوان بالتفصيل <span className="text-destructive">*</span></Label>
                        <Textarea
                          id="address"
                          name="address"
                          value={formData.address}
                          onChange={handleInputChange}
                          placeholder="ادخل العنوان..."
                          rows={3}
                          className="placeholder:opacity-40"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="notes">ملاحظات إضافية (اختياري)</Label>
                        <Textarea
                          id="notes"
                          name="notes"
                          value={formData.notes}
                          onChange={handleInputChange}
                          placeholder="أي تعليمات خاصة بالتوصيل..."
                          rows={3}
                          className="placeholder:opacity-40"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="lg:col-span-1">
                  <Card className="sticky top-20">
                    <CardHeader>
                      <CardTitle className="text-2xl">ملخص الطلب</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-3 max-h-60 overflow-y-auto">
                        {items.map((item) => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span className="flex-1">{item.nameAr} × {item.quantity}</span>
                            <span className="font-semibold">{(item.price * item.quantity).toFixed(0)} جنيه</span>
                          </div>
                        ))}
                      </div>

                      <div className="border-t pt-4 space-y-3">
                        <div className="flex justify-between text-lg">
                          <span className="text-muted-foreground">المجموع الفرعي</span>
                          <span className="font-semibold">{totalPrice.toFixed(0)} جنيه</span>
                        </div>
                        <div className="flex justify-between text-lg">
                          <span className="text-muted-foreground">رسوم التوصيل</span>
                          <span className="font-semibold text-green-600">مجانًا</span>
                        </div>
                        <div className="border-t pt-3">
                          <div className="flex justify-between text-2xl font-bold">
                            <span>الإجمالي</span>
                            <span className="text-primary">{totalPrice.toFixed(0)} جنيه</span>
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