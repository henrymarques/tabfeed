import database from "infra/database.js";

async function status(request, response) {
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

  response.status(200).json({
    updated_at: updatedAt,
    dependencies: {
      database: {
        version: serverVersion,
        max_connections: maxConnections,
        opened_connections: openedConnections,
      },
    },
  });
}

export default status;
