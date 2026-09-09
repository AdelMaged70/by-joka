'use server'

import { supabaseAdmin } from '@/lib/supabase-admin'
import bcrypt from 'bcryptjs'

export async function loginCashier(email: string, password: string) {
  try {
    const { data: cashier, error } = await supabaseAdmin
      .from('cashiers')
      .select(`
        id,
        email,
        password_hash,
        name,
        branch_id,
        branches(id, name, city)
      `)
      .eq('email', email)
      .single()

    if (error || !cashier) {
      return { error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' }
    }

    const passwordMatch = await bcrypt.compare(password, cashier.password_hash)
    if (!passwordMatch) {
      return { error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' }
    }

    return {
      success: true,
      cashier: {
        id: cashier.id,
        email: cashier.email,
        name: cashier.name,
        branchId: cashier.branch_id,
        branchName: (cashier.branches as any)?.name,
        branchCity: (cashier.branches as any)?.city
      }
    }
  } catch (error) {
    console.error('Login error:', error)
    return { error: 'حدث خطأ أثناء محاولة تسجيل الدخول' }
  }
}

export async function getBranchOrders(branchId: string) {
  try {
    const { data: orders, error } = await supabaseAdmin
      .from('orders')
      .select(`
        id,
        customer_name,
        customer_phone,
        customer_email,
        customer_address,
        total_price,
        status,
        notes,
        created_at,
        order_items(
          id,
          product_name,
          product_id,
          quantity,
          price
        )
      `)
      .eq('branch_id', branchId)
      .order('created_at', { ascending: false })

    if (error) throw error

    if (!orders || orders.length === 0) {
      return { success: true, orders: [] }
    }

    // Collect all unique product_ids from all orders
    const productIds = [
      ...new Set(
        orders.flatMap(o =>
          (o.order_items as any[]).map((i: any) => i.product_id).filter(Boolean)
        )
      ),
    ]

    // Fetch Arabic names for those products (separate safe query - no FK needed)
    let nameArMap: Record<string, string> = {}
    if (productIds.length > 0) {
      const { data: products } = await supabaseAdmin
        .from('products')
        .select('id, name_ar')
        .in('id', productIds)

      if (products) {
        products.forEach((p: any) => {
          nameArMap[p.id] = p.name_ar
        })
      }
    }

    // Inject product_name_ar into each order_item
    const enrichedOrders = orders.map(order => ({
      ...order,
      order_items: (order.order_items as any[]).map((item: any) => ({
        ...item,
        product_name_ar: nameArMap[item.product_id] || item.product_name,
      })),
    }))

    return { success: true, orders: enrichedOrders }
  } catch (error) {
    console.error('Error fetching orders:', error)
    return { error: 'فشل تحميل الطلبات' }
  }
}

export async function updateOrderStatus(orderId: string, status: 'pending' | 'done' | 'canceled', branchId: string) {
  try {
    const { error } = await supabaseAdmin
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .eq('branch_id', branchId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Error updating order:', error)
    return { error: 'فشل تحديث حالة الطلب' }
  }
}

export async function deleteOrder(orderId: string, branchId: string) {
  try {
    const { error } = await supabaseAdmin
      .from('orders')
      .delete()
      .eq('id', orderId)
      .eq('branch_id', branchId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Error deleting order:', error)
    return { error: 'فشل حذف الطلب' }
  }
}

export async function createOrder(
  branchId: string,
  customerName: string,
  customerPhone: string,
  customerEmail: string,
  customerAddress: string,
  totalPrice: number,
  items: Array<{ productName: string; productId: string; quantity: number; price: number }>,
  notes?: string
) {
  try {
    // Security Fix: Fetch product prices directly from DB
    const productIds = (items || [])
      .map(item => String(item.productId || (item as any).id || (item as any).product_id))
      .filter(id => id && id !== 'unknown' && id !== 'null' && id !== 'undefined')

    const dbProductMap = new Map<string, { price: number; name_ar?: string; name?: string }>()

    if (productIds.length > 0) {
      const { data: dbProducts } = await supabaseAdmin
        .from('products')
        .select('id, price, name_ar, name')
        .in('id', productIds)

      if (dbProducts) {
        dbProducts.forEach((p: any) => {
          dbProductMap.set(String(p.id), {
            price: Number(p.price) || 0,
            name_ar: p.name_ar,
            name: p.name
          })
        })
      }
    }

    let calculatedTotalPrice = 0
    const validatedItems = items.map(item => {
      const rawId = item.productId || (item as any).id || (item as any).product_id
      const finalProductId = (rawId && rawId !== 'null' && rawId !== 'undefined') ? String(rawId) : 'unknown'
      const dbProduct = dbProductMap.get(finalProductId)
      const unitPrice = dbProduct ? dbProduct.price : (Number(item.price) || 0)
      const quantity = Number(item.quantity) || 1

      calculatedTotalPrice += unitPrice * quantity

      return {
        product_id: finalProductId,
        product_name: dbProduct?.name_ar || dbProduct?.name || item.productName || (item as any).name || (item as any).nameAr || 'منتج',
        quantity: quantity,
        price: unitPrice
      }
    })

    const finalTotalPrice = calculatedTotalPrice > 0 ? calculatedTotalPrice : Number(totalPrice)

    // Create order
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        branch_id: branchId,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail,
        customer_address: customerAddress,
        total_price: finalTotalPrice,
        notes: notes || '',
        status: 'pending'
      })
      .select()
      .single()

    if (orderError) throw orderError

    // Create order items
    const orderItems = validatedItems.map(item => ({
      order_id: order.id,
      ...item
    }))

    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItems)

    if (itemsError) throw itemsError

    return { success: true, orderId: order.id }
  } catch (error) {
    console.error('Error creating order:', error)
    return { error: 'فشل إنشاء الطلب' }
  }
}
export async function getBranches() {
  try {
    const { data: branches, error } = await supabaseAdmin
      .from('branches')
      .select('id, name, city')
      .order('name', { ascending: true })

    if (error) throw error

    return {
      success: true,
      branches: (branches || []).map((b) => {
        // Show "name - city" if city is different from name, otherwise just name
        const displayName =
          b.city && b.city.toLowerCase() !== b.name.toLowerCase()
            ? `${b.name} - ${b.city}`
            : b.name
        return {
          id: b.id,
          name: b.name,
          nameAr: displayName,
          city: b.city ?? b.name,
        }
      }),
    }
  } catch (error) {
    console.error('Error fetching branches:', error)
    return { error: 'فشل تحميل الفروع', branches: [] }
  }
}

export async function getBranchStatus(branchId: string) {
  try {
    const { data: branch, error } = await supabaseAdmin
      .from('branches')
      .select('is_open')
      .eq('id', branchId)
      .single()

    if (error) {
      // If column doesn't exist yet, we might get an error. 
      // We'll return true as default.
      console.warn('Could not fetch branch status:', error)
      return { success: true, isOpen: true }
    }

    return { success: true, isOpen: branch.is_open ?? true }
  } catch (error) {
    console.error('Error fetching branch status:', error)
    return { success: true, isOpen: true }
  }
}

export async function updateBranchStatus(branchId: string, isOpen: boolean) {
  try {
    const { error } = await supabaseAdmin
      .from('branches')
      .update({ is_open: isOpen })
      .eq('id', branchId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Error updating branch status:', error)
    return { error: 'فشل تحديث حالة الفرع' }
  }
}
