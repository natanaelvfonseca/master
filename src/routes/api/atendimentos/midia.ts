import { createFileRoute } from "@tanstack/react-router";
import { getSessionFromRequest } from "@/lib/server/auth";
import { getAttendanceMedia, requireAttendanceAccess } from "@/lib/server/attendances";

function contentDisposition(fileName: string) {
  const safeName = fileName.replace(/["\r\n]/g, "").trim() || "midia";

  return `inline; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`;
}

export const Route = createFileRoute("/api/atendimentos/midia")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await getSessionFromRequest(request);

        if (!session) {
          return Response.json({ ok: false, error: "Não autenticado." }, { status: 401 });
        }

        if (!requireAttendanceAccess(session)) {
          return Response.json({ ok: false, error: "Acesso negado." }, { status: 403 });
        }

        const url = new URL(request.url);

        try {
          const media = await getAttendanceMedia(session, {
            consultantId: url.searchParams.get("consultantId") ?? "",
            unitId: url.searchParams.get("unitId"),
            remoteJid: url.searchParams.get("remoteJid") ?? "",
            messageId: url.searchParams.get("messageId") ?? "",
            direction: url.searchParams.get("direction"),
            type: url.searchParams.get("type"),
          });

          if (!media) {
            return Response.json(
              { ok: false, error: "Mídia indisponível para esta mensagem." },
              { status: 404 },
            );
          }

          return new Response(new Uint8Array(media.buffer), {
            headers: {
              "Cache-Control": "private, max-age=300",
              "Content-Disposition": contentDisposition(media.fileName),
              "Content-Length": String(media.buffer.byteLength),
              "Content-Type": media.mimeType,
            },
          });
        } catch {
          return Response.json(
            { ok: false, error: "Não foi possível carregar a mídia agora." },
            { status: 502 },
          );
        }
      },
    },
  },
});
