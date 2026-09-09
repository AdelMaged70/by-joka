import { Navigation } from '@/components/navigation'
import { Footer } from '@/components/footer'
import { Badge } from '@/components/ui/badge'
import { getProductById, getProductsByCategory, toProductShape } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronRight, Star } from 'lucide-react'
import { ProductCard } from '@/components/product-card'
import { AddToCartWidget } from '@/components/add-to-cart-widget'

export const revalidate = 60

interface ProductPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: ProductPageProps) {
  const { id } = await params
  const dbProduct = await getProductById(id)

  if (!dbProduct) {
    return { title: 'Product Not Found' }
  }

  return {
    title: `${dbProduct.name_ar} - by Joka`,
    description: dbProduct.description_ar,
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params
  const dbProduct = await getProductById(id)

  if (!dbProduct) {
    notFound()
  }

  const product = toProductShape(dbProduct)

  const dbRelatedProducts = await getProductsByCategory(dbProduct.category_id)
  const relatedProducts = dbRelatedProducts
    .map(toProductShape)
    .filter((p) => p.id !== product.id)
    .slice(0, 4)

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1">
        {/* Breadcrumb */}
        <div className="bg-muted py-4">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <Link href="/" className="hover:text-primary">
                الرئيسية
              </Link>
              <ChevronRight className="h-4 w-4" />
              <Link
                href={`/category/${product.category}`}
                className="hover:text-primary"
              >
                {product.categoryAr}
              </Link>
              <ChevronRight className="h-4 w-4" />
              <span className="font-semibold">{product.nameAr}</span>
            </div>
          </div>
        </div>

        {/* Product Details */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Product Image */}
              <div className="relative aspect-square rounded-lg overflow-hidden shadow-xl">
                <Image
                  src={product.image}
                  alt={product.nameAr}
                  fill
                  className="object-cover"
                  priority
                />
                {product.bestSeller && (
                  <Badge className="absolute top-4 right-4 text-base px-4 py-2 bg-accent gap-2">
                    <Star className="h-4 w-4 fill-current" />
                    الأكثر مبيعًا
                  </Badge>
                )}
              </div>

              {/* Product Info */}
              <div className="flex flex-col gap-6">
                <div>
                  <h1 className="text-4xl md:text-5xl font-bold mb-2">
                    {product.nameAr}
                  </h1>
                  <p className="text-xl text-muted-foreground">{product.name}</p>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-primary">
                    {product.price}
                  </span>
                  <span className="text-2xl text-muted-foreground">جنيه</span>
                </div>

                <div className="bg-muted p-6 rounded-lg">
                  <h3 className="font-bold text-lg mb-2">الوصف</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {product.descriptionAr}
                  </p>
                  <p className="text-muted-foreground leading-relaxed mt-2 text-sm">
                    {product.description}
                  </p>
                </div>

                <AddToCartWidget product={product} />

                {/* Category Badge */}
                <div>
                  <Link
                    href={`/category/${product.category}`}
                    className="inline-block"
                  >
                    <Badge variant="outline" className="text-base px-4 py-2">
                      الفئة: {product.categoryAr}
                    </Badge>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="py-16 bg-muted">
            <div className="container mx-auto px-4">
              <h2 className="text-3xl font-bold mb-8 text-center">
                منتجات ذات صلة
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {relatedProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  )
}
