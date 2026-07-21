import orchestrator from "tests/orchestrator";

import { version as uuidVersion } from "uuid";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/users/[username]", () => {
  describe("Anonymous user", () => {
    test("With exact case match", async () => {
      await fetch("http://localhost:3000/api/v1/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "MesmoCase",
          email: "mesmo.case@teste.com",
          password: "senha123",
        }),
      });

      const response = await fetch("http://localhost:3000/api/v1/users/MesmoCase");
      expect(response.status).toBe(200);

      const responseBody = await response.json();

      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();

      expect(responseBody).toEqual({
        id: responseBody.id,
        username: "MesmoCase",
        email: "mesmo.case@teste.com",
        password: responseBody.password,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });
    });

    test("With case mismatch", async () => {
      await fetch("http://localhost:3000/api/v1/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "CaseDiferente",
          email: "case.diferente@teste.com",
          password: "senha123",
        }),
      });

      const response = await fetch("http://localhost:3000/api/v1/users/casediferente");
      expect(response.status).toBe(200);

      const responseBody = await response.json();

      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();

      expect(responseBody).toEqual({
        id: responseBody.id,
        username: "CaseDiferente",
        email: "case.diferente@teste.com",
        password: responseBody.password,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });
    });

    test("With non-existant username", async () => {
      const response = await fetch("http://localhost:3000/api/v1/users/UsuarioInexistente");
      expect(response.status).toBe(404);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "NotFoundError",
        message: "Usuário não encontrado",
        action: "Verifique sua consulta e tente novamente",
        status_code: 404,
      });
    });
  });
});
