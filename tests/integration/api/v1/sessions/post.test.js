import { version as uuidVersion } from "uuid";
import setCookieParser from "set-cookie-parser";

import session from "models/session";
import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("POST /api/v1/sessions", () => {
  describe("Anonymous user", () => {
    test("With incorrect 'email' but correct 'password'", async () => {
      await orchestrator.createUser({
        password: "senha-correta",
      });

      const response = await fetch("http://localhost:3000/api/v1/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "email.errado@teste.com",
          password: "senha-correta",
        }),
      });
      expect(response.status).toBe(401);

      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "UnauthorizedError",
        message: "Dados de autenticação incorretos.",
        action: "Verifique os dados enviados e tente novamente.",
        status_code: 401,
      });
    });

    test("With correct 'email' but incorrect 'password'", async () => {
      await orchestrator.createUser({
        email: "email.correto@teste.com",
      });

      const response = await fetch("http://localhost:3000/api/v1/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "email.correto@teste.com",
          password: "senha-incorreta",
        }),
      });
      expect(response.status).toBe(401);

      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "UnauthorizedError",
        message: "Dados de autenticação incorretos.",
        action: "Verifique os dados enviados e tente novamente.",
        status_code: 401,
      });
    });

    test("With incorrect 'email' but incorrect 'password'", async () => {
      await orchestrator.createUser();

      const response = await fetch("http://localhost:3000/api/v1/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "email.incorreto@teste.com",
          password: "senha-incorreta",
        }),
      });
      expect(response.status).toBe(401);

      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "UnauthorizedError",
        action: "Verifique os dados enviados e tente novamente.",
        message: "Dados de autenticação incorretos.",
        status_code: 401,
      });
    });

    test("With correct 'email' and correct 'password'", async () => {
      const testUser = await orchestrator.createUser({
        email: "tudo.correto@teste.com",
        password: "tudo-correto",
      });

      const response = await fetch("http://localhost:3000/api/v1/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "tudo.correto@teste.com",
          password: "tudo-correto",
        }),
      });
      expect(response.status).toBe(201);

      const responseBody = await response.json();

      const parsedSetCookie = setCookieParser(response, { map: true });
      expect(parsedSetCookie.session_id).toEqual({
        name: "session_id",
        value: responseBody.token,
        maxAge: session.EXPIRATION_IN_MILLISECONDS / 1000,
        path: "/",
        httpOnly: true,
      });

      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(Date.parse(responseBody.expires_at)).not.toBeNaN();
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();

      const expiresAt = new Date(responseBody.expires_at).setMilliseconds(0);
      const createdAt = new Date(responseBody.created_at).setMilliseconds(0);

      expect(expiresAt - createdAt).toBe(session.EXPIRATION_IN_MILLISECONDS);

      expect(responseBody).toEqual({
        id: responseBody.id,
        token: responseBody.token,
        user_id: testUser.id,
        expires_at: responseBody.expires_at,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });
    });
  });
});
