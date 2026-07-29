import webserver from "infra/webserver";
import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("POST /api/v1/migrations", () => {
  describe("Anonymous user", () => {
    test("Running pending migrations", async () => {
      const response = await fetch(`${webserver.origin}/api/v1/migrations`, {
        method: "POST",
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
    test("Returning pending migrations", async () => {
      const testUser = await orchestrator.createUser();
      await orchestrator.activateUser(testUser);
      const testUserSession = await orchestrator.createSession(testUser.id);

      const response = await fetch(`${webserver.origin}/api/v1/migrations`, {
        method: "POST",
        headers: { cookie: `session_id=${testUserSession.token}` },
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

  describe("Privileged user", () => {
    test("Running pending migrations", async () => {
      const testUser = await orchestrator.createUser();
      await orchestrator.activateUser(testUser);
      await orchestrator.addFeaturesToUser(testUser, ["create:migrations"]);
      const testUserSession = await orchestrator.createSession(testUser.id);

      const response = await fetch(`${webserver.origin}/api/v1/migrations`, {
        method: "POST",
        headers: { cookie: `session_id=${testUserSession.token}` },
      });
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(responseBody)).toBe(true);
      expect(responseBody.length).not.toBeGreaterThan(0);
    });
  });
});
