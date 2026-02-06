let datosCompletos = [];
let edificiosSeleccionados = [];

// Lista de edificios permitidos
const edificiosPermitidos = [
    "Edificio Poniente", "Edificio Oriente", "Edificio Tlahuizcalpan", 
    "Yelizcalli", "Edificio A de Biología", "Edificio B de Biología"
];

// Opciones para selectores (solo horas en punto para facilitar selección)
const horasSelector = [
    "07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", 
    "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"
];

document.addEventListener('DOMContentLoaded', () => {
    cargarDatos();
    generarChipsEdificios();
    inicializarSelectoresHora();
    
    document.getElementById('btn-buscar').addEventListener('click', buscarSalones);
    document.getElementById('btn-limpiar').addEventListener('click', limpiarTodo);
    document.querySelector('.close-modal').addEventListener('click', () => {
        document.getElementById('modal-horario').classList.add('hidden');
    });
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

// --- FUNCIONES DE UTILIDAD (LA LÓGICA QUE PEDISTE) ---

// Convierte "08:30" a minutos totales (510) para comparar fácil
function tiempoAMinutos(horaStr) {
    const [horas, minutos] = horaStr.split(':').map(Number);
    return (horas * 60) + minutos;
}

// Verifica si dos rangos se solapan (chocan)
// Rango 1: Lo que busca el usuario (ej 09:00-10:00)
// Rango 2: Lo que viene en el JSON (ej 08:30-10:00)
function haySolapamiento(inicioUsuario, finUsuario, rangoJson) {
    const [inicioStr, finStr] = rangoJson.split('-');
    
    // Convertir todo a minutos
    const jsonInicio = tiempoAMinutos(inicioStr);
    const jsonFin = tiempoAMinutos(finStr);
    const userInicio = tiempoAMinutos(inicioUsuario);
    const userFin = tiempoAMinutos(finUsuario);

    // Lógica de choque: Si el inicio del usuario es menor al fin del json
    // Y el fin del usuario es mayor al inicio del json, hay choque.
    return (userInicio < jsonFin && userFin > jsonInicio);
}

// --- INTERFAZ ---

function generarChipsEdificios() {
    const contenedor = document.getElementById('container-edificios');
    edificiosPermitidos.forEach(nombre => {
        const chip = document.createElement('div');
        chip.classList.add('chip');
        chip.textContent = nombre.replace('Edificio ', '');
        chip.dataset.valor = nombre;
        
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

function inicializarSelectoresHora() {
    const selInicio = document.getElementById('select-inicio');
    const selFin = document.getElementById('select-fin');
    
    horasSelector.forEach(h => selInicio.add(new Option(h, h)));
    horasSelector.forEach(h => selFin.add(new Option(h, h)));
    
    // Defaults
    selInicio.value = "07:00";
    selFin.value = "08:00";
}

function buscarSalones() {
    const dia = document.getElementById('select-dia').value;
    const inicioBusqueda = document.getElementById('select-inicio').value;
    const finBusqueda = document.getElementById('select-fin').value;
    
    const titulo = document.getElementById('titulo-resultados');
    const lista = document.getElementById('lista-resultados');
    const badge = document.getElementById('contador-resultados');
    const hint = document.getElementById('hint-click');
    
    lista.innerHTML = '';

    // Validaciones
    if (edificiosSeleccionados.length === 0) return alert("Selecciona edificio.");
    if (!dia) return alert("Selecciona día.");
    if (tiempoAMinutos(inicioBusqueda) >= tiempoAMinutos(finBusqueda)) return alert("La hora final debe ser mayor a la inicial.");

    // FILTRADO REAL
    const resultados = datosCompletos.filter(salon => {
        // 1. Check Edificio
        if (!edificiosSeleccionados.includes(salon.edificio)) return false;

        // 2. Check Disponibilidad con solapamiento
        const horariosOcupadosHoy = salon.horario_ocupado[dia] || [];
        
        // Revisamos cada bloque ocupado en el JSON para este salón
        // Si ALGUNO choca con lo que pide el usuario, el salón ESTÁ OCUPADO.
        const estaOcupado = horariosOcupadosHoy.some(bloqueJson => {
            return haySolapamiento(inicioBusqueda, finBusqueda, bloqueJson);
        });
        
        return !estaOcupado; // Devolvemos true si NO está ocupado
    });

    if (resultados.length === 0) {
        titulo.textContent = "No hay aulas disponibles";
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

// --- TABLA DETALLADA ---
function mostrarHorarioCompleto(salon) {
    const modal = document.getElementById('modal-horario');
    document.getElementById('modal-titulo').textContent = salon.salon;
    document.getElementById('modal-subtitulo').textContent = salon.edificio;
    
    const tbody = document.querySelector('#tabla-horario tbody');
    tbody.innerHTML = '';

    const diasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    
    // Generamos filas de hora en hora para visualizar la tabla
    for (let h = 7; h < 21; h++) {
        const horaCeldaInicio = `${h.toString().padStart(2,'0')}:00`;
        const horaCeldaFin = `${(h+1).toString().padStart(2,'0')}:00`;
        
        const tr = document.createElement('tr');
        
        // Columna Hora
        const tdHora = document.createElement('td');
        tdHora.textContent = horaCeldaInicio;
        tdHora.style.fontWeight = 'bold'; tdHora.style.color = 'var(--primary)';
        tr.appendChild(tdHora);

        // Columnas Días
        diasSemana.forEach(dia => {
            const td = document.createElement('td');
            const ocupadoList = salon.horario_ocupado[dia] || [];
            
            // Usamos la misma lógica de solapamiento para pintar la celda
            // Si la celda (ej 09:00-10:00) choca con algo del JSON (ej 08:30-10:00), se pinta roja
            const ocupado = ocupadoList.some(bloqueJson => 
                haySolapamiento(horaCeldaInicio, horaCeldaFin, bloqueJson)
            );

            if (ocupado) {
                td.textContent = "█"; 
                td.classList.add('celda-ocupada');
            } else {
                td.textContent = "·"; 
                td.classList.add('celda-libre');
            }
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    }

    modal.classList.remove('hidden');
}

function limpiarTodo() {
    edificiosSeleccionados = [];
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
    document.getElementById('select-dia').value = "";
    document.getElementById('select-inicio').value = "07:00";
    document.getElementById('select-fin').value = "08:00";
    document.getElementById('lista-resultados').innerHTML = '';
    document.getElementById('contador-resultados').classList.add('hidden');
    document.getElementById('hint-click').classList.add('hidden');
    document.getElementById('titulo-resultados').textContent = "Configura tu búsqueda";
}