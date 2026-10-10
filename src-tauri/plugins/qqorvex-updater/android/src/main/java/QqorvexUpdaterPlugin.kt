package tech.biocypher.qqorvex.updater

import android.app.Activity
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInstaller
import android.content.pm.PackageManager
import android.net.ConnectivityManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.webkit.WebView
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
import java.util.concurrent.ConcurrentHashMap
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

@InvokeArg
class DownloadUpdateArgs {
  lateinit var url: String
  lateinit var sha256: String
}

private const val APK_NAME = "qqorvex-update.apk"
private const val ACTION_INSTALL_STATUS = "tech.biocypher.qqorvex.updater.INSTALL_STATUS"

/**
 * Recebe o resultado da sessão do PackageInstaller. Numa atualização silenciosa bem-sucedida o
 * processo é substituído antes deste retorno; os demais casos respondem à chamada pendente do JS.
 */
class InstallResultReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val sessionId = intent.getIntExtra(PackageInstaller.EXTRA_SESSION_ID, -1)
    val invoke = QqorvexUpdaterPlugin.pendingInstalls.remove(sessionId)
    val status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE)
    val result = JSObject()

    when (status) {
      PackageInstaller.STATUS_PENDING_USER_ACTION -> {
        // O Android exigiu confirmação. Só dá para abrir a tela com o app em primeiro plano;
        // em segundo plano a abertura é bloqueada e o JS oferece "Instalar" ao voltar.
        @Suppress("DEPRECATION")
        val confirm = intent.getParcelableExtra<Intent>(Intent.EXTRA_INTENT)
        val opened = confirm != null && QqorvexUpdaterPlugin.foreground && runCatching {
          context.startActivity(confirm.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        }.isSuccess
        result.put("status", if (opened) "installer_opened" else "user_action_required")
        invoke?.resolve(result)
      }
      PackageInstaller.STATUS_SUCCESS -> {
        result.put("status", "installed")
        invoke?.resolve(result)
      }
      else -> {
        val message = intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE)
        invoke?.reject(message?.let { "O Android recusou a atualização: $it" } ?: "O Android não concluiu a atualização.")
      }
    }
  }
}

@TauriPlugin
class QqorvexUpdaterPlugin(private val activity: Activity) : Plugin(activity) {
  companion object {
    internal val pendingInstalls = ConcurrentHashMap<Int, Invoke>()
    @Volatile internal var foreground = true
  }

  private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

  override fun load(webView: WebView) {
    super.load(webView)
    scope.launch { removeInstalledApk() }
  }

  override fun onResume() {
    foreground = true
  }

  override fun onPause() {
    foreground = false
  }

  @Command
  fun getDeviceAbi(invoke: Invoke) {
    val architecture = Build.SUPPORTED_ABIS.firstOrNull()?.lowercase(Locale.ROOT) ?: "unknown"
    val connectivity = activity.getSystemService(ConnectivityManager::class.java)
    val result = JSObject()
    result.put("architecture", architecture)
    // Rede medida (dados móveis, roteador do celular): o download automático espera o Wi-Fi.
    result.put("metered", runCatching { connectivity?.isActiveNetworkMetered }.getOrNull() ?: true)
    // Sem a autorização "instalar apps desconhecidos" a instalação automática não é tentada: abrir
    // as configurações do Android com o app em segundo plano seria intrusivo (e o sistema bloqueia).
    result.put("canInstall", activity.packageManager.canRequestPackageInstalls())
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
      val apk = File(activity.cacheDir, APK_NAME)
      require(apk.isFile && apk.length() > 0L) { "Baixe e valide a atualização antes de instalar." }

      if (!activity.packageManager.canRequestPackageInstalls()) {
        val settings = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES)
          .setData(Uri.parse("package:${activity.packageName}"))
        activity.startActivity(settings)
        val result = JSObject()
        result.put("status", "permission_required")
        invoke.resolve(result)
        return
      }

      scope.launch {
        try {
          commitInstallSession(apk, invoke)
        } catch (error: Exception) {
          invoke.reject(error.message ?: "O Android não conseguiu iniciar a atualização.")
        }
      }
    } catch (error: Exception) {
      invoke.reject(error.message ?: "O Android não conseguiu iniciar a atualização.")
    }
  }

  /**
   * Instala pelo PackageInstaller pedindo que o Android dispense a confirmação. Desde o Android 12
   * um app que atualiza a si mesmo, com permissão de instalar apps, pode ser atualizado sem tela de
   * confirmação; se o sistema ainda exigir, o receiver abre a confirmação.
   */
  private fun commitInstallSession(apk: File, invoke: Invoke) {
    val installer = activity.packageManager.packageInstaller
    val params = PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL).apply {
      setAppPackageName(activity.packageName)
      setInstallReason(PackageManager.INSTALL_REASON_USER)
      setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED)
      setPackageSource(PackageInstaller.PACKAGE_SOURCE_DOWNLOADED_FILE)
      setSize(apk.length())
    }
    val sessionId = installer.createSession(params)
    try {
      installer.openSession(sessionId).use { session ->
        session.openWrite("qqorvex.apk", 0, apk.length()).use { output ->
          apk.inputStream().use { input -> input.copyTo(output, 64 * 1024) }
          session.fsync(output)
        }
        val callback = Intent(ACTION_INSTALL_STATUS)
          .setClass(activity, InstallResultReceiver::class.java)
          .setPackage(activity.packageName)
        val pendingIntent = PendingIntent.getBroadcast(
          activity,
          sessionId,
          callback,
          PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE,
        )
        pendingInstalls[sessionId] = invoke
        session.commit(pendingIntent.intentSender)
      }
    } catch (error: Exception) {
      pendingInstalls.remove(sessionId)
      runCatching { installer.abandonSession(sessionId) }
      throw error
    }
  }

  /** Depois de atualizado, o APK baixado não serve mais: apaga se não for mais novo que o instalado. */
  private fun removeInstalledApk() {
    val apk = File(activity.cacheDir, APK_NAME)
    if (!apk.isFile) return
    val manager = activity.packageManager
    val downloaded = manager.getPackageArchiveInfo(apk.absolutePath, 0)?.longVersionCode
    val installed = runCatching { manager.getPackageInfo(activity.packageName, 0).longVersionCode }.getOrNull()
    if (downloaded == null || (installed != null && downloaded <= installed)) apk.delete()
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
        val temporaryFile = File(activity.cacheDir, "$APK_NAME.part")
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

          val finalFile = File(activity.cacheDir, APK_NAME)
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
