import { createRouter } from "next-connect";

import controller from "infra/controller";
import activation from "models/activation";
import authorization from "models/authorization";

export default createRouter()
  .use(controller.injectAnonymousOrUser)
  .patch(controller.canRequest("read:activation_token"), patchHandler)
  .handler(controller.errorHandlers);

async function patchHandler(request, response) {
  const tokenId = request.query.token_id;

  const validToken = await activation.findOneValidById(tokenId);
  await activation.activateUserByUserId(validToken.user_id);
  const usedToken = await activation.markTokenAsUsed(tokenId);

  const secureOutputValues = authorization.filterOutput(request.context.user, "read:activation_token", usedToken);

  return response.status(200).json(secureOutputValues);
}
