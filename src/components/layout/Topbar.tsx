import { Bell, Search, Settings } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth";
import { getInitials, ROLE_LABELS } from "@/lib/auth-types";

export function Topbar() {
  const { session, setActiveUnit } = useAuth();
  const user = session?.user;
  const activeUnit = session?.activeUnit;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card/80 px-4 backdrop-blur">
      <SidebarTrigger className="-ml-1" />
      <div className="hidden items-center gap-2 md:flex">
        <Select defaultValue="30d">
          <SelectTrigger className="h-9 w-[130px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Ultimos 7 dias</SelectItem>
            <SelectItem value="30d">Ultimos 30 dias</SelectItem>
            <SelectItem value="90d">Ultimos 90 dias</SelectItem>
            <SelectItem value="ytd">Ano corrente</SelectItem>
          </SelectContent>
        </Select>
        {session && session.units.length > 1 ? (
          <Select value={activeUnit?.id} onValueChange={(value) => void setActiveUnit(value)}>
            <SelectTrigger className="h-9 w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {session.units.map((unit) => (
                <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : activeUnit ? (
          <div className="flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm font-medium">
            {activeUnit.name}
          </div>
        ) : null}
      </div>
      <div className="ml-auto flex items-center gap-2">
        <div className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar aluno, lead, turma..." className="h-9 w-[280px] pl-9" />
        </div>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <Badge className="absolute -right-1 -top-1 h-4 min-w-4 rounded-full bg-gold p-0 px-1 text-[10px] text-gold-foreground">5</Badge>
        </Button>
        <Button variant="ghost" size="icon"><Settings className="h-5 w-5" /></Button>
        <div className="ml-1 flex items-center gap-2 rounded-full border border-border bg-background px-2 py-1">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-gradient-primary text-xs text-primary-foreground">
              {user ? getInitials(user.name) : "PG"}
            </AvatarFallback>
          </Avatar>
          <div className="hidden text-right leading-tight md:block">
            <div className="text-xs font-semibold">{user?.name ?? "Plenarius"}</div>
            <div className="text-[10px] text-muted-foreground">
              {user ? ROLE_LABELS[user.role] : "Growth Hub"} {activeUnit ? `- ${activeUnit.name}` : ""}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
