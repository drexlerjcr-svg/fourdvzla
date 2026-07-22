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
    
    document.addEventListener("click", () => {
        const drop = document.getElementById('alerts-dropdown');
        if(drop) drop.style.display = "none";
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
    grid.innerHTML = "<div style='grid-column: 1 / -1; text-align:center; padding: 20px; color:#64748B;'><i class='fas fa-spinner fa-spin'></i> Sincronizando con el servidor...</div>";
    
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

        let actionButton = `<button class="btn-sm" style="background:#E2E8F0; color:#475569;" onclick="openSuperCard(${item.rowIndex})"><i class="fas fa-eye"></i> Ver Detalle</button>`;

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
    document.getElementById('md-fecha').innerText = selectedRowData['FECHA DENUNCIA'] || 'N/A';
    
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
        formC.innerHTML = `<h4 style="color:var(--primary); margin-bottom:15px;">Admitir Caso a la Empresa</h4><div class="form-group"><label>Adjuntar Documentación (PDF)</label><div class="dropzone-container" onclick="document.getElementById('modal-file').click()"><i class="fas fa-file-pdf"></i><p>Toca para examinar</p><span class="file-selected-text"></span><input type="file" id="modal-file" accept="application/pdf" style="display:none;" onchange="parseFileToBase64(event)"></div></div><button id="btn-submit-action" class="btn-action" onclick="executeWorkflowTransition('SUNDDE_ADMITIR', this)"><i class="fas fa-check"></i> Admitir a la Empresa</button>`;
    } 
    else if ((role.includes("denunciado") || role.includes("empresa"))) {
        if(estOriginal === "Admitido") {
            formC.innerHTML = `<h4 style="color:var(--primary); margin-bottom:15px;">Cargar Atención</h4><div class="form-group"><label>Mensaje Adicional</label><textarea id="empresa-comentario" style="height:70px; width:100%; border-radius:8px; padding:10px; border:1px solid rgba(0,0,0,0.1);"></textarea></div><div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:15px;"><div class="form-group"><label>Acta (PDF)</label><div class="dropzone-container" onclick="document.getElementById('modal-file').click()"><i class="fas fa-file-pdf"></i><span class="file-selected-text"></span><input type="file" id="modal-file" accept=".pdf" style="display:none;" onchange="parseFileToBase64(event)"></div></div><div class="form-group"><label>Foto Entrega</label><div class="dropzone-container" onclick="document.getElementById('modal-photo').click()"><i class="fas fa-image"></i><span class="file-selected-text"></span><input type="file" id="modal-photo" accept="image/*" style="display:none;" onchange="parsePhotoToBase64(event)"></div></div></div><button id="btn-submit-action" class="btn-action" onclick="executeWorkflowTransition('EMPRESA_ATENDER', this)"><i class="fas fa-paper-plane"></i> Reportar Atención al Fiscal</button>`;
        } else if(estOriginal === "En Revisión") {
            formC.innerHTML = `<h4 style="color:var(--danger); margin-bottom:15px;">Corregir Devolución</h4><div class="form-group"><label>Mensaje de Corrección</label><textarea id="empresa-comentario-dev" style="height:70px; width:100%; border-radius:8px; padding:10px; border:1px solid rgba(0,0,0,0.1);"></textarea></div><div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:15px;"><div class="form-group"><label>Nueva Acta (PDF)</label><div class="dropzone-container" onclick="document.getElementById('modal-file').click()"><i class="fas fa-file-pdf"></i><span class="file-selected-text"></span><input type="file" id="modal-file" accept=".pdf" style="display:none;" onchange="parseFileToBase64(event)"></div></div><div class="form-group"><label>Nueva Foto Entrega</label><div class="dropzone-container" onclick="document.getElementById('modal-photo').click()"><i class="fas fa-image"></i><span class="file-selected-text"></span><input type="file" id="modal-photo" accept="image/*" style="display:none;" onchange="parsePhotoToBase64(event)"></div></div></div><button id="btn-submit-action" class="btn-action" style="background:var(--success);" onclick="executeWorkflowTransition('EMPRESA_ATENDER_DEVOLUCION', this)"><i class="fas fa-paper-plane"></i> Enviar Corrección</button>`;
        }
    }
    else if (role.includes("fiscal") && estOriginal === "Atendido") {
        formC.innerHTML = `<h4 style="color:var(--primary); margin-bottom:15px;">Evaluación Fiscal</h4><div class="form-group"><label>Motivo de Devolución (Solo si No Conforme)</label><textarea id="fiscal-obs" style="height:60px; width:100%; border-radius:8px; padding:10px; border:1px solid rgba(0,0,0,0.1); margin-bottom:10px;"></textarea></div><div class="form-group"><label>Acta Fiscal de Conclusión (PDF obligatorio para Cierre)</label><div class="dropzone-container" onclick="document.getElementById('modal-file').click()"><i class="fas fa-file-signature"></i><span class="file-selected-text"></span><input type="file" id="modal-file" accept=".pdf" style="display:none;" onchange="parseFileToBase64(event)"></div></div><div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:15px;"><button id="btn-submit-action" class="btn-action" style="background:var(--success);" onclick="executeWorkflowTransition('FISCAL_CONFORME', this)"><i class="fas fa-thumbs-up"></i> Conforme (Cerrar)</button><button class="btn-action" style="background:var(--danger);" onclick="executeWorkflowTransition('FISCAL_REVISION', this)"><i class="fas fa-undo"></i> Devolver</button></div>`;
    }
    else if ((role.includes("seguimiento") || role.includes("asistente")) && estOriginal === "Cerrado") {
        formC.innerHTML = `<h4 style="color:var(--primary); margin-bottom:15px;">Encuesta de Seguimiento</h4><div class="form-group"><label>Resultado Encuesta</label><select id="encuesta-resultado" style="width:100%; padding:10px; border-radius:8px; border:1px solid rgba(0,0,0,0.1);"><option value="">Seleccione puntuación...</option><option value="5">5 - Excelente</option><option value="4">4 - Bueno</option><option value="3">3 - Regular</option><option value="2">2 - Malo</option><option value="1">1 - Pésimo</option></select></div><button id="btn-submit-action" class="btn-action" style="margin-top:15px;" onclick="executeWorkflowTransition('SEGUIMIENTO_ARCHIVAR', this)"><i class="fas fa-box-archive"></i> Archivar Definitivo</button>`;
    }
    else if ((role.includes("admin") || role.includes("administrador general")) && (estOriginal === "Admitido" || estOriginal === "En Revisión")) {
        formC.innerHTML = `<h4 style="color:var(--warning); margin-bottom:10px;"><i class="fas fa-bell"></i> Emitir Notificación de Alerta</h4><div class="form-group"><label>Mensaje de Alerta Urgente</label><input type="text" id="admin-alerta-texto" placeholder="Escriba la advertencia por retraso..." style="width:100%; padding:10px; border-radius:8px; border:1px solid rgba(0,0,0,0.1); margin-bottom:12px;"></div><button id="btn-submit-action" class="btn-action" style="background:var(--warning); color:var(--dark);" onclick="executeWorkflowTransition('ADMIN_ALERTA', this)"><i class="fas fa-bullhorn"></i> Traspasar Alerta a la Campana</button>`;
    }

    modal.style.display = "flex";
}

