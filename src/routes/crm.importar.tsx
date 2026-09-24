import * as React from "react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FilterX,
  Loader2,
  Shuffle,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { isDevRole } from "@/lib/auth-types";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type TargetField =
  | "ignore"
  | "fullName"
  | "phone"
  | "phone2"
  | "campaignName"
  | "formId"
  | "observations";
type Consultant = { id: string; name: string; email: string };
type Owner = { id: string; name: string };
type Course = { id: string; name: string; value: string };
type Channel = { id: string; name: string };
type Turma = { id: string; course_id: string; name: string; location: string; class_date: string };
type ParsedCsv = { headers: Array<string>; rows: Array<Array<string>> };

type ExportFilters = {
  search: string;
  ownerId: string;
  stage: string;
  courseId: string;
  turmaId: string;
  channelId: string;
  dateFrom: string;
  dateTo: string;
};

const ALL_FILTER = "__all__";
const exportStages = [
  "Leads Novos",
  "Em Atendimento",
  "Follow UP",
  "Aguardando matrícula",
  "Lead Sem retorno",
  "Matriculado",
];

function emptyExportFilters(): ExportFilters {
  return {
    search: "",
    ownerId: ALL_FILTER,
    stage: ALL_FILTER,
    courseId: ALL_FILTER,
    turmaId: ALL_FILTER,
    channelId: ALL_FILTER,
    dateFrom: "",
    dateTo: "",
  };
}

const fieldLabels: Record<TargetField, string> = {
  ignore: "Ignorar coluna",
  fullName: "Nome do lead",
  phone: "Telefone principal",
  phone2: "WhatsApp / telefone 2",
  campaignName: "Nome da campanha",
  formId: "ID do formulário",
  observations: "Observações",
};

function detectDelimiter(line: string) {
  const candidates = ["\t", ";", ","];
  return candidates.sort((a, b) => line.split(b).length - line.split(a).length)[0];
}

function parseDelimited(text: string): ParsedCsv {
  const clean = text.replace(/^\uFEFF/, "");
  const delimiter = detectDelimiter(clean.split(/\r?\n/, 1)[0] ?? "");
  const records: Array<Array<string>> = [];
  let record: Array<string> = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < clean.length; index += 1) {
    const char = clean[index];
    if (char === '"') {
      if (quoted && clean[index + 1] === '"') {
        field += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      record.push(field.trim());
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && clean[index + 1] === "\n") index += 1;
      record.push(field.trim());
      field = "";
      if (record.some(Boolean)) records.push(record);
      record = [];
    } else field += char;
  }
  record.push(field.trim());
  if (record.some(Boolean)) records.push(record);
  const headers = records.shift() ?? [];
  return { headers, rows: records.map((row) => headers.map((_, index) => row[index] ?? "")) };
}

function suggestedField(header: string): TargetField {
  const key = header.toLowerCase().replace(/[\s-]+/g, "_");
  if (["full_name", "name", "nome", "nome_completo"].includes(key)) return "fullName";
  if (["phone", "telefone", "celular"].includes(key)) return "phone";
  if (["whatsapp_number", "whatsapp", "phone2", "telefone_2"].includes(key)) return "phone2";
  if (["campaign_name", "campanha"].includes(key)) return "campaignName";
  if (["form_id", "formulario", "id_formulario"].includes(key)) return "formId";
  if (["observations", "observacoes", "observação"].includes(key)) return "observations";
  return "ignore";
}

async function readJson<T>(response: Response) {
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "Falha na operação.");
  return data;
}

export const Route = createFileRoute("/crm/importar")({
  head: () => ({ meta: [{ title: "Importar e exportar leads · Master CRM" }] }),
  component: LeadImporter,
});

