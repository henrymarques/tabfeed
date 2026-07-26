import database from "infra/database";
import email from "infra/email";
import { NotFoundError } from "infra/errors";
import webserver from "infra/webserver";

const EXPIRATION_IN_MILLISECONDS = 60 * 15 * 1000;

async function createToken(userId) {
  const expiresAt = new Date(Date.now() + EXPIRATION_IN_MILLISECONDS);

  const newToken = await runInsertQuery(userId, expiresAt);
  return newToken;

  async function runInsertQuery(userId, expiresAt) {
    const results = await database.query({
      text: `
        INSERT INTO
          user_activation_tokens (user_id, expires_at)
        VALUES
          ($1, $2)
        RETURNING
          *
      ;`,
      values: [userId, expiresAt],
    });

    return results.rows[0];
  }
}

async function findOneValidById(activationId) {
  const tokenFound = await runSelectQuery(activationId);
  return tokenFound;

  async function runSelectQuery(activationId) {
    const results = await database.query({
      text: `
        SELECT
          *
        FROM
          user_activation_tokens
        WHERE
          id = $1
          AND expires_at > NOW()
          AND used_at IS NULL
        LIMIT
          1
      ;`,
      values: [activationId],
    });

    if (results.rowCount === 0) {
      throw new NotFoundError({
        message: "Token inválido ou expirado.",
        action: "Faça o cadastro novamente.",
      });
    }

    return results.rows[0];
  }
}

async function sendEmailToUser(user, activationToken) {
  const text = `${user.username}, clique no link abaixo para ativar sua conta:

${webserver.origin}/cadastro/ativar/${activationToken.id}

Atenciosamente,
Equipe Tabfeed`;

  await email.send({
    from: "Tabfeed <contato@tabfeed.com.br>",
    to: user.email,
    subject: "Ativação de conta",
    text,
  });
}

const activation = {
  createToken,
  findOneValidById,
  sendEmailToUser,
};

export default activation;
