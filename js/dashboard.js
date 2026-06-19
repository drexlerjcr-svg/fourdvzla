// URL de despliegue de Google Apps Script vinculada a tus entornos
const webappurl = "https://script.google.com/macros/s/AKfycbypsSbSP194UABFRsVsrF0XN8OaeZK7WUj-3triDEUem6gOO2QTqVl8r4-OFGv0bNHR/exec";

let currentUser = null;
let globalDenunciasData = [];
let selectedRowData = null;
let attachedFileBase64 = "", attachedFileName = "";
let attachedPhotoBase64 = "", attachedPhotoName = "";

document.getElementById('live-date').innerText = new Date().toLocaleDateString('es-VE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

// =======================================================
// PERSISTENCIA DE SESIÓN (AUTO-LOGIN)
// =======================================================
document.addEventListener("DOMContentLoaded", () => {
    const savedSession = localStorage.getItem("sundde_session");
    if (savedSession) {
        currentUser = JSON.parse(savedSession);
        buildAppWorkspace();
    }
});

function buildAppWorkspace() {
    document.getElementById('login-view').classList.add('hidden');
    document.getElementById('app-view').classList.add('show-app');

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

function triggerLogout() {
    currentUser = null;
    localStorage.removeItem("sundde_session");
    document.getElementById('app-view').classList.remove('show-app');
    document.getElementById('login-view').classList.remove('hidden');
    document.getElementById('login-email').value = "";
    document.getElementById('login-pass').value = "";
    document.getElementById('tbody-denuncias').innerHTML = "<tr><td colspan='6' style='text-align:center; color:#64748B;'>Inicie sesión para descargar los expedientes del servidor...</td></tr>";
    document.getElementById('link-stats').style.display = "none";
    document.getElementById('admin-filter').style.display = "none";
}

// =======================================================
// ALERTAS
// =======================================================
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

// =======================================================
// PETICIONES BACKEND
// =======================================================
async function sendToBackend(action, payload) {
    try {
        const response = await fetch(webappurl, {
            method: "POST",
            headers: { "Content-Type": "text/plain" },
            body: JSON.stringify({ action: action, payload: payload })
        });
        return await response.json();
    } catch (error) {
        console.error("Falla:", error);
        return { success: false, message: "Error crítico de red." };
    }
}

async function attemptLogin() {
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-pass').value.trim();
    const btn = document.getElementById('btn-login');

    if (!email || !pass) { showCustomAlert("Campos Vacíos", "Debe completar los campos de seguridad.", "error"); return; }
    
    btn.innerHTML = "<i class='fas fa-spinner fa-spin'></i> Validando..."; btn.disabled = true;

    const dataResponse = await sendToBackend("loginUser", { email: email, pass: pass });

    if (dataResponse && dataResponse.success) {
        currentUser = { email: dataResponse.email, role: dataResponse.role, empresa: dataResponse.empresa, nombre: dataResponse.nombre };
        localStorage.setItem("sundde_session", JSON.stringify(currentUser));
        buildAppWorkspace();
    } else {
        showCustomAlert("Acceso Denegado", dataResponse ? dataResponse.message : "Credenciales rechazadas.", "error");
    }

    btn.innerHTML = "<i class='fas fa-right-to-bracket'></i> Autenticar Ingreso"; btn.disabled = false;
}

async function loadDataGrid() {
    const tbody = document.getElementById('tbody-denuncias');
    tbody.innerHTML = "<tr><td colspan='6' style='text-align:center;'><i class='fas fa-spinner fa-spin'></i> Extrayendo registros de Google Sheets...</td></tr>";

    const responseData = await sendToBackend("getDenuncias", { user: currentUser.email });

    if (!responseData || !Array.isArray(responseData)) {
        tbody.innerHTML = "<tr><td colspan='6' style='text-align:center; color:var(--danger); font-weight:600;'>Error al sincronizar con la base de datos de Denuncias.</td></tr>";
        return;
    }

    globalDenunciasData = responseData;
    renderDataGrid();
}

// =======================================================
// RENDERIZADO Y FILTRADO POR ROLES
// =======================================================
function renderDataGrid() {
    const tbody = document.getElementById('tbody-denuncias');
    tbody.innerHTML = "";
    const userRoleLower = currentUser.role.toLowerCase();
    const filtroDropdown = document.getElementById('select-filtro-estatus').value;

    let filtered = globalDenunciasData.filter(item => {
        const est = (item.Estatus || "Nuevo").toString().trim();
        
        if(filtroDropdown !== "TODOS" && est !== filtroDropdown) return false;

        if (userRoleLower.includes("sundde") && !userRoleLower.includes("asistente") && !userRoleLower.includes("fiscal")) {
            return est === "Nuevo"; 
        }
        if (userRoleLower.includes("denunciado") || userRoleLower.includes("empresa")) {
            if (item.Empresa && item.Empresa.toString().toLowerCase() !== currentUser.empresa.toString().toLowerCase()) return false;
            return est === "Admitido" || est === "En Revisión"; 
        }
        if (userRoleLower.includes("fiscal")) {
            return est === "Atendido"; 
        }
        if (userRoleLower.includes("seguimiento") || userRoleLower.includes("asistente")) {
            if (est === "Archivado") return false; 
            return est === "Cerrado" || est === "Atendido" || est === "En Revisión" || est === "Admitido"; 
        }
        if (userRoleLower.includes("administrador") || userRoleLower.includes("admin") || userRoleLower.includes("director")) {
            return true; 
        }
        return false;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = "<tr><td colspan='6' style='text-align:center; color:#64748B;'>No hay expedientes en su bandeja en este momento.</td></tr>";
        return;
    }

    filtered.forEach(item => {
        let statusClass = "status-nuevo";
        const estatusActual = item.Estatus ? item.Estatus.toString().trim() : "Nuevo";

        if (estatusActual === "Admitido") statusClass = "status-envcomp";
        if (estatusActual === "Atendido") statusClass = "status-atcomp";
        if (estatusActual === "En Revisión") statusClass = "status-devuelto";
        if (estatusActual === "Cerrado") statusClass = "status-cerradofisc";
        if (estatusActual === "Archivado") statusClass = "status-final";

        let actionButton = `<button class="btn-sm" style="background:#E2E8F0; color:#475569;" onclick="openSuperCard(${item.rowIndex})"><i class="fas fa-eye"></i> Ver Avance</button>`;

        if (userRoleLower.includes("sundde") && !userRoleLower.includes("asistente") && !userRoleLower.includes("fiscal") && estatusActual === "Nuevo") {
            actionButton = `<button class="btn-sm btn-sm-primary" onclick="openSuperCard(${item.rowIndex})"><i class="fas fa-file-signature"></i> Gestionar Admisión</button>`;
        } else if ((userRoleLower.includes("denunciado") || userRoleLower.includes("empresa")) && (estatusActual === "Admitido" || estatusActual === "En Revisión")) {
            actionButton = `<button class="btn-sm btn-sm-primary" onclick="openSuperCard(${item.rowIndex})"><i class="fas fa-gavel"></i> Cargar Atención</button>`;
        } else if (userRoleLower.includes("fiscal") && estatusActual === "Atendido") {
            actionButton = `<button class="btn-sm btn-sm-primary" onclick="openSuperCard(${item.rowIndex})"><i class="fas fa-balance-scale"></i> Evaluar</button>`;
        } else if ((userRoleLower.includes("seguimiento") || userRoleLower.includes("asistente")) && estatusActual === "Cerrado") {
            actionButton = `<button class="btn-sm btn-sm-success" onclick="openSuperCard(${item.rowIndex})"><i class="fas fa-poll"></i> Verificar y Archivar</button>`;
        } else if (userRoleLower.includes("admin") && (estatusActual === "Admitido" || estatusActual === "En Revisión")) {
            actionButton = `<button class="btn-sm btn-sm-warning" onclick="openSuperCard(${item.rowIndex})"><i class="fas fa-bell"></i> Ver y Alertar</button>`;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td data-label="ID Expediente" style="font-weight:700; color:var(--primary); white-space:nowrap; cursor:pointer;" onclick="openSuperCard(${item.rowIndex})">
                <i class="fas fa-expand" style="margin-right:5px; color:var(--secondary);"></i> ${item.ID_Denuncia || ('F-' + item.rowIndex)}
            </td>
            <td data-label="Sujeto de Aplicación / Empresa"><strong>${item.Empresa || 'N/A'}</strong><br><span style="font-size:0.75rem; color:#64748B;">${item['Sujeto de Aplicación'] || ''}</span></td>
            <td data-label="Denunciante">${item.Denunciante || 'Anónimo'}<br><span style="font-size:0.75rem; color:#64748B;">V-${item.Cedula_Denunciante || ''}</span></td>
            <td data-label="Producto / Servicio">${item.Producto || 'No detallado'}</td>
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

// =======================================================
// GESTIÓN DE MODAL SUPER CARD E INTEGRACIÓN DE CHAT
// =======================================================
function openSuperCard(rowIndex) {
    selectedRowData = globalDenunciasData.find(d => d.rowIndex === rowIndex);
    if(!selectedRowData) return;

    const modal = document.getElementById('super-card-modal');
    attachedFileBase64 = ""; attachedFileName = ""; attachedPhotoBase64 = ""; attachedPhotoName = "";
    
    document.getElementById('modal-title').innerText = `Expediente: ${selectedRowData.ID_Denuncia || 'N/A'}`;
    
    document.getElementById('md-empresa').innerText = selectedRowData.Empresa || 'N/A';
    document.getElementById('md-denunciante').innerText = selectedRowData.Denunciante || 'Anónimo';
    document.getElementById('md-cedula').innerText = selectedRowData.Cedula_Denunciante || 'N/A';
    document.getElementById('md-telefono').innerText = selectedRowData.Telefono || 'N/A';
    document.getElementById('md-correo').innerText = selectedRowData.Correo_Denunciante || 'N/A';
    document.getElementById('md-producto').innerText = selectedRowData.Producto || 'N/A';
    document.getElementById('md-motivo').innerText = selectedRowData.Motivo_De_La_Denuncia || 'N/A';
    document.getElementById('md-fecha').innerText = selectedRowData.Fecha_Creacion ? selectedRowData.Fecha_Creacion.substring(0,10) : (selectedRowData.Fecha_de_Registro || 'N/A');
    
    const estatusActual = selectedRowData.Estatus || 'Nuevo';
    let statusColor = "var(--primary)";
    if(estatusActual === "Atendido") statusColor = "var(--warning)";
    if(estatusActual === "En Revisión") statusColor = "var(--danger)";
    if(estatusActual === "Cerrado") statusColor = "var(--success)";
    
    const estBadge = document.getElementById('md-estatus');
    estBadge.innerText = estatusActual;
    estBadge.style.background = statusColor;
    estBadge.style.color = (estatusActual==="Atendido") ? "#000" : "white";

    // Carga de Soportes Históricos
    let histHtml = "";
    const role = currentUser.role.toLowerCase();
    const isAdminOrAsist = role.includes("admin") || role.includes("seguimiento") || role.includes("asistente");

    if (selectedRowData.PDF_SUNDDE && (estatusActual !== "Nuevo" || isAdminOrAsist)) {
        histHtml += `<div class="history-box" style="border-left-color: var(--primary);">
                        <h5><i class="fas fa-file-pdf"></i> Soporte SUNDDE</h5>
                        ${getDriveBtn(selectedRowData.PDF_SUNDDE, "Ver Acta SUNDDE", "btn-sm-primary")}
                     </div>`;
    }

    if (selectedRowData.Respuesta_Empresa && (role.includes("fiscal") || estatusActual === "En Revisión" || isAdminOrAsist)) {
        histHtml += `<div class="history-box" style="border-left-color: var(--warning);">
                        <h5><i class="fas fa-industry"></i> Atención de la Empresa</h5>
                        <p style="margin-bottom:8px;">${selectedRowData.Respuesta_Empresa}</p>
                        ${getDriveBtn(selectedRowData.PDF_Empresa, "Acta Empresa", "btn-sm-warning")}
                        ${getDriveBtn(selectedRowData.Foto_Empresa, "Foto Entrega", "btn-sm-primary")}
                     </div>`;
    }

    if (selectedRowData.Comentario_Fiscal && (estatusActual === "En Revisión" || isAdminOrAsist || (role.includes("fiscal") && selectedRowData.Comentario_Devolucion_Empresa))) {
        histHtml += `<div class="history-box" style="border-left-color: var(--danger);">
                        <h5><i class="fas fa-times-circle"></i> Devolución Fiscal</h5>
                        <p>${selectedRowData.Comentario_Fiscal}</p>
                     </div>`;
    }

    if (selectedRowData.Comentario_Devolucion_Empresa && (role.includes("fiscal") || isAdminOrAsist)) {
        histHtml += `<div class="history-box" style="border-left-color: var(--secondary);">
                        <h5><i class="fas fa-industry"></i> Corrección de la Empresa</h5>
                        <p style="margin-bottom:8px;">${selectedRowData.Comentario_Devolucion_Empresa}</p>
                        ${getDriveBtn(selectedRowData.PDF_Devolucion_Empresa, "PDF Corrección", "btn-sm-warning")}
                        ${getDriveBtn(selectedRowData.Foto_Devolucion_Empresa, "Foto Corrección", "btn-sm-primary")}
                     </div>`;
    }

    if (selectedRowData.PDF_Fiscal && isAdminOrAsist) {
        histHtml += `<div class="history-box" style="border-left-color: var(--success);">
                        <h5><i class="fas fa-check-double"></i> Cierre Definitivo Fiscal</h5>
                        ${getDriveBtn(selectedRowData.PDF_Fiscal, "Ver Certificación Fiscal", "btn-sm-success")}
                     </div>`;
    }

    if(!histHtml) histHtml = "<p style='font-size:0.85rem; color:#64748B;'>Aún no hay soportes históricos cargados.</p>";
    document.getElementById('historico-content').innerHTML = histHtml;

    // Ejecutar actualización de hilos de chat del expediente abierto
    loadChatMessages(selectedRowData.ID_Denuncia || ('F-' + selectedRowData.rowIndex));

    // Lógica estructural de Formularios por Roles
    const formC = document.getElementById('modal-action-form');
    formC.innerHTML = ""; 
    
    if (role.includes("sundde") && !role.includes("asistente") && !role.includes("fiscal") && estatusActual === "Nuevo") {
        formC.innerHTML = `
            <h4 style="color:var(--primary); margin-bottom:15px;">Admitir Caso a la Empresa</h4>
            <div class="form-group">
                <label>Adjuntar Documentación (PDF)</label>
                <div class="dropzone-container" onclick="document.getElementById('modal-file').click()">
                    <i class="fas fa-file-pdf"></i><p>Toca para examinar</p>
                    <span id="file-selected-name" class="file-selected-text"></span>
                    <input type="file" id="modal-file" accept="application/pdf" style="display:none;" onchange="parseFileToBase64(event)">
                </div>
            </div>
            <button class="btn-action" onclick="executeWorkflowTransition('SUNDDE_ADMITIR')"><i class="fas fa-check"></i> Admitir a la Empresa</button>
        `;
    } 
    else if ((role.includes("denunciado") || role.includes("empresa"))) {
        if(estatusActual === "Admitido") {
            formC.innerHTML = `
                <h4 style="color:var(--primary); margin-bottom:15px;">Cargar Atención de Denuncia</h4>
                <div class="form-group"><label>Mensaje Adicional / Solución</label><textarea id="empresa-comentario" style="height:70px;"></textarea></div>
                <div class="modal-grid">
                    <div class="form-group"><label>Acta (PDF)</label><div class="dropzone-container" onclick="document.getElementById('modal-file').click()"><i class="fas fa-file-pdf" style="font-size:1.5rem;"></i><span id="file-selected-name" class="file-selected-text"></span><input type="file" id="modal-file" accept=".pdf" style="display:none;" onchange="parseFileToBase64(event)"></div></div>
                    <div class="form-group"><label>Foto Entrega</label><div class="dropzone-container" onclick="document.getElementById('modal-photo').click()"><i class="fas fa-image" style="font-size:1.5rem;"></i><span id="photo-selected-name" class="file-selected-text"></span><input type="file" id="modal-photo" accept="image/*" style="display:none;" onchange="parsePhotoToBase64(event)"></div></div>
                </div>
                <button class="btn-action" onclick="executeWorkflowTransition('EMPRESA_ATENDER')"><i class="fas fa-paper-plane"></i> Reportar Atención al Fiscal</button>
            `;
        } else if(estatusActual === "En Revisión") {
            formC.innerHTML = `
                <h4 style="color:var(--danger); margin-bottom:15px;">Corregir Devolución</h4>
                <div class="form-group"><label>Mensaje de Corrección</label><textarea id="empresa-comentario-dev" style="height:70px;"></textarea></div>
                <div class="modal-grid">
                    <div class="form-group"><label>Nueva Acta (PDF)</label><div class="dropzone-container" onclick="document.getElementById('modal-file').click()"><i class="fas fa-file-pdf" style="font-size:1.5rem;"></i><span id="file-selected-name" class="file-selected-text"></span><input type="file" id="modal-file" accept=".pdf" style="display:none;" onchange="parseFileToBase64(event)"></div></div>
                    <div class="form-group"><label>Nueva Foto Entrega</label><div class="dropzone-container" onclick="document.getElementById('modal-photo').click()"><i class="fas fa-image" style="font-size:1.5rem;"></i><span id="photo-selected-name" class="file-selected-text"></span><input type="file" id="modal-photo" accept="image/*" style="display:none;" onchange="parsePhotoToBase64(event)"></div></div>
                </div>
                <button class="btn-action" style="background:var(--success);" onclick="executeWorkflowTransition('EMPRESA_ATENDER_DEVOLUCION')"><i class="fas fa-paper-plane"></i> Enviar Corrección</button>
            `;
        }
    }
    else if (role.includes("fiscal") && estatusActual === "Atendido") {
        formC.innerHTML = `
            <h4 style="color:var(--primary); margin-bottom:15px;">Evaluación Fiscal</h4>
            <div class="form-group"><label>Motivo de Devolución (Solo si No Conforme)</label><textarea id="fiscal-obs" placeholder="Explique por qué devuelve..." style="height:60px;"></textarea></div>
            <div class="form-group"><label>Acta Fiscal (Solo si Conforme)</label><div class="dropzone-container" onclick="document.getElementById('modal-file').click()" style="padding:15px; margin-bottom:15px;"><i class="fas fa-file-signature" style="font-size:1.5rem;"></i><span id="file-selected-name" class="file-selected-text"></span><input type="file" id="modal-file" accept=".pdf" style="display:none;" onchange="parseFileToBase64(event)"></div></div>
            <div class="modal-grid">
                <button class="btn-action" style="background:linear-gradient(135deg, var(--success) 0%, #059669 100%);" onclick="executeWorkflowTransition('FISCAL_CONFORME')"><i class="fas fa-thumbs-up"></i> Conforme (Cerrar)</button>
                <button class="btn-action" style="background:var(--danger);" onclick="executeWorkflowTransition('FISCAL_REVISION')"><i class="fas fa-undo"></i> No Conforme (Devolver)</button>
            </div>
        `;
    }
    else if ((role.includes("seguimiento") || role.includes("asistente")) && estatusActual === "Cerrado") {
        formC.innerHTML = `
            <h4 style="color:var(--primary); margin-bottom:15px;">Encuesta de Seguimiento</h4>
            <div class="form-group">
                <label>Resultado de la Encuesta con el Ciudadano</label>
                <select id="encuesta-resultado">
                    <option value="">Seleccione puntuación...</option>
                    <option value="5">5 - Excelente / Totalmente Conforme</option>
                    <option value="4">4 - Bueno / Conforme</option>
                    <option value="3">3 - Regular / Aceptable</option>
                    <option value="2">2 - Malo / Poco Conforme</option>
                    <option value="1">1 - Pésimo / Nada Conforme</option>
                </select>
            </div>
            <button class="btn-action" onclick="executeWorkflowTransition('SEGUIMIENTO_ARCHIVAR')"><i class="fas fa-box-archive"></i> Archivar Definitivo</button>
        `;
    }
    else if (role.includes("admin") && (estatusActual === "Admitido" || estatusActual === "En Revisión")) {
        formC.innerHTML = `<button class="btn-action btn-sm-warning" style="width:100%; padding:14px;" onclick="executeWorkflowTransition('ADMIN_ALERTA')"><i class="fas fa-bell"></i> Generar Alerta a Empresa por Retraso</button>`;
    }

    modal.style.display = "flex";
}

function closeSuperCard() { document.getElementById('super-card-modal').style.display = "none"; }

// =======================================================
// LÓGICA DE ACTUALIZACIÓN DEL CHAT INTERNO (JS)
// =======================================================
async function loadChatMessages(idDenuncia) {
    const container = document.getElementById('chat-box-messages');
    if (!container) return;
    container.innerHTML = "<p style='font-size:0.8rem; color:#64748B;'><i class='fas fa-spinner fa-spin'></i> Sincronizando bitácora...</p>";
    
    const response = await sendToBackend("getChatMessages", { idDenuncia: idDenuncia });
    container.innerHTML = "";
    
    if (response && Array.isArray(response) && response.length > 0) {
        response.forEach(msg => {
            const div = document.createElement('div');
            div.style.padding = "10px 12px";
            div.style.borderRadius = "10px";
            div.style.fontSize = "0.85rem";
            div.style.maxWidth = "85%;";
            div.style.boxShadow = "0 2px 4px rgba(0,0,0,0.02)";
            
            if (msg.usuario === currentUser.nombre) {
                div.style.background = "rgba(30, 58, 138, 0.12)";
                div.style.alignSelf = "flex-end";
                div.style.borderLeft = "4px solid var(--primary)";
            } else {
                div.style.background = "rgba(255, 255, 255, 0.9)";
                div.style.alignSelf = "flex-start";
                div.style.borderLeft = "4px solid var(--secondary)";
            }
            
            div.innerHTML = `<strong>${msg.usuario}</strong> <span style="font-size:0.75rem; color:#64748B; font-weight:600;">(${msg.rol}) - ${msg.fecha}</span><br><p style="margin-top:4px; word-break:break-all; color:#334155;">${msg.mensaje}</p>`;
            container.appendChild(div);
        });
        container.scrollTop = container.scrollHeight;
    } else {
        container.innerHTML = "<p style='font-size:0.8rem; color:#64748B; text-align:center; padding: 15px;'>No hay anotaciones registradas en este expediente.</p>";
    }
}

async function sendChatMessage() {
    const input = document.getElementById('chat-input-message');
    const msgText = input.value.trim();
    if (!msgText) return;
    
    const idDenuncia = selectedRowData.ID_Denuncia || ('F-' + selectedRowData.rowIndex);
    const btn = document.getElementById('btn-send-chat');
    btn.disabled = true;
    
    const res = await sendToBackend("sendChatMessage", {
        idDenuncia: idDenuncia,
        usuario: currentUser.nombre,
        rol: currentUser.role,
        mensaje: msgText
    });
      
    if (res && res.success) {
        input.value = "";
        await loadChatMessages(idDenuncia);
    } else {
        showCustomAlert("Error", "No se pudo transmitir la anotación al chat.", "error");
    }
    btn.disabled = false;
}

// =======================================================
// LECTORES BASE64
// =======================================================
function parseFileToBase64(event) {
    const file = event.target.files[0]; if (!file) return; attachedFileName = file.name;
    const r = new FileReader(); r.onload = function(e) { attachedFileBase64 = e.target.result; const lbl = document.getElementById('file-selected-name'); lbl.innerText = "✓ " + file.name; lbl.style.display = "block"; }; r.readAsDataURL(file);
}
function parsePhotoToBase64(event) {
    const file = event.target.files[0]; if (!file) return; attachedPhotoName = file.name;
    const r = new FileReader(); r.onload = function(e) { attachedPhotoBase64 = e.target.result; const lbl = document.getElementById('photo-selected-name'); lbl.innerText = "✓ " + file.name; lbl.style.display = "block"; }; r.readAsDataURL(file);
}

// =======================================================
// EJECUTOR DE FLUJOS AL BACKEND
// =======================================================
async function executeWorkflowTransition(subAction) {
    let dataPayload = { rowIndex: selectedRowData.rowIndex, correoDenunciante: selectedRowData.Correo_Denunciante || "", fileBase64: attachedFileBase64, fileName: attachedFileName, photoBase64: attachedPhotoBase64, photoName: attachedPhotoName };

    if (subAction === "EMPRESA_ATENDER") {
        const com = document.getElementById('empresa-comentario').value.trim();
        if (!com || !attachedFileBase64 || !attachedPhotoBase64) { showCustomAlert("Faltan Datos", "Debe agregar mensaje, acta PDF y foto.", "error"); return; }
        dataPayload.comentario = com;
    }
    if (subAction === "EMPRESA_ATENDER_DEVOLUCION") {
        const comDev = document.getElementById('empresa-comentario-dev').value.trim();
        if (!comDev || !attachedFileBase64 || !attachedPhotoBase64) { showCustomAlert("Faltan Datos", "Debe agregar mensaje de corrección, acta PDF y foto.", "error"); return; }
        dataPayload.comentarioDevolucion = comDev;
    }
    if (subAction === "FISCAL_REVISION") {
        const obs = document.getElementById('fiscal-obs').value.trim();
        if (!obs) { showCustomAlert("Faltan Datos", "Debe justificar la devolución.", "error"); return; }
        dataPayload.comentarioFiscal = obs;
    }
    if (subAction === "FISCAL_CONFORME") {
        if (!attachedFileBase64) { showCustomAlert("Faltan Datos", "Debe adjuntar el Acta Fiscal PDF para cerrar el caso.", "error"); return; }
    }
    if (subAction === "SEGUIMIENTO_ARCHIVAR") {
        const enc = document.getElementById('encuesta-resultado').value;
        if (!enc) { showCustomAlert("Faltan Datos", "Debe registrar la encuesta para archivar.", "error"); return; }
        dataPayload.encuesta = enc;
    }

    closeSuperCard();
    const tbody = document.getElementById('tbody-denuncias');
    tbody.innerHTML = "<tr><td colspan='6' style='text-align:center;'><i class='fas fa-spinner fa-spin'></i> Transmitiendo al servidor de Google Drive...</td></tr>";

    const res = await sendToBackend("procesarDenuncia", { subAction: subAction, data: dataPayload });

    if (res && res.success) { showCustomAlert("Éxito", res.message ? res.message : "Procesado correctamente.", "success"); } 
    else { showCustomAlert("Error de Servidor", res ? res.message : "Fallo conectando a Apps Script.", "error"); }

    await loadDataGrid();
}

async function loadAnalyticsData() {
    const stats = await sendToBackend("getStats", {});
    if (stats) {
        document.getElementById('stat-recibidas').innerText = stats.recibidas || 0;
        document.getElementById('stat-atendidas').innerText = stats.atendidas || 0;
        document.getElementById('stat-cerradas').innerText = stats.cerradas || 0;
        document.getElementById('stat-satisfaccion').innerText = `${stats.promedioSatisfaccion || 0.0} / 5`;
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
        if(currentUser.role.includes("admin") || currentUser.role.includes("asistente")) {
            document.getElementById('admin-filter').style.display = "flex";
        }
    }
}
