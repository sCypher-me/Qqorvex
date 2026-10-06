use tauri::{command, AppHandle, Runtime};

use crate::{models::*, QqorvexUpdaterExt, Result};

#[command]
pub(crate) async fn get_device_abi<R: Runtime>(app: AppHandle<R>) -> Result<DeviceAbi> {
  app.qqorvex_updater().get_device_abi()
}

#[command]
pub(crate) async fn download_update<R: Runtime>(
  app: AppHandle<R>,
  request: DownloadRequest,
) -> Result<DownloadResult> {
  app.qqorvex_updater().download_update(request)
}

#[command]
pub(crate) async fn install_update<R: Runtime>(app: AppHandle<R>) -> Result<InstallResult> {
  app.qqorvex_updater().install_update()
}
