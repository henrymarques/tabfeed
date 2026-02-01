import migrationRunner from "node-pg-migrate";
import { resolve } from "node:path";

import database from "infra/database";

export default async function _(request, response) {
  const dbClient = await database.getNewClient();

  const defaultMigrationOptions = {
    dbClient,
    dryRun: true,
    dir: resolve("infra", "migrations"),
    direction: "up",
    verbose: false,
    migrationsTable: "pgmigrations",
  };

  if (request.method === "GET") {
    const pendingMigrations = await migrationRunner(defaultMigrationOptions);
    await dbClient.end();
    return response.status(200).json(pendingMigrations);
  }

  if (request.method === "POST") {
    const ranMigrations = await migrationRunner({
      ...defaultMigrationOptions,
      dryRun: false,
    });

    await dbClient.end();
    if (ranMigrations.length > 0)
      return response.status(201).json(ranMigrations);
    return response.status(200).json(ranMigrations);
  }

  return response.status(405).end();
}
