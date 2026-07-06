const form = document.getElementById("generatorForm");
const printArea = document.getElementById("printArea");
const photoInput = document.getElementById("photoInput");
let uploadedPhotos = [];
let originalPhotos = [];

const samples = {
    dft: {
        template: "dft",
        project: "HSR Green Line",
        reportNo: "156091001",
        client: "NAT",
        date: "28-06-2026",
        contractor: "Systra",
        location: "Ain Sokhna",
        consultant: "Orascom",
        testedItem: "Dry film thickness",
        subConsultant: "A-Build",
        apparatus: "PosiTector 200 D, S.N.: 385883 (Ultrasonic thickness gage)",
        purpose: "This Inspection Report provides a summary of the results of coating thickness measurement test performed on Anti-static coat over Concrete as outlined within this document.",
        scope: "Surface to be tested shall be thoroughly cleaned to obtain accurate readings. Power up gage, zero the probe, verify accuracy, apply couplant, and take readings by placing the probe normally then pressing down.",
        coating: "Apcoflor HFP 120 primer and Apcoflor TC 510 top coat.",
        results: "Location | Readings | Floor | Average Thickness (Microns) | Minimum (Microns) | Maximum (Microns)\nKm - 00 | 3 | MV Switch Gear | 1546.67 | 1280 | 1740\nKm - 00 | 3 | Control Room | 1760.00 | 1580 | 1860\nKm - 20 | 3 | Battery Room | 1840.00 | 1460 | 2100\nKm - 40 | 3 | Building Facility Iv Room | 1946 | 1820 | 2040",
        conclusion: "The measured dry film thickness results are listed above. Final acceptance or rejection shall be determined by the Consultant and Owner at site.",
        doneBy: "Eng. Mahmoud Mosaad",
        reviewedBy: "Eng. Abdallah Elhamalwy",
        qrText: "ALFA EGYPT VERIFICATION\nTYPE: REPORT\nSTATUS: VALID\nCODE: 156091001",
        certificateNo: "00-15255883"
    },
    pull: {
        template: "pull",
        project: "ASSIUT HYDROCRACKING COPLEX",
        reportNo: "1361494007",
        client: "ASSIUT NATIONAL OIL COMPANY(ANOPC)",
        date: "14th June 2026",
        contractor: "TECHNIP ENERGIES ITALY S.p.A.",
        location: "Asuit",
        consultant: "Petrojet",
        testedItem: "Pull Off Test Over Concrete",
        subConsultant: "ALFA EGYPT",
        apparatus: "DeFelsko PosiTector M Adhesion Tester, S.N.: AT18752",
        purpose: "This Inspection Report provides a summary of the results of Pull-Off Adhesion Test performed as outlined within this document.",
        scope: "This inspection performed as per project specification, PDS and ASTM D7234-21, to check the integrity of adhesion by performing the test on the project.",
        coating: "Kemfloor Novolac over Concrete.",
        results: "No. | Location | Dolly no. | Pull Off Strength (MPa) | Type of Failure\n1 | 43-TK-001-F | D1 (Floor) | 1.75 | Concrete Adhesion Failure\n2 | 43-TK-001-F | D2 (Wall) | 2.60 | Concrete Adhesion Failure\n3 | 43-TK-002-F | D1 (Wall) | 2.25 | Concrete Adhesion Failure 80%\n4 | 43-TK-002-F | D2 (Floor) | 2.38 | Kemfloor Novolac Cohesion Failure\n5 | 1G00U01-PAVING-009 | D1 (Floor) | 2.68 | Concrete Adhesion Failure",
        conclusion: "The above results indicate the pull-off strength values (MPa) and the corresponding failure types. Final acceptance or rejection shall be determined by the Consultant and Owner at site.",
        doneBy: "Eng. Mahmoud Mosaad",
        reviewedBy: "Eng. Abdallah Elhamalwy",
        qrText: "ALFA EGYPT VERIFICATION\nTYPE: REPORT\nSTATUS: VALID\nCODE: 1361494007",
        certificateNo: "00-10258752"
    }
};

document.getElementById("loadDft").addEventListener("click", () => fillSample("dft"));
document.getElementById("loadPull").addEventListener("click", () => fillSample("pull"));
document.getElementById("printPdf").addEventListener("click", () => {
    render();
    downloadPdf();
});

form.addEventListener("submit", (event) => {
    event.preventDefault();
    render();
});

