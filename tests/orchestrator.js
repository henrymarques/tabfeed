import { faker } from "@faker-js/faker";
import retry from "async-retry";

import database from "infra/database";
import migrator from "models/migrator";
import session from "models/session";
import user from "models/user";

const emailHttpUrl = `http://${process.env.MAIL_HTTP_HOST}:${process.env.MAIL_HTTP_PORT}`;

async function waitForAllServices() {
  await waitForWebServer();
  await waitForEmailServer();

  async function waitForWebServer() {
    return retry(fetchStatusPage, { retries: 100, maxTimeout: 1000 });

    async function fetchStatusPage() {
      const response = await fetch("http://localhost:3000/api/v1/status");

      if (response.status !== 200) throw Error();
    }
  }

  async function waitForEmailServer() {
    return retry(fetchEmailPage, { retries: 100, maxTimeout: 1000 });

    async function fetchEmailPage() {
      const response = await fetch(`${emailHttpUrl}`);

      if (response.status !== 200) throw Error();
    }
  }
}

async function clearDatabase() {
  await database.query("drop schema public cascade; create schema public;");
}

async function runPendingMigrations() {
  await migrator.runPendingMigrations();
}

async function createUser(userObject) {
  return await user.create({
    username: userObject?.username || faker.internet.username().replace(/[_.-]/g, ""),
    email: userObject?.email || faker.internet.email(),
    password: userObject?.password || "password",
  });
}

async function createSession(userId) {
  return await session.create(userId);
}

async function deleteAllEmails() {
  await fetch(`${emailHttpUrl}/messages`, {
    method: "DELETE",
  });
}

async function getLastEmail() {
  const emailListResponse = await fetch(`${emailHttpUrl}/messages`);

  const emailList = await emailListResponse.json();
  const lastEmail = emailList.pop();

  const emailTextResponse = await fetch(`${emailHttpUrl}/messages/${lastEmail.id}.plain`);
  const emailText = await emailTextResponse.text();
  lastEmail.text = emailText;

  return lastEmail;
}

const orchestrator = {
  clearDatabase,
  createSession,
  createUser,
  deleteAllEmails,
  getLastEmail,
  runPendingMigrations,
  waitForAllServices,
};

export default orchestrator;
