
document.addEventListener("DOMContentLoaded", function () {

    const video = document.getElementById("openingVideo");
    const videoScreen = document.getElementById("videoScreen");
    const invitationScreen = document.getElementById("invitationScreen");

    const soundButton = document.getElementById("soundButton");
    const skipButton = document.getElementById("skipButton");
    const replayButton = document.getElementById("replayButton");
    const playButton = document.getElementById("playButton");

    let finished = false;
    let transitionTimer;

    // MOSTRAR O CONVITE

    function showInvitation() {

        if (finished) return;

        finished = true;

        video.pause();

        invitationScreen.hidden = false;
        invitationScreen.classList.add("visible");

        videoScreen.classList.add("fade-out");

        document.body.style.overflowY = "auto";

        transitionTimer = setTimeout(function () {

            videoScreen.hidden = true;

            window.scrollTo(0, 0);

        }, 1000);

    }

    // INICIAR O VIDEO

    async function startVideo() {

        clearTimeout(transitionTimer);

        finished = false;

        invitationScreen.hidden = true;
        invitationScreen.classList.remove("visible");

        videoScreen.hidden = false;
        videoScreen.classList.remove("fade-out");

        document.body.style.overflowY = "hidden";

        video.muted = true;

        soundButton.textContent = "🔇 Ativar som";

        playButton.hidden = true;

        try {

            video.currentTime = 0;

            await video.play();

        } catch (error) {

            playButton.hidden = false;

        }

    }

    // QUANDO O VIDEO TERMINAR

    video.addEventListener("ended", showInvitation);

    // CASO O VIDEO APRESENTE ERRO

    video.addEventListener("error", showInvitation);

    // BOTAO ATIVAR E DESATIVAR SOM

    soundButton.addEventListener("click", function () {

        video.muted = !video.muted;

        if (video.muted) {

            soundButton.textContent = "🔇 Ativar som";

        } else {

            soundButton.textContent = "🔊 Desativar som";

        }

    });

    // BOTAO PULAR ABERTURA

    skipButton.addEventListener("click", showInvitation);

    // BOTAO REVER ABERTURA

    replayButton.addEventListener("click", startVideo);

    // CASO O NAVEGADOR BLOQUEIE O AUTOPLAY

    playButton.addEventListener("click", async function () {

        try {

            await video.play();

            playButton.hidden = true;

        } catch (error) {

            showInvitation();

        }

    });

    // INICIAR AUTOMATICAMENTE

    startVideo();

});
