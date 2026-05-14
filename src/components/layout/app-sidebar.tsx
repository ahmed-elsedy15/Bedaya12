
"use client"

import { LayoutDashboard, Package, ShoppingCart, BarChart3, Sun, Moon } from "lucide-react"
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
import { Button } from "@/components/ui/button"

const items = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Products",
    url: "/products",
    icon: Package,
  },
  {
    title: "Sales Entry",
    url: "/sales-entry",
    icon: ShoppingCart,
  },
  {
    title: "Daily Reports",
    url: "/reports",
    icon: BarChart3,
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-16 flex items-center px-6 border-b">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">
            B
          </div>
          <span className="font-headline font-bold text-xl tracking-tight group-data-[collapsible=icon]:hidden">
            SaleSphere
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
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
      <SidebarFooter className="p-4 border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              tooltip="Toggle Theme"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
