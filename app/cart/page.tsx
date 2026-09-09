'use client'

import { Navigation } from '@/components/navigation'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useCart } from '@/contexts/cart-context'
import Link from 'next/link'
import Image from 'next/image'
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react'

export default function CartPage() {
  const { items, removeItem, updateQuantity, totalPrice, totalItems } =
    useCart()

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 flex items-center justify-center py-16">
          <div className="text-center">
            <div className="text-8xl mb-6">🛒</div>
            <h1 className="text-3xl font-bold mb-4">السلة فارغة</h1>
            <p className="text-muted-foreground mb-8 text-lg">
              لم تقم بإضافة أي منتجات بعد
            </p>
            <Link href="/categories">
              <Button size="lg" className="gap-2">
                <ShoppingBag className="h-5 w-5" />
                تصفح المنتجات
              </Button>
            </Link>
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
        {/* Header */}
        <section className="bg-primary text-primary-foreground py-12">
          <div className="container mx-auto px-4">
            <h1 className="text-4xl md:text-5xl font-bold text-center">
              سلة التسوق
            </h1>
            <p className="text-xl text-center mt-3 opacity-90">
              {totalItems} منتج في السلة
            </p>
          </div>
        </section>

        {/* Cart Content */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Cart Items */}
              <div className="lg:col-span-2 space-y-4">
                {items.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="p-6">
                      <div className="flex gap-4">
                        {/* Product Image */}
                        <div className="relative h-24 w-24 rounded-lg overflow-hidden flex-shrink-0">
                          <Image
                            src={item.image}
                            alt={item.nameAr}
                            fill
                            className="object-cover"
                          />
                        </div>

                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/product/${item.id}`}
                            className="hover:text-primary"
                          >
                            <h3 className="font-bold text-lg mb-1 line-clamp-1">
                              {item.nameAr}
                            </h3>
                          </Link>
                          <p className="text-sm text-muted-foreground mb-3">
                            {item.name}
                          </p>

                          <div className="flex items-center justify-between gap-4 flex-wrap">
                            {/* Quantity Controls */}
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 cursor-pointer"
                                onClick={() => {
                                  if (item.quantity > 1) {
                                    updateQuantity(item.id, item.quantity - 1)
                                  }
                                }}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="font-bold text-lg w-8 text-center">
                                {item.quantity}
                              </span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 cursor-pointer"
                                onClick={() =>
                                  updateQuantity(item.id, item.quantity + 1)
                                }
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>

                            {/* Price and Remove */}
                            <div className="flex items-center gap-4">
                              <span className="text-xl font-bold text-primary">
                                {(item.price * item.quantity).toFixed(0)} جنيه
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                                onClick={() => removeItem(item.id)}
                              >
                                <Trash2 className="h-5 w-5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <Card className="sticky top-20">
                  <CardContent className="p-6 space-y-6">
                    <h2 className="text-2xl font-bold">ملخص الطلب</h2>

                    <div className="space-y-3">
                      <div className="flex justify-between text-lg">
                        <span className="text-muted-foreground">المجموع الفرعي</span>
                        <span className="font-semibold">
                          {totalPrice.toFixed(0)} جنيه
                        </span>
                      </div>
                      <div className="flex justify-between text-lg">
                        <span className="text-muted-foreground">رسوم التوصيل</span>
                        <span className="font-semibold text-green-600">
                          مجانًا
                        </span>
                      </div>
                      <div className="border-t pt-3 mt-3">
                        <div className="flex justify-between text-2xl font-bold">
                          <span>الإجمالي</span>
                          <span className="text-primary">
                            {totalPrice.toFixed(0)} جنيه
                          </span>
                        </div>
                      </div>
                    </div>

                    <Link href="/checkout" className="block">
                      <Button size="lg" className="w-full text-lg gap-2 cursor-pointer">
                        إتمام الطلب
                        <ArrowRight className="h-5 w-5" />
                      </Button>
                    </Link>

                    <Link href="/categories" className="block">
                      <Button
                        variant="outline"
                        size="lg"
                        className="w-full text-lg cursor-pointer"
                      >
                        متابعة التسوق
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
