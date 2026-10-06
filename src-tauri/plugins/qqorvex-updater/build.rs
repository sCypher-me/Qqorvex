fn main() {
  tauri_plugin::Builder::new(&["getDeviceAbi", "downloadUpdate", "installUpdate"])
    .android_path("android")
    .build();
}
