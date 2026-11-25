
/* =========================================
   CLAUDIA & MAX - CONVITE SEGURO V4.3
   Desenvolvido por GUSTAVO WILLIAN
========================================= */

document.documentElement.classList.add(
    "invitation-locked"
);

document.addEventListener("DOMContentLoaded", () => {

    "use strict";

    const $ = id => document.getElementById(id);

    const db = window.supabaseClient;

    const params = new URLSearchParams(
        window.location.search
    );

    const code = params.get("convite");

    const validUUID =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    // =====================================
    // CONTATOS DOS NOIVOS
    // =====================================

    const CONTACTS = {

        bride: {
            name: "Cláudia",
            phone: "556599364947",
            display: "(65) 9936-4947"
        },

        groom: {
            name: "Max",
            phone: "556596395129",
            display: "(65) 9639-5129"
        }

    };

    let busy = false;
    let accessGranted = false;
    let lastStatus = "loading";
    let requestVersion = 0;

    const CHECK_INTERVAL = 15000;

    // =====================================
    // ICONES
    // =====================================

    const lockIcon = `
        <svg viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true">

            <rect x="5" y="10"
                width="14" height="11" rx="2"/>

            <path d="M8 10V6a4 4 0 0 1 8 0v4"/>

            <path d="M12 14v3"/>

        </svg>
    `;

    const messageIcon = `
        <svg viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true">

            <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5
                9 9 0 0 1-4-.9L3 21l1.9-5.5
                a9 9 0 0 1-.9-4A8.5 8.5
                0 0 1 12.5 3h.5a8.5 8.5
                0 0 1 8 8v.5Z"/>

        </svg>
    `;

    const connectionIcon = `
        <svg viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            aria-hidden="true">

            <path d="M3 9a15 15 0 0 1 18 0"/>
            <path d="M6 13a10 10 0 0 1 12 0"/>
            <path d="M9 17a5 5 0 0 1 6 0"/>
            <circle cx="12" cy="21" r=".7"/>

        </svg>
    `;

    const successIcon = `
        <svg viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true">

            <circle cx="12" cy="12" r="9"/>
            <path d="m8 12 3 3 5-6"/>

        </svg>
    `;

    // =====================================
    // CRIAR TELA DE SEGURANCA
    // =====================================

    function createGate() {

        if ($("invitationSecurityGate")) return;

        const gate = document.createElement("section");

        gate.id = "invitationSecurityGate";

        gate.setAttribute(
            "aria-labelledby",
            "invitationSecurityTitle"
        );

        gate.innerHTML = `

            <div class="invitation-security-card">

                <div class="invitation-security-ornament">
                    ✧ ─── ♡ ─── ✧
                </div>

                <div class="invitation-security-monogram">
                    C &amp; M
                </div>

                <div class="invitation-security-brand">
                    Cláudia &amp; Max
                </div>

                <div id="invitationSecurityLoader"
                    class="invitation-security-loader">
                </div>

                <div id="invitationSecurityIcon"
                    class="invitation-security-icon"
                    hidden>
                </div>

                <h1 id="invitationSecurityTitle"
                    tabindex="-1"
                    aria-live="polite">

                    Validando convite

                </h1>

                <p id="invitationSecurityMessage">

                    Aguarde enquanto verificamos
                    seu convite exclusivo.

                </p>

                <p id="invitationSecurityDescription">
                </p>

                <div id="invitationSecurityContacts"
                    hidden>

                    <div class="invitation-security-divider">
                    </div>

                    <div class="invitation-security-contacts">

                        <a id="securityContactBride"
                            class="invitation-security-contact"
                            target="_blank"
                            rel="noopener noreferrer">

                            ${messageIcon}

                            <span>Falar com a noiva</span>

                            <small>
                                ${CONTACTS.bride.display}
                            </small>

                        </a>

                        <a id="securityContactGroom"
                            class="invitation-security-contact"
                            target="_blank"
                            rel="noopener noreferrer">

                            ${messageIcon}

                            <span>Falar com o noivo</span>

                            <small>
                                ${CONTACTS.groom.display}
                            </small>

                        </a>

                    </div>

                </div>

                <button id="invitationSecurityRetry"
                    class="invitation-security-retry"
                    type="button"
                    hidden>

                    Tentar novamente

                </button>

                <p class="invitation-security-signature">

                    Com carinho,<br>
                    Cláudia &amp; Max.

                </p>

            </div>

        `;

        document.body.appendChild(gate);

        $("invitationSecurityRetry")
            .addEventListener("click", () => {

                window.location.reload();

            });

    }

    // =====================================
    // MENSAGENS DO WHATSAPP
    // =====================================

    function updateContacts(status) {

        function createMessage(contact) {

            if (
                status === "expired" ||
                status === "confirmed"
            ) {

                return (
                    `Olá, ${contact.name}! Tudo bem? ` +
                    "Meu convite de casamento foi encerrado " +
                    "e gostaria de solicitar ajuda para " +
                    "alterar minha resposta de presença. " +
                    "Obrigado(a)!"
                );

            }

            return (
                `Olá, ${contact.name}! Tudo bem? ` +
                "Estou tentando acessar meu convite " +
                "de casamento, mas o link está " +
                "indisponível. Poderia me ajudar? " +
                "Obrigado(a)!"
            );

        }

        function whatsappURL(contact) {

            return (
                "https://wa.me/" +
                contact.phone +
                "?text=" +
                encodeURIComponent(
                    createMessage(contact)
                )
            );

        }

        $("securityContactBride").href =
            whatsappURL(CONTACTS.bride);

        $("securityContactGroom").href =
            whatsappURL(CONTACTS.groom);

    }

    // =====================================
    // INTERROMPER CONTEUDO DO CONVITE
    // =====================================

    function stopMedia() {

        document.querySelectorAll("audio, video")
            .forEach(media => {

                try {

                    media.pause();

                } catch (error) {

                    // Ignorar falhas de pausa.

                }

            });

    }

    function clearRSVP() {

        const frame = $("integratedRsvpFrame");

        if (frame) {

            frame.src = "about:blank";

        }

    }

    // =====================================
    // BLOQUEAR INTERFACE
    // =====================================

    function showGate(status) {

        createGate();

        accessGranted = false;
        lastStatus = status;

        document.documentElement.classList.add(
            "invitation-locked"
        );

        $("invitationSecurityGate").hidden = false;

        stopMedia();

        clearRSVP();

        const title =
            $("invitationSecurityTitle");

        const message =
            $("invitationSecurityMessage");

        const description =
            $("invitationSecurityDescription");

        const icon =
            $("invitationSecurityIcon");

        const loader =
            $("invitationSecurityLoader");

        const contacts =
            $("invitationSecurityContacts");

        const retry =
            $("invitationSecurityRetry");

        loader.hidden = true;
        icon.hidden = false;
        contacts.hidden = true;
        retry.hidden = true;

        description.textContent = "";

        switch (status) {

            case "loading":

                title.textContent =
                    "Validando convite";

                message.textContent =
                    "Aguarde enquanto verificamos " +
                    "seu convite exclusivo.";

                loader.hidden = false;
                icon.hidden = true;

                break;

            case "confirmed":

                icon.innerHTML = successIcon;

                title.textContent =
                    "Resposta registrada!";

                message.textContent =
                    "Sua resposta foi registrada " +
                    "com sucesso. Agradecemos " +
                    "imensamente pelo carinho!";

                description.textContent =
                    "Por segurança, seu convite foi " +
                    "encerrado automaticamente. " +
                    "Caso precise alterar sua resposta, " +
                    "entre em contato com os noivos.";

                contacts.hidden = false;

                break;

            case "expired":

                icon.innerHTML = lockIcon;

                title.textContent =
                    "Convite encerrado";

                message.textContent =
                    "Este convite exclusivo já foi " +
                    "respondido. Agradecemos " +
                    "imensamente pelo carinho!";

                description.textContent =
                    "Caso precise alterar sua resposta, " +
                    "entre em contato com os noivos.";

                contacts.hidden = false;

                break;

            case "blocked":

                icon.innerHTML = lockIcon;

                title.textContent =
                    "Convite indisponível";

                message.textContent =
                    "Este convite está temporariamente " +
                    "indisponível.";

                description.textContent =
                    "Entre em contato com os noivos " +
                    "para obter mais informações.";

                contacts.hidden = false;

                break;

            case "invalid":

                icon.innerHTML = lockIcon;

                title.textContent =
                    "Convite exclusivo";

                message.textContent =
                    "Este endereço não possui um " +
                    "convite válido.";

                description.textContent =
                    "Solicite seu link exclusivo " +
                    "diretamente aos noivos.";

                contacts.hidden = false;

                break;

            default:

                icon.innerHTML = connectionIcon;

                title.textContent =
                    "Falha de conexão";

                message.textContent =
                    "Não foi possível validar seu " +
                    "convite neste momento.";

                description.textContent =
                    "Verifique sua conexão com a " +
                    "internet e tente novamente.";

                retry.hidden = false;

                break;

        }

        updateContacts(status);

        if (status !== "loading") {

            title.focus({
                preventScroll: true
            });

        }

    }

    // =====================================
    // LIBERAR CONVITE
    // =====================================

    function unlockInvitation() {

        accessGranted = true;
        lastStatus = "active";

        $("invitationSecurityGate").hidden = true;

        document.documentElement.classList.remove(
            "invitation-locked"
        );

    }

    // =====================================
    // VALIDAR LINK NO SUPABASE
    // =====================================

    async function validateInvitation() {

        if (busy) return;

        if (!code || !validUUID.test(code)) {

            showGate("invalid");

            return;

        }

        if (!db) {

            showGate("error");

            return;

        }

        busy = true;

        const version = ++requestVersion;

        const controller = new AbortController();

        const timeout = setTimeout(() => {

            controller.abort();

        }, 10000);

        try {

            const { data, error } = await db.rpc(
                "validate_invitation",
                {
                    p_code: code
                }
            ).abortSignal(controller.signal);

            if (version !== requestVersion) return;

            if (error) throw error;

            if (
                data?.success === true &&
                data.status === "active"
            ) {

                unlockInvitation();

                return;

            }

            if (
                data?.success === false &&
                [
                    "expired",
                    "blocked",
                    "invalid"
                ].includes(data.status)
            ) {

                showGate(data.status);

                return;

            }

            showGate("error");

        } catch (error) {

            if (version !== requestVersion) return;

            showGate("error");

        } finally {

            clearTimeout(timeout);

            busy = false;

        }

    }

    // =====================================
    // RECEBER RESULTADO DO RSVP
    // =====================================

    window.addEventListener("message", event => {

        if (
            event.origin !== window.location.origin
        ) return;

        const frame = $("integratedRsvpFrame");

        if (
            !frame ||
            event.source !== frame.contentWindow
        ) return;

        if (
            event.data?.type !==
                "INVITATION_RESPONSE_SAVED" ||
            event.data?.code !== code
        ) return;

        requestVersion++;

        showGate("confirmed");

    });

    // =====================================
    // REVALIDACAO PERIODICA
    // =====================================

    setInterval(() => {

        if (
            accessGranted &&
            !document.hidden &&
            lastStatus === "active"
        ) {

            validateInvitation();

        }

    }, CHECK_INTERVAL);

    // Verificar novamente quando o usuario
    // retornar para a pagina.

    document.addEventListener(
        "visibilitychange",
        () => {

            if (
                !document.hidden &&
                accessGranted
            ) {

                validateInvitation();

            }

        }
    );

    window.addEventListener("pageshow", event => {

        if (
            event.persisted &&
            accessGranted
        ) {

            validateInvitation();

        }

    });

    // =====================================
    // INICIALIZACAO
    // =====================================

    createGate();

    showGate("loading");

    validateInvitation();

});
