import { getBestSellers, toProductShape } from '@/lib/db'
import { ProductCard } from '@/components/product-card'

export async function BestSellersSection() {
  const dbBestSellers = await getBestSellers()
  const bestSellers = dbBestSellers.map(toProductShape)

  if (bestSellers.length === 0) return null

  return (
    <section className="py-16 bg-muted">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">الأكثر مبيعًا</h2>
          <p className="text-muted-foreground text-lg">
            أطباقنا المفضلة لدى العملاء
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {bestSellers.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  )
}
