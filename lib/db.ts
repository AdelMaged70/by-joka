/**
 * lib/db.ts
 * دوال جلب البيانات من Supabase (categories & products)
 * يُستخدم في صفحات Next.js بديلاً عن البيانات الثابتة في products.ts
 */

import { createClient } from '@supabase/supabase-js'

// ─── Types ────────────────────────────────────────────────────────────────────
// reiview
    export interface Review {
    id: string;
    video_url: string;
    created_at: string;
    }

export interface DBCategory {
    id: string
    name: string
    name_ar: string
    icon: string
    sort_order: number
    is_active: boolean
}

export interface DBProduct {
    id: string
    name: string
    name_ar: string
    description: string
    description_ar: string
    price: number
    image: string
    category_id: string
    is_featured: boolean
    is_best_seller: boolean
    is_active: boolean
    sort_order: number
    // joined field from categories
    categories?: { name: string; name_ar: string; icon: string } | null
}

// ─── Supabase client (server-side safe) ─────────────────────────────────────

function getSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !key) {
        throw new Error('Missing Supabase environment variables')
    }
    return createClient(url, key)
}

// ─── Categories ───────────────────────────────────────────────────────────────

/** جلب كل التصنيفات النشطة مرتبة حسب sort_order */
export async function getCategories(): Promise<DBCategory[]> {
    const supabase = getSupabase()
    const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

    if (error) {
        console.error('Error fetching categories:', error.message)
        return []
    }
    return data as DBCategory[]
}

/** جلب تصنيف واحد بالـ id */
export async function getCategoryById(id: string): Promise<DBCategory | null> {
    const supabase = getSupabase()
    const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('id', id)
        .eq('is_active', true)
        .single()

    if (error) {
        console.error('Error fetching category:', error.message)
        return null
    }
    return data as DBCategory
}

// ─── Products ─────────────────────────────────────────────────────────────────

/** جلب كل المنتجات النشطة مع بيانات التصنيف */
export async function getProducts(): Promise<DBProduct[]> {
    const supabase = getSupabase()
    const { data, error } = await supabase
        .from('products')
        .select('*, categories(name, name_ar, icon)')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

    if (error) {
        console.error('Error fetching products:', error.message)
        return []
    }
    return data as DBProduct[]
}

/** جلب منتج واحد بالـ id */
export async function getProductById(id: string): Promise<DBProduct | null> {
    const supabase = getSupabase()
    const { data, error } = await supabase
        .from('products')
        .select('*, categories(name, name_ar, icon)')
        .eq('id', id)
        .eq('is_active', true)
        .single()

    if (error) {
        console.error('Error fetching product:', error.message)
        return null
    }
    return data as DBProduct
}

/** جلب منتجات تصنيف معين */
export async function getProductsByCategory(
    categoryId: string
): Promise<DBProduct[]> {
    const supabase = getSupabase()
    const { data, error } = await supabase
        .from('products')
        .select('*, categories(name, name_ar, icon)')
        .eq('category_id', categoryId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

    if (error) {
        console.error('Error fetching products by category:', error.message)
        return []
    }
    return data as DBProduct[]
}

/** جلب المنتجات المميزة (featured) */
export async function getFeaturedProducts(): Promise<DBProduct[]> {
    const supabase = getSupabase()
    const { data, error } = await supabase
        .from('products')
        .select('*, categories(name, name_ar, icon)')
        .eq('is_featured', true)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

    if (error) {
        console.error('Error fetching featured products:', error.message)
        return []
    }
    return data as DBProduct[]
}

/** جلب الأكثر مبيعاً (best sellers) */
export async function getBestSellers(): Promise<DBProduct[]> {
    const supabase = getSupabase()
    const { data, error } = await supabase
        .from('products')
        .select('*, categories(name, name_ar, icon)')
        .eq('is_best_seller', true)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

    if (error) {
        console.error('Error fetching best sellers:', error.message)
        return []
    }
    return data as DBProduct[]
}

// ─── Helper: تحويل DBProduct → نفس شكل Product القديم ────────────────────────
// عشان تسهّل التوافق مع المكونات الموجودة

export function toProductShape(p: DBProduct) {
    return {
        id: p.id,
        name: p.name,
        nameAr: p.name_ar,
        description: p.description,
        descriptionAr: p.description_ar,
        price: Number(p.price),
        image: p.image,
        category: p.category_id,
        categoryAr: p.categories?.name_ar ?? '',
        featured: p.is_featured,
        bestSeller: p.is_best_seller,
    }
}

export function toCategoryShape(c: DBCategory) {
    return {
        id: c.id,
        name: c.name,
        nameAr: c.name_ar,
        icon: c.icon,
    }
}