photoInput.addEventListener("change", async () => {
    uploadedPhotos = await Promise.all([...photoInput.files].map(readFile));
    render();
});

window.addEventListener("beforeprint", preparePrintOnlyRoot);
window.addEventListener("afterprint", removePrintOnlyRoot);

function fillSample(type) {
    uploadedPhotos = [];
    originalPhotos = samplePhotos(type);
    Object.entries(samples[type]).forEach(([key, value]) => {
        const input = form.elements[key];
        if (input) {
            input.value = value;
        }
    });
    render();
}

function fillFromOriginalData() {
    const params = new URLSearchParams(window.location.search);
    const source = params.get("source");
    const code = params.get("code");

    if (source && !["report", "certificate"].includes(source)) {
        return false;
    }

    if (!source || !code || !window.ALFA_ORIGINAL_DATA || !window.ALFA_ORIGINAL_DATA[source]) {
        return false;
    }

    const record = window.ALFA_ORIGINAL_DATA[source].find((item) => String(item.code || item.id) === String(code));
    if (!record) {
        return false;
    }

    const reportType = String(record.report_name || record.report || "").toLowerCase().includes("pull") ? "pull" : "dft";
    const fallback = source === "certificate" ? {} : samples[reportType];
    uploadedPhotos = [];
    originalPhotos = source === "certificate" ? [] : reportPhotos(record, reportType);
    const values = {
        template: source === "certificate" ? "certificate" : reportType,
        project: firstText(record.project, record.title, fallback.project),
        reportNo: record.code || record.id || "",
        client: firstText(record.client, fallback.client),
        date: firstText(record.calibration_date, record.date, record.created_at, fallback.date),
        contractor: firstText(record.contractor, fallback.contractor),
        location: firstText(record.location, fallback.location),
        consultant: firstText(record.consultant, record.sub_contractor, fallback.consultant),
        testedItem: firstText(record.device, record.tested_item, fallback.testedItem),
        subConsultant: firstText(record.sub_contractor, fallback.subConsultant),
        apparatus: record.extra && (record.extra.guage_name || record.extra.sn)
            ? [record.extra.guage_name, record.extra.sn].filter(Boolean).join(" - ")
            : firstText(certificateModel(record), fallback.apparatus),
        coating: source === "certificate" ? "" : reportCoating(record, reportType),
        results: source === "certificate" ? certificateResults(record) : reportResults(record, reportType),
        conclusion: firstText(record.conclusion, fallback.conclusion, "Final acceptance or rejection shall be determined by the Consultant and Owner at site."),
        doneBy: reportDoneBy(record, reportType),
        reviewedBy: reviewerName(record),
        qrText: `ALFA EGYPT VERIFICATION\nTYPE: ${source.toUpperCase()}\nSTATUS: VALID\nCODE: ${record.code || record.id || ""}\nCLIENT: ${stripHtml(record.client || "")}\nPROJECT: ${stripHtml(record.project || record.title || "")}`,
        certificateNo: record.code || record.id || ""
    };

    Object.entries(values).forEach(([key, value]) => {
        const input = form.elements[key];
        if (input) {
            input.value = value || "";
        }
    });

    render();
    return true;
}

function readFile(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ name: file.name, src: reader.result });
        reader.readAsDataURL(file);
    });
}

function data() {
    return Object.fromEntries(new FormData(form).entries());
}

function render() {
    const d = data();
    printArea.innerHTML = d.template === "certificate" ? certificateTemplate(d) : reportTemplate(d);
    renderQr(d.qrText || d.reportNo || d.certificateNo);
}

