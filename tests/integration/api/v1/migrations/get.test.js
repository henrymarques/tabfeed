import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/migrations", () => {
  describe("Anonymous user", () => {
    test("Retrieving pending migrations", async () => {
      const response = await fetch("http://localhost:3000/api/v1/migrations");
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
    test("Retrieving pending migrations", async () => {
      const testUser = await orchestrator.createUser();
      await orchestrator.activateUser(testUser);
      const testUserSession = await orchestrator.createSession(testUser.id);

      const response = await fetch("http://localhost:3000/api/v1/migrations", {
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
    test("Retrieving pending migrations", async () => {
      const testUser = await orchestrator.createUser();
      await orchestrator.activateUser(testUser);
      await orchestrator.addFeaturesToUser(testUser, ["read:migrations"]);
      const testUserSession = await orchestrator.createSession(testUser.id);

      const response = await fetch("http://localhost:3000/api/v1/migrations", {
        headers: { cookie: `session_id=${testUserSession.token}` },
      });

      expect(response.status).toBe(200);
      const responseBody = await response.json();

      expect(Array.isArray(responseBody)).toBe(true);
    });
  });
});
