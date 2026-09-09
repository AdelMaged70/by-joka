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

const GUEST_CART_KEY = 'joka_guest_cart'
const getCartKey = (userId?: string | null) => (userId ? `joka_cart_${userId}` : GUEST_CART_KEY)

const readLocalCart = (key: string): CartItem[] => {
  if (typeof window === 'undefined') return []
  try {
    const data = localStorage.getItem(key)
    if (data) {
      const parsed = JSON.parse(data)
      if (Array.isArray(parsed)) return parsed
    }
  } catch (e) {
    console.error('Failed to read cart from localStorage:', e)
  }
  return []
}

const writeLocalCart = (key: string, items: CartItem[]) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(items))
  } catch (e) {
    console.error('Failed to write cart to localStorage:', e)
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [items, setItems] = useState<CartItem[]>([])
  const [isLoadingCart, setIsLoadingCart] = useState(true)
  const [isMounted, setIsMounted] = useState(false)

  // 1. Initial Load on Mount (read localStorage immediately so F5 refresh has items instantly)
  useEffect(() => {
    setIsMounted(true)
    const key = getCartKey(user?.id)
    const local = readLocalCart(key)
    if (local.length > 0) {
      setItems(local)
    }
  }, [])

  // 2. Account Sync & Database Persistence
  useEffect(() => {
    if (!isMounted) return

    const syncCart = async () => {
      setIsLoadingCart(true)
      const currentKey = getCartKey(user?.id)

      if (!user?.id) {
        // Guest user: load from localStorage
        const guestItems = readLocalCart(GUEST_CART_KEY)
        setItems(guestItems)
        setIsLoadingCart(false)
        return
      }

      // Logged-in user:
      let accountItems = readLocalCart(currentKey)

      // If guest cart has items (user just signed in), merge into account cart
      const guestItems = readLocalCart(GUEST_CART_KEY)
      if (guestItems.length > 0) {
        const itemMap = new Map<string, CartItem>()
        accountItems.forEach((i) => itemMap.set(i.id, i))
        guestItems.forEach((g) => {
          if (itemMap.has(g.id)) {
            const existing = itemMap.get(g.id)!
            itemMap.set(g.id, { ...existing, quantity: existing.quantity + g.quantity })
          } else {
            itemMap.set(g.id, g)
          }
        })
        accountItems = Array.from(itemMap.values())
        writeLocalCart(currentKey, accountItems)
        try {
          localStorage.removeItem(GUEST_CART_KEY)
        } catch {}
      }

      // Set items from local cache immediately
      setItems(accountItems)

      // Fetch latest cart from Supabase database
      try {
        await syncAccount(user)

        const { data, error } = await supabaseClient
          .from('cart')
          .select('*')
          .eq('account_id', user.id)

        if (!error && data) {
          const dbItems: CartItem[] = data.map((row: any) => ({
            id: row.product_id,
            name: row.name,
            nameAr: row.name_ar,
            price: Number(row.price),
            image: row.image,
            category: row.category,
            quantity: Number(row.quantity),
          }))

          if (dbItems.length > 0) {
            const mergedMap = new Map<string, CartItem>()
            dbItems.forEach((item) => mergedMap.set(item.id, item))
            accountItems.forEach((item) => {
              if (!mergedMap.has(item.id)) {
                mergedMap.set(item.id, item)
              }
            })
            const mergedList = Array.from(mergedMap.values())
            setItems(mergedList)
            writeLocalCart(currentKey, mergedList)
          } else if (accountItems.length > 0) {
            // Push local items to DB if DB is currently empty
            for (const item of accountItems) {
              await supabaseClient.from('cart').upsert(
                {
                  account_id: user.id,
                  product_id: item.id,
                  name: item.name,
                  name_ar: item.nameAr,
                  price: item.price,
                  image: item.image,
                  category: item.category,
                  quantity: item.quantity,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: 'account_id, product_id' }
              )
            }
          }
        }
      } catch (err) {
        console.error('Failed syncing account cart with database:', err)
      } finally {
        setIsLoadingCart(false)
      }
    }

    if (!authLoading) {
      syncCart()
    }
  }, [user?.id, authLoading, isMounted])

  // Add Item
  const addItem = async (newItem: Omit<CartItem, 'quantity'>) => {
    let nextQuantity = 1

    setItems((current) => {
      const existingItem = current.find((item) => item.id === newItem.id)
      if (existingItem) {
        nextQuantity = existingItem.quantity + 1
      }
      const updated = existingItem
        ? current.map((item) =>
            item.id === newItem.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        : [...current, { ...newItem, quantity: 1 }]

      const key = getCartKey(user?.id)
      writeLocalCart(key, updated)
      return updated
    })

    if (user?.id) {
      try {
        await syncAccount(user)
        await supabaseClient.from('cart').upsert(
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
      } catch (err) {
        console.error('Failed to sync added item with database:', err)
      }
    }
  }

  // Remove Item
  const removeItem = async (id: string) => {
    setItems((current) => {
      const updated = current.filter((item) => item.id !== id)
      const key = getCartKey(user?.id)
      writeLocalCart(key, updated)
      return updated
    })

    if (user?.id) {
      try {
        await supabaseClient
          .from('cart')
          .delete()
          .eq('account_id', user.id)
          .eq('product_id', id)
      } catch (err) {
        console.error('Failed to remove item from database:', err)
      }
    }
  }

  // Update Quantity
  const updateQuantity = async (id: string, quantity: number) => {
    if (quantity <= 0) {
      await removeItem(id)
      return
    }

    setItems((current) => {
      const updated = current.map((item) =>
        item.id === id ? { ...item, quantity } : item
      )
      const key = getCartKey(user?.id)
      writeLocalCart(key, updated)
      return updated
    })

    if (user?.id) {
      try {
        await supabaseClient
          .from('cart')
          .update({
            quantity,
            updated_at: new Date().toISOString(),
          })
          .eq('account_id', user.id)
          .eq('product_id', id)
      } catch (err) {
        console.error('Failed to update item quantity in database:', err)
      }
    }
  }

  // Clear Cart
  const clearCart = async () => {
    setItems([])
    const key = getCartKey(user?.id)
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(key)
        localStorage.removeItem(GUEST_CART_KEY)
      } catch {}
    }

    if (user?.id) {
      try {
        await supabaseClient
          .from('cart')
          .delete()
          .eq('account_id', user.id)
      } catch (err) {
        console.error('Failed to clear database cart:', err)
      }
    }
  }

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

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
