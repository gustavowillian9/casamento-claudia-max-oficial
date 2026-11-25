
document.addEventListener("DOMContentLoaded", function () {

    // ELEMENTOS PRINCIPAIS

    const screens = document.querySelectorAll(".screen");

    const video = document.getElementById("openingVideo");
    const music = document.getElementById("backgroundMusic");

    const musicButton = document.getElementById("musicButton");
    const openButton = document.getElementById("openButton");
    const skipButton = document.getElementById("skipButton");
    const playButton = document.getElementById("playButton");
    const replayButton = document.getElementById("replayButton");

    const chapterPage = document.getElementById("chapterPage");
    const chapterNumber = document.getElementById("chapterNumber");
    const chapterPhoto = document.getElementById("chapterPhoto");
    const chapterTitle = document.getElementById("chapterTitle");
    const chapterText = document.getElementById("chapterText");
    const chapterProgress = document.getElementById("chapterProgress");
    const chapterCounter = document.getElementById("chapterCounter");

    const previousChapter = document.getElementById("previousChapter");
    const nextChapter = document.getElementById("nextChapter");
    const returnToStory = document.getElementById("returnToStory");

    const agreeCheckbox = document.getElementById("agreeCheckbox");
    const confirmClaudia = document.getElementById("confirmClaudia");
    const confirmMax = document.getElementById("confirmMax");

    let currentScreen = "initialScreen";
    let currentChapter = 0;
    let musicEnabled = true;

    music.volume = 0.25;


    // HISTORIA COMPLETA DO CASAL

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


    // SISTEMA DE TELAS INDEPENDENTES

    function showScreen(screenId) {

        const target = document.getElementById(screenId);

        if (!target || !target.classList.contains("screen")) {
            return;
        }

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
            agreeCheckbox.checked = false;
            updateConfirmationButtons();
        }

    }


    // BOTOES DE NAVEGACAO

    document.querySelectorAll("[data-go]").forEach(function (button) {

        button.addEventListener("click", function () {

            const destination = button.dataset.go;

            if (destination === "storyScreen") {
                currentChapter = 0;
                renderChapter();
            }

            showScreen(destination);

        });

    });


    // CONTROLE DA MUSICA

    function updateMusicButton() {

        const playing = !music.paused;

        musicButton.classList.toggle("playing", playing);

        musicButton.textContent = playing ? "♫" : "♪";

        musicButton.setAttribute(
            "aria-pressed",
            String(playing)
        );

        musicButton.setAttribute(
            "aria-label",
            playing ? "Pausar música" : "Reproduzir música"
        );

        musicButton.title =
            playing ? "Pausar música" : "Reproduzir música";

    }


    async function startMusic() {

        if (!musicEnabled) return;

        try {
            await music.play();
        } catch (error) {
            console.log("Toque no botão musical para reproduzir.");
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


    music.addEventListener("play", updateMusicButton);
    music.addEventListener("pause", updateMusicButton);
    music.addEventListener("error", updateMusicButton);


    // ABERTURA CINEMATOGRAFICA

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


    openButton.addEventListener("click", startOpening);

    skipButton.addEventListener("click", finishOpening);

    video.addEventListener("ended", finishOpening);

    video.addEventListener("error", function () {

        if (currentScreen === "videoScreen") {
            finishOpening();
        }

    });


    playButton.addEventListener("click", async function () {

        try {

            await video.play();
            playButton.hidden = true;

        } catch (error) {

            finishOpening();

        }

    });


    // LIVRO INTERATIVO

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
            (currentChapter + 1) + " de " + chapters.length;

        previousChapter.textContent = "← Voltar";

        if (currentChapter === chapters.length - 1) {

            nextChapter.textContent = "Ver convite →";

        } else {

            nextChapter.textContent = "Próximo →";

        }

        chapterPage.classList.remove("animate");

        chapterPage.style.animation = "none";

        void chapterPage.offsetWidth;

        chapterPage.style.animation = "";

        chapterPage.classList.add("animate");

        document.getElementById("storyScreen").scrollTop = 0;

    }


    // PROXIMO CAPITULO

    nextChapter.addEventListener("click", function () {

        if (currentChapter < chapters.length - 1) {

            currentChapter++;

            renderChapter();

        } else {

            showScreen("invitationScreen");

        }

    });


    // CAPITULO ANTERIOR

    previousChapter.addEventListener("click", function () {

        if (currentChapter > 0) {

            currentChapter--;

            renderChapter();

        } else {

            showScreen("prologueScreen");

        }

    });


    // VOLTAR DO CONVITE PARA A HISTORIA

    returnToStory.addEventListener("click", function () {

        currentChapter = chapters.length - 1;

        renderChapter();

        showScreen("storyScreen");

    });


    // REVER ABERTURA

    replayButton.addEventListener("click", function () {

        video.pause();

        music.pause();

        music.currentTime = 0;

        currentChapter = 0;

        agreeCheckbox.checked = false;

        updateConfirmationButtons();

        showScreen("initialScreen");

    });


    // CONFIRMACAO DE PRESENCA

    function updateConfirmationButtons() {

        const accepted = agreeCheckbox.checked;

        confirmClaudia.disabled = !accepted;

        confirmMax.disabled = !accepted;

    }


    agreeCheckbox.addEventListener(
        "change",
        updateConfirmationButtons
    );


    // MENSAGEM PERSONALIZADA

    function createMessage(name) {

        return `Olá, ${name}!

Gostaria de confirmar minha presença no casamento. Li e estou ciente das orientações sobre o convite.

Será uma alegria celebrar esse momento especial com vocês!`;

    }


    // ABRIR WHATSAPP

    function openWhatsApp(name, phone) {

        if (!agreeCheckbox.checked) return;

        const message = encodeURIComponent(
            createMessage(name)
        );

        const url =
            "https://wa.me/" + phone + "?text=" + message;

        window.open(
            url,
            "_blank",
            "noopener,noreferrer"
        );

    }


    // WHATSAPP DA CLAUDIA

    confirmClaudia.addEventListener("click", function () {

        openWhatsApp(
            "Cláudia",
            "5565999364947"
        );

    });


    // WHATSAPP DO MAX

    confirmMax.addEventListener("click", function () {

        openWhatsApp(
            "Max",
            "5565996395129"
        );

    });


    // INICIALIZACAO

    showScreen("initialScreen");

    updateMusicButton();

    updateConfirmationButtons();

});
