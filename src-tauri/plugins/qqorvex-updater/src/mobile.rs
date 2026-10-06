use serde::de::DeserializeOwned;
use tauri::{plugin::{PluginApi, PluginHandle}, AppHandle, Runtime};

use crate::models::*;

pub fn init<R: Runtime, C: DeserializeOwned>(
  _app: &AppHandle<R>,
  api: PluginApi<R, C>,
) -> crate::Result<QqorvexUpdater<R>> {
  #[cfg(target_os = "android")]
  let handle = api.register_android_plugin("tech.biocypher.qqorvex.updater", "QqorvexUpdaterPlugin")?;
  #[cfg(not(target_os = "android"))]
  return Err(crate::Error::UnsupportedPlatform);
  #[cfg(target_os = "android")]
  Ok(QqorvexUpdater(handle))
}

pub struct QqorvexUpdater<R: Runtime>(PluginHandle<R>);

impl<R: Runtime> QqorvexUpdater<R> {
  pub fn get_device_abi(&self) -> crate::Result<DeviceAbi> {
    self.0.run_mobile_plugin("getDeviceAbi", ()).map_err(Into::into)
  }

  pub fn download_update(&self, request: DownloadRequest) -> crate::Result<DownloadResult> {
    self.0.run_mobile_plugin("downloadUpdate", request).map_err(Into::into)
  }

  pub fn install_update(&self) -> crate::Result<InstallResult> {
    self.0.run_mobile_plugin("installUpdate", ()).map_err(Into::into)
  }
}
