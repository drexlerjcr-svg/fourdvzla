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
    
    // Cierre del dropdown de notificaciones haciendo clic afuera
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
    if (rolLower.includes("director") || rolLower.includes("admin")) {
        document.getElementById('link-stats').style.display = "flex";
        document.getElementById('subfilter-empresa-container').style.display = "block";
    }

    loadDataGrid();
    
    // AUTOREFRESH SILENCIOSO CADA 10 SEGUNDOS (Sin botones visuales molestos)
    setInterval(loadDataGridSilently, 10000);
}

async function loadDataGrid() {
    const tbody = document.getElementById('tbody-denuncias');
    tbody.innerHTML = "<tr><td colspan='6' style='text-align:center;'><i class='fas fa-spinner fa-spin'></i> Sincronizando con Google Sheets...</td></tr>";
    
    const responseData = await sendToBackend("getDenuncias", { user: currentUser.email });
    if (!responseData || !Array.isArray(responseData)) {
        tbody.innerHTML = "<tr><td colspan='6' style='text-align:center; color:var(--danger);'>Error sincronizando datos.</td></tr>";
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
        
        // Mantener actualizado el chat en tiempo real si la card está abierta
        if (selectedRowData && document.getElementById('super-card-modal').style.display === "flex") {
            const currentId = selectedRowData.DENUNCIA || ('F-' + selectedRowData.rowIndex);
            loadChatMessages(currentId);
        }
    }
}

function populateEmpresasSubfilter() {
    const selectEmp = document.getElementById('select-filtro-empresa');
    if (!selectEmp || selectEmp.options.length > 1) return; 
    
    const empresasUnicas = [...new Set(globalDenunciasData.map(item => item.EMPRESA).filter(Boolean))];
    empresasUnicas.forEach(emp => {
        const opt = document.createElement('option');
        opt.value = emp;
        opt.innerText = emp;
        selectEmp.appendChild(opt);
    });
}

