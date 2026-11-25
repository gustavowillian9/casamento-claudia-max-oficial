
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
    // CONSULTAR CONVITE
    // =====================================

    async function loadInvitation() {

        if (busy) return;

        if (!code || !validUUID.test(code)) {

            showError(
                "Este endereço não possui um código de convite válido. Solicite seu link exclusivo aos noivos."
            );

            return;

        }

        if (!db) {

            showError(
                "Não foi possível conectar ao sistema. Atualize a página e tente novamente.",
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

            const { data, error } = await db.rpc(
                "get_invitation",
                {
                    p_code: code
                }
            );

            if (error) throw error;

            if (!data || data.success !== true) {

                showError(
                    "Este convite está indisponível, foi bloqueado ou possui um link inválido. Entre em contato com os noivos."
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
                    "Este convite precisa ser revisado pelos noivos."
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
                    "Não foi possível validar a lista de convidados."
                );

                return;

            }

            invitation = data;

            renderInvitation();

            showPanel(invitationPanel);

        } catch (error) {

            showError(
                "Não foi possível consultar seu convite. Verifique sua conexão e tente novamente.",
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

        if (!invitation) return;

        $("welcomeGuest").textContent =
            `Queridos ${invitation.group_name}, reservamos lugares especiais para vocês!`;

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

                        if (!input.checked || busy) return;

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

            input.disabled = value;

        });

        submitButton.textContent = value
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

        const confirmationText = selectedIds.length === 0

            ? "Deseja informar que nenhuma pessoa deste convite poderá comparecer?"

            : `Deseja confirmar ${selectedIds.length} presença(s)? As demais pessoas serão registradas como ausentes.`;

        if (!window.confirm(confirmationText)) return;

        setFormBusy(true);

        message("Enviando sua resposta...");

        try {

            const { data, error } = await db.rpc(
                "confirm_invitation",
                {
                    p_code: code,
                    p_guest_ids: selectedIds
                }
            );

            if (error) throw error;

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
                    "Não foi possível verificar o resultado. Recarregue a página para consultar sua resposta.",
                    "error"
                );

                return;

            }

            $("successText").textContent =
                confirmed === 0

                ? "Sua resposta de ausência foi registrada."

                : `Registramos ${confirmed} presença(s) para o seu convite.`;

            message("");

            showPanel(successPanel);

        } catch (error) {

            message(
                "Não foi possível verificar o envio. Confira sua conexão e tente novamente.",
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
        loadInvitation
    );

    $("retryButton").addEventListener(
        "click",
        loadInvitation
    );

    // =====================================
    // INICIALIZACAO
    // =====================================

    loadInvitation();

});
