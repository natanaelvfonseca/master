import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search, Users } from "lucide-react";
import { toast } from "sonner";
import type { LeadRecord } from "@/lib/commercial-types";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type LeadsResponse = {
  leads: Array<LeadRecord>;
};

async function readJson<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };

  if (!response.ok) {
    throw new Error(data.error ?? "Falha na requisição.");
  }

  return data;
}

function unitQuery(unitId: string) {
  return `?unitId=${encodeURIComponent(unitId)}&view=students`;
}

export const Route = createFileRoute("/leads/")({
  head: () => ({ meta: [{ title: "Alunos · Planarius" }] }),
  component: LeadsList,
});

function LeadsList() {
  const { session } = useAuth();
  const activeUnitId = session?.activeUnit?.id ?? "";
  const [leads, setLeads] = React.useState<Array<LeadRecord>>([]);
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadLeads() {
      if (!activeUnitId) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const data = await readJson<LeadsResponse>(
          await fetch(`/api/crm/leads${unitQuery(activeUnitId)}`, {
            credentials: "same-origin",
            headers: { Accept: "application/json" },
          }),
        );

        setLeads(data.leads);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Falha ao carregar alunos.");
      } finally {
        setLoading(false);
      }
    }

    void loadLeads();
  }, [activeUnitId]);

  const filteredLeads = leads.filter((lead) => {
    const searchText = [
      lead.fullName,
      lead.phone,
      lead.email,
      lead.courseName,
      lead.acquisitionChannelName,
      lead.unitName,
      lead.stage,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchText.includes(search.trim().toLowerCase());
  });

  return (
    <div>
      <PageHeader
        eyebrow="Comercial"
        title="Alunos"
        description="Base de alunos convertidos quando a taxa foi confirmada no CRM Pipeline."
      />
      <Card className="shadow-card">
        <div className="border-b border-border p-4">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por aluno, curso, origem..."
              className="pl-9"
            />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Aluno</TableHead>
              <TableHead>Curso</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Carregando alunos...
                </TableCell>
              </TableRow>
            ) : filteredLeads.length ? (
              filteredLeads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <div className="font-medium">{lead.fullName}</div>
                    <div className="text-xs text-muted-foreground">{lead.phone}</div>
                  </TableCell>
                  <TableCell>{lead.courseName ?? "--"}</TableCell>
                  <TableCell>{lead.unitName}</TableCell>
                  <TableCell>{lead.acquisitionChannelName ?? "--"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                      Aluno
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold text-primary">
                    {lead.courseValue !== null
                      ? lead.courseValue.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })
                      : "--"}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="p-4">
                  <EmptyState
                    icon={Users}
                    title="Nenhum aluno convertido"
                    description="A lista será preenchida quando a taxa for confirmada no modal do lead."
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
