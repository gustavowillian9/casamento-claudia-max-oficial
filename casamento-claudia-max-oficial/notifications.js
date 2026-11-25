
document.addEventListener("DOMContentLoaded", () => {

    "use strict";

    const db = window.supabaseClient;

    if (!db) return;

    const $ = id => document.getElementById(id);

    const dashboard = $("dashboardScreen");
    const logout = $("logoutButton");

    if (!dashboard || !logout) return;

    const CHECK_INTERVAL = 5000;

    let notifications = [];
    let knownIds = new Set();

    let initialized = false;
    let busy = false;
    let timer = null;
    let alertTimer = null;
    let generation = 0;

    let audioContext = null;
    let soundEnabled = false;

    // =====================================
    // CRIAR INTERFACE
    // =====================================

    const tools = document.createElement("div");

    tools.className = "notification-tools";

    const bell = document.createElement("button");

    bell.type = "button";
    bell.className = "notification-bell";
    bell.setAttribute("aria-label", "Notificações");
    bell.setAttribute("aria-expanded", "false");

    bell.innerHTML = `
        <svg viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
            stroke-linejoin="round">
            <path d="M18 8a6 6 0 0 0-12 0
                c0 7-3 7-3 9h18
                c0-2-3-2-3-9"/>
            <path d="M10 21h4"/>
        </svg>
        <span class="notification-badge"
            id="notificationBadge" hidden>0</span>
    `;

    logout.parentNode.insertBefore(tools, logout);

    tools.append(bell, logout);

    const center = document.createElement("section");

    center.className = "notification-center";
    center.hidden = true;

    center.setAttribute(
        "aria-label",
        "Central de notificações"
    );

    center.innerHTML = `
        <div class="notification-header">
            <h2>Notificações</h2>
            <button type="button"
                id="closeNotifications"
                class="notification-close"
                aria-label="Fechar">×</button>
        </div>

        <div class="notification-actions">

            <button type="button"
                id="readAllNotifications">
                Marcar todas como lidas
            </button>

            <button type="button"
                id="notificationSound">
                Ativar som
            </button>

        </div>

        <div id="notificationList"
            class="notification-list">
        </div>

        <div id="notificationStatus"
            class="notification-status">
            Aguardando conexão...
        </div>
    `;

    dashboard.appendChild(center);

    const alertBox = document.createElement("button");

    alertBox.type = "button";
    alertBox.className = "notification-alert";
    alertBox.hidden = true;

    dashboard.appendChild(alertBox);

    const badge = $("notificationBadge");
    const list = $("notificationList");
    const status = $("notificationStatus");

    // =====================================
    // NAVEGACAO
    // =====================================

    function setCenter(open) {

        center.hidden = !open;

        bell.setAttribute(
            "aria-expanded",
            String(open)
        );

    }

    bell.addEventListener("click", () => {

        setCenter(center.hidden);

        if (!center.hidden) {

            loadNotifications();

        }

    });

    $("closeNotifications").addEventListener(
        "click",
        () => setCenter(false)
    );

    document.addEventListener("keydown", event => {

        if (event.key === "Escape") {

            setCenter(false);

        }

    });

    alertBox.addEventListener("click", () => {

        alertBox.hidden = true;

        setCenter(true);

    });

    // =====================================
    // AVISO SONORO
    // =====================================

    async function playSound() {

        if (!soundEnabled || !audioContext) return;

        try {

            await audioContext.resume();

            if (audioContext.state !== "running") {
                return;
            }

            const start = audioContext.currentTime;

            [660, 880, 1046].forEach((frequency, i) => {

                const oscillator =
                    audioContext.createOscillator();

                const gain =
                    audioContext.createGain();

                const time = start + i * 0.15;

                oscillator.type = "sine";

                oscillator.frequency.value = frequency;

                gain.gain.setValueAtTime(0.0001, time);

                gain.gain.exponentialRampToValueAtTime(
                    0.12,
                    time + 0.02
                );

                gain.gain.exponentialRampToValueAtTime(
                    0.0001,
                    time + 0.22
                );

                oscillator.connect(gain);

                gain.connect(audioContext.destination);

                oscillator.start(time);

                oscillator.stop(time + 0.25);

            });

        } catch (error) {

            console.warn("Som indisponível.");

        }

    }

    $("notificationSound").addEventListener(
        "click",
        async () => {

            if (soundEnabled) {

                soundEnabled = false;

                $("notificationSound").textContent =
                    "Ativar som";

                return;

            }

            const Audio =
                window.AudioContext ||
                window.webkitAudioContext;

            if (!Audio) {

                status.textContent =
                    "Áudio indisponível neste navegador.";

                return;

            }

            try {

                if (!audioContext) {

                    audioContext = new Audio();

                }

                await audioContext.resume();

                soundEnabled = true;

                $("notificationSound").textContent =
                    "Desativar som";

                await playSound();

            } catch (error) {

                status.textContent =
                    "Não foi possível ativar o som.";

            }

        }
    );

    // =====================================
    // FORMATAR HORARIO
    // =====================================

    function formatDate(value) {

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return "";

        return new Intl.DateTimeFormat("pt-BR", {

            timeZone: "America/Cuiaba",
            dateStyle: "short",
            timeStyle: "short"

        }).format(date);

    }

    // =====================================
    // EXIBIR NOTIFICACOES
    // =====================================

    function renderNotifications() {

        list.replaceChildren();

        if (!notifications.length) {

            const empty = document.createElement("p");

            empty.className = "notification-empty";

            empty.textContent =
                "Nenhuma notificação recebida.";

            list.appendChild(empty);

            return;

        }

        notifications.forEach(notification => {

            const item = document.createElement("button");

            item.type = "button";

            item.className =
                "notification-item" +
                (notification.is_read ? "" : " unread");

            const title = document.createElement("strong");

            title.textContent = notification.title;

            const group = document.createElement("p");

            group.textContent = notification.group_name;

            const counts = document.createElement("div");

            counts.className = "notification-counts";

            const values = [

                [
                    notification.confirmed +
                    " confirmado(s)",
                    "present"
                ],

                [
                    notification.absent +
                    " ausente(s)",
                    "absent"
                ],

                [
                    notification.total_guests +
                    " vaga(s)",
                    ""
                ]

            ];

            values.forEach(([text, className]) => {

                const span = document.createElement("span");

                span.className = className;

                span.textContent = text;

                counts.appendChild(span);

            });

            const date = document.createElement("small");

            date.textContent =
                formatDate(notification.created_at) +
                " · " +
                (
                    notification.is_read
                        ? "Lida"
                        : "Não lida"
                );

            item.append(title, group, counts, date);

            item.addEventListener("click", () => {

                markAsRead(notification.id);

            });

            list.appendChild(item);

        });

    }

    function showAlert(notification, total) {

        alertBox.replaceChildren();

        const title = document.createElement("strong");

        title.textContent = total > 1

            ? total + " novas notificações"

            : notification.title;

        const message = document.createElement("p");

        message.textContent = notification.message;

        alertBox.append(title, message);

        alertBox.hidden = false;

        clearTimeout(alertTimer);

        alertTimer = setTimeout(() => {

            alertBox.hidden = true;

        }, 8000);

        playSound();

    }

    // =====================================
    // CONSULTAR SUPABASE
    // =====================================

    async function loadNotifications() {

        if (busy || dashboard.hidden) return;

        busy = true;

        const requestGeneration = generation;

        try {

            const { data, error } = await db.rpc(
                "admin_get_notifications"
            );

            if (requestGeneration !== generation) return;

            if (dashboard.hidden) return;

            if (error) throw error;

            if (!data || data.success !== true) {

                throw new Error("Resposta inválida.");

            }

            notifications = Array.isArray(data.notifications)

                ? data.notifications

                : [];

            const unread = Number(data.unread) || 0;

            badge.hidden = unread === 0;

            badge.textContent =
                unread > 99 ? "99+" : String(unread);

            bell.setAttribute(
                "aria-label",
                "Notificações: " + unread + " não lidas"
            );

            const newNotifications = initialized

                ? notifications.filter(item =>
                    !knownIds.has(item.id) &&
                    !item.is_read
                )

                : [];

            notifications.forEach(item => {

                knownIds.add(item.id);

            });

            initialized = true;

            renderNotifications();

            status.textContent =
                "Atualizado às " +
                new Date().toLocaleTimeString("pt-BR", {
                    timeZone: "America/Cuiaba"
                });

            if (newNotifications.length) {

                showAlert(
                    newNotifications[0],
                    newNotifications.length
                );

                // Atualiza o painel sem interromper
                // uma edição de convidados em andamento.

                const editing =
                    document.querySelector("dialog[open]");

                const refresh = $("refreshButton");

                if (refresh && !editing && !refresh.disabled) {

                    refresh.click();

                }

            }

        } catch (error) {

            if (requestGeneration === generation) {

                status.textContent =
                    "Falha na conexão. Tentando novamente...";

            }

        } finally {

            busy = false;

        }

    }

    // =====================================
    // MARCAR COMO LIDA
    // =====================================

    async function markAsRead(id) {

        if (busy || dashboard.hidden) return;

        busy = true;

        const requestGeneration = generation;

        try {

            const { data, error } = await db.rpc(
                "admin_read_notification",
                {
                    p_notification_id: id
                }
            );

            if (error) throw error;

            if (!data || data.success !== true) {

                throw new Error("Não foi possível marcar.");

            }

        } catch (error) {

            if (requestGeneration === generation) {

                status.textContent =
                    "Não foi possível marcar como lida.";

            }

            return;

        } finally {

            busy = false;

        }

        if (requestGeneration === generation) {

            await loadNotifications();

        }

    }

    $("readAllNotifications").addEventListener(
        "click",
        async () => {

            if (busy || dashboard.hidden) return;

            busy = true;

            const requestGeneration = generation;

            try {

                const { data, error } = await db.rpc(
                    "admin_read_all_notifications"
                );

                if (error) throw error;

                if (!data || data.success !== true) {

                    throw new Error("Falha ao atualizar.");

                }

            } catch (error) {

                if (requestGeneration === generation) {

                    status.textContent =
                        "Não foi possível atualizar as leituras.";

                }

                return;

            } finally {

                busy = false;

            }

            if (requestGeneration === generation) {

                await loadNotifications();

            }

        }
    );

    // =====================================
    // ATUALIZACAO AUTOMATICA
    // =====================================

    function startMonitoring() {

        if (timer !== null || dashboard.hidden) return;

        loadNotifications();

        timer = setInterval(
            loadNotifications,
            CHECK_INTERVAL
        );

    }

    function stopMonitoring() {

        generation++;

        clearInterval(timer);

        timer = null;

        initialized = false;

        knownIds.clear();

        notifications = [];

        badge.hidden = true;

        alertBox.hidden = true;

        clearTimeout(alertTimer);

        soundEnabled = false;

        $("notificationSound").textContent =
            "Ativar som";

        list.replaceChildren();

        setCenter(false);

    }

    const observer = new MutationObserver(() => {

        if (dashboard.hidden) {

            stopMonitoring();

        } else {

            startMonitoring();

        }

    });

    observer.observe(dashboard, {

        attributes: true,

        attributeFilter: ["hidden"]

    });

    db.auth.onAuthStateChange(event => {

        if (event === "SIGNED_OUT") {

            stopMonitoring();

        }

    });

    document.addEventListener(
        "visibilitychange",
        () => {

            if (!document.hidden && !dashboard.hidden) {

                loadNotifications();

            }

        }
    );

    startMonitoring();

});
