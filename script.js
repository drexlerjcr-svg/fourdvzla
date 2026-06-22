const webappurl = "https://script.google.com/macros/s/AKfycbypsSbSP194UABFRsVsrF0XN8OaeZK7WUj-3triDEUem6gOO2QTqVl8r4-OFGv0bNHR/exec";

let currentUser = null;
let globalDenunciasData = [];
let selectedRowData = null;
let attachedFileBase64 = "", attachedFileName = "";
let attachedPhotoBase64 = "", attachedPhotoName = "";

document.getElementById('live-date').innerText = new Date().toLocaleDateString('es-VE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

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
    document.getElementById('tbody-denuncias').innerHTML = "<tr><td colspan='6' style='text-align:center; color:#64748B;'>Inicie sesión para descargar los expedientes...</td></tr>";
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
            body: JSON.stringify({ action: action, payload: payload })
        });
        return await response.json();
    } catch (error) {
        return { success: false, message: "Error crítico de red." };
    }
}

async function attemptLogin() {
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-pass').value.trim();
    const btn = document.getElementById('btn-login');

    if (!email || !pass) { showCustomAlert("Campos Vacíos", "Debe completar los campos.", "error"); return; }
    
    btn.innerHTML = "<i class='fas fa-spinner fa-spin'></i> Validando..."; btn.disabled = true;

    const dataResponse = await sendToBackend("loginUser", { email: email, pass: pass });

    if (dataResponse && dataResponse.success) {
        currentUser = { email: dataResponse.email, role: dataResponse.role, empresa: dataResponse.empresa, nombre: dataResponse.nombre };
        localStorage.setItem("sundde_session", JSON.stringify(currentUser));
        buildAppWorkspace();
    } else {
        showCustomAlert("Acceso Denegado", dataResponse.message, "error");
    }

    btn.innerHTML = "<i class='fas fa-right-to-bracket'></i> Autenticar Ingreso"; btn.disabled = false;
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
    renderDataGrid();
}

