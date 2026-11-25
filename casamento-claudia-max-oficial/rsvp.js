
/* =========================================
   CLAUDIA & MAX - RSVP V4.3
   Desenvolvido por GUSTAVO WILLIAN
========================================= */

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

    let invitation = null;
    let answers = new Map();
    let busy = false;
    let closed = false;

    const loadingPanel = $("loadingPanel");
    const errorPanel = $("errorPanel");
    const invitationPanel = $("invitationPanel");
    const successPanel = $("successPanel");

    const form = $("rsvpForm");
    const submitButton = $("submitButton");
    const agreeCheckbox = $("agreeCheckbox");

    // =====================================
    // NAVEGACAO
    // =====================================

    if (code && validUUID.test(code)) {

        const backURL = new URL(
            "./",
            window.location.href
        );

        backURL.searchParams.set("convite", code);

        $("backButton").href = backURL.toString();

    }

    function showPanel(panel) {

        [
            loadingPanel,
            errorPanel,
            invitationPanel,
            successPanel
        ].forEach(element => {

            element.hidden = element !== panel;

        });

        document.querySelector(".screen").scrollTop = 0;

    }

    function showError(text, retry = false) {

        invitation = null;
        answers.clear();

        $("authorizedGuests").replaceChildren();

        $("errorText").textContent = text;

        $("retryButton").hidden = !retry;

        showPanel(errorPanel);

    }

    function message(text, type = "") {

        $("formMessage").textContent = text;

        $("formMessage").className =
            "rsvp-message " + type;

    }

    // =====================================
    // ENCERRAMENTO DO CONVITE
    // =====================================

    function closeInvitation() {

        closed = true;
        invitation = null;

        answers.clear();

        $("authorizedGuests").replaceChildren();

        $("editButton").hidden = true;

        submitButton.disabled = true;

    }

    function showExpired() {

        closeInvitation();

        showError(
            "Este convite exclusivo já foi respondido. " +
            "Caso precise alterar sua resposta, " +
            "entre em contato com os noivos."
        );

    }

    // =====================================
    // COMUNICACAO COM CONVITE PRINCIPAL
    // =====================================

    function notifyParent() {

        if (window.parent === window) return;

        window.parent.postMessage(
            {
                type: "INVITATION_RESPONSE_SAVED",
                code: code
            },
            window.location.origin
        );

    }

    // =====================================
    // VALIDACAO DE SEGURANCA
    // =====================================

    async function validateAccess() {

        const { data, error } = await db.rpc(
            "validate_invitation",
            {
                p_code: code
            }
        );

        if (error) throw error;

        if (
            data?.success === true &&
            data.status === "active"
        ) {

            return true;

        }

        if (data?.status === "expired") {

            showExpired();

            return false;

        }

        if (
            data?.status === "blocked" ||
            data?.status === "invalid"
        ) {

            closeInvitation();

            showError(
                "Este convite está indisponível. " +
                "Entre em contato com os noivos."
            );

            return false;

        }

        throw new Error(
            "Não foi possível validar o convite."
        );

    }

    // =====================================
    // CONSULTAR CONVITE
    // =====================================

    async function loadInvitation() {

        if (busy || closed) return;

        if (!code || !validUUID.test(code)) {

            showError(
                "Este endereço não possui um código " +
                "de convite válido. Solicite seu " +
                "link exclusivo aos noivos."
            );

            return;

        }

        if (!db) {

            showError(
                "Não foi possível conectar ao sistema. " +
                "Atualize a página e tente novamente.",
                true
            );

            return;

        }

        busy = true;

        invitation = null;
        answers.clear();

        $("authorizedGuests").replaceChildren();

        showPanel(loadingPanel);

        try {

            // Verificar o status antes de consultar
            // os convidados autorizados.

            const allowed = await validateAccess();

            if (!allowed) return;

            const { data, error } = await db.rpc(
                "get_invitation",
                {
                    p_code: code
                }
            );

            if (error) throw error;

            if (data?.status === "expired") {

                showExpired();

                return;

            }

            if (!data || data.success !== true) {

                showError(
                    "Este convite está indisponível, " +
                    "foi bloqueado ou possui um link inválido. " +
                    "Entre em contato com os noivos."
                );

                return;

            }

            if (
                !Array.isArray(data.guests) ||
                !Number.isInteger(data.max_guests) ||
                data.max_guests < 1 ||
                data.guests.length !== data.max_guests
            ) {

                showError(
                    "Este convite precisa ser " +
                    "revisado pelos noivos."
                );

                return;

            }

            const ids = new Set(
                data.guests.map(guest => guest.id)
            );

            if (
                ids.size !== data.guests.length ||
                data.guests.some(
                    guest => !validUUID.test(guest.id)
                )
            ) {

                showError(
                    "Não foi possível validar " +
                    "a lista de convidados."
                );

                return;

            }

            invitation = data;

            renderInvitation();

            showPanel(invitationPanel);

        } catch (error) {

            showError(
                "Não foi possível consultar seu convite. " +
                "Verifique sua conexão e tente novamente.",
                true
            );

        } finally {

            busy = false;

            updateSummary();

        }

    }

    // =====================================
    // EXIBIR CONVIDADOS AUTORIZADOS
    // =====================================

    function renderInvitation() {

        if (!invitation || closed) return;

        $("welcomeGuest").textContent =
            `Queridos ${invitation.group_name}, ` +
            "reservamos lugares especiais para vocês!";

        $("authorizedSlots").textContent =
            invitation.max_guests;

        $("authorizedGuests").replaceChildren();

        answers.clear();

        agreeCheckbox.checked = false;

        message("");

        invitation.guests.forEach((guest, index) => {

            const fieldset =
                document.createElement("fieldset");

            fieldset.className = "guest-option";

            const legend =
                document.createElement("legend");

            legend.textContent = guest.name;

            fieldset.appendChild(legend);

            const options =
                document.createElement("div");

            options.className = "attendance-options";

            const previousAnswer =
                typeof guest.attending === "boolean"
                    ? guest.attending
                    : null;

            answers.set(guest.id, previousAnswer);

            [
                {
                    value: true,
                    className: "yes",
                    label: "✓ Estarei presente"
                },
                {
                    value: false,
                    className: "no",
                    label: "✕ Não poderei ir"
                }

            ].forEach(option => {

                const label =
                    document.createElement("label");

                label.className =
                    "attendance-option " +
                    option.className;

                const input =
                    document.createElement("input");

                input.type = "radio";

                input.name = "guest-" + index;

                input.value = String(option.value);

                input.required = true;

                input.checked =
                    previousAnswer === option.value;

                input.addEventListener(
                    "change",
                    () => {

                        if (
                            !input.checked ||
                            busy ||
                            closed
                        ) return;

                        answers.set(
                            guest.id,
                            option.value
                        );

                        message("");

                        updateSummary();

                    }
                );

                const span =
                    document.createElement("span");

                span.textContent = option.label;

                label.append(input, span);

                options.appendChild(label);

            });

            fieldset.appendChild(options);

            $("authorizedGuests").appendChild(fieldset);

        });

        updateSummary();

    }

    // =====================================
    // CONTADORES E VALIDACAO
    // =====================================

    function updateSummary() {

        const values = [...answers.values()];

        const selected = values.filter(
            value => value === true
        ).length;

        const answered = values.filter(
            value => typeof value === "boolean"
        ).length;

        $("selectedCount").textContent = selected;

        $("answeredCount").textContent = invitation
            ? `${answered} de ${invitation.max_guests} pessoas responderam.`
            : "";

        const allAnswered =
            invitation !== null &&
            answered === invitation.guests.length;

        submitButton.disabled =
            busy ||
            closed ||
            !invitation ||
            !allAnswered ||
            !agreeCheckbox.checked;

    }

    agreeCheckbox.addEventListener(
        "change",
        updateSummary
    );

    function setFormBusy(value) {

        busy = value;

        form.querySelectorAll("input").forEach(input => {

            input.disabled = value || closed;

        });

        submitButton.textContent = closed

            ? "Convite encerrado"

            : value

                ? "Registrando resposta..."

                : "Enviar confirmação";

        updateSummary();

    }

    // =====================================
    // REGISTRAR CONFIRMACAO
    // =====================================

    form.addEventListener("submit", async event => {

        event.preventDefault();

        if (
            busy ||
            closed ||
            !invitation ||
            !agreeCheckbox.checked
        ) return;

        const allAnswered = invitation.guests.every(
            guest => typeof answers.get(guest.id) === "boolean"
        );

        if (!allAnswered) {

            message(
                "Informe a resposta de todos os convidados.",
                "error"
            );

            return;

        }

        const selectedIds = invitation.guests
            .filter(
                guest => answers.get(guest.id) === true
            )
            .map(guest => guest.id);

        if (selectedIds.length > invitation.max_guests) {

            message(
                "O limite de vagas autorizadas foi excedido.",
                "error"
            );

            return;

        }

        const confirmationText =

            selectedIds.length === 0

                ? "Deseja informar que nenhuma pessoa " +
                  "deste convite poderá comparecer?"

                : `Deseja confirmar ${selectedIds.length} ` +
                  "presença(s)? As demais pessoas serão " +
                  "registradas como ausentes.";

        const securityNotice =

            "\n\nApós o envio, este convite será encerrado. " +
            "Caso precise alterar sua resposta, " +
            "entre em contato com os noivos.";

        if (
            !window.confirm(
                confirmationText + securityNotice
            )
        ) return;

        setFormBusy(true);

        message("Verificando seu convite...");

        try {

            // Revalidar antes de enviar a resposta.

            const allowed = await validateAccess();

            if (!allowed) return;

            message("Enviando sua resposta...");

            const { data, error } = await db.rpc(
                "confirm_invitation",
                {
                    p_code: code,
                    p_guest_ids: selectedIds
                }
            );

            if (error) throw error;

            // Impedir novas respostas em convites
            // que foram encerrados anteriormente.

            if (
                data?.success !== true &&
                data?.status === "expired"
            ) {

                showExpired();

                return;

            }

            if (
                data?.success !== true &&
                data?.status === "unavailable"
            ) {

                closeInvitation();

                showError(
                    "Este convite não está mais disponível. " +
                    "Entre em contato com os noivos."
                );

                return;

            }

            if (!data || data.success !== true) {

                message(
                    data?.message ||
                    "Não foi possível registrar a resposta.",
                    "error"
                );

                return;

            }

            const confirmed = Number(data.confirmed);

            if (
                !Number.isInteger(confirmed) ||
                confirmed !== selectedIds.length
            ) {

                message(
                    "Não foi possível verificar o resultado. " +
                    "Recarregue a página para consultar " +
                    "a situação do seu convite.",
                    "error"
                );

                return;

            }

            // =================================
            // RESPOSTA REGISTRADA COM SUCESSO
            // =================================

            const expired =
                data.status === "expired";

            if (expired) {

                closeInvitation();

            }

            const successText = confirmed === 0

                ? "Sua resposta de ausência foi registrada."

                : `Registramos ${confirmed} presença(s) ` +
                  "para o seu convite.";

            $("successText").textContent = expired

                ? successText +
                  " Seu convite foi encerrado automaticamente. " +
                  "Agradecemos pelo carinho!"

                : successText;

            message("");

            showPanel(successPanel);

            if (expired) {

                // Informar a pagina principal para
                // interromper a musica e bloquear
                // toda a interface do convite.

                notifyParent();

            }

        } catch (error) {

            message(
                "Não foi possível verificar o envio. " +
                "Confira sua conexão e consulte novamente " +
                "a situação do convite antes de reenviar.",
                "error"
            );

        } finally {

            setFormBusy(false);

        }

    });

    // =====================================
    // ALTERAR RESPOSTA
    // =====================================

    $("editButton").addEventListener(
        "click",
        () => {

            if (closed) return;

            loadInvitation();

        }
    );

    $("retryButton").addEventListener(
        "click",
        () => {

            if (closed) return;

            loadInvitation();

        }
    );

    // =====================================
    // INICIALIZACAO
    // =====================================

    loadInvitation();

});
