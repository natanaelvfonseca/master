import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, Upload, Wand2, CheckCircle2, ImagePlus, Info } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { pieceTypes, objectives, courses, visualStyles, audiences, brandColors, generatedImages } from "@/lib/brand";
import { toast } from "sonner";

export const Route = createFileRoute("/brand-plen/nova")({
  head: () => ({ meta: [{ title: "Nova Criacao · Brand Plen" }] }),
  component: NovaCriacao,
});

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-3 text-base">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{n}</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function NovaCriacao() {
  const [piece, setPiece] = useState("post");
  const [results, setResults] = useState<typeof generatedImages>([]);
  const [loading, setLoading] = useState(false);

  const generate = () => {
    setLoading(true);
    setTimeout(() => {
      setResults(generatedImages.slice(0, 4));
      setLoading(false);
      toast.success("4 opcoes geradas seguindo o Brand Kit da Plenarius");
    }, 1200);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Brand Plen · Diretor de Arte com IA"
        title="Nova criacao"
        description="Crie imagens profissionais com IA alinhadas à identidade da marca Plenarius."
        actions={
          <Badge className="bg-gold/15 text-gold border-gold/30">
            <Sparkles className="mr-1 h-3 w-3" /> Brand Kit ativo
          </Badge>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <Step n={1} title="Escolha o tipo de peça">
            <div className="grid grid-cols-3 gap-2 md:grid-cols-7">
              {pieceTypes.map((p) => {
                const active = piece === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setPiece(p.id)}
                    className={`group flex flex-col items-center gap-2 rounded-lg border-2 p-3 text-center transition ${
                      active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                    }`}
                  >
                    <div className={`flex h-12 w-12 items-center justify-center rounded-md ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      <ImagePlus className="h-5 w-5" />
                    </div>
                    <div className="text-[11px] font-semibold leading-tight">{p.label}</div>
                    <div className="text-[10px] text-muted-foreground">{p.ratio}</div>
                  </button>
                );
              })}
            </div>
          </Step>

          <Step n={2} title="Briefing da peça">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Objetivo</Label>
                <Select defaultValue={objectives[0]}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{objectives.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Curso</Label>
                <Select defaultValue={courses[0]}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{courses.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Público-alvo</Label>
                <Select defaultValue={audiences[0]}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{audiences.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Estilo visual</Label>
                <Select defaultValue={visualStyles[0]}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{visualStyles.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <Label>Descrição da imagem</Label>
                <Textarea
                  rows={4}
                  defaultValue="Imagem institucional para o curso, destacando ambiente profissional, alunos em prática real e a marca Plenarius como referência em educação profissionalizante."
                />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <Label>Texto opcional na arte</Label>
                <Input placeholder='Ex: "Transforme sua profissão. Matrículas abertas."' />
              </div>
            </div>
          </Step>

          <Step n={3} title="Referências visuais (opcional)">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              {generatedImages.slice(0, 5).map((img) => (
                <div key={img.id} className="overflow-hidden rounded-lg border shadow-card">
                  <div
                    className="relative aspect-square"
                    style={{
                      background: `linear-gradient(135deg, ${img.palette[0]} 0%, ${img.palette[1]} 55%, ${img.palette[2]} 100%)`,
                    }}
                  >
                    <div className="absolute inset-x-2 top-2 flex justify-between gap-1">
                      <Badge className="bg-white/15 text-white backdrop-blur">{img.piece}</Badge>
                      <Badge className="bg-white/15 text-white backdrop-blur">{img.credits} cr</Badge>
                    </div>
                    <div className="absolute inset-x-2 bottom-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/80">
                      {img.course}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-1 bg-card p-2">
                    {img.palette.map((hex) => (
                      <span key={hex} className="h-4 rounded-full border border-border" style={{ background: hex }} />
                    ))}
                  </div>
                </div>
              ))}
              <button className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-xs text-muted-foreground hover:border-primary hover:text-primary">
                <Upload className="h-5 w-5" />
                Adicionar
              </button>
            </div>
          </Step>

          <div className="flex flex-col items-center gap-2 pt-2">
            <Button size="lg" onClick={generate} disabled={loading} className="h-12 min-w-[280px] gap-2 bg-primary text-primary-foreground shadow-elegant">
              <Wand2 className="h-5 w-5" />
              {loading ? "Gerando opções..." : "Gerar imagens"}
            </Button>
            <p className="text-xs text-muted-foreground">Geraremos 4 opções para você escolher.</p>
          </div>

          {results.length > 0 && (
            <Step n={4} title={`Resultados gerados · ${results.length} opções`}>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {results.map((r) => (
                  <div key={r.id} className="overflow-hidden rounded-lg border shadow-card">
                    <div
                      className="aspect-square overflow-hidden"
                      style={{
                        background: `linear-gradient(135deg, ${r.palette[0]} 0%, ${r.palette[1]} 55%, ${r.palette[2]} 100%)`,
                      }}
                    >
                      <div className="flex h-full flex-col justify-between p-3 text-white">
                        <div className="flex items-start justify-between gap-2">
                          <Badge className="bg-white/15 text-white backdrop-blur">{r.piece}</Badge>
                          <div className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold backdrop-blur">{r.status}</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs uppercase tracking-[0.18em] text-white/80">{r.course}</div>
                          <div className="text-sm font-semibold leading-tight">{r.objective}</div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 p-2">
                      <Button size="sm" variant="outline" className="flex-1 h-8 text-xs">
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Aprovar
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 px-2 text-xs">Editar</Button>
                    </div>
                  </div>
                ))}
              </div>
            </Step>
          )}
        </div>

        <aside className="space-y-4">
          <Card className="shadow-card">
            <CardHeader className="pb-2 flex-row items-center justify-between">
              <CardTitle className="text-sm">Diretrizes da Marca</CardTitle>
              <a className="text-xs text-primary hover:underline" href="/brand-plen/kit">Ver todas</a>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">Cores oficiais</div>
                <div className="grid grid-cols-3 gap-2">
                  {brandColors.map((c) => (
                    <div key={c.hex} className="space-y-1">
                      <div className="aspect-square rounded-md border" style={{ background: c.hex }} />
                      <div className="text-[10px] font-mono text-muted-foreground">{c.hex}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">Estilo</div>
                <div className="flex flex-wrap gap-1.5">
                  {visualStyles.map((s) => <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>)}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card border-gold/30 bg-gold/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-2">
                <Sparkles className="mt-0.5 h-4 w-4 text-gold" />
                <div className="text-xs">
                  <div className="font-semibold text-foreground">Prompt mestre da marca</div>
                  <p className="mt-1 text-muted-foreground">
                    Todas as imagens são geradas seguindo as diretrizes da Plenarius, com paleta, tipografia, estilo institucional e padrão de qualidade.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Configurações</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Qualidade</Label>
                <Select defaultValue="alta">
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="media">Media</SelectItem>
                    <SelectItem value="rapida">Rapida</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Exibir texto na imagem</Label>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Aplicar logo automaticamente</Label>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>

      <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
        <Info className="h-3.5 w-3.5" />
        Todas as imagens geradas passam por aprovação humana antes de serem disponibilizadas na biblioteca da marca.
      </div>
    </div>
  );
}
