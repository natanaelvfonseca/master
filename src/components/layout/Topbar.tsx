import { Bell, Search, Settings } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function Topbar() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card/80 px-4 backdrop-blur">
      <SidebarTrigger className="-ml-1" />
      <div className="hidden md:flex items-center gap-2">
        <Select defaultValue="30d">
          <SelectTrigger className="h-9 w-[130px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="90d">Últimos 90 dias</SelectItem>
            <SelectItem value="ytd">Ano corrente</SelectItem>
          </SelectContent>
        </Select>
        <Select defaultValue="all">
          <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as unidades</SelectItem>
            <SelectItem value="sp">São Paulo</SelectItem>
            <SelectItem value="rj">Rio de Janeiro</SelectItem>
            <SelectItem value="bh">Belo Horizonte</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <div className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar lead, aluno, turma…" className="h-9 w-[280px] pl-9" />
        </div>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <Badge className="absolute -right-1 -top-1 h-4 min-w-4 rounded-full bg-gold p-0 px-1 text-[10px] text-gold-foreground">5</Badge>
        </Button>
        <Button variant="ghost" size="icon"><Settings className="h-5 w-5" /></Button>
        <div className="ml-1 flex items-center gap-2 rounded-full border border-border bg-background px-2 py-1">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs">RA</AvatarFallback>
          </Avatar>
          <div className="hidden text-right leading-tight md:block">
            <div className="text-xs font-semibold">Ricardo Alves</div>
            <div className="text-[10px] text-muted-foreground">Diretor · Planarius</div>
          </div>
        </div>
      </div>
    </header>
  );
}
