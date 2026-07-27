import { version as uuidVersion } from "uuid";

import orchestrator from "tests/orchestrator";
import activation from "models/activation";
import user from "models/user";
import session from "models/session";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("PATCH /api/v1/activations/[token_id]", () => {
  describe("Anonymous user", () => {
    test("With nonexistent token", async () => {
      const response = await fetch("http://localhost:3000/api/v1/activations/a2fb3a12-685f-4b80-8f94-3a66a8e0208e", {
        method: "PATCH",
      });
      expect(response.status).toBe(404);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "NotFoundError",
        message: "Token inválido ou expirado.",
        action: "Faça o cadastro novamente.",
        status_code: 404,
      });
    });

    test("With expired token", async () => {
      jest.useFakeTimers({ now: new Date(Date.now() - activation.EXPIRATION_IN_MILLISECONDS) });
      const testUser = await orchestrator.createUser();
      const expiredActivationToken = await activation.createToken(testUser.id);
      jest.useRealTimers();

      const response = await fetch(`http://localhost:3000/api/v1/activations/${expiredActivationToken.id}`, {
        method: "PATCH",
      });
      expect(response.status).toBe(404);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "NotFoundError",
        message: "Token inválido ou expirado.",
        action: "Faça o cadastro novamente.",
        status_code: 404,
      });
    });

    test("With already used token", async () => {
      const testUser = await orchestrator.createUser();
      const validActivationToken = await activation.createToken(testUser.id);

      const response = await fetch(`http://localhost:3000/api/v1/activations/${validActivationToken.id}`, {
        method: "PATCH",
      });
      expect(response.status).toBe(200);

      const testResponse = await fetch(`http://localhost:3000/api/v1/activations/${validActivationToken.id}`, {
        method: "PATCH",
      });
      expect(testResponse.status).toBe(404);

      const testResponseBody = await testResponse.json();
      expect(testResponseBody).toEqual({
        name: "NotFoundError",
        message: "Token inválido ou expirado.",
        action: "Faça o cadastro novamente.",
        status_code: 404,
      });
    });

    test("With valid token", async () => {
      const testUser = await orchestrator.createUser();
      const validActivationToken = await activation.createToken(testUser.id);

      const response = await fetch(`http://localhost:3000/api/v1/activations/${validActivationToken.id}`, {
        method: "PATCH",
      });
      expect(response.status).toBe(200);

      const responseBody = await response.json();

      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(uuidVersion(responseBody.user_id)).toBe(4);

      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();
      expect(Date.parse(responseBody.expires_at)).not.toBeNaN();
      expect(responseBody.updated_at > responseBody.created_at).toBe(true);

      expect(responseBody).toEqual({
        created_at: validActivationToken.created_at.toISOString(),
        expires_at: validActivationToken.expires_at.toISOString(),
        id: validActivationToken.id,
        updated_at: responseBody.updated_at,
        used_at: responseBody.used_at,
        user_id: validActivationToken.user_id,
      });

      const activatedUser = await user.findOneById(responseBody.user_id);
      expect(activatedUser.features).toEqual(["create:session", "read:session"]);
    });

    test("With valid token but already activated user", async () => {
      const testUser = await orchestrator.createUser();
      await orchestrator.activateUser(testUser);
      const validActivationToken = await activation.createToken(testUser.id);

      const response = await fetch(`http://localhost:3000/api/v1/activations/${validActivationToken.id}`, {
        method: "PATCH",
      });
      expect(response.status).toBe(403);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Acesso negado.",
        action: "Verifique suas permissões antes de continuar.",
        status_code: 403,
      });
    });
  });

  describe("Default user", () => {
    test("With valid token but already logged in user", async () => {
      const testUser1 = await orchestrator.createUser();
      await orchestrator.activateUser(testUser1);
      const user1Session = await session.create(testUser1.id);

      const testUser2 = await orchestrator.createUser();
      const user2ValidActivationToken = await activation.createToken(testUser2.id);

      const response = await fetch(`http://localhost:3000/api/v1/activations/${user2ValidActivationToken.id}`, {
        method: "PATCH",
        headers: {
          cookie: `session_id=${user1Session.token}`,
        },
      });
      expect(response.status).toBe(403);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Acesso negado.",
        action: "Verifique suas permissões antes de continuar.",
        status_code: 403,
      });
    });
  });
});
