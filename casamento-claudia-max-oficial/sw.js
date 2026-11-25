
"use strict";

// ==========================================
// SERVICE WORKER
// CASAMENTO CLAUDIA & MAX - V4.1
// ==========================================

const APP_NAME = "Cláudia & Max";

const ADMIN_URL = "/admin.html";

const APP_ICON = "/assets/icon-192.png";

// ==========================================
// INSTALACAO
// ==========================================

self.addEventListener("install", event => {

    event.waitUntil(self.skipWaiting());

});

// ==========================================
// ATIVACAO
// ==========================================

self.addEventListener("activate", event => {

    event.waitUntil(self.clients.claim());

});

// ==========================================
// RECEBER NOTIFICACOES PUSH
// ==========================================

self.addEventListener("push", event => {

    let payload = {};

    if (event.data) {

        try {

            payload = event.data.json() || {};

        } catch (error) {

            payload = {};

        }

    }

    // Mensagem generica para proteger
    // a privacidade dos convidados.

    const title = APP_NAME;

    const body =
        "Você recebeu uma nova resposta ao convite. " +
        "Acesse o painel para conferir.";

    const options = {

        body: body,

        icon: APP_ICON,

        tag: typeof payload.id === "string"
            ? "casamento-" + payload.id
            : "casamento-notificacao",

        renotify: false,

        vibrate: [200, 100, 200],

        timestamp: Date.now(),

        data: {
            url: ADMIN_URL
        }

    };

    event.waitUntil(

        self.registration.showNotification(
            title,
            options
        )

    );

});

// ==========================================
// ABRIR PAINEL AO TOCAR NA NOTIFICACAO
// ==========================================

self.addEventListener("notificationclick", event => {

    event.notification.close();

    event.waitUntil(

        (async () => {

            const target = new URL(
                ADMIN_URL,
                self.location.origin
            ).href;

            const windows = await self.clients.matchAll({

                type: "window",

                includeUncontrolled: true

            });

            for (const client of windows) {

                const url = new URL(client.url);

                if (
                    url.origin === self.location.origin &&
                    url.pathname === ADMIN_URL
                ) {

                    return client.focus();

                }

            }

            return self.clients.openWindow(target);

        })()

    );

});
