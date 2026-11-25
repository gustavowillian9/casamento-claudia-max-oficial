
/* =========================================
   CLAUDIA & MAX - SEGURANCA V4.3
   Desenvolvido por GUSTAVO WILLIAN
========================================= */

document.addEventListener("DOMContentLoaded", () => {

    "use strict";

    const db = window.supabaseClient;
    const $ = id => document.getElementById(id);

    const dashboard = $("dashboardScreen");
    const guestList = $("guestList");
    const manageContent = $("manageContent");
    const manageDialog = $("manageDialog");

    if (!db || !dashboard || !guestList ||
        !manageContent || !manageDialog) return;

    let invitations = [];
    let selectedId = null;
    let busy = false;
    let requestVersion = 0;
    let historyVersion = 0;

    function esc(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function date(value) {

        if (!value) return "Não registrado";

        const parsed = new Date(value);

        if (Number.isNaN(parsed.getTime())) {
            return "Data indisponível";
        }

        return parsed.toLocaleString("pt-BR");

    }

    function linkStatus(invitation) {

        if (invitation.needs_review) return "review";

        if (!invitation.active) return "blocked";

        if (invitation.expires_at) return "expired";

        return "active";

    }

    function findInvitation(id) {

        return invitations.find(
            item => item.id === id
        );

    }

    async function rpc(name, params = {}) {

        const { data, error } =
            await db.rpc(name, params);

        if (error) throw error;

        if (data?.success === false) {
            throw new Error(
                data.message || "Operação não autorizada."
            );
        }

        return data;

    }

    // =====================================
    // INDICADORES DE SEGURANCA
    // =====================================

    function createSummary() {

        if ($("securitySummary")) return;

        const section = document.createElement("section");

        section.id = "securitySummary";
        section.className = "security-panel";

        section.innerHTML = `
            <h3>Segurança dos convites</h3>

            <div class="security-summary">

                <div class="security-stat active">
                    <strong id="securityActive">—</strong>
                    <span>Links ativos</span>
                </div>

                <div class="security-stat expired">
                    <strong id="securityExpired">—</strong>
                    <span>Links expirados</span>
                </div>

                <div class="security-stat blocked">
                    <strong id="securityBlocked">—</strong>
                    <span>Indisponíveis</span>
                </div>

            </div>

            <p id="securitySummaryStatus"
                aria-live="polite">
                Carregando informações...
            </p>

            <label for="securityFilter">
                Filtrar por situação do link
            </label>

            <select id="securityFilter">
                <option value="all">Todos os links</option>
                <option value="active">Links ativos</option>
                <option value="expired">Links expirados</option>
                <option value="blocked">Bloqueados</option>
                <option value="review">Em revisão</option>
            </select>
        `;

        guestList.before(section);

        $("securityFilter").addEventListener(
            "change",
            decorateCards
        );

    }

    function updateSummary() {

        createSummary();

        $("securityActive").textContent =
            invitations.filter(
                item => linkStatus(item) === "active"
            ).length;

        $("securityExpired").textContent =
            invitations.filter(
                item => linkStatus(item) === "expired"
            ).length;

        $("securityBlocked").textContent =
            invitations.filter(
                item => ["blocked", "review"]
                    .includes(linkStatus(item))
            ).length;

        $("securitySummaryStatus").textContent =
            "Situação dos links exclusivos.";

    }

    // =====================================
    // ATUALIZAR LISTA DE CONVITES
    // =====================================

    function decorateCards() {

        const filter =
            $("securityFilter")?.value || "all";

        const cards = guestList.querySelectorAll(
            ".guest-card"
        );

        let visible = 0;

        cards.forEach(card => {

            const manage = card.querySelector(
                '[data-action="manage"]'
            );

            if (!manage) return;

            const invitation = findInvitation(
                manage.dataset.id
            );

            if (!invitation) return;

            const status = linkStatus(invitation);

            const show =
                filter === "all" || filter === status;

            card.hidden = !show;

            if (show) visible++;

            const badge = card.querySelector(
                ".guest-card-header .status"
            );

            if (badge && status === "expired") {

                badge.className =
                    "status status-expired";

                badge.textContent =
                    "Link expirado";

            }

            if (status !== "active") {

                card.querySelectorAll(
                    '[data-action="copy"],' +
                    '[data-action="whatsapp"]'
                ).forEach(button => {

                    button.disabled = true;

                });

            }

        });

        if ($("resultsCount") && cards.length) {

            $("resultsCount").textContent =
                `${visible} de ${invitations.length} convites`;

        }

    }

    // =====================================
    // CONSULTAR BANCO
    // =====================================

    async function refreshSecurity() {

        if (dashboard.hidden) return;

        const version = ++requestVersion;

        try {

            const data = await rpc(
                "admin_dashboard"
            );

            if (dashboard.hidden ||
                version !== requestVersion) return;

            if (!Array.isArray(data?.invitations)) {
                throw new Error("Dados inválidos.");
            }

            invitations = data.invitations;

            updateSummary();
            decorateCards();
            decorateManage();

        } catch (error) {

            if (dashboard.hidden ||
                version !== requestVersion) return;

            createSummary();

            $("securitySummaryStatus").textContent =
                "Não foi possível atualizar a segurança. Clique em Atualizar.";

        }

    }

    // =====================================
    // HISTORICO
    // =====================================

    async function loadHistory(id, target) {

        const version = ++historyVersion;

        target.textContent =
            "Carregando histórico...";

        try {

            const data = await rpc(
                "admin_get_invitation_history",
                { p_invitation_id: id }
            );

            if (version !== historyVersion ||
                !target.isConnected ||
                selectedId !== id ||
                dashboard.hidden) return;

            const history = data.history || [];

            if (!history.length) {

                target.textContent =
                    "Nenhum evento de segurança registrado.";

                return;

            }

            const labels = {
                expired: "Convite encerrado",
                reactivated: "Convite reativado",
                code_regenerated: "Novo link gerado"
            };

            target.innerHTML = history.map(item => {

                const type =
                    Object.hasOwn(labels, item.event_type)
                        ? item.event_type
                        : "unknown";

                const administrator =
                    item.administrator ||
                    (type === "expired"
                        ? "Sistema automático"
                        : "Administrador não identificado");

                return `
                    <article class="security-history-item ${type}">

                        <strong>
                            ${esc(labels[type] || "Evento")}
                        </strong>

                        <p>${esc(item.details || "")}</p>

                        <p>
                            Responsável:
                            ${esc(administrator)}
                        </p>

                        <time>
                            ${esc(date(item.created_at))}
                        </time>

                    </article>
                `;

            }).join("");

        } catch (error) {

            if (version !== historyVersion ||
                !target.isConnected) return;

            target.textContent =
                "Não foi possível carregar o histórico.";

        }

    }

    // =====================================
    // GERENCIAMENTO DE SEGURANCA
    // =====================================

    function decorateManage() {

        if (!manageDialog.open || !selectedId) return;

        const invitation =
            findInvitation(selectedId);

        if (!invitation) return;

        const status = linkStatus(invitation);

        const existing = $("invitationSecurityPanel");

        if (existing) return;

        if (status !== "active") {

            manageContent.querySelectorAll(
                '[data-manage="copy"],' +
                '[data-manage="whatsapp"]'
            ).forEach(button => {

                button.disabled = true;

            });

        }

        if (status === "expired") {

            const regenerate = manageContent.querySelector(
                '[data-manage="regenerate"]'
            );

            if (regenerate) regenerate.disabled = true;

        }

        const panel = document.createElement("section");

        panel.id = "invitationSecurityPanel";
        panel.className = "security-panel";

        const labels = {
            active: "Ativo",
            expired: "Expirado",
            blocked: "Bloqueado",
            review: "Em revisão"
        };

        panel.innerHTML = `
            <h3>Segurança do link exclusivo</h3>

            <p>
                Situação:
                <strong>${labels[status]}</strong>
            </p>

            ${invitation.expires_at ? `
                <p class="security-date">
                    Encerrado em:
                    ${esc(date(invitation.expires_at))}
                </p>
            ` : ""}

            ${invitation.reactivated_at ? `
                <p class="security-date">
                    Última reativação:
                    ${esc(date(invitation.reactivated_at))}
                </p>
            ` : ""}

            ${status === "expired" ? `

                <div class="security-warning">
                    Este convite foi encerrado.
                    As respostas anteriores permanecem salvas.
                </div>

                <div class="security-actions">

                    <button type="button"
                        class="security-reactivate"
                        data-security="reactivate">
                        Reativar convite
                    </button>

                    <button type="button"
                        class="security-regenerate"
                        data-security="rotate">
                        Reativar e gerar novo link
                    </button>

                </div>

            ` : ""}

            <p id="securityManageMessage"
                aria-live="polite"></p>

            <div class="security-history">

                <h3>Histórico de segurança</h3>

                <div id="securityHistoryList"
                    class="security-history-list">
                </div>

            </div>
        `;

        manageContent.prepend(panel);

        loadHistory(
            invitation.id,
            $("securityHistoryList")
        );

    }

    // =====================================
    // REATIVAR CONVITE
    // =====================================

    async function reactivate(rotate) {

        if (busy || dashboard.hidden) return;

        const invitation =
            findInvitation(selectedId);

        if (!invitation ||
            linkStatus(invitation) !== "expired") return;

        const confirmation = rotate
            ? "Reativar o convite e invalidar o link anterior?"
            : "Reativar o link original? Quem já possui esse link poderá acessá-lo novamente.";

        if (!window.confirm(confirmation)) return;

        busy = true;

        const id = invitation.id;
        const panel = $("invitationSecurityPanel");

        panel?.querySelectorAll("button")
            .forEach(button => {
                button.disabled = true;
            });

        const message = $("securityManageMessage");

        if (message) {
            message.textContent = "Reativando...";
        }

        let saved = false;

        try {

            const result = await rpc(
                "admin_reactivate_invitation",
                {
                    p_invitation_id: id,
                    p_regenerate_code: rotate
                }
            );

            if (result?.success !== true) {
                throw new Error(
                    "Não foi possível reativar."
                );
            }

            saved = true;

            if (dashboard.hidden) return;

            if (manageDialog.open) {
                manageDialog.close();
            }

            $("refreshButton")?.click();

            await refreshSecurity();

            window.alert(
                rotate
                    ? "Convite reativado! Abra o gerenciamento para copiar o novo link."
                    : "Convite reativado com sucesso!"
            );

        } catch (error) {

            if (message?.isConnected) {

                message.textContent = saved
                    ? "Convite reativado. Atualize o painel."
                    : error.message;

            }

        } finally {

            busy = false;

            panel?.querySelectorAll("button")
                .forEach(button => {
                    button.disabled = false;
                });

        }

    }

    // =====================================
    // EVENTOS
    // =====================================

    guestList.addEventListener("click", event => {

        const button = event.target.closest(
            '[data-action="manage"]'
        );

        if (!button || button.disabled) return;

        selectedId = button.dataset.id;

        queueMicrotask(() => {

            decorateManage();

            refreshSecurity();

        });

    }, true);

    manageContent.addEventListener("click", event => {

        const button = event.target.closest(
            "[data-security]"
        );

        if (!button || button.disabled) return;

        event.preventDefault();

        reactivate(
            button.dataset.security === "rotate"
        );

    });

    // Impedir compartilhamento de links
    // identificados como indisponiveis.

    document.addEventListener("click", event => {

        const button = event.target.closest(
            '[data-action="copy"],' +
            '[data-action="whatsapp"],' +
            '[data-manage="copy"],' +
            '[data-manage="whatsapp"]'
        );

        if (!button) return;

        const id =
            button.dataset.id || selectedId;

        const invitation = findInvitation(id);

        if (!invitation ||
            linkStatus(invitation) !== "active") {

            event.preventDefault();
            event.stopImmediatePropagation();

            window.alert(
                "Link indisponível. Atualize o painel ou reative o convite."
            );

        }

    }, true);

    manageDialog.addEventListener("close", () => {

        selectedId = null;
        historyVersion++;

    });

    new MutationObserver(() => {

        decorateCards();

        refreshSecurity();

    }).observe(guestList, {
        childList: true
    });

    new MutationObserver(() => {

        decorateManage();

    }).observe(manageContent, {
        childList: true
    });

    new MutationObserver(() => {

        if (dashboard.hidden) {

            invitations = [];
            selectedId = null;

            requestVersion++;
            historyVersion++;

            $("securitySummary")?.remove();

        } else {

            refreshSecurity();

        }

    }).observe(dashboard, {
        attributes: true,
        attributeFilter: ["hidden"]
    });

    if (!dashboard.hidden) {
        refreshSecurity();
    }

});
