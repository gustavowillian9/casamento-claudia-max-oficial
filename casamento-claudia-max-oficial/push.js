
"use strict";

// ==========================================
// CASAMENTO CLAUDIA & MAX - V4.1.1
// SISTEMA DE NOTIFICACOES PUSH
// ==========================================

(() => {

    const VAPID_PUBLIC_KEY =
        "BKYu5HaU9g_5XbyLHL3MhRHoQ04khhYQLoXF4fC1A8em1VuTdKJMsABZKXooZtfVis0WO2CWgHKSumLTGcUsubE";

    let registration = null;
    let busy = false;

    // ======================================
    // CONVERTER CHAVE VAPID
    // ======================================

    function urlBase64ToUint8Array(base64String) {

        const padding = "=".repeat(
            (4 - base64String.length % 4) % 4
        );

        const base64 = (base64String + padding)
            .replace(/-/g, "+")
            .replace(/_/g, "/");

        return Uint8Array.from(
            window.atob(base64),
            char => char.charCodeAt(0)
        );

    }

    // ======================================
    // IDENTIFICAR DISPOSITIVO
    // ======================================

    function isIOS() {

        return /iPhone|iPad|iPod/i.test(
            navigator.userAgent
        ) || (
            navigator.platform === "MacIntel" &&
            navigator.maxTouchPoints > 1
        );

    }

    function isStandalone() {

        return window.matchMedia(
            "(display-mode: standalone)"
        ).matches || navigator.standalone === true;

    }

    function deviceName() {

        const ua = navigator.userAgent;

        if (isIOS()) return "iPhone / iPad";

        if (/Android/i.test(ua)) {
            return "Android";
        }

        if (/Edg\//i.test(ua)) {
            return "Microsoft Edge";
        }

        if (/Firefox/i.test(ua)) {
            return "Mozilla Firefox";
        }

        if (/Chrome/i.test(ua)) {
            return "Google Chrome";
        }

        if (/Windows/i.test(ua)) {
            return "Computador Windows";
        }

        if (/Macintosh/i.test(ua)) {
            return "Computador Mac";
        }

        return "Outro dispositivo";

    }

    function supported() {

        return (
            window.isSecureContext &&
            "serviceWorker" in navigator &&
            "PushManager" in window &&
            "Notification" in window
        );

    }

    // ======================================
    // CONEXAO COM SUPABASE
    // ======================================

    function client() {

        if (!window.supabaseClient) {

            throw new Error(
                "Conexão com Supabase indisponível."
            );

        }

        return window.supabaseClient;

    }

    async function requireSession() {

        const { data, error } =
            await client().auth.getSession();

        if (error || !data.session) {

            throw new Error(
                "Entre novamente no painel."
            );

        }

        return data.session;

    }

    async function rpc(name, params) {

        const { data, error } =
            await client().rpc(name, params);

        if (error) {

            throw new Error(
                error.message ||
                "Erro de comunicação com o servidor."
            );

        }

        if (data && data.success === false) {

            throw new Error(
                data.message ||
                data.error ||
                "Operação não autorizada."
            );

        }

        return data;

    }

    // ======================================
    // REGISTRAR SERVICE WORKER
    // ======================================

    async function registerWorker() {

        if (!supported()) {

            throw new Error(
                "Notificações Push indisponíveis."
            );

        }

        await navigator.serviceWorker.register(
            "/sw.js",
            { scope: "/" }
        );

        registration =
            await navigator.serviceWorker.ready;

        return registration;

    }

    // ======================================
    // ESTILO DA CENTRAL PUSH
    // ======================================

    function createStyles() {

        if (
            document.getElementById("pushStyles")
        ) return;

        const style = document.createElement("style");

        style.id = "pushStyles";

        style.textContent = `

            #pushSettings {

                background: #fffaf3;
                border: 1px solid #dfcbb7;
                border-radius: 16px;
                padding: 22px;
                margin: 20px 0;
                color: #382015;
                box-shadow: 0 4px 15px
                    rgba(56, 32, 21, 0.05);

            }

            .push-heading {

                display: flex;
                align-items: center;
                gap: 14px;
                margin-bottom: 12px;

            }

            .push-icon {

                width: 48px;
                height: 48px;
                flex-shrink: 0;
                border-radius: 14px;
                background: #eee3d6;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #795034;

            }

            .push-heading h2 {

                font-size: 19px;
                margin: 0 0 4px;
                color: #382015;

            }

            .push-description {

                margin: 0;
                color: #795034;
                font-size: 13px;
                line-height: 1.6;

            }

            #pushStatus {

                font-size: 13px;
                padding: 12px 14px;
                background: #f3eade;
                border-radius: 9px;
                margin: 15px 0;
                line-height: 1.5;
                overflow-wrap: anywhere;

            }

            .push-actions {

                display: flex;
                flex-wrap: wrap;
                gap: 10px;

            }

            .push-actions button {

                border: 0;
                border-radius: 10px;
                padding: 12px 18px;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                transition: opacity .2s;

            }

            #enablePushButton {

                background: #795034;
                color: white;

            }

            #disablePushButton {

                background: #eee3d6;
                color: #382015;

            }

            .push-actions button:disabled {

                opacity: .45;
                cursor: not-allowed;

            }

            .push-tip {

                font-size: 12px;
                margin: 15px 0 0;
                line-height: 1.6;
                color: #795034;

            }

            @media (max-width: 600px) {

                #pushSettings {

                    padding: 16px;

                }

                .push-heading h2 {

                    font-size: 17px;

                }

                .push-actions {

                    flex-direction: column;

                }

                .push-actions button {

                    width: 100%;

                }

            }

        `;

        document.head.appendChild(style);

    }

    // ======================================
    // INTERFACE
    // ======================================

    function createInterface() {

        const dashboard =
            document.getElementById("dashboardScreen");

        if (!dashboard) return;

        if (
            document.getElementById("pushSettings")
        ) return;

        createStyles();

        const section =
            document.createElement("section");

        section.id = "pushSettings";

        section.innerHTML = `

            <div class="push-heading">

                <div class="push-icon">

                    <svg
                        width="25"
                        height="25"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.7"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        aria-hidden="true">

                        <path d="M18 8a6 6 0 0 0-12 0
                            c0 7-3 7-3 9h18
                            c0-2-3-2-3-9"/>

                        <path d="M10 21h4"/>

                    </svg>

                </div>

                <div>

                    <h2>Notificações no celular</h2>

                    <p class="push-description">

                        Receba avisos de novas confirmações
                        mesmo com o painel fechado.

                    </p>

                </div>

            </div>

            <p id="pushStatus"
               role="status"
               aria-live="polite">

                Verificando dispositivo...

            </p>

            <div class="push-actions">

                <button
                    type="button"
                    id="enablePushButton"
                    disabled>

                    Ativar notificações

                </button>

                <button
                    type="button"
                    id="disablePushButton"
                    disabled>

                    Desativar notificações

                </button>

            </div>

            <p class="push-tip">

                No iPhone, adicione o painel à Tela de
                Início antes de ativar as notificações.

            </p>

        `;

        // Posicionar dentro do painel,
        // abaixo da mensagem de boas-vindas.

        const welcome =
            dashboard.querySelector(".welcome");

        const container =
            dashboard.querySelector("main.container");

        if (welcome) {

            welcome.insertAdjacentElement(
                "afterend",
                section
            );

        } else if (container) {

            container.prepend(section);

        } else {

            dashboard.appendChild(section);

        }

        document
            .getElementById("enablePushButton")
            .addEventListener("click", enablePush);

        document
            .getElementById("disablePushButton")
            .addEventListener("click", disablePush);

    }

    // ======================================
    // ATUALIZAR INTERFACE
    // ======================================

    function setStatus(
        message,
        color = "#795034"
    ) {

        const element =
            document.getElementById("pushStatus");

        if (!element) return;

        element.textContent = message;
        element.style.color = color;

    }

    function setButtons(enable, disable) {

        const on =
            document.getElementById("enablePushButton");

        const off =
            document.getElementById("disablePushButton");

        if (on) on.disabled = !enable;

        if (off) off.disabled = !disable;

    }

    // ======================================
    // VERIFICAR SITUACAO
    // ======================================

    async function refreshStatus() {

        if (busy) return;

        setButtons(false, false);

        if (isIOS() && !isStandalone()) {

            setStatus(
                "Adicione o painel à Tela de Início " +
                "do iPhone e abra pelo ícone do aplicativo."
            );

            return;

        }

        if (!supported()) {

            setStatus(
                "Este navegador não suporta notificações Push.",
                "#a33"
            );

            return;

        }

        try {

            await registerWorker();

            const subscription =
                await registration.pushManager
                    .getSubscription();

            if (Notification.permission === "denied") {

                setStatus(
                    "Permissão bloqueada. Verifique as " +
                    "configurações do navegador.",
                    "#a33"
                );

                setButtons(false, Boolean(subscription));

                return;

            }

            if (
                subscription &&
                Notification.permission === "granted"
            ) {

                setStatus(
                    "Inscrição encontrada em " +
                    deviceName() +
                    ". Clique em Ativar para sincronizar " +
                    "com o servidor."
                );

                setButtons(true, true);

            } else {

                setStatus(
                    "Notificações desativadas neste dispositivo."
                );

                setButtons(
                    true,
                    Boolean(subscription)
                );

            }

        } catch (error) {

            setStatus(
                error.message ||
                "Não foi possível verificar as notificações.",
                "#a33"
            );

            setButtons(true, false);

        }

    }

    // ======================================
    // ATIVAR NOTIFICACOES
    // ======================================

    async function enablePush() {

        if (busy || !supported()) return;

        busy = true;

        setButtons(false, false);

        setStatus(
            "Ativando notificações. Aguarde..."
        );

        try {

            const permission =
                await Notification.requestPermission();

            if (permission !== "granted") {

                throw new Error(
                    "Permissão de notificações não concedida."
                );

            }

            await requireSession();

            if (!registration) {

                await registerWorker();

            }

            let subscription =
                await registration.pushManager
                    .getSubscription();

            if (!subscription) {

                subscription =
                    await registration.pushManager
                        .subscribe({

                            userVisibleOnly: true,

                            applicationServerKey:
                                urlBase64ToUint8Array(
                                    VAPID_PUBLIC_KEY
                                )

                        });

            }

            const json = subscription.toJSON();

            if (
                !json.endpoint ||
                !json.keys?.p256dh ||
                !json.keys?.auth
            ) {

                throw new Error(
                    "Inscrição Push inválida."
                );

            }

            await rpc("admin_register_push", {

                p_endpoint: json.endpoint,

                p_p256dh: json.keys.p256dh,

                p_auth_key: json.keys.auth,

                p_device_name: deviceName()

            });

            setStatus(
                "Notificações ativadas neste dispositivo! " +
                "(" + deviceName() + ")",
                "#237a43"
            );

            setButtons(true, true);

        } catch (error) {

            setStatus(
                error.message ||
                "Não foi possível ativar as notificações.",
                "#a33"
            );

            setButtons(
                Notification.permission !== "denied",
                true
            );

        } finally {

            busy = false;

        }

    }

    // ======================================
    // DESATIVAR NOTIFICACOES
    // ======================================

    async function disablePush() {

        if (busy || !supported()) return;

        busy = true;

        setButtons(false, false);

        setStatus(
            "Desativando notificações..."
        );

        try {

            await requireSession();

            if (!registration) {

                await registerWorker();

            }

            const subscription =
                await registration.pushManager
                    .getSubscription();

            if (subscription) {

                await rpc("admin_disable_push", {

                    p_endpoint: subscription.endpoint

                });

                const removed =
                    await subscription.unsubscribe();

                if (!removed) {

                    throw new Error(
                        "Inscrição desativada no servidor, " +
                        "mas não removida do navegador."
                    );

                }

            }

            setStatus(
                "Notificações desativadas neste dispositivo."
            );

            setButtons(
                Notification.permission !== "denied",
                false
            );

        } catch (error) {

            setStatus(
                error.message ||
                "Não foi possível desativar as notificações.",
                "#a33"
            );

            setButtons(
                Notification.permission !== "denied",
                true
            );

        } finally {

            busy = false;

        }

    }

    // ======================================
    // INICIALIZACAO
    // ======================================

    function initialize() {

        const dashboard =
            document.getElementById("dashboardScreen");

        if (!dashboard) return;

        createInterface();

        const observer =
            new MutationObserver(() => {

                if (!dashboard.hidden) {

                    refreshStatus();

                }

            });

        observer.observe(dashboard, {

            attributes: true,

            attributeFilter: ["hidden"]

        });

        if (!dashboard.hidden) {

            refreshStatus();

        }

    }

    if (document.readyState === "loading") {

        document.addEventListener(
            "DOMContentLoaded",
            initialize
        );

    } else {

        initialize();

    }

})();
