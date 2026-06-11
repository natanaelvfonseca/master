import { createFileRoute } from "@tanstack/react-router";
import { Search, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
            <Input placeholder="Buscar por nome, curso, cidade..." className="pl-9" />
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
            <TableRow>
              <TableCell colSpan={7} className="p-4">
                <EmptyState
                  icon={Users}
                  title="Nenhum lead cadastrado"
                  description="A lista será preenchida quando os leads reais forem registrados ou importados."
                />
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
