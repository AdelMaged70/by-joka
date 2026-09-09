import { Navigation } from '@/components/navigation'
import { Footer } from '@/components/footer'
import { HeroCarousel } from '@/components/hero-carousel'
import { CategoriesSection } from '@/components/categories-section'
import { BestSellersSection } from '@/components/best-sellers-section'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1">
        {/* <HeroCarousel /> */}
        <CategoriesSection />
        <BestSellersSection />
      </main>
      <Footer />
    </div>
  )
}
