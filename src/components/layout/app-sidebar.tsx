
"use client"

import { LayoutDashboard, Package, ShoppingCart, BarChart3, Sun, Moon, Languages, Users, LogIn, LogOut } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { useEffect, useState, useRef } from "react"
import { useTranslation } from "@/context/language-context"
import { useAuth } from "@/context/auth-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { db } from "@/lib/db"

export function AppSidebar() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const { lang, setLang, t, dir } = useTranslation()
  const { user, loginWithGoogle, logout, loading } = useAuth()
  const [mounted, setMounted] = useState(false)
  const lastUidRef = useRef<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || loading) return;

    if (user) {
      const currentUid = user.uid;
      localStorage.setItem('salesphere_uid', currentUid)
      
      // نقوم بالسحب من السحاب فقط عند تغيير المستخدم أو التحميل الأول
      if (lastUidRef.current !== currentUid) {
        db.pullFromCloud(currentUid);
        lastUidRef.current = currentUid;
      }
    } else {
      lastUidRef.current = null;
    }
  }, [user, loading, mounted])

  const items = [
    {
      title: t.dashboard,
      url: "/",
      icon: LayoutDashboard,
    },
    {
      title: t.products,
      url: "/products",
      icon: Package,
    },
    {
      title: t.customers,
      url: "/customers",
      icon: Users,
    },
    {
      title: t.salesEntry,
      url: "/sales-entry",
      icon: ShoppingCart,
    },
    {
      title: t.reports,
      url: "/reports",
      icon: BarChart3,
    },
  ]

  if (!mounted) return null

  return (
    <Sidebar collapsible="icon" side={dir === "rtl" ? "right" : "left"}>
      <SidebarHeader className="h-20 flex items-center px-6 border-b">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-lg">
            B
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="font-headline font-bold text-lg tracking-tight">
              Bedaya
            </span>
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Enterprise</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t.management}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={pathname === item.url} tooltip={item.title}>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t space-y-2">
        <SidebarMenu>
          {user ? (
            <SidebarMenuItem>
              <div className="flex items-center gap-3 px-2 py-2 mb-2 bg-muted/50 rounded-lg group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:bg-transparent">
                <Avatar className="h-8 w-8 border-2 border-primary/20">
                  <AvatarImage src={user.photoURL || ""} />
                  <AvatarFallback>{user.displayName?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
                  <span className="text-xs font-bold truncate">{user.displayName}</span>
                  <button onClick={() => {
                    db.clearLocalData();
                    logout();
                  }} className="text-[10px] text-destructive font-medium flex items-center gap-1 hover:underline text-left">
                    <LogOut className="h-3 w-3" /> {lang === 'ar' ? 'خروج' : 'Logout'}
                  </button>
                </div>
              </div>
            </SidebarMenuItem>
          ) : (
            <SidebarMenuItem>
              <SidebarMenuButton onClick={loginWithGoogle} disabled={loading} className="bg-primary text-primary-foreground hover:bg-primary/90">
                <LogIn className="h-4 w-4" />
                <span>{lang === 'ar' ? 'دخول بجوجل' : 'Login with Google'}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}

          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => setLang(lang === "en" ? "ar" : "en")}
              tooltip={t.language}
            >
              <Languages className="h-4 w-4" />
              <span>{lang === "en" ? "العربية" : "English"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              tooltip={t.mode}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              <span>{theme === "dark" ? "Light" : "Dark"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
