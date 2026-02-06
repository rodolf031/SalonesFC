let datosCompletos = [];
let edificiosSeleccionados = [];

// Horas base para los selectores y la tabla
const horasBase = [
    "07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", 
    "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"
];

document.addEventListener('DOMContentLoaded', () => {
    cargarDatos();
    inicializarSelectoresHora();
    
    // Event Listeners
    document.getElementById('btn-buscar').addEventListener('click', buscarSalones);
    document.getElementById('btn-limpiar').addEventListener('click', limpiarTodo);
    document.querySelector('.close-modal').addEventListener('click', cerrarModal);
    
    // Cerrar modal al tocar fuera
    window.onclick = function(event) {
        const modal = document.getElementById('modal-horario');
        if (event.target == modal) cerrarModal();
    }
});

async function cargarDatos() {
    try {
        const response = await fetch('horarios.json');
        datosCompletos = await response.json();
        generarChipsEdificios();
    } catch (error) {
        console.error("Error:", error);
        alert("Error cargando horarios.json");
    }
}

function inicializarSelectoresHora() {
    const selInicio = document.getElementById('select-inicio');
    const selFin = document.getElementById('select-fin');
    
    // Llenar selectores (Inicio: 7 a 20, Fin: 8 a 21)
    horasBase.slice(0, -1).forEach(h => {
        selInicio.add(new Option(h, h));
    });
    
    // Actualizar dinámicamente el selector de FIN basado en el de INICIO
    selInicio.addEventListener('change', () => {
        const horaInicio = parseInt(selInicio.value.split(':')[0]);
        selFin.innerHTML = ''; // Limpiar
        
        horasBase.forEach(h => {
            const horaNum = parseInt(h.split(':')[0]);
            if (horaNum > horaInicio) {
                selFin.add(new Option(h, h));
            }
        });
    });
    
    // Disparar evento para llenar el select fin inicialmente
    selInicio.dispatchEvent(new Event('change'));
}

function generarChipsEdificios() {
    const contenedor = document.getElementById('container-edificios');
    const setEdificios = new Set(datosCompletos.map(item => item.edificio));
    const listaEdificios = Array.from(setEdificios).sort();

    listaEdificios.forEach(nombre => {
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

function buscarSalones() {
    const dia = document.getElementById('select-dia').value;
    const hInicioStr = document.getElementById('select-inicio').value;
    const hFinStr = document.getElementById('select-fin').value;
    
    const titulo = document.getElementById('titulo-resultados');
    const lista = document.getElementById('lista-resultados');
    const badge = document.getElementById('contador-resultados');
    const hint = document.getElementById('hint-click');
    
    lista.innerHTML = ''; // Limpiar resultados previos

    // Validaciones
    if (edificiosSeleccionados.length === 0) {
        alert("Por favor selecciona al menos un edificio.");
        return;
    }
    if (!dia || !hInicioStr || !hFinStr) {
        alert("Por favor completa el día y el rango de horas.");
        return;
    }

    // Generar array de rangos necesarios (ej: ["07:00-08:00", "08:00-09:00"])
    const rangosNecesarios = [];
    let horaActual = parseInt(hInicioStr.split(':')[0]);
    const horaFinal = parseInt(hFinStr.split(':')[0]);
    
    while (horaActual < horaFinal) {
        const inicioFto = horaActual.toString().padStart(2, '0') + ":00";
        const finFto = (horaActual + 1).toString().padStart(2, '0') + ":00";
        rangosNecesarios.push(`${inicioFto}-${finFto}`);
        horaActual++;
    }

    // FILTRADO
    const resultados = datosCompletos.filter(salon => {
        // 1. Filtro Edificio
        if (!edificiosSeleccionados.includes(salon.edificio)) return false;

        // 2. Filtro Disponibilidad
        // El salón NO debe tener ninguna clase en los rangos necesarios
        const ocupacionDia = salon.horario_ocupado[dia] || [];
        
        // Verificamos si hay INTERSECCIÓN entre lo que necesito y lo ocupado
        const tieneClase = rangosNecesarios.some(rango => ocupacionDia.includes(rango));
        
        return !tieneClase; // Si no tiene clase, pasa el filtro
    });

    // Renderizar
    if (resultados.length === 0) {
        titulo.textContent = "No hay aulas disponibles 😔";
        badge.classList.add('hidden');
        hint.classList.add('hidden');
    } else {
        titulo.textContent = "Aulas Disponibles";
        badge.textContent = resultados.length;
        badge.classList.remove('hidden');
        hint.classList.remove('hidden');

        resultados.forEach(salon => {
            const card = document.createElement('div');
            card.classList.add('card');
            card.innerHTML = `
                <h4>${salon.salon}</h4>
                <p>${salon.edificio}</p>
            `;
            // Al hacer clic, abrimos el modal
            card.addEventListener('click', () => mostrarHorarioCompleto(salon));
            lista.appendChild(card);
        });
        
        // Scroll suave hacia resultados
        titulo.scrollIntoView({ behavior: 'smooth' });
    }
}

// --- LÓGICA DEL MODAL DE HORARIO ---
function mostrarHorarioCompleto(salon) {
    const modal = document.getElementById('modal-horario');
    document.getElementById('modal-titulo').textContent = salon.salon;
    document.getElementById('modal-subtitulo').textContent = salon.edificio;
    
    const tbody = document.querySelector('#tabla-horario tbody');
    tbody.innerHTML = '';

    const dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
    // Generar filas por hora (de 7 a 20)
    for (let i = 7; i < 21; i++) {
        const rango = `${i.toString().padStart(2,'0')}:00-${(i+1).toString().padStart(2,'0')}:00`;
        const tr = document.createElement('tr');
        
        // Celda de hora
        const tdHora = document.createElement('td');
        tdHora.textContent = `${i}:00`;
        tdHora.style.fontWeight = 'bold';
        tdHora.style.color = 'var(--primary)';
        tr.appendChild(tdHora);

        // Celdas de días
        dias.forEach(dia => {
            const td = document.createElement('td');
            const ocupado = salon.horario_ocupado[dia] && salon.horario_ocupado[dia].includes(rango);
            
            if (ocupado) {
                td.textContent = "Ocupado";
                td.classList.add('celda-ocupada');
            } else {
                td.textContent = "—";
                td.classList.add('celda-libre');
            }
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    }

    modal.classList.remove('hidden');
}

function cerrarModal() {
    document.getElementById('modal-horario').classList.add('hidden');
}

function limpiarTodo() {
    edificiosSeleccionados = [];
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
    document.getElementById('select-dia').value = "";
    document.getElementById('select-inicio').value = "07:00";
    document.getElementById('select-inicio').dispatchEvent(new Event('change'));
    
    document.getElementById('lista-resultados').innerHTML = '';
    document.getElementById('contador-resultados').classList.add('hidden');
    document.getElementById('hint-click').classList.add('hidden');
    document.getElementById('titulo-resultados').textContent = "Configura tu búsqueda";
    window.scrollTo({ top: 0, behavior: 'smooth' });
}