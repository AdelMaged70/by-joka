import { Navigation } from '@/components/navigation'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { CheckCircle2, Home, ShoppingBag } from 'lucide-react'

export const metadata = {
  title: 'تم إرسال الطلب بنجاح - by Joka',
  description: 'شكرًا لطلبك من by Joka',
}

export default function OrderSuccessPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1 flex items-center justify-center py-16">
        <div className="container mx-auto px-4">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-12 text-center space-y-6">
              <div className="flex justify-center">
                <div className="h-24 w-24 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="h-16 w-16 text-green-600" />
                </div>
              </div>

              <div>
                <h1 className="text-4xl font-bold mb-3">
                  تم إرسال طلبك بنجاح!
                </h1>
                <p className="text-xl text-muted-foreground">
                  شكرا لك على طلبك من by joka
                </p>
              </div>

              <div className="bg-muted p-6 rounded-lg space-y-2">
                <p className="text-lg">
                  سيتم التواصل معك خلال دقائق لتأكيد الطلب
                </p>
                <p className="text-muted-foreground">
                  سنقوم بتوصيل طلبك في أسرع وقت ممكن
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-6">
                <Link href="/" className="flex-1">
                  <Button size="lg" variant="outline" className="w-full gap-2">
                    <Home className="h-5 w-5" />
                    العودة للرئيسية
                  </Button>
                </Link>
                <Link href="/categories" className="flex-1">
                  <Button size="lg" className="w-full gap-2">
                    <ShoppingBag className="h-5 w-5" />
                    متابعة التسوق
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  )
}
