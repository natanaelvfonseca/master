import { createFileRoute } from "@tanstack/react-router";
import type { QueryResultRow } from "pg";
import type { BrandPlenGeneration } from "@/lib/brand-plen-types";
import {
  buildBrandImagePrompt,
  getBrandImageSize,
  type BrandImageOutputFormat,
  type BrandImageQuality,
  type BrandImageSize,
} from "@/lib/generateBrandImage";
import { getUnitFromBody, getUnitFromRequest } from "@/lib/server/commercial-schema";
import { getSessionFromRequest } from "@/lib/server/auth";
import { queryDb } from "@/lib/server/db";

type OpenAiImage = {
  b64_json?: string;
  revised_prompt?: string;
  url?: string;
};

type OpenAiImageResponse = {
  created?: number;
  data?: Array<OpenAiImage>;
};

type OpenAiErrorResponse = {
  error?: {
    code?: string;
    message?: string;
    type?: string;
  };
};

type BrandPlenGenerationRow = QueryResultRow & {
  id: string;
  unit_id: string;
  status: BrandPlenGeneration["status"];
  data_url: string | null;
  revised_prompt: string | null;
  prompt: string;
  piece_type: string;
  objective: string;
  course: string;
  audience: string;
  visual_style: string;
  description: string;
  overlay_text: string | null;
  model: string;
  size: BrandImageSize;
  quality: BrandImageQuality;
  format: BrandImageOutputFormat;
  error_message: string | null;
  published_material_id: string | null;
  created_at: string;
  updated_at: string;
};

type BrandLibraryRow = QueryResultRow & {
  id: string;
};

const OPENAI_IMAGE_ENDPOINT = "https://api.openai.com/v1/images/generations";
const OPENAI_IMAGE_EDIT_ENDPOINT = "https://api.openai.com/v1/images/edits";
const DEFAULT_IMAGE_MODEL = "gpt-image-1.5";
const MAX_TEXT_LENGTH = 32000;
const MAX_REFERENCE_DATA_URL_LENGTH = 8 * 1024 * 1024;
const MAX_LIBRARY_DATA_URL_LENGTH = 12 * 1024 * 1024;
const RECENT_GENERATIONS_LIMIT = 12;

let brandPlenGenerationSchemaPromise: Promise<void> | null = null;
let brandLibrarySchemaPromise: Promise<void> | null = null;

function ensureBrandPlenGenerationSchema() {
  brandPlenGenerationSchemaPromise ??= queryDb(`
    create table if not exists app_brand_plen_generations (
      id uuid primary key default gen_random_uuid(),
      unit_id uuid not null references app_units(id) on delete cascade,
      created_by uuid not null references app_users(id) on delete cascade,
      piece_type text not null,
      objective text not null,
      course text not null,
      audience text not null,
      visual_style text not null,
      description text not null,
      overlay_text text,
      prompt text not null,
      model text not null,
      size text not null,
      quality text not null,
      format text not null default 'png',
      status text not null default 'generating' check (status in ('generating', 'ready', 'failed')),
      data_url text,
      revised_prompt text,
      error_message text,
      published_material_id uuid,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    alter table app_brand_plen_generations add column if not exists published_material_id uuid;
    alter table app_brand_plen_generations add column if not exists error_message text;
    alter table app_brand_plen_generations add column if not exists updated_at timestamptz not null default now();

    create index if not exists app_brand_plen_generations_user_created_idx
      on app_brand_plen_generations (unit_id, created_by, created_at desc);

    create index if not exists app_brand_plen_generations_status_idx
      on app_brand_plen_generations (status, updated_at desc);
  `)
    .then(() => undefined)
    .catch((error) => {
      brandPlenGenerationSchemaPromise = null;
      throw error;
    });

  return brandPlenGenerationSchemaPromise;
}

