import webserver from "infra/webserver";
import activation from "models/activation";
import user from "models/user";
import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
  await orchestrator.deleteAllEmails();
});

describe("Use case: registration flow (all successful)", () => {
  let createdUser;
  let activationTokenId;
  let sessionObject;

  test("Create user account", async () => {
    const response = await fetch("http://localhost:3000/api/v1/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: "RegistrationFlow",
        email: "registration.flow@teste.com",
        password: "senha123",
      }),
    });
    expect(response.status).toBe(201);

    const responseBody = await response.json();
    createdUser = { ...responseBody };

    expect(responseBody).toEqual({
      id: responseBody.id,
      username: "RegistrationFlow",
      features: ["read:activation_token"],
      created_at: responseBody.created_at,
      updated_at: responseBody.updated_at,
    });
  });

  test("Receive activation email", async () => {
    const lastEmail = await orchestrator.getLastEmail();

    activationTokenId = orchestrator.extractUUID(lastEmail.text);

    expect(lastEmail.sender).toBe("<contato@tabfeed.com.br>");
    expect(lastEmail.recipients[0]).toBe("<registration.flow@teste.com>");
    expect(lastEmail.subject).toBe("Ativação de conta");
    expect(lastEmail.text).toContain("RegistrationFlow");
    expect(lastEmail.text).toContain(`${webserver.origin}/cadastro/ativar/${activationTokenId}`);

    const activationTokenObject = await activation.findOneValidById(activationTokenId);
    expect(activationTokenObject.user_id).toBe(createdUser.id);
    expect(activationTokenObject.used_at).toBe(null);
  });

  test("Activate account", async () => {
    const response = await fetch(`http://localhost:3000/api/v1/activations/${activationTokenId}`, {
      method: "PATCH",
    });
    expect(response.status).toBe(200);

    const responseBody = await response.json();
    expect(Date.parse(responseBody.used_at)).not.toBeNaN();

    const activatedUser = await user.findOneByUsername("RegistrationFlow");

    expect(activatedUser.features).toEqual(["create:session", "read:session", "update:user"]);
  });

  test("Login", async () => {
    const response = await fetch("http://localhost:3000/api/v1/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "registration.flow@teste.com", password: "senha123" }),
    });
    expect(response.status).toBe(201);

    const responseBody = await response.json();
    sessionObject = { ...responseBody };
    expect(responseBody.user_id).toBe(createdUser.id);

    const response2 = await fetch(`http://localhost:3000/api/v1/activations/${activationTokenId}`, {
      method: "PATCH",
      headers: { cookie: `session_id=${sessionObject.token}` },
    });
    expect(response2.status).toBe(403);
  });

  test("Get user information", async () => {
    const response = await fetch("http://localhost:3000/api/v1/whoami", {
      headers: { cookie: `session_id=${sessionObject.token}` },
    });

    expect(response.status).toBe(200);

    const responseBody = await response.json();
    expect(responseBody.id).toBe(createdUser.id);
  });
});
