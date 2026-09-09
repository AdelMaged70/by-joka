'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Minus, Plus, ShoppingCart } from 'lucide-react'
import { useCart } from '@/contexts/cart-context'
import { useToast } from '@/hooks/use-toast'
import { Product } from '@/lib/products'

interface AddToCartWidgetProps {
  product: Product
}

export function AddToCartWidget({ product }: AddToCartWidgetProps) {
  const [quantity, setQuantity] = useState(1)
  const { addItem } = useCart()
  const { toast } = useToast()

  const incrementQuantity = () => setQuantity((q) => q + 1)
  const decrementQuantity = () => setQuantity((q) => Math.max(1, q - 1))

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addItem({
        id: product.id,
        name: product.name,
        nameAr: product.nameAr,
        price: product.price,
        image: product.image,
        category: product.category,
      })
    }
    toast({
      title: 'تمت الإضافة إلى السلة',
      description: `${quantity}x ${product.nameAr} تم إضافته بنجاح`,
    })
    setQuantity(1)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <span className="font-semibold text-lg">الكمية:</span>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={decrementQuantity}
            disabled={quantity <= 1}
            className="cursor-pointer"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="text-2xl font-bold w-12 text-center">
            {quantity}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={incrementQuantity}
            className="cursor-pointer"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Button
        onClick={handleAddToCart}
        size="lg"
        className="w-full text-xl py-8 gap-3 cursor-pointer"
      >
        <ShoppingCart className="h-6 w-6" />
        أضف إلى السلة - {(product.price * quantity).toFixed(0)} جنيه
      </Button>
    </div>
  )
}