function ensureBrandLibrarySchema() {
  brandLibrarySchemaPromise ??= queryDb(`
    create table if not exists app_brand_library_materials (
      id uuid primary key default gen_random_uuid(),
      unit_id uuid not null references app_units(id) on delete cascade,
      course text not null,
      title text not null,
      file_name text not null,
      mime_type text not null,
      media_type text not null check (media_type in ('image', 'video')),
      data_url text not null,
      created_by uuid references app_users(id) on delete set null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create index if not exists app_brand_library_unit_course_idx
      on app_brand_library_materials (unit_id, course);

    create index if not exists app_brand_library_unit_created_idx
      on app_brand_library_materials (unit_id, created_at desc);
  `)
    .then(() => undefined)
    .catch((error) => {
      brandLibrarySchemaPromise = null;
      throw error;
    });

  return brandLibrarySchemaPromise;
}

function readString(value: unknown, maxLength = 500) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
}

function isQuality(value: unknown): value is BrandImageQuality {
  return value === "low" || value === "medium" || value === "high";
}

function isDataImageUrl(value: unknown) {
  return (
    typeof value === "string" &&
    value.length <= MAX_REFERENCE_DATA_URL_LENGTH &&
    /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/i.test(value)
  );
}

function toImageFile(dataUrl: string, index: number) {
  const [metadata = "", content = ""] = dataUrl.split(",");
  const mimeType = metadata.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64$/i)?.[1];

  if (!mimeType || !content) {
    return null;
  }

  const bytes = Buffer.from(content, "base64");
  const extension = mimeType.replace("image/", "").replace("jpeg", "jpg");
  const blob = new Blob([bytes], { type: mimeType });

  return { blob, fileName: `brand-reference-${index + 1}.${extension}` };
}