function renderDataGrid() {
    const tbody = document.getElementById('tbody-denuncias');
    tbody.innerHTML = "";
    const userRoleLower = currentUser.role.toLowerCase();
    const filtroDropdown = document.getElementById('select-filtro-estatus').value;

    let filtered = globalDenunciasData.filter(item => {
        const estatusOriginal = item.STATUS ? item.STATUS.toString().trim() : "Nuevo";
        let estatusNormalizado = estatusOriginal;
        
        // Si el estatus de la base de datos no es parte del flujo, lo tratamos como "Nuevo"
        const estadosValidos = ["Admitido", "Atendido", "En Revisión", "Cerrado", "Archivado"];
        if (!estadosValidos.includes(estatusOriginal)) estatusNormalizado = "Nuevo";

        if(filtroDropdown !== "TODOS" && estatusNormalizado !== filtroDropdown) return false;

        // FILTRO ESTRICTO POR COLUMNA EMPRESA
        if (userRoleLower.includes("denunciado") || userRoleLower.includes("empresa")) {
            if (item.EMPRESA && item.EMPRESA.toString().toLowerCase() !== currentUser.empresa.toString().toLowerCase()) return false;
            return estatusNormalizado === "Admitido" || estatusNormalizado === "En Revisión"; 
        }

        if (userRoleLower.includes("sundde") && !userRoleLower.includes("asistente") && !userRoleLower.includes("fiscal")) {
            return estatusNormalizado === "Nuevo"; 
        }
        if (userRoleLower.includes("fiscal")) {
            return estatusNormalizado === "Atendido"; 
        }
        if (userRoleLower.includes("seguimiento") || userRoleLower.includes("asistente")) {
            if (estatusNormalizado === "Archivado") return false; 
            return estatusNormalizado === "Cerrado" || estatusNormalizado === "Atendido" || estatusNormalizado === "En Revisión" || estatusNormalizado === "Admitido"; 
        }
        if (userRoleLower.includes("administrador") || userRoleLower.includes("admin") || userRoleLower.includes("director")) {
            return true; 
        }
        return false;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = "<tr><td colspan='6' style='text-align:center; color:#64748B;'>No hay expedientes asignados.</td></tr>";
        return;
    }

    filtered.forEach(item => {
        const estatusOriginal = item.STATUS ? item.STATUS.toString().trim() : "Nuevo";
        let estatusNormalizado = estatusOriginal;
        const estadosValidos = ["Admitido", "Atendido", "En Revisión", "Cerrado", "Archivado"];
        if (!estadosValidos.includes(estatusOriginal)) estatusNormalizado = "Nuevo";

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
            actionButton = `<button class="btn-sm btn-sm-success" onclick="openSuperCard(${item.rowIndex})"><i class="fas fa-poll"></i> Archivar</button>`;
        } else if (userRoleLower.includes("admin") && (estatusNormalizado === "Admitido" || estatusNormalizado === "En Revisión")) {
            actionButton = `<button class="btn-sm btn-sm-warning" onclick="openSuperCard(${item.rowIndex})"><i class="fas fa-bell"></i> Alertar</button>`;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td data-label="ID Denuncia" style="font-weight:700; color:var(--primary); cursor:pointer;" onclick="openSuperCard(${item.rowIndex})">
                <i class="fas fa-expand" style="margin-right:5px; color:var(--secondary);"></i> ${item.DENUNCIA || ('F-' + item.rowIndex)}
            </td>
            <td data-label="Empresa"><strong>${item.EMPRESA || 'N/A'}</strong><br><span style="font-size:0.75rem; color:#64748B;">${item['R.I.F / C.I.'] || ''}</span></td>
            <td data-label="Denunciante">${item.DENUNCIANTE || 'Anónimo'}<br><span style="font-size:0.75rem; color:#64748B;">V-${item['C.I.'] || ''}</span></td>
            <td data-label="Bien / Servicio">${item['BIEN/SERVICIO'] || 'No detallado'}</td>
            <td data-label="Estatus del Sistema"><span class="badge ${statusClass}">${estatusNormalizado}</span></td>
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

    const modal = document.getElementById('super-card-modal');
    attachedFileBase64 = ""; attachedFileName = ""; attachedPhotoBase64 = ""; attachedPhotoName = "";
    
    document.getElementById('modal-title').innerText = `Expediente: ${selectedRowData.DENUNCIA || 'N/A'}`;
    
    // Mapeo a los nuevos nombres de columnas (Se arregló FECHA DENUNCIA, OBSERVACIONES y los 2 TELEFONOS)
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
    
    const estatusOriginal = selectedRowData.STATUS ? selectedRowData.STATUS.toString().trim() : "Nuevo";
    let estatusNormalizado = estatusOriginal;
    const estadosValidos = ["Admitido", "Atendido", "En Revisión", "Cerrado", "Archivado"];
    if (!estadosValidos.includes(estatusOriginal)) estatusNormalizado = "Nuevo";
    
    let statusColor = "var(--primary)";
    if(estatusNormalizado === "Atendido") statusColor = "var(--warning)";
    if(estatusNormalizado === "En Revisión") statusColor = "var(--danger)";
    if(estatusNormalizado === "Cerrado") statusColor = "var(--success)";
    
    const estBadge = document.getElementById('md-estatus');
    estBadge.innerText = estatusOriginal; // Muestra el estatus tal cual vino en la BD
    estBadge.style.background = statusColor;
    estBadge.style.color = (estatusNormalizado==="Atendido") ? "#000" : "white";

    let histHtml = "";
    const role = currentUser.role.toLowerCase();
    const isAdminOrAsist = role.includes("admin") || role.includes("seguimiento") || role.includes("asistente");

    if (selectedRowData.PDF_SUNDDE && (estatusNormalizado !== "Nuevo" || isAdminOrAsist)) {
        histHtml += `<div class="history-box" style="border-left-color: var(--primary);"><h5><i class="fas fa-file-pdf"></i> Soporte SUNDDE</h5>${getDriveBtn(selectedRowData.PDF_SUNDDE, "Ver Acta SUNDDE", "btn-sm-primary")}</div>`;
    }
    if (selectedRowData.Respuesta_Empresa && (role.includes("fiscal") || estatusNormalizado === "En Revisión" || isAdminOrAsist)) {
        histHtml += `<div class="history-box" style="border-left-color: var(--warning);"><h5><i class="fas fa-industry"></i> Atención de la Empresa</h5><p style="margin-bottom:8px;">${selectedRowData.Respuesta_Empresa}</p>${getDriveBtn(selectedRowData.PDF_Empresa, "Acta Empresa", "btn-sm-warning")} ${getDriveBtn(selectedRowData.Foto_Empresa, "Foto Entrega", "btn-sm-primary")}</div>`;
    }
    if (selectedRowData.Comentario_Fiscal && (estatusNormalizado === "En Revisión" || isAdminOrAsist || (role.includes("fiscal") && selectedRowData.Comentario_Devolucion_Empresa))) {
        histHtml += `<div class="history-box" style="border-left-color: var(--danger);"><h5><i class="fas fa-times-circle"></i> Devolución Fiscal</h5><p>${selectedRowData.Comentario_Fiscal}</p></div>`;
    }
    if (selectedRowData.Comentario_Devolucion_Empresa && (role.includes("fiscal") || isAdminOrAsist)) {
        histHtml += `<div class="history-box" style="border-left-color: var(--secondary);"><h5><i class="fas fa-industry"></i> Corrección de la Empresa</h5><p style="margin-bottom:8px;">${selectedRowData.Comentario_Devolucion_Empresa}</p>${getDriveBtn(selectedRowData.PDF_Devolucion_Empresa, "PDF Corrección", "btn-sm-warning")} ${getDriveBtn(selectedRowData.Foto_Devolucion_Empresa, "Foto Corrección", "btn-sm-primary")}</div>`;
    }
    if (selectedRowData.PDF_Fiscal && isAdminOrAsist) {
        histHtml += `<div class="history-box" style="border-left-color: var(--success);"><h5><i class="fas fa-check-double"></i> Cierre Definitivo Fiscal</h5>${getDriveBtn(selectedRowData.PDF_Fiscal, "Ver Certificación Fiscal", "btn-sm-success")}</div>`;
    }

    if(!histHtml) histHtml = "<p style='font-size:0.85rem; color:#64748B;'>Aún no hay soportes cargados.</p>";
    document.getElementById('historico-content').innerHTML = histHtml;

    // Cargar Chat Interno del Expediente usando la columna DENUNCIA como ID
    loadChatMessages(selectedRowData.DENUNCIA || ('F-' + selectedRowData.rowIndex));

    const formC = document.getElementById('modal-action-form');
    formC.innerHTML = ""; 
    
    if (role.includes("sundde") && !role.includes("asistente") && !role.includes("fiscal") && estatusNormalizado === "Nuevo") {
        formC.innerHTML = `<h4 style="color:var(--primary); margin-bottom:15px;">Admitir Caso a la Empresa</h4><div class="form-group"><label>Adjuntar Documentación (PDF)</label><div class="dropzone-container" onclick="document.getElementById('modal-file').click()"><i class="fas fa-file-pdf"></i><p>Toca para examinar</p><span id="file-selected-name" class="file-selected-text"></span><input type="file" id="modal-file" accept="application/pdf" style="display:none;" onchange="parseFileToBase64(event)"></div></div><button class="btn-action" onclick="executeWorkflowTransition('SUNDDE_ADMITIR')"><i class="fas fa-check"></i> Admitir a la Empresa</button>`;
    } 
    else if ((role.includes("denunciado") || role.includes("empresa"))) {
        if(estatusNormalizado === "Admitido") {
            formC.innerHTML = `<h4 style="color:var(--primary); margin-bottom:15px;">Cargar Atención</h4><div class="form-group"><label>Mensaje Adicional</label><textarea id="empresa-comentario" style="height:70px;"></textarea></div><div class="modal-grid"><div class="form-group"><label>Acta (PDF)</label><div class="dropzone-container" onclick="document.getElementById('modal-file').click()"><i class="fas fa-file-pdf" style="font-size:1.5rem;"></i><span id="file-selected-name" class="file-selected-text"></span><input type="file" id="modal-file" accept=".pdf" style="display:none;" onchange="parseFileToBase64(event)"></div></div><div class="form-group"><label>Foto Entrega</label><div class="dropzone-container" onclick="document.getElementById('modal-photo').click()"><i class="fas fa-image" style="font-size:1.5rem;"></i><span id="photo-selected-name" class="file-selected-text"></span><input type="file" id="modal-photo" accept="image/*" style="display:none;" onchange="parsePhotoToBase64(event)"></div></div></div><button class="btn-action" onclick="executeWorkflowTransition('EMPRESA_ATENDER')"><i class="fas fa-paper-plane"></i> Reportar Atención al Fiscal</button>`;
        } else if(estatusNormalizado === "En Revisión") {
            formC.innerHTML = `<h4 style="color:var(--danger); margin-bottom:15px;">Corregir Devolución</h4><div class="form-group"><label>Mensaje de Corrección</label><textarea id="empresa-comentario-dev" style="height:70px;"></textarea></div><div class="modal-grid"><div class="form-group"><label>Nueva Acta (PDF)</label><div class="dropzone-container" onclick="document.getElementById('modal-file').click()"><i class="fas fa-file-pdf" style="font-size:1.5rem;"></i><span id="file-selected-name" class="file-selected-text"></span><input type="file" id="modal-file" accept=".pdf" style="display:none;" onchange="parseFileToBase64(event)"></div></div><div class="form-group"><label>Nueva Foto Entrega</label><div class="dropzone-container" onclick="document.getElementById('modal-photo').click()"><i class="fas fa-image" style="font-size:1.5rem;"></i><span id="photo-selected-name" class="file-selected-text"></span><input type="file" id="modal-photo" accept="image/*" style="display:none;" onchange="parsePhotoToBase64(event)"></div></div></div><button class="btn-action" style="background:var(--success);" onclick="executeWorkflowTransition('EMPRESA_ATENDER_DEVOLUCION')"><i class="fas fa-paper-plane"></i> Enviar Corrección</button>`;
        }
    }
    else if (role.includes("fiscal") && estatusNormalizado === "Atendido") {
        formC.innerHTML = `<h4 style="color:var(--primary); margin-bottom:15px;">Evaluación Fiscal</h4><div class="form-group"><label>Motivo de Devolución (Solo si No Conforme)</label><textarea id="fiscal-obs" style="height:60px;"></textarea></div><div class="form-group"><label>Acta Fiscal (Solo si Conforme)</label><div class="dropzone-container" onclick="document.getElementById('modal-file').click()" style="padding:15px; margin-bottom:15px;"><i class="fas fa-file-signature" style="font-size:1.5rem;"></i><span id="file-selected-name" class="file-selected-text"></span><input type="file" id="modal-file" accept=".pdf" style="display:none;" onchange="parseFileToBase64(event)"></div></div><div class="modal-grid"><button class="btn-action" style="background:var(--success);" onclick="executeWorkflowTransition('FISCAL_CONFORME')"><i class="fas fa-thumbs-up"></i> Conforme (Cerrar)</button><button class="btn-action" style="background:var(--danger);" onclick="executeWorkflowTransition('FISCAL_REVISION')"><i class="fas fa-undo"></i> No Conforme (Devolver)</button></div>`;
    }
    else if ((role.includes("seguimiento") || role.includes("asistente")) && estatusNormalizado === "Cerrado") {
        formC.innerHTML = `<h4 style="color:var(--primary); margin-bottom:15px;">Encuesta de Seguimiento</h4><div class="form-group"><label>Resultado Encuesta</label><select id="encuesta-resultado"><option value="">Seleccione puntuación...</option><option value="5">5 - Excelente</option><option value="4">4 - Bueno</option><option value="3">3 - Regular</option><option value="2">2 - Malo</option><option value="1">1 - Pésimo</option></select></div><button class="btn-action" onclick="executeWorkflowTransition('SEGUIMIENTO_ARCHIVAR')"><i class="fas fa-box-archive"></i> Archivar Definitivo</button>`;
    }
    else if (role.includes("admin") && (estatusNormalizado === "Admitido" || estatusNormalizado === "En Revisión")) {
        formC.innerHTML = `<button class="btn-action btn-sm-warning" style="width:100%; padding:14px;" onclick="executeWorkflowTransition('ADMIN_ALERTA')"><i class="fas fa-bell"></i> Generar Alerta por Retraso</button>`;
    }

    modal.style.display = "flex";
}

function closeSuperCard() { document.getElementById('super-card-modal').style.display = "none"; }

// CHAT INTERNO
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
            
            if (msg.usuario === currentUser.nombre) {
                div.style.background = "rgba(30, 58, 138, 0.12)";
                div.style.alignSelf = "flex-end";
                div.style.borderLeft = "4px solid var(--primary)";
            } else {
                div.style.background = "rgba(255, 255, 255, 0.9)";
                div.style.alignSelf = "flex-start";
                div.style.borderLeft = "4px solid var(--secondary)";
            }
            
            div.innerHTML = `<strong>${msg.usuario}</strong> <span style="font-size:0.75rem; color:#64748B;">(${msg.rol}) - ${msg.fecha}</span><br><p style="margin-top:4px;">${msg.mensaje}</p>`;
            container.appendChild(div);
        });
        container.scrollTop = container.scrollHeight;
    } else {
        container.innerHTML = "<p style='font-size:0.8rem; color:#64748B; text-align:center;'>No hay anotaciones registradas.</p>";
    }
}

