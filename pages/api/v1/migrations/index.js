import { resolve } from "node:path";

import { createRouter } from "next-connect";
import migrationRunner from "node-pg-migrate";

import controller from "infra/controller";
import database from "infra/database";

const router = createRouter();

router.get(getHandler);
router.post(postHandler);

export default router.handler(controller.errorHandlers);

const defaultMigrationOptions = {
  dryRun: true,
  dir: resolve("infra", "migrations"),
  direction: "up",
  verbose: false,
  migrationsTable: "pgmigrations",
};

async function getHandler(request, response) {
  let dbClient;
  try {
    dbClient = await database.getNewClient();

    const pendingMigrations = await migrationRunner({ ...defaultMigrationOptions, dbClient });
    return response.status(200).json(pendingMigrations);
  } finally {
    await dbClient.end();
  }
}

async function postHandler(request, response) {
  let dbClient;
  try {
    dbClient = await database.getNewClient();

    const ranMigrations = await migrationRunner({
      ...defaultMigrationOptions,
      dryRun: false,
      dbClient,
    });

    if (ranMigrations.length > 0) return response.status(201).json(ranMigrations);

    return response.status(200).json(ranMigrations);
  } finally {
    await dbClient.end();
  }
}