function closeSuperCard() { document.getElementById('super-card-modal').style.display = "none"; selectedRowData = null; }

// ================= LOGICA DE CANALES DE CHAT 1 A 1 =================
function getInternalChatChannel() {
    const role = currentUser.role.toLowerCase();
    const isAdmin = role.includes("admin") || role.includes("administrador general");
    
    if (isAdmin) {
        const targetRole = document.getElementById('chat-target-role').value;
        const targetEmp = targetRole === 'empresa' ? document.getElementById('chat-target-empresa').value : 'GENERAL';
        return `CHAT_${targetRole}_${targetEmp}`;
    } else {
        let myRoleGrp = "sundde";
        if (role.includes("empresa") || role.includes("denunciado")) myRoleGrp = "empresa";
        else if (role.includes("fiscal")) myRoleGrp = "fiscal";
        else if (role.includes("asistente") || role.includes("seguimiento")) myRoleGrp = "asistente";
        
        const myEmp = myRoleGrp === "empresa" ? (currentUser.empresa || "GENERAL") : "GENERAL";
        return `CHAT_${myRoleGrp}_${myEmp}`;
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
            div.style.borderRadius = "8px";
            div.style.fontSize = "0.82rem";
            div.style.maxWidth = "85%";
            
            if (msg.usuario === currentUser.nombre) {
                div.style.background = "rgba(30, 58, 138, 0.12)";
                div.style.alignSelf = "flex-end";
                div.style.borderLeft = "3px solid var(--primary)";
            } else {
                div.style.background = "rgba(255, 255, 255, 0.9)";
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

// ================= LOGICA DE CAMPANA DE ALERTAS (SOLO PARA EMPRESA) =================
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
                div.style.cssText = "display:flex; justify-content:space-between; align-items:center; background:rgba(239,68,68,0.08); border-left:4px solid var(--danger); padding:8px; border-radius:6px; font-size:0.78rem; gap:10px;";
                div.innerHTML = `
                    <div style="flex:1;">
                        <strong>Expediente: ${item.DENUNCIA || 'N/A'}</strong><br>
                        <span style="color:#334155;">${item.Alerta}</span>
                    </div>
                    <i class="fas fa-trash-can" style="color:var(--danger); cursor:pointer; padding:4px;" onclick="deleteAlertFromServer(${item.rowIndex}, event)"></i>
                `;
                listC.appendChild(div);
            });
        } else {
            badge.style.display = "none";
            listC.innerHTML = '<p style="font-size:0.75rem; color:#64748B; text-align:center; padding:10px;">No tienes alertas pendientes.</p>';
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
        showCustomAlert("Error", "No se pudo limpiar el registro en el servidor", "error");
    }
}

