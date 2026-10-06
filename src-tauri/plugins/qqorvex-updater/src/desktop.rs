use serde::de::DeserializeOwned;
use tauri::{plugin::PluginApi, AppHandle, Runtime};

use crate::models::*;

pub fn init<R: Runtime, C: DeserializeOwned>(
  app: &AppHandle<R>,
  _api: PluginApi<R, C>,
) -> crate::Result<QqorvexUpdater<R>> {
  Ok(QqorvexUpdater(app.clone()))
}

pub struct QqorvexUpdater<R: Runtime>(AppHandle<R>);

impl<R: Runtime> QqorvexUpdater<R> {
  pub fn get_device_abi(&self) -> crate::Result<DeviceAbi> { Err(crate::Error::UnsupportedPlatform) }
  pub fn download_update(&self, _request: DownloadRequest) -> crate::Result<DownloadResult> { Err(crate::Error::UnsupportedPlatform) }
  pub fn install_update(&self) -> crate::Result<InstallResult> { Err(crate::Error::UnsupportedPlatform) }
}
