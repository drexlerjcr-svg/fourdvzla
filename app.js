const webappurl = "https://script.google.com/macros/s/AKfycbx3WevFFa8gvlllgxm4zDqCQo7q3cso0ci9S2L3ZYnQXB2agBpFfRgRnA0PdaQLIbE-/exec";
const SECURITY_TOKEN = "SUNDDE_SECURE_2026_TOKEN";

let currentUser = null;
let globalDenunciasData = [];
let selectedRowData = null;
let attachedFileBase64 = "", attachedFileName = "";
let attachedPhotoBase64 = "", attachedPhotoName = "";

document.getElementById('live-date').innerText = new Date().toLocaleDateString('es-VE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

document.addEventListener("DOMContentLoaded", () => {
    const savedSession = localStorage.getItem("sundde_session");
    if (!savedSession) {
        window.location.href = "index.html";
        return;
    }
    currentUser = JSON.parse(savedSession);
    buildAppWorkspace();
});

function triggerLogout() {
    localStorage.removeItem("sundde_session");
    window.location.href = "index.html";
}

function showCustomAlert(title, message, type="info") {
    const alertModal = document.getElementById('custom-alert');
    const icon = document.getElementById('alert-icon');
    document.getElementById('alert-title').innerText = title;
    document.getElementById('alert-message').innerText = message;
    
    if(type === 'error') icon.innerHTML = '<i class="fas fa-circle-exclamation" style="color: var(--danger);"></i>';
    else if(type === 'success') icon.innerHTML = '<i class="fas fa-circle-check" style="color: var(--success);"></i>';
    else icon.innerHTML = '<i class="fas fa-circle-info" style="color: var(--secondary);"></i>';
    
    alertModal.style.display = 'flex';
}
function closeCustomAlert() { document.getElementById('custom-alert').style.display = 'none'; }

async function sendToBackend(action, payload) {
    try {
        const response = await fetch(webappurl, {
            method: "POST",
            headers: { "Content-Type": "text/plain" },
            body: JSON.stringify({ token: SECURITY_TOKEN, action: action, payload: payload })
        });
        return await response.json();
    } catch (error) {
        return { success: false, message: "Error crítico de red conectando al servidor." };
    }
}

function buildAppWorkspace() {
    document.getElementById('user-display-name').innerText = currentUser.nombre;
    document.getElementById('user-display-email').innerText = currentUser.email;
    document.getElementById('user-display-role').innerText = currentUser.role;

    if (currentUser.empresa) {
        const empTag = document.getElementById('user-display-empresa');
        empTag.innerText = `Asignado a: ${currentUser.empresa}`;
        empTag.style.display = "block";
    }

    const rolLower = currentUser.role.toLowerCase();
    if (rolLower.includes("director") || rolLower.includes("admin")) {
        document.getElementById('link-stats').style.display = "flex";
        document.getElementById('admin-filter').style.display = "flex";
    } else if (rolLower.includes("asistente") || rolLower.includes("seguimiento")) {
        document.getElementById('admin-filter').style.display = "flex";
    }

    loadDataGrid();
}

async function loadDataGrid() {
    const tbody = document.getElementById('tbody-denuncias');
    tbody.innerHTML = "<tr><td colspan='6' style='text-align:center;'><i class='fas fa-spinner fa-spin'></i> Extrayendo registros de Google Sheets...</td></tr>";

    const responseData = await sendToBackend("getDenuncias", { user: currentUser.email });

    if (!responseData || !Array.isArray(responseData)) {
        tbody.innerHTML = "<tr><td colspan='6' style='text-align:center; color:var(--danger);'>Error al sincronizar con la base de datos.</td></tr>";
        return;
    }

    globalDenunciasData = responseData;
    renderDataGrid();
}

function renderDataGrid() {
    const tbody = document.getElementById('tbody-denuncias');
    tbody.innerHTML = "";
    const userRoleLower = currentUser.role.toLowerCase();
    const filtroDropdown = document.getElementById('select-filtro-estatus').value;

    let filtered = globalDenunciasData.filter(item => {
        const est = (item.STATUS || "Nuevo").toString().trim();
        
        if(filtroDropdown !== "TODOS" && est !== filtroDropdown) return false;

        if (userRoleLower.includes("sundde") && !userRoleLower.includes("asistente") && !userRoleLower.includes("fiscal")) return est === "Nuevo";
        if (userRoleLower.includes("denunciado") || userRoleLower.includes("empresa")) {
            if (item.EMPRESA && item.EMPRESA.toString().toLowerCase() !== currentUser.empresa.toString().toLowerCase()) return false;
            return est === "Admitido" || est === "En Revisión";
        }
        if (userRoleLower.includes("fiscal")) return est === "Atendido";
        if (userRoleLower.includes("seguimiento") || userRoleLower.includes("asistente")) {
            if (est === "Archivado") return false; 
            return est === "Cerrado" || est === "Atendido" || est === "En Revisión" || est === "Admitido";
        }
        if (userRoleLower.includes("administrador") || userRoleLower.includes("admin") || userRoleLower.includes("director")) return true;
        
        return false;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = "<tr><td colspan='6' style='text-align:center; color:#64748B;'>No hay expedientes asignados.</td></tr>";
        return;
    }

    filtered.forEach(item => {
        let statusClass = "status-nuevo";
        const estatusActual = item.STATUS ? item.STATUS.toString().trim() : "Nuevo";

        if (estatusActual === "Admitido") statusClass = "status-envcomp";
        if (estatusActual === "Atendido") statusClass = "status-atcomp";
        if (estatusActual === "En Revisión") statusClass = "status-devuelto";
        if (estatusActual === "Cerrado") statusClass = "status-cerradofisc";
        if (estatusActual === "Archivado") statusClass = "status-final";

        let actionButton = `<button class="btn-sm" style="background:#E2E8F0; color:#475569;" onclick="openSuperCard(${item.rowIndex})"><i class="fas fa-eye"></i> Ver Avance</button>`;

        if (userRoleLower.includes("sundde") && !userRoleLower.includes("asistente") && !userRoleLower.includes("fiscal") && estatusActual === "Nuevo") {
            actionButton = `<button class="btn-sm btn-sm-primary" onclick="openSuperCard(${item.rowIndex})"><i class="fas fa-file-signature"></i> Gestionar</button>`;
        } else if ((userRoleLower.includes("denunciado") || userRoleLower.includes("empresa")) && (estatusActual === "Admitido" || estatusActual === "En Revisión")) {
            actionButton = `<button class="btn-sm btn-sm-primary" onclick="openSuperCard(${item.rowIndex})"><i class="fas fa-gavel"></i> Cargar</button>`;
        } else if (userRoleLower.includes("fiscal") && estatusActual === "Atendido") {
            actionButton = `<button class="btn-sm btn-sm-primary" onclick="openSuperCard(${item.rowIndex})"><i class="fas fa-balance-scale"></i> Evaluar</button>`;
        } else if ((userRoleLower.includes("seguimiento") || userRoleLower.includes("asistente")) && estatusActual === "Cerrado") {
            actionButton = `<button class="btn-sm btn-sm-success" onclick="openSuperCard(${item.rowIndex})"><i class="fas fa-poll"></i> Archivar</button>`;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td data-label="N° Denuncia" style="font-weight:700; color:var(--primary); cursor:pointer;" onclick="openSuperCard(${item.rowIndex})">
                <i class="fas fa-expand" style="margin-right:5px; color:var(--secondary);"></i> ${item.DENUNCIA || ('F-' + item.rowIndex)}
            </td>
            <td data-label="Denunciado / Empresa"><strong>${item.EMPRESA || item.DENUNCIADO || 'N/A'}</strong></td>
            <td data-label="Denunciante">${item.DENUNCIANTE || 'Anónimo'}</td>
            <td data-label="Bien / Servicio">${item['BIEN/SERVICIO'] || 'No detallado'}</td>
            <td data-label="Estatus Actual"><span class="badge ${statusClass}">${estatusActual}</span></td>
            <td data-label="Acción Requerida">${actionButton}</td>
        `;
        tbody.appendChild(tr);
    });

    if(userRoleLower.includes("admin") || userRoleLower.includes("director")) loadAnalyticsData();
}

function getDriveBtn(url, text, colorClass) {
    if (!url) return "";
    return `<a href="${url}" target="_blank" class="btn-sm ${colorClass}" style="margin-right:5px; margin-bottom:5px;"><i class="fas fa-link"></i> ${text}</a>`;
}

function openSuperCard(rowIndex) {
    selectedRowData = globalDenunciasData.find(d => d.rowIndex === rowIndex);
    if(!selectedRowData) return;

    attachedFileBase64 = ""; attachedFileName = ""; attachedPhotoBase64 = ""; attachedPhotoName = "";
    
    document.getElementById('modal-title').innerText = `Expediente: ${selectedRowData.DENUNCIA || 'N/A'}`;
    document.getElementById('md-empresa').innerText = selectedRowData.EMPRESA || selectedRowData.DENUNCIADO || 'N/A';
    document.getElementById('md-denunciante').innerText = selectedRowData.DENUNCIANTE || 'Anónimo';
    document.getElementById('md-cedula').innerText = selectedRowData['C.I.'] || 'N/A';
    document.getElementById('md-telefono').innerText = selectedRowData.TELEFONO || 'N/A';
    document.getElementById('md-producto').innerText = selectedRowData['BIEN/SERVICIO'] || 'N/A';
    document.getElementById('md-motivo').innerText = selectedRowData.OBSERVACIONES || 'N/A';
    
    let rawDate = selectedRowData['FECHA DENUNCIA'];
    document.getElementById('md-fecha').innerText = rawDate ? new Date(rawDate).toLocaleDateString() : 'N/A';
    
    const estatusActual = selectedRowData.STATUS || 'Nuevo';
    let statusColor = "var(--primary)";
    if(estatusActual === "Atendido") statusColor = "var(--warning)";
    if(estatusActual === "En Revisión") statusColor = "var(--danger)";
    if(estatusActual === "Cerrado") statusColor = "var(--success)";
    
    const estBadge = document.getElementById('md-estatus');
    estBadge.innerText = estatusActual;
    estBadge.style.background = statusColor;

    let histHtml = "";
    const role = currentUser.role.toLowerCase();
    const isAdminOrAsist = role.includes("admin") || role.includes("seguimiento") || role.includes("asistente");

    if (selectedRowData.PDF_SUNDDE && (estatusActual !== "Nuevo" || isAdminOrAsist)) {
        histHtml += `<div class="history-box" style="border-left-color: var(--primary);">
                        <h5><i class="fas fa-file-pdf"></i> Soporte SUNDDE</h5>
                        ${getDriveBtn(selectedRowData.PDF_SUNDDE, "Ver Acta", "btn-sm-primary")}
                     </div>`;
    }
    if (selectedRowData.Respuesta_Empresa) {
        histHtml += `<div class="history-box" style="border-left-color: var(--warning);">
                        <h5><i class="fas fa-industry"></i> Atención Empresa</h5>
                        <p>${selectedRowData.Respuesta_Empresa}</p>
                        ${getDriveBtn(selectedRowData.PDF_Empresa, "Acta", "btn-sm-warning")}
                        ${getDriveBtn(selectedRowData.Foto_Empresa, "Foto", "btn-sm-primary")}
                     </div>`;
    }
    if (selectedRowData.Comentario_Fiscal) {
        histHtml += `<div class="history-box" style="border-left-color: var(--danger);">
                        <h5><i class="fas fa-times-circle"></i> Devolución Fiscal</h5>
                        <p>${selectedRowData.Comentario_Fiscal}</p>
                     </div>`;
    }
    if (selectedRowData.Comentario_Devolucion_Empresa) {
        histHtml += `<div class="history-box" style="border-left-color: var(--secondary);">
                        <h5><i class="fas fa-industry"></i> Corrección Empresa</h5>
                        <p>${selectedRowData.Comentario_Devolucion_Empresa}</p>
                        ${getDriveBtn(selectedRowData.PDF_Devolucion_Empresa, "PDF", "btn-sm-warning")}
                        ${getDriveBtn(selectedRowData.Foto_Devolucion_Empresa, "Foto", "btn-sm-primary")}
                     </div>`;
    }

    if(!histHtml) histHtml = "<p style='font-size:0.85rem; color:#64748B;'>Aún no hay soportes históricos.</p>";
    document.getElementById('historico-content').innerHTML = histHtml;

    const formC = document.getElementById('modal-action-form');
    formC.innerHTML = ""; 
    
    if (role.includes("sundde") && !role.includes("asistente") && !role.includes("fiscal") && estatusActual === "Nuevo") {
        formC.innerHTML = `
            <h4 style="color:var(--primary); margin-bottom:15px;">Admitir Caso</h4>
            <div class="form-group">
                <label>Acta (PDF)</label>
                <div class="dropzone-container" onclick="document.getElementById('modal-file').click()">
                    <i class="fas fa-file-pdf"></i><p>Toca para examinar</p>
                    <span id="file-selected-name" class="file-selected-text"></span>
                    <input type="file" id="modal-file" accept="application/pdf" style="display:none;" onchange="parseFileToBase64(event)">
                </div>
            </div>
            <button class="btn-action" onclick="executeWorkflowTransition('SUNDDE_ADMITIR')"><i class="fas fa-check"></i> Admitir</button>
        `;
    } 
    else if ((role.includes("denunciado") || role.includes("empresa"))) {
        if(estatusActual === "Admitido") {
            formC.innerHTML = `
                <h4 style="color:var(--primary); margin-bottom:15px;">Cargar Atención</h4>
                <div class="form-group"><label>Mensaje / Solución</label><textarea id="empresa-comentario" style="height:70px;"></textarea></div>
                <div class="modal-grid">
                    <div class="form-group"><label>Acta (PDF)</label><div class="dropzone-container" onclick="document.getElementById('modal-file').click()"><i class="fas fa-file-pdf" style="font-size:1.5rem;"></i><span id="file-selected-name" class="file-selected-text"></span><input type="file" id="modal-file" accept=".pdf" style="display:none;" onchange="parseFileToBase64(event)"></div></div>
                    <div class="form-group"><label>Foto Entrega</label><div class="dropzone-container" onclick="document.getElementById('modal-photo').click()"><i class="fas fa-image" style="font-size:1.5rem;"></i><span id="photo-selected-name" class="file-selected-text"></span><input type="file" id="modal-photo" accept="image/*" style="display:none;" onchange="parsePhotoToBase64(event)"></div></div>
                </div>
                <button class="btn-action" onclick="executeWorkflowTransition('EMPRESA_ATENDER')"><i class="fas fa-paper-plane"></i> Enviar</button>
            `;
        } else if(estatusActual === "En Revisión") {
            formC.innerHTML = `
                <h4 style="color:var(--danger); margin-bottom:15px;">Corregir Devolución</h4>
                <div class="form-group"><label>Mensaje Corrección</label><textarea id="empresa-comentario-dev" style="height:70px;"></textarea></div>
                <div class="modal-grid">
                    <div class="form-group"><label>Acta (PDF)</label><div class="dropzone-container" onclick="document.getElementById('modal-file').click()"><i class="fas fa-file-pdf" style="font-size:1.5rem;"></i><span id="file-selected-name" class="file-selected-text"></span><input type="file" id="modal-file" accept=".pdf" style="display:none;" onchange="parseFileToBase64(event)"></div></div>
                    <div class="form-group"><label>Foto Entrega</label><div class="dropzone-container" onclick="document.getElementById('modal-photo').click()"><i class="fas fa-image" style="font-size:1.5rem;"></i><span id="photo-selected-name" class="file-selected-text"></span><input type="file" id="modal-photo" accept="image/*" style="display:none;" onchange="parsePhotoToBase64(event)"></div></div>
                </div>
                <button class="btn-action" style="background:var(--success);" onclick="executeWorkflowTransition('EMPRESA_ATENDER_DEVOLUCION')"><i class="fas fa-paper-plane"></i> Enviar</button>
            `;
        }
    }
    else if (role.includes("fiscal") && estatusActual === "Atendido") {
        formC.innerHTML = `
            <h4 style="color:var(--primary); margin-bottom:15px;">Evaluación Fiscal</h4>
            <div class="form-group"><label>Motivo Devolución</label><textarea id="fiscal-obs" style="height:60px;"></textarea></div>
            <div class="form-group"><label>Acta (PDF Conforme)</label><div class="dropzone-container" onclick="document.getElementById('modal-file').click()"><i class="fas fa-file-signature" style="font-size:1.5rem;"></i><span id="file-selected-name" class="file-selected-text"></span><input type="file" id="modal-file" accept=".pdf" style="display:none;" onchange="parseFileToBase64(event)"></div></div>
            <div class="modal-grid">
                <button class="btn-action" style="background:var(--success);" onclick="executeWorkflowTransition('FISCAL_CONFORME')"><i class="fas fa-thumbs-up"></i> Conforme</button>
                <button class="btn-action" style="background:var(--danger);" onclick="executeWorkflowTransition('FISCAL_REVISION')"><i class="fas fa-undo"></i> Devolver</button>
            </div>
        `;
    }
    else if ((role.includes("seguimiento") || role.includes("asistente")) && estatusActual === "Cerrado") {
        formC.innerHTML = `
            <h4 style="color:var(--primary); margin-bottom:15px;">Encuesta Final</h4>
            <div class="form-group">
                <select id="encuesta-resultado">
                    <option value="">Seleccione...</option>
                    <option value="5">5 - Excelente</option>
                    <option value="4">4 - Bueno</option>
                    <option value="3">3 - Regular</option>
                    <option value="2">2 - Malo</option>
                    <option value="1">1 - Pésimo</option>
                </select>
            </div>
            <button class="btn-action" onclick="executeWorkflowTransition('SEGUIMIENTO_ARCHIVAR')"><i class="fas fa-box-archive"></i> Archivar</button>
        `;
    }
    else if (role.includes("admin") && (estatusActual === "Admitido" || estatusActual === "En Revisión")) {
        formC.innerHTML = `<button class="btn-action btn-sm-warning" onclick="executeWorkflowTransition('ADMIN_ALERTA')"><i class="fas fa-bell"></i> Alertar por Retraso</button>`;
    }

    document.getElementById('super-card-modal').style.display = "flex";
}

function closeSuperCard() { document.getElementById('super-card-modal').style.display = "none"; }

function parseFileToBase64(event) {
    const file = event.target.files[0]; if (!file) return; attachedFileName = file.name;
    const r = new FileReader(); r.onload = function(e) { attachedFileBase64 = e.target.result; document.getElementById('file-selected-name').innerText = "✓ "+file.name; document.getElementById('file-selected-name').style.display="block"; }; r.readAsDataURL(file);
}
function parsePhotoToBase64(event) {
    const file = event.target.files[0]; if (!file) return; attachedPhotoName = file.name;
    const r = new FileReader(); r.onload = function(e) { attachedPhotoBase64 = e.target.result; document.getElementById('photo-selected-name').innerText = "✓ "+file.name; document.getElementById('photo-selected-name').style.display="block"; }; r.readAsDataURL(file);
}

async function executeWorkflowTransition(subAction) {
    let dataPayload = { rowIndex: selectedRowData.rowIndex, fileBase64: attachedFileBase64, fileName: attachedFileName, photoBase64: attachedPhotoBase64, photoName: attachedPhotoName };

    if (subAction === "EMPRESA_ATENDER") { dataPayload.comentario = document.getElementById('empresa-comentario').value.trim(); }
    if (subAction === "EMPRESA_ATENDER_DEVOLUCION") { dataPayload.comentarioDevolucion = document.getElementById('empresa-comentario-dev').value.trim(); }
    if (subAction === "FISCAL_REVISION") { dataPayload.comentarioFiscal = document.getElementById('fiscal-obs').value.trim(); }
    if (subAction === "SEGUIMIENTO_ARCHIVAR") { dataPayload.encuesta = document.getElementById('encuesta-resultado').value; }

    closeSuperCard();
    document.getElementById('tbody-denuncias').innerHTML = "<tr><td colspan='6' style='text-align:center;'><i class='fas fa-spinner fa-spin'></i> Subiendo información...</td></tr>";

    const res = await sendToBackend("procesarDenuncia", { subAction: subAction, data: dataPayload });

    if (res && res.success) { showCustomAlert("Éxito", "Gestión procesada.", "success"); } 
    else { showCustomAlert("Error", res.message || "Fallo servidor.", "error"); }

    await loadDataGrid();
}

async function loadAnalyticsData() {
    const stats = await sendToBackend("getStats", {});
    if (stats) {
        document.getElementById('stat-recibidas').innerText = stats.recibidas || 0;
        document.getElementById('stat-atendidas').innerText = stats.atendidas || 0;
        document.getElementById('stat-cerradas').innerText = stats.cerradas || 0;
    }
}

function switchView(viewId) {
    document.querySelectorAll('.workspace-view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.menu-link').forEach(l => l.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    event.currentTarget.classList.add('active');
    
    if(viewId === 'view-analytics') {
        document.getElementById('current-view-title').innerText = "Estadísticas";
        document.getElementById('admin-filter').style.display = "none";
    } else {
        document.getElementById('current-view-title').innerText = "Bandeja";
        if(currentUser.role.includes("admin") || currentUser.role.includes("asistente")) {
            document.getElementById('admin-filter').style.display = "flex";
        }
    }
}