function downloadPdf() {
    if (typeof html2pdf === "undefined" && typeof html2canvas === "undefined") {
        alert("PDF download library is not loaded. Please refresh the page and try again.");
        return;
    }

    const d = data();
    const filenameParts = [
        d.template === "certificate" ? "certificate" : "report",
        d.reportNo || d.certificateNo || "alfa",
        d.project || d.client || ""
    ].filter(Boolean);

    const filename = filenameParts
        .join("-")
        .replace(/[\\/:*?"<>|]+/g, "-")
        .replace(/\s+/g, "-")
        .toLowerCase() + ".pdf";

    const button = document.getElementById("printPdf");
    const oldText = button.textContent;
    button.disabled = true;
    button.textContent = "Downloading...";

    const page = printArea.querySelector(".doc-page");
    const sourceTarget = page || printArea;
    const isCertificate = d.template === "certificate";
    document.body.classList.add("exporting-pdf");
    sourceTarget.classList.add("pdf-export-target");
    const target = createPdfExportClone(sourceTarget);

    const options = {
        margin: 0,
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: "#ffffff",
            scrollX: 0,
            scrollY: 0,
            windowWidth: target.scrollWidth || 794
        },
        jsPDF: {
            unit: "mm",
            format: "a4",
            orientation: "portrait"
        },
        pagebreak: {
            mode: isCertificate ? ["css"] : ["css", "legacy"],
            avoid: isCertificate ? [".certificate-page", ".certificate-frame"] : []
        }
    };

    const primaryDownload = Promise.reject(new Error("Use direct canvas export for reports and certificates."));

    primaryDownload.then(
        () => {
            removePdfExportClone(target);
            resetDownloadButton(button, oldText);
        },
        () => {
            downloadPdfFromCanvas(target, filename, isCertificate)
                .then(() => {
                    removePdfExportClone(target);
                    resetDownloadButton(button, oldText);
                }, () => {
                    removePdfExportClone(target);
                    resetDownloadButton(button, oldText);
                    alert("PDF download could not start. Please refresh the page and try again.");
                });
        }
    );
}

function resetDownloadButton(button, text) {
    document.body.classList.remove("exporting-pdf");
    document.querySelectorAll(".pdf-export-target").forEach((element) => {
        element.classList.remove("pdf-export-target");
    });
    button.disabled = false;
    button.textContent = text;
}

function createPdfExportClone(source) {
    const clone = source.cloneNode(true);
    clone.id = "pdfExportClone";
    clone.classList.add("pdf-export-clone");
    clone.querySelectorAll("[id]").forEach((element) => {
        element.removeAttribute("id");
    });
    document.body.appendChild(clone);
    return clone;
}

function removePdfExportClone(clone) {
    if (clone && clone.parentNode) {
        clone.parentNode.removeChild(clone);
    }
}

function downloadPdfFromCanvas(target, filename, isCertificate) {
    if (typeof html2canvas === "undefined" || !window.jspdf || !window.jspdf.jsPDF) {
        return Promise.reject(new Error("Canvas PDF fallback is unavailable."));
    }

    return html2canvas(target, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        scrollX: 0,
        scrollY: 0,
        windowWidth: target.scrollWidth || 794
    }).then((canvas) => {
        const pdf = new window.jspdf.jsPDF("p", "mm", "a4");
        const pageWidth = 210;
        const pageHeight = 297;

        if (isCertificate) {
            const imgData = canvas.toDataURL("image/jpeg", 0.98);
            pdf.addImage(imgData, "JPEG", 0, 0, pageWidth, pageHeight);
        } else {
            const pageCanvasHeight = Math.floor(canvas.width * pageHeight / pageWidth);
            const avoidRanges = pdfAvoidRanges(target, canvas);
            let renderedHeight = 0;
            let pageIndex = 0;

            while (renderedHeight < canvas.height) {
                let sliceHeight = Math.min(pageCanvasHeight, canvas.height - renderedHeight);
                const safeSliceHeight = safePdfSliceHeight(renderedHeight, sliceHeight, avoidRanges);
                if (safeSliceHeight > 80) {
                    sliceHeight = safeSliceHeight;
                }
                const pageCanvas = document.createElement("canvas");
                pageCanvas.width = canvas.width;
                pageCanvas.height = sliceHeight;
                const context = pageCanvas.getContext("2d");
                context.fillStyle = "#ffffff";
                context.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
                context.drawImage(canvas, 0, renderedHeight, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

                if (pageIndex > 0) {
                    pdf.addPage();
                }
                const pageImgData = pageCanvas.toDataURL("image/jpeg", 0.98);
                const pageImgHeight = sliceHeight * pageWidth / canvas.width;
                pdf.addImage(pageImgData, "JPEG", 0, 0, pageWidth, pageImgHeight);
                renderedHeight += sliceHeight;
                pageIndex += 1;
            }
            if (pageIndex === 0) {
                pdf.addPage();
            }
        }

        pdf.save(filename);
    });
}

function pdfAvoidRanges(target, canvas) {
    const targetRect = target.getBoundingClientRect();
    const scale = canvas.height / targetRect.height;
    return [...target.querySelectorAll(".photo-card, .photo-grid-page, .report-signature-table")]
        .map((element) => {
            const rect = element.getBoundingClientRect();
            return {
                top: Math.max(0, Math.floor((rect.top - targetRect.top) * scale)),
                bottom: Math.min(canvas.height, Math.ceil((rect.bottom - targetRect.top) * scale))
            };
        })
        .filter((range) => range.bottom > range.top)
        .sort((a, b) => a.top - b.top);
}

function safePdfSliceHeight(start, proposedHeight, ranges) {
    const end = start + proposedHeight;
    const crossing = ranges.find((range) => range.top < end && range.bottom > end);
    if (!crossing) {
        return proposedHeight;
    }
    const safeEnd = crossing.top - 8;
    return Math.max(0, safeEnd - start);
}

function preparePrintOnlyRoot() {
    removePrintOnlyRoot();
    document.body.classList.add("printing-only");
    if (!printArea.innerHTML.trim()) {
        render();
    }

    const printRoot = document.createElement("div");
    printRoot.id = "printOnlyRoot";
    printRoot.innerHTML = printArea.innerHTML;
    document.body.appendChild(printRoot);

    const sourceCanvases = printArea.querySelectorAll("canvas");
    const clonedCanvases = printRoot.querySelectorAll("canvas");
    clonedCanvases.forEach((canvas, index) => {
        const source = sourceCanvases[index];
        if (!source) {
            return;
        }
        const image = document.createElement("img");
        try {
            image.src = source.toDataURL("image/png");
        } catch (error) {
            return;
        }
        image.width = source.width;
        image.height = source.height;
        image.style.width = source.style.width || `${source.width}px`;
        image.style.height = source.style.height || `${source.height}px`;
        canvas.replaceWith(image);
    });
}

function removePrintOnlyRoot() {
    const printRoot = document.getElementById("printOnlyRoot");
    if (printRoot) {
        printRoot.remove();
    }
    document.body.classList.remove("printing-only");
}

function reportTemplate(d) {
    const title = d.template === "pull" ? "Adhesion Test Report" : "Dry Film Thickness Inspection Report";
    const code = d.template === "pull" ? "QF - 09 - 05" : "QF - 09 - 04";

    return `
        <article class="doc-page report-page">
            ${reportHeader()}
            <h1 class="doc-title">${escapeHtml(title)}</h1>
            ${metaTable(d)}
            <div class="doc-section">
                <h3>1. Introduction</h3>
                <h3>1.1. Purpose</h3>
                <p>${nl(d.purpose)}</p>
                <h3>2. Test Summary</h3>
                <h3>2.1. Scope of Test</h3>
                <p>${nl(d.scope)}</p>
                <h3>2.2. Apparatus</h3>
                <p>${escapeHtml(d.apparatus)}</p>
                <h3>2.3. Tested Items</h3>
                <p>${escapeHtml(d.testedItem)}</p>
                <h3>2.4. Coating System</h3>
                <div class="rich-content">${richContent(d.coating)}</div>
                <h3>3. Test Assessment</h3>
                <p>According to the applicable project specification and international standards.</p>
                <h3>4. Test Results</h3>
                ${resultTable(d.results)}
                <h3>5. Conclusion</h3>
                <p>${nl(d.conclusion)}</p>
                <h3>6. Photo Gallery</h3>
                ${photoGrid()}
                <h3>7. Attachments</h3>
                <ul class="attachment-list"><li>Calibration Certificate</li></ul>
                ${reportSignatureTable(d)}
            </div>
            <img class="report-stamp-img" src="assets/report-stamp-original.png" alt="ALFA Egypt stamp">
            ${reportFooter(code, "1")}
        </article>
    `;
}

function reportHeader() {
    return `
        <header class="report-doc-head">
            <img src="assets/logo.png" alt="ALFA Egypt">
            <div><strong>ALFA Egypt</strong><br>Inspection Department</div>
        </header>
    `;
}

function reportFooter(code, page) {
    return `
        <footer class="report-doc-footer">
            <div>${code}<br>Issue / Revision: 02/00<br>Issue Date: 01/12/2022</div>
            <div>Address: 40 Amin Abo Zaid St., El Togareen District Gesr Elsuiz, Cairo, Egypt<br>Phone: 02 269 766 03<br>E-Mail: info@alfaegy.com &nbsp;&nbsp;&nbsp;&nbsp; Website: alfaegy.com</div>
            <div>Page | ${page}</div>
        </footer>
    `;
}

function reportSignatureTable(d) {
    return `
        <table class="report-signature-table">
            <tr>
                <th>Test done by:</th>
                <td>${escapeHtml(d.doneBy)}</td>
                <th>Reviewed By:</th>
                <td>${escapeHtml(d.reviewedBy)}</td>
            </tr>
            <tr>
                <th>Signature</th>
                <td><img src="assets/report-sign-done.png" alt=""></td>
                <th>Signature</th>
                <td><img src="assets/report-sign-review.png" alt=""></td>
            </tr>
            <tr>
                <th>Date</th>
                <td>${escapeHtml(d.date)}</td>
                <th>Date</th>
                <td>${escapeHtml(d.date)}</td>
            </tr>
        </table>
    `;
}

function certificateTemplate(d) {
    const serial = certificateSerial(d);
    const model = certificateModelName(d, serial);
    const qfCode = d.template === "pull" || /AT18752|Adhesion/i.test(`${d.apparatus} ${d.testedItem}`) ? "QF - 09 - 05" : "QF - 09 - 04";
    return `
        <article class="doc-page certificate-page">
            <div class="certificate-document">
                <section class="certificate-frame">
                    <div class="cert-corner cert-corner-tl"></div>
                    <div class="cert-corner cert-corner-tr"></div>
                    <div class="cert-corner cert-corner-bl"></div>
                    <div class="cert-corner cert-corner-br"></div>
                    <h1>Certificate</h1>
                    <h2>of Calibration</h2>
                    <p class="certificate-number"><strong>Certificate Number:</strong> ${escapeHtml(d.certificateNo)}</p>
                    <div class="certificate-detail-grid">
                        <div>
                            <p><strong>Gage/ Instrument:</strong> ${escapeHtml(d.testedItem || "PosiTest Adhesion Tester")}</p>
                            <p><strong>Manufacturer:</strong> DeFelsko</p>
                            <p><strong>Model:</strong> ${escapeHtml(model)}</p>
                            <p><strong>Gage serial No.:</strong> ${escapeHtml(serial)}</p>
                            <p><strong>Date of Calibration:</strong> ${escapeHtml(d.date)}</p>
                        </div>
                        <div>
                            <p><strong>Laboratory Environment</strong></p>
                            <p><strong>Temperature:</strong> 23&plusmn;3&deg;C</p>
                            <p><strong>Relative Humidity:</strong> up to 85%</p>
                            <p><strong>Next Calibration:</strong> ${escapeHtml(nextCalibrationDate(d.date))}</p>
                        </div>
                    </div>
                    <p class="test-method"><strong>Test Method:</strong> ${escapeHtml(certificateMethod(serial))}</p>
                    <div class="certificate-results">${resultTable(d.results)}</div>
                    ${/AT18752/i.test(serial) ? "<p class=\"uncertainty\">Uncertainty +/- 2.5 psi</p>" : ""}
                    <p class="performed-by"><strong>Calibration Performed by:</strong> ${escapeHtml(d.doneBy)}</p>
                    <img class="certificate-seal-img" src="assets/certificate-stamp.png" alt="ALFA Egypt stamp">
                    <p class="certificate-note"><strong>Note:</strong> Calibration interval may affected by usage, handling and storage conditions.<br>Alfa Egypt operates under Management Procedures intended to implement the requirements of ISO9001, ISO 17025.</p>
                    <img class="cert-logo-row-img" src="assets/certificate-logo-row.png" alt="ALFA Egypt accreditation logos">
                    <div class="cert-contact-row">
                        <span>40 Amin Abo Zaid, Togareen Dist., Gisr Elsuiz, Cairo</span>
                        <span>www.alfaegy.com</span>
                        <span>0226976603</span>
                        <span>01002114470</span>
                        <span>front.office@alfaegy.com</span>
                    </div>
                </section>
                <footer class="certificate-doc-footer">
                    <div>${qfCode}<br>Issue / Revision: 02/00<br>Issue Date: 01/12/2022</div>
                    <div>Address: 40 Amin Abo Zaid St., El Togareen District Gesr Elsuiz, Cairo, Egypt<br>Phone: 02 269 766 03<br>E-Mail: info@alfaegy.com &nbsp;&nbsp;&nbsp;&nbsp; Website: alfaegy.com</div>
                    <div>Page | 4</div>
                </footer>
            </div>
        </article>
    `;
}

function header(code, page) {
    return `
        <header class="doc-header">
            <img src="assets/logo.png" alt="ALFA Egypt">
            <div>
                <h2>ALFA Egypt</h2>
                <p><strong>Inspection Department</strong></p>
                <p>Address: 40 Amin Abo Zaid St., El Togareen District Gesr Elsuiz, Cairo, Egypt</p>
                <p>Phone: 02 269 766 03 | E-Mail: info@alfaegy.com | Website: alfaegy.com</p>
            </div>
            <div class="doc-code">
                <div>${code}</div>
                <div>Issue / Revision: 02/00</div>
                <div>Issue Date: 01/12/2022</div>
                <div>Page | ${page}</div>
            </div>
        </header>
    `;
}

function metaTable(d) {
    return `
        <table class="meta-table">
            <tr><td>Project</td><td>${escapeHtml(d.project)}</td><td>Report No.</td><td>${escapeHtml(d.reportNo)}</td></tr>
            <tr><td>Client</td><td>${escapeHtml(d.client)}</td><td>Date</td><td>${escapeHtml(d.date)}</td></tr>
            <tr><td>Contractor</td><td>${escapeHtml(d.contractor)}</td><td>Location</td><td>${escapeHtml(d.location)}</td></tr>
            <tr><td>Consultant</td><td>${escapeHtml(d.consultant)}</td><td>Tested Item</td><td>${escapeHtml(d.testedItem)}</td></tr>
            <tr><td>Sub Consultant / TPI</td><td colspan="3">${escapeHtml(d.subConsultant)}</td></tr>
        </table>
    `;
}

function resultTable(raw) {
    const rows = (raw || "").split(/\n+/).map((line) => line.split("|").map((cell) => cell.trim())).filter((row) => row.length > 1);
    if (!rows.length) {
        return "<p>No results entered.</p>";
    }
    const [head, ...body] = rows;
    return `
        <table class="result-table">
            <thead><tr>${head.map((cell) => `<th>${escapeHtml(cell)}</th>`).join("")}</tr></thead>
            <tbody>${body.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody>
        </table>
    `;
}

function photoGrid() {
    const photos = uploadedPhotos.length
        ? uploadedPhotos
        : originalPhotos.length
            ? originalPhotos
            : Array.from({ length: 8 }, (_, i) => ({ name: `Photo ${i + 1}`, src: "" }));
    const groups = [];
    for (let i = 0; i < photos.length; i += 8) {
        groups.push(photos.slice(i, i + 8));
    }
    return groups.map((group, groupIndex) => `
        <div class="photo-grid-page${groupIndex ? " photo-grid-page-break" : ""}">
            <div class="photo-grid">${group.map((photo, index) => {
                const photoNumber = groupIndex * 8 + index + 1;
                return `
                    <div class="photo-card">
                        ${photo.src ? `<img src="${photo.src}" alt="">` : ""}
                        <div>${escapeHtml(photo.name || `Photo ${photoNumber}`)}</div>
                    </div>
                `;
            }).join("")}</div>
        </div>
    `).join("");
}

function renderQr(text) {
    const target = document.getElementById("qrCode");
    if (!target || typeof QRCode === "undefined") {
        return;
    }
    target.innerHTML = "";
    const qrValue = text || "ALFA EGYPT VERIFICATION\nSTATUS: VALID";
    new QRCode(target, {
        text: qrValue,
        width: 76,
        height: 76,
        correctLevel: QRCode.CorrectLevel.M
    });
}

function nl(value) {
    return escapeHtml(value || "").replace(/\n/g, "<br>");
}

function richContent(value) {
    const decoded = decodeHtml(value || "");
    if (/<(?:table|p|div|span|tbody|tr|td|th)\b/i.test(decoded)) {
        return sanitizeGeneratedHtml(decoded);
    }
    return nl(decoded);
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    }[char]));
}

