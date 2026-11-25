
document.addEventListener("DOMContentLoaded", function () {

    "use strict";

    const $ = id => document.getElementById(id);

    const screens = document.querySelectorAll(".screen");

    const video = $("openingVideo");
    const music = $("backgroundMusic");

    const musicButton = $("musicButton");
    const openButton = $("openButton");
    const skipButton = $("skipButton");
    const playButton = $("playButton");
    const replayButton = $("replayButton");

    const chapterPage = $("chapterPage");
    const chapterNumber = $("chapterNumber");
    const chapterPhoto = $("chapterPhoto");
    const chapterTitle = $("chapterTitle");
    const chapterText = $("chapterText");
    const chapterProgress = $("chapterProgress");
    const chapterCounter = $("chapterCounter");

    const previousChapter = $("previousChapter");
    const nextChapter = $("nextChapter");
    const returnToStory = $("returnToStory");

    let currentScreen = "initialScreen";
    let currentChapter = 0;
    let musicEnabled = true;

    music.volume = 0.25;

    // ==========================================
    // IDENTIFICACAO DO CONVITE EXCLUSIVO
    // ==========================================

    const params = new URLSearchParams(
        window.location.search
    );

    const invitationCode = params.get("convite");

    const validUUID =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    const hasInvitationCode =
        invitationCode &&
        validUUID.test(invitationCode);

    // Protecao contra envio do endereco
    // do convite como referencia externa.

    const referrerMeta = document.createElement("meta");

    referrerMeta.name = "referrer";
    referrerMeta.content = "no-referrer";

    document.head.appendChild(referrerMeta);

    // ==========================================
    // NOVA TELA DE CONFIRMACAO
    // ==========================================

    const rsvpScreen = $("rsvpScreen");

    // Remove completamente a antiga interface
    // de confirmacao pelo WhatsApp.

    rsvpScreen.replaceChildren();

    const rsvpLayout = document.createElement("div");

    rsvpLayout.className = "integrated-rsvp-layout";

    const rsvpFrame = document.createElement("iframe");

    rsvpFrame.id = "integratedRsvpFrame";
    rsvpFrame.title = "Confirmação de presença";
    rsvpFrame.className = "integrated-rsvp-frame";
    rsvpFrame.referrerPolicy = "no-referrer";

    const rsvpFooter = document.createElement("div");

    rsvpFooter.className = "integrated-rsvp-footer";

    const backToMenu = document.createElement("button");

    backToMenu.type = "button";
    backToMenu.className = "outline-button";
    backToMenu.textContent = "← Voltar ao menu";

    backToMenu.addEventListener("click", function () {

        showScreen("menuScreen");

    });

    rsvpFooter.appendChild(backToMenu);

    rsvpLayout.append(rsvpFrame, rsvpFooter);

    rsvpScreen.appendChild(rsvpLayout);

    // Estilo exclusivo da confirmacao integrada.

    const integrationStyle =
        document.createElement("style");

    integrationStyle.textContent = `

        #rsvpScreen {
            padding: 0 !important;
            overflow: hidden !important;
        }

        .integrated-rsvp-layout {
            display: flex;
            flex-direction: column;
            width: 100%;
            height: 100%;
            min-height: 0;
        }

        .integrated-rsvp-frame {
            display: block;
            width: 100%;
            flex: 1 1 0;
            min-height: 0;
            border: 0;
            background: #f3eadf;
        }

        .integrated-rsvp-footer {
            flex-shrink: 0;
            padding: 10px 15px;
            padding-bottom: max(
                10px,
                env(safe-area-inset-bottom)
            );
            text-align: center;
            background: #f3eadf;
            border-top: 1px solid #b9955e55;
        }

        .integrated-rsvp-footer button {
            margin: 0 auto !important;
            max-width: 420px;
            width: 100%;
        }

    `;

    document.head.appendChild(integrationStyle);

    // Carrega o formulario ja testado.
    // O codigo permanece vinculado ao convite.

    function loadRSVP() {

        const url = new URL(
            "rsvp.html",
            window.location.href
        );

        url.search = "";
        url.hash = "";

        if (hasInvitationCode) {

            url.searchParams.set(
                "convite",
                invitationCode
            );

        }

        rsvpFrame.src = url.toString();

    }

    // Remove o botao de retorno interno,
    // pois o convite possui sua propria navegacao.

    rsvpFrame.addEventListener("load", function () {

        try {

            const frameDocument =
                rsvpFrame.contentDocument;

            if (!frameDocument) return;

            const backButton =
                frameDocument.getElementById("backButton");

            if (backButton) {

                backButton.hidden = true;

            }

        } catch (error) {

            console.warn(
                "Não foi possível ajustar a navegação interna."
            );

        }

    });

    // ==========================================
    // HISTORIA COMPLETA DO CASAL
    // ==========================================

    const chapters = [

        {
            number: "Capítulo I",
            title: "Tudo começou em 2004",
            photo: "assets/foto-01.png",
            alt: "Cláudia e Max juntos",
            paragraphs: [
                "Tudo começou em 2004, ainda nos corredores de uma escola, onde o destino resolveu escrever os primeiros capítulos da nossa história.",
                "Foi durante os recreios, entre trocas de olhares, sorrisos tímidos e a primeira troca de telefones, que começamos a nos conhecer melhor."
            ]
        },

        {
            number: "Capítulo II",
            title: "Quando o amor floresceu",
            photo: "assets/foto-02.png",
            alt: "Cláudia e Max em um passeio",
            paragraphs: [
                "Sem perceber, aquele carinho foi crescendo, os sentimentos floresceram e nos apaixonamos."
            ]
        },

        {
            number: "Capítulo III",
            title: "Nosso maior presente",
            photo: "assets/foto-03.png",
            alt: "Cláudia, Max e seu filho",
            paragraphs: [
                "Desse amor nasceu o nosso maior presente: nosso filho, que veio transformar nossas vidas e fortalecer ainda mais os laços que nos uniam."
            ]
        },

        {
            number: "Capítulo IV",
            title: "Um amor que resistiu ao tempo",
            photo: "assets/foto-04.png",
            alt: "Cláudia e Max abraçados",
            paragraphs: [
                "Nossa caminhada nunca foi feita apenas de momentos fáceis. Enfrentamos altos e baixos, dificuldades, desafios e momentos em que foi preciso ter força, paciência e coragem para continuar.",
                "Mas, acima de tudo, tivemos amor. Um amor que resistiu ao tempo, superou obstáculos e nos ensinou que, quando duas pessoas escolhem permanecer juntas, nenhuma dificuldade é maior que a vontade de seguir lado a lado."
            ]
        },

        {
            number: "Capítulo V",
            title: "O nosso SIM diante de Deus",
            photo: "assets/foto-05.png",
            alt: "Cláudia e Max compartilhando um momento especial",
            paragraphs: [
                "E hoje, depois de tantos anos, tantas histórias e tantas conquistas, chegamos ao dia mais esperado de nossas vidas, depois do nascimento do nosso filho: o dia de transformar uma história que já é linda em uma promessa de amor eterno.",
                "O que começou com um simples olhar no recreio se transforma agora em um SIM diante de Deus e daqueles que amamos."
            ]
        },

        {
            number: "Capítulo VI",
            title: "O começo do nosso para sempre",
            photo: "assets/foto-06.png",
            alt: "Cláudia e Max de mãos dadas",
            paragraphs: [
                "Porque nossa história não começou hoje. Hoje é apenas o começo de um novo capítulo: o nosso para sempre!"
            ]
        }

    ];

    // ==========================================
    // SISTEMA DE TELAS INDEPENDENTES
    // ==========================================

    function showScreen(screenId) {

        const target = $(screenId);

        if (
            !target ||
            !target.classList.contains("screen")
        ) return;

        screens.forEach(function (screen) {

            screen.hidden = true;

        });

        target.hidden = false;

        currentScreen = screenId;

        target.scrollTop = 0;

        const isOpening =
            screenId === "initialScreen" ||
            screenId === "videoScreen";

        musicButton.hidden = isOpening;

        if (screenId !== "videoScreen") {

            video.pause();

        }

        if (screenId === "rsvpScreen") {

            loadRSVP();

        }

    }

    // ==========================================
    // BOTOES DE NAVEGACAO
    // ==========================================

    document.querySelectorAll("[data-go]")
        .forEach(function (button) {

            button.addEventListener("click", function () {

                const destination = button.dataset.go;

                if (destination === "storyScreen") {

                    currentChapter = 0;

                    renderChapter();

                }

                showScreen(destination);

            });

        });

    // ==========================================
    // CONTROLE DA MUSICA
    // ==========================================

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
                "Toque no botão musical para reproduzir."
            );

        }

        updateMusicButton();

    }

    musicButton.addEventListener("click", function () {

        if (music.paused) {

            musicEnabled = true;

            startMusic();

        } else {

            musicEnabled = false;

            music.pause();

        }

    });

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

    // ==========================================
    // ABERTURA CINEMATOGRAFICA
    // ==========================================

    async function startOpening() {

        music.pause();

        showScreen("videoScreen");

        playButton.hidden = true;

        try {

            video.currentTime = 0;

            video.muted = false;

            await video.play();

        } catch (error) {

            if (currentScreen !== "videoScreen") return;

            if (video.error) {

                finishOpening();

            } else {

                playButton.hidden = false;

            }

        }

    }

    function finishOpening() {

        if (currentScreen !== "videoScreen") return;

        video.pause();

        showScreen("prologueScreen");

        startMusic();

    }

    openButton.addEventListener(
        "click",
        startOpening
    );

    skipButton.addEventListener(
        "click",
        finishOpening
    );

    video.addEventListener(
        "ended",
        finishOpening
    );

    video.addEventListener("error", function () {

        if (currentScreen === "videoScreen") {

            finishOpening();

        }

    });

    playButton.addEventListener(
        "click",
        async function () {

            try {

                await video.play();

                playButton.hidden = true;

            } catch (error) {

                finishOpening();

            }

        }
    );

    // ==========================================
    // LIVRO INTERATIVO
    // ==========================================

    function renderChapter() {

        const chapter = chapters[currentChapter];

        chapterNumber.textContent = chapter.number;

        chapterTitle.textContent = chapter.title;

        chapterPhoto.src = chapter.photo;

        chapterPhoto.alt = chapter.alt;

        chapterText.replaceChildren();

        chapter.paragraphs.forEach(function (paragraph) {

            const p = document.createElement("p");

            p.textContent = paragraph;

            chapterText.appendChild(p);

        });

        chapterProgress.replaceChildren();

        chapters.forEach(function (_, index) {

            const dot = document.createElement("span");

            dot.className = "progress-dot";

            if (index === currentChapter) {

                dot.classList.add("active");

            }

            chapterProgress.appendChild(dot);

        });

        chapterCounter.textContent =
            (currentChapter + 1) +
            " de " +
            chapters.length;

        previousChapter.textContent = "← Voltar";

        nextChapter.textContent =
            currentChapter === chapters.length - 1
                ? "Ver convite →"
                : "Próximo →";

        chapterPage.classList.remove("animate");

        chapterPage.style.animation = "none";

        void chapterPage.offsetWidth;

        chapterPage.style.animation = "";

        chapterPage.classList.add("animate");

        $("storyScreen").scrollTop = 0;

    }

    // ==========================================
    // PROXIMO CAPITULO
    // ==========================================

    nextChapter.addEventListener("click", function () {

        if (currentChapter < chapters.length - 1) {

            currentChapter++;

            renderChapter();

        } else {

            showScreen("invitationScreen");

        }

    });

    // ==========================================
    // CAPITULO ANTERIOR
    // ==========================================

    previousChapter.addEventListener("click", function () {

        if (currentChapter > 0) {

            currentChapter--;

            renderChapter();

        } else {

            showScreen("prologueScreen");

        }

    });

    // ==========================================
    // VOLTAR PARA A HISTORIA
    // ==========================================

    returnToStory.addEventListener("click", function () {

        currentChapter = chapters.length - 1;

        renderChapter();

        showScreen("storyScreen");

    });

    // ==========================================
    // REVER ABERTURA
    // ==========================================

    replayButton.addEventListener("click", function () {

        video.pause();

        music.pause();

        music.currentTime = 0;

        currentChapter = 0;

        showScreen("initialScreen");

    });

    // ==========================================
    // INICIALIZACAO
    // ==========================================

    showScreen("initialScreen");

    updateMusicButton();

});
