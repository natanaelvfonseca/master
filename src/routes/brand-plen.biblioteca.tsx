import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FileImage, Folder, ImagePlus, Plus, Upload, Video } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { courses } from "@/lib/brand";
import type { BrandLibraryMaterial, BrandLibraryMediaType } from "@/lib/brand-library-types";
import type { CourseRecord } from "@/lib/commercial-types";
import { useAuth } from "@/lib/auth";

const defaultCourse = courses[0] ?? "Geral";
const fallbackCourses = courses.length ? courses : [defaultCourse];
const maxUploadBytes = 9 * 1024 * 1024;

type MaterialsResponse = {
  materials: Array<BrandLibraryMaterial>;
};

type CoursesResponse = {
  courses: Array<CourseRecord>;
};

async function readJson<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };

  if (!response.ok) {
    throw new Error(data.error ?? "Falha ao carregar biblioteca.");
  }

  return data;
}

function unitQuery(unitId: string) {
  return `?unitId=${encodeURIComponent(unitId)}`;
}

function inferMediaType(file: File): BrandLibraryMediaType | null {
  if (file.type.startsWith("image/")) {
    return "image";
  }

  if (file.type.startsWith("video/")) {
    return "video";
  }

  return null;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result ?? "")));
    reader.addEventListener("error", () => reject(reader.error ?? new Error("Falha no arquivo.")));
    reader.readAsDataURL(file);
  });
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}

export const Route = createFileRoute("/brand-plen/biblioteca")({
  head: () => ({ meta: [{ title: "Biblioteca · Brand Plen" }] }),
  component: Biblioteca,
});

