import assert from "node:assert/strict";
import test from "node:test";
import {
  createCaezClient,
  formatCaezDate,
  getCaezFinancialDocument,
  parseCaezDate,
} from "../src/lib/server/caez-client.ts";
import { decryptCaezToken, encryptCaezToken } from "../src/lib/server/caez-token-crypto.ts";

test("converte datas entre o formato CAEZ e ISO", () => {
  assert.equal(parseCaezDate("19/10/2026"), "2026-10-19");
  assert.equal(parseCaezDate("2026-10-19"), null);
  assert.equal(formatCaezDate(new Date("2026-08-27T15:00:00-03:00")), "27/08/2026");
});

test("consulta turmas via HTTPS e envia token_integracao somente no header", async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = "";
  let requestedToken = "";
  globalThis.fetch = (async (input, init) => {
    requestedUrl = String(input);
    requestedToken = new Headers(init?.headers).get("token_integracao") ?? "";
    return Response.json({ total_registros: 1, dados: [{ codigo_turma: 339 }] });
  }) as typeof fetch;

  try {
    const result = await createCaezClient(
      "https://app.caezescola.com.br/api/",
      "secret-test",
    ).getClasses();
    assert.equal(result.total, 1);
    assert.equal(result.data[0]?.codigo_turma, 339);
    assert.equal(requestedUrl, "https://app.caezescola.com.br/api/api00702.aspx");
    assert.equal(requestedToken, "secret-test");
    assert.equal(requestedUrl.includes("secret-test"), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("usa os endpoints e parâmetros publicados para alunos e títulos", async () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<string> = [];
  globalThis.fetch = (async (input) => {
    requests.push(String(input));
    return Response.json({ total_registros: 0, dados: [] });
  }) as typeof fetch;

  try {
    const client = createCaezClient("https://app.caezescola.com.br/api/", "secret-test");
    await client.getStudentsByClass("339");
    await client.getFinancialTitles("12345678901", "01/01/2026", "31/12/2026");

    assert.equal(
      requests[0],
      "https://app.caezescola.com.br/api/api00701.aspx?turma=339",
    );
    const financialUrl = new URL(requests[1]);
    assert.equal(financialUrl.pathname, "/api/api00301.aspx");
    assert.deepEqual(Object.fromEntries(financialUrl.searchParams), {
      data_vencimento_inicio: "01/01/2026",
      data_vencimento_termino: "31/12/2026",
      documento_responsavel: "12345678901",
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("prioriza o documento do responsável e aceita CPF do aluno como compatibilidade", () => {
  assert.deepEqual(
    getCaezFinancialDocument({
      cpf_aluno: "111.222.333-44",
      cpf_cnpj_responsavel: "12.345.678/0001-90",
    }),
    { document: "12345678000190", source: "cpf_cnpj_responsavel" },
  );
  assert.deepEqual(getCaezFinancialDocument({ cpf_aluno: "111.222.333-44" }), {
    document: "11122233344",
    source: "cpf_aluno",
  });
  assert.deepEqual(getCaezFinancialDocument({ cpf_aluno: "123" }), {
    document: "",
    source: "missing",
  });
});

test("rejeita base URL sem HTTPS antes de realizar a chamada", async () => {
  await assert.rejects(
    () => createCaezClient("http://app.caezescola.com.br/api/", "secret-test").getClasses(),
    /HTTPS/,
  );
});

test("interrompe resposta CAEZ truncada sem importar dados parciais", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    Response.json({ total_registros: 2, dados: [{ codigo_turma: 339 }] })) as typeof fetch;
  try {
    await assert.rejects(
      () => createCaezClient("https://app.caezescola.com.br/api/", "secret-test").getClasses(),
      /página incompleta/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("criptografa token CAEZ com AES-GCM e exige a mesma chave", () => {
  const previous = process.env.CAEZ_TOKEN_ENCRYPTION_KEY;
  try {
    process.env.CAEZ_TOKEN_ENCRYPTION_KEY = "test-key-one";
    const encrypted = encryptCaezToken("token-ficticio");
    assert.equal(encrypted.includes("token-ficticio"), false);
    assert.equal(decryptCaezToken(encrypted), "token-ficticio");

    process.env.CAEZ_TOKEN_ENCRYPTION_KEY = "test-key-two";
    assert.throws(() => decryptCaezToken(encrypted));
  } finally {
    if (previous === undefined) delete process.env.CAEZ_TOKEN_ENCRYPTION_KEY;
    else process.env.CAEZ_TOKEN_ENCRYPTION_KEY = previous;
  }
});
