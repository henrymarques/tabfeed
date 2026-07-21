import database from "infra/database";
import { NotFoundError, ValidationError } from "infra/errors";
import password from "models/password";

async function create(userInputValues) {
  await validateUniqueEmail(userInputValues.email);
  await validateUniqueUsername(userInputValues.username);
  await hashPasswordInObject(userInputValues);

  const newUser = await runInsertQuery(userInputValues);
  return newUser;

  // #region funcoes
  async function validateUniqueEmail(email) {
    const results = await database.query({
      text: `
      SELECT
        email
      FROM
        users
      WHERE
        LOWER(email) = LOWER($1)
      ;`,
      values: [email],
    });

    if (results.rowCount > 0)
      throw new ValidationError({
        message: "O e-mail informado já está sendo utilizado",
        action: "Utilize outro e-mail para realizar o cadastro",
      });
  }

  async function validateUniqueUsername(username) {
    const results = await database.query({
      text: `
      SELECT
        username
      FROM
        users
      WHERE
        LOWER(username) = LOWER($1)
      ;`,
      values: [username],
    });

    if (results.rowCount > 0)
      throw new ValidationError({
        message: "O nome de usuário informado já está sendo utilizado",
        action: "Utilize outro nome de usuário para realizar o cadastro",
      });
  }

  async function hashPasswordInObject(userInputValues) {
    const hashedPassword = await password.hash(userInputValues.password);
    userInputValues.password = hashedPassword;
  }

  async function runInsertQuery(userInputValues) {
    const { username, email, password } = userInputValues;

    const results = await database.query({
      text: `
      INSERT INTO
        users (username, email, password)
      VALUES
        ($1, $2, $3)
      RETURNING
        *
      ;`,
      values: [username, email, password],
    });

    return results.rows[0];
  }
  // #endregion
}

async function findOneByUsername(username) {
  const userFound = await runSelectQuery(username);
  return userFound;

  async function runSelectQuery(username) {
    const results = await database.query({
      text: `
      SELECT
        *
      FROM
        users
      WHERE
        LOWER(username) = LOWER($1)
      LIMIT
        1
      ;`,
      values: [username],
    });

    if (results.rowCount === 0)
      throw new NotFoundError({
        message: "Usuário não encontrado",
        action: "Verifique sua consulta e tente novamente",
      });

    return results.rows[0];
  }
}

const user = {
  create,
  findOneByUsername,
};

export default user;
