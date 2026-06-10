import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, KanbanSquare, Users, Trophy, Bot, ShieldCheck,
  BarChart3, Megaphone, Plug, Sparkles,
  Wand2, Images, Palette, History,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import plenariusLogo from "@/assets/logo-plenarios-branca.png";
import { cn } from "@/lib/utils";

const groups = [
  {
    label: "Visão geral",
    items: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard },
      { title: "Visão estratégica", url: "/estrategia", icon: Sparkles },
    ],
  },
  {
    label: "Comercial",
    items: [
      { title: "CRM Pipeline", url: "/crm", icon: KanbanSquare },
      { title: "Leads / Alunos", url: "/leads", icon: Users },
      { title: "Ranking", url: "/ranking", icon: Trophy },
      { title: "Conversas IA", url: "/conversas", icon: Bot },
    ],
  },
  {
    label: "Crescimento",
    items: [
      { title: "Recuperação", url: "/recuperacao", icon: ShieldCheck },
      { title: "BI Comercial", url: "/bi", icon: BarChart3 },
      { title: "Branding", url: "/branding", icon: Megaphone },
      { title: "Integrações", url: "/integracoes", icon: Plug },
    ],
  },
  {
    label: "Brand Plen",
    items: [
      { title: "Nova Criação", url: "/brand-plen/nova", icon: Wand2 },
      { title: "Biblioteca", url: "/brand-plen/biblioteca", icon: Images },
      { title: "Brand Kit", url: "/brand-plen/kit", icon: Palette },
      { title: "Histórico", url: "/brand-plen/historico", icon: History },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (url: string) => (url === "/" ? path === "/" : path.startsWith(url));

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="px-2 py-3">
          <div
            className={cn(
              "flex items-center justify-center overflow-hidden rounded-lg bg-[#011039] shadow-elegant ring-1 ring-white/10",
              collapsed ? "h-10 w-10 p-1.5" : "h-16 w-full px-3 py-2",
            )}
          >
            <img
              src={plenariusLogo}
              alt="Plenarius"
              className="h-full w-full object-contain"
            />
          </div>
          {!collapsed && (
            <div className="sr-only">
              Planarius Growth Hub
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-1">
        {groups.map((g) => (
          <SidebarGroup key={g.label}>
            {!collapsed && (
              <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/50">
                {g.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((item) => {
                  const active = isActive(item.url);
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        className="data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:before:absolute data-[active=true]:before:left-0 data-[active=true]:before:top-1/2 data-[active=true]:before:h-5 data-[active=true]:before:-translate-y-1/2 data-[active=true]:before:w-[3px] data-[active=true]:before:rounded-r data-[active=true]:before:bg-gold relative"
                      >
                        <Link to={item.url}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        {!collapsed ? (
          <div className="m-2 rounded-lg bg-sidebar-accent/60 p-3">
            <div className="text-[11px] uppercase tracking-wider text-gold">Plano Enterprise</div>
            <div className="mt-1 text-xs text-sidebar-foreground/80">IA + Automações ativas em todas as unidades.</div>
          </div>
        ) : null}
      </SidebarFooter>
    </Sidebar>
  );
}
