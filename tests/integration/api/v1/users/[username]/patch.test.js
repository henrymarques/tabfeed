import { version as uuidVersion } from "uuid";

import webserver from "infra/webserver";
import password from "models/password";
import user from "models/user";

import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("PATCH /api/v1/users/[username]", () => {
  describe("Anonymous user", () => {
    test("With unique `username`", async () => {
      await orchestrator.createUser({ username: "uniqueUserAnonymous" });

      const response = await fetch(`${webserver.origin}/api/v1/users/uniqueUserAnonymous`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "uniqueUser2",
        }),
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
    test("With non-existant `username`", async () => {
      const testUser = await orchestrator.createUser();
      const activatedUser = await orchestrator.activateUser(testUser);
      const testUserSession = await orchestrator.createSession(activatedUser);

      const response = await fetch(`${webserver.origin}/api/v1/users/UsuarioInexistente`, {
        method: "PATCH",
        headers: { cookie: `session_id=${testUserSession.token}` },
      });
      expect(response.status).toBe(404);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "NotFoundError",
        message: "Usuário não encontrado",
        action: "Verifique sua consulta e tente novamente",
        status_code: 404,
      });
    });

    test("With duplicated `username`", async () => {
      await orchestrator.createUser({ username: "user1" });

      const testUser = await orchestrator.createUser({ username: "user2" });
      const activatedUser = await orchestrator.activateUser(testUser);
      const testUserSession = await orchestrator.createSession(activatedUser);

      const response = await fetch(`${webserver.origin}/api/v1/users/user2`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${testUserSession.token}`,
        },
        body: JSON.stringify({
          username: "user1",
        }),
      });
      expect(response.status).toBe(400);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "O nome de usuário informado já está sendo utilizado.",
        action: "Utilize outro nome de usuário para realizar a operação.",
        status_code: 400,
      });
    });

    test("With `userB` targeting `userA`", async () => {
      await orchestrator.createUser({ username: "userA" });

      const testUser = await orchestrator.createUser({ username: "userB" });
      const activatedUser = await orchestrator.activateUser(testUser);
      const testUserSession = await orchestrator.createSession(activatedUser);

      const response = await fetch(`${webserver.origin}/api/v1/users/userA`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${testUserSession.token}`,
        },
        body: JSON.stringify({
          username: "userC",
        }),
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

    test("With duplicated `email`", async () => {
      await orchestrator.createUser({ email: "email1@teste.com" });

      const testUser = await orchestrator.createUser({ email: "email2@teste.com" });
      const activatedUser = await orchestrator.activateUser(testUser);
      const testUserSession = await orchestrator.createSession(activatedUser);

      const response = await fetch(`${webserver.origin}/api/v1/users/${testUser.username}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${testUserSession.token}`,
        },
        body: JSON.stringify({
          email: "email1@teste.com",
        }),
      });
      expect(response.status).toBe(400);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "O e-mail informado já está sendo utilizado.",
        action: "Utilize outro e-mail para realizar a operação.",
        status_code: 400,
      });
    });

    test("With unique `username`", async () => {
      const testUser = await orchestrator.createUser({ username: "uniqueUser1" });
      const activatedUser = await orchestrator.activateUser(testUser);
      const testUserSession = await orchestrator.createSession(activatedUser);

      const response = await fetch(`${webserver.origin}/api/v1/users/uniqueUser1`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${testUserSession.token}`,
        },
        body: JSON.stringify({
          username: "uniqueUser2",
        }),
      });
      expect(response.status).toBe(200);

      const responseBody = await response.json();

      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();

      expect(responseBody).toEqual({
        id: responseBody.id,
        username: "uniqueUser2",
        features: ["create:session", "read:session", "update:user"],
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });

      expect(responseBody.updated_at > responseBody.created_at).toBe(true);
    });

    test("With unique `email`", async () => {
      const testUser = await orchestrator.createUser({ email: "uniqueEmail1@teste.com" });
      const activatedUser = await orchestrator.activateUser(testUser);
      const testUserSession = await orchestrator.createSession(activatedUser);

      const response = await fetch(`${webserver.origin}/api/v1/users/${testUser.username}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${testUserSession.token}`,
        },
        body: JSON.stringify({
          email: "uniqueEmail2@teste.com",
        }),
      });
      expect(response.status).toBe(200);

      const responseBody = await response.json();

      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();

      expect(responseBody).toEqual({
        id: responseBody.id,
        username: testUser.username,
        features: ["create:session", "read:session", "update:user"],
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });

      expect(responseBody.updated_at > responseBody.created_at).toBe(true);

      const updatedUser = await user.findOneByUsername(testUser.username);
      expect(updatedUser.email).toBe("uniqueEmail2@teste.com");
    });

    test("With new `password`", async () => {
      const testUser = await orchestrator.createUser({ password: "password" });
      const activatedUser = await orchestrator.activateUser(testUser);
      const testUserSession = await orchestrator.createSession(activatedUser);

      const response = await fetch(`${webserver.origin}/api/v1/users/${testUser.username}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${testUserSession.token}`,
        },
        body: JSON.stringify({
          password: "passw0rd",
        }),
      });
      expect(response.status).toBe(200);

      const responseBody = await response.json();

      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();

      expect(responseBody).toEqual({
        id: responseBody.id,
        username: testUser.username,
        features: ["create:session", "read:session", "update:user"],
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });

      expect(responseBody.updated_at > responseBody.created_at).toBe(true);

      const userInDatabase = await user.findOneByUsername(testUser.username);
      const correctPasswordMatch = await password.compare("passw0rd", userInDatabase.password);
      expect(correctPasswordMatch).toBe(true);

      const incorrectPasswordMatch = await password.compare("password", userInDatabase.password);
      expect(incorrectPasswordMatch).toBe(false);
    });
  });

  describe("Privileged user", () => {
    test("With `update:user:others` targeting `defaultUser`", async () => {
      const defaultUser = await orchestrator.createUser({ username: "defaultUser" });

      const testUser = await orchestrator.createUser({ username: "privilegedUser" });
      const activatedUser = await orchestrator.activateUser(testUser);
      const testUserSession = await orchestrator.createSession(activatedUser);
      await orchestrator.addFeaturesToUser(testUser, ["update:user:others"]);

      const response = await fetch(`${webserver.origin}/api/v1/users/defaultUser`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${testUserSession.token}`,
        },
        body: JSON.stringify({
          username: "changedByPrivilegedUser",
        }),
      });
      expect(response.status).toBe(200);

      const responseBody = await response.json();

      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();

      expect(responseBody).toEqual({
        id: defaultUser.id,
        username: "changedByPrivilegedUser",
        features: defaultUser.features,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });

      expect(responseBody.updated_at > responseBody.created_at).toBe(true);
    });
  });
});
