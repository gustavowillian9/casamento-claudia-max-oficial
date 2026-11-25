
document.addEventListener("DOMContentLoaded", function () {

    // ==============================
    // ELEMENTOS DO CONVITE
    // ==============================

    const initialScreen =
        document.getElementById("initialScreen");

    const videoScreen =
        document.getElementById("videoScreen");

    const invitationScreen =
        document.getElementById("invitationScreen");

    const video =
        document.getElementById("openingVideo");

    const openButton =
        document.getElementById("openButton");

    const skipButton =
        document.getElementById("skipButton");

    const replayButton =
        document.getElementById("replayButton");

    const playButton =
        document.getElementById("playButton");

    const music =
        document.getElementById("backgroundMusic");

    const musicButton =
        document.getElementById("musicButton");

    const agreeCheckbox =
        document.getElementById("agreeCheckbox");

    const confirmClaudia =
        document.getElementById("confirmClaudia");

    const confirmMax =
        document.getElementById("confirmMax");


    // ==============================
    // CONFIGURACAO DOS NOIVOS
    // ==============================

    const noivos = {

        claudia: {
            nome: "Cláudia",
            telefone: "5565999364947"
        },

        max: {
            nome: "Max",
            telefone: "5565996395129"
        }

    };


    // ==============================
    // VARIAVEIS DE CONTROLE
    // ==============================

    let finished = false;
    let musicEnabled = true;
    let observer = null;

    music.volume = 0.25;


    // ==============================
    // CONTROLE DA MUSICA
    // ==============================

    function updateMusicButton() {

        const playing = !music.paused;

        musicButton.classList.toggle(
            "playing",
            playing
        );

        musicButton.textContent =
            playing ? "♫" : "♪";

        musicButton.setAttribute(
            "aria-pressed",
            String(playing)
        );

        musicButton.setAttribute(
            "aria-label",
            playing
                ? "Pausar música"
                : "Reproduzir música"
        );

        musicButton.title =
            playing
                ? "Pausar música"
                : "Reproduzir música";

    }


    async function startMusic() {

        if (!musicEnabled) return;

        try {

            await music.play();

        } catch (error) {

            console.log(
                "Toque no botão de música para reproduzir.",
                error
            );

        }

        updateMusicButton();

    }


    function pauseMusic() {

        music.pause();

        updateMusicButton();

    }


    musicButton.addEventListener(
        "click",
        async function () {

            if (music.paused) {

                musicEnabled = true;

                await startMusic();

            } else {

                musicEnabled = false;

                pauseMusic();

            }

        }
    );


    music.addEventListener(
        "play",
        updateMusicButton
    );

    music.addEventListener(
        "pause",
        updateMusicButton
    );

    music.addEventListener(
        "error",
        updateMusicButton
    );


    // ==============================
    // ANIMACOES DURANTE A ROLAGEM
    // ==============================

    function initializeAnimations() {

        const elements =
            document.querySelectorAll(".reveal");

        if (observer) {

            observer.disconnect();

        }

        if (!("IntersectionObserver" in window)) {

            elements.forEach(function (element) {

                element.classList.add("visible");

            });

            return;

        }

        document.body.classList.add(
            "animations-ready"
        );

        observer = new IntersectionObserver(

            function (entries) {

                entries.forEach(function (entry) {

                    if (entry.isIntersecting) {

                        entry.target.classList.add(
                            "visible"
                        );

                        observer.unobserve(
                            entry.target
                        );

                    }

                });

            },

            {
                threshold: 0.08
            }

        );

        elements.forEach(function (element) {

            observer.observe(element);

        });

    }


    // ==============================
    // MOSTRAR ENVELOPE INICIAL
    // ==============================

    function showInitialScreen() {

        finished = false;

        video.pause();

        pauseMusic();

        initialScreen.hidden = false;
        videoScreen.hidden = true;
        invitationScreen.hidden = true;
        playButton.hidden = true;

        document.body.style.overflowY = "hidden";

        agreeCheckbox.checked = false;

        updateConfirmationButtons();

        window.scrollTo({
            top: 0,
            behavior: "instant"
        });

    }


    // ==============================
    // MOSTRAR CONVITE COMPLETO
    // ==============================

    function showInvitation() {

        if (finished) return;

        finished = true;

        video.pause();

        initialScreen.hidden = true;
        videoScreen.hidden = true;
        invitationScreen.hidden = false;

        document.body.style.overflowY = "auto";

        window.scrollTo({
            top: 0,
            behavior: "instant"
        });

        initializeAnimations();

        startMusic();

    }


    // ==============================
    // INICIAR VIDEO
    // ==============================

    async function startVideo() {

        finished = false;

        pauseMusic();

        initialScreen.hidden = true;
        invitationScreen.hidden = true;
        videoScreen.hidden = false;
        playButton.hidden = true;

        document.body.style.overflowY = "hidden";

        try {

            video.currentTime = 0;

            video.muted = false;

            await video.play();

        } catch (error) {

            if (video.error) {

                showInvitation();

            } else {

                playButton.hidden = false;

            }

        }

    }


    // ==============================
    // EVENTOS DA ABERTURA
    // ==============================

    openButton.addEventListener(
        "click",
        startVideo
    );

    video.addEventListener(
        "ended",
        showInvitation
    );

    video.addEventListener(
        "error",
        function () {

            if (!videoScreen.hidden) {

                showInvitation();

            }

        }
    );

    skipButton.addEventListener(
        "click",
        showInvitation
    );

    replayButton.addEventListener(
        "click",
        showInitialScreen
    );

    playButton.addEventListener(
        "click",
        async function () {

            try {

                await video.play();

                playButton.hidden = true;

            } catch (error) {

                showInvitation();

            }

        }
    );


    // ==============================
    // CONFIRMACAO DE PRESENCA
    // ==============================

    function updateConfirmationButtons() {

        const accepted = agreeCheckbox.checked;

        confirmClaudia.disabled = !accepted;

        confirmMax.disabled = !accepted;

    }


    agreeCheckbox.addEventListener(
        "change",
        updateConfirmationButtons
    );


    // ==============================
    // MENSAGEM AUTOMATICA
    // ==============================

    function createMessage(nome) {

        return `Olá, ${nome}!

Gostaria de confirmar minha presença no casamento. Li e estou ciente das orientações sobre o convite.

Será uma alegria celebrar esse momento especial com vocês!`;

    }


    // ==============================
    // ABRIR WHATSAPP
    // ==============================

    function openWhatsApp(noivo) {

        if (!agreeCheckbox.checked) {

            return;

        }

        const mensagem =
            createMessage(noivo.nome);

        const mensagemCodificada =
            encodeURIComponent(mensagem);

        const link =
            "https://wa.me/" +
            noivo.telefone +
            "?text=" +
            mensagemCodificada;

        window.location.href = link;

    }


    // ==============================
    // CONFIRMAR COM CLAUDIA
    // ==============================

    confirmClaudia.addEventListener(
        "click",
        function () {

            openWhatsApp(noivos.claudia);

        }
    );


    // ==============================
    // CONFIRMAR COM MAX
    // ==============================

    confirmMax.addEventListener(
        "click",
        function () {

            openWhatsApp(noivos.max);

        }
    );


    // ==============================
    // INICIALIZACAO
    // ==============================

    showInitialScreen();

    updateMusicButton();

    updateConfirmationButtons();

});
