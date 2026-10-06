package tech.biocypher.qqorvex.updater

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.FileProvider
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import java.io.BufferedInputStream
import java.io.BufferedOutputStream
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import java.util.Locale
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

@InvokeArg
class DownloadUpdateArgs {
  lateinit var url: String
  lateinit var sha256: String
}

@TauriPlugin
class QqorvexUpdaterPlugin(private val activity: Activity) : Plugin(activity) {
  private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
  private val apkName = "qqorvex-update.apk"

  @Command
  fun getDeviceAbi(invoke: Invoke) {
    val architecture = Build.SUPPORTED_ABIS.firstOrNull()?.lowercase(Locale.ROOT) ?: "unknown"
    val result = JSObject()
    result.put("architecture", architecture)
    invoke.resolve(result)
  }

  @Command
  fun downloadUpdate(invoke: Invoke) {
    val args = invoke.parseArgs(DownloadUpdateArgs::class.java)
    scope.launch {
      try {
        val sizeBytes = downloadAndVerify(args.url, args.sha256)
        val result = JSObject()
        result.put("sizeBytes", sizeBytes)
        invoke.resolve(result)
      } catch (error: Exception) {
        invoke.reject(error.message ?: "Não foi possível baixar a atualização.")
      }
    }
  }

  @Command
  fun installUpdate(invoke: Invoke) {
    try {
      val apk = File(activity.cacheDir, apkName)
      require(apk.isFile && apk.length() > 0L) { "Baixe e valide a atualização antes de instalar." }

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !activity.packageManager.canRequestPackageInstalls()) {
        val settings = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES)
          .setData(Uri.parse("package:${activity.packageName}"))
        activity.startActivity(settings)
        val result = JSObject()
        result.put("status", "permission_required")
        invoke.resolve(result)
        return
      }

      val apkUri = FileProvider.getUriForFile(activity, "${activity.packageName}.fileprovider", apk)
      val installIntent = Intent(Intent.ACTION_INSTALL_PACKAGE)
        .setDataAndType(apkUri, "application/vnd.android.package-archive")
        .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
      activity.startActivity(installIntent)
      val result = JSObject()
      result.put("status", "installer_opened")
      invoke.resolve(result)
    } catch (error: Exception) {
      invoke.reject(error.message ?: "O Android não conseguiu abrir o instalador.")
    }
  }

  private fun downloadAndVerify(rawUrl: String, rawSha256: String): Long {
    val expectedSha256 = rawSha256.trim().lowercase(Locale.ROOT)
    require(expectedSha256.matches(Regex("^[0-9a-f]{64}$"))) { "O hash SHA-256 da atualização é inválido." }

    var currentUrl = URL(rawUrl)
    var redirects = 0
    while (true) {
      require(isTrustedReleaseUrl(currentUrl)) { "A atualização veio de um endereço não autorizado." }
      val connection = (currentUrl.openConnection() as HttpURLConnection).apply {
        instanceFollowRedirects = false
        connectTimeout = 20_000
        readTimeout = 30_000
        useCaches = false
        setRequestProperty("Accept", "application/vnd.android.package-archive, application/octet-stream")
        setRequestProperty("User-Agent", "Qqorvex-Android-Updater")
      }

      try {
        val status = connection.responseCode
        if (status in 300..399) {
          require(redirects < 5) { "A atualização excedeu o limite de redirecionamentos." }
          val destination = connection.getHeaderField("Location") ?: error("Redirecionamento sem destino.")
          currentUrl = URL(currentUrl, destination)
          redirects += 1
          continue
        }
        require(status in 200..299) { "O servidor retornou HTTP $status ao baixar a atualização." }

        val maximumSize = 150L * 1024L * 1024L
        val declaredSize = connection.contentLengthLong
        require(declaredSize <= maximumSize) { "O arquivo de atualização excede o tamanho permitido." }
        val temporaryFile = File(activity.cacheDir, "$apkName.part")
        val digest = MessageDigest.getInstance("SHA-256")
        var totalBytes = 0L
        val buffer = ByteArray(64 * 1024)
        val prefix = ByteArray(4)
        var prefixCount = 0

        try {
          BufferedInputStream(connection.inputStream).use { input ->
            BufferedOutputStream(temporaryFile.outputStream()).use { output ->
              while (true) {
                val count = input.read(buffer)
                if (count < 0) break
                totalBytes += count
                require(totalBytes <= maximumSize) { "O arquivo de atualização excede o tamanho permitido." }
                if (prefixCount < prefix.size) {
                  val copied = minOf(prefix.size - prefixCount, count)
                  buffer.copyInto(prefix, prefixCount, 0, copied)
                  prefixCount += copied
                }
                digest.update(buffer, 0, count)
                output.write(buffer, 0, count)
              }
            }
          }

          require(totalBytes > 0L && (declaredSize < 0L || totalBytes == declaredSize)) { "O download da atualização foi interrompido." }
          require(prefixCount == prefix.size && prefix[0] == 0x50.toByte() && prefix[1] == 0x4b.toByte()) {
            "O arquivo recebido não parece ser um APK válido."
          }
          val actualSha256 = digest.digest().joinToString("") { byte -> "%02x".format(byte.toInt() and 0xff) }
          require(MessageDigest.isEqual(expectedSha256.toByteArray(), actualSha256.toByteArray())) {
            "A verificação de integridade da atualização falhou."
          }

          val finalFile = File(activity.cacheDir, apkName)
          if (finalFile.exists()) require(finalFile.delete()) { "Não foi possível substituir o download anterior." }
          require(temporaryFile.renameTo(finalFile)) { "Não foi possível preparar o APK para instalação." }
          return totalBytes
        } catch (error: Exception) {
          temporaryFile.delete()
          throw error
        }
      } finally {
        connection.disconnect()
      }
    }
  }

  private fun isTrustedReleaseUrl(url: URL): Boolean {
    if (url.protocol != "https") return false
    val host = url.host.lowercase(Locale.ROOT)
    return host == "github.com" ||
      host == "release-assets.githubusercontent.com" ||
      host == "objects.githubusercontent.com" ||
      host == "github-releases.githubusercontent.com"
  }
}
