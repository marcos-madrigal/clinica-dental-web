// 1. CONEXIÓN A SUPABASE
const supabaseUrl = 'https://zaybxlotytxhcaknyfhz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpheWJ4bG90eXR4aGNha255Zmh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3MjU1NDksImV4cCI6MjEwMDMwMTU0OX0.37rH2OjcB_b3Q86aB8VeedSJsrxcg_qGT10WQGm4dow';

// SOLUCIÓN: Cambiamos el nombre a 'clienteSupabase' para no chocar con la librería externa
const clienteSupabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// 2. DEFINIR EL HORARIO FIJO DE LA CLÍNICA
const horarioMañana = ['10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30'];
const horarioTarde = ['16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30'];
const todosLosHuecos = [...horarioMañana, ...horarioTarde];

const inputFecha = document.getElementById('input-fecha');
const contenedorHoras = document.getElementById('contenedor-horas');

// 3. LEER LA BASE DE DATOS REAL (SELECT)
async function obtenerCitasOcupadas(fechaSeleccionada) {
    const inicioDia = `${fechaSeleccionada}T00:00:00`;
    const finDia = `${fechaSeleccionada}T23:59:59`;

    const { data, error } = await clienteSupabase
        .from('citas')
        .select('fecha_hora')
        .gte('fecha_hora', inicioDia)
        .lte('fecha_hora', finDia);

    if (error) {
        console.error("Error al leer la base de datos:", error);
        return [];
    }

    // SOLUCIÓN: Extraer la hora directamente del texto sin aplicar husos horarios
    const horasOcupadas = data.map(cita => {
        // Supabase devuelve el texto en formato: "2026-07-23T11:00:00+00:00"
        // 1. split('T')[1] separa la fecha de la hora y coge la parte derecha -> "11:00:00+00:00"
        // 2. substring(0, 5) extrae solo los 5 primeros caracteres -> "11:00"
        return cita.fecha_hora.split('T')[1].substring(0, 5);
    });

    return horasOcupadas;
}

// --- NUEVAS VARIABLES PARA EL MODAL ---
let citaSeleccionada = { fecha: null, hora: null };
const modal = document.getElementById('modal-reserva');
const cerrarModal = document.getElementById('cerrar-modal');
const textoFechaCita = document.getElementById('texto-fecha-cita');
const formularioCita = document.getElementById('formulario-cita');

// 4. ACTUALIZAR PANTALLA (Modificado para abrir el modal)
async function actualizarPantalla(fechaSeleccionada) {
    contenedorHoras.innerHTML = '';
    if (!fechaSeleccionada) return;

    const ocupadasEseDia = await obtenerCitasOcupadas(fechaSeleccionada);
    const horasDisponibles = todosLosHuecos.filter(hora => !ocupadasEseDia.includes(hora));

    if (horasDisponibles.length === 0) {
        contenedorHoras.innerHTML = '<p>No hay citas libres este día.</p>';
        return;
    }

    horasDisponibles.forEach(hora => {
        const boton = document.createElement('button');
        boton.textContent = hora;
        boton.classList.add('boton-hora');
        boton.addEventListener('click', () => {
            // Guardamos los datos temporalmente y abrimos el modal
            citaSeleccionada.fecha = fechaSeleccionada;
            citaSeleccionada.hora = hora;
            textoFechaCita.innerHTML = `Día: <strong>${fechaSeleccionada}</strong> | Hora: <strong>${hora}</strong>`;
            
            modal.classList.remove('modal-oculto');
            modal.classList.add('modal-visible');
        });
        contenedorHoras.appendChild(boton);
    });
}

// 5. ESCUCHAR EVENTOS
inputFecha.addEventListener('change', (evento) => {
    actualizarPantalla(evento.target.value);
});

cerrarModal.addEventListener('click', () => {
    modal.classList.remove('modal-visible');
    modal.classList.add('modal-oculto');
});

// 6. PROCESAR EL FORMULARIO (La escritura real en la base de datos)
formularioCita.addEventListener('submit', async (evento) => {
    evento.preventDefault(); // Evita que la página se recargue

    // Recogemos los datos del HTML
    const nombre = document.getElementById('nombre').value;
    const apellidos = document.getElementById('apellidos').value;
    const email = document.getElementById('email').value;
    const telefono = document.getElementById('telefono').value;
    const motivo = document.getElementById('motivo').value;

    // Formateamos la fecha para PostgreSQL (Ej: "2026-07-23T10:30:00")
    const fechaHoraISO = `${citaSeleccionada.fecha}T${citaSeleccionada.hora}:00`;

    // A) Insertar o actualizar al Paciente
    const { data: pacienteData, error: pacienteError } = await clienteSupabase
        .from('pacientes')
        // upsert: Si el email ya existe, actualiza los datos. Si no, lo crea nuevo.
        .upsert({ nombre, apellidos, email, telefono }, { onConflict: 'email' })
        .select()
        .single(); // Pedimos que nos devuelva el ID recién creado

    if (pacienteError) {
        console.error(pacienteError);
        alert('Hubo un problema registrando tus datos.');
        return;
    }

    // B) Insertar la Cita usando el ID del paciente
    const { error: citaError } = await clienteSupabase
        .from('citas')
        .insert({
            id_paciente: pacienteData.id,
            fecha_hora: fechaHoraISO,
            motivo_consulta: motivo
        });

    if (citaError) {
        console.error(citaError);
        alert('Este hueco acaba de ser ocupado. Por favor, elige otro.');
    } else {
        alert('¡Tu cita ha sido confirmada con éxito!');
        
        // Cerramos modal y limpiamos
        modal.classList.remove('modal-visible');
        modal.classList.add('modal-oculto');
        formularioCita.reset();
        
        // Recargamos los botones para que desaparezca la hora que acabamos de coger
        actualizarPantalla(citaSeleccionada.fecha);
    }
});

const hoyLocal = new Date();
const año = hoyLocal.getFullYear();
const mes = String(hoyLocal.getMonth() + 1).padStart(2, '0');
const dia = String(hoyLocal.getDate()).padStart(2, '0');
inputFecha.setAttribute('min', `${año}-${mes}-${dia}`);

// 7. SEGURIDAD DEL FRONTEND (Acceso a Admin)
function verificarAdmin() {
    // Lanza una ventana emergente nativa del navegador pidiendo texto
    const password = prompt("Introduce la contraseña de administrador:");
    
    // Validamos la contraseña (puedes cambiar "1234" por la que prefieras)
    if (password === "1234") {
        // Si es correcta, redirigimos al usuario al archivo admin.html
        window.location.href = "admin.html";
    } else if (password !== null) {
        // Si es incorrecta (y no le ha dado a "Cancelar")
        alert("Contraseña incorrecta. Acceso denegado.");
    }
}