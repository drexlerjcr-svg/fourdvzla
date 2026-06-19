const webappurl = "https://script.google.com/macros/s/AKfycbypsSbSP194UABFRsVsrF0XN8OaeZK7WUj-3triDEUem6gOO2QTqVl8r4-OFGv0bNHR/exec";

document.addEventListener("DOMContentLoaded", () => {
    const savedSession = localStorage.getItem("sundde_session");
    if (savedSession) {
        window.location.href = "dashboard.html"; // Redirige si ya está logueado
    }
});

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
        let currentUser = { email: dataResponse.email, role: dataResponse.role, empresa: dataResponse.empresa, nombre: dataResponse.nombre };
        localStorage.setItem("sundde_session", JSON.stringify(currentUser));
        window.location.href = "dashboard.html"; // Envía al sistema
    } else {
        showCustomAlert("Acceso Denegado", dataResponse ? dataResponse.message : "Credenciales rechazadas.", "error");
    }

    btn.innerHTML = "<i class='fas fa-right-to-bracket'></i> Autenticar Ingreso"; btn.disabled = false;
}