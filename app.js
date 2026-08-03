const webappurl = "https://script.google.com/macros/s/AKfycbx3WevFFa8gvlllgxm4zDqCQo7q3cso0ci9S2L3ZYnQXB2agBpFfRgRnA0PdaQLIbE-/exec";
const SECURITY_TOKEN = "SUNDDE_SECURE_2026_TOKEN";

let currentUser = null;
let globalDenunciasData = [];
let selectedRowData = null;
let attachedFileBase64 = "", attachedFileName = "";
let attachedPhotoBase64 = "", attachedPhotoName = "";

document.getElementById('live-date').innerText = new Date().toLocaleDateString('es-VE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

function formatDateToDDMMYYYY(dateStr) {
    if(!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if(isNaN(d)) return dateStr;
    return d.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

document.addEventListener("DOMContentLoaded", () => {
    const savedSession = localStorage.getItem("sundde_session");
    if (!savedSession) {
        window.location.href = "index.html";
        return;
    }
    currentUser = JSON.parse(savedSession);
    buildAppWorkspace();
    
    document.addEventListener("click", (e) => {
        const drop = document.getElementById('alerts-dropdown');
        if(drop) drop.style.display = "none";
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeSuperCard();
            closeInternalChat();
            closeCustomAlert();
        }
    });

    document.querySelectorAll('.modal').forEach(modalElement => {
        modalElement.addEventListener('click', (e) => {
            if (e.target === modalElement) {
                if (modalElement.id === 'super-card-modal') closeSuperCard();
                else if (modalElement.id === 'internal-chat-modal') closeInternalChat();
                else if (modalElement.id === 'custom-alert') closeCustomAlert();
            }
        });
    });
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
        return { success: false, message: "Error crítico de red." };
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
    if (rolLower.includes("administrador general") || rolLower.includes("admin")) {
        document.getElementById('link-stats').style.display = "flex";
        document.getElementById('subfilter-empresa-container').style.display = "block";
        document.getElementById('admin-filter').style.display = "flex";
    } else {
        document.getElementById('admin-filter').style.display = "none";
    }

    loadDataGrid();
    setInterval(loadDataGridSilently, 10000);
}

async function loadDataGrid() {
    const grid = document.getElementById('grid-denuncias');
    grid.innerHTML = "<div style='grid-column: 1 / -1; text-align:center; padding: 20px; color:#64748B;'><i class='fas fa-spinner fa-spin'></i> Sincronizando con servidor...</div>";
    
    const responseData = await sendToBackend("getDenuncias", { user: currentUser.email });
    if (!responseData || !Array.isArray(responseData)) {
        grid.innerHTML = "<div style='grid-column: 1 / -1; text-align:center; padding: 20px; color:var(--danger);'>Error sincronizando datos.</div>";
        return;
    }
    globalDenunciasData = responseData;
    populateEmpresasSubfilter();
    renderDataGrid();
    updateAlertsNotification();
}

async function loadDataGridSilently() {
    const responseData = await sendToBackend("getDenuncias", { user: currentUser.email });
    if (responseData && Array.isArray(responseData)) {
        globalDenunciasData = responseData;
        populateEmpresasSubfilter();
        renderDataGrid();
        updateAlertsNotification();
        
        if (document.getElementById('internal-chat-modal').style.display === "flex") {
            loadGlobalChatMessages();
        }
    }
}

function populateEmpresasSubfilter() {
    const selectEmpAdmin = document.getElementById('select-filtro-empresa');
    const selectEmpChat = document.getElementById('chat-target-empresa');
    
    const empresasUnicas = [...new Set(globalDenunciasData.map(item => item.EMPRESA).filter(Boolean))];
    
    if (selectEmpAdmin && selectEmpAdmin.options.length <= 1) {
        empresasUnicas.forEach(emp => {
            const opt = document.createElement('option'); opt.value = emp; opt.innerText = emp;
            selectEmpAdmin.appendChild(opt);
        });
    }
    
    if (selectEmpChat && selectEmpChat.options.length <= 1) {
        empresasUnicas.forEach(emp => {
            const opt = document.createElement('option'); opt.value = emp; opt.innerText = emp;
            selectEmpChat.appendChild(opt);
        });
    }
}

function renderDataGrid() {
    const grid = document.getElementById('grid-denuncias');
    grid.innerHTML = "";
    const userRoleLower = currentUser.role.toLowerCase();
    const filtroDropdown = document.getElementById('select-filtro-estatus').value;
    const subfiltroEmpresa = document.getElementById('select-filtro-empresa')?.value || "TODAS";

    let filtered = globalDenunciasData.filter(item => {
        const estatusOriginal = item.STATUS ? item.STATUS.toString().trim() : "Nuevo";
        let estatusNormalizado = estatusOriginal;
        const estadosValidos = ["Admitido", "Atendido", "En Revisión", "Cerrado", "Archivado"];
        if (!estadosValidos.includes(estatusOriginal)) estatusNormalizado = "Nuevo";

        let cumplePermisosRol = false;
        if (userRoleLower.includes("administrador general") || userRoleLower.includes("admin")) {
            cumplePermisosRol = true;
        } else if (userRoleLower.includes("denunciado") || userRoleLower.includes("empresa")) {
            if (item.EMPRESA && item.EMPRESA.toString().toLowerCase() === currentUser.empresa.toString().toLowerCase()) {
                cumplePermisosRol = (estatusNormalizado === "Admitido" || estatusNormalizado === "En Revisión");
            }
        } else if (userRoleLower.includes("sundde") && !userRoleLower.includes("asistente") && !userRoleLower.includes("fiscal")) {
            cumplePermisosRol = (estatusNormalizado === "Nuevo");
        } else if (userRoleLower.includes("fiscal")) {
            cumplePermisosRol = (estatusNormalizado === "Atendido");
        } else if (userRoleLower.includes("seguimiento") || userRoleLower.includes("asistente")) {
            cumplePermisosRol = (estatusNormalizado === "Cerrado" || estatusNormalizado === "Atendido" || estatusNormalizado === "En Revisión" || estatusNormalizado === "Admitido");
        }

        if (!cumplePermisosRol) return false;
        if (filtroDropdown !== "TODOS" && estatusNormalizado !== filtroDropdown) return false;
        if ((userRoleLower.includes("admin") || userRoleLower.includes("administrador general")) && subfiltroEmpresa !== "TODAS") {
            if (item.EMPRESA !== subfiltroEmpresa) return false;
        }

        return true;
    });

    if (filtered.length === 0) {
        grid.innerHTML = "<div style='grid-column: 1 / -1; text-align:center; padding: 20px; color:#64748B;'>No hay expedientes asignados en este criterio.</div>";
        return;
    }

    filtered.forEach(item => {
        const estatusOriginal = item.STATUS ? item.STATUS.toString().trim() : "Nuevo";
        let estatusNormalizado = estatusOriginal;
        if (!["Admitido", "Atendido", "En Revisión", "Cerrado", "Archivado"].includes(estatusOriginal)) estatusNormalizado = "Nuevo";

        let statusClass = "status-nuevo";
        if (estatusNormalizado === "Admitido") statusClass = "status-envcomp";
        if (estatusNormalizado === "Atendido") statusClass = "status-atcomp";
        if (estatusNormalizado === "En Revisión") statusClass = "status-devuelto";
        if (estatusNormalizado === "Cerrado") statusClass = "status-cerradofisc";
        if (estatusNormalizado === "Archivado") statusClass = "status-final";

        let actionButton = `<button class="btn-sm" onclick="openSuperCard(${item.rowIndex})"><i class="fas fa-eye"></i> Ver Detalle</button>`;

        if (userRoleLower.includes("sundde") && !userRoleLower.includes("asistente") && !userRoleLower.includes("fiscal") && estatusNormalizado === "Nuevo") {
            actionButton = `<button class="btn-sm btn-sm-primary" onclick="openSuperCard(${item.rowIndex})"><i class="fas fa-file-signature"></i> Admitir</button>`;
        } else if ((userRoleLower.includes("denunciado") || userRoleLower.includes("empresa")) && (estatusNormalizado === "Admitido" || estatusNormalizado === "En Revisión")) {
            actionButton = `<button class="btn-sm btn-sm-primary" onclick="openSuperCard(${item.rowIndex})"><i class="fas fa-gavel"></i> Atender</button>`;
        } else if (userRoleLower.includes("fiscal") && estatusNormalizado === "Atendido") {
            actionButton = `<button class="btn-sm btn-sm-primary" onclick="openSuperCard(${item.rowIndex})"><i class="fas fa-balance-scale"></i> Evaluar</button>`;
        } else if ((userRoleLower.includes("seguimiento") || userRoleLower.includes("asistente")) && estatusNormalizado === "Cerrado") {
            actionButton = `<button class="btn-sm btn-sm-success" onclick="openSuperCard(${item.rowIndex})"><i class="fas fa-box-archive"></i> Archivar</button>`;
        }

        const card = document.createElement('div');
        card.className = "denuncia-card";
        card.innerHTML = `
            <div class="card-header">
                <span style="font-weight:700; color:var(--primary); cursor:pointer;" onclick="openSuperCard(${item.rowIndex})">
                    <i class="fas fa-expand" style="margin-right:5px; color:var(--secondary);"></i> ${item.DENUNCIA || ('F-' + item.rowIndex)}
                </span>
                <span class="badge ${statusClass}">${estatusNormalizado}</span>
            </div>
            <div class="card-body">
                <div><strong>Empresa:</strong> ${item.EMPRESA || 'N/A'} <span style="font-size:0.75rem; color:#64748B;">(${item['R.I.F / C.I.'] || ''})</span></div>
                <div><strong>Denunciante:</strong> ${item.DENUNCIANTE || 'Anónimo'} <span style="font-size:0.75rem; color:#64748B;">(V-${item['C.I.'] || ''})</span></div>
                <div><strong>Bien / Servicio:</strong> ${item['BIEN/SERVICIO'] || 'No detallado'}</div>
            </div>
            <div class="card-footer">
                ${actionButton}
            </div>
        `;
        grid.appendChild(card);
    });

    if(userRoleLower.includes("admin") || userRoleLower.includes("administrador general")) loadAnalyticsData();
}

function getDriveBtn(url, text, colorClass) {
    if (!url) return "";
    return `<a href="${url}" target="_blank" class="btn-sm ${colorClass}" style="margin-right:5px; margin-bottom:5px; display:inline-block;"><i class="fas fa-link"></i> ${text}</a>`;
}

function openSuperCard(rowIndex) {
    selectedRowData = globalDenunciasData.find(d => d.rowIndex === rowIndex);
    if(!selectedRowData) return;

    const modal = document.getElementById('super-card-modal');
    attachedFileBase64 = ""; attachedFileName = ""; attachedPhotoBase64 = ""; attachedPhotoName = "";
    
    document.getElementById('modal-title').innerText = `Expediente: ${selectedRowData.DENUNCIA || 'N/A'}`;
    document.getElementById('md-empresa').innerText = selectedRowData.EMPRESA || 'N/A';
    document.getElementById('md-denunciante').innerText = selectedRowData.DENUNCIANTE || 'Anónimo';
    document.getElementById('md-cedula').innerText = selectedRowData['C.I.'] || 'N/A';
    
    const telDenunciante = selectedRowData['TELEFONO'] || '';
    const telEmpresa = selectedRowData['TELEFONO_EMPRESA'] || '';
    document.getElementById('md-telefono').innerText = telDenunciante + (telEmpresa ? " / " + telEmpresa : "");
    
    document.getElementById('md-direccion').innerText = selectedRowData.DIRECCION || 'N/A';
    document.getElementById('md-producto').innerText = selectedRowData['BIEN/SERVICIO'] || 'N/A';
    document.getElementById('md-motivo').innerText = selectedRowData.OBSERVACIONES || selectedRowData.RESULTADO || 'N/A';
    
    document.getElementById('md-fecha').innerText = formatDateToDDMMYYYY(selectedRowData['FECHA DENUNCIA']);
    
    const estOriginal = selectedRowData.STATUS ? selectedRowData.STATUS.toString().trim() : "Nuevo";
    const estBadge = document.getElementById('md-estatus');
    estBadge.innerText = estOriginal;
    estBadge.className = "badge status-nuevo"; 

    let histHtml = "";
    if (selectedRowData.PDF_SUNDDE) {
        histHtml += `<div class="history-box" style="border-left-color: var(--primary);"><h5><i class="fas fa-file-pdf"></i> Soporte Inicial SUNDDE</h5>${getDriveBtn(selectedRowData.PDF_SUNDDE, "Ver Acta SUNDDE", "btn-sm-primary")}</div>`;
    }
    if (selectedRowData.Respuesta_Empresa) {
        histHtml += `<div class="history-box" style="border-left-color: var(--warning);"><h5><i class="fas fa-industry"></i> Atención de la Empresa</h5><p style="margin-bottom:8px;">${selectedRowData.Respuesta_Empresa}</p>${getDriveBtn(selectedRowData.PDF_Empresa, "Acta Empresa", "btn-sm-warning")} ${getDriveBtn(selectedRowData.Foto_Empresa, "Foto Entrega", "btn-sm-primary")}</div>`;
    }
    if (selectedRowData.Comentario_Fiscal) {
        histHtml += `<div class="history-box" style="border-left-color: var(--danger);"><h5><i class="fas fa-times-circle"></i> Devolución Fiscal</h5><p>${selectedRowData.Comentario_Fiscal}</p></div>`;
    }
    if (selectedRowData.Comentario_Devolucion_Empresa) {
        histHtml += `<div class="history-box" style="border-left-color: var(--secondary);"><h5><i class="fas fa-industry"></i> Corrección de la Empresa</h5><p style="margin-bottom:8px;">${selectedRowData.Comentario_Devolucion_Empresa}</p>${getDriveBtn(selectedRowData.PDF_Devolucion_Empresa, "PDF Corrección", "btn-sm-warning")} ${getDriveBtn(selectedRowData.Foto_Devolucion_Empresa, "Foto Corrección", "btn-sm-primary")}</div>`;
    }
    if (selectedRowData.PDF_Fiscal) {
        histHtml += `<div class="history-box" style="border-left-color: var(--success);"><h5><i class="fas fa-check-double"></i> Cierre Definitivo Fiscal</h5>${getDriveBtn(selectedRowData.PDF_Fiscal, "Ver Certificación Fiscal", "btn-sm-success")}</div>`;
    }
    if (selectedRowData.Satisfaccion_Encuesta) {
        histHtml += `<div class="history-box" style="border-left-color: #8B5CF6;"><h5><i class="fas fa-star"></i> Puntuación de Satisfacción</h5><p>Registrado: <strong>${selectedRowData.Satisfaccion_Encuesta} / 5 puntos</strong></p></div>`;
    }

    if(!histHtml) histHtml = "<p style='font-size:0.85rem; color:#64748B;'>Aún no hay soportes cargados en este expediente.</p>";
    document.getElementById('historico-content').innerHTML = histHtml;

    const formC = document.getElementById('modal-action-form');
    formC.innerHTML = "";
    const role = currentUser.role.toLowerCase();

    if (role.includes("sundde") && !role.includes("asistente") && !role.includes("fiscal") && estOriginal === "Nuevo") {
        formC.innerHTML = `
            <h4 style="color:var(--primary); margin-bottom:15px;">Admitir Caso a la Empresa</h4>
            <div class="form-group">
                <label>(PDF Obligatorio)</label>
                <div class="btn-upload-pill" style="border-radius: 25px;" onclick="document.getElementById('modal-file').click()">
                    <span class="file-selected-text">ADJUNTAR DOCUMENTACIÓN (PDF)</span>
                    <i class="fas fa-upload"></i>
                    <input type="file" id="modal-file" accept="application/pdf" style="display:none;" onchange="parseFileToBase64(event)">
                </div>
            </div>
            <button id="btn-submit-action" class="btn-action" style="border-radius: 25px;" onclick="executeWorkflowTransition('SUNDDE_ADMITIR', this)"><i class="fas fa-check"></i> Admitir a la Empresa</button>`;
    } 
    else if ((role.includes("denunciado") || role.includes("empresa"))) {
        if(estOriginal === "Admitido") {
            formC.innerHTML = `
            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px; width: 100%;">
                <h4 style="color:var(--primary); margin:0; white-space: nowrap;">Cargar Atención</h4>
                <div style="flex-grow: 1; display: flex; flex-direction: column;">
                    <label style="font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px; text-transform: uppercase;">Mensaje Adicional</label>
                    <textarea id="empresa-comentario" style="height:45px; min-height:45px; width:100%; box-sizing:border-box; padding:10px; resize:none;"></textarea>
                </div>
            </div>
            <div style="display:flex; justify-content:center; gap:20px; margin-bottom:20px;">
                <div style="text-align: center;">
                    <label style="display: block; font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; text-transform: uppercase;">Acta (PDF)</label>
                    <div class="btn-upload-pill" style="margin:0; width: 170px; display: flex; justify-content: center; align-items: center; background: #3B82F6; border-radius: 25px; padding: 10px; color: white; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.1);" onclick="document.getElementById('modal-file').click()">
                        <span class="file-selected-text" style="font-size: 0.85rem; font-weight: bold;">UPLOAD ACTA</span>
                        <i class="fas fa-upload" style="margin-left: 8px;"></i>
                        <input type="file" id="modal-file" accept=".pdf" style="display:none;" onchange="parseFileToBase64(event)">
                    </div>
                </div>
                <div style="text-align: center;">
                    <label style="display: block; font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; text-transform: uppercase;">Foto Entrega</label>
                    <div class="btn-upload-pill" style="margin:0; width: 170px; display: flex; justify-content: center; align-items: center; background: #10B981; border-radius: 25px; padding: 10px; color: white; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.1);" onclick="document.getElementById('modal-photo').click()">
                        <span class="file-selected-text" style="font-size: 0.85rem; font-weight: bold;">UPLOAD FOTO</span>
                        <i class="fas fa-upload" style="margin-left: 8px;"></i>
                        <input type="file" id="modal-photo" accept="image/*" style="display:none;" onchange="parsePhotoToBase64(event)">
                    </div>
                </div>
            </div>
            <div style="display: flex; justify-content: center;">
                <button id="btn-submit-action" class="btn-action" style="width: auto; padding: 12px 35px; border-radius: 25px;" onclick="executeWorkflowTransition('EMPRESA_ATENDER', this)">
                    <i class="fas fa-paper-plane"></i> Reportar Atención al Fiscal
                </button>
            </div>`;
        } else if(estOriginal === "En Revisión") {
            formC.innerHTML = `
            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px; width: 100%;">
                <h4 style="color:var(--danger); margin:0; white-space: nowrap;">Corregir Devolución</h4>
                <div style="flex-grow: 1; display: flex; flex-direction: column;">
                    <label style="font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px; text-transform: uppercase;">Mensaje de Corrección</label>
                    <textarea id="empresa-comentario-dev" style="height:45px; min-height:45px; width:100%; box-sizing:border-box; padding:10px; resize:none;"></textarea>
                </div>
            </div>
            <div style="display:flex; justify-content:center; gap:20px; margin-bottom:20px;">
                <div style="text-align: center;">
                    <label style="display: block; font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; text-transform: uppercase;">Nueva Acta (PDF)</label>
                    <div class="btn-upload-pill" style="margin:0; width: 170px; display: flex; justify-content: center; align-items: center; background: #3B82F6; border-radius: 25px; padding: 10px; color: white; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.1);" onclick="document.getElementById('modal-file').click()">
                        <span class="file-selected-text" style="font-size: 0.85rem; font-weight: bold;">UPLOAD ACTA</span>
                        <i class="fas fa-upload" style="margin-left: 8px;"></i>
                        <input type="file" id="modal-file" accept=".pdf" style="display:none;" onchange="parseFileToBase64(event)">
                    </div>
                </div>
                <div style="text-align: center;">
                    <label style="display: block; font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; text-transform: uppercase;">Nueva Foto Entrega</label>
                    <div class="btn-upload-pill" style="margin:0; width: 170px; display: flex; justify-content: center; align-items: center; background: #10B981; border-radius: 25px; padding: 10px; color: white; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.1);" onclick="document.getElementById('modal-photo').click()">
                        <span class="file-selected-text" style="font-size: 0.85rem; font-weight: bold;">UPLOAD FOTO</span>
                        <i class="fas fa-upload" style="margin-left: 8px;"></i>
                        <input type="file" id="modal-photo" accept="image/*" style="display:none;" onchange="parsePhotoToBase64(event)">
                    </div>
                </div>
            </div>
            <div style="display: flex; justify-content: center;">
                <button id="btn-submit-action" class="btn-action" style="width: auto; padding: 12px 35px; border-radius: 25px;" onclick="executeWorkflowTransition('EMPRESA_ATENDER_DEVOLUCION', this)">
                    <i class="fas fa-paper-plane"></i> Enviar Corrección
                </button>
            </div>`;
        }
    }
    else if (role.includes("fiscal") && estOriginal === "Atendido") {
        formC.innerHTML = `
            <h4 style="color:var(--primary); margin-bottom:15px;">Evaluación Fiscal</h4>
            <div class="form-group">
                <label>Motivo de Devolución (Solo si No Conforme)</label>
                <textarea id="fiscal-obs" style="min-height:120px; width:100%; box-sizing:border-box; padding:10px; margin-bottom:10px; resize:vertical;"></textarea>
            </div>
            <div class="form-group">
                <label>Acta Fiscal de Conclusión (PDF obligatorio para Cierre)</label>
                <div class="btn-upload-pill" style="border-radius: 25px;" onclick="document.getElementById('modal-file').click()">
                    <span class="file-selected-text">UPLOAD ACTA FISCAL</span>
                    <i class="fas fa-upload"></i>
                    <input type="file" id="modal-file" accept=".pdf" style="display:none;" onchange="parseFileToBase64(event)">
                </div>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:15px;">
                <button id="btn-submit-action" class="btn-action" style="border-radius: 25px; color: #10B981;" onclick="executeWorkflowTransition('FISCAL_CONFORME', this)"><i class="fas fa-thumbs-up"></i> Conforme (Cerrar)</button>
                <button class="btn-action" style="border-radius: 25px; color: #EF4444;" onclick="executeWorkflowTransition('FISCAL_REVISION', this)"><i class="fas fa-undo"></i> Devolver</button>
            </div>`;
    }
    else if ((role.includes("seguimiento") || role.includes("asistente")) && estOriginal === "Cerrado") {
        formC.innerHTML = `
            <h4 style="color:var(--primary); margin-bottom:15px;">Encuesta de Seguimiento</h4>
            <div class="form-group">
                <label>Resultado Encuesta</label>
                <select id="encuesta-resultado" style="width:100%; padding:10px; border-radius:12px;">
                    <option value="">Seleccione puntuación...</option>
                    <option value="5">5 - Excelente</option>
                    <option value="4">4 - Bueno</option>
                    <option value="3">3 - Regular</option>
                    <option value="2">2 - Malo</option>
                    <option value="1">1 - Pésimo</option>
                </select>
            </div>
            <button id="btn-submit-action" class="btn-action" style="margin-top:15px; border-radius: 25px;" onclick="executeWorkflowTransition('SEGUIMIENTO_ARCHIVAR', this)"><i class="fas fa-box-archive"></i> Archivar Definitivo</button>`;
    }
    else if ((role.includes("admin") || role.includes("administrador general")) && (estOriginal === "Admitido" || estOriginal === "En Revisión")) {
        formC.innerHTML = `
            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px; width: 100%;">
                <h4 style="color:var(--warning); margin:0; white-space: nowrap;"><i class="fas fa-bell"></i> - </h4>
                <div style="flex-grow: 1; display: flex; flex-direction: column;">
                    <label style="font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px; text-transform: uppercase;">Mensaje de Alerta Urgente</label>
                    <input type="text" id="admin-alerta-texto" placeholder="Escriba la advertencia por retraso..." style="height:45px; width:100%; box-sizing:border-box; padding:10px;">
                </div>
            </div>
            <div style="display: flex; justify-content: center;">
                <button id="btn-submit-action" class="btn-action" style="width: auto; padding: 12px 35px; background:var(--warning); color:#27273a; border-radius: 25px; font-weight: bold;" onclick="executeWorkflowTransition('ADMIN_ALERTA', this)">
                    <i class="fas fa-bullhorn"></i> Enviar Alerta
                </button>
            </div>`;
    }

    modal.style.display = "flex";
}

function closeSuperCard() { document.getElementById('super-card-modal').style.display = "none"; selectedRowData = null; }

function getInternalChatChannel() {
    const role = currentUser.role.toLowerCase();
    const isAdmin = role.includes("admin") || role.includes("administrador general");
    
    if (isAdmin) {
        const targetRole = document.getElementById('chat-target-role').value.trim();
        const targetEmp = targetRole === 'empresa' ? document.getElementById('chat-target-empresa').value.trim() : 'GENERAL';
        return `CHAT_${targetRole.toUpperCase()}_${targetEmp.toUpperCase()}`;
    } else {
        let myRoleGrp = "sundde";
        if (role.includes("empresa") || role.includes("denunciado")) myRoleGrp = "empresa";
        else if (role.includes("fiscal")) myRoleGrp = "fiscal";
        else if (role.includes("asistente") || role.includes("seguimiento")) myRoleGrp = "asistente";
        
        const myEmp = myRoleGrp === "empresa" ? (currentUser.empresa || "GENERAL").toString().trim() : "GENERAL";
        return `CHAT_${myRoleGrp.toUpperCase()}_${myEmp.toUpperCase()}`;
    }
}

function updateChatEmpresaSelector() {
    const roleSel = document.getElementById('chat-target-role').value;
    const empSel = document.getElementById('chat-target-empresa');
    if (roleSel === 'empresa') {
        empSel.style.display = "inline-block";
    } else {
        empSel.style.display = "none";
    }
}

function openInternalChat() {
    document.getElementById('internal-chat-modal').style.display = 'flex';
    
    let warningMsg = document.getElementById('chat-warning-msg');
    if(!warningMsg) {
        const chatModal = document.getElementById('internal-chat-modal');
        const header = chatModal.querySelector('.modal-header');
        if(header) {
            warningMsg = document.createElement('div');
            warningMsg.id = 'chat-warning-msg';
            warningMsg.style.cssText = "background: #FEF3C7; color: #92400E; padding: 10px; border-radius: 4px; font-size: 0.85rem; margin-bottom: 15px; border-left: 4px solid #F59E0B; text-align: center;";
            warningMsg.innerText = "El chat esta en proceso de contrucción, puede presentar fallas en algun momento y ponerse lento, pero se esta trabajando para optimizarlo y colocarlo en total funcionamiento proximamente...";
            header.insertAdjacentElement('afterend', warningMsg);
        }
    }

    const role = currentUser.role.toLowerCase();
    if (role.includes("admin") || role.includes("administrador general")) {
        document.getElementById('chat-admin-selectors').style.display = 'flex';
    }
    loadGlobalChatMessages();
}

function closeInternalChat() {
    document.getElementById('internal-chat-modal').style.display = 'none';
}

async function loadGlobalChatMessages() {
    const container = document.getElementById('global-chat-box');
    if (!container) return;
    
    const channelId = getInternalChatChannel();
    const response = await sendToBackend("getChatMessages", { idDenuncia: channelId });
    container.innerHTML = "";
    
    if (response && Array.isArray(response) && response.length > 0) {
        response.forEach(msg => {
            const div = document.createElement('div');
            div.style.padding = "8px 12px";
            div.style.borderRadius = "4px";
            div.style.fontSize = "0.85rem";
            div.style.maxWidth = "85%";
            
            if (msg.usuario === currentUser.nombre) {
                div.style.background = "#E0E7FF";
                div.style.alignSelf = "flex-end";
                div.style.borderLeft = "3px solid var(--primary)";
            } else {
                div.style.background = "#FFFFFF";
                div.style.alignSelf = "flex-start";
                div.style.borderLeft = "3px solid var(--secondary)";
            }
            div.innerHTML = `<strong>${msg.usuario}</strong> <span style="font-size:0.7rem; color:#64748B;">(${msg.rol}) - ${msg.fecha}</span><br><p style="margin-top:2px;">${msg.mensaje}</p>`;
            container.appendChild(div);
        });
        container.scrollTop = container.scrollHeight;
    } else {
        container.innerHTML = "<p style='font-size:0.75rem; color:#64748B; text-align:center;'>No hay mensajes en este canal privado.</p>";
    }
}

async function sendGlobalChatMessage() {
    const input = document.getElementById('global-chat-input');
    const txt = input.value.trim();
    if (!txt) return;
    
    const btn = document.getElementById('btn-send-global-chat');
    btn.disabled = true;
    
    const channelId = getInternalChatChannel();
    const res = await sendToBackend("sendChatMessage", { idDenuncia: channelId, usuario: currentUser.nombre, rol: currentUser.role, mensaje: txt });
    
    if (res && res.success) {
        input.value = "";
        await loadGlobalChatMessages();
    }
    btn.disabled = false;
}

function toggleAlertsDropdown(e) {
    e.stopPropagation();
    const dropdown = document.getElementById('alerts-dropdown');
    dropdown.style.display = dropdown.style.display === "none" ? "flex" : "none";
}

function updateAlertsNotification() {
    const listC = document.getElementById('alerts-list');
    const badge = document.getElementById('alert-badge');
    const bellWrapper = document.getElementById('notification-bell-wrapper');
    if (!listC) return;
    
    listC.innerHTML = "";
    const role = currentUser.role.toLowerCase();
    
    if (role.includes("denunciado") || role.includes("empresa")) {
        bellWrapper.style.display = "block";
        
        let activeAlerts = globalDenunciasData.filter(item => 
            item.Alerta && item.Alerta.toString().trim() !== "" && 
            item.EMPRESA && item.EMPRESA.toString().toLowerCase() === currentUser.empresa.toString().toLowerCase()
        );
        
        if (activeAlerts.length > 0) {
            badge.innerText = activeAlerts.length;
            badge.style.display = "block";
            
            activeAlerts.forEach(item => {
                const div = document.createElement('div');
                div.style.cssText = "display:flex; justify-content:space-between; align-items:center; background:#FEF2F2; border-left:4px solid var(--danger); padding:10px; border-radius:4px; font-size:0.8rem; gap:10px;";
                div.innerHTML = `
                    <div style="flex:1;">
                        <strong style="color:var(--danger);">Expediente: ${item.DENUNCIA || 'N/A'}</strong><br>
                        <span style="color:#334155;">${item.Alerta}</span>
                    </div>
                    <i class="fas fa-trash-can" style="color:var(--danger); cursor:pointer; padding:6px;" onclick="deleteAlertFromServer(${item.rowIndex}, event)"></i>
                `;
                listC.appendChild(div);
            });
        } else {
            badge.style.display = "none";
            listC.innerHTML = '<p style="font-size:0.8rem; color:#64748B; text-align:center; padding:10px;">No tienes alertas pendientes.</p>';
        }
    } else {
        bellWrapper.style.display = "none";
    }
}

async function deleteAlertFromServer(rowIndex, e) {
    e.stopPropagation();
    const res = await sendToBackend("clearAlert", { rowIndex: rowIndex });
    if (res && res.success) {
        await loadDataGridSilently();
    } else {
        showCustomAlert("Error", "No se pudo limpiar el registro en Sheets.", "error");
    }
}

function parseFileToBase64(event) {
    const file = event.target.files[0]; if (!file) return; attachedFileName = file.name;
    const container = event.target.closest('.btn-upload-pill');
    const r = new FileReader(); 
    r.onload = function(e) { 
        attachedFileBase64 = e.target.result; 
        const lbl = container.querySelector('.file-selected-text'); 
        lbl.innerText = "✓ " + file.name;
        container.querySelector('i').className = 'fas fa-check-circle';
    }; 
    r.readAsDataURL(file);
}

function parsePhotoToBase64(event) {
    const file = event.target.files[0]; if (!file) return; attachedPhotoName = file.name;
    const container = event.target.closest('.btn-upload-pill');
    const r = new FileReader(); 
    r.onload = function(e) { 
        attachedPhotoBase64 = e.target.result; 
        const lbl = container.querySelector('.file-selected-text'); 
        lbl.innerText = "✓ " + file.name;
        container.querySelector('i').className = 'fas fa-check-circle';
    }; 
    r.readAsDataURL(file);
}

async function executeWorkflowTransition(subAction, btnElement) {
    let dataPayload = { rowIndex: selectedRowData.rowIndex, fileBase64: attachedFileBase64, fileName: attachedFileName, photoBase64: attachedPhotoBase64, photoName: attachedPhotoName };

    if (subAction === "SUNDDE_ADMITIR") {
        if (!attachedFileBase64) {
            showCustomAlert("Archivo Requerido", "No puede ser admitida sin el archivo PDF[span_2](start_span)[span_2](end_span).", "error");
            return;
        }
    }
    if (subAction === "EMPRESA_ATENDER") {
        const com = document.getElementById('empresa-comentario').value.trim();
        if (!com || !attachedFileBase64 || !attachedPhotoBase64) { 
            showCustomAlert("Campos Incompletos", "Debe agregar el mensaje de atención, adjuntar el acta en PDF y cargar la foto de evidencia.", "error"); 
            return; 
        }
        dataPayload.comentario = com;
    }
    if (subAction === "EMPRESA_ATENDER_DEVOLUCION") {
        const comDev = document.getElementById('empresa-comentario-dev').value.trim();
        if (!comDev || !attachedFileBase64 || !attachedPhotoBase64) { 
            showCustomAlert("Campos Incompletos", "Debe adjuntar la corrección en texto, la nueva acta en PDF y la foto correspondiente.", "error"); 
            return; 
        }
        dataPayload.comentarioDevolucion = comDev;
    }
    if (subAction === "FISCAL_REVISION") {
        const obs = document.getElementById('fiscal-obs').value.trim();
        if (!obs) { 
            showCustomAlert("Faltan Datos", "Debe rellenar la justificación o motivo de la devolución.", "error"); 
            return; 
        }
        dataPayload.comentarioFiscal = obs;
    }
    if (subAction === "FISCAL_CONFORME") {
        if (!attachedFileBase64) { 
            showCustomAlert("Falta Archivo", "El acta conclusiva firmada en PDF es obligatoria para proceder al cierre.", "error"); 
            return; 
        }
    }
    if (subAction === "SEGUIMIENTO_ARCHIVAR") {
        const enc = document.getElementById('encuesta-resultado').value;
        if (!enc) { 
            showCustomAlert("Faltan Datos", "Debe seleccionar la puntuación obtenida en la encuesta.", "error"); 
            return; 
        }
        dataPayload.encuesta = enc;
    }
    if (subAction === "ADMIN_ALERTA") {
        const textA = document.getElementById('admin-alerta-texto').value.trim();
        if (!textA) { 
            showCustomAlert("Faltan Datos", "Escriba un mensaje válido para la notificación de alerta.", "error"); 
            return; 
        }
        dataPayload.mensajeAlerta = textA;
    }

    document.getElementById('global-loader').style.display = 'flex';

    const res = await sendToBackend("procesarDenuncia", { subAction: subAction, data: dataPayload });
    
    document.getElementById('global-loader').style.display = 'none';
    closeSuperCard();
    
    if (res && res.success) { 
        showCustomAlert("Éxito", "Operación procesada correctamente.", "success"); 
    } else { 
        showCustomAlert("Error", res.message || "Fallo del servidor.", "error"); 
    }
    
    await loadDataGrid();
}

function loadAnalyticsData() {
    const stats = { Nuevo: 0, Admitido: 0, Atendido: 0, "En Revisión": 0, Cerrado: 0, Archivado: 0 };
    const empStats = {};

    globalDenunciasData.forEach(item => {
        const st = item.STATUS ? item.STATUS.toString().trim() : "Nuevo";
        if (stats[st] !== undefined) stats[st]++;
        else stats.Nuevo++;

        if(item.EMPRESA) {
            const emp = item.EMPRESA.toString().trim();
            if(!empStats[emp]) empStats[emp] = { total: 0, Nuevo: 0, Admitido: 0, Atendido: 0, 'En Revisión': 0, Cerrado: 0, Archivado: 0 };
            empStats[emp].total++;
            if(empStats[emp][st] !== undefined) empStats[emp][st]++;
            else empStats[emp].Nuevo++;
        }
    });

    const globCont = document.getElementById('global-stats-container');
    if(globCont) {
        globCont.innerHTML = `
            <div class="stat-card"><div><h5>Nuevos</h5><p>${stats.Nuevo}</p></div></div>
            <div class="stat-card"><div><h5>Admitidos</h5><p>${stats.Admitido}</p></div></div>
            <div class="stat-card" style="border-left-color: var(--success);"><div><h5>Atendidos</h5><p>${stats.Atendido}</p></div></div>
            <div class="stat-card" style="border-left-color: var(--danger);"><div><h5>En Revisión</h5><p>${stats["En Revisión"]}</p></div></div>
            <div class="stat-card" style="border-left-color: var(--primary);"><div><h5>Cerrados</h5><p>${stats.Cerrado}</p></div></div>
            <div class="stat-card" style="border-left-color: #64748B;"><div><h5>Archivados</h5><p>${stats.Archivado}</p></div></div>
        `;
    }

    const compCont = document.getElementById('company-stats-container');
    if(compCont) {
        compCont.innerHTML = "";
        for (const [emp, data] of Object.entries(empStats)) {
            compCont.innerHTML += `
                <div class="corporate-panel" style="padding: 15px;">
                    <h4 style="color: var(--primary); margin-bottom: 12px; border-bottom: 1px solid #E2E8F0; padding-bottom: 8px;"><i class="fas fa-store"></i> ${emp}</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.85rem;">
                        <div><i class="fas fa-circle" style="color:#94A3B8; font-size:0.6rem;"></i> Nuevos: <strong>${data.Nuevo}</strong></div>
                        <div><i class="fas fa-circle" style="color:var(--warning); font-size:0.6rem;"></i> Admitidos: <strong>${data.Admitido}</strong></div>
                        <div><i class="fas fa-circle" style="color:var(--success); font-size:0.6rem;"></i> Atendidos: <strong>${data.Atendido}</strong></div>
                        <div><i class="fas fa-circle" style="color:var(--danger); font-size:0.6rem;"></i> En Revisión: <strong>${data['En Revisión']}</strong></div>
                        <div style="grid-column: 1 / -1;"><i class="fas fa-circle" style="color:var(--primary); font-size:0.6rem;"></i> Cerrados Definitivos: <strong>${data.Cerrado}</strong></div>
                    </div>
                </div>
            `;
        }
    }
}

function switchView(viewId) {
    document.querySelectorAll('.workspace-view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.menu-link').forEach(l => l.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    event.currentTarget.classList.add('active');
    
    if(viewId === 'view-analytics') {
        document.getElementById('current-view-title').innerText = "Estadísticas Institucionales";
        document.getElementById('admin-filter').style.display = "none";
    } else {
        document.getElementById('current-view-title').innerText = "Bandeja Unificada de Expedientes";
        
        if(currentUser.role.toLowerCase().includes("admin") || currentUser.role.toLowerCase().includes("administrador general")) {
            document.getElementById('admin-filter').style.display = "flex";
        } else {
            document.getElementById('admin-filter').style.display = "none";
        }
    }
}

history.pushState(null, null, window.location.href);

window.addEventListener('popstate', function(event) {
    if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
        document.activeElement.blur();
    }

    const superCard = document.getElementById('super-card-modal'); 
    if (superCard && superCard.style.display !== 'none') {
        closeSuperCard();
    }
    
    const internalChat = document.getElementById('internal-chat-modal');
    if (internalChat && internalChat.style.display !== 'none') {
        closeInternalChat();
    }
    
    const customAlert = document.getElementById('custom-alert');
    if (customAlert && customAlert.style.display !== 'none') {
        closeCustomAlert();
    }

    history.pushState(null, null, window.location.href);
});