function Biblioteca() {
  const { session } = useAuth();
  const isMaster = session?.user.role === "MASTER";
  const activeUnitId = session?.activeUnit?.id ?? "";
  const [materials, setMaterials] = React.useState<Array<BrandLibraryMaterial>>([]);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [selectedCourse, setSelectedCourse] = React.useState(defaultCourse);
  const [courseFolders, setCourseFolders] = React.useState<Array<string>>(fallbackCourses);
  const [title, setTitle] = React.useState("");
  const [selectedFiles, setSelectedFiles] = React.useState<Array<File>>([]);
  const [fileInputKey, setFileInputKey] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!activeUnitId) {
      setMaterials([]);
      setCourseFolders(fallbackCourses);
      return;
    }

    let ignore = false;

    async function loadMaterials() {
      setLoading(true);

      try {
        const [materialsData, coursesData] = await Promise.all([
          readJson<MaterialsResponse>(
            await fetch(`/api/brand-library${unitQuery(activeUnitId)}`, {
              credentials: "same-origin",
              headers: { Accept: "application/json" },
            }),
          ),
          readJson<CoursesResponse>(
            await fetch(`/api/gestao/courses${unitQuery(activeUnitId)}`, {
              credentials: "same-origin",
              headers: { Accept: "application/json" },
            }),
          ),
        ]);

        if (!ignore) {
          const activeCourseNames = coursesData.courses
            .filter((course) => course.status === "active")
            .map((course) => course.name);
          const nextCourseFolders = activeCourseNames.length ? activeCourseNames : fallbackCourses;

          setMaterials(materialsData.materials);
          setCourseFolders(nextCourseFolders);
          setSelectedCourse((current) =>
            nextCourseFolders.includes(current) ? current : (nextCourseFolders[0] ?? defaultCourse),
          );
        }
      } catch (error) {
        if (!ignore) {
          toast.error(error instanceof Error ? error.message : "Falha ao carregar biblioteca.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadMaterials();

    return () => {
      ignore = true;
    };
  }, [activeUnitId]);

  const totalImages = materials.filter((material) => material.mediaType === "image").length;
  const totalVideos = materials.filter((material) => material.mediaType === "video").length;

  function resetForm() {
    setSelectedCourse(courseFolders[0] ?? defaultCourse);
    setTitle("");
    setSelectedFiles([]);
    setFileInputKey((current) => current + 1);
  }

  async function addMaterials() {
    if (!selectedFiles.length) {
      toast.error("Selecione ao menos uma imagem ou vídeo.");
      return;
    }

    if (!activeUnitId) {
      toast.error("Selecione uma unidade ativa antes de adicionar conteúdo.");
      return;
    }

    if (selectedFiles.length > 10) {
      toast.error("Adicione no máximo 10 arquivos por vez.");
      return;
    }

    if (selectedFiles.some((file) => !inferMediaType(file))) {
      toast.error("Use apenas imagens ou vídeos.");
      return;
    }

    if (selectedFiles.some((file) => file.size > maxUploadBytes)) {
      toast.error("Cada arquivo deve ter até 9 MB.");
      return;
    }

    setSaving(true);

    try {
      const uploadedMaterials = await Promise.all(
        selectedFiles.map(async (file, index) => {
          const mediaType = inferMediaType(file);
          const baseTitle =
            title.trim() && selectedFiles.length === 1
              ? title.trim()
              : title.trim()
                ? `${title.trim()} ${index + 1}`
                : file.name;

          if (!mediaType) {
            throw new Error("Arquivo inválido.");
          }

          return {
            course: selectedCourse,
            title: baseTitle,
            fileName: file.name,
            mimeType: file.type,
            mediaType,
            dataUrl: await readFileAsDataUrl(file),
          };
        }),
      );

      const data = await readJson<MaterialsResponse>(
        await fetch("/api/brand-library", {
          method: "POST",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ unitId: activeUnitId, materials: uploadedMaterials }),
        }),
      );

      setMaterials((current) => [...data.materials, ...current]);
      resetForm();
      setDialogOpen(false);
      toast.success("Conteúdo adicionado à biblioteca.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao adicionar conteúdo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Brand Plen"
        title="Biblioteca da Marca"
        description="Materiais organizados por curso. A biblioteca começa vazia para receber imagens e vídeos oficiais."
        actions={
          isMaster ? (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-primary text-primary-foreground">
                  <Plus className="h-4 w-4" />
                  Adicionar conteúdo
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar conteúdo</DialogTitle>
                  <DialogDescription>
                    Envie imagens ou vídeos e escolha a pasta do curso correspondente.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4">
                  <div className="space-y-1.5">
                    <Label>Curso</Label>
                    <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {courseFolders.map((course) => (
                          <SelectItem key={course} value={course}>
                            {course}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Título opcional</Label>
                    <Input
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="Ex: Aula prática, turma de junho, campanha oficial"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Arquivos</Label>
                    <Input
                      key={fileInputKey}
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      onChange={(event) => setSelectedFiles(Array.from(event.target.files ?? []))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Formatos aceitos: imagens e vídeos.
                    </p>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={resetForm}>
                    Limpar
                  </Button>
                  <Button
                    onClick={addMaterials}
                    disabled={saving}
                    className="gap-2 bg-primary text-primary-foreground"
                  >
                    <Upload className="h-4 w-4" />
                    {saving ? "Adicionando..." : "Adicionar na biblioteca"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : null
        }
      />

      <div className="grid gap-3 md:grid-cols-3">
        <Card className="shadow-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Folder className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-extrabold leading-none">{courseFolders.length}</div>
              <div className="mt-1 text-xs text-muted-foreground">pastas de cursos</div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileImage className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-extrabold leading-none">{totalImages}</div>
              <div className="mt-1 text-xs text-muted-foreground">imagens adicionadas</div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/15 text-gold">
              <Video className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-extrabold leading-none">{totalVideos}</div>
              <div className="mt-1 text-xs text-muted-foreground">vídeos adicionados</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {courseFolders.map((course) => {
          const courseMaterials = materials.filter((material) => material.course === course);

          return (
            <Card key={course} className="overflow-hidden shadow-card">
              <CardHeader className="border-b bg-muted/30 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                      <Folder className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="truncate text-base">{course}</CardTitle>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {courseMaterials.length} materiais
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    Curso
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {courseMaterials.length ? (
                  <div className="grid grid-cols-2 gap-3">
                    {courseMaterials.map((material) => (
                      <div key={material.id} className="overflow-hidden rounded-lg border bg-card">
                        <div className="aspect-video bg-muted">
                          {material.mediaType === "video" ? (
                            <video
                              src={material.dataUrl}
                              className="h-full w-full object-cover"
                              controls
                            />
                          ) : (
                            <img
                              src={material.dataUrl}
                              alt={material.title}
                              className="h-full w-full object-cover"
                            />
                          )}
                        </div>
                        <div className="space-y-1 p-2">
                          <div className="truncate text-xs font-semibold">{material.title}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {material.mediaType === "video" ? "Vídeo" : "Imagem"} ·{" "}
                            {formatDate(material.createdAt)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex min-h-[160px] flex-col items-center justify-center rounded-lg border border-dashed bg-accent/20 p-5 text-center">
                    <ImagePlus className="h-8 w-8 text-muted-foreground" />
                    <div className="mt-3 text-sm font-semibold">
                      {loading ? "Carregando materiais..." : "Pasta vazia"}
                    </div>
                    <p className="mt-1 max-w-[220px] text-xs text-muted-foreground">
                      Nenhum material foi adicionado para este curso.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
