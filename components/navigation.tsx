'use client'

import Link from 'next/link'
import { ShoppingCart, Menu, LogOut, User as UserIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCart } from '@/contexts/cart-context'
import { useState, useEffect, Suspense } from 'react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { useAuth } from '@/contexts/auth-context'
import { useSearchParams } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

function PaymentToastHandler() {
  const searchParams = useSearchParams()
  const { clearCart } = useCart()
  const { toast } = useToast()

  useEffect(() => {
    if (searchParams && searchParams.get('payment') === 'success') {
      clearCart()
      toast({
        title: 'تم الدفع بنجاح!',
        description: 'تم تأكيد طلبك بنجاح وسنقوم بتحضيره وتوصيله إليك بأسرع وقت.',
      })
      const url = new URL(window.location.href)
      url.searchParams.delete('payment')
      url.searchParams.delete('orderId')
      window.history.replaceState({}, '', url.toString())
    }
  }, [searchParams, clearCart, toast])

  return null
}

export function Navigation() {
  const { totalItems } = useCart()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth()

  const navLinks = [
    { href: '/', label: 'الرئيسية', labelEn: 'Home' },
    { href: '/categories', label: 'المنيو', labelEn: 'Menu' },
    { href: '/cart', label: 'السلة', labelEn: 'Cart' },
    { href: '/reviews', label: 'التقييمات', labelEn: 'Reviews' },
  ]

  return (
    <nav className="sticky top-0 z-50 bg-primary text-primary-foreground shadow-lg">
      <Suspense fallback={null}>
        <PaymentToastHandler />
      </Suspense>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <img src="/images/logo.png" alt="by Joka" className="h-10 w-auto" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hover:opacity-80 transition-opacity font-medium"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Controls: Auth + Cart */}
          <div className="flex items-center gap-2">
            {/* Google Authentication */}
            {authLoading ? (
              <div className="h-9 w-9 animate-pulse bg-secondary rounded-full" />
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full border border-primary-foreground/20 cursor-pointer overflow-hidden p-0 flex items-center justify-center">
                    {user.user_metadata?.avatar_url ? (
                      <img src={user.user_metadata.avatar_url} alt={user.user_metadata.full_name || 'User'} className="h-full w-full object-cover" />
                    ) : (
                      <span className="font-bold text-sm text-[var(--accent-foreground)] bg-accent h-full w-full flex items-center justify-center">
                        {(user.user_metadata?.full_name || user.email || 'U')[0].toUpperCase()}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-primary border-primary-foreground/10 text-primary-foreground">
                  <DropdownMenuLabel className="font-normal text-right">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-semibold truncate leading-none">{user.user_metadata?.full_name || 'مستخدم'}</p>
                      <p className="text-xs leading-none text-muted-foreground/90 truncate">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-primary-foreground/10" />
                  <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer text-red-400 focus:text-red-305 focus:bg-primary-foreground/10 flex items-center justify-between text-right direction-rtl w-full gap-2">
                    <LogOut className="h-4 w-4" />
                    <span>تسجيل الخروج</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button 
                variant="secondary" 
                size="sm" 
                className="gap-1.5 cursor-pointer border border-primary-foreground/10 hover:bg-secondary/90 flex items-center"
                onClick={() => signInWithGoogle()}
              >
                {/* Standard color Google icon */}
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5.04c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31l3.57 2.77c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                </svg>
                <span className="hidden sm:inline font-medium text-xs">تسجيل الدخول</span>
              </Button>
            )}

            <Link href="/cart">
              <Button variant="secondary" size="sm" className="relative gap-2 cursor-pointer">
                <ShoppingCart className="h-5 w-5 " />
                {totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 bg-accent text-accent-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
                <span className="hidden sm:inline">السلة</span>
              </Button>
            </Link>

            {/* Mobile Menu Button */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="secondary" size="sm">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64">
                <div className="flex flex-col gap-4 mt-8">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="text-lg font-medium hover:text-primary transition-colors p-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  )
}
