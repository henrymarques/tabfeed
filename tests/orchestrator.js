import { faker } from "@faker-js/faker";
import retry from "async-retry";

import database from "infra/database";
import webserver from "infra/webserver";
import activation from "models/activation";
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
      const response = await fetch(`${webserver.origin}/api/v1/status`);

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

async function activateUser(userObject) {
  return await activation.activateUserByUserId(userObject.id);
}

async function addFeaturesToUser(userObject, features) {
  return await user.addFeatures(userObject.id, features);
}

async function createSession(userObject) {
  return await session.create(userObject.id);
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

  if (!lastEmail) return null;

  const emailTextResponse = await fetch(`${emailHttpUrl}/messages/${lastEmail.id}.plain`);
  const emailText = await emailTextResponse.text();
  lastEmail.text = emailText;

  return lastEmail;
}

function extractUUID(text) {
  const match = text.match(/[a-fA-F0-9-]{36}/);
  return match ? match[0] : null;
}

const orchestrator = {
  activateUser,
  addFeaturesToUser,
  clearDatabase,
  createSession,
  createUser,
  deleteAllEmails,
  extractUUID,
  getLastEmail,
  runPendingMigrations,
  waitForAllServices,
};

export default orchestrator;