function stripHtml(value) {
    const element = document.createElement("div");
    element.innerHTML = decodeHtml(value ?? "");
    return element.textContent || element.innerText || "";
}

function firstText(...values) {
    for (const value of values) {
        const text = stripHtml(value ?? "").replace(/\s+/g, " ").trim();
        if (text && !/^null$/i.test(text) && !/^undefined$/i.test(text) && !/^none$/i.test(text)) {
            return text;
        }
    }
    return "";
}

function decodeHtml(value) {
    const element = document.createElement("textarea");
    element.innerHTML = String(value ?? "");
    return element.value;
}

function sanitizeGeneratedHtml(value) {
    const container = document.createElement("div");
    container.innerHTML = value;
    container.querySelectorAll("script, iframe, object, embed, link, meta").forEach((node) => node.remove());
    container.querySelectorAll("*").forEach((node) => {
        [...node.attributes].forEach((attr) => {
            if (/^on/i.test(attr.name)) {
                node.removeAttribute(attr.name);
            }
        });
    });
    return container.innerHTML;
}

function htmlTableToPipe(value) {
    const html = String(value || "");
    if (!html.trim()) {
        return "";
    }

    const container = document.createElement("div");
    container.innerHTML = html;
    const rows = [...container.querySelectorAll("tr")]
        .map((row) => [...row.querySelectorAll("th,td")].map((cell) => stripHtml(cell.innerHTML).trim()).join(" | "))
        .filter(Boolean);

    return rows.join("\n") || stripHtml(html);
}