function LeadImporter() {
  const { session } = useAuth();
  const unitId = session?.activeUnit?.id ?? "";
  const [parsed, setParsed] = React.useState<ParsedCsv | null>(null);
  const [fileName, setFileName] = React.useState("");
  const [mapping, setMapping] = React.useState<Array<TargetField>>([]);
  const [consultants, setConsultants] = React.useState<Array<Consultant>>([]);
  const [owners, setOwners] = React.useState<Array<Owner>>([]);
  const [courses, setCourses] = React.useState<Array<Course>>([]);
  const [turmas, setTurmas] = React.useState<Array<Turma>>([]);
  const [channels, setChannels] = React.useState<Array<Channel>>([]);
  const [courseId, setCourseId] = React.useState("");
  const [turmaId, setTurmaId] = React.useState("");
  const [selected, setSelected] = React.useState<Set<string>>(() => new Set());
  const [skipDuplicates, setSkipDuplicates] = React.useState(true);
  const [loading, setLoading] = React.useState(true);
  const [importing, setImporting] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const [exportFilters, setExportFilters] = React.useState<ExportFilters>(emptyExportFilters);
  const [result, setResult] = React.useState<{
    imported: number;
    updated: number;
    duplicates: number;
  } | null>(null);

  React.useEffect(() => {
    if (!unitId || session?.user.role !== "DEV") {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/crm/import?unitId=${encodeURIComponent(unitId)}`)
      .then((response) =>
        readJson<{
          consultants: Array<Consultant>;
          owners: Array<Owner>;
          courses: Array<Course>;
          turmas: Array<Turma>;
          channels: Array<Channel>;
        }>(response),
      )
      .then((data) => {
        setConsultants(data.consultants);
        setOwners(data.owners);
        setCourses(data.courses);
        setTurmas(data.turmas);
        setChannels(data.channels);
      })
      .catch((error) =>
        toast.error(error instanceof Error ? error.message : "Falha ao carregar consultores."),
      )
      .finally(() => setLoading(false));
  }, [session?.user.role, unitId]);

  if (session && !isDevRole(session.user.role)) return <Navigate to="/crm" />;

  async function handleFile(file: File | undefined) {
    if (!file) return;
    const next = parseDelimited(await file.text());
    if (!next.headers.length || !next.rows.length) {
      toast.error("O arquivo não possui cabeçalho e linhas válidas.");
      return;
    }
    setFileName(file.name);
    setParsed(next);
    setMapping(next.headers.map(suggestedField));
    setResult(null);
  }

  function mappedRows() {
    return (parsed?.rows ?? []).map((values) => {
      const row: Record<string, string> = {};
      mapping.forEach((target, index) => {
        if (target !== "ignore" && values[index])
          row[target] = row[target] ? `${row[target]} ${values[index]}` : values[index];
      });
      return row;
    });
  }

  async function importLeads() {
    if (!parsed) return;
    if (!mapping.includes("fullName") || !mapping.includes("phone")) {
      toast.error("Mapeie ao menos Nome e Telefone principal.");
      return;
    }
    if (!selected.size) {
      toast.error("Selecione ao menos um consultor.");
      return;
    }
    if (!courseId) {
      toast.error("Selecione o curso dos leads.");
      return;
    }
    if (!turmaId) {
      toast.error("Selecione a turma dos leads.");
      return;
    }
    setImporting(true);
    try {
      const data = await readJson<{ imported: number; updated: number; duplicates: number }>(
        await fetch("/api/crm/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            unitId,
            rows: mappedRows(),
            consultantIds: Array.from(selected),
            courseId,
            turmaId,
            skipDuplicates,
          }),
        }),
      );
      setResult(data);
      toast.success(`${data.imported} importado(s) e ${data.updated} atualizado(s).`);
      if ("BroadcastChannel" in window) {
        const channel = new BroadcastChannel(`crm-pipeline-${unitId}`);
        channel.postMessage({ type: "leads-imported" });
        channel.close();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao importar leads.");
    } finally {
      setImporting(false);
    }
  }

  function setExportFilter<Key extends keyof ExportFilters>(key: Key, value: ExportFilters[Key]) {
    setExportFilters((current) => ({ ...current, [key]: value }));
  }

  async function exportLeads() {
    if (!unitId) return;
    setExporting(true);
    try {
      const params = new URLSearchParams({ unitId });
      Object.entries(exportFilters).forEach(([key, value]) => {
        if (value && value !== ALL_FILTER) params.set(key, value);
      });
      const response = await fetch(`/api/crm/export?${params.toString()}`, {
        credentials: "same-origin",
        headers: { Accept: "text/csv, application/json" },
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Falha ao exportar leads.");
      }
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const fileName = disposition.match(/filename="([^"]+)"/)?.[1] ?? "leads.csv";
      const exportedRows = Number(response.headers.get("X-Exported-Rows") ?? 0);
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(href);
      toast.success(`${exportedRows.toLocaleString("pt-BR")} lead(s) exportado(s).`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao exportar leads.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Importar e exportar leads"
        description={`Gerencie arquivos de leads da unidade ${session?.activeUnit?.name ?? "ativa"}. Acesso exclusivo para DEV.`}
      />
      <Tabs defaultValue="import" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="import">
            <Upload className="mr-2 h-4 w-4" />
            Importar
          </TabsTrigger>
          <TabsTrigger value="export">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                Arquivo CSV
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Label
                htmlFor="lead-csv"
                className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary/25 bg-primary/5 p-6 text-center hover:bg-primary/10"
              >
                <Upload className="mb-2 h-7 w-7 text-primary" />
                <span className="font-medium">Escolher CSV ou arquivo separado por tabulação</span>
                <span className="mt-1 text-xs text-muted-foreground">
                  Até 2.000 linhas por importação
                </span>
              </Label>
              <Input
                id="lead-csv"
                type="file"
                accept=".csv,.txt,text/csv,text/plain"
                className="sr-only"
                onChange={(event) => void handleFile(event.target.files?.[0])}
              />
              {parsed ? (
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{fileName}</Badge>
                  <Badge variant="secondary">{parsed.rows.length} linhas</Badge>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {parsed ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Mapeamento das colunas</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {parsed.headers.map((header, index) => (
                    <div key={`${header}-${index}`} className="space-y-2">
                      <Label>{header || `Coluna ${index + 1}`}</Label>
                      <Select
                        value={mapping[index]}
                        onValueChange={(value) =>
                          setMapping((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index ? (value as TargetField) : item,
                            ),
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(fieldLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="truncate text-xs text-muted-foreground">
                        Exemplo: {parsed.rows[0]?.[index] || "—"}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Curso e turma</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Curso dos leads</Label>
                    <Select
                      value={courseId}
                      onValueChange={(value) => {
                        setCourseId(value);
                        setTurmaId("");
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o curso" />
                      </SelectTrigger>
                      <SelectContent>
                        {courses.map((course) => (
                          <SelectItem key={course.id} value={course.id}>
                            {course.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Turma dos leads</Label>
                    <Select value={turmaId} onValueChange={setTurmaId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a turma" />
                      </SelectTrigger>
                      <SelectContent>
                        {turmas
                          .filter((turma) => turma.course_id === courseId)
                          .map((turma) => (
                            <SelectItem key={turma.id} value={turma.id}>
                              {turma.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Direcionamento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Shuffle className="h-4 w-4" />
                    Com vários consultores, cada lead recebe um deles aleatoriamente.
                  </div>
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                      {consultants.map((consultant) => (
                        <Label
                          key={consultant.id}
                          className="flex cursor-pointer items-center gap-3 rounded-lg border p-3"
                        >
                          <Checkbox
                            checked={selected.has(consultant.id)}
                            onCheckedChange={(checked) =>
                              setSelected((current) => {
                                const next = new Set(current);
                                if (checked) next.add(consultant.id);
                                else next.delete(consultant.id);
                                return next;
                              })
                            }
                          />
                          <span>
                            <span className="block font-medium">{consultant.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {consultant.email}
                            </span>
                          </span>
                        </Label>
                      ))}
                    </div>
                  )}
                  <Label className="flex items-center gap-3">
                    <Checkbox
                      checked={skipDuplicates}
                      onCheckedChange={(checked) => setSkipDuplicates(checked === true)}
                    />
                    Ignorar telefones que já existem nesta unidade
                  </Label>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Pré-visualização</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Telefone</TableHead>
                          <TableHead>WhatsApp</TableHead>
                          <TableHead>Campanha</TableHead>
                          <TableHead>Formulário</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {mappedRows()
                          .slice(0, 8)
                          .map((row, index) => (
                            <TableRow key={index}>
                              <TableCell>{row.fullName || "—"}</TableCell>
                              <TableCell>{row.phone || "—"}</TableCell>
                              <TableCell>{row.phone2 || "—"}</TableCell>
                              <TableCell className="max-w-64 truncate">
                                {row.campaignName || "—"}
                              </TableCell>
                              <TableCell>{row.formId || "—"}</TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                  {result ? (
                    <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
                      <CheckCircle2 className="h-5 w-5" />
                      {result.imported} importados; {result.updated} já importados atualizados;{" "}
                      {result.duplicates} duplicados ignorados.
                    </div>
                  ) : null}
                  <Button
                    onClick={() => void importLeads()}
                    disabled={importing || !selected.size || !courseId || !turmaId}
                  >
                    {importing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    {importing ? "Importando..." : `Importar ${parsed.rows.length} leads`}
                  </Button>
                </CardContent>
              </Card>
            </>
          ) : null}
        </TabsContent>

        <TabsContent value="export" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="h-5 w-5 text-primary" />
                    Exportar CSV
                  </CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Use os filtros abaixo para escolher exatamente quais leads serão exportados.
                  </p>
                </div>
                <Badge variant="secondary">{session?.activeUnit?.name ?? "Unidade ativa"}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div className="space-y-2 xl:col-span-2">
                  <Label htmlFor="export-search">Buscar</Label>
                  <Input
                    id="export-search"
                    value={exportFilters.search}
                    onChange={(event) => setExportFilter("search", event.target.value)}
                    placeholder="Nome, telefone, e-mail, cidade ou responsável"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Responsável</Label>
                  <Select
                    value={exportFilters.ownerId}
                    onValueChange={(value) => setExportFilter("ownerId", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_FILTER}>Todos os responsáveis</SelectItem>
                      {owners.map((owner) => (
                        <SelectItem key={owner.id} value={owner.id}>
                          {owner.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Etapa</Label>
                  <Select
                    value={exportFilters.stage}
                    onValueChange={(value) => setExportFilter("stage", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_FILTER}>Todas as etapas</SelectItem>
                      {exportStages.map((stage) => (
                        <SelectItem key={stage} value={stage}>
                          {stage}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Curso</Label>
                  <Select
                    value={exportFilters.courseId}
                    onValueChange={(value) =>
                      setExportFilters((current) => ({
                        ...current,
                        courseId: value,
                        turmaId: ALL_FILTER,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_FILTER}>Todos os cursos</SelectItem>
                      {courses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Turma</Label>
                  <Select
                    value={exportFilters.turmaId}
                    onValueChange={(value) => setExportFilter("turmaId", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_FILTER}>Todas as turmas</SelectItem>
                      {turmas
                        .filter(
                          (turma) =>
                            exportFilters.courseId === ALL_FILTER ||
                            turma.course_id === exportFilters.courseId,
                        )
                        .map((turma) => (
                          <SelectItem key={turma.id} value={turma.id}>
                            {turma.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Canal de aquisição</Label>
                  <Select
                    value={exportFilters.channelId}
                    onValueChange={(value) => setExportFilter("channelId", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_FILTER}>Todos os canais</SelectItem>
                      {channels.map((channel) => (
                        <SelectItem key={channel.id} value={channel.id}>
                          {channel.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="export-date-from">Criados a partir de</Label>
                  <Input
                    id="export-date-from"
                    type="date"
                    value={exportFilters.dateFrom}
                    onChange={(event) => setExportFilter("dateFrom", event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="export-date-to">Criados até</Label>
                  <Input
                    id="export-date-to"
                    type="date"
                    value={exportFilters.dateTo}
                    onChange={(event) => setExportFilter("dateTo", event.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3 border-t pt-5">
                <Button
                  onClick={() => void exportLeads()}
                  disabled={exporting || loading || !unitId}
                >
                  {exporting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  {exporting ? "Gerando CSV..." : "Exportar leads filtrados"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setExportFilters(emptyExportFilters())}
                  disabled={exporting}
                >
                  <FilterX className="mr-2 h-4 w-4" />
                  Limpar filtros
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
