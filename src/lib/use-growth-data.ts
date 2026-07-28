import * as React from "react";
import { toast } from "sonner";
import type { GrowthResponse } from "@/lib/growth-types";

async function readJson<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as T;

  if (!response.ok) {
    const message =
      typeof (data as { error?: unknown }).error === "string"
        ? (data as { error: string }).error
        : "Falha ao carregar crescimento.";
    throw new Error(message);
  }

  return data;
}

function growthQuery(scopeValue: string, periodDays: number, turmaId: string) {
  const turmaQuery = turmaId ? `&turmaId=${encodeURIComponent(turmaId)}` : "";

  if (scopeValue === "all") {
    return `?scope=all&period=${periodDays}${turmaQuery}`;
  }

  return `?unitId=${encodeURIComponent(scopeValue)}&period=${periodDays}${turmaQuery}`;
}

export function useGrowthData(
  scopeValue: string,
  enabled: boolean,
  periodDays = 30,
  turmaId = "",
) {
  const [data, setData] = React.useState<GrowthResponse | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!enabled || !scopeValue) {
      setData(null);
      return;
    }

    let ignore = false;

    async function loadGrowthData() {
      setLoading(true);

      try {
        const nextData = await readJson<GrowthResponse>(
          await fetch(`/api/growth${growthQuery(scopeValue, periodDays, turmaId)}`, {
            credentials: "same-origin",
            headers: { Accept: "application/json" },
          }),
        );

        if (!ignore) {
          setData(nextData);
        }
      } catch (error) {
        if (!ignore) {
          toast.error(error instanceof Error ? error.message : "Falha ao carregar crescimento.");
          setData(null);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadGrowthData();

    return () => {
      ignore = true;
    };
  }, [enabled, periodDays, scopeValue, turmaId]);

  return { data, loading };
}
