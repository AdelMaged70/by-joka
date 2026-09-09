'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import Autoplay from 'embla-carousel-autoplay'
import { useRef } from 'react'

const slides = [
  {
    image: '/images/hero-1.jpg',
    title: 'جمبري طازج يوميًا',
    titleEn: 'Fresh Shrimp Daily',
    subtitle: 'أطعم أطباقنا المميزة من الجمبري الطازج',
    subtitleEn: 'Taste our signature fresh shrimp dishes',
  },
  {
    image: '/images/hero-2.jpg',
    title: 'أطباق بحرية فاخرة',
    titleEn: 'Luxury Seafood Platters',
    subtitle: 'تشكيلة واسعة من المأكولات البحرية',
    subtitleEn: 'Wide selection of seafood delicacies',
  },
  {
    image: '/images/hero-3.jpg',
    title: 'استاكوزا ممتازة',
    titleEn: 'Premium Lobster',
    subtitle: 'جودة عالية وطعم لا يُنسى',
    subtitleEn: 'High quality and unforgettable taste',
  },
]

export function HeroCarousel() {
  const plugin = useRef(Autoplay({ delay: 5000, stopOnInteraction: true }))

  return (
    <div className="relative w-full bg-muted">
      <Carousel
        opts={{
          align: 'start',
          loop: true,
          direction: 'rtl',
        }}
        plugins={[plugin.current]}
        className="w-full"
      >
        <CarouselContent>
          {slides.map((slide, index) => (
            <CarouselItem key={index}>
              <div className="relative h-[400px] md:h-[600px] w-full">
                <Image
                  src={slide.image}
                  alt={slide.titleEn}
                  fill
                  className="object-cover"
                  priority={index === 0}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="container mx-auto px-4">
                    <div className="max-w-3xl text-center text-white">
                      <h1 className="text-4xl md:text-6xl font-bold mb-4 text-balance">
                        {slide.title}
                      </h1>
                      <p className="text-xl md:text-2xl mb-8 opacity-90">
                        {slide.subtitle}
                      </p>
                      <Link href="/categories">
                        <Button size="lg" className="text-lg px-8">
                          استكشف القائمة
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="start-4 bg-white/90 hover:bg-white" />
        <CarouselNext className="end-4 bg-white/90 hover:bg-white" />
      </Carousel>
    </div>
  )
}
