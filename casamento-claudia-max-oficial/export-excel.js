
/* =========================================
   CLAUDIA & MAX - EXPORTACAO EXCEL V4.3
   Desenvolvido por GUSTAVO WILLIAN
========================================= */

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
        orange: "A66B21",
        border: "E2D3BF"
    };

    const TIMEZONE = "America/Cuiaba";

    function fill(color) {

        return {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF" + color }
        };

    }

    function active(invitation) {

        return invitation.active &&
            !invitation.needs_review;

    }

    function invitationStatus(invitation) {

        if (invitation.needs_review) {
            return "Em revisão";
        }

        if (!invitation.active) {
            return "Bloqueado";
        }

        if (invitation.expires_at) {
            return "Expirado";
        }

        return "Ativo";

    }

    function attendanceStatus(guest) {

        if (guest.attending === true) {
            return "Confirmado";
        }

        if (guest.attending === false) {
            return "Ausente";
        }

        return "Pendente";

    }

    function groupAttendance(invitation) {

        const slots = Number(
            invitation.max_guests || 0
        );

        const yes = Number(
            invitation.confirmed || 0
        );

        const no = Number(
            invitation.absent || 0
        );

        if (yes + no === 0) {
            return "Pendente";
        }

        if (yes + no < slots) {
            return "Parcialmente respondido";
        }

        if (yes === 0) {
            return "Todos ausentes";
        }

        if (no === 0) {
            return "Todos confirmados";
        }

        return "Respondido";

    }

    function formatDate(value) {

        if (!value) return "—";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "—";
        }

        return date.toLocaleString("pt-BR", {
            timeZone: TIMEZONE
        });

    }

    function styleStatus(cell) {

        const colors = {
            "Confirmado": COLORS.green,
            "Ausente": COLORS.red,
            "Pendente": COLORS.yellow,
            "Ativo": COLORS.green,
            "Expirado": COLORS.orange,
            "Bloqueado": COLORS.red,
            "Em revisão": COLORS.yellow,
            "Todos confirmados": COLORS.green,
            "Todos ausentes": COLORS.red,
            "Respondido": COLORS.green,
            "Parcialmente respondido": COLORS.yellow
        };

        if (
            typeof cell.value === "string" &&
            Object.hasOwn(colors, cell.value)
        ) {

            cell.font = {
                name: "Calibri",
                bold: true,
                color: {
                    argb: "FF" + colors[cell.value]
                }
            };

        }

    }

    function setupSheet(
        sheet,
        title,
        subtitle,
        headers,
        widths
    ) {

        const lastColumn = headers.length;

        sheet.properties.defaultRowHeight = 23;

        sheet.properties.tabColor = {
            argb: "FF" + COLORS.gold
        };

        sheet.mergeCells(
            1, 1, 1, lastColumn
        );

        const titleCell = sheet.getCell("A1");

        titleCell.value = title;
        titleCell.fill = fill(COLORS.brown);

        titleCell.font = {
            name: "Georgia",
            size: 20,
            bold: true,
            color: {
                argb: "FF" + COLORS.white
            }
        };

        titleCell.alignment = {
            vertical: "middle",
            horizontal: "center"
        };

        sheet.getRow(1).height = 40;

        sheet.mergeCells(
            2, 1, 2, lastColumn
        );

        const subtitleCell = sheet.getCell("A2");

        subtitleCell.value = subtitle;
        subtitleCell.fill = fill(COLORS.cream);

        subtitleCell.font = {
            name: "Calibri",
            size: 11,
            color: {
                argb: "FF" + COLORS.text
            }
        };

        subtitleCell.alignment = {
            vertical: "middle",
            horizontal: "center",
            wrapText: true
        };

        sheet.getRow(2).height = 32;

        const header = sheet.getRow(4);

        header.values = headers;
        header.height = 34;

        header.eachCell(cell => {

            cell.fill = fill(COLORS.brown);

            cell.font = {
                name: "Calibri",
                bold: true,
                color: {
                    argb: "FF" + COLORS.white
                }
            };

            cell.alignment = {
                vertical: "middle",
                horizontal: "center",
                wrapText: true
            };

        });

        widths.forEach((width, index) => {

            sheet.getColumn(index + 1).width =
                width;

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

        row.height = 32;

        row.eachCell(
            { includeEmpty: true },
            cell => {

                cell.fill = fill(
                    row.number % 2 === 0
                        ? COLORS.cream
                        : COLORS.paper
                );

                cell.font = {
                    name: "Calibri",
                    size: 11,
                    color: {
                        argb: "FF" + COLORS.text
                    }
                };

                cell.alignment = {
                    vertical: "middle",
                    horizontal:
                        typeof cell.value === "number"
                            ? "center"
                            : "left",
                    wrapText: true
                };

                cell.border = {
                    bottom: {
                        style: "thin",
                        color: {
                            argb: "FF" + COLORS.border
                        }
                    }
                };

                styleStatus(cell);

            }
        );

        return row;

    }

    function applyFilter(sheet, columns) {

        sheet.autoFilter = {
            from: {
                row: 4,
                column: 1
            },
            to: {
                row: Math.max(
                    4,
                    sheet.rowCount
                ),
                column: columns
            }
        };

    }

    async function exportExcel() {

        const dashboard =
            document.getElementById(
                "dashboardScreen"
            );

        if (!dashboard || dashboard.hidden) {
            return;
        }

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

            if (
                !data ||
                !Array.isArray(data.invitations)
            ) {

                throw new Error(
                    "Dados inválidos."
                );

            }

            if (dashboard.hidden) return;

            const invitations = data.invitations;

            const workbook =
                new window.ExcelJS.Workbook();

            workbook.creator =
                "GUSTAVO WILLIAN";

            workbook.title =
                "Casamento Cláudia & Max";

            workbook.subject =
                "Relatório de convidados V4.3";

            workbook.created = new Date();

            const date = formatDate(new Date());

            const total =
                Number(data.total_slots || 0);

            const activeSlots =
                Number(data.active_slots || 0);

            const confirmed =
                Number(data.confirmed || 0);

            const absent =
                Number(data.absent || 0);

            const pending =
                Number(data.pending || 0);

            const activeLinks = invitations.filter(
                item =>
                    invitationStatus(item) === "Ativo"
            ).length;

            const expiredLinks = invitations.filter(
                item =>
                    invitationStatus(item) === "Expirado"
            ).length;

            const blockedLinks = invitations.filter(
                item =>
                    invitationStatus(item) === "Bloqueado"
            ).length;

            const reviewLinks = invitations.filter(
                item =>
                    invitationStatus(item) === "Em revisão"
            ).length;

            // ====================================
            // ABA 1 - RESUMO GERAL
            // ====================================

            const summary =
                workbook.addWorksheet("Resumo geral");

            setupSheet(
                summary,
                "Cláudia & Max",
                "Resumo do casamento V4.3 | Exportado em " + date,
                [
                    "Indicador",
                    "Quantidade",
                    "Descrição"
                ],
                [36, 18, 80]
            );

            const indicators = [

                [
                    "Convites cadastrados",
                    invitations.length,
                    "Total de grupos e famílias"
                ],

                [
                    "Links ativos",
                    activeLinks,
                    "Links liberados para acesso"
                ],

                [
                    "Links expirados",
                    expiredLinks,
                    "Links encerrados, com respostas preservadas"
                ],

                [
                    "Links bloqueados",
                    blockedLinks,
                    "Links bloqueados pela administração"
                ],

                [
                    "Links em revisão",
                    reviewLinks,
                    "Convites aguardando liberação"
                ],

                [
                    "Vagas cadastradas",
                    total,
                    "Todas as vagas autorizadas"
                ],

                [
                    "Vagas ativas",
                    activeSlots,
                    "Vagas de convites liberados, incluindo links expirados"
                ],

                [
                    "Confirmados",
                    confirmed,
                    "Presenças confirmadas em convites liberados"
                ],

                [
                    "Pendentes",
                    pending,
                    "Convidados de grupos liberados sem resposta"
                ],

                [
                    "Ausentes",
                    absent,
                    "Ausências registradas em convites liberados"
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

            const indicatorColors = {
                "Links ativos": COLORS.green,
                "Links expirados": COLORS.orange,
                "Links bloqueados": COLORS.red,
                "Links em revisão": COLORS.yellow,
                "Confirmados": COLORS.green,
                "Pendentes": COLORS.yellow,
                "Ausentes": COLORS.red
            };

            indicators.forEach(item => {

                const row =
                    addStyledRow(summary, item);

                row.getCell(1).font = {
                    name: "Calibri",
                    bold: true,
                    color: {
                        argb: "FF" + COLORS.text
                    }
                };

                if (indicatorColors[item[0]]) {

                    row.getCell(2).font = {
                        name: "Calibri",
                        bold: true,
                        size: 12,
                        color: {
                            argb:
                                "FF" +
                                indicatorColors[item[0]]
                        }
                    };

                }

                if (
                    item[0] ===
                    "Progresso das respostas"
                ) {

                    row.getCell(2).numFmt = "0%";

                }

            });

            // ====================================
            // ABA 2 - GRUPOS E FAMILIAS
            // ====================================

            const groups =
                workbook.addWorksheet(
                    "Grupos e famílias"
                );

            setupSheet(
                groups,
                "Grupos e famílias",
                "Controle de convites e segurança | " + date,
                [
                    "Nº",
                    "Grupo ou família",
                    "Vagas totais",
                    "Vagas ativas",
                    "Confirmados",
                    "Pendentes",
                    "Ausentes",
                    "Indisponíveis",
                    "Situação do link",
                    "Situação da resposta",
                    "Encerrado em",
                    "Reativado em"
                ],
                [
                    8,
                    58,
                    15,
                    15,
                    15,
                    15,
                    15,
                    17,
                    22,
                    28,
                    26,
                    26
                ]
            );

            invitations.forEach(
                (invitation, index) => {

                    const enabled =
                        active(invitation);

                    const slots = Number(
                        invitation.max_guests || 0
                    );

                    const yes = Number(
                        invitation.confirmed || 0
                    );

                    const no = Number(
                        invitation.absent || 0
                    );

                    const remaining =
                        Math.max(
                            0,
                            slots - yes - no
                        );

                    addStyledRow(groups, [

                        index + 1,

                        String(
                            invitation.group_name || ""
                        ),

                        slots,

                        enabled ? slots : 0,

                        yes,

                        remaining,

                        no,

                        enabled ? 0 : slots,

                        invitationStatus(invitation),

                        groupAttendance(invitation),

                        formatDate(
                            invitation.expires_at
                        ),

                        formatDate(
                            invitation.reactivated_at
                        )

                    ]);

                }
            );

            applyFilter(groups, 12);

            // ====================================
            // ABA 3 - CONVIDADOS INDIVIDUAIS
            // ====================================

            const guests =
                workbook.addWorksheet(
                    "Convidados"
                );

            setupSheet(
                guests,
                "Lista individual de convidados",
                "Uma linha por pessoa | " + date,
                [
                    "Nº",
                    "Convidado",
                    "Grupo ou família",
                    "Situação do link",
                    "Presença registrada",
                    "Vaga autorizada ativa",
                    "Link disponível",
                    "Encerrado em",
                    "Reativado em"
                ],
                [
                    8,
                    36,
                    58,
                    24,
                    24,
                    24,
                    22,
                    26,
                    26
                ]
            );

            let number = 0;

            invitations.forEach(invitation => {

                const status =
                    invitationStatus(invitation);

                (invitation.guests || [])
                    .forEach(guest => {

                        number++;

                        addStyledRow(guests, [

                            number,

                            String(guest.name || ""),

                            String(
                                invitation.group_name || ""
                            ),

                            status,

                            attendanceStatus(guest),

                            active(invitation)
                                ? "Sim"
                                : "Não",

                            status === "Ativo"
                                ? "Sim"
                                : "Não",

                            formatDate(
                                invitation.expires_at
                            ),

                            formatDate(
                                invitation.reactivated_at
                            )

                        ]);

                    });

            });

            applyFilter(guests, 9);

            // ====================================
            // GERAR ARQUIVO XLSX
            // ====================================

            const buffer =
                await workbook.xlsx.writeBuffer();

            if (dashboard.hidden) return;

            const blob = new Blob([buffer], {

                type:
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

            });

            const url =
                URL.createObjectURL(blob);

            const anchor =
                document.createElement("a");

            const dateFile =
                new Intl.DateTimeFormat("en-CA", {
                    timeZone: TIMEZONE,
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit"
                }).format(new Date());

            anchor.href = url;

            anchor.download =
                "Casamento-Claudia-Max-V4.3-" +
                dateFile +
                ".xlsx";

            document.body.appendChild(anchor);

            anchor.click();
            anchor.remove();

            setTimeout(() => {

                URL.revokeObjectURL(url);

            }, 30000);

            button.textContent =
                "Excel exportado!";

            setTimeout(() => {

                if (!button.disabled) {

                    button.textContent =
                        "Exportar Excel";

                }

            }, 2500);

        } catch (error) {

            alert(
                "Não foi possível exportar o Excel.\n\n" +
                (error.message || "Tente novamente.")
            );

            button.textContent =
                "Exportar Excel";

        } finally {

            button.disabled = false;

            if (
                button.textContent ===
                "Gerando Excel..."
            ) {

                button.textContent =
                    "Exportar Excel";

            }

        }

    }

    button.addEventListener(
        "click",
        exportExcel
    );

});
