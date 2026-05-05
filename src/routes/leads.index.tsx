import { createFileRoute, Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { leads } from "@/lib/mock";

export const Route = createFileRoute("/leads/")({
  head: () => ({ meta: [{ title: "Leads e Alunos · Planarius" }] }),
  component: LeadsList,
});

function LeadsList() {
  return (
    <div>
      <PageHeader eyebrow="Comercial" title="Leads & Alunos" description="Base unificada de leads e alunos, sincronizada com o sistema acadêmico." />
      <Card className="shadow-card">
        <div className="border-b border-border p-4">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por nome, curso, cidade…" className="pl-9" />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lead</TableHead>
              <TableHead>Curso</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Vendedor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">IA Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.slice(0, 20).map((l) => (
              <TableRow key={l.id} className="cursor-pointer hover:bg-accent/40">
                <TableCell>
                  <Link to="/leads/$id" params={{ id: l.id }} className="flex items-center gap-3">
                    <Avatar className="h-8 w-8"><AvatarFallback className="bg-gradient-primary text-[10px] text-primary-foreground">{l.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}</AvatarFallback></Avatar>
                    <div>
                      <div className="text-sm font-semibold">{l.name}</div>
                      <div className="text-[11px] text-muted-foreground">{l.id}</div>
                    </div>
                  </Link>
                </TableCell>
                <TableCell className="text-sm">{l.course}</TableCell>
                <TableCell className="text-sm">{l.city}</TableCell>
                <TableCell><Badge variant="outline">{l.source}</Badge></TableCell>
                <TableCell className="text-sm">{l.seller}</TableCell>
                <TableCell><Badge variant="secondary" className="bg-primary/10 text-primary">{l.stage}</Badge></TableCell>
                <TableCell className="text-right">
                  <span className={`inline-flex h-7 min-w-10 items-center justify-center rounded-full px-2 text-xs font-semibold ${l.score > 80 ? "bg-gold/20 text-gold" : l.score > 60 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{l.score}</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