// LOGICA DE ANIMACIÓN AL SELECCIONAR UN ARCHIVO
function parseFileToBase64(event) {
    const file = event.target.files[0]; if (!file) return; attachedFileName = file.name;
    const container = event.target.closest('.dropzone-container');
    const r = new FileReader(); 
    r.onload = function(e) { 
        attachedFileBase64 = e.target.result; 
        const lbl = container.querySelector('.file-selected-text'); 
        lbl.innerText = "✓ " + file.name; lbl.style.display = "block";
        container.classList.add('file-loaded');
        container.querySelector('i').className = 'fas fa-check-circle';
        container.querySelector('i').style.color = 'var(--success)';
    }; 
    r.readAsDataURL(file);
}

function parsePhotoToBase64(event) {
    const file = event.target.files[0]; if (!file) return; attachedPhotoName = file.name;
    const container = event.target.closest('.dropzone-container');
    const r = new FileReader(); 
    r.onload = function(e) { 
        attachedPhotoBase64 = e.target.result; 
        const lbl = container.querySelector('.file-selected-text'); 
        lbl.innerText = "✓ " + file.name; lbl.style.display = "block";
        container.classList.add('file-loaded');
        container.querySelector('i').className = 'fas fa-check-circle';
        container.querySelector('i').style.color = 'var(--success)';
    }; 
    r.readAsDataURL(file);
}

async function executeWorkflowTransition(subAction, btnElement) {
    let dataPayload = { rowIndex: selectedRowData.rowIndex, fileBase64: attachedFileBase64, fileName: attachedFileName, photoBase64: attachedPhotoBase64, photoName: attachedPhotoName };

    if (subAction === "EMPRESA_ATENDER") {
        const com = document.getElementById('empresa-comentario').value.trim();
        if (!com || !attachedFileBase64 || !attachedPhotoBase64) { showCustomAlert("Campos Incompletos", "Debe agregar mensaje, acta PDF y foto de evidencia.", "error"); return; }
        dataPayload.comentario = com;
    }
    if (subAction === "EMPRESA_ATENDER_DEVOLUCION") {
        const comDev = document.getElementById('empresa-comentario-dev').value.trim();
        if (!comDev || !attachedFileBase64 || !attachedPhotoBase64) { showCustomAlert("Campos Incompletos", "Debe adjuntar la corrección, nueva acta y foto.", "error"); return; }
        dataPayload.comentarioDevolucion = comDev;
    }
    if (subAction === "FISCAL_REVISION") {
        const obs = document.getElementById('fiscal-obs').value.trim();
        if (!obs) { showCustomAlert("Faltan Datos", "Debe rellenar la justificación de devolución.", "error"); return; }
        dataPayload.comentarioFiscal = obs;
    }
    if (subAction === "FISCAL_CONFORME") {
        if (!attachedFileBase64) { showCustomAlert("Falta Archivo", "El acta conclusiva en PDF es obligatoria para cerrar.", "error"); return; }
    }
    if (subAction === "SEGUIMIENTO_ARCHIVAR") {
        const enc = document.getElementById('encuesta-resultado').value;
        if (!enc) { showCustomAlert("Faltan Datos", "Debe seleccionar la puntuación obtenida.", "error"); return; }
        dataPayload.encuesta = enc;
    }
    if (subAction === "ADMIN_ALERTA") {
        const textA = document.getElementById('admin-alerta-texto').value.trim();
        if (!textA) { showCustomAlert("Faltan Datos", "Escriba un mensaje para la notificación.", "error"); return; }
        dataPayload.mensajeAlerta = textA;
    }

    // ANIMACIÓN AL ENVIAR ARCHIVOS
    if (btnElement) {
        btnElement.disabled = true;
        btnElement.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Subiendo archivos al servidor...`;
        
        // Agregar pulso a los dropzones involucrados
        document.querySelectorAll('.dropzone-container').forEach(dz => {
            if(dz.querySelector('.file-selected-text').style.display === "block") {
                dz.classList.add('uploading-animation');
            }
        });
    }

    const res = await sendToBackend("procesarDenuncia", { subAction: subAction, data: dataPayload });
    closeSuperCard();
    
    if (res && res.success) { 
        showCustomAlert("Éxito", "Operación procesada correctamente.", "success"); 
    } else { 
        showCustomAlert("Error", res.message || "Fallo del servidor.", "error"); 
    }
    
    await loadDataGrid();
}

async function loadAnalyticsData() {
    const stats = await sendToBackend("getStats", {});
    if (stats) {
        document.getElementById('stat-recibidas').innerText = stats.recibidas || 0;
        document.getElementById('stat-atendidas').innerText = stats.atendidas || 0;
        document.getElementById('stat-cerradas').innerText = stats.cerradas || 0;
        if(document.getElementById('stat-satisfaccion')) {
            document.getElementById('stat-satisfaccion').innerText = `${stats.promedioSatisfaccion || 0.0} / 5`;
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
