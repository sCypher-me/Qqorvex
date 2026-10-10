// Service worker de notificações push. Só entrega o que a Edge Function `send-notifications`
// manda — nenhuma lógica de negócio aqui, só exibir a notificação recebida e abrir o app ao clicar
// (no endereço que o aviso indicar, ex.: a Agenda num conflito, o plano do dia num prazo em risco).
self.addEventListener("push", (event) => {
  let payload = { title: "Qqorvex", body: "Você tem uma atualização." };
  try {
    if (event.data) payload = event.data.json();
  } catch {
    // payload não é JSON válido — usa o texto puro como corpo.
    payload.body = event.data?.text() ?? payload.body;
  }

  // Só caminhos do próprio app (começam com "/"); qualquer outra coisa abre a tela inicial.
  const url = typeof payload.url === "string" && payload.url.startsWith("/") && !payload.url.startsWith("//") ? payload.url : "/";
  event.waitUntil(
    self.registration.showNotification(payload.title ?? "Qqorvex", {
      body: payload.body,
      icon: "/qqorvex-icon.png",
      data: { url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clients) => {
      const client = clients[0];
      if (!client) return self.clients.openWindow(url);
      await client.focus();
      // Aba aberta: leva até o item do aviso. Se o navegador não deixar navegar, abre outra aba.
      if (url !== "/" && "navigate" in client) {
        try {
          await client.navigate(url);
        } catch {
          await self.clients.openWindow(url);
        }
      }
    }),
  );
});
