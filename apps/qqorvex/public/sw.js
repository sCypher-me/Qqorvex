// Service worker de notificações push. Só entrega o que a Edge Function `send-notifications`
// manda — nenhuma lógica de negócio aqui, só exibir a notificação recebida e abrir o app ao clicar.
self.addEventListener("push", (event) => {
  let payload = { title: "Qqorvex", body: "Você tem uma atualização." };
  try {
    if (event.data) payload = event.data.json();
  } catch {
    // payload não é JSON válido — usa o texto puro como corpo.
    payload.body = event.data?.text() ?? payload.body;
  }

  event.waitUntil(
    self.registration.showNotification(payload.title ?? "Qqorvex", {
      body: payload.body,
      icon: "/favicon.png",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      if (clients.length > 0) return clients[0].focus();
      return self.clients.openWindow("/");
    }),
  );
});
