// 1. CONEXIÓN A SUPABASE
const supabaseUrl = 'https://zaybxlotytxhcaknyfhz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpheWJ4bG90eXR4aGNha255Zmh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3MjU1NDksImV4cCI6MjEwMDMwMTU0OX0.37rH2OjcB_b3Q86aB8VeedSJsrxcg_qGT10WQGm4dow';
const clienteSupabase = window.supabase.createClient(supabaseUrl, supabaseKey);

const cuerpoTabla = document.getElementById('cuerpo-tabla');

// 2. LEER LA VISTA Y PINTAR LA TABLA
async function cargarAgenda() {
    // Hacemos el select directamente a la vista
    const { data, error } = await clienteSupabase
        .from('vista_agenda')
        .select('*');

    if (error) {
        console.error("Error al cargar la agenda:", error);
        cuerpoTabla.innerHTML = '<tr><td colspan="6">Error al cargar los datos.</td></tr>';
        return;
    }

    if (data.length === 0) {
        cuerpoTabla.innerHTML = '<tr><td colspan="6">No hay citas programadas.</td></tr>';
        return;
    }

    // Limpiamos el contenido de "Cargando..." y pintamos las filas
    cuerpoTabla.innerHTML = '';

    data.forEach(cita => {
        const fila = document.createElement('tr');
        
        // Separamos fecha y hora como hicimos antes
        const fechaCruda = cita.fecha_hora.split('T')[0];
        const horaCruda = cita.fecha_hora.split('T')[1].substring(0, 5);

        // Formateamos la fecha para que se lea mejor (Ej: 23/07/2026)
        const partesFecha = fechaCruda.split('-');
        const fechaLimpia = `${partesFecha[2]}/${partesFecha[1]}/${partesFecha[0]}`;

        fila.innerHTML = `
            <td><strong>${fechaLimpia}</strong></td>
            <td>${horaCruda}</td>
            <td>${cita.nombre} ${cita.apellidos}</td>
            <td><a href="tel:${cita.telefono}">${cita.telefono}</a></td>
            <td>${cita.motivo_consulta}</td>
            <td><span class="estado-pendiente">${cita.estado}</span></td>
        `;

        cuerpoTabla.appendChild(fila);
    });
}

// Ejecutar al cargar la página
cargarAgenda();