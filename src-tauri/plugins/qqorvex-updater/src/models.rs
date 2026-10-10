use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceAbi {
  pub architecture: String,
  /// Rede atual é medida (dados móveis): o download automático espera uma rede sem franquia.
  #[serde(default)]
  pub metered: bool,
  /// O usuário já autorizou o app a instalar atualizações ("instalar apps desconhecidos").
  #[serde(default)]
  pub can_install: bool,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadRequest {
  pub url: String,
  pub sha256: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadResult {
  pub size_bytes: u64,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallResult {
  pub status: String,
}
