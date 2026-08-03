// URL ACTUALIZADA
const webappurl = "https://script.google.com/macros/s/AKfycbx3WevFFa8gvlllgxm4zDqCQo7q3cso0ci9S2L3ZYnQXB2agBpFfRgRnA0PdaQLIbE-/exec";
const SECURITY_TOKEN = "SUNDDE_SECURE_2026_TOKEN";

document.addEventListener("DOMContentLoaded", () => {
    if (localStorage.getItem("sundde_session")) {
        window.location.href = "dashboard.html";
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

// FIX: LÓGICA DE TECLA ENTER AISLADA DE LA ALERTA
function handleEnter(event) {
    if (event.key === 'Enter') {
        event.preventDefault(); // Evitamos comportamientos por defecto del formulario
        const alertModal = document.getElementById('custom-alert');
        
        if (alertModal.style.display === 'flex') {
            // Si la alerta está en pantalla, solo cerramos la alerta
            closeCustomAlert();
        } else {
            // Si no hay alerta, procedemos a iniciar sesión
            attemptLogin();
        }
    }
}

async function attemptLogin() {
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-pass').value.trim();
    const btn = document.getElementById('btn-login');

    if (!email || !pass) { showCustomAlert("Vacío", "Complete los campos requeridos.", "error"); return; }
    
    btn.innerHTML = "<i class='fas fa-spinner fa-spin'></i> Validando..."; btn.disabled = true;
    
    try {
        const response = await fetch(webappurl, {
            method: "POST",
            headers: { "Content-Type": "text/plain" },
            body: JSON.stringify({ token: SECURITY_TOKEN, action: "loginUser", payload: { email, pass } })
        });
        const dataResponse = await response.json();

        if (dataResponse && dataResponse.success) {
            const currentUser = { email: dataResponse.email, role: dataResponse.role, empresa: dataResponse.empresa, nombre: dataResponse.nombre };
            localStorage.setItem("sundde_session", JSON.stringify(currentUser));
            window.location.href = "dashboard.html";
        } else {
            showCustomAlert("Denegado", dataResponse.message, "error");
            btn.innerHTML = "<i class='fas fa-right-to-bracket'></i> Autenticar Ingreso"; btn.disabled = false;
        }
    } catch (error) {
        showCustomAlert("Error de Red", "No se pudo conectar al servidor. Verifique su conexión.", "error");
        btn.innerHTML = "<i class='fas fa-right-to-bracket'></i> Autenticar Ingreso"; btn.disabled = false;
    }
}
