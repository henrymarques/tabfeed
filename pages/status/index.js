import useSWR from "swr";

async function fetchAPI(key) {
  const response = await fetch(key);
  const responseBody = await response.json();

  return responseBody;
}

export default function StatusPage() {
  return (
    <>
      <h1>Status</h1>
      <UpdatedAt />
      <DatabaseStatus />
    </>
  );
}

function DatabaseStatus() {
  const { isLoading, data } = useSWR("/api/v1/status", fetchAPI, { refreshInterval: 5000 });

  let maxConnections = "-";
  let openedConnections = "-";
  let version = "Carregando";

  if (!isLoading && data) {
    maxConnections = data.dependencies.database.max_connections;
    openedConnections = data.dependencies.database.opened_connections;
    version = data.dependencies.database.version;
  }

  return (
    <div>
      <h2>Banco de dados</h2>
      <div>
        Conexões: {openedConnections} / {maxConnections}
      </div>
      <div>Versão: {version}</div>
    </div>
  );
}

function UpdatedAt() {
  const { isLoading, data } = useSWR("/api/v1/status", fetchAPI, { refreshInterval: 5000 });

  let updatedAtText = "Carregando";

  if (!isLoading && data) {
    updatedAtText = new Date(data.updated_at).toLocaleString("pt-BR");
  }

  return (
    <div>
      <p>Última atualização: {updatedAtText}</p>
    </div>
  );
}
