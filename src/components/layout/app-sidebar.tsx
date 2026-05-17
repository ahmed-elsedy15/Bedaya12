
"use client"

import { LayoutDashboard, Package, ShoppingCart, BarChart3, Sun, Moon, Languages, Users, Store } from "lucide-react"
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
  useSidebar,
} from "@/components/ui/sidebar"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { useTranslation } from "@/context/language-context"
import { cn } from "@/lib/utils"

export function AppSidebar() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const { lang, setLang, t, dir } = useTranslation()
  const [mounted, setMounted] = useState(false)
  const { state } = useSidebar()

  useEffect(() => {
    setMounted(true)
  }, [])

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
      <SidebarHeader className="h-20 flex items-center px-4 border-b">
        <div className="flex items-center gap-3 w-full">
          <div className="min-w-10 w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-lg shrink-0">
            <Store className="h-5 w-5" />
          </div>
          <div className={cn(
            "flex flex-col transition-opacity duration-300",
            state === "collapsed" ? "opacity-0 w-0" : "opacity-100"
          )}>
            <span className="font-headline font-bold text-lg tracking-tight whitespace-nowrap">
              Bedaya
            </span>
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest whitespace-nowrap">Enterprise</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className={cn(state === "collapsed" && "sr-only")}>{t.management}</SidebarGroupLabel>
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
      <SidebarFooter className="p-2 border-t space-y-1">
        <SidebarMenu>
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
