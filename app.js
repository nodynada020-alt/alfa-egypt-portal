(function () {
    const pageName = location.pathname.split(/[\\/]/).pop() || "dashboard.html";

    fitDesktopViewportOnPhones();
    injectGeneratorLink();
    seedLocalTables();
    setTimeout(() => {
        seedLocalTables();
        renderLocalQrCodes();
    }, 250);
    setTimeout(() => {
        seedLocalTables();
        renderLocalQrCodes();
    }, 1000);
    renderLocalQrCodes();
    wireLocalFilters();
    wireMobileDesktopSidebar();
    fillLocalCreateForm();

    function fitDesktopViewportOnPhones() {
        if (!window.matchMedia("(max-width: 991px)").matches) {
            return;
        }

        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
            viewport.setAttribute("content", "width=1200, initial-scale=0.32, minimum-scale=0.25, maximum-scale=1.2, user-scalable=yes");
        }

        document.documentElement.classList.add("desktop-phone-view");
    }

    document.querySelectorAll('a[href="#"], a[href="javascript:;"]').forEach((link) => {
        if (link.classList.contains("logout_btn")) {
            return;
        }

        link.addEventListener("click", (event) => {
            const menu = link.closest(".menu-accordion");
            if (!menu) {
                return;
            }

            event.preventDefault();
            menu.classList.toggle("show");
            const submenu = menu.querySelector(".menu-sub");
            if (submenu) {
                submenu.style.display = submenu.style.display === "block" ? "none" : "block";
            }
        });
    });

    document.querySelectorAll(".logout_btn").forEach((button) => {
        button.addEventListener("click", (event) => {
            event.preventDefault();
            window.location.href = "index.html";
        });
    });

    document.querySelectorAll('a[href="' + pageName + '"]').forEach((link) => {
        link.classList.add("active");
        const item = link.closest(".menu-accordion");
        if (item) {
            item.classList.add("show");
            const submenu = item.querySelector(".menu-sub");
            if (submenu) {
                submenu.style.display = "block";
            }
        }
    });

    document.querySelectorAll('[data-kt-element="mode"]').forEach((button) => {
        button.addEventListener("click", (event) => {
            event.preventDefault();
            const mode = button.getAttribute("data-kt-value") || "light";
            const resolvedMode = mode === "system"
                ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
                : mode;

            document.documentElement.setAttribute("data-bs-theme", resolvedMode);
            localStorage.setItem("data-bs-theme", mode);
        });
    });

    document.querySelectorAll("form").forEach((form) => {
        if (form.getAttribute("action") && form.getAttribute("action") !== "#") {
            return;
        }

        form.addEventListener("submit", (event) => {
            event.preventDefault();
            const submitter = event.submitter || form.querySelector('[type="submit"]');
            const oldText = submitter ? submitter.textContent : "";

            if (submitter) {
                submitter.disabled = true;
                submitter.textContent = "Saved";
            }

            const formData = Object.fromEntries(new FormData(form).entries());
            const key = "alfa-local-" + pageName.replace(".html", "");
            const records = JSON.parse(localStorage.getItem(key) || "[]");
            records.push({ ...formData, savedAt: new Date().toISOString() });
            localStorage.setItem(key, JSON.stringify(records));

            showLocalNotice("Saved successfully");

            setTimeout(() => {
                if (submitter) {
                    submitter.disabled = false;
                    submitter.textContent = oldText;
                }
            }, 900);
        });
    });

    document.querySelectorAll("table").forEach((table) => {
        const wrapper = table.closest(".card, .table-responsive, .app-content") || document;
        const search = wrapper.querySelector('input[type="search"], input[data-kt-filter="search"], input[placeholder*="Search"], input[placeholder*="search"]');

        if (search) {
            search.addEventListener("input", () => {
                const value = search.value.trim().toLowerCase();
                table.querySelectorAll("tbody tr").forEach((row) => {
                    row.style.display = row.textContent.toLowerCase().includes(value) ? "" : "none";
                });
            });
        }
    });

    document.addEventListener("click", (event) => {
        const target = event.target.closest('[data-kt-action="delete_row"], .delete, .delete_btn, .delete-row');
        if (!target) {
            return;
        }

        event.preventDefault();
        const row = target.closest("tr");
        if (row && confirm("Delete this item?")) {
            row.remove();
            showLocalNotice("Deleted locally");
        }
    });

    function showLocalNotice(message) {
        let notice = document.querySelector(".local-toast");
        if (!notice) {
            notice = document.createElement("div");
            notice.className = "local-toast";
            document.body.appendChild(notice);
        }

        notice.textContent = message;
        notice.classList.add("show");

        clearTimeout(showLocalNotice.timer);
        showLocalNotice.timer = setTimeout(() => {
            notice.classList.remove("show");
        }, 1800);
    }

    function wireLocalFilters() {
        document.addEventListener("click", (event) => {
            const searchButton = event.target.closest("#searchBtn");
            if (!searchButton) {
                return;
            }

            event.preventDefault();
            event.stopImmediatePropagation();
            applyLocalFilters(searchButton);
        }, true);

        document.addEventListener("submit", (event) => {
            const form = event.target.closest("form");
            if (!form || !form.querySelector("#searchBtn")) {
                return;
            }

            event.preventDefault();
            event.stopImmediatePropagation();
            applyLocalFilters(form.querySelector("#searchBtn"));
        }, true);

        document.querySelectorAll(".reset-filters").forEach((button) => {
            button.addEventListener("click", (event) => {
                event.preventDefault();
                event.stopImmediatePropagation();
                resetLocalFilters(button);
            }, true);
        });
    }

    function wireMobileDesktopSidebar() {
        if (document.documentElement.classList.contains("desktop-phone-view")) {
            document.body.classList.remove("mobile-sidebar-closed");
            return;
        }

        const toggle = document.getElementById("kt_app_sidebar_mobile_toggle");
        const sidebar = document.getElementById("kt_app_sidebar");
        if (!toggle || !sidebar) {
            return;
        }

        if (window.innerWidth <= 991 && !document.body.dataset.mobileSidebarReady) {
            document.body.classList.add("mobile-sidebar-closed");
            document.body.dataset.mobileSidebarReady = "true";
        }

        toggle.addEventListener("click", (event) => {
            if (window.innerWidth > 991) {
                return;
            }

            event.preventDefault();
            event.stopImmediatePropagation();
            document.body.classList.toggle("mobile-sidebar-closed");
        }, true);

        document.addEventListener("click", (event) => {
            if (window.innerWidth > 991 || document.body.classList.contains("mobile-sidebar-closed")) {
                return;
            }

            if (!sidebar.contains(event.target) && !toggle.contains(event.target)) {
                document.body.classList.add("mobile-sidebar-closed");
            }
        });
    }

    function seedLocalTables() {
        const table = document.querySelector("#datatables");
        if (!table) {
            return;
        }

        if (window.jQuery && jQuery.fn && jQuery.fn.DataTable && jQuery.fn.DataTable.isDataTable(table)) {
            jQuery(table).DataTable().destroy();
        }

        const tbody = table.querySelector("tbody") || table.appendChild(document.createElement("tbody"));
        const route = pageName.replace(".html", "");
        const rows = (window.ALFA_ORIGINAL_DATA && window.ALFA_ORIGINAL_DATA[route]) || null;
        const columnsByPage = {
            "report.html": ["qr", "code", "report", "client", "project", "status", "contractor", "location", "tested_item", "created_by", "created_at", "action"],
            "certificate.html": ["qr", "code", "client", "device", "serial_no", "manufacturer", "calibration_date", "expires_on", "status", "created_by", "created_at", "action"],
            "project.html": ["code", "title", "created_by", "status", "created_at", "action"],
            "client.html": ["code", "title", "phone", "email", "address", "created_by", "status", "created_at", "action"],
            "device.html": ["code", "title", "created_by", "status", "created_at", "action"],
            "reviewer.html": ["code", "title", "created_by", "status", "created_at", "action"],
            "staff.html": ["user_profile_image", "name", "status", "created_at", "updated_at", "action"],
            "role.html": ["code", "name", "created_by", "created_at", "action"],
            "quotations.html": ["code", "client", "project", "created_by", "status", "created_at", "action"],
            "conditions.html": ["code", "title", "created_by", "status", "created_at", "action"],
            "assesments.html": ["code", "title", "created_by", "created_at", "action"]
        };
        const columns = columnsByPage[pageName] || columnsByPage[route];

        if (!rows || !columns) {
            return;
        }

        tbody.innerHTML = "";

        if (!rows.length) {
            const colspan = table.querySelectorAll("thead td, thead th").length || columns.length || 1;
            tbody.innerHTML = `<tr><td colspan="${colspan}" class="text-muted py-10">No data available in table</td></tr>`;
            return;
        }

        rows.forEach((record) => {
            const row = document.createElement("tr");
            row.innerHTML = columns.map((key) => {
                const value = record[key] ?? "";
                if (key === "qr") {
                    const qrText = buildQrText(route, record);
                    return `<td><div class="table-qr-code" data-qr="${escapeAttribute(qrText)}"></div></td>`;
                }
                if (key === "action") {
                    return `<td>${localActionButtons(route, record)}</td>`;
                }
                return `<td>${value}</td>`;
            }).join("");
            tbody.appendChild(row);
        });
    }

    function buildQrText(route, record) {
        const code = record.code || record.id || "";
        return [
            "ALFA EGYPT VERIFICATION",
            `TYPE: ${String(route || "record").toUpperCase()}`,
            "STATUS: VALID",
            `CODE: ${stripHtml(code)}`,
            record.client ? `CLIENT: ${stripHtml(record.client)}` : "",
            record.project || record.title ? `PROJECT: ${stripHtml(record.project || record.title)}` : ""
        ].filter(Boolean).join("\n");
    }

    function localActionButtons(route, record) {
        const code = encodeURIComponent(record.code || record.id || "");
        const createMap = {
            report: "pdf-generator.html",
            certificate: "certificate-create.html",
            project: "project-create.html",
            client: "client-create.html",
            device: "device-create.html",
            reviewer: "reviewer-create.html",
            staff: "staff-create.html",
            role: "role-create.html",
            quotations: "quotations-create.html",
            conditions: "conditions-create.html",
            assesments: "assesments-create.html"
        };
        const generatorRoute = route === "report" || route === "certificate";
        const viewHref = route === "report"
            ? `pdf-generator.html?source=report&code=${code}`
            : route === "certificate"
                ? `pdf-generator.html?source=certificate&code=${code}`
                : `${createMap[route] || "#"}?code=${code}`;
        const editHref = generatorRoute ? viewHref : `${createMap[route] || "#"}?code=${code}`;

        return `
            <div class="d-flex justify-content-center flex-shrink-0 gap-2 local-actions">
                <a href="${viewHref}" class="btn btn-sm btn-light-primary" title="View">
                    View
                </a>
                <a href="${editHref}" class="btn btn-sm btn-light-warning" title="Edit">
                    Edit
                </a>
                <button type="button" class="btn btn-sm btn-light-danger delete-row" title="Delete">
                    Delete
                </button>
            </div>
        `;
    }

    function renderLocalQrCodes() {
        document.querySelectorAll(".table-qr-code").forEach((target) => {
            if (target.dataset.rendered === "true") {
                return;
            }

            const text = target.dataset.qr || "ALFA Egypt";
            target.innerHTML = "";

            if (typeof QRCode !== "undefined") {
                new QRCode(target, {
                    text,
                    width: 54,
                    height: 54,
                    correctLevel: QRCode.CorrectLevel.M
                });
                target.dataset.rendered = "true";
            } else {
                target.textContent = "QR";
            }
        });
    }

    function applyLocalFilters(source) {
        const filterBox = source.closest(".filter-box") || document.querySelector(".filter-box") || document;
        const values = [...filterBox.querySelectorAll("input, select, textarea")]
            .filter((field) => !["hidden", "submit", "button"].includes(field.type))
            .map((field) => selectedFieldText(field))
            .filter(Boolean);

        const freeSearch = document.querySelector("#datatables_search_input");
        if (freeSearch && freeSearch.value.trim()) {
            values.push(freeSearch.value.trim().toLowerCase());
        }

        const tables = [...document.querySelectorAll("table")];
        let affectedRows = 0;

        tables.forEach((table) => {
            table.querySelectorAll("tbody tr").forEach((row) => {
                const haystack = row.textContent.toLowerCase();
                const visible = values.length === 0 || values.every((value) => haystack.includes(value));
                row.style.display = visible ? "" : "none";
                if (visible) {
                    affectedRows += 1;
                }
            });
        });

        const label = source.querySelector(".indicator-label");
        if (label) {
            label.textContent = "Search";
        }

        showLocalNotice(values.length ? `Filters applied${tables.length ? `: ${affectedRows} result(s)` : ""}` : "No filters selected");
    }

    function resetLocalFilters(source) {
        const filterBox = source.closest(".filter-box") || document.querySelector(".filter-box") || document;

        filterBox.querySelectorAll("input, select, textarea").forEach((field) => {
            if (["hidden", "submit", "button"].includes(field.type)) {
                return;
            }

            if (field.tagName === "SELECT") {
                field.selectedIndex = 0;
                field.dispatchEvent(new Event("change", { bubbles: true }));
            } else {
                field.value = "";
                field.dispatchEvent(new Event("input", { bubbles: true }));
            }
        });

        const freeSearch = document.querySelector("#datatables_search_input");
        if (freeSearch) {
            freeSearch.value = "";
        }

        document.querySelectorAll("table tbody tr").forEach((row) => {
            row.style.display = "";
        });

        showLocalNotice("Filters cleared");
    }

    function selectedFieldText(field) {
        if (field.tagName === "SELECT") {
            const option = field.options[field.selectedIndex];
            if (!option || !option.value || option.disabled) {
                return "";
            }
            return option.textContent.trim().toLowerCase();
        }

        return field.value.trim().toLowerCase();
    }

    function stripHtml(value) {
        const element = document.createElement("div");
        element.innerHTML = String(value ?? "");
        return element.textContent || element.innerText || "";
    }

    function escapeAttribute(value) {
        return String(value ?? "").replace(/[&<>"']/g, (char) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        }[char]));
    }

    function injectGeneratorLink() {
        const menu = document.querySelector(".menu.menu-column");
        if (menu && !document.querySelector('a[href="pdf-generator.html"]')) {
            const item = document.createElement("div");
            item.className = "menu-item";
            item.innerHTML = `
                <a class="menu-link" href="pdf-generator.html">
                    <span class="menu-icon"><i class="bi bi-file-earmark-medical fs-3"></i></span>
                    <span class="menu-title">PDF Generator</span>
                </a>
            `;
            menu.insertBefore(item, menu.children[1] || null);
        }

        const toolbar = document.querySelector("#kt_app_content_container .d-flex, #kt_app_content_container .card-header");
        const isUsefulPage = ["report.html", "certificate.html", "dashboard.html"].includes(pageName);
        if (toolbar && isUsefulPage && !document.querySelector(".pdf-generator-shortcut")) {
            const link = document.createElement("a");
            link.href = "pdf-generator.html";
            link.className = "btn btn-primary btn-sm pdf-generator-shortcut";
            link.textContent = "Generate PDF";
            toolbar.appendChild(link);
        }
    }

    function fillLocalCreateForm() {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        if (!code || !pageName.endsWith("-create.html") || !window.ALFA_ORIGINAL_DATA) {
            return;
        }

        const source = pageName.replace("-create.html", "");
        const records = window.ALFA_ORIGINAL_DATA[source] || [];
        const record = records.find((item) => String(item.code || item.id) === String(code));
        if (!record) {
            return;
        }

        const map = {
            title: record.title,
            name: record.name,
            username: record.username,
            email: record.email,
            address: record.address,
            phone: record.phone,
            secondary_phone: record.secondary_phone,
            type: record.type,
            job_title: record.job_title,
            daily_rate: record.daily_rate,
            basic_salary: record.basic_salary,
            password: record.password || "",
            password_confirmation: record.password || ""
        };

        Object.entries(map).forEach(([name, value]) => {
            if (value === undefined || value === null) {
                return;
            }
            const field = [...document.querySelectorAll("input, select, textarea")]
                .find((element) => element.name === name);
            if (!field) {
                return;
            }
            field.value = value;
            field.dispatchEvent(new Event("change", { bubbles: true }));
        });

        if (record.role_id) {
            const roleSelect = document.querySelector('[name="role[]"]');
            if (roleSelect) {
                [...roleSelect.options].forEach((option) => {
                    option.selected = String(option.value) === String(record.role_id);
                });
                roleSelect.dispatchEvent(new Event("change", { bubbles: true }));
            }
        }
    }
})();
