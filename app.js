let datosCompletos = [];
let edificiosSeleccionados = [];

// 1. Lista FIJA de edificios permitidos
const edificiosPermitidos = [
    "Edificio Poniente", 
    "Edificio Oriente", 
    "Edificio Tlahuizcalpan", 
    "Yelizcalli", 
    "Edificio A de Biología", 
    "Edificio B de Biología"
];

// 2. Rangos de hora EXACTOS como vienen en el JSON
const rangosHorarios = [
    "07:00-08:00", "08:00-09:00", "09:00-10:00", "10:00-11:00", 
    "11:00-12:00", "12:00-13:00", "13:00-14:00", "14:00-15:00", 
    "15:00-16:00", "16:00-17:00", "17:00-18:00", "18:00-19:00", 
    "19:00-20:00", "20:00-21:00"
];

document.addEventListener('DOMContentLoaded', () => {
    cargarDatos();
    generarChipsEdificios();
    inicializarSelectoresHora();
    
    document.getElementById('btn-buscar').addEventListener('click', buscarSalones);
    document.getElementById('btn-limpiar').addEventListener('click', limpiarTodo);
    document.querySelector('.close-modal').addEventListener('click', cerrarModal);
    window.onclick = (event) => { if (event.target == document.getElementById('modal-horario')) cerrarModal(); }
});

async function cargarDatos() {
    try {
        const response = await fetch('horarios.json');
        datosCompletos = await response.json();
    } catch (error) {
        console.error("Error:", error);
        alert("Error cargando horarios.json");
    }
}

// Genera los chips solo para la lista permitida
function generarChipsEdificios() {
    const contenedor = document.getElementById('container-edificios');
    edificiosPermitidos.forEach(nombre => {
        const chip = document.createElement('div');
        chip.classList.add('chip');
        // Quitamos "Edificio" para que el botón sea más corto
        chip.textContent = nombre.replace('Edificio ', '');
        chip.dataset.valor = nombre; // Guardamos el nombre completo
        
        chip.addEventListener('click', () => {
            chip.classList.toggle('selected');
            const val = chip.dataset.valor;
            if (edificiosSeleccionados.includes(val)) {
                edificiosSeleccionados = edificiosSeleccionados.filter(e => e !== val);
            } else {
                edificiosSeleccionados.push(val);
            }
        });
        contenedor.appendChild(chip);
    });
}

// Llena los selectores con los rangos exactos "HH:00-HH:00"
function inicializarSelectoresHora() {
    const selInicio = document.getElementById('select-inicio');
    const selFin = document.getElementById('select-fin');
    
    // Llenar selectInicio (todos los rangos)
    rangosHorarios.forEach((rango, index) => {
        // Mostramos solo la hora de inicio en el texto para que se vea limpio
        const texto = rango.split('-')[0]; 
        selInicio.add(new Option(texto, rango));
        // Selección por defecto: 07:00-08:00
        if (index === 0) selInicio.value = rango;
    });

    // Actualizar selectFin basado en la selección de Inicio
    selInicio.addEventListener('change', () => {
        const rangoInicioSeleccionado = selInicio.value;
        const indiceInicio = rangosHorarios.indexOf(rangoInicioSeleccionado);
        selFin.innerHTML = ''; // Limpiar
        
        // Llenar selectFin solo con rangos POSTERIORES al de inicio
        for (let i = indiceInicio; i < rangosHorarios.length; i++) {
             // Mostramos la hora de FIN en el texto
            const texto = rangosHorarios[i].split('-')[1];
            selFin.add(new Option(texto, rangosHorarios[i]));
        }
        // Seleccionar por defecto el mismo rango final que el inicial (bloque de 1 hora)
        selFin.selectedIndex = 0;
    });
    
    // Disparar evento inicial
    selInicio.dispatchEvent(new Event('change'));
}