function reportResults(record, reportType) {
    const parsed = htmlTableToPipe(record.test_result || "");
    if (hasMeaningfulTableData(parsed)) {
        return parsed;
    }

    if (reportType === "pull") {
        return samples.pull.results;
    }

    return samples.dft.results;
}

function reportCoating(record, reportType) {
    const decoded = decodeHtml(record.coating || "");
    const text = stripHtml(decoded).replace(/\s+/g, " ").trim();

    if (/Apcoflor|Kemfloor|Novolac|HFP|TC 510/i.test(text)) {
        return decoded;
    }

    if (reportType === "pull") {
        return "Kemfloor Novolac over Concrete.";
    }

    return `
        <table>
            <tbody>
                <tr><th>Painting Material</th><th>Description</th></tr>
                <tr><td>Apcoflor HFP 120</td><td>High solid primer for concrete surface with good penetration, sealing properties and adhesion between concrete surface and epoxy top coating.</td></tr>
                <tr><td>Apcoflor TC 510</td><td>Durable, wear resistant top coat with impervious flexible film, excellent flow and chemical resistance.</td></tr>
            </tbody>
        </table>
    `;
}

function hasMeaningfulTableData(value) {
    const text = String(value || "")
        .replace(/\|/g, "")
        .replace(/&nbsp;/gi, "")
        .replace(/\s+/g, "")
        .trim();

    return text.length > 4 && !/^none$/i.test(text);
}

