import { Navigation } from '@/components/navigation'
import { Footer } from '@/components/footer'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { ChevronRight } from 'lucide-react'
import { getCategories, toCategoryShape } from '@/lib/db'

export const metadata = {
  title: 'القائمة - by Joka',
  description: 'تصفح قائمة طعامنا المتنوعة من المأكولات البحرية',
}

// إعادة التحقق كل 60 ثانية (ISR) حتى تنعكس التغييرات من الداتابيز تلقائياً
// export const revalidate = 60
export const dynamic = 'force-dynamic';

export default async function CategoriesPage() {
  const dbCategories = await getCategories()
  const categories = dbCategories.map(toCategoryShape)

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-primary text-primary-foreground py-16">
          <div className="container mx-auto px-4">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-center">
              قائمة الطعام
            </h1>
            <p className="text-xl text-center opacity-90">
              اختر من تشكيلتنا الواسعة من المأكولات البحرية الطازجة
            </p>
          </div>
        </section>

        {/* Categories Grid */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            {categories.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-xl text-muted-foreground">
                  لا توجد تصنيفات متاحة حاليًا
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {categories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/category/${category.id}`}
                    className="group"
                  >
                    <Card className="hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border-2 hover:border-primary h-full">
                      <CardContent className="p-8 flex flex-col items-center text-center gap-4">
                        <div className="text-7xl group-hover:scale-110 transition-transform duration-300">
                          {category.icon}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-2xl mb-2">
                            {category.nameAr}
                          </h3>
                          <p className="text-lg text-muted-foreground">
                            {category.name}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-primary font-semibold group-hover:gap-3 transition-all">
                          <span>تصفح الأطباق</span>
                          <ChevronRight className="h-5 w-5" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
