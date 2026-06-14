import { createFileRoute } from "@tanstack/react-router";
import {
  buildBrandImagePrompt,
  getBrandImageSize,
  type BrandImageOutputFormat,
  type BrandImageQuality,
} from "@/lib/generateBrandImage";
import { getSessionFromRequest } from "@/lib/server/auth";

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

const OPENAI_IMAGE_ENDPOINT = "https://api.openai.com/v1/images/generations";
const OPENAI_IMAGE_EDIT_ENDPOINT = "https://api.openai.com/v1/images/edits";
const DEFAULT_IMAGE_MODEL = "gpt-image-2";
const MAX_TEXT_LENGTH = 32000;
const MAX_REFERENCE_DATA_URL_LENGTH = 8 * 1024 * 1024;

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
      form.append("image[]", imageFile.blob, imageFile.fileName);
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

export const Route = createFileRoute("/api/brand-plen/generate")({
  server: {
    handlers: {
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
        const outputFormat: BrandImageOutputFormat = "png";

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

        const prompt = buildBrandImagePrompt({
          pieceType,
          objective,
          course,
          audience,
          description,
          visualStyle,
          overlayText,
          applyLogo,
          unitName: session.activeUnit?.name,
        }).slice(0, MAX_TEXT_LENGTH);
        const size = getBrandImageSize(pieceType);
        const model = process.env.OPENAI_IMAGE_MODEL?.trim() || DEFAULT_IMAGE_MODEL;
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
          return Response.json(
            { ok: false, error: parseOpenAiError(openAiResponse.status, payload) },
            { status: openAiResponse.status },
          );
        }

        const images =
          (payload as OpenAiImageResponse | null)?.data?.flatMap((image, index) => {
            if (image.b64_json) {
              return [
                {
                  id: `brand-plen-${Date.now()}-${index}`,
                  dataUrl: `data:image/${outputFormat};base64,${image.b64_json}`,
                  revisedPrompt: image.revised_prompt ?? null,
                  prompt,
                  pieceType,
                  objective,
                  course,
                  size,
                  quality,
                  format: outputFormat,
                  createdAt: new Date().toISOString(),
                },
              ];
            }

            if (image.url) {
              return [
                {
                  id: `brand-plen-${Date.now()}-${index}`,
                  dataUrl: image.url,
                  revisedPrompt: image.revised_prompt ?? null,
                  prompt,
                  pieceType,
                  objective,
                  course,
                  size,
                  quality,
                  format: outputFormat,
                  createdAt: new Date().toISOString(),
                },
              ];
            }

            return [];
          }) ?? [];

        if (!images.length) {
          return Response.json(
            { ok: false, error: "A OpenAI não retornou uma imagem." },
            { status: 502 },
          );
        }

        return Response.json(
          { images, prompt, model },
          { headers: { "Cache-Control": "no-store" } },
        );
      },
    },
  },
});
