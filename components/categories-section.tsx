import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { getCategories, toCategoryShape } from '@/lib/db'

export async function CategoriesSection() {
  const dbCategories = await getCategories()
  const categories = dbCategories.map(toCategoryShape)

  if (categories.length === 0) return null

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">تصفح حسب الفئة</h2>
          <p className="text-muted-foreground text-lg">
            اختر من تشكيلتنا المتنوعة 
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/category/${category.id}`}
              className="group"
            >
              <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-2 hover:border-primary">
                <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                  <div className="text-5xl group-hover:scale-110 transition-transform duration-300">
                    {category.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{category.nameAr}</h3>
                    <p className="text-sm text-muted-foreground">
                      {category.name}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
