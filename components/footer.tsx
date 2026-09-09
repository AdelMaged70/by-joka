import Link from 'next/link'
import { Phone, Mail, MapPin, Facebook, Instagram } from 'lucide-react'

export function Footer() {
  return (
    <footer className="bg-primary text-foreground mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* About */}
          <div>
            <div className="flex items-center mb-4">
              <img src="/images/logo.png" alt="by Joka" className="h-10 w-auto" />
            </div>
            {/* ممكن تضيف هنا سلوجن  */}
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-bold mb-4">روابط سريعة</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="hover:text-primary transition-colors">
                  الرئيسية
                </Link>
              </li>
              <li>
                <Link
                  href="/categories"
                  className="hover:text-primary transition-colors"
                >
                  القائمة
                </Link>
              </li>
              <li>
                <Link
                  href="/cart"
                  className="hover:text-primary transition-colors"
                >
                  السلة
                </Link>
              </li>
              <li>
                <Link
                  href="/checkout"
                  className="hover:text-primary transition-colors"
                >
                  الطلب
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-bold mb-4">تواصل معنا</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-foreground" />
                <span>01128750953</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-foreground" />
                <span>gehadelbatawy@gmail.com</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-foreground" />
                <span>لدينا فرع واحد فقط فى دسوق </span>
              </li>
            </ul>

            {/* Social Media */}
            <div className="flex gap-3 mt-4">
              <a
                href="https://www.facebook.com/share/18SrkbuA4i/"
                className="h-9 w-9 rounded-full bg-primary-foreground text-primary flex items-center justify-center hover:opacity-80 transition-opacity"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a
                href="https://www.instagram.com/__by_joka?stkn=MXFieWZqM2EwMmV1cg=="
                className="h-9 w-9 rounded-full bg-primary-foreground text-primary flex items-center justify-center hover:opacity-80 transition-opacity"
              >
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border mt-8 pt-8 text-center text-sm opacity-80">
          <p>Copyright © by joka 2026. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
