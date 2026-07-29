import { createRouter } from "next-connect";

import controller from "infra/controller";
import database from "infra/database.js";
import authorization from "models/authorization";

const router = createRouter();

router.use(controller.injectAnonymousOrUser);
router.get(getHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  const updatedAt = new Date().toISOString();

  const queryServerVersion = await database.query("SHOW server_version;");
  const queryMaxConnections = await database.query("SHOW max_connections;");
  const queryOpenedConnections = await database.query({
    text: "SELECT COUNT(*)::int FROM pg_stat_activity WHERE datname = $1;",
    values: [process.env.POSTGRES_DB],
  });

  const serverVersion = queryServerVersion.rows[0].server_version;

  const maxConnections = parseInt(queryMaxConnections.rows[0].max_connections);
  const openedConnections = queryOpenedConnections.rows[0].count;

  const statusObject = {
    updated_at: updatedAt,
    dependencies: {
      database: {
        version: serverVersion,
        max_connections: maxConnections,
        opened_connections: openedConnections,
      },
    },
  };

  const secureOutputValues = authorization.filterOutput(request.context.user, "read:status", statusObject);

  return response.status(200).json(secureOutputValues);
}
