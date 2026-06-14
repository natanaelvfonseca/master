import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Bot,
  BookOpenCheck,
  ClipboardList,
  GraduationCap,
  History,
  Images,
  KanbanSquare,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Palette,
  Trophy,
  UserCog,
  Wand2,
  type LucideIcon,
} from "lucide-react";
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
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import plenariusLogo from "@/assets/logo-plenarios-branca.png";
import { useAuth } from "@/lib/auth";
import {
  canManageBrandPlen,
  canViewBrandPlenHistory,
  canViewGrowth,
  canViewManagement,
  getInitials,
  ROLE_LABELS,
} from "@/lib/auth-types";
import { cn } from "@/lib/utils";

type NavigationItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  brandAdminOnly?: boolean;
  brandHistoryOnly?: boolean;
};

type NavigationGroup = {
  label: string;
  items: Array<NavigationItem>;
};

const groups: Array<NavigationGroup> = [
  {
    label: "Visão geral",
    items: [{ title: "Dashboard", url: "/", icon: LayoutDashboard }],
  },
  {
    label: "Comercial",
    items: [
      { title: "CRM Pipeline", url: "/crm", icon: KanbanSquare },
      { title: "Alunos", url: "/leads", icon: GraduationCap },
      { title: "Ranking", url: "/ranking", icon: Trophy },
      { title: "Conversas IA", url: "/conversas", icon: Bot },
    ],
  },
  {
    label: "Crescimento",
    items: [
      { title: "Comercial", url: "/bi", icon: BarChart3 },
      { title: "Marketing", url: "/branding", icon: Megaphone },
    ],
  },
  {
    label: "Brand Plen",
    items: [
      { title: "Nova Criação", url: "/brand-plen/nova", icon: Wand2 },
      { title: "Biblioteca", url: "/brand-plen/biblioteca", icon: Images },
      { title: "Brand Kit", url: "/brand-plen/kit", icon: Palette, brandAdminOnly: true },
      { title: "Histórico", url: "/brand-plen/historico", icon: History, brandHistoryOnly: true },
    ],
  },
  {
    label: "Área de Membros",
    items: [{ title: "Treinamentos", url: "/treinamentos", icon: BookOpenCheck }],
  },
  {
    label: "Gestão",
    items: [{ title: "Cadastro", url: "/gestao/cadastro", icon: ClipboardList }],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { logout, session } = useAuth();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });
  const user = session?.user;
  const activeUnit = session?.activeUnit;
  const isActive = (url: string) => (url === "/" ? path === "/" : path.startsWith(url));
  const canViewBrandAdmin = user ? canManageBrandPlen(user.role) : false;
  const canViewBrandHistory = user ? canViewBrandPlenHistory(user.role) : false;
  const visibleGroups = groups
    .filter(
      (group) =>
        (group.label !== "Crescimento" || (user ? canViewGrowth(user.role) : false)) &&
        (group.label !== "Gestão" || (user ? canViewManagement(user.role) : false)),
    )
    .map((group) => ({
      ...group,
      items:
        group.label === "Brand Plen"
          ? group.items.filter(
              (item) =>
                (!item.brandAdminOnly || canViewBrandAdmin) &&
                (!item.brandHistoryOnly || canViewBrandHistory),
            )
          : group.items,
    }))
    .filter((group) => group.items.length > 0);
  const navGroups = session?.canRegisterUsers
    ? [
        ...visibleGroups,
        {
          label: "Administração",
          items: [{ title: "Usuários e unidades", url: "/usuarios", icon: UserCog }],
        },
      ]
    : visibleGroups;

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="px-2 py-3">
          <div className="flex items-center justify-center px-1 py-1">
            <img
              src={plenariusLogo}
              alt="Plenarius"
              className={cn("object-contain", collapsed ? "h-8 w-8" : "h-14 w-full")}
            />
          </div>
          {!collapsed && <div className="sr-only">Planarius Growth Hub</div>}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-1">
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            {!collapsed && (
              <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/50">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = isActive(item.url);

                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        className="relative transition-all duration-200 hover:translate-x-0.5 hover:shadow-[0_12px_28px_-22px_rgba(63,115,216,0.95)] data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:shadow-[0_14px_30px_-22px_rgba(63,115,216,1)] data-[active=true]:before:absolute data-[active=true]:before:left-0 data-[active=true]:before:top-1/2 data-[active=true]:before:h-5 data-[active=true]:before:w-[3px] data-[active=true]:before:-translate-y-1/2 data-[active=true]:before:rounded-r data-[active=true]:before:bg-gold [&>svg]:transition-transform [&>svg]:duration-200 hover:[&>svg]:scale-110"
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
          <div className="m-2 space-y-2">
            <Link
              to="/perfil"
              title="Editar perfil"
              className="block rounded-lg bg-sidebar-accent/60 p-3 transition hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9 border border-sidebar-border">
                  <AvatarImage
                    src={user?.avatarUrl ?? undefined}
                    alt={user?.name ?? "Perfil"}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-gradient-primary text-xs font-semibold text-primary-foreground">
                    {user ? getInitials(user.name) : "PG"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 leading-tight">
                  <div className="truncate text-sm font-semibold text-sidebar-foreground">
                    {user?.name ?? "Plenarius"}
                  </div>
                  <div className="truncate text-xs text-sidebar-foreground/70">
                    {user ? ROLE_LABELS[user.role] : "Growth Hub"}
                  </div>
                </div>
              </div>
              {activeUnit ? (
                <div className="mt-2 truncate rounded-md border border-sidebar-border/70 bg-sidebar/40 px-2 py-1 text-xs text-sidebar-foreground/75">
                  {activeUnit.name}
                </div>
              ) : null}
            </Link>
            <LogoutMenuItem onLogout={logout} />
          </div>
        ) : (
          <div className="m-2 space-y-2">
            <div className="flex justify-center">
              <Link
                to="/perfil"
                aria-label="Editar perfil"
                title="Editar perfil"
                className="rounded-full transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
              >
                <Avatar className="h-8 w-8 border border-sidebar-border">
                  <AvatarImage
                    src={user?.avatarUrl ?? undefined}
                    alt={user?.name ?? "Perfil"}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-gradient-primary text-xs font-semibold text-primary-foreground">
                    {user ? getInitials(user.name) : "PG"}
                  </AvatarFallback>
                </Avatar>
              </Link>
            </div>
            <LogoutMenuItem onLogout={logout} />
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

function LogoutMenuItem({ onLogout }: { onLogout: () => Promise<void> }) {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton onClick={() => void onLogout()} className="text-sidebar-foreground/80">
          <LogOut className="h-4 w-4" />
          <span>Sair</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
