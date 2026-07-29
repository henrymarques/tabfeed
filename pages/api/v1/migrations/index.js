import { createRouter } from "next-connect";

import controller from "infra/controller";

import migrator from "models/migrator";
import authorization from "models/authorization";

const router = createRouter();

router.use(controller.injectAnonymousOrUser);
router.get(controller.canRequest("read:migrations"), getHandler);
router.post(controller.canRequest("create:migrations"), postHandler);

export default router.handler(controller.errorHandlers);

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
