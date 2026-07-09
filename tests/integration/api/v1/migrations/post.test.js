import database from "infra/database";
import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await database.query("drop schema public cascade; create schema public;");
});

describe("POST /api/v1/migrations", () => {
  describe("Anonymous user", () => {
    describe("Running pending migrations", () => {
      test("For the first time", async () => {
        const response = await fetch("http://localhost:3000/api/v1/migrations", {
          method: "POST",
        });
        const responseBody = await response.json();

        expect(response.status).toBe(201);
        expect(Array.isArray(responseBody)).toBe(true);
        expect(responseBody.length).toBeGreaterThan(0);
      });

      test("For the second time", async () => {
        const response = await fetch("http://localhost:3000/api/v1/migrations", {
          method: "POST",
        });
        const responseBody = await response.json();

        expect(response.status).toBe(200);
        expect(Array.isArray(responseBody)).toBe(true);
        expect(responseBody.length).not.toBeGreaterThan(0);
      });
    });
  });
});
