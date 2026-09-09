'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ShoppingCart, Star } from 'lucide-react'
import { Product } from '@/lib/products'
import { useCart } from '@/contexts/cart-context'
import { useToast } from '@/hooks/use-toast'

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart()
  const { toast } = useToast()

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    addItem({
      id: product.id,
      name: product.name,
      nameAr: product.nameAr,
      price: product.price,
      image: product.image,
      category: product.category,
    })
    toast({
      title: 'تمت الإضافة إلى السلة',
      description: `${product.nameAr} تم إضافته بنجاح`,
    })
  }

  return (
    <Link href={`/product/${product.id}`}>
      <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full flex flex-col">
        <div className="relative h-56 w-full overflow-hidden">
          <Image
            src={product.image}
            alt={product.nameAr}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-300"
          />
          {product.bestSeller && (
            <Badge className="absolute top-3 right-3 bg-accent gap-1">
              <Star className="h-3 w-3 fill-current" />
              الأكثر مبيعًا
            </Badge>
          )}
        </div>
        <CardContent className="p-4 flex-1">
          <h3 className="font-bold text-lg mb-1 line-clamp-1">
            {product.nameAr}
          </h3>
          <p className="text-sm text-muted-foreground mb-2 line-clamp-1">
            {product.name}
          </p>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {product.descriptionAr}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-primary">
              {product.price} جنيه
            </span>
          </div>
        </CardContent>
        <CardFooter className="p-4 pt-0">
          <Button
            onClick={handleAddToCart}
            className="w-full gap-2 cursor-pointer"
            size="lg"
            
          >
            <ShoppingCart className="h-5 w-5" />
            أضف للسلة
          </Button>
        </CardFooter>
      </Card>
    </Link>
  )
}