function slugifyFileName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function mapGeneration(row: BrandPlenGenerationRow): BrandPlenGeneration {
  return {
    id: row.id,
    unitId: row.unit_id,
    status: row.status,
    dataUrl: row.data_url,
    revisedPrompt: row.revised_prompt,
    prompt: row.prompt,
    pieceType: row.piece_type,
    objective: row.objective,
    course: row.course,
    audience: row.audience,
    visualStyle: row.visual_style,
    description: row.description,
    overlayText: row.overlay_text,
    model: row.model,
    size: row.size,
    quality: row.quality,
    format: row.format,
    errorMessage: row.error_message,
    publishedMaterialId: row.published_material_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseOpenAiError(status: number, payload: OpenAiErrorResponse | null) {
  const code = payload?.error?.code;

  if (code === "moderation_blocked") {
    return "A solicitação foi bloqueada pela moderação da OpenAI. Ajuste o briefing e tente novamente.";
  }

  if (status === 401) {
    return "A chave da OpenAI está inválida ou não foi aceita.";
  }

  if (status === 429) {
    return "Limite da OpenAI atingido no momento. Tente novamente em alguns instantes.";
  }

  return payload?.error?.message ?? "Não foi possível gerar a imagem agora.";
}

async function postImageEdit({
  apiKey,
  model,
  prompt,
  referenceImages,
  size,
  quality,
  outputFormat,
  userId,
}: {
  apiKey: string;
  model: string;
  prompt: string;
  referenceImages: Array<string>;
  size: string;
  quality: BrandImageQuality;
  outputFormat: BrandImageOutputFormat;
  userId: string;
}) {
  const form = new FormData();

  form.append("model", model);
  form.append("prompt", prompt);
  form.append("n", "1");
  form.append("size", size);
  form.append("quality", quality);
  form.append("output_format", outputFormat);
  form.append("background", "opaque");
  form.append("moderation", "auto");
  form.append("user", userId);

  referenceImages.forEach((imageUrl, index) => {
    const imageFile = toImageFile(imageUrl, index);

    if (imageFile) {
      form.append("image", imageFile.blob, imageFile.fileName);
    }
  });

  return fetch(OPENAI_IMAGE_EDIT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: form,
  });
}

async function markGenerationFailed(id: string, errorMessage: string) {
  const result = await queryDb<BrandPlenGenerationRow>(
    `
      update app_brand_plen_generations
      set status = 'failed',
          error_message = $2,
          updated_at = now()
      where id = $1
      returning
        id,
        unit_id,
        status,
        data_url,
        revised_prompt,
        prompt,
        piece_type,
        objective,
        course,
        audience,
        visual_style,
        description,
        overlay_text,
        model,
        size,
        quality,
        format,
        error_message,
        published_material_id,
        created_at::text,
        updated_at::text
    `,
    [id, errorMessage],
  );

  return result.rows[0] ? mapGeneration(result.rows[0]) : null;
}

async function listRecentGenerations(unitId: string, userId: string) {
  await queryDb(
    `
      update app_brand_plen_generations
      set status = 'failed',
          error_message = 'A geração demorou mais que o esperado. Tente criar novamente.',
          updated_at = now()
      where unit_id = $1
        and created_by = $2
        and status = 'generating'
        and updated_at < now() - interval '20 minutes'
    `,
    [unitId, userId],
  );

  const result = await queryDb<BrandPlenGenerationRow>(
    `
      select
        id,
        unit_id,
        status,
        data_url,
        revised_prompt,
        prompt,
        piece_type,
        objective,
        course,
        audience,
        visual_style,
        description,
        overlay_text,
        model,
        size,
        quality,
        format,
        error_message,
        published_material_id,
        created_at::text,
        updated_at::text
      from app_brand_plen_generations
      where unit_id = $1
        and created_by = $2
      order by created_at desc
      limit $3
    `,
    [unitId, userId, RECENT_GENERATIONS_LIMIT],
  );

  return result.rows.map(mapGeneration);
}

export const Route = createFileRoute("/api/brand-plen/generate")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await getSessionFromRequest(request);

        if (!session) {
          return Response.json({ ok: false, error: "Não autenticado." }, { status: 401 });
        }

        const unit = getUnitFromRequest(session, request);

        if (!unit) {
          return Response.json({ ok: false, error: "Unidade indisponível." }, { status: 403 });
        }

        await ensureBrandPlenGenerationSchema();

        return Response.json(
          { generations: await listRecentGenerations(unit.id, session.user.id) },
          { headers: { "Cache-Control": "no-store" } },
        );
      },
      POST: async ({ request }) => {
        const session = await getSessionFromRequest(request);

        if (!session) {
          return Response.json({ ok: false, error: "Não autenticado." }, { status: 401 });
        }

        const apiKey = process.env.OPENAI_API_KEY?.trim();

        if (!apiKey) {
          return Response.json(
            {
              ok: false,
              error: "Configure OPENAI_API_KEY no ambiente do servidor para gerar imagens.",
            },
            { status: 503 },
          );
        }

        const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

        if (!body) {
          return Response.json({ ok: false, error: "Briefing inválido." }, { status: 400 });
        }

        const unit = getUnitFromBody(session, body.unitId);
        const pieceType = readString(body.pieceType, 80);
        const objective = readString(body.objective, 160);
        const course = readString(body.course, 160);
        const audience = readString(body.audience, 160);
        const visualStyle = readString(body.visualStyle, 160);
        const description = readString(body.description, 1400);
        const overlayText = readString(body.overlayText, 140);
        const applyLogo = body.applyLogo !== false;
        const logoDataUrl = isDataImageUrl(body.logoDataUrl) ? body.logoDataUrl : "";
        const referenceImageDataUrl = isDataImageUrl(body.referenceImageDataUrl)
          ? body.referenceImageDataUrl
          : "";
        const quality = isQuality(body.quality) ? body.quality : "high";
        const outputFormat: BrandImageOutputFormat = "webp";

        if (!unit) {
          return Response.json({ ok: false, error: "Unidade indisponível." }, { status: 403 });
        }

        if (!pieceType || !objective || !course || !audience || !visualStyle || !description) {
          return Response.json(
            { ok: false, error: "Preencha o briefing antes de gerar a imagem." },
            { status: 400 },
          );
        }

        if (applyLogo && !logoDataUrl) {
          return Response.json(
            { ok: false, error: "Não foi possível carregar o logo da Plenarius." },
            { status: 400 },
          );
        }

        await ensureBrandPlenGenerationSchema();

        const prompt = buildBrandImagePrompt({
          pieceType,
          objective,
          course,
          audience,
          description,
          visualStyle,
          overlayText,
          applyLogo,
          unitName: unit.name,
        }).slice(0, MAX_TEXT_LENGTH);
        const size = getBrandImageSize(pieceType);
        const model = process.env.OPENAI_IMAGE_MODEL?.trim() || DEFAULT_IMAGE_MODEL;
        const generationResult = await queryDb<BrandPlenGenerationRow>(
          `
            insert into app_brand_plen_generations (
              unit_id,
              created_by,
              piece_type,
              objective,
              course,
              audience,
              visual_style,
              description,
              overlay_text,
              prompt,
              model,
              size,
              quality,
              format,
              status
            )
            values ($1, $2, $3, $4, $5, $6, $7, $8, nullif($9, ''), $10, $11, $12, $13, $14, 'generating')
            returning
              id,
              unit_id,
              status,
              data_url,
              revised_prompt,
              prompt,
              piece_type,
              objective,
              course,
              audience,
              visual_style,
              description,
              overlay_text,
              model,
              size,
              quality,
              format,
              error_message,
              published_material_id,
              created_at::text,
              updated_at::text
          `,
          [
            unit.id,
            session.user.id,
            pieceType,
            objective,
            course,
            audience,
            visualStyle,
            description,
            overlayText,
            prompt,
            model,
            size,
            quality,
            outputFormat,
          ],
        );
        const generation = generationResult.rows[0];

        try {
          const referenceImages = [applyLogo ? logoDataUrl : "", referenceImageDataUrl].filter(
            Boolean,
          );
          const openAiResponse = referenceImages.length
            ? await postImageEdit({
                apiKey,
                model,
                prompt,
                referenceImages,
                size,
                quality,
                outputFormat,
                userId: session.user.id,
              })
            : await fetch(OPENAI_IMAGE_ENDPOINT, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${apiKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  model,
                  prompt,
                  n: 1,
                  size,
                  quality,
                  output_format: outputFormat,
                  background: "opaque",
                  moderation: "auto",
                  user: session.user.id,
                }),
              });
          const payload = (await openAiResponse.json().catch(() => null)) as
            | OpenAiImageResponse
            | OpenAiErrorResponse
            | null;

          if (!openAiResponse.ok) {
            const errorMessage = parseOpenAiError(openAiResponse.status, payload);
            const failedGeneration = await markGenerationFailed(generation.id, errorMessage);

            return Response.json(
              { ok: false, error: errorMessage, generation: failedGeneration },
              { status: openAiResponse.status },
            );
          }

          const image = (payload as OpenAiImageResponse | null)?.data?.[0];
          const dataUrl = image?.b64_json
            ? `data:image/${outputFormat};base64,${image.b64_json}`
            : image?.url;

          if (!dataUrl) {
            const errorMessage = "A OpenAI não retornou uma imagem.";
            const failedGeneration = await markGenerationFailed(generation.id, errorMessage);

            return Response.json(
              { ok: false, error: errorMessage, generation: failedGeneration },
              { status: 502 },
            );
          }

          const updatedResult = await queryDb<BrandPlenGenerationRow>(
            `
              update app_brand_plen_generations
              set status = 'ready',
                  data_url = $2,
                  revised_prompt = $3,
                  error_message = null,
                  updated_at = now()
              where id = $1
              returning
                id,
                unit_id,
                status,
                data_url,
                revised_prompt,
                prompt,
                piece_type,
                objective,
                course,
                audience,
                visual_style,
                description,
                overlay_text,
                model,
                size,
                quality,
                format,
                error_message,
                published_material_id,
                created_at::text,
                updated_at::text
            `,
            [generation.id, dataUrl, image?.revised_prompt ?? null],
          );
          const updatedGeneration = mapGeneration(updatedResult.rows[0]);

          return Response.json(
            {
              generation: updatedGeneration,
              images: [updatedGeneration],
              model,
            },
            { headers: { "Cache-Control": "no-store" } },
          );
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Não foi possível gerar a imagem.";
          const failedGeneration = await markGenerationFailed(generation.id, errorMessage);

          return Response.json(
            { ok: false, error: errorMessage, generation: failedGeneration },
            { status: 500 },
          );
        }
      },
      PATCH: async ({ request }) => {
        const session = await getSessionFromRequest(request);

        if (!session) {
          return Response.json({ ok: false, error: "Não autenticado." }, { status: 401 });
        }

        const body = (await request.json().catch(() => null)) as {
          id?: unknown;
          unitId?: unknown;
        } | null;
        const id = typeof body?.id === "string" ? body.id.trim() : "";
        const unit = getUnitFromBody(session, body?.unitId);

        if (!unit) {
          return Response.json({ ok: false, error: "Unidade indisponível." }, { status: 403 });
        }

        if (!id) {
          return Response.json({ ok: false, error: "Criação inválida." }, { status: 400 });
        }

        await ensureBrandPlenGenerationSchema();
        await ensureBrandLibrarySchema();

        const generationResult = await queryDb<BrandPlenGenerationRow>(
          `
            select
              id,
              unit_id,
              status,
              data_url,
              revised_prompt,
              prompt,
              piece_type,
              objective,
              course,
              audience,
              visual_style,
              description,
              overlay_text,
              model,
              size,
              quality,
              format,
              error_message,
              published_material_id,
              created_at::text,
              updated_at::text
            from app_brand_plen_generations
            where id = $1
              and unit_id = $2
              and created_by = $3
            limit 1
          `,
          [id, unit.id, session.user.id],
        );
        const generation = generationResult.rows[0];

        if (!generation) {
          return Response.json({ ok: false, error: "Criação não encontrada." }, { status: 404 });
        }

        if (generation.status !== "ready" || !generation.data_url) {
          return Response.json(
            { ok: false, error: "A imagem ainda não está pronta para a biblioteca." },
            { status: 400 },
          );
        }

        if (!generation.data_url.startsWith("data:image/")) {
          return Response.json(
            { ok: false, error: "A imagem precisa estar salva antes de ir para a biblioteca." },
            { status: 400 },
          );
        }

        if (generation.data_url.length > MAX_LIBRARY_DATA_URL_LENGTH) {
          return Response.json(
            { ok: false, error: "A imagem ficou grande demais para a biblioteca." },
            { status: 400 },
          );
        }

        if (!generation.published_material_id) {
          const materialResult = await queryDb<BrandLibraryRow>(
            `
              insert into app_brand_library_materials (
                unit_id,
                course,
                title,
                file_name,
                mime_type,
                media_type,
                data_url,
                created_by
              )
              values ($1, $2, $3, $4, $5, 'image', $6, $7)
              returning id
            `,
            [
              unit.id,
              generation.course,
              `Brand Plen - ${generation.course} - ${generation.objective}`,
              `brand-plen-${slugifyFileName(generation.course) || "arte"}-${generation.id}.${generation.format}`,
              `image/${generation.format}`,
              generation.data_url,
              session.user.id,
            ],
          );

          generation.published_material_id = materialResult.rows[0]?.id ?? null;

          await queryDb(
            `
              update app_brand_plen_generations
              set published_material_id = $2,
                  updated_at = now()
              where id = $1
            `,
            [generation.id, generation.published_material_id],
          );
        }

        const updatedResult = await queryDb<BrandPlenGenerationRow>(
          `
            select
              id,
              unit_id,
              status,
              data_url,
              revised_prompt,
              prompt,
              piece_type,
              objective,
              course,
              audience,
              visual_style,
              description,
              overlay_text,
              model,
              size,
              quality,
              format,
              error_message,
              published_material_id,
              created_at::text,
              updated_at::text
            from app_brand_plen_generations
            where id = $1
            limit 1
          `,
          [generation.id],
        );

        return Response.json(
          { generation: mapGeneration(updatedResult.rows[0]) },
          { headers: { "Cache-Control": "no-store" } },
        );
      },
    },
  },
});