function renderDataGrid() {
    const tbody = document.getElementById('tbody-denuncias');
    tbody.innerHTML = "";
    const userRoleLower = currentUser.role.toLowerCase();
    const filtroDropdown = document.getElementById('select-filtro-estatus').value;
    const subfiltroEmpresa = document.getElementById('select-filtro-empresa')?.value || "TODAS";

    let filtered = globalDenunciasData.filter(item => {
        const estatusOriginal = item.STATUS ? item.STATUS.toString().trim() : "Nuevo";
        let estatusNormalizado = estatusOriginal;
        const estadosValidos = ["Admitido", "Atendido", "En Revisión", "Cerrado", "Archivado"];
        if (!estadosValidos.includes(estatusOriginal)) estatusNormalizado = "Nuevo";

        // PASO 1: Restricción Estricta por Rol (Evita filtraciones involuntarias)
        let cumplePermisosRol = false;
        if (userRoleLower.includes("administrador") || userRoleLower.includes("admin") || userRoleLower.includes("director")) {
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
            // El asistente solo puede listar los de su jurisdicción (Cerrado, Atendido, En Revisión, Admitido)
            cumplePermisosRol = (estatusNormalizado === "Cerrado" || estatusNormalizado === "Atendido" || estatusNormalizado === "En Revisión" || estatusNormalizado === "Admitido");
        }

        if (!cumplePermisosRol) return false;

        // PASO 2: Filtro por Estatus
        if (filtroDropdown !== "TODOS" && estatusNormalizado !== filtroDropdown) return false;

        // PASO 3: Subfiltro de Empresa (Exclusivo Administrador)
        if ((userRoleLower.includes("admin") || userRoleLower.includes("director")) && subfiltroEmpresa !== "TODAS") {
            if (item.EMPRESA !== subfiltroEmpresa) return false;
        }

        return true;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = "<tr><td colspan='6' style='text-align:center; color:#64748B;'>No hay expedientes asignados en este criterio.</td></tr>";
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

        let actionButton = `<button class="btn-sm" style="background:#E2E8F0; color:#475569;" onclick="openSuperCard(${item.rowIndex})"><i class="fas fa-eye"></i> Ver</button>`;

        if (userRoleLower.includes("sundde") && !userRoleLower.includes("asistente") && !userRoleLower.includes("fiscal") && estatusNormalizado === "Nuevo") {
            actionButton = `<button class="btn-sm btn-sm-primary" onclick="openSuperCard(${item.rowIndex})"><i class="fas fa-file-signature"></i> Admitir</button>`;
        } else if ((userRoleLower.includes("denunciado") || userRoleLower.includes("empresa")) && (estatusNormalizado === "Admitido" || estatusNormalizado === "En Revisión")) {
            actionButton = `<button class="btn-sm btn-sm-primary" onclick="openSuperCard(${item.rowIndex})"><i class="fas fa-gavel"></i> Atender</button>`;
        } else if (userRoleLower.includes("fiscal") && estatusNormalizado === "Atendido") {
            actionButton = `<button class="btn-sm btn-sm-primary" onclick="openSuperCard(${item.rowIndex})"><i class="fas fa-balance-scale"></i> Evaluar</button>`;
        } else if ((userRoleLower.includes("seguimiento") || userRoleLower.includes("asistente")) && estatusNormalizado === "Cerrado") {
            actionButton = `<button class="btn-sm btn-sm-success" onclick="openSuperCard(${item.rowIndex})"><i class="fas fa-box-archive"></i> Archivar</button>`;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td data-label="ID Denuncia" style="font-weight:700; color:var(--primary); cursor:pointer;" onclick="openSuperCard(${item.rowIndex})">
                <i class="fas fa-expand" style="margin-right:5px; color:var(--secondary);"></i> ${item.DENUNCIA || ('F-' + item.rowIndex)}
            </td>
            <td data-label="Empresa"><strong>${item.EMPRESA || 'N/A'}</strong><br><span style="font-size:0.75rem; color:#64748B;">${item['R.I.F / C.I.'] || ''}</span></td>
            <td data-label="Denunciante">${item.DENUNCIANTE || 'Anónimo'}<br><span style="font-size:0.75rem; color:#64748B;">V-${item['C.I.'] || ''}</span></td>
            <td data-label="Bien / Servicio">${item['BIEN/SERVICIO'] || 'No detallado'}</td>
            <td data-label="Estatus"><span class="badge ${statusClass}">${estatusNormalizado}</span></td>
            <td data-label="Acción Requerida">${actionButton}</td>
        `;
        tbody.appendChild(tr);
    });

    if(userRoleLower.includes("admin") || userRoleLower.includes("director")) loadAnalyticsData();
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

    // VISUALIZACIÓN GLOBAL DE SOPORTES (Punto 5 resuelto de forma directa)
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

    // Carga de mensajería sincrónica del expediente
    const idDenunciaChat = selectedRowData.DENUNCIA || ('F-' + selectedRowData.rowIndex);
    loadChatMessages(idDenunciaChat);

    // Zonas de Acción del Formulario por Rol
    const formC = document.getElementById('modal-action-form');
    formC.innerHTML = "";
    const role = currentUser.role.toLowerCase();

    if (role.includes("sundde") && !role.includes("asistente") && !role.includes("fiscal") && estOriginal === "Nuevo") {
        formC.innerHTML = `<h4 style="color:var(--primary); margin-bottom:15px;">Admitir Caso a la Empresa</h4><div class="form-group"><label>Adjuntar Documentación (PDF)</label><div class="dropzone-container" onclick="document.getElementById('modal-file').click()"><i class="fas fa-file-pdf"></i><p>Toca para examinar</p><span id="file-selected-name" class="file-selected-text"></span><input type="file" id="modal-file" accept="application/pdf" style="display:none;" onchange="parseFileToBase64(event)"></div></div><button class="btn-action" onclick="executeWorkflowTransition('SUNDDE_ADMITIR')"><i class="fas fa-check"></i> Admitir a la Empresa</button>`;
    } 
    else if ((role.includes("denunciado") || role.includes("empresa"))) {
        if(estOriginal === "Admitido") {
            formC.innerHTML = `<h4 style="color:var(--primary); margin-bottom:15px;">Cargar Atención</h4><div class="form-group"><label>Mensaje Adicional</label><textarea id="empresa-comentario" style="height:70px; width:100%; border-radius:8px; padding:10px; border:1px solid rgba(0,0,0,0.1);"></textarea></div><div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:15px;"><div class="form-group"><label>Acta (PDF)</label><div class="dropzone-container" onclick="document.getElementById('modal-file').click()"><i class="fas fa-file-pdf"></i><span id="file-selected-name" class="file-selected-text"></span><input type="file" id="modal-file" accept=".pdf" style="display:none;" onchange="parseFileToBase64(event)"></div></div><div class="form-group"><label>Foto Entrega</label><div class="dropzone-container" onclick="document.getElementById('modal-photo').click()"><i class="fas fa-image"></i><span id="photo-selected-name" class="file-selected-text"></span><input type="file" id="modal-photo" accept="image/*" style="display:none;" onchange="parsePhotoToBase64(event)"></div></div></div><button class="btn-action" onclick="executeWorkflowTransition('EMPRESA_ATENDER')"><i class="fas fa-paper-plane"></i> Reportar Atención al Fiscal</button>`;
        } else if(estOriginal === "En Revisión") {
            formC.innerHTML = `<h4 style="color:var(--danger); margin-bottom:15px;">Corregir Devolución</h4><div class="form-group"><label>Mensaje de Corrección</label><textarea id="empresa-comentario-dev" style="height:70px; width:100%; border-radius:8px; padding:10px; border:1px solid rgba(0,0,0,0.1);"></textarea></div><div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:15px;"><div class="form-group"><label>Nueva Acta (PDF)</label><div class="dropzone-container" onclick="document.getElementById('modal-file').click()"><i class="fas fa-file-pdf"></i><span id="file-selected-name" class="file-selected-text"></span><input type="file" id="modal-file" accept=".pdf" style="display:none;" onchange="parseFileToBase64(event)"></div></div><div class="form-group"><label>Nueva Foto Entrega</label><div class="dropzone-container" onclick="document.getElementById('modal-photo').click()"><i class="fas fa-image"></i><span id="photo-selected-name" class="file-selected-text"></span><input type="file" id="modal-photo" accept="image/*" style="display:none;" onchange="parsePhotoToBase64(event)"></div></div></div><button class="btn-action" style="background:var(--success);" onclick="executeWorkflowTransition('EMPRESA_ATENDER_DEVOLUCION')"><i class="fas fa-paper-plane"></i> Enviar Corrección</button>`;
        }
    }
    else if (role.includes("fiscal") && estOriginal === "Atendido") {
        formC.innerHTML = `<h4 style="color:var(--primary); margin-bottom:15px;">Evaluación Fiscal</h4><div class="form-group"><label>Motivo de Devolución (Solo si No Conforme)</label><textarea id="fiscal-obs" style="height:60px; width:100%; border-radius:8px; padding:10px; border:1px solid rgba(0,0,0,0.1); margin-bottom:10px;"></textarea></div><div class="form-group"><label>Acta Fiscal de Conclusión (PDF obligatorio para Cierre)</label><div class="dropzone-container" onclick="document.getElementById('modal-file').click()"><i class="fas fa-file-signature"></i><span id="file-selected-name" class="file-selected-text"></span><input type="file" id="modal-file" accept=".pdf" style="display:none;" onchange="parseFileToBase64(event)"></div></div><div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:15px;"><button class="btn-action" style="background:var(--success);" onclick="executeWorkflowTransition('FISCAL_CONFORME')"><i class="fas fa-thumbs-up"></i> Conforme (Cerrar)</button><button class="btn-action" style="background:var(--danger);" onclick="executeWorkflowTransition('FISCAL_REVISION')"><i class="fas fa-undo"></i> Devolver</button></div>`;
    }
    else if ((role.includes("seguimiento") || role.includes("asistente")) && estOriginal === "Cerrado") {
        formC.innerHTML = `<h4 style="color:var(--primary); margin-bottom:15px;">Encuesta de Seguimiento</h4><div class="form-group"><label>Resultado Encuesta</label><select id="encuesta-resultado" style="width:100%; padding:10px; border-radius:8px; border:1px solid rgba(0,0,0,0.1);"><option value="">Seleccione puntuación...</option><option value="5">5 - Excelente</option><option value="4">4 - Bueno</option><option value="3">3 - Regular</option><option value="2">2 - Malo</option><option value="1">1 - Pésimo</option></select></div><button class="btn-action" style="margin-top:15px;" onclick="executeWorkflowTransition('SEGUIMIENTO_ARCHIVAR')"><i class="fas fa-box-archive"></i> Archivar Definitivo</button>`;
    }
    else if ((role.includes("admin") || role.includes("director")) && (estOriginal === "Admitido" || estOriginal === "En Revisión")) {
        formC.innerHTML = `<h4 style="color:var(--warning); margin-bottom:10px;"><i class="fas fa-bell"></i> Emitir Notificación de Alerta</h4><div class="form-group"><label>Mensaje de Alerta Urgente</label><input type="text" id="admin-alerta-texto" placeholder="Escriba la advertencia por retraso..." style="width:100%; padding:10px; border-radius:8px; border:1px solid rgba(0,0,0,0.1); margin-bottom:12px;"></div><button class="btn-action" style="background:var(--warning); color:var(--dark);" onclick="executeWorkflowTransition('ADMIN_ALERTA')"><i class="fas fa-bullhorn"></i> Traspasar Alerta a la Campana</button>`;
    }

    modal.style.display = "flex";
}

function closeSuperCard() { document.getElementById('super-card-modal').style.display = "none"; selectedRowData = null; }

// LOGICA INTEGRADA DE CHAT DE EXPEDIENTE
async function loadChatMessages(idDenuncia) {
    const container = document.getElementById('chat-box-messages');
    if (!container) return;
    
    const response = await sendToBackend("getChatMessages", { idDenuncia: idDenuncia });
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
        container.innerHTML = "<p style='font-size:0.75rem; color:#64748B; text-align:center;'>No hay comentarios internos en la bitácora.</p>";
    }
}

async function sendChatMessage() {
    const input = document.getElementById('chat-input-message');
    const txt = input.value.trim();
    if (!txt) return;
    
    const idDenuncia = selectedRowData.DENUNCIA || ('F-' + selectedRowData.rowIndex);
    const btn = document.getElementById('btn-send-chat');
    btn.disabled = true;
    
    const res = await sendToBackend("sendChatMessage", { idDenuncia: idDenuncia, usuario: currentUser.nombre, rol: currentUser.role, mensaje: txt });
    if (res && res.success) {
        input.value = "";
        await loadChatMessages(idDenuncia);
    }
    btn.disabled = false;
}

// LOGICA INTEGRADA DE CAMPANA DE NOTIFICACIONES
function toggleAlertsDropdown(e) {
    e.stopPropagation();
    const dropdown = document.getElementById('alerts-dropdown');
    dropdown.style.display = dropdown.style.display === "none" ? "flex" : "none";
}

function updateAlertsNotification() {
    const listC = document.getElementById('alerts-list');
    const badge = document.getElementById('alert-badge');
    if (!listC) return;
    
    listC.innerHTML = "";
    let activeAlerts = globalDenunciasData.filter(item => item.Alerta && item.Alerta.toString().trim() !== "");
    
    const role = currentUser.role.toLowerCase();
    if (role.includes("denunciado") || role.includes("empresa")) {
        activeAlerts = activeAlerts.filter(item => item.EMPRESA && item.EMPRESA.toString().toLowerCase() === currentUser.empresa.toString().toLowerCase());
    }
    
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
    const r = new FileReader(); r.onload = function(e) { attachedFileBase64 = e.target.result; const lbl = document.getElementById('file-selected-name'); lbl.innerText = "✓ " + file.name; }; r.readAsDataURL(file);
}
function parsePhotoToBase64(event) {
    const file = event.target.files[0]; if (!file) return; attachedPhotoName = file.name;
    const r = new FileReader(); r.onload = function(e) { attachedPhotoBase64 = e.target.result; const lbl = document.getElementById('photo-selected-name'); lbl.innerText = "✓ " + file.name; }; r.readAsDataURL(file);
}

async function executeWorkflowTransition(subAction) {
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

    closeSuperCard();
    const tbody = document.getElementById('tbody-denuncias');
    tbody.innerHTML = "<tr><td colspan='6' style='text-align:center;'><i class='fas fa-spinner fa-spin'></i> Transmitiendo flujos al servidor...</td></tr>";

    const res = await sendToBackend("procesarDenuncia", { subAction: subAction, data: dataPayload });
    if (res && res.success) { 
        showCustomAlert("Éxito", "Operación procesada.", "success"); 
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
        document.getElementById('current-view-title').innerText = "Estadísticas";
        document.getElementById('admin-filter').style.display = "none";
    } else {
        document.getElementById('current-view-title').innerText = "Bandeja Unificada de Expedientes";
        document.getElementById('admin-filter').style.display = "flex";
    }
}
