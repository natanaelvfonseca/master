import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, KanbanSquare, Users, Trophy, Bot, ShieldCheck,
  BarChart3, Megaphone, Plug, Sparkles, GraduationCap,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

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
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (url: string) => (url === "/" ? path === "/" : path.startsWith(url));

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-gold shadow-elegant">
            <GraduationCap className="h-5 w-5 text-gold-foreground" />
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <div className="text-[15px] font-semibold tracking-tight text-sidebar-foreground">Planarius</div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-gold">Growth Hub</div>
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
