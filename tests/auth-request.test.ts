import assert from "node:assert/strict";
import test from "node:test";
import {
  AuthRequestError,
  isUnauthenticatedError,
  loadAuthSession,
} from "../src/lib/auth-request.ts";

test("returns the authenticated session without retrying", async () => {
  let calls = 0;
  const session = { user: { id: "user-1" } };
  const fetchSession = async () => {
    calls += 1;
    return Response.json(session);
  };

  assert.deepEqual(await loadAuthSession(fetchSession as typeof fetch, []), session);
  assert.equal(calls, 1);
});

test("does not retry an unauthenticated response", async () => {
  let calls = 0;
  const fetchSession = async () => {
    calls += 1;
    return Response.json({ error: "Não autenticado." }, { status: 401 });
  };

  await assert.rejects(
    loadAuthSession(fetchSession as typeof fetch, [0, 0]),
    (error) => error instanceof AuthRequestError && isUnauthenticatedError(error),
  );
  assert.equal(calls, 1);
});

test("retries server errors and preserves the final status", async () => {
  let calls = 0;
  const fetchSession = async () => {
    calls += 1;
    return Response.json({ error: "Banco indisponível." }, { status: 503 });
  };

  await assert.rejects(
    loadAuthSession(fetchSession as typeof fetch, [0, 0]),
    (error) => error instanceof AuthRequestError && error.status === 503,
  );
  assert.equal(calls, 3);
});

test("recovers when a retry succeeds", async () => {
  let calls = 0;
  const session = { user: { id: "user-1" } };
  const fetchSession = async () => {
    calls += 1;
    return calls === 1
      ? Response.json({ error: "Falha temporária." }, { status: 500 })
      : Response.json(session);
  };

  assert.deepEqual(await loadAuthSession(fetchSession as typeof fetch, [0]), session);
  assert.equal(calls, 2);
});
