import orchestrator from "tests/orchestrator";

import email from "infra/email";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
});

describe("infra/email.js", () => {
  test("email.send", async () => {
    await orchestrator.deleteAllEmails();

    await email.send({
      from: "Tabfeed <contato@tabfeed.com.br",
      to: "teste@teste.com",
      subject: "Teste de assunto",
      text: "Teste de corpo",
    });

    await email.send({
      from: "Tabfeed <contato@tabfeed.com.br",
      to: "teste@teste.com",
      subject: "Último email enviado",
      text: "Corpo do último email",
    });

    const lastEmail = await orchestrator.getLastEmail();
    expect(lastEmail.sender).toBe("<contato@tabfeed.com.br>");
    expect(lastEmail.recipients[0]).toBe("<teste@teste.com>");
    expect(lastEmail.subject).toBe("Último email enviado");
    expect(lastEmail.text).toBe("Corpo do último email\r\n");
  });
});
