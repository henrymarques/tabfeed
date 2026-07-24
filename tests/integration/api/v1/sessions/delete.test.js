import { version as uuidVersion } from "uuid";
import setCookieParser from "set-cookie-parser";

import session from "models/session";
import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("DELETE /api/v1/sessions", () => {
  describe("Anonymous user", () => {
    test("With valid session", async () => {
      const testUser = await orchestrator.createUser();
      const testSession = await orchestrator.createSession(testUser.id);

      const response = await fetch("http://localhost:3000/api/v1/sessions", {
        method: "DELETE",
        headers: {
          Cookie: `session_id=${testSession.token}`,
        },
      });

      expect(response.status).toBe(200);

      const responseBody = await response.json();

      const parsedSetCookie = setCookieParser(response, { map: true });
      expect(parsedSetCookie.session_id).toEqual({
        name: "session_id",
        value: "invalid",
        maxAge: -1,
        path: "/",
        httpOnly: true,
      });

      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();

      expect(responseBody).toEqual({
        id: responseBody.id,
        token: responseBody.token,
        user_id: testUser.id,
        expires_at: responseBody.expires_at,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });

      expect(responseBody.expires_at < testSession.expires_at.toISOString()).toBe(true);
      expect(responseBody.updated_at > testSession.updated_at.toISOString()).toBe(true);

      // Double check assertions
      const doubleCheckResponse = await fetch("http://localhost:3000/api/v1/whoami", {
        headers: {
          Cookie: `session_id=${testSession.token}`,
        },
      });

      expect(doubleCheckResponse.status).toBe(401);

      const doubleCheckResponseBody = await doubleCheckResponse.json();

      expect(doubleCheckResponseBody).toEqual({
        name: "UnauthorizedError",
        message: "Sessão inválida.",
        action: "Faça login novamente.",
        status_code: 401,
      });
    });

    test("With nonexistent session", async () => {
      const nonexistentToken =
        "4981f595f05af2f91e7fa24e0536d4840913065b3a72e662b17a0b8cde7d43459004aa9316fab17d48ed2b371b06e86c";

      const response = await fetch("http://localhost:3000/api/v1/sessions", {
        method: "DELETE",
        headers: {
          Cookie: `session_id=${nonexistentToken}`,
        },
      });

      expect(response.status).toBe(401);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "UnauthorizedError",
        message: "Sessão inválida.",
        action: "Faça login novamente.",
        status_code: 401,
      });
    });

    test("With expired session", async () => {
      jest.useFakeTimers({ now: new Date(Date.now() - session.EXPIRATION_IN_MILLISECONDS) });

      const testUser = await orchestrator.createUser({ username: "UserWithExpiredSession" });
      const testSession = await orchestrator.createSession(testUser.id);

      jest.useRealTimers();

      const response = await fetch("http://localhost:3000/api/v1/sessions", {
        method: "DELETE",
        headers: {
          Cookie: `session_id=${testSession.token}`,
        },
      });

      expect(response.status).toBe(401);

      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "UnauthorizedError",
        message: "Sessão inválida.",
        action: "Faça login novamente.",
        status_code: 401,
      });
    });
  });
});
