// ══════════════════════════════════════
//  SERVICE WORKER — DnD App
//  Preparado para integración móvil
//  Actualmente: maneja notificaciones push del browser
//  Próximo paso: integrar con equipo mobile para Web Push API completo
// ══════════════════════════════════════

const CACHE_NAME = "dnd-app-v1";

// ── Instalar SW ──
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

// ── Activar SW ──
self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

// ── Push notifications (para cuando el equipo mobile integre el servidor push) ──
self.addEventListener("push", (event) => {
  let data = { title: "DnD App", body: "Tenés una notificación" };

  try {
    data = event.data.json();
  } catch {
    data.body = event.data?.text() || data.body;
  }

  const options = {
    body: data.body,
    icon: "/dice-icon.png",
    badge: "/dice-icon.png",
    vibrate: [200, 100, 200],   // patrón de vibración móvil
    tag: data.tag || "dnd-notification",  // agrupa notificaciones del mismo tipo
    renotify: true,
    data: {
      url: data.url || "/",
      tableId: data.tableId || null,
    },
    actions: data.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// ── Click en notificación → abrir la app en la mesa correcta ──
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Si ya hay una ventana abierta, enfocarla
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && "focus" in client) {
          return client.focus();
        }
      }
      // Si no, abrir nueva
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// ══════════════════════════════════════
//  NOTAS PARA EL EQUIPO MOBILE
// ══════════════════════════════════════
//
//  Para activar Web Push completo:
//
//  1. Registrar este SW en main.jsx:
//     navigator.serviceWorker.register('/sw.js')
//
//  2. Solicitar permiso y suscribir al usuario:
//     const sub = await reg.pushManager.subscribe({
//       userVisibleOnly: true,
//       applicationServerKey: VAPID_PUBLIC_KEY  // generar con web-push
//     })
//
//  3. Enviar `sub` al backend para guardarla por user_id
//
//  4. Desde el backend, al cambiar turno o iniciar combate:
//     webpush.sendNotification(subscription, JSON.stringify({
//       title: "¡Es tu turno!",
//       body: "Ronda 3 — DnD App",
//       tag: "turno",
//       tableId: 42
//     }))
//
//  5. Instalar en backend: npm install web-push
//     Generar claves VAPID: npx web-push generate-vapid-keys
//
// ══════════════════════════════════════
