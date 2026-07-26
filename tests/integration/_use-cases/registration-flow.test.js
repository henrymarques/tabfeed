import webserver from "infra/webserver";
import activation from "models/activation";
import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
  await orchestrator.deleteAllEmails();
});

describe("Use case: registration flow (all successful)", () => {
  let createdUser;

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
      email: "registration.flow@teste.com",
      features: ["read:activation_token"],
      password: responseBody.password,
      created_at: responseBody.created_at,
      updated_at: responseBody.updated_at,
    });
  });

  test("Receive activation email", async () => {
    const lastEmail = await orchestrator.getLastEmail();

    const activationTokenId = orchestrator.extractUUID(lastEmail.text);

    expect(lastEmail.sender).toBe("<contato@tabfeed.com.br>");
    expect(lastEmail.recipients[0]).toBe("<registration.flow@teste.com>");
    expect(lastEmail.subject).toBe("Ativação de conta");
    expect(lastEmail.text).toContain("RegistrationFlow");
    expect(lastEmail.text).toContain(`${webserver.origin}/cadastro/ativar/${activationTokenId}`);

    const activationTokenObject = await activation.findOneValidById(activationTokenId);
    expect(activationTokenObject.user_id).toBe(createdUser.id);
    expect(activationTokenObject.used_at).toBe(null);
  });

  test("Activate account", async () => {});

  test("Login", async () => {});

  test("Get user information", async () => {});
});
