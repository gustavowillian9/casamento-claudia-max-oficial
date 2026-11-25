
document.addEventListener("DOMContentLoaded", () => {

    const db = window.supabaseClient;

    const $ = (id) => document.getElementById(id);

    const loginScreen = $("loginScreen");
    const dashboardScreen = $("dashboardScreen");
    const loginForm = $("loginForm");
    const loginButton = $("loginButton");
    const loginMessage = $("loginMessage");
    const dashboardMessage = $("dashboardMessage");
    const guestList = $("guestList");
    const searchInput = $("searchInput");
    const statusFilter = $("statusFilter");
    const guestDialog = $("guestDialog");

    let invitations = [];
    let toastTimer;
    let requestVersion = 0;

    if (!db) {
        loginMessage.textContent =
            "Não foi possível carregar a conexão com o Supabase.";

        loginMessage.className = "message error";
        loginButton.disabled = true;
        return;
    }


    // =====================================
    // MENSAGENS
    // =====================================

    function setMessage(element, message, type = "") {

        element.textContent = message;

        element.className = `message ${type}`;

    }

    function showToast(message) {

        const toast = $("toast");

        toast.textContent = message;
        toast.hidden = false;

        clearTimeout(toastTimer);

        toastTimer = setTimeout(() => {

            toast.hidden = true;

        }, 3500);

    }


    // =====================================
    // SEGURANCA DO HTML
    // =====================================

    function escapeHTML(value) {

        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");

    }


    // =====================================
    // TELAS
    // =====================================

    function showLogin() {

        requestVersion++;

        invitations = [];

        guestList.replaceChildren();

        if (guestDialog.open) {
            guestDialog.close();
        }

        dashboardScreen.hidden = true;
        loginScreen.hidden = false;

        $("password").value = "";

        searchInput.value = "";
        statusFilter.value = "all";

        [
            "totalInvites",
            "totalSlots",
            "activeSlots",
            "confirmedCount",
            "pendingCount",
            "absentCount",
            "reviewCount"
        ].forEach(id => {
            $(id).textContent = "0";
        });

        $("progressPercent").textContent = "0%";
        $("progressBar").style.width = "0%";

    }

    function showDashboard() {

        loginScreen.hidden = true;
        dashboardScreen.hidden = false;

    }


    // =====================================
    // LOGIN
    // =====================================

    loginForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        const email = $("email").value.trim();

        const password = $("password").value;

        loginButton.disabled = true;

        loginButton.textContent = "Entrando...";

        setMessage(loginMessage, "");

        try {

            const { error } =
                await db.auth.signInWithPassword({
                    email,
                    password
                });

            if (error) {

                setMessage(
                    loginMessage,
                    "E-mail ou senha inválidos, ou conexão indisponível.",
                    "error"
                );

                return;

            }

            $("password").value = "";

            await loadDashboard();

        } catch (error) {

            setMessage(
                loginMessage,
                "Não foi possível acessar o painel.",
                "error"
            );

        } finally {

            loginButton.disabled = false;

            loginButton.textContent = "Entrar no painel";

        }

    });


    // =====================================
    // LOGOUT
    // =====================================

    $("logoutButton").addEventListener("click", async () => {

        $("logoutButton").disabled = true;

        showLogin();

        try {

            const { error } = await db.auth.signOut();

            if (error) {
                throw error;
            }

            setMessage(
                loginMessage,
                "Sessão encerrada.",
                "success"
            );

        } catch (error) {

            setMessage(
                loginMessage,
                "Não foi possível encerrar a sessão. Tente novamente.",
                "error"
            );

        } finally {

            $("logoutButton").disabled = false;

        }

    });

    db.auth.onAuthStateChange((event) => {

        if (event === "SIGNED_OUT") {
            showLogin();
        }

    });


    // =====================================
    // CARREGAR PAINEL
    // =====================================

    async function loadDashboard() {

        const version = ++requestVersion;

        $("refreshButton").disabled = true;

        setMessage(
            dashboardMessage,
            "Carregando informações..."
        );

        try {

            const { data, error } =
                await db.rpc("admin_dashboard");

            if (version !== requestVersion) {
                return;
            }

            if (error) {

                if (
                    error.code === "42501" ||
                    error.code === "PGRST301"
                ) {

                    await db.auth.signOut();

                    showLogin();

                    setMessage(
                        loginMessage,
                        "Acesso não autorizado.",
                        "error"
                    );

                    return;

                }

                throw error;

            }

            if (!data || !Array.isArray(data.invitations)) {

                throw new Error(
                    "Resposta inválida do banco."
                );

            }

            invitations = data.invitations;

            updateStats(data);

            renderGuests();

            showDashboard();

            setMessage(dashboardMessage, "");

        } catch (error) {

            if (version !== requestVersion) {
                return;
            }

            const message =
                "Não foi possível carregar os convidados. Tente novamente.";

            setMessage(
                dashboardMessage,
                message,
                "error"
            );

            if (dashboardScreen.hidden) {

                setMessage(
                    loginMessage,
                    message,
                    "error"
                );

            }

        } finally {

            $("refreshButton").disabled = false;

        }

    }


    // =====================================
    // ESTATISTICAS
    // =====================================

    function updateStats(data) {

        const totalSlots = Number(data.total_slots || 0);

        const activeSlots = Number(data.active_slots || 0);

        const confirmed = Number(data.confirmed || 0);

        const absent = Number(data.absent || 0);

        const pending = Number(data.pending || 0);

        $("totalInvites").textContent =
            data.total_invites || 0;

        $("totalSlots").textContent = totalSlots;

        $("activeSlots").textContent = activeSlots;

        $("confirmedCount").textContent = confirmed;

        $("absentCount").textContent = absent;

        $("pendingCount").textContent = pending;

        $("reviewCount").textContent =
            totalSlots - activeSlots;

        const answered = confirmed + absent;

        const percentage = activeSlots > 0

            ? Math.min(
                100,
                Math.round(
                    (answered / activeSlots) * 100
                )
            )

            : 0;

        $("progressPercent").textContent =
            `${percentage}%`;

        $("progressBar").style.width =
            `${percentage}%`;

        $("progressDescription").textContent =
            `${answered} de ${activeSlots} vagas ativas responderam ao convite.`;

    }


    // =====================================
    // STATUS DOS CONVITES
    // =====================================

    function getStatus(invitation) {

        if (invitation.needs_review) {

            return {
                key: "review",
                label: "Em revisão"
            };

        }

        if (!invitation.active) {

            return {
                key: "blocked",
                label: "Bloqueado"
            };

        }

        const confirmed =
            Number(invitation.confirmed || 0);

        const absent =
            Number(invitation.absent || 0);

        if (confirmed > 0) {

            return {
                key: "confirmed",
                label: "Confirmado"
            };

        }

        if (
            absent > 0 &&
            absent === Number(invitation.max_guests)
        ) {

            return {
                key: "absent",
                label: "Ausente"
            };

        }

        return {
            key: "pending",
            label: "Pendente"
        };

    }


    // =====================================
    // PESQUISA
    // =====================================

    function normalizeText(value) {

        return String(value ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();

    }

    function getFilteredInvitations() {

        const search =
            normalizeText(searchInput.value.trim());

        const filter = statusFilter.value;

        return invitations.filter(invitation => {

            const names = [
                invitation.group_name,

                ...(invitation.guests || [])
                    .map(guest => guest.name)

            ].join(" ");

            const matchesSearch =
                normalizeText(names).includes(search);

            const matchesStatus =
                filter === "all" ||
                getStatus(invitation).key === filter;

            return matchesSearch && matchesStatus;

        });

    }


    // =====================================
    // RENDERIZAR CONVIDADOS
    // =====================================

    function renderGuests() {

        const filtered = getFilteredInvitations();

        $("resultsCount").textContent =
            `${filtered.length} de ${invitations.length} convites`;

        if (filtered.length === 0) {

            guestList.innerHTML = `
                <div class="empty-state">
                    Nenhum convite encontrado.
                </div>
            `;

            return;

        }

        guestList.innerHTML = filtered.map(invitation => {

            const status = getStatus(invitation);

            const confirmed =
                Number(invitation.confirmed || 0);

            const absent =
                Number(invitation.absent || 0);

            const total =
                Number(invitation.max_guests || 0);

            const pending =
                Math.max(0, total - confirmed - absent);

            const available =
                invitation.active &&
                !invitation.needs_review;

            const disabled =
                available ? "" : "disabled";

            const id = escapeHTML(invitation.id);

            return `

                <article class="guest-card">

                    <div class="guest-card-header">

                        <div>

                            <h3>
                                ${escapeHTML(invitation.group_name)}
                            </h3>

                            <p>
                                ${total} vaga(s) reservada(s)
                            </p>

                        </div>

                        <span class="status status-${status.key}">

                            ${status.label}

                        </span>

                    </div>

                    <div class="guest-counts">

                        <div class="guest-count">
                            <strong>${confirmed}</strong>
                            <span>Confirmados</span>
                        </div>

                        <div class="guest-count">
                            <strong>${available ? pending : "—"}</strong>
                            <span>Pendentes</span>
                        </div>

                        <div class="guest-count">
                            <strong>${absent}</strong>
                            <span>Ausentes</span>
                        </div>

                    </div>

                    <div class="guest-actions">

                        <button
                            class="outline-button"
                            data-action="details"
                            data-id="${id}">

                            Detalhes

                        </button>

                        <button
                            class="primary-button"
                            data-action="copy"
                            data-id="${id}"
                            ${disabled}>

                            Copiar link

                        </button>

                        <button
                            class="outline-button"
                            data-action="whatsapp"
                            data-id="${id}"
                            ${disabled}>

                            WhatsApp

                        </button>

                    </div>

                </article>

            `;

        }).join("");

    }


    // =====================================
    // LINKS EXCLUSIVOS
    // =====================================

    function getInvitationLink(invitation) {

        const url = new URL(INVITATION_URL);

        url.searchParams.set(
            "convite",
            invitation.code
        );

        return url.toString();

    }

    async function copyInvitationLink(invitation) {

        if (
            !invitation.active ||
            invitation.needs_review
        ) {

            showToast("Este convite está indisponível.");

            return;

        }

        try {

            await navigator.clipboard.writeText(
                getInvitationLink(invitation)
            );

            showToast("Link exclusivo copiado!");

        } catch (error) {

            showToast(
                "Não foi possível copiar o link."
            );

        }

    }


    // =====================================
    // WHATSAPP
    // =====================================

    function shareWhatsApp(invitation) {

        if (
            !invitation.active ||
            invitation.needs_review
        ) {
            return;
        }

        const link = getInvitationLink(invitation);

        const message = [

            `Olá, ${invitation.group_name}!`,

            "",

            "Com muito amor e carinho, convidamos vocês para celebrar o nosso casamento.",

            "",

            `Reservamos ${invitation.max_guests} lugar(es) exclusivamente para este grupo.`,

            "",

            "O convite é pessoal e intransferível. Pedimos que não seja estendido a outras pessoas sem autorização dos noivos.",

            "",

            "Acesse seu convite exclusivo:",

            link,

            "",

            "Com carinho, Cláudia & Max."

        ].join("\n");

        const whatsappURL =
            "https://wa.me/?text=" +
            encodeURIComponent(message);

        window.open(
            whatsappURL,
            "_blank",
            "noopener,noreferrer"
        );

    }


    // =====================================
    // DETALHES DOS CONVIDADOS
    // =====================================

    function showGuestDetails(invitation) {

        $("dialogTitle").textContent =
            invitation.group_name;

        const status = getStatus(invitation);

        const people = invitation.guests || [];

        const rows = people.map(person => {

            let label = "Pendente";
            let key = "pending";

            if (person.attending === true) {

                label = "Confirmado";
                key = "confirmed";

            } else if (person.attending === false) {

                label = "Ausente";
                key = "absent";

            }

            return `

                <div class="person-row">

                    <span>
                        ${escapeHTML(person.name)}
                    </span>

                    <span class="status status-${key}">
                        ${label}
                    </span>

                </div>

            `;

        }).join("");

        $("dialogContent").innerHTML = `

            <p>
                Vagas autorizadas:
                <strong>
                    ${Number(invitation.max_guests)}
                </strong>
            </p>

            <p>
                Situação:
                <strong>${status.label}</strong>
            </p>

            ${rows}

        `;

        guestDialog.showModal();

    }


    // =====================================
    // EVENTOS DOS CARTOES
    // =====================================

    guestList.addEventListener("click", async (event) => {

        const button = event.target.closest(
            "button[data-action]"
        );

        if (!button || button.disabled) {
            return;
        }

        const invitation = invitations.find(
            item => item.id === button.dataset.id
        );

        if (!invitation) {
            return;
        }

        switch (button.dataset.action) {

            case "details":

                showGuestDetails(invitation);

                break;

            case "copy":

                await copyInvitationLink(invitation);

                break;

            case "whatsapp":

                shareWhatsApp(invitation);

                break;

        }

    });


    // =====================================
    // EXPORTAR CSV
    // =====================================

    function csvCell(value) {

        let text = String(value ?? "");

        // Protecao contra formulas em planilhas.

        if (/^\s*[=+\-@\t\r]/.test(text)) {

            text = "'" + text;

        }

        return `"${text.replace(/"/g, '""')}"`;

    }

    function exportCSV() {

        const rows = [

            [
                "Grupo",
                "Convidado",
                "Vagas autorizadas do grupo",
                "Situação do convite",
                "Presença"
            ]

        ];

        invitations.forEach(invitation => {

            const status = getStatus(invitation);

            (invitation.guests || []).forEach(guest => {

                const attendance =
                    guest.attending === true

                        ? "Confirmado"

                        : guest.attending === false

                            ? "Ausente"

                            : "Pendente";

                rows.push([

                    invitation.group_name,

                    guest.name,

                    invitation.max_guests,

                    status.label,

                    attendance

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

        anchor.download =
            "convidados-claudia-max.csv";

        document.body.appendChild(anchor);

        anchor.click();

        anchor.remove();

        setTimeout(() => {

            URL.revokeObjectURL(url);

        }, 1000);

        showToast("Lista exportada.");

    }


    // =====================================
    // EVENTOS GERAIS
    // =====================================

    searchInput.addEventListener(
        "input",
        renderGuests
    );

    statusFilter.addEventListener(
        "change",
        renderGuests
    );

    $("refreshButton").addEventListener(
        "click",
        loadDashboard
    );

    $("exportButton").addEventListener(
        "click",
        exportCSV
    );

    $("closeDialog").addEventListener(
        "click",
        () => guestDialog.close()
    );

    $("dialogCloseButton").addEventListener(
        "click",
        () => guestDialog.close()
    );


    // =====================================
    // VERIFICAR SESSAO
    // =====================================

    async function initialize() {

        showLogin();

        try {

            const { data, error } =
                await db.auth.getSession();

            if (error) {
                throw error;
            }

            if (data.session) {

                await loadDashboard();

            }

        } catch (error) {

            setMessage(
                loginMessage,
                "Não foi possível verificar a sessão.",
                "error"
            );

        }

    }

    initialize();

});
