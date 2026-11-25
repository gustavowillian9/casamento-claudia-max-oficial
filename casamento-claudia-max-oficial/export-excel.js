
document.addEventListener("DOMContentLoaded", () => {

    "use strict";

    const button = document.getElementById("excelButton");
    const db = window.supabaseClient;

    if (!button || !db) return;

    const COLORS = {
        brown: "382015",
        gold: "B9955E",
        cream: "F3EADF",
        paper: "FFFAF2",
        white: "FFFFFF",
        text: "62422E",
        green: "25864B",
        red: "A33D35",
        yellow: "A47726",
        border: "E2D3BF"
    };

    function fill(color) {
        return {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF" + color }
        };
    }

    function active(invitation) {
        return invitation.active && !invitation.needs_review;
    }

    function invitationStatus(invitation) {

        if (invitation.needs_review) return "Em revisão";
        if (!invitation.active) return "Bloqueado";

        return "Ativo";
    }

    function attendanceStatus(guest) {

        if (guest.attending === true) return "Confirmado";
        if (guest.attending === false) return "Ausente";

        return "Pendente";
    }

    function styleStatus(cell) {

        const value = cell.value;

        const colors = {
            "Confirmado": COLORS.green,
            "Ausente": COLORS.red,
            "Pendente": COLORS.yellow,
            "Ativo": COLORS.green,
            "Bloqueado": COLORS.red,
            "Em revisão": COLORS.yellow
        };

        if (colors[value]) {

            cell.font = {
                name: "Calibri",
                bold: true,
                color: { argb: "FF" + colors[value] }
            };

        }

    }

    function setupSheet(sheet, title, subtitle, headers, widths) {

        const lastColumn = headers.length;

        sheet.properties.defaultRowHeight = 23;
        sheet.properties.tabColor = { argb: "FF" + COLORS.gold };

        sheet.mergeCells(1, 1, 1, lastColumn);

        const titleCell = sheet.getCell("A1");

        titleCell.value = title;
        titleCell.fill = fill(COLORS.brown);

        titleCell.font = {
            name: "Georgia",
            size: 20,
            bold: true,
            color: { argb: "FF" + COLORS.white }
        };

        titleCell.alignment = {
            vertical: "middle",
            horizontal: "center"
        };

        sheet.getRow(1).height = 40;

        sheet.mergeCells(2, 1, 2, lastColumn);

        const subtitleCell = sheet.getCell("A2");

        subtitleCell.value = subtitle;
        subtitleCell.fill = fill(COLORS.cream);

        subtitleCell.font = {
            name: "Calibri",
            size: 11,
            color: { argb: "FF" + COLORS.text }
        };

        subtitleCell.alignment = {
            vertical: "middle",
            horizontal: "center",
            wrapText: true
        };

        sheet.getRow(2).height = 32;

        const header = sheet.getRow(4);

        header.values = headers;
        header.height = 30;

        header.eachCell(cell => {

            cell.fill = fill(COLORS.brown);

            cell.font = {
                name: "Calibri",
                bold: true,
                color: { argb: "FF" + COLORS.white }
            };

            cell.alignment = {
                vertical: "middle",
                horizontal: "center",
                wrapText: true
            };

        });

        widths.forEach((width, index) => {
            sheet.getColumn(index + 1).width = width;
        });

        sheet.views = [{
            state: "frozen",
            ySplit: 4,
            showGridLines: false
        }];

        sheet.pageSetup = {
            paperSize: 9,
            orientation: "landscape",
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 0
        };

        sheet.pageSetup.printTitlesRow = "1:4";

    }

    function addStyledRow(sheet, values) {

        const row = sheet.addRow(values);

        row.height = 25;

        row.eachCell({ includeEmpty: true }, cell => {

            cell.fill = fill(
                row.number % 2 === 0
                    ? COLORS.cream
                    : COLORS.paper
            );

            cell.font = {
                name: "Calibri",
                size: 11,
                color: { argb: "FF" + COLORS.text }
            };

            cell.alignment = {
                vertical: "middle",
                horizontal: typeof cell.value === "number"
                    ? "center"
                    : "left",
                wrapText: true
            };

            cell.border = {
                bottom: {
                    style: "thin",
                    color: { argb: "FF" + COLORS.border }
                }
            };

            styleStatus(cell);

        });

        return row;

    }

    function applyFilter(sheet, columns) {

        sheet.autoFilter = {
            from: { row: 4, column: 1 },
            to: {
                row: Math.max(4, sheet.rowCount),
                column: columns
            }
        };

    }

    async function exportExcel() {

        const dashboard =
            document.getElementById("dashboardScreen");

        if (!dashboard || dashboard.hidden) return;

        button.disabled = true;
        button.textContent = "Gerando Excel...";

        try {

            if (!window.ExcelJS) {
                throw new Error(
                    "Biblioteca Excel indisponível. Atualize a página."
                );
            }

            const { data, error } =
                await db.rpc("admin_dashboard");

            if (error) throw error;

            if (!data || !Array.isArray(data.invitations)) {
                throw new Error("Dados inválidos.");
            }

            if (dashboard.hidden) return;

            const invitations = data.invitations;

            const workbook = new ExcelJS.Workbook();

            workbook.creator = "Casamento Cláudia & Max";
            workbook.created = new Date();

            const date = new Date().toLocaleString("pt-BR", {
                timeZone: "America/Cuiaba"
            });

            const total = Number(data.total_slots || 0);
            const activeSlots = Number(data.active_slots || 0);
            const confirmed = Number(data.confirmed || 0);
            const absent = Number(data.absent || 0);
            const pending = Number(data.pending || 0);

            // ====================================
            // ABA 1 - RESUMO GERAL
            // ====================================

            const summary =
                workbook.addWorksheet("Resumo geral");

            setupSheet(
                summary,
                "Cláudia & Max",
                "Resumo do casamento | Exportado em " + date,
                ["Indicador", "Quantidade", "Descrição"],
                [34, 18, 65]
            );

            const indicators = [

                [
                    "Convites cadastrados",
                    invitations.length,
                    "Total de grupos e famílias"
                ],

                [
                    "Convites ativos",
                    invitations.filter(active).length,
                    "Convites liberados"
                ],

                [
                    "Vagas cadastradas",
                    total,
                    "Todas as vagas autorizadas"
                ],

                [
                    "Vagas ativas",
                    activeSlots,
                    "Vagas disponíveis para confirmação"
                ],

                [
                    "Confirmados",
                    confirmed,
                    "Presenças confirmadas em convites ativos"
                ],

                [
                    "Pendentes",
                    pending,
                    "Convidados ativos que ainda não responderam"
                ],

                [
                    "Ausentes",
                    absent,
                    "Convidados ativos que informaram ausência"
                ],

                [
                    "Vagas indisponíveis",
                    total - activeSlots,
                    "Vagas bloqueadas ou em revisão"
                ],

                [
                    "Progresso das respostas",
                    activeSlots
                        ? (confirmed + absent) / activeSlots
                        : 0,
                    "Proporção de vagas ativas respondidas"
                ]

            ];

            indicators.forEach(item => {

                const row = addStyledRow(summary, item);

                row.getCell(1).font = {
                    name: "Calibri",
                    bold: true,
                    color: { argb: "FF" + COLORS.text }
                };

                if (item[0] === "Confirmados") {

                    row.getCell(2).font = {
                        bold: true,
                        color: { argb: "FF" + COLORS.green }
                    };

                }

                if (item[0] === "Pendentes") {

                    row.getCell(2).font = {
                        bold: true,
                        color: { argb: "FF" + COLORS.yellow }
                    };

                }

                if (item[0] === "Ausentes") {

                    row.getCell(2).font = {
                        bold: true,
                        color: { argb: "FF" + COLORS.red }
                    };

                }

                if (item[0] === "Progresso das respostas") {
                    row.getCell(2).numFmt = "0%";
                }

            });

            // ====================================
            // ABA 2 - GRUPOS E FAMILIAS
            // ====================================

            const groups =
                workbook.addWorksheet("Grupos e famílias");

            setupSheet(
                groups,
                "Grupos e famílias",
                "Uma linha por convite | " + date,
                [
                    "Nº",
                    "Grupo ou família",
                    "Vagas totais",
                    "Vagas ativas",
                    "Confirmados",
                    "Pendentes",
                    "Ausentes",
                    "Indisponíveis",
                    "Situação"
                ],
                [8, 58, 16, 16, 16, 16, 16, 18, 20]
            );

            invitations.forEach((invitation, index) => {

                const enabled = active(invitation);
                const slots = Number(invitation.max_guests || 0);

                const yes = enabled
                    ? Number(invitation.confirmed || 0)
                    : 0;

                const no = enabled
                    ? Number(invitation.absent || 0)
                    : 0;

                addStyledRow(groups, [
                    index + 1,
                    String(invitation.group_name),
                    slots,
                    enabled ? slots : 0,
                    yes,
                    enabled ? Math.max(0, slots - yes - no) : 0,
                    no,
                    enabled ? 0 : slots,
                    invitationStatus(invitation)
                ]);

            });

            applyFilter(groups, 9);

            // ====================================
            // ABA 3 - CONVIDADOS INDIVIDUAIS
            // ====================================

            const guests =
                workbook.addWorksheet("Convidados");

            setupSheet(
                guests,
                "Lista individual de convidados",
                "Uma linha por pessoa | " + date,
                [
                    "Nº",
                    "Convidado",
                    "Grupo ou família",
                    "Situação do convite",
                    "Presença registrada",
                    "Vaga disponível"
                ],
                [8, 36, 58, 24, 24, 20]
            );

            let number = 0;

            invitations.forEach(invitation => {

                (invitation.guests || []).forEach(guest => {

                    number++;

                    addStyledRow(guests, [
                        number,
                        String(guest.name),
                        String(invitation.group_name),
                        invitationStatus(invitation),
                        attendanceStatus(guest),
                        active(invitation) ? "Sim" : "Não"
                    ]);

                });

            });

            applyFilter(guests, 6);

            // ====================================
            // GERAR ARQUIVO XLSX
            // ====================================

            const buffer = await workbook.xlsx.writeBuffer();

            if (dashboard.hidden) return;

            const blob = new Blob([buffer], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            });

            const url = URL.createObjectURL(blob);

            const anchor = document.createElement("a");

            const dateFile = new Date()
                .toISOString()
                .slice(0, 10);

            anchor.href = url;

            anchor.download =
                "Casamento-Claudia-Max-" + dateFile + ".xlsx";

            document.body.appendChild(anchor);

            anchor.click();
            anchor.remove();

            setTimeout(() => URL.revokeObjectURL(url), 30000);

            button.textContent = "Excel exportado!";

            setTimeout(() => {

                button.textContent = "Exportar Excel";

            }, 2500);

        } catch (error) {

            alert(
                "Não foi possível exportar o Excel.\n\n" +
                (error.message || "Tente novamente.")
            );

            button.textContent = "Exportar Excel";

        } finally {

            button.disabled = false;

        }

    }

    button.addEventListener("click", exportExcel);

});
