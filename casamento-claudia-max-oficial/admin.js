
document.addEventListener("DOMContentLoaded", () => {

    "use strict";

    const db = window.supabaseClient;
    const $ = id => document.getElementById(id);

    let invitations = [];
    let selectedId = null;
    let busy = false;
    let requestVersion = 0;
    let toastTimer;

    const loginScreen = $("loginScreen");
    const dashboardScreen = $("dashboardScreen");
    const createDialog = $("createDialog");
    const manageDialog = $("manageDialog");

    if (!db) {
        $("loginMessage").textContent =
            "Não foi possível conectar ao Supabase.";

        $("loginButton").disabled = true;
        return;
    }

    // =====================================
    // UTILITARIOS
    // =====================================

    function esc(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function normalize(value) {
        return String(value ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();
    }

    function message(id, text, type = "") {
        $(id).textContent = text;
        $(id).className = `message ${type}`;
    }

    function toast(text) {
        $("toast").textContent = text;
        $("toast").hidden = false;

        clearTimeout(toastTimer);

        toastTimer = setTimeout(() => {
            $("toast").hidden = true;
        }, 3500);
    }

    function available(invitation) {
        return invitation.active &&
            !invitation.needs_review;
    }

    function attendanceLabel(value) {
        if (value === true) return "Confirmado";
        if (value === false) return "Ausente";
        return "Pendente";
    }

    function status(invitation) {

        if (invitation.needs_review) {
            return ["review", "Em revisão"];
        }

        if (!invitation.active) {
            return ["blocked", "Bloqueado"];
        }

        const confirmed = Number(invitation.confirmed || 0);
        const absent = Number(invitation.absent || 0);
        const total = Number(invitation.max_guests || 0);

        if (confirmed > 0) {
            return [
                "confirmed",
                confirmed + absent < total
                    ? "Resposta parcial"
                    : "Com confirmados"
            ];
        }

        if (absent === total && total > 0) {
            return ["absent", "Todos ausentes"];
        }

        return ["pending", "Pendente"];
    }

    function setBusy(value) {

        busy = value;

        [
            "newInvitationButton",
            "refreshButton",
            "exportButton",
            "logoutButton"
        ].forEach(id => {
            $(id).disabled = value;
        });

        $("createButton").disabled = value;

        document.querySelectorAll(
            "#manageContent button, #manageContent input, #manageContent select"
        ).forEach(element => {

            if (value) {

                element.dataset.wasDisabled =
                    String(element.disabled);

                element.disabled = true;

            } else {

                element.disabled =
                    element.dataset.wasDisabled === "true";

                delete element.dataset.wasDisabled;

            }

        });

    }

    // =====================================
    // AUTENTICACAO
    // =====================================

    function showLogin() {

        requestVersion++;
        invitations = [];
        selectedId = null;

        $("guestList").replaceChildren();
        $("manageContent").replaceChildren();

        if (createDialog.open) createDialog.close();
        if (manageDialog.open) manageDialog.close();

        $("createForm").reset();
        $("password").value = "";
        $("searchInput").value = "";
        $("statusFilter").value = "all";

        dashboardScreen.hidden = true;
        loginScreen.hidden = false;

        setBusy(false);

    }

    $("loginForm").addEventListener("submit", async event => {

        event.preventDefault();

        $("loginButton").disabled = true;
        $("loginButton").textContent = "Entrando...";

        message("loginMessage", "");

        try {

            const { error } =
                await db.auth.signInWithPassword({
                    email: $("email").value.trim(),
                    password: $("password").value
                });

            if (error) throw error;

            $("password").value = "";

            await loadDashboard();

        } catch (error) {

            message(
                "loginMessage",
                "Não foi possível entrar. Verifique o e-mail, a senha e a conexão.",
                "error"
            );

        } finally {

            $("loginButton").disabled = false;
            $("loginButton").textContent = "Entrar no painel";

        }

    });

    $("logoutButton").addEventListener("click", async () => {

        if (busy) return;

        $("logoutButton").disabled = true;

        try {

            const { error } = await db.auth.signOut();

            if (error) throw error;

            showLogin();

            message(
                "loginMessage",
                "Sessão encerrada.",
                "success"
            );

        } catch (error) {

            message(
                "dashboardMessage",
                "Não foi possível encerrar a sessão.",
                "error"
            );

        } finally {

            $("logoutButton").disabled = false;

        }

    });

    db.auth.onAuthStateChange(event => {
        if (event === "SIGNED_OUT") showLogin();
    });

    // =====================================
    // CARREGAR DADOS
    // =====================================

    async function loadDashboard() {

        const version = ++requestVersion;

        message("dashboardMessage", "Carregando informações...");

        try {

            const { data, error } =
                await db.rpc("admin_dashboard");

            if (version !== requestVersion) return false;

            if (error) {

                if (
                    error.code === "42501" ||
                    error.code === "PGRST301"
                ) {

                    await db.auth.signOut();
                    showLogin();

                    message(
                        "loginMessage",
                        "Acesso não autorizado.",
                        "error"
                    );

                    return false;

                }

                throw error;

            }

            if (!data || !Array.isArray(data.invitations)) {
                throw new Error("Resposta inválida do banco.");
            }

            invitations = data.invitations;

            updateStats(data);
            renderGuests();

            loginScreen.hidden = true;
            dashboardScreen.hidden = false;

            message("dashboardMessage", "");

            if (manageDialog.open && selectedId) {

                const invitation = invitations.find(
                    item => item.id === selectedId
                );

                if (invitation) {

                    renderManage(invitation);

                } else {

                    manageDialog.close();
                    selectedId = null;

                }

            }

            return true;

        } catch (error) {

            if (version !== requestVersion) return false;

            message(
                dashboardScreen.hidden
                    ? "loginMessage"
                    : "dashboardMessage",
                "Não foi possível atualizar os dados. Tente novamente.",
                "error"
            );

            return false;

        }

    }

    function updateStats(data) {

        const total = Number(data.total_slots || 0);
        const active = Number(data.active_slots || 0);
        const confirmed = Number(data.confirmed || 0);
        const absent = Number(data.absent || 0);

        $("totalInvites").textContent =
            Number(data.total_invites || 0);

        $("totalSlots").textContent = total;
        $("activeSlots").textContent = active;
        $("confirmedCount").textContent = confirmed;
        $("absentCount").textContent = absent;

        $("pendingCount").textContent =
            Number(data.pending || 0);

        $("reviewCount").textContent = total - active;

        const answered = confirmed + absent;

        const percentage = active
            ? Math.min(100, Math.round(answered / active * 100))
            : 0;

        $("progressPercent").textContent = percentage + "%";
        $("progressBar").style.width = percentage + "%";

        $("progressDescription").textContent =
            `${answered} de ${active} vagas ativas responderam ao convite.`;

    }

    // =====================================
    // LISTA E PESQUISA
    // =====================================

    function renderGuests() {

        const search = normalize($("searchInput").value);
        const filter = $("statusFilter").value;

        const filtered = invitations.filter(invitation => {

            const names = [
                invitation.group_name,
                ...(invitation.guests || []).map(g => g.name)
            ].join(" ");

            const matchesSearch =
                normalize(names).includes(search);

            const matchesStatus =
                filter === "all" ||
                status(invitation)[0] === filter;

            return matchesSearch && matchesStatus;

        });

        $("resultsCount").textContent =
            `${filtered.length} de ${invitations.length} convites`;

        if (!filtered.length) {

            $("guestList").innerHTML =
                '<div class="empty-state">Nenhum convite encontrado.</div>';

            return;

        }

        $("guestList").innerHTML = filtered.map(invitation => {

            const [key, label] = status(invitation);

            const id = esc(invitation.id);
            const total = Number(invitation.max_guests || 0);
            const confirmed = Number(invitation.confirmed || 0);
            const absent = Number(invitation.absent || 0);

            const pending = Math.max(
                0, total - confirmed - absent
            );

            const disabled = available(invitation)
                ? ""
                : "disabled";

            return `
                <article class="guest-card">

                    <div class="guest-card-header">

                        <div>
                            <h3>${esc(invitation.group_name)}</h3>
                            <p>${total} vaga(s) autorizada(s)</p>
                        </div>

                        <span class="status status-${key}">
                            ${label}
                        </span>

                    </div>

                    <div class="guest-counts">

                        <div class="guest-count">
                            <strong class="green">${confirmed}</strong>
                            <span>Confirmados</span>
                        </div>

                        <div class="guest-count">
                            <strong class="yellow">
                                ${available(invitation) ? pending : "—"}
                            </strong>
                            <span>Pendentes</span>
                        </div>

                        <div class="guest-count">
                            <strong class="red">${absent}</strong>
                            <span>Ausentes</span>
                        </div>

                    </div>

                    <div class="actions">

                        <button class="primary"
                            data-action="manage" data-id="${id}">
                            Gerenciar
                        </button>

                        <button class="outline"
                            data-action="copy" data-id="${id}"
                            ${disabled}>
                            Copiar link
                        </button>

                        <button class="outline"
                            data-action="whatsapp" data-id="${id}"
                            ${disabled}>
                            WhatsApp
                        </button>

                    </div>

                </article>
            `;

        }).join("");

    }

    // =====================================
    // EXECUTAR FUNCOES ADMINISTRATIVAS
    // =====================================

    async function mutate(
        functionName,
        params,
        messageId = "manageMessage"
    ) {

        if (busy || dashboardScreen.hidden) return false;

        setBusy(true);
        message(messageId, "Salvando...");

        let saved = false;

        try {

            const { data, error } =
                await db.rpc(functionName, params);

            if (error) throw error;

            if (!data || data.success !== true) {
                throw new Error(
                    data?.message || "Operação não concluída."
                );
            }

            saved = true;

            const refreshed = await loadDashboard();

            if (!refreshed) {

                message(
                    messageId,
                    "Alteração salva, mas a lista não foi atualizada. Clique em Atualizar.",
                    "error"
                );

                if (manageDialog.open) manageDialog.close();

                toast("Alteração salva. Atualize a lista.");

                return true;

            }

            message(
                messageId,
                data.message || "Alteração salva.",
                "success"
            );

            toast(data.message || "Alteração salva.");

            return true;

        } catch (error) {

            message(
                messageId,
                saved
                    ? "Alteração salva. Atualize a lista."
                    : error.message || "Não foi possível concluir.",
                "error"
            );

            return saved;

        } finally {

            setBusy(false);

        }

    }

    // =====================================
    // CRIAR CONVITE
    // =====================================

    $("newInvitationButton").addEventListener("click", () => {

        if (busy) return;

        $("createForm").reset();
        $("newActive").checked = true;

        message("createMessage", "");

        createDialog.showModal();

    });

    $("createForm").addEventListener("submit", async event => {

        event.preventDefault();

        if (busy) return;

        const group = $("newGroupName").value.trim();

        const names = $("newGuestNames").value
            .split(/\r?\n/)
            .map(name => name.trim())
            .filter(Boolean);

        if (!group || names.length < 1 || names.length > 100) {

            message(
                "createMessage",
                "Informe o nome do grupo e de 1 a 100 convidados.",
                "error"
            );

            return;

        }

        const success = await mutate(
            "admin_create_invitation",
            {
                p_group_name: group,
                p_guest_names: names,
                p_active: $("newActive").checked
            },
            "createMessage"
        );

        if (success) {

            createDialog.close();
            $("createForm").reset();

        }

    });

    // =====================================
    // GERENCIAR CONVITE
    // =====================================

    function openManage(invitation) {

        selectedId = invitation.id;

        message("manageMessage", "");

        renderManage(invitation);

        if (!manageDialog.open) {
            manageDialog.showModal();
        }

    }

    function renderManage(invitation) {

        $("manageTitle").textContent =
            invitation.group_name;

        const [key, label] = status(invitation);

        const people = invitation.guests || [];

        const total = Number(invitation.max_guests || 0);

        const enabled = available(invitation);

        const hasResponses = people.some(
            person => typeof person.attending === "boolean"
        );

        const rows = people.map(person => {

            const id = esc(person.id);

            const current = person.attending === true
                ? "yes"
                : person.attending === false
                    ? "no"
                    : "pending";

            const canRemove =
                total > 1 &&
                typeof person.attending !== "boolean";

            return `
                <div class="person-row">

                    <div class="person-name">
                        ${esc(person.name)}
                    </div>

                    <div class="person-controls">

                        <select
                            data-attendance="${id}"
                            aria-label="Presença de ${esc(person.name)}"
                            ${enabled ? "" : "disabled"}>

                            <option value="pending"
                                ${current === "pending" ? "selected" : ""}>
                                Pendente
                            </option>

                            <option value="yes"
                                ${current === "yes" ? "selected" : ""}>
                                Confirmado
                            </option>

                            <option value="no"
                                ${current === "no" ? "selected" : ""}>
                                Ausente
                            </option>

                        </select>

                        <button class="outline"
                            data-manage="rename-guest"
                            data-guest="${id}">
                            Editar nome
                        </button>

                        <button class="danger"
                            data-manage="remove-guest"
                            data-guest="${id}"
                            ${canRemove ? "" : "disabled"}>
                            Remover
                        </button>

                    </div>

                </div>
            `;

        }).join("");

        $("manageContent").innerHTML = `

            <section class="manage-section">

                <h3>Informações do convite</h3>

                <p>
                    Situação:
                    <span class="status status-${key}">
                        ${label}
                    </span>
                </p>

                <p>
                    Vagas autorizadas: <strong>${total}</strong>
                </p>

                <label for="editGroupName">Nome do grupo</label>

                <div class="inline-form">

                    <input id="editGroupName"
                        maxlength="200"
                        value="${esc(invitation.group_name)}">

                    <button class="primary"
                        data-manage="rename-group">
                        Salvar nome
                    </button>

                </div>

            </section>

            <section class="manage-section">

                <h3>Convidados autorizados</h3>

                ${rows}

                <p class="muted">
                    Convidados que já responderam não podem
                    ser removidos diretamente.
                </p>

                <label for="addGuestName">
                    Adicionar uma vaga
                </label>

                <div class="inline-form">

                    <input id="addGuestName"
                        maxlength="200"
                        placeholder="Nome do novo convidado">

                    <button class="primary"
                        data-manage="add-guest"
                        ${total >= 100 ? "disabled" : ""}>
                        Adicionar
                    </button>

                </div>

            </section>

            <section class="manage-section">

                <h3>Situação do convite</h3>

                <div class="actions">

                    <button class="primary"
                        data-manage="activate"
                        ${enabled ? "disabled" : ""}>
                        Liberar convite
                    </button>

                    <button class="outline"
                        data-manage="review"
                        ${invitation.needs_review ? "disabled" : ""}>
                        Colocar em revisão
                    </button>

                    <button class="danger"
                        data-manage="block"
                        ${!invitation.active && !invitation.needs_review
                            ? "disabled" : ""}>
                        Bloquear
                    </button>

                </div>

            </section>

            <section class="manage-section">

                <h3>Link exclusivo</h3>

                <p class="muted">
                    Gere um novo link caso o anterior
                    tenha sido compartilhado indevidamente.
                </p>

                <div class="actions">

                    <button class="outline"
                        data-manage="copy"
                        ${enabled ? "" : "disabled"}>
                        Copiar link
                    </button>

                    <button class="outline"
                        data-manage="whatsapp"
                        ${enabled ? "" : "disabled"}>
                        WhatsApp
                    </button>

                    <button class="danger"
                        data-manage="regenerate">
                        Gerar novo link
                    </button>

                </div>

            </section>

            <section class="manage-section danger-zone">

                <h3 class="red">Excluir convite</h3>

                <p class="muted">
                    A exclusão remove o grupo e suas vagas.
                    Convites com respostas estão protegidos.
                </p>

                <button class="danger full"
                    data-manage="delete"
                    ${hasResponses ? "disabled" : ""}>
                    Excluir convite definitivamente
                </button>

            </section>

        `;

    }

    // =====================================
    // ACOES ADMINISTRATIVAS
    // =====================================

    $("manageContent").addEventListener("click", async event => {

        const button = event.target.closest(
            "button[data-manage]"
        );

        if (!button || button.disabled || busy) return;

        const invitation = invitations.find(
            item => item.id === selectedId
        );

        if (!invitation) return;

        const id = invitation.id;

        const guest = (invitation.guests || []).find(
            person => person.id === button.dataset.guest
        );

        const action = button.dataset.manage;

        switch (action) {

            case "rename-group": {

                const name = $("editGroupName").value.trim();

                if (!name) {
                    message("manageMessage", "Informe o nome.", "error");
                    return;
                }

                await mutate(
                    "admin_rename_invitation",
                    {
                        p_invitation_id: id,
                        p_group_name: name
                    }
                );

                break;

            }

            case "rename-guest": {

                if (!guest) return;

                const name = window.prompt(
                    "Digite o nome correto do convidado:",
                    guest.name
                );

                if (!name || !name.trim()) return;

                if (typeof guest.attending === "boolean") {

                    if (!window.confirm(
                        "Este convidado já respondeu. Corrija apenas o nome da mesma pessoa. Continuar?"
                    )) return;

                }

                await mutate(
                    "admin_rename_guest",
                    {
                        p_guest_id: guest.id,
                        p_guest_name: name.trim()
                    }
                );

                break;

            }

            case "add-guest": {

                const name = $("addGuestName").value.trim();

                if (!name) {
                    message(
                        "manageMessage",
                        "Informe o nome do novo convidado.",
                        "error"
                    );
                    return;
                }

                await mutate(
                    "admin_add_guest",
                    {
                        p_invitation_id: id,
                        p_guest_name: name
                    }
                );

                break;

            }

            case "remove-guest": {

                if (!guest) return;

                if (!window.confirm(
                    `Remover ${guest.name} e reduzir uma vaga deste convite?`
                )) return;

                await mutate(
                    "admin_remove_guest",
                    { p_guest_id: guest.id }
                );

                break;

            }

            case "activate": {

                if (!window.confirm(
                    "Liberar este convite para os convidados?"
                )) return;

                await mutate(
                    "admin_set_invitation_status",
                    {
                        p_invitation_id: id,
                        p_active: true,
                        p_needs_review: false
                    }
                );

                break;

            }

            case "block": {

                if (!window.confirm(
                    "Bloquear este convite? O link ficará indisponível, mas os registros serão preservados."
                )) return;

                await mutate(
                    "admin_set_invitation_status",
                    {
                        p_invitation_id: id,
                        p_active: false,
                        p_needs_review: false
                    }
                );

                break;

            }

            case "review": {

                if (!window.confirm(
                    "Colocar este convite em revisão?"
                )) return;

                await mutate(
                    "admin_set_invitation_status",
                    {
                        p_invitation_id: id,
                        p_active: false,
                        p_needs_review: true
                    }
                );

                break;

            }

            case "regenerate": {

                if (!window.confirm(
                    "Gerar um novo link? O link anterior deixará de funcionar."
                )) return;

                await mutate(
                    "admin_regenerate_code",
                    { p_invitation_id: id }
                );

                break;

            }

            case "delete": {

                const confirmation = window.prompt(
                    `Excluir definitivamente o convite de ${invitation.group_name}? Digite EXCLUIR para confirmar.`
                );

                if (confirmation !== "EXCLUIR") return;

                const success = await mutate(
                    "admin_delete_invitation",
                    { p_invitation_id: id }
                );

                if (success) {

                    manageDialog.close();
                    selectedId = null;

                }

                break;

            }

            case "copy":

                await copyLink(invitation);

                break;

            case "whatsapp":

                shareWhatsApp(invitation);

                break;

        }

    });

    // =====================================
    // CONFIRMACAO MANUAL
    // =====================================

    $("manageContent").addEventListener("change", async event => {

        const select = event.target.closest(
            "select[data-attendance]"
        );

        if (!select || busy) return;

        const invitation = invitations.find(
            item => item.id === selectedId
        );

        if (!invitation || !available(invitation)) return;

        const guest = (invitation.guests || []).find(
            person => person.id === select.dataset.attendance
        );

        if (!guest) return;

        const value = select.value === "yes"
            ? true
            : select.value === "no"
                ? false
                : null;

        if (!window.confirm(
            `Alterar a presença de ${guest.name} para ${attendanceLabel(value)}?`
        )) {

            renderManage(invitation);
            return;

        }

        const success = await mutate(
            "admin_set_attendance",
            {
                p_guest_id: guest.id,
                p_attending: value
            }
        );

        if (!success && manageDialog.open) {

            const current = invitations.find(
                item => item.id === selectedId
            );

            if (current) renderManage(current);

        }

    });

    // =====================================
    // LINKS EXCLUSIVOS
    // =====================================

    function invitationLink(invitation) {

        const url = new URL(INVITATION_URL);

        url.searchParams.set(
            "convite",
            invitation.code
        );

        return url.toString();

    }

    async function copyLink(invitation) {

        if (!available(invitation)) return;

        try {

            await navigator.clipboard.writeText(
                invitationLink(invitation)
            );

            toast("Link exclusivo copiado.");

        } catch (error) {

            window.prompt(
                "Copie o link exclusivo:",
                invitationLink(invitation)
            );

        }

    }

    function shareWhatsApp(invitation) {

        if (!available(invitation)) return;

        const text = [
            `Olá, ${invitation.group_name}!`,
            "",
            "Com muito amor e carinho, convidamos vocês para celebrar nosso casamento.",
            "",
            `Reservamos ${invitation.max_guests} lugar(es) exclusivamente para este grupo.`,
            "",
            "O convite é pessoal e intransferível.",
            "",
            "Acesse seu convite exclusivo:",
            invitationLink(invitation),
            "",
            "Com carinho, Cláudia & Max."
        ].join("\n");

        window.open(
            "https://wa.me/?text=" + encodeURIComponent(text),
            "_blank",
            "noopener,noreferrer"
        );

    }

    $("guestList").addEventListener("click", async event => {

        const button = event.target.closest(
            "button[data-action]"
        );

        if (!button || button.disabled || busy) return;

        const invitation = invitations.find(
            item => item.id === button.dataset.id
        );

        if (!invitation) return;

        if (button.dataset.action === "manage") {
            openManage(invitation);
        }

        if (button.dataset.action === "copy") {
            await copyLink(invitation);
        }

        if (button.dataset.action === "whatsapp") {
            shareWhatsApp(invitation);
        }

    });

    // =====================================
    // EXPORTAR CSV
    // =====================================

    function csvCell(value) {

        let text = String(value ?? "");

        if (/^\s*[=+\-@\t\r]/.test(text)) {
            text = "'" + text;
        }

        return '"' + text.replace(/"/g, '""') + '"';

    }

    $("exportButton").addEventListener("click", () => {

        if (busy || dashboardScreen.hidden) return;

        const rows = [[
            "Grupo",
            "Convidado",
            "Vagas do grupo",
            "Situação do convite",
            "Presença"
        ]];

        invitations.forEach(invitation => {

            (invitation.guests || []).forEach(guest => {

                rows.push([
                    invitation.group_name,
                    guest.name,
                    invitation.max_guests,
                    status(invitation)[1],
                    attendanceLabel(guest.attending)
                ]);

            });

        });

        const content = rows
            .map(row => row.map(csvCell).join(";"))
            .join("\r\n");

        const blob = new Blob(
            ["\uFEFF", content],
            { type: "text/csv;charset=utf-8;" }
        );

        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");

        anchor.href = url;
        anchor.download = "convidados-claudia-max.csv";

        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1000);

        toast("Lista exportada.");

    });

    // =====================================
    // EVENTOS GERAIS
    // =====================================

    $("searchInput").addEventListener("input", renderGuests);

    $("statusFilter").addEventListener("change", renderGuests);

    $("refreshButton").addEventListener("click", async () => {

        if (busy) return;

        setBusy(true);

        try {
            await loadDashboard();
        } finally {
            setBusy(false);
        }

    });

    document.querySelectorAll("[data-close]").forEach(button => {

        button.addEventListener("click", () => {

            if (!busy) {
                $(button.dataset.close).close();
            }

        });

    });

    [createDialog, manageDialog].forEach(dialog => {

        dialog.addEventListener("cancel", event => {

            if (busy) event.preventDefault();

        });

    });

    manageDialog.addEventListener("close", () => {

        selectedId = null;

        $("manageContent").replaceChildren();

    });

    // =====================================
    // INICIALIZACAO
    // =====================================

    async function initialize() {

        showLogin();

        $("loginButton").disabled = true;

        try {

            const { data, error } =
                await db.auth.getSession();

            if (error) throw error;

            if (data.session) {
                await loadDashboard();
            }

        } catch (error) {

            message(
                "loginMessage",
                "Não foi possível verificar a sessão.",
                "error"
            );

        } finally {

            $("loginButton").disabled = false;

        }

    }

    initialize();

});
