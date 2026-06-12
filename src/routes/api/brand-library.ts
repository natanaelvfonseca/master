import { createFileRoute } from "@tanstack/react-router";
import type { QueryResultRow } from "pg";
import type { BrandLibraryMaterial, BrandLibraryMediaType } from "@/lib/brand-library-types";
import { getSessionFromRequest } from "@/lib/server/auth";
import { getUnitFromBody, getUnitFromRequest } from "@/lib/server/commercial-schema";
import { queryDb } from "@/lib/server/db";

type BrandLibraryRow = QueryResultRow & {
  id: string;
  unit_id: string;
  course: string;
  title: string;
  file_name: string;
  mime_type: string;
  media_type: BrandLibraryMediaType;
  data_url: string;
  created_by_name: string | null;
  created_at: string;
};

type ParsedMaterialPayload = {
  course: string;
  title: string;
  fileName: string;
  mimeType: string;
  mediaType: BrandLibraryMediaType;
  dataUrl: string;
};

const MAX_MATERIALS_PER_REQUEST = 10;
const MAX_DATA_URL_LENGTH = 12 * 1024 * 1024;

let brandLibrarySchemaPromise: Promise<void> | null = null;

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

function mapMaterial(row: BrandLibraryRow): BrandLibraryMaterial {
  return {
    id: row.id,
    unitId: row.unit_id,
    course: row.course,
    title: row.title,
    fileName: row.file_name,
    mimeType: row.mime_type,
    mediaType: row.media_type,
    dataUrl: row.data_url,
    createdByName: row.created_by_name,
    createdAt: row.created_at,
  };
}

function isMediaType(value: unknown): value is BrandLibraryMediaType {
  return value === "image" || value === "video";
}

function parseMaterialPayload(value: unknown): ParsedMaterialPayload | null {
  const data = value as {
    course?: unknown;
    title?: unknown;
    fileName?: unknown;
    mimeType?: unknown;
    mediaType?: unknown;
    dataUrl?: unknown;
  };
  const course = typeof data?.course === "string" ? data.course.trim() : "";
  const title = typeof data?.title === "string" ? data.title.trim() : "";
  const fileName = typeof data?.fileName === "string" ? data.fileName.trim() : "";
  const mimeType = typeof data?.mimeType === "string" ? data.mimeType.trim() : "";
  const dataUrl = typeof data?.dataUrl === "string" ? data.dataUrl : "";
  const mediaType = data?.mediaType;

  if (!course || !title || !fileName || !mimeType || !isMediaType(mediaType) || !dataUrl) {
    return null;
  }

  if (mediaType === "image" && !mimeType.startsWith("image/")) {
    return null;
  }

  if (mediaType === "video" && !mimeType.startsWith("video/")) {
    return null;
  }

  if (!dataUrl.startsWith(`data:${mimeType};base64,`)) {
    return null;
  }

  if (dataUrl.length > MAX_DATA_URL_LENGTH) {
    return null;
  }

  return { course, title, fileName, mimeType, mediaType, dataUrl };
}

export const Route = createFileRoute("/api/brand-library")({
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

        await ensureBrandLibrarySchema();

        const result = await queryDb<BrandLibraryRow>(
          `
            select
              m.id,
              m.unit_id,
              m.course,
              m.title,
              m.file_name,
              m.mime_type,
              m.media_type,
              m.data_url,
              u.name as created_by_name,
              m.created_at::text
            from app_brand_library_materials m
            left join app_users u on u.id = m.created_by
            where m.unit_id = $1
            order by m.course asc, m.created_at desc
          `,
          [unit.id],
        );

        return Response.json(
          { materials: result.rows.map(mapMaterial) },
          { headers: { "Cache-Control": "no-store" } },
        );
      },
      POST: async ({ request }) => {
        const session = await getSessionFromRequest(request);

        if (!session) {
          return Response.json({ ok: false, error: "Não autenticado." }, { status: 401 });
        }

        if (session.user.role !== "MASTER") {
          return Response.json({ ok: false, error: "Acesso negado." }, { status: 403 });
        }

        const body = (await request.json().catch(() => null)) as {
          unitId?: unknown;
          materials?: unknown;
        } | null;
        const unit = getUnitFromBody(session, body?.unitId);
        const rawMaterials = Array.isArray(body?.materials) ? body.materials : [];

        if (!unit) {
          return Response.json({ ok: false, error: "Unidade indisponível." }, { status: 403 });
        }

        if (!rawMaterials.length || rawMaterials.length > MAX_MATERIALS_PER_REQUEST) {
          return Response.json(
            { ok: false, error: "Quantidade inválida de arquivos." },
            { status: 400 },
          );
        }

        const materials = rawMaterials.map(parseMaterialPayload);

        if (materials.some((material) => !material)) {
          return Response.json(
            { ok: false, error: "Arquivos inválidos ou muito grandes." },
            { status: 400 },
          );
        }

        await ensureBrandLibrarySchema();

        const inserted: Array<BrandLibraryMaterial> = [];

        for (const material of materials) {
          if (!material) {
            continue;
          }

          const result = await queryDb<BrandLibraryRow>(
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
              values ($1, $2, $3, $4, $5, $6, $7, $8)
              returning
                id,
                unit_id,
                course,
                title,
                file_name,
                mime_type,
                media_type,
                data_url,
                $9::text as created_by_name,
                created_at::text
            `,
            [
              unit.id,
              material.course,
              material.title,
              material.fileName,
              material.mimeType,
              material.mediaType,
              material.dataUrl,
              session.user.id,
              session.user.name,
            ],
          );

          inserted.push(mapMaterial(result.rows[0]));
        }

        return Response.json({ materials: inserted }, { status: 201 });
      },
    },
  },
});
