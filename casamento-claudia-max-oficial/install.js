
"use strict";

// ==========================================
// CASAMENTO CLAUDIA & MAX - V4.2
// INSTALACAO DO APLICATIVO PWA
// ==========================================

(() => {

    let deferredPrompt = null;
    let installed = false;
    let busy = false;

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

    function isAndroid() {

        return /Android/i.test(
            navigator.userAgent
        );

    }

    function isStandalone() {

        return window.matchMedia(
            "(display-mode: standalone)"
        ).matches ||

        window.matchMedia(
            "(display-mode: fullscreen)"
        ).matches ||

        navigator.standalone === true;

    }

    // ======================================
    // CAPTURAR INSTALACAO NATIVA
    // ======================================

    window.addEventListener(
        "beforeinstallprompt",
        event => {

            event.preventDefault();

            deferredPrompt = event;

            updateInterface();

        }
    );

    window.addEventListener(
        "appinstalled",
        () => {

            installed = true;
            deferredPrompt = null;

            updateInterface();

        }
    );

    // ======================================
    // ESTILOS
    // ======================================

    function createStyles() {

        if (
            document.getElementById("installStyles")
        ) return;

        const style =
            document.createElement("style");

        style.id = "installStyles";

        style.textContent = `

            #installAppSection {

                background: #fffaf3;
                border: 1px solid #dfcbb7;
                border-radius: 16px;
                padding: 22px;
                margin: 20px 0;
                color: #382015;
                box-shadow: 0 4px 15px
                    rgba(56,32,21,.05);

            }

            #installAppSection[hidden],
            #installInstructions[hidden] {

                display: none !important;

            }

            .install-app-heading {

                display: flex;
                align-items: center;
                gap: 15px;
                margin-bottom: 16px;

            }

            .install-app-icon {

                width: 58px;
                height: 58px;
                flex-shrink: 0;
                border-radius: 14px;
                object-fit: cover;
                border: 1px solid #dfcbb7;

            }

            .install-app-heading h2 {

                margin: 0 0 5px;
                font-size: 19px;
                color: #382015;

            }

            .install-app-heading p {

                margin: 0;
                font-size: 13px;
                color: #795034;
                line-height: 1.6;

            }

            #installAppButton {

                display: flex;
                align-items: center;
                justify-content: center;
                gap: 9px;
                width: 100%;
                padding: 14px 20px;
                background: #795034;
                color: #ffffff;
                border: 0;
                border-radius: 10px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;

            }

            #installAppButton:disabled {

                opacity: .5;
                cursor: not-allowed;

            }

            #installAppButton:hover:not(:disabled) {

                background: #63402a;

            }

            #installInstructions {

                background: #f3eade;
                border-radius: 10px;
                padding: 15px;
                margin-top: 14px;
                font-size: 13px;
                line-height: 1.7;

            }

            #installInstructions ol {

                padding-left: 22px;
                margin: 8px 0;

            }

            #installInstructions li {

                margin-bottom: 5px;

            }

            #installAppStatus {

                font-size: 12px;
                line-height: 1.6;
                color: #795034;
                margin: 12px 0 0;

            }

            @media(max-width: 600px) {

                #installAppSection {

                    padding: 16px;

                }

                .install-app-heading h2 {

                    font-size: 17px;

                }

                .install-app-icon {

                    width: 50px;
                    height: 50px;

                }

            }

        `;

        document.head.appendChild(style);

    }

    // ======================================
    // CRIAR INTERFACE
    // ======================================

    function createInterface() {

        const dashboard =
            document.getElementById(
                "dashboardScreen"
            );

        if (!dashboard) return;

        if (
            document.getElementById(
                "installAppSection"
            )
        ) return;

        createStyles();

        const section =
            document.createElement("section");

        section.id = "installAppSection";

        section.hidden = true;

        section.innerHTML = `

            <div class="install-app-heading">

                <img
                    class="install-app-icon"
                    src="/assets/icon-192.png"
                    alt="Cláudia e Max">

                <div>

                    <h2>Instale nosso aplicativo</h2>

                    <p>
                        Acesse o painel do casamento
                        diretamente pela tela inicial
                        do seu dispositivo.
                    </p>

                </div>

            </div>

            <button
                id="installAppButton"
                type="button">

                <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true">

                    <path d="M12 3v12"/>
                    <path d="m7 10 5 5 5-5"/>
                    <path d="M5 15v5h14v-5"/>

                </svg>

                <span id="installButtonLabel">

                    Instalar aplicativo

                </span>

            </button>

            <div
                id="installInstructions"
                hidden>
            </div>

            <p
                id="installAppStatus"
                role="status"
                aria-live="polite">
            </p>

        `;

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
            .getElementById("installAppButton")
            .addEventListener(
                "click",
                installApplication
            );

        updateInterface();

    }

    // ======================================
    // MENSAGEM DE STATUS
    // ======================================

    function setStatus(message) {

        const status =
            document.getElementById(
                "installAppStatus"
            );

        if (status) {

            status.textContent = message;

        }

    }

    // ======================================
    // ATUALIZAR INTERFACE
    // ======================================

    function updateInterface() {

        const section =
            document.getElementById(
                "installAppSection"
            );

        const button =
            document.getElementById(
                "installAppButton"
            );

        const label =
            document.getElementById(
                "installButtonLabel"
            );

        if (!section || !button || !label) {

            return;

        }

        if (installed || isStandalone()) {

            section.hidden = true;

            return;

        }

        section.hidden = false;

        button.disabled = busy;

        if (deferredPrompt) {

            label.textContent =
                "Instalar aplicativo";

            setStatus(
                "Instalação disponível neste dispositivo."
            );

        } else {

            label.textContent =
                "Como instalar o aplicativo";

            if (isIOS()) {

                setStatus(
                    "Instale pelo menu de compartilhamento."
                );

            } else {

                setStatus(
                    "Consulte as opções de instalação " +
                    "disponíveis no navegador."
                );

            }

        }

    }

    // ======================================
    // INSTRUCOES ALTERNATIVAS
    // ======================================

    function showInstructions() {

        const instructions =
            document.getElementById(
                "installInstructions"
            );

        if (!instructions) return;

        if (!instructions.hidden) {

            instructions.hidden = true;

            return;

        }

        instructions.hidden = false;

        if (isIOS()) {

            instructions.innerHTML = `

                <strong>Instalar no iPhone</strong>

                <ol>

                    <li>Abra o painel no Safari.</li>

                    <li>
                        Toque no botão Compartilhar.
                    </li>

                    <li>
                        Escolha Adicionar à Tela
                        de Início.
                    </li>

                    <li>Toque em Adicionar.</li>

                    <li>
                        Abra pelo ícone Cláudia & Max.
                    </li>

                </ol>

            `;

        } else if (isAndroid()) {

            instructions.innerHTML = `

                <strong>Instalar no Android</strong>

                <ol>

                    <li>
                        Abra o painel no Google Chrome.
                    </li>

                    <li>
                        Toque nos três pontinhos.
                    </li>

                    <li>
                        Procure Instalar aplicativo
                        ou Adicionar à tela inicial.
                    </li>

                    <li>
                        Confirme a instalação.
                    </li>

                </ol>

                <p>
                    Se a opção não aparecer,
                    verifique se o aplicativo
                    já está instalado e se o
                    Chrome está atualizado.
                    As notificações podem funcionar
                    mesmo sem a instalação.
                </p>

            `;

        } else {

            instructions.innerHTML = `

                <strong>Instalar no computador</strong>

                <ol>

                    <li>
                        Abra o painel no Chrome
                        ou Microsoft Edge.
                    </li>

                    <li>
                        Procure o ícone de instalação
                        na barra de endereço.
                    </li>

                    <li>
                        Caso disponível, utilize a opção
                        de instalação no menu do navegador.
                    </li>

                </ol>

            `;

        }

    }

    // ======================================
    // INSTALAR APLICATIVO
    // ======================================

    async function installApplication() {

        if (busy) return;

        if (installed || isStandalone()) {

            updateInterface();

            return;

        }

        if (!deferredPrompt) {

            showInstructions();

            return;

        }

        busy = true;

        const promptEvent = deferredPrompt;

        deferredPrompt = null;

        try {

            await promptEvent.prompt();

            updateInterface();

            const choice =
                await promptEvent.userChoice;

            if (choice.outcome === "accepted") {

                setStatus(
                    "Solicitação de instalação aceita."
                );

            } else {

                setStatus(
                    "Instalação cancelada. " +
                    "Você pode tentar novamente."
                );

            }

        } catch (error) {

            setStatus(
                "Não foi possível iniciar a instalação."
            );

            showInstructions();

        } finally {

            busy = false;

            const button =
                document.getElementById(
                    "installAppButton"
                );

            if (button) {

                button.disabled = false;

            }

        }

    }

    // ======================================
    // REGISTRAR SERVICE WORKER
    // ======================================

    async function prepareApplication() {

        if (
            !window.isSecureContext ||
            !("serviceWorker" in navigator)
        ) return;

        try {

            await navigator.serviceWorker.register(

                "/sw.js",

                { scope: "/" }

            );

        } catch {

            setStatus(
                "Não foi possível preparar a instalação. " +
                "Atualize a página e tente novamente."
            );

        }

    }

    // ======================================
    // INICIALIZACAO
    // ======================================

    function initialize() {

        createInterface();

        prepareApplication();

        window.matchMedia(
            "(display-mode: standalone)"
        ).addEventListener(
            "change",
            updateInterface
        );

        window.addEventListener(
            "pageshow",
            updateInterface
        );

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
