import { createRouter } from "next-connect";

import controller from "infra/controller";
import { ForbiddenError } from "infra/errors";

import authentication from "models/authentication";
import session from "models/session";
import authorization from "models/authorization";

export default createRouter()
  .use(controller.injectAnonymousOrUser)
  .post(controller.canRequest("create:session"), postHandler)
  .delete(deleteHandler)
  .handler(controller.errorHandlers);

async function postHandler(request, response) {
  const userInputValues = request.body;

  const authenticatedUser = await authentication.getUser(userInputValues);
  if (!authorization.can(authenticatedUser, "create:session")) throw new ForbiddenError({});

  const newSession = await session.create(authenticatedUser.id);
  controller.setSessionCookie(newSession.token, response);

  const secureOutputValues = authorization.filterOutput(authenticatedUser, "read:session", newSession);

  return response.status(201).json(secureOutputValues);
}

async function deleteHandler(request, response) {
  const sessionToken = request.cookies.session_id;

  const sessionObject = await session.findOneValidByToken(sessionToken);
  const expiredSession = await session.expireById(sessionObject.id);
  controller.clearSessionCookie(response);

  const secureOutputValues = authorization.filterOutput(request.context.user, "read:session", expiredSession);

  return response.status(200).json(secureOutputValues);
}
