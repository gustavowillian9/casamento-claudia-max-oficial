
document.addEventListener("DOMContentLoaded", function () {

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

    let finished = false;

    // MOSTRAR TELA INICIAL

    function showInitialScreen() {

        finished = false;

        video.pause();

        initialScreen.hidden = false;
        videoScreen.hidden = true;
        invitationScreen.hidden = true;
        playButton.hidden = true;

        document.body.style.overflowY = "hidden";

        window.scrollTo(0, 0);

    }

    // MOSTRAR CONVITE FINAL

    function showInvitation() {

        if (finished) return;

        finished = true;

        video.pause();

        initialScreen.hidden = true;
        videoScreen.hidden = true;
        invitationScreen.hidden = false;

        document.body.style.overflowY = "auto";

        window.scrollTo(0, 0);

    }

    // INICIAR VIDEO AO TOCAR NO SELO

    async function startVideo() {

        finished = false;

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

    // CLIQUE NO SELO C & M

    openButton.addEventListener("click", startVideo);

    // QUANDO O VIDEO TERMINAR

    video.addEventListener("ended", showInvitation);

    // CASO OCORRA ERRO NO VIDEO

    video.addEventListener("error", function () {

        if (!videoScreen.hidden) {

            showInvitation();

        }

    });

    // PULAR ABERTURA

    skipButton.addEventListener("click", showInvitation);

    // VOLTAR PARA O ENVELOPE FECHADO

    replayButton.addEventListener("click", showInitialScreen);

    // REPRODUCAO MANUAL SE NECESSARIO

    playButton.addEventListener("click", async function () {

        try {

            await video.play();

            playButton.hidden = true;

        } catch (error) {

            showInvitation();

        }

    });

    // CARREGAR PRIMEIRA TELA

    showInitialScreen();

});
