'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useAuth, syncAccount } from '@/contexts/auth-context'
import { supabaseClient } from '@/lib/supabase-admin'

export interface CartItem {
  id: string
  name: string
  nameAr: string
  price: number
  image: string
  quantity: number
  category: string
}

interface CartContextType {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'quantity'>) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  totalItems: number
  totalPrice: number
  isLoadingCart: boolean
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [items, setItems] = useState<CartItem[]>([])
  const [isLoadingCart, setIsLoadingCart] = useState(true)
  const [isMounted, setIsMounted] = useState(false)

  // 1. Fetch Cart from Supabase Database linked to user account
  useEffect(() => {
    setIsMounted(true)

    const fetchCartFromAccount = async () => {
      setIsLoadingCart(true)

      if (!user?.id) {
        // If not logged in, cart is empty (linked to account, not local storage)
        setItems([])
        setIsLoadingCart(false)
        return
      }

      try {
        // Ensure user account exists in account table
        await syncAccount(user)

        const { data, error } = await supabaseClient
          .from('cart')
          .select('*')
          .eq('account_id', user.id)

        if (error) {
          console.error('Error fetching cart from database account:', error.message)
          setItems([])
        } else if (data) {
          const dbItems: CartItem[] = data.map((row: any) => ({
            id: row.product_id,
            name: row.name,
            nameAr: row.name_ar,
            price: Number(row.price),
            image: row.image,
            category: row.category,
            quantity: Number(row.quantity),
          }))
          setItems(dbItems)
        }
      } catch (err) {
        console.error('Unexpected error loading account cart:', err)
      } finally {
        setIsLoadingCart(false)
      }
    }

    fetchCartFromAccount()
  }, [user?.id])

  // 2. Add Item linked to Account
  const addItem = async (newItem: Omit<CartItem, 'quantity'>) => {
    let nextQuantity = 1

    setItems((current) => {
      const existingItem = current.find((item) => item.id === newItem.id)
      if (existingItem) {
        nextQuantity = existingItem.quantity + 1
        return current.map((item) =>
          item.id === newItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...current, { ...newItem, quantity: 1 }]
    })

    if (user?.id) {
      try {
        await syncAccount(user)
        const { error } = await supabaseClient.from('cart').upsert(
          {
            account_id: user.id,
            product_id: newItem.id,
            name: newItem.name,
            name_ar: newItem.nameAr,
            price: newItem.price,
            image: newItem.image,
            category: newItem.category,
            quantity: nextQuantity,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'account_id, product_id' }
        )

        if (error) {
          console.error('Error adding item to account cart:', error.message)
        }
      } catch (err) {
        console.error('Failed to sync added item with database:', err)
      }
    }
  }

  // 3. Remove Item from Account
  const removeItem = async (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id))

    if (user?.id) {
      try {
        const { error } = await supabaseClient
          .from('cart')
          .delete()
          .eq('account_id', user.id)
          .eq('product_id', id)

        if (error) {
          console.error('Error removing item from account cart:', error.message)
        }
      } catch (err) {
        console.error('Failed to remove item from database:', err)
      }
    }
  }

  // 4. Update Quantity in Account
  const updateQuantity = async (id: string, quantity: number) => {
    if (quantity <= 0) {
      await removeItem(id)
      return
    }

    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, quantity } : item))
    )

    if (user?.id) {
      try {
        const { error } = await supabaseClient
          .from('cart')
          .update({
            quantity,
            updated_at: new Date().toISOString(),
          })
          .eq('account_id', user.id)
          .eq('product_id', id)

        if (error) {
          console.error('Error updating quantity in account cart:', error.message)
        }
      } catch (err) {
        console.error('Failed to update item quantity in database:', err)
      }
    }
  }

  // 5. Clear Cart in Account
  const clearCart = async () => {
    setItems([])

    if (user?.id) {
      try {
        const { error } = await supabaseClient
          .from('cart')
          .delete()
          .eq('account_id', user.id)

        if (error) {
          console.error('Error clearing account cart:', error.message)
        }
      } catch (err) {
        console.error('Failed to clear database cart:', err)
      }
    }
  }

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  // Prevent hydration mismatch
  if (!isMounted) {
    return (
      <CartContext.Provider
        value={{
          items: [],
          addItem,
          removeItem,
          updateQuantity,
          clearCart,
          totalItems: 0,
          totalPrice: 0,
          isLoadingCart: true,
        }}
      >
        {children}
      </CartContext.Provider>
    )
  }

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
        isLoadingCart,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
