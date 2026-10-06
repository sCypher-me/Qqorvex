use tauri::{plugin::{Builder, TauriPlugin}, Manager, Runtime};

pub use models::*;

#[cfg(desktop)]
mod desktop;
#[cfg(mobile)]
mod mobile;
mod commands;
mod error;
mod models;

#[cfg(desktop)]
use desktop::QqorvexUpdater;
#[cfg(mobile)]
use mobile::QqorvexUpdater;

pub use error::{Error, Result};

pub trait QqorvexUpdaterExt<R: Runtime> {
  fn qqorvex_updater(&self) -> &QqorvexUpdater<R>;
}

impl<R: Runtime, T: Manager<R>> QqorvexUpdaterExt<R> for T {
  fn qqorvex_updater(&self) -> &QqorvexUpdater<R> {
    self.state::<QqorvexUpdater<R>>().inner()
  }
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
  Builder::new("qqorvex-updater")
    .invoke_handler(tauri::generate_handler![
      commands::get_device_abi,
      commands::download_update,
      commands::install_update
    ])
    .setup(|app, api| {
      #[cfg(mobile)]
      let updater = mobile::init(app, api)?;
      #[cfg(desktop)]
      let updater = desktop::init(app, api)?;
      app.manage(updater);
      Ok(())
    })
    .build()
}
