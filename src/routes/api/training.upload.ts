import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { createFileRoute } from "@tanstack/react-router";
import { canManageTraining } from "@/lib/auth-types";
import { getSessionFromRequest } from "@/lib/server/auth";

const ONE_GB = 1024 * 1024 * 1024;

const allowedTrainingContentTypes = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "image/jpeg",
  "image/png",
  "image/webp",
];

export const Route = createFileRoute("/api/training/upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!process.env.BLOB_READ_WRITE_TOKEN) {
          return Response.json(
            {
              ok: false,
              error: "Armazenamento de vídeos não configurado na Vercel.",
            },
            { status: 500 },
          );
        }

        const body = (await request.json().catch(() => null)) as HandleUploadBody | null;
        const bodyType = (body as { type?: string } | null)?.type;
        const session = await getSessionFromRequest(request);

        if (!body) {
          return Response.json({ ok: false, error: "Upload inválido." }, { status: 400 });
        }

        if (bodyType === "blob.generate-client-token") {
          if (!session) {
            return Response.json({ ok: false, error: "Não autenticado." }, { status: 401 });
          }

          if (!canManageTraining(session.user.role)) {
            return Response.json({ ok: false, error: "Acesso negado." }, { status: 403 });
          }
        }

        try {
          const jsonResponse = await handleUpload({
            body,
            request,
            onBeforeGenerateToken: async () => {
              if (!session || !canManageTraining(session.user.role)) {
                throw new Error("Acesso negado.");
              }

              return {
                allowedContentTypes: allowedTrainingContentTypes,
                maximumSizeInBytes: ONE_GB,
                addRandomSuffix: true,
                tokenPayload: JSON.stringify({ userId: session.user.id }),
              };
            },
            onUploadCompleted: async () => undefined,
          });

          return Response.json(jsonResponse);
        } catch (error) {
          return Response.json(
            { ok: false, error: error instanceof Error ? error.message : "Falha no upload." },
            { status: 400 },
          );
        }
      },
    },
  },
});
