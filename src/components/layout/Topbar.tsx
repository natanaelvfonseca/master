import { Link } from "@tanstack/react-router";
import { Bell, Search, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth";

export function Topbar() {
  const { session, setActiveUnit } = useAuth();
  const activeUnit = session?.activeUnit;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card/80 px-4 backdrop-blur">
      <SidebarTrigger className="-ml-1" />
      <div className="hidden items-center gap-2 md:flex">
        {session && session.units.length > 1 ? (
          <Select value={activeUnit?.id} onValueChange={(value) => void setActiveUnit(value)}>
            <SelectTrigger className="h-9 w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {session.units.map((unit) => (
                <SelectItem key={unit.id} value={unit.id}>
                  {unit.name}
                </SelectItem>
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
          <Badge className="absolute -right-1 -top-1 h-4 min-w-4 rounded-full bg-gold p-0 px-1 text-[10px] text-gold-foreground">
            5
          </Badge>
        </Button>
        <Button asChild variant="ghost" size="icon" aria-label="Abrir configurações">
          <Link to="/gestao/cadastro" title="Configurações">
            <Settings className="h-5 w-5" />
          </Link>
        </Button>
      </div>
    </header>
  );
}
