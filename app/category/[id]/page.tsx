import { Navigation } from '@/components/navigation'
import { Footer } from '@/components/footer'
import { ProductCard } from '@/components/product-card'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import {
  getCategoryById,
  getProductsByCategory,
  toCategoryShape,
  toProductShape,
} from '@/lib/db'

export const revalidate = 60

interface CategoryPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: CategoryPageProps) {
  const { id } = await params
  const category = await getCategoryById(id)

  if (!category) {
    return { title: 'Category Not Found' }
  }

  return {
    title: `${category.name_ar} - by Joka`,
    description: `تصفح أطباق ${category.name_ar} في by Joka`,
  }
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { id } = await params
  const dbCategory = await getCategoryById(id)

  if (!dbCategory) {
    notFound()
  }

  const category = toCategoryShape(dbCategory)

  const dbProducts = await getProductsByCategory(id)
  const products = dbProducts.map(toProductShape)

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1">
        {/* Breadcrumb */}
        <div className="bg-muted py-4">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-2 text-sm">
              <Link href="/" className="hover:text-primary">
                الرئيسية
              </Link>
              <ChevronRight className="h-4 w-4" />
              <Link href="/categories" className="hover:text-primary">
                القائمة
              </Link>
              <ChevronRight className="h-4 w-4" />
              <span className="font-semibold">{category.nameAr}</span>
            </div>
          </div>
        </div>

        {/* Category Header */}
        <section className="bg-primary text-primary-foreground py-12">
          <div className="container mx-auto px-4 text-center">
            <div className="text-6xl mb-4">{category.icon}</div>
            <h1 className="text-4xl md:text-5xl font-bold mb-3">
              {category.nameAr}
            </h1>
            <p className="text-xl opacity-90">{category.name}</p>
          </div>
        </section>

        {/* Products Grid */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            {products.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <p className="text-xl text-muted-foreground">
                  لا توجد منتجات في هذه الفئة حاليًا
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
