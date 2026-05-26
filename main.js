import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import { getFirestore, doc, getDoc, writeBatch, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

// CONFIGURACIÓN (Oculta tras variables de entorno en producción real)
const firebaseConfig = {
    apiKey: "AIzaSyAMuTiISxhnz2V7X1F6gBYOl4Sxsu97QRQ",
    authDomain: "fiscalizacion-f15d3.firebaseapp.com",
    projectId: "fiscalizacion-f15d3",
    storageBucket: "fiscalizacion-f15d3.firebasestorage.app",
    messagingSenderId: "586168804795",
    appId: "1:586168804795:web:f87c12d3fe9f6bf3ce509e"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUserRole = null;

// --- SISTEMA DE RUTEO Y VISTAS ---
const Views = {
    monitoreo: () => `
        <div class="animate-fade-in">
            <h2 class="text-2xl font-bold text-azul mb-6">Mapa de Fiscalización Nacional</h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <select class="p-3 rounded-lg border border-amarillo shadow-sm outline-none">
                    <option>Seleccionar Estado</option>
                    <option>Miranda</option>
                </select>
                <div class="bg-white p-4 rounded-lg shadow-sm border-l-4 border-azul">
                    <p class="text-xs text-gray-400 uppercase font-bold">Actuaciones Hoy</p>
                    <p class="text-2xl font-black text-azul">142</p>
                </div>
            </div>
            <div class="bg-white p-6 rounded-xl shadow-md h-96 flex items-center justify-center border-2 border-dashed border-gray-200">
                <p class="text-gray-400 italic">Cargando Mapa Geográfico de Venezuela...</p>
            </div>
        </div>
    `,
    registro_personal: () => `
        <div class="max-w-4xl mx-auto">
            <h2 class="text-2xl font-bold text-azul mb-6">Módulo de Personal</h2>
            <div class="bg-white p-8 rounded-2xl shadow-xl border-t-4 border-amarillo">
                <h3 class="font-bold text-gray-700 mb-4">Carga de Excel (Masiva)</h3>
                <input type="file" id="excel-input" class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-azul hover:file:bg-blue-100">
                <button id="btn-migrar" class="mt-6 w-full bg-azul text-white font-bold py-3 rounded-lg">EJECUTAR MIGRACIÓN</button>
            </div>
        </div>
    `
};

// --- CONTROL DE ACCESO (SECURITY GATE) ---
onAuthStateChanged(auth, async (user) => {
    const loginOverlay = document.getElementById('login-overlay');
    const mainLayout = document.getElementById('main-layout');

    if (user) {
        // Obtener Rol de Firestore
        const userDoc = await getDoc(doc(db, "usuarios", user.uid));
        if (userDoc.exists()) {
            currentUserRole = userDoc.data().rol;
            document.getElementById('user-role-badge').innerText = `ROL: ${currentUserRole}`;
            document.getElementById('user-email-display').innerText = user.email;
            
            // UI Update
            loginOverlay.classList.add('hidden');
            mainLayout.classList.remove('hidden');
            renderMenu(currentUserRole);
            loadView('monitoreo');
        } else {
            alert("Usuario no autorizado en base de datos.");
            signOut(auth);
        }
    } else {
        loginOverlay.classList.remove('hidden');
        mainLayout.classList.add('hidden');
    }
});

// --- RENDERIZADO DINÁMICO ---
function renderMenu(rol) {
    const nav = document.getElementById('nav-menu');
    let menuHTML = `
        <a href="#" onclick="loadView('monitoreo')" class="sidebar-item active-link flex items-center space-x-3 p-3 rounded-lg transition text-white">
            <i class="fas fa-map-marked-alt w-5"></i><span>Monitoreo</span>
        </a>
    `;

    if (rol === 'Administrador' || rol === 'Analista') {
        menuHTML += `
            <a href="#" onclick="loadView('registro_personal')" class="sidebar-item flex items-center space-x-3 p-3 rounded-lg transition text-white">
                <i class="fas fa-users-cog w-5"></i><span>Gestión Personal</span>
            </a>
            <a href="#" class="sidebar-item flex items-center space-x-3 p-3 rounded-lg transition text-white">
                <i class="fas fa-file-invoice w-5"></i><span>Reportería</span>
            </a>
        `;
    }
    nav.innerHTML = menuHTML;
}

window.loadView = (viewName) => {
    const contentArea = document.getElementById('content-area');
    contentArea.innerHTML = Views[viewName] ? Views[viewName]() : '<h2>Vista no encontrada</h2>';
    
    // Si la vista es registro_personal, inicializar listener de Excel
    if(viewName === 'registro_personal') initExcelLogic();
};

// --- LÓGICA DE NEGOCIO: EXCEL ---
function initExcelLogic() {
    const btn = document.getElementById('btn-migrar');
    if(!btn) return;

    btn.onclick = async () => {
        const file = document.getElementById('excel-input').files[0];
        if(!file) return alert("Seleccione un archivo");

        const reader = new FileReader();
        reader.onload = async (e) => {
            const data = e.target.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(sheet);
            
            await migrateFiscales(json);
        };
        reader.readAsBinaryString(file);
    };
}

async function migrateFiscales(data) {
    const batch = writeBatch(db);
    data.forEach(item => {
        const fiscalRef = doc(db, "fiscales", item.cedula_fiscal.toString());
        batch.set(fiscalRef, {
            nombre: item.nombre_fiscal,
            correo: item.correo_fiscal,
            estado: item.estado,
            municipio: item.municipio || "",
            rol: "Fiscal",
            fecha_registro: serverTimestamp()
        });
    });
    
    await batch.commit();
    alert("¡Migración Exitosa de " + data.length + " registros!");
}

// --- LOGIN ---
document.getElementById('login-form').onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    const errorLog = document.getElementById('login-error');

    try {
        await signInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
        errorLog.innerText = "Error: Credenciales inválidas";
        errorLog.classList.remove('hidden');
    }
};

document.getElementById('btn-logout').onclick = () => signOut(auth);
