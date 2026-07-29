import { createRouter } from "next-connect";

import controller from "infra/controller";

import migrator from "models/migrator";
import authorization from "models/authorization";

export default createRouter()
  .use(controller.injectAnonymousOrUser)
  .get(controller.canRequest("read:migrations"), getHandler)
  .post(controller.canRequest("create:migrations"), postHandler)
  .handler(controller.errorHandlers);

async function getHandler(request, response) {
  const pendingMigrations = await migrator.listPendingMigrations();

  const secureOutputValues = authorization.filterOutput(request.context.user, "read:migrations", pendingMigrations);
  return response.status(200).json(secureOutputValues);
}

async function postHandler(request, response) {
  const ranMigrations = await migrator.runPendingMigrations();

  const secureOutputValues = authorization.filterOutput(request.context.user, "read:migrations", ranMigrations);

  if (ranMigrations.length > 0) return response.status(201).json(secureOutputValues);
  return response.status(200).json(secureOutputValues);
}
