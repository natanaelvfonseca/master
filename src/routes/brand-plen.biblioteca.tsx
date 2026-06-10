import { createFileRoute } from "@tanstack/react-router";
import { Download, Copy, Heart, Search, Filter } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { generatedImages, pieceTypes, objectives } from "@/lib/brand";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/brand-plen/biblioteca")({
  head: () => ({ meta: [{ title: "Biblioteca · Brand Plen" }] }),
  component: Biblioteca,
});

function Biblioteca() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Brand Plen"
        title="Biblioteca da Marca"
        description="Todas as criações da equipe Plenarius em um só lugar."
      />

      <Card className="shadow-card">
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por curso, peça ou autor..." className="pl-9" />
          </div>
          <Select defaultValue="all">
            <SelectTrigger className="md:w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {pieceTypes.map((p) => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select defaultValue="all">
            <SelectTrigger className="md:w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os objetivos</SelectItem>
              {objectives.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2"><Filter className="h-4 w-4" /> Filtros</Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {generatedImages.map((img) => (
          <Card key={img.id} className="group overflow-hidden shadow-card transition hover:shadow-elegant">
            <div className="relative aspect-square overflow-hidden bg-muted">
              <img src={img.url} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />
              <button className={`absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full backdrop-blur ${img.favorite ? "bg-gold text-gold-foreground" : "bg-background/70 text-foreground"}`}>
                <Heart className={`h-4 w-4 ${img.favorite ? "fill-current" : ""}`} />
              </button>
              <Badge className="absolute left-2 top-2 bg-background/80 text-foreground backdrop-blur">{img.piece}</Badge>
            </div>
            <CardContent className="space-y-2 p-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold truncate">{img.course}</div>
                <div className="text-[10px] text-muted-foreground">{img.date}</div>
              </div>
              <div className="text-[11px] text-muted-foreground">{img.objective}</div>
              <div className="flex items-center gap-1 pt-1">
                <Button size="sm" variant="outline" className="h-7 flex-1 gap-1 text-xs"><Download className="h-3 w-3" /> Baixar</Button>
                <Button size="sm" variant="ghost" className="h-7 px-2"><Copy className="h-3.5 w-3.5" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
