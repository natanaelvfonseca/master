import { createFileRoute } from "@tanstack/react-router";
import { Upload, ShieldCheck, Check, X, Lock } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { brandColors, promptRules, generatedImages } from "@/lib/brand";

export const Route = createFileRoute("/brand-plen/kit")({
  head: () => ({ meta: [{ title: "Brand Kit · Brand Plen" }] }),
  component: BrandKit,
});

function BrandKit() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Brand Plen · Administrador"
        title="Brand Kit"
        description="Identidade visual oficial da Plenarius. Toda imagem gerada respeita estas diretrizes."
        actions={
          <Badge className="gap-1 bg-primary/10 text-primary border-primary/20">
            <Lock className="h-3 w-3" /> Acesso restrito
          </Badge>
        }
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">Logos oficiais</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex h-32 items-center justify-center rounded-lg border bg-[#FCFBFF]">
                <span className="text-xl font-bold text-[#011039]">Plenarius</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Logo principal</span>
                <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs"><Upload className="h-3 w-3" /> Trocar</Button>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex h-32 items-center justify-center rounded-lg border bg-[#011039]">
                <span className="text-xl font-bold text-white">Plenarius</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Logo branca</span>
                <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs"><Upload className="h-3 w-3" /> Trocar</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">Cores oficiais</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            {brandColors.map((c) => (
              <div key={c.hex} className="space-y-2">
                <div className="aspect-square rounded-lg border shadow-card" style={{ background: c.hex }} />
                <div>
                  <div className="text-xs font-semibold">{c.name}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">{c.hex}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">Estilo visual da marca</CardTitle></CardHeader>
          <CardContent>
            <Textarea rows={4} defaultValue={promptRules.estilo} />
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">Tom de comunicação</CardTitle></CardHeader>
          <CardContent>
            <Textarea rows={4} defaultValue={promptRules.tom} />
          </CardContent>
        </Card>

        <Card className="shadow-card border-success/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Check className="h-4 w-4 text-success" /> Regras obrigatórias
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {promptRules.obrigatorias.map((r, i) => (
              <div key={i} className="flex items-start gap-2 rounded-md bg-success/5 p-2 text-sm">
                <Check className="mt-0.5 h-3.5 w-3.5 text-success" /> {r}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-card border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <X className="h-4 w-4 text-destructive" /> Regras proibidas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {promptRules.proibidas.map((r, i) => (
              <div key={i} className="flex items-start gap-2 rounded-md bg-destructive/5 p-2 text-sm">
                <X className="mt-0.5 h-3.5 w-3.5 text-destructive" /> {r}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-primary" /> Exemplos visuais
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="mb-2 text-xs font-semibold text-success">Aprovados</div>
              <div className="grid grid-cols-3 gap-2">
                {generatedImages.slice(0, 3).map((i) => (
                  <div key={i.id} className="aspect-square overflow-hidden rounded-md ring-2 ring-success/40">
                    <img src={i.url} alt="" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 text-xs font-semibold text-destructive">Reprovados</div>
              <div className="grid grid-cols-3 gap-2">
                {generatedImages.slice(10, 13).map((i) => (
                  <div key={i.id} className="aspect-square overflow-hidden rounded-md ring-2 ring-destructive/40 opacity-70">
                    <img src={i.url} alt="" className="h-full w-full object-cover grayscale" />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline">Descartar alterações</Button>
        <Button className="bg-primary text-primary-foreground">Salvar Brand Kit</Button>
      </div>
    </div>
  );
}
