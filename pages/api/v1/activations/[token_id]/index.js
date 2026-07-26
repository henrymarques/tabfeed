import { createRouter } from "next-connect";

import controller from "infra/controller";
import activation from "models/activation";

const router = createRouter();

router.patch(patchHandler);

export default router.handler(controller.errorHandlers);

async function patchHandler(request, response) {
  const tokenId = request.query.token_id;

  const validToken = await activation.findOneValidById(tokenId);
  const usedToken = await activation.markTokenAsUsed(tokenId);
  await activation.activateUserByUserId(validToken.user_id);

  return response.status(200).json(usedToken);
}