function buscarSalones() {
    const dia = document.getElementById('select-dia').value;
    const rangoInicio = document.getElementById('select-inicio').value;
    const rangoFin = document.getElementById('select-fin').value;
    
    const titulo = document.getElementById('titulo-resultados');
    const lista = document.getElementById('lista-resultados');
    const badge = document.getElementById('contador-resultados');
    const hint = document.getElementById('hint-click');
    
    lista.innerHTML = '';

    if (edificiosSeleccionados.length === 0) return alert("Selecciona al menos un edificio.");
    if (!dia) return alert("Selecciona un día.");
    
    // Determinar los rangos exactos que necesitamos verificar
    const idxInicio = rangosHorarios.indexOf(rangoInicio);
    const idxFin = rangosHorarios.indexOf(rangoFin);
    // Obtenemos el sub-array con todos los rangos intermedios
    const rangosNecesarios = rangosHorarios.slice(idxInicio, idxFin + 1);

    // FILTRADO
    const resultados = datosCompletos.filter(salon => {
        // 1. Filtro Edificio
        if (!edificiosSeleccionados.includes(salon.edificio)) return false;

        // 2. Filtro Disponibilidad
        const ocupacionDia = salon.horario_ocupado[dia] || [];
        // Verificamos si ALGUNO de los rangos necesarios está en la lista de ocupados
        const tieneClase = rangosNecesarios.some(rango => ocupacionDia.includes(rango));
        
        return !tieneClase; // Pasa si NO tiene clase
    });

    // Renderizar
    if (resultados.length === 0) {
        titulo.textContent = "No hay aulas disponibles 😔";
        badge.classList.add('hidden'); hint.classList.add('hidden');
    } else {
        titulo.textContent = "Aulas Disponibles";
        badge.textContent = resultados.length;
        badge.classList.remove('hidden'); hint.classList.remove('hidden');

        resultados.forEach(salon => {
            const card = document.createElement('div');
            card.classList.add('card');
            card.innerHTML = `<h4>${salon.salon}</h4><p>${salon.edificio}</p>`;
            card.addEventListener('click', () => mostrarHorarioCompleto(salon));
            lista.appendChild(card);
        });
        titulo.scrollIntoView({ behavior: 'smooth' });
    }
}

// --- LÓGICA DEL MODAL ---
function mostrarHorarioCompleto(salon) {
    const modal = document.getElementById('modal-horario');
    document.getElementById('modal-titulo').textContent = salon.salon;
    document.getElementById('modal-subtitulo').textContent = salon.edificio;
    
    const tbody = document.querySelector('#tabla-horario tbody');
    tbody.innerHTML = '';

    const diasAbrev = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
    
    // Iteramos sobre la lista de rangos exactos
    rangosHorarios.forEach(rangoExacto => {
        const tr = document.createElement('tr');
        
        // Celda de Hora (Mostramos solo el inicio para ahorrar espacio, ej "07:00")
        const tdHora = document.createElement('td');
        tdHora.textContent = rangoExacto.split('-')[0];
        tdHora.style.fontWeight = 'bold'; tdHora.style.color = 'var(--primary)';
        tr.appendChild(tdHora);

        // Celdas de Días
        diasAbrev.forEach(dia => {
            const td = document.createElement('td');
            // Comparación EXACTA: ¿El rango actual está en la lista de ese día?
            const ocupado = salon.horario_ocupado[dia] && salon.horario_ocupado[dia].includes(rangoExacto);
            
            if (ocupado) {
                td.textContent = "█"; // Carácter visual para ocupado
                td.classList.add('celda-ocupada');
            } else {
                td.textContent = "·"; // Carácter sutil para libre
                td.classList.add('celda-libre');
            }
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    modal.classList.remove('hidden');
}

function cerrarModal() { document.getElementById('modal-horario').classList.add('hidden'); }

function limpiarTodo() {
    edificiosSeleccionados = [];
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
    document.getElementById('select-dia').value = "";
    // Reiniciar selectores de hora al primer valor
    const sInicio = document.getElementById('select-inicio');
    sInicio.selectedIndex = 0;
    sInicio.dispatchEvent(new Event('change'));
    
    document.getElementById('lista-resultados').innerHTML = '';
    document.getElementById('contador-resultados').classList.add('hidden');
    document.getElementById('hint-click').classList.add('hidden');
    document.getElementById('titulo-resultados').textContent = "Configura tu búsqueda";
    window.scrollTo({ top: 0, behavior: 'smooth' });
}