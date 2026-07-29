import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/status", () => {
  describe("Anonymous user", () => {
    test("Retrieving current system status", async () => {
      const response = await fetch("http://localhost:3000/api/v1/status");

      expect(response.status).toBe(200);

      const responseBody = await response.json();
      expect(responseBody.updated_at).toEqual(new Date(responseBody.updated_at).toISOString());

      expect(responseBody.dependencies.database.version).toBeUndefined();
      expect(responseBody.dependencies.database.max_connections).toEqual(100);
      expect(responseBody.dependencies.database.opened_connections).toEqual(1);
    });
  });

  describe("Privileged user", () => {
    test("Retrieving current system status", async () => {
      const testUser = await orchestrator.createUser();
      await orchestrator.activateUser(testUser);
      await orchestrator.addFeaturesToUser(testUser, ["read:status:all"]);
      const testUserSession = await orchestrator.createSession(testUser.id);

      const response = await fetch("http://localhost:3000/api/v1/status", {
        headers: { cookie: `session_id=${testUserSession.token}` },
      });

      expect(response.status).toBe(200);

      const responseBody = await response.json();
      expect(responseBody.updated_at).toEqual(new Date(responseBody.updated_at).toISOString());

      expect(responseBody.dependencies.database.version).toEqual("16.0");
      expect(responseBody.dependencies.database.max_connections).toEqual(100);
      expect(responseBody.dependencies.database.opened_connections).toEqual(1);
    });
  });
});
