import { version as uuidVersion } from "uuid";
import setCookieParser from "set-cookie-parser";

import orchestrator from "tests/orchestrator.js";
import session from "models/session";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/whoami", () => {
  describe("Default user", () => {
    test("With valid session", async () => {
      const testUser = await orchestrator.createUser({ username: "UserWithValidSession" });
      const testSession = await orchestrator.createSession(testUser.id);

      const response = await fetch("http://localhost:3000/api/v1/whoami", {
        headers: {
          Cookie: `session_id=${testSession.token}`,
        },
      });

      expect(response.status).toBe(200);

      const cacheControl = response.headers.get("Cache-Control");
      expect(cacheControl).toBe("no-store, no-cache, max-age=0, must-revalidate");

      const responseBody = await response.json();

      const parsedSetCookie = setCookieParser(response, { map: true });
      expect(parsedSetCookie.session_id).toEqual({
        name: "session_id",
        value: testSession.token,
        maxAge: session.EXPIRATION_IN_MILLISECONDS / 1000,
        path: "/",
        httpOnly: true,
      });

      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();

      expect(responseBody).toEqual({
        id: testUser.id,
        username: "UserWithValidSession",
        email: testUser.email,
        password: testUser.password,
        created_at: testUser.created_at.toISOString(),
        updated_at: testUser.updated_at.toISOString(),
      });

      const renewedSession = await session.findOneValidByToken(testSession.token);
      expect(renewedSession.expires_at > testSession.expires_at).toEqual(true);
      expect(renewedSession.updated_at > testSession.updated_at).toEqual(true);
    });

    test("With nonexistent session", async () => {
      const nonexistentToken =
        "4981f595f05af2f91e7fa24e0536d4840913065b3a72e662b17a0b8cde7d43459004aa9316fab17d48ed2b371b06e86c";

      const response = await fetch("http://localhost:3000/api/v1/whoami", {
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

      const response = await fetch("http://localhost:3000/api/v1/whoami", {
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

    test("With a half expired valid session", async () => {
      jest.useFakeTimers({ now: new Date(Date.now() - session.EXPIRATION_IN_MILLISECONDS / 2) });

      const testUser = await orchestrator.createUser({ username: "UserWithHalfValidSession" });
      const testSession = await orchestrator.createSession(testUser.id);

      jest.useRealTimers();

      const response = await fetch("http://localhost:3000/api/v1/whoami", {
        headers: {
          Cookie: `session_id=${testSession.token}`,
        },
      });

      expect(response.status).toBe(200);

      const responseBody = await response.json();

      const parsedSetCookie = setCookieParser(response, { map: true });
      expect(parsedSetCookie.session_id).toEqual({
        name: "session_id",
        value: testSession.token,
        maxAge: session.EXPIRATION_IN_MILLISECONDS / 1000,
        path: "/",
        httpOnly: true,
      });

      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();

      expect(responseBody).toEqual({
        id: testUser.id,
        username: "UserWithHalfValidSession",
        email: testUser.email,
        password: testUser.password,
        created_at: testUser.created_at.toISOString(),
        updated_at: testUser.updated_at.toISOString(),
      });

      const renewedSession = await session.findOneValidByToken(testSession.token);
      expect(renewedSession.expires_at > testSession.expires_at).toEqual(true);
      expect(renewedSession.updated_at > testSession.updated_at).toEqual(true);
    });
  });
});