async function sendChatMessage() {
    const input = document.getElementById('chat-input-message');
    const msgText = input.value.trim();
    if (!msgText) return;
    
    const idDenuncia = selectedRowData.DENUNCIA || ('F-' + selectedRowData.rowIndex);
    const btn = document.getElementById('btn-send-chat');
    btn.disabled = true;
    
    const res = await sendToBackend("sendChatMessage", { idDenuncia: idDenuncia, usuario: currentUser.nombre, rol: currentUser.role, mensaje: msgText });
    if (res && res.success) { input.value = ""; await loadChatMessages(idDenuncia); } 
    else { showCustomAlert("Error", "No se pudo transmitir la anotación.", "error"); }
    btn.disabled = false;
}

function parseFileToBase64(event) {
    const file = event.target.files[0]; if (!file) return; attachedFileName = file.name;
    const r = new FileReader(); r.onload = function(e) { attachedFileBase64 = e.target.result; const lbl = document.getElementById('file-selected-name'); lbl.innerText = "✓ " + file.name; lbl.style.display = "block"; }; r.readAsDataURL(file);
}
function parsePhotoToBase64(event) {
    const file = event.target.files[0]; if (!file) return; attachedPhotoName = file.name;
    const r = new FileReader(); r.onload = function(e) { attachedPhotoBase64 = e.target.result; const lbl = document.getElementById('photo-selected-name'); lbl.innerText = "✓ " + file.name; lbl.style.display = "block"; }; r.readAsDataURL(file);
}