function reportDoneBy(record, reportType) {
    const createdBy = stripHtml(record.created_by || "").trim();
    if (createdBy && !/^frontOffice$/i.test(createdBy)) {
        return createdBy;
    }
    return reportType === "pull" ? "Eng. Mahmoud Mosaad" : "Ethar Gamal Khamis";
}

function reviewerName(record) {
    const reviewerId = String(record.reviewer_id || "").trim();
    const reviewers = (window.ALFA_ORIGINAL_DATA && window.ALFA_ORIGINAL_DATA.reviewer) || [];
    const reviewer = reviewers.find((item) => String(item.id || item.code) === reviewerId);
    if (reviewer && reviewer.title) {
        return stripHtml(reviewer.title);
    }
    return "Eng. Abdallah Elhamalwy";
}

function samplePhotos(type) {
    return type === "pull" ? pdfExtractedPhotos("pull") : pdfExtractedPhotos("dft");
}

function reportPhotos(record, reportType) {
    const explicitPhotos = collectPhotoPaths(record);
    if (explicitPhotos.length) {
        return explicitPhotos.map((src, index) => ({ name: `Photo ${index + 1}`, src }));
    }
    return pdfExtractedPhotos(reportType);
}

function collectPhotoPaths(value) {
    const photos = [];
    const visit = (item) => {
        if (!item) {
            return;
        }
        if (typeof item === "string") {
            const decoded = decodeHtml(item);
            const srcMatches = [...decoded.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map((match) => match[1]);
            const fileMatches = [...decoded.matchAll(/(?:assets|storage|uploads|backend)\/[^"'<>]+\.(?:png|jpe?g|webp|gif)/gi)].map((match) => match[0]);
            photos.push(...srcMatches, ...fileMatches);
            return;
        }
        if (Array.isArray(item)) {
            item.forEach(visit);
            return;
        }
        if (typeof item === "object") {
            Object.entries(item).forEach(([key, nested]) => {
                if (/photo|image|attach|file|gallery|picture/i.test(key)) {
                    visit(nested);
                    return;
                }
                if (typeof nested === "object") {
                    visit(nested);
                }
            });
        }
    };
    visit(value);
    return [...new Set(photos)].map(normalizePhotoPath).filter(Boolean);
}

function normalizePhotoPath(path) {
    const clean = String(path || "").trim();
    if (!clean) {
        return "";
    }
    if (/^https?:\/\//i.test(clean) || /^data:/i.test(clean) || clean.startsWith("assets/")) {
        return clean;
    }
    return clean.replace(/^\/+/, "");
}

function pdfExtractedPhotos(type) {
    const dft = [
        "dft-p3-1.jpg", "dft-p3-2.jpg", "dft-p3-3.jpg", "dft-p3-4.jpg", "dft-p3-5.jpg", "dft-p3-6.jpg",
        "dft-p4-1.jpg", "dft-p4-2.jpg", "dft-p4-3.jpg", "dft-p4-4.jpg", "dft-p4-5.jpg", "dft-p4-6.jpg",
        "dft-p4-7.jpg", "dft-p4-8.jpg", "dft-p4-9.jpg", "dft-p4-10.jpg", "dft-p4-11.jpg", "dft-p4-12.jpg"
    ];
    const pull = [
        "pull-p3-1.jpg", "pull-p3-2.jpg", "pull-p3-3.jpg", "pull-p3-4.jpg", "pull-p3-5.jpg", "pull-p3-6.jpg",
        "pull-p3-7.jpg", "pull-p3-8.jpg", "pull-p3-9.jpg", "pull-p3-10.jpg", "pull-p3-11.jpg", "pull-p3-12.jpg"
    ];
    return (type === "pull" ? pull : dft).map((name, index) => ({
        name: `Photo ${index + 1}`,
        src: `assets/pdf-extracted/${name}`
    }));
}

function certificateSerial(d) {
    if (String(d.certificateNo) === "00-10258752") {
        return "AT18752";
    }
    if (String(d.certificateNo) === "00-15255883") {
        return "385883";
    }
    const text = `${d.apparatus || ""} ${d.testedItem || ""}`;
    const match = text.match(/(?:AT)?\d{5,6}/i);
    if (match) {
        return match[0].toUpperCase();
    }
    return "";
}

function certificateModelName(d, serial) {
    const text = `${d.apparatus || ""} ${d.testedItem || ""}`;
    if (/AT18752|adhesion|pull/i.test(`${serial} ${text}`)) {
        return "PosiTest ATM";
    }
    if (/385883|thickness|coating/i.test(`${serial} ${text}`)) {
        return "PosiTector 200 D";
    }
    return d.apparatus || "";
}

function certificateMethod(serial) {
    if (/AT18752/i.test(serial)) {
        return "This instrument was calibrated according to procedure MP 2571 using calibrated load cell traceable to NIST by certificates 945162 and 63339.";
    }
    return "This instrument was calibrated according to ALFA Egypt procedures using calibrated references traceable to international standards.";
}

function nextCalibrationDate(value) {
    const raw = String(value || "").trim();
    const parts = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
    if (!parts) {
        return "As per interval";
    }
    const day = Number(parts[1]);
    const month = Number(parts[2]);
    const year = Number(parts[3]) + 1;
    const next = new Date(year, month - 1, day);
    next.setDate(next.getDate() - 1);
    return [
        String(next.getDate()).padStart(2, "0"),
        String(next.getMonth() + 1).padStart(2, "0"),
        next.getFullYear()
    ].join("/");
}

function certificateModel(record) {
    const serial = String(record.serial_no || "");
    if (serial === "385883") {
        return "PosiTector 200 D Probe";
    }
    if (serial === "AT18752") {
        return "PosiTest ATM";
    }
    return record.device || "";
}

function certificateResults(record) {
    const serial = String(record.serial_no || "");
    if (serial === "385883" || String(record.code) === "00-15255883") {
        return [
            "Reference Standard Serial | Min | Reference Thickness (microns) | Max | Instrument Reading (microns)",
            "7089 | 354 | 367 | 380 | 369",
            "7081 | 1421 | 1467 | 1513 | 1475",
            "7082 | 2293 | 2325 | 2396.8 | 2320",
            "5474 | 2931.3 | 3024 | 3116.7 | 3039"
        ].join("\n");
    }
    if (serial === "AT18752" || String(record.code) === "00-10258752") {
        return [
            "Adhesion Tester Gage (Psi) | Load Cell (Psi) | Full Measurement Range Accuracy (%)",
            "503 | 498 | 0.17%",
            "1011 | 999 | 0.40%",
            "1500 | 1507 | -0.23%",
            "1995 | 1999 | -0.13%",
            "2497 | 2505 | -0.27%",
            "3007 | 3012 | -0.17%"
        ].join("\n");
    }
    return "";
}

if (!fillFromOriginalData()) {
    fillSample("dft");
}
