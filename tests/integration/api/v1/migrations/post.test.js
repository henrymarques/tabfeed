import database from "infra/database";

beforeAll(cleanDatabase);

async function cleanDatabase() {
  await database.query("drop schema public cascade; create schema public;");
}

test("POST to /api/v1/migrations should return 200", async () => {
  let response = await fetch("http://localhost:3000/api/v1/migrations", {
    method: "POST",
  });
  let responseBody = await response.json();

  expect(response.status).toBe(201);
  expect(Array.isArray(responseBody)).toBe(true);
  expect(responseBody.length).toBeGreaterThan(0);

  // --

  response = await fetch("http://localhost:3000/api/v1/migrations", {
    method: "POST",
  });
  responseBody = await response.json();

  expect(response.status).toBe(200);
  expect(Array.isArray(responseBody)).toBe(true);
  expect(responseBody.length).not.toBeGreaterThan(0);
});