async function executeWorkflowTransition(subAction) {
    let dataPayload = { rowIndex: selectedRowData.rowIndex, correoDenunciante: "", fileBase64: attachedFileBase64, fileName: attachedFileName, photoBase64: attachedPhotoBase64, photoName: attachedPhotoName };

    if (subAction === "EMPRESA_ATENDER") {
        const com = document.getElementById('empresa-comentario').value.trim();
        if (!com || !attachedFileBase64 || !attachedPhotoBase64) { showCustomAlert("Faltan Datos", "Debe agregar mensaje, acta PDF y foto.", "error"); return; }
        dataPayload.comentario = com;
    }
    if (subAction === "EMPRESA_ATENDER_DEVOLUCION") {
        const comDev = document.getElementById('empresa-comentario-dev').value.trim();
        if (!comDev || !attachedFileBase64 || !attachedPhotoBase64) { showCustomAlert("Faltan Datos", "Debe agregar corrección, acta y foto.", "error"); return; }
        dataPayload.comentarioDevolucion = comDev;
    }
    if (subAction === "FISCAL_REVISION") {
        const obs = document.getElementById('fiscal-obs').value.trim();
        if (!obs) { showCustomAlert("Faltan Datos", "Debe justificar la devolución.", "error"); return; }
        dataPayload.comentarioFiscal = obs;
    }
    if (subAction === "FISCAL_CONFORME") {
        if (!attachedFileBase64) { showCustomAlert("Faltan Datos", "Debe adjuntar el Acta Fiscal PDF.", "error"); return; }
    }
    if (subAction === "SEGUIMIENTO_ARCHIVAR") {
        const enc = document.getElementById('encuesta-resultado').value;
        if (!enc) { showCustomAlert("Faltan Datos", "Debe registrar la encuesta.", "error"); return; }
        dataPayload.encuesta = enc;
    }

    closeSuperCard();
    const tbody = document.getElementById('tbody-denuncias');
    tbody.innerHTML = "<tr><td colspan='6' style='text-align:center;'><i class='fas fa-spinner fa-spin'></i> Transmitiendo al servidor...</td></tr>";

    const res = await sendToBackend("procesarDenuncia", { subAction: subAction, data: dataPayload });

    if (res && res.success) { showCustomAlert("Éxito", res.message ? res.message : "Procesado correctamente.", "success"); } 
    else { showCustomAlert("Error de Servidor", res ? res.message : "Fallo conectando.", "error"); }

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
        document.getElementById('current-view-title').innerText = "Estadísticas";
        document.getElementById('admin-filter').style.display = "none";
    } else {
        document.getElementById('current-view-title').innerText = "Bandeja Unificada";
        if(currentUser.role.includes("admin") || currentUser.role.includes("asistente")) {
            document.getElementById('admin-filter').style.display = "flex";
        }
    }
}