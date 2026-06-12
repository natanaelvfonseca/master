import { createFileRoute } from "@tanstack/react-router";
import { Lock, Sparkles, Image as ImageIcon, Coins } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { generatedImages } from "@/lib/brand";
import { useAuth } from "@/lib/auth";
import { canManageBrandPlen } from "@/lib/auth-types";

export const Route = createFileRoute("/brand-plen/historico")({
  head: () => ({ meta: [{ title: "Histórico · Brand Plen" }] }),
  component: Historico,
});

const statusColor: Record<string, string> = {
  Aprovado: "bg-success/15 text-success border-success/30",
  Pendente: "bg-gold/15 text-gold border-gold/30",
  "Em revisão": "bg-primary/10 text-primary border-primary/20",
};

function Historico() {
  const { session } = useAuth();
  const totalCreditos = generatedImages.reduce((a, i) => a + i.credits, 0);

  if (session && !canManageBrandPlen(session.user.role)) {
    return <BrandAdminAccessDenied />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Brand Plen · Administrador"
        title="Histórico de gerações"
        description="Auditoria completa de todas as criações de imagem realizadas pela equipe."
        actions={
          <Badge className="gap-1 bg-primary/10 text-primary border-primary/20">
            <Lock className="h-3 w-3" /> Acesso restrito
          </Badge>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Gerações no mês"
          value={generatedImages.length * 4}
          icon={Sparkles}
          accent="primary"
          delta={24}
        />
        <StatCard
          label="Imagens aprovadas"
          value={generatedImages.filter((i) => i.status === "Aprovado").length * 3}
          icon={ImageIcon}
          accent="success"
        />
        <StatCard
          label="Créditos consumidos"
          value={totalCreditos * 12}
          icon={Coins}
          accent="gold"
        />
        <StatCard label="Usuários ativos" value={8} icon={Sparkles} accent="primary" />
      </div>

      <Card className="shadow-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Tipo de peça</TableHead>
                <TableHead>Objetivo</TableHead>
                <TableHead>Curso</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Créditos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {generatedImages.map((i) => (
                <TableRow key={i.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-[10px]">
                          {i.author
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{i.author}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{i.date}</TableCell>
                  <TableCell className="text-sm">{i.piece}</TableCell>
                  <TableCell className="text-sm">{i.objective}</TableCell>
                  <TableCell className="text-sm">{i.course}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColor[i.status] ?? ""}>
                      {i.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">{i.credits}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function BrandAdminAccessDenied() {
  return (
    <div className="flex min-h-[55vh] items-center justify-center">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-bold">Acesso restrito</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          O histórico do Brand Plen fica disponível apenas para Master e CEO.
        </p>
      </div>
    </div>
  );
}
