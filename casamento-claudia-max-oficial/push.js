
"use strict";

// ==========================================
// CASAMENTO CLAUDIA & MAX - V4.1
// NOTIFICACOES PUSH
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

        const rawData = window.atob(base64);

        return Uint8Array.from(
            rawData,
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

        if (isIOS()) return "iPhone / iPad";

        if (/Android/i.test(navigator.userAgent)) {
            return "Android";
        }

        if (/Windows/i.test(navigator.userAgent)) {
            return "Computador Windows";
        }

        if (/Macintosh/i.test(navigator.userAgent)) {
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
    // BANCO DE DADOS
    // ======================================

    function client() {

        if (!window.supabaseClient) {
            throw new Error(
                "Conexao com Supabase indisponivel."
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

        if (error) throw error;

        if (data && data.success === false) {

            throw new Error(
                data.error || "Operacao nao autorizada."
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
                "Notificacoes Push indisponiveis."
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
    // INTERFACE DO PAINEL
    // ======================================

    function createInterface() {

        const dashboard =
            document.getElementById("dashboardScreen");

        if (!dashboard) return;

        if (document.getElementById("pushSettings")) {
            return;
        }

        const section = document.createElement("section");

        section.id = "pushSettings";

        section.style.cssText = `
            background: #fffaf3;
            border: 1px solid #dfcbb7;
            border-radius: 16px;
            padding: 20px;
            margin: 20px 0;
            color: #382015;
        `;

        section.innerHTML = `
            <h2 style="margin:0 0 10px;font-size:20px;">
                Notificações no celular
            </h2>

            <p style="margin:0 0 14px;line-height:1.6;">
                Receba avisos de novas confirmações
                mesmo com o painel fechado.
            </p>

            <p id="pushStatus"
               role="status"
               aria-live="polite"
               style="font-size:14px;margin-bottom:15px;">
                Verificando dispositivo...
            </p>

            <div style="
                display:flex;
                flex-wrap:wrap;
                gap:10px;
            ">

                <button
                    type="button"
                    id="enablePushButton"
                    style="
                        background:#795034;
                        color:white;
                        border:0;
                        border-radius:10px;
                        padding:12px 18px;
                        cursor:pointer;
                    ">
                    Ativar notificações
                </button>

                <button
                    type="button"
                    id="disablePushButton"
                    style="
                        background:#eee3d6;
                        color:#382015;
                        border:0;
                        border-radius:10px;
                        padding:12px 18px;
                        cursor:pointer;
                    ">
                    Desativar notificações
                </button>

            </div>

            <p style="
                font-size:12px;
                margin:14px 0 0;
                line-height:1.5;
            ">
                No iPhone, adicione o painel à Tela
                de Início antes de ativar as notificações.
            </p>
        `;

        dashboard.prepend(section);

        document
            .getElementById("enablePushButton")
            .addEventListener("click", enablePush);

        document
            .getElementById("disablePushButton")
            .addEventListener("click", disablePush);

    }

    function setStatus(message, color = "#795034") {

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
    // VERIFICAR SITUACAO ATUAL
    // ======================================

    async function refreshStatus() {

        if (busy) return;

        if (isIOS() && !isStandalone()) {

            setStatus(
                "No iPhone, abra pelo aplicativo " +
                "adicionado à Tela de Início."
            );

            setButtons(false, false);
            return;

        }

        if (!supported()) {

            setStatus(
                "Este navegador não suporta notificações Push.",
                "#a33"
            );

            setButtons(false, false);
            return;

        }

        if (Notification.permission === "denied") {

            setStatus(
                "Permissão bloqueada. Verifique as " +
                "configurações de notificações do dispositivo.",
                "#a33"
            );

            setButtons(false, true);
            return;

        }

        try {

            await registerWorker();

            const subscription =
                await registration.pushManager.getSubscription();

            if (
                subscription &&
                Notification.permission === "granted"
            ) {

                setStatus(
                    "Inscrição local encontrada. " +
                    "Clique em Ativar para sincronizar com o servidor.",
                    "#795034"
                );

                setButtons(true, true);

            } else {

                setStatus(
                    "Notificações desativadas neste dispositivo."
                );

                setButtons(true, Boolean(subscription));

            }

        } catch {

            setStatus(
                "Não foi possível verificar as notificações.",
                "#a33"
            );

            setButtons(false, false);

        }

    }

    // ======================================
    // ATIVAR NOTIFICACOES
    // ======================================

    async function enablePush() {

        if (busy || !supported()) return;

        busy = true;
        setButtons(false, false);

        try {

            // Solicitar permissao diretamente
            // apos o clique do usuario.

            const permission =
                await Notification.requestPermission();

            if (permission !== "granted") {

                throw new Error(
                    "Permissão de notificações não concedida."
                );

            }

            await requireSession();

            await registerWorker();

            let subscription =
                await registration.pushManager.getSubscription();

            if (!subscription) {

                subscription =
                    await registration.pushManager.subscribe({

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
                "Notificações ativadas neste dispositivo!",
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

        try {

            await requireSession();

            await registerWorker();

            const subscription =
                await registration.pushManager.getSubscription();

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

            setButtons(true, true);

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

        const observer = new MutationObserver(() => {

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
