import { NotFoundError, UnauthorizedError } from "infra/errors";

import password from "models/password";
import user from "models/user";

async function checkAndGetUser(userInputValues) {
  try {
    const storedUser = await user.findOneByEmail(userInputValues.email);
    await checkPassword(userInputValues.password, storedUser.password);

    return storedUser;
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof UnauthorizedError)
      throw new UnauthorizedError({
        message: "Dados de autenticação incorretos.",
        action: "Verifique os dados enviados e tente novamente.",
      });

    throw error;
  }

  async function checkPassword(providedPassword, storedPassword) {
    const passwordMatch = await password.compare(providedPassword, storedPassword);

    if (!passwordMatch) {
      throw new UnauthorizedError({
        message: "Senha incorreta.",
        action: "Verifique os dados enviados e tente novamente.",
      });
    }
  }
}

const authentication = {
  checkAndGetUser,
};

export default authentication;
