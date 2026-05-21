require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const { Heap } = require('heap-js');
const { getDistance } = require('geolib');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// ── Conexión BD ───────────────────────────────────────────────────
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'grafo_mompox',
  waitForConnections: true,
});

(async () => {
  try {
    const conn = await pool.getConnection();
    console.log('✅ Conexión a MySQL exitosa');
    conn.release();
  } catch (err) {
    console.error('❌ Error al conectar a MySQL:', err.message);
    process.exit(1);
  }
})();

app.get('/', (req, res) => res.send('API de rutas Mompox funcionando 🚀'));

// ── GET /api/lugares ──────────────────────────────────────────────
app.get('/api/lugares', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM lugares');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/aristas ──────────────────────────────────────────────
app.get('/api/aristas', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM aristas');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Dijkstra ──────────────────────────────────────────────────────
function dijkstra(grafo, inicioId) {
  const distancias = {};
  const previos = {};
  const visitados = new Set();
  const cola = new Heap((a, b) => a.distancia - b.distancia);

  for (const nodo of Object.keys(grafo)) distancias[nodo] = Infinity;
  distancias[inicioId] = 0;
  cola.push({ id: inicioId, distancia: 0 });

  while (cola.length) {
    const { id: actual } = cola.pop();
    if (visitados.has(actual)) continue;
    visitados.add(actual);
    for (const vecino in grafo[actual]) {
      const nuevaDist = distancias[actual] + grafo[actual][vecino];
      if (nuevaDist < distancias[vecino]) {
        distancias[vecino] = nuevaDist;
        previos[vecino] = actual;
        cola.push({ id: vecino, distancia: nuevaDist });
      }
    }
  }
  return { distancias, previos };
}

function reconstruirRuta(previos, inicioId, finId) {
  const ruta = [String(finId)];
  let actual = String(finId);
  while (actual !== String(inicioId)) {
    actual = previos[actual];
    if (actual === undefined) return []; // sin camino
    ruta.unshift(actual);
  }
  return ruta;
}

// ── POST /api/ruta ────────────────────────────────────────────────
// Recibe: { origen_id, destino_id }
//      ó  { origen_coords: {lat, lon}, destino_id }
// Cuando se recibe origen_coords, encuentra el nodo más cercano,
// corre Dijkstra desde él, y traza OSRM desde las coords reales.
app.post('/api/ruta', async (req, res) => {
  try {
    const { origen_id, origen_coords, destino_id } = req.body;

    if (!destino_id || (!origen_id && !origen_coords))
      return res.status(400).json({ error: 'Se requiere destino_id y (origen_id u origen_coords)' });

    const [todosLugares] = await pool.query('SELECT * FROM lugares');
    const [todasAristas] = await pool.query('SELECT * FROM aristas');

    const mapaLugares = {};
    todosLugares.forEach(l => { mapaLugares[l.id] = l; });

    // Construir grafo
    const grafo = {};
    todosLugares.forEach(l => { grafo[l.id] = {}; });
    todasAristas.forEach(a => {
      if (grafo[a.origen_id]) grafo[a.origen_id][a.destino_id] = parseFloat(a.peso);
    });

    // Resolver origen_id: desde coords GPS → nodo más cercano
    let origenIdFinal = origen_id ? Number(origen_id) : null;
    let coordsOrigenReales = null; // coords GPS del usuario (si las hay)

    if (origen_coords) {
      const lat = parseFloat(origen_coords.lat);
      const lon = parseFloat(origen_coords.lon);
      coordsOrigenReales = { lat, lon };

      let minDist = Infinity;
      for (const l of todosLugares) {
        const dLat = (parseFloat(l.latitud) - lat) * 111320;
        const dLon = (parseFloat(l.longitud) - lon) * 111320 * Math.cos(lat * Math.PI / 180);
        const dist = Math.sqrt(dLat * dLat + dLon * dLon);
        if (dist < minDist) { minDist = dist; origenIdFinal = l.id; }
      }
    }

    if (Number(origenIdFinal) === Number(destino_id))
      return res.status(400).json({ error: 'El punto más cercano a tu ubicación ya es el destino' });

    // Dijkstra
    const { distancias, previos } = dijkstra(grafo, String(origenIdFinal));
    const idsRutaStr = reconstruirRuta(previos, String(origenIdFinal), String(destino_id));

    if (idsRutaStr.length === 0)
      return res.status(404).json({ error: 'No existe ruta entre los lugares seleccionados' });

    const idsRuta = idsRutaStr.map(Number);
    const distanciaGrafo = distancias[String(destino_id)];
    const lugaresRuta = idsRuta.map(id => mapaLugares[id]).filter(Boolean);

    // OSRM: desde coords reales del usuario (o desde nodo origen) hasta destino
    const d = mapaLugares[Number(destino_id)];
    const origenLat = coordsOrigenReales ? coordsOrigenReales.lat : parseFloat(mapaLugares[origenIdFinal].latitud);
    const origenLon = coordsOrigenReales ? coordsOrigenReales.lon : parseFloat(mapaLugares[origenIdFinal].longitud);

    const osrmUrl = `https://router.project-osrm.org/route/v1/foot/${origenLon},${origenLat};${d.longitud},${d.latitud}?overview=full&geometries=geojson`;

    let puntosRuta = [
      { latitude: origenLat, longitude: origenLon },
      ...lugaresRuta.map(l => ({ latitude: parseFloat(l.latitud), longitude: parseFloat(l.longitud) })),
    ];
    let distanciaFinal = distanciaGrafo;
    let tiempoFinal = Math.round((distanciaGrafo / 83.3) * 10) / 10;

    try {
      const osrmRes = await axios.get(osrmUrl, { timeout: 8000 });
      if (osrmRes.data?.routes?.length > 0) {
        const route = osrmRes.data.routes[0];
        distanciaFinal = route.distance;
        tiempoFinal = Math.round((route.duration / 60) * 10) / 10;
        puntosRuta = route.geometry.coordinates.map(c => ({ latitude: c[1], longitude: c[0] }));
      }
    } catch (e) {
      console.log('OSRM no disponible:', e.message);
    }

    res.json({
      ruta: lugaresRuta.map(l => ({
        id: l.id, nombre: l.nombre,
        latitud: l.latitud, longitud: l.longitud,
        categoria: l.categoria, calificacion: l.calificacion,
      })),
      ids_ruta: idsRuta,
      distancia_total: Math.round(distanciaFinal),
      tiempo_estimado: tiempoFinal,
      puntos_ruta: puntosRuta,
      origen_usado: coordsOrigenReales
        ? { ...mapaLugares[origenIdFinal], es_gps: true }
        : mapaLugares[origenIdFinal],
    });

  } catch (err) {
    console.error('Error en /api/ruta:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── POST /api/ruta/recomendaciones ────────────────────────────────
// Recibe: { ruta_ids, radio, categoria_destino }
// Busca lugares de la MISMA categoría que el destino,
// que estén dentro del radio (metros) de cualquier nodo de la ruta,
// y que no estén ya en la ruta.
app.post('/api/ruta/recomendaciones', async (req, res) => {
  try {
    const { ruta_ids, radio = 400, categoria_destino } = req.body;

    if (!ruta_ids || !Array.isArray(ruta_ids) || ruta_ids.length === 0)
      return res.status(400).json({ error: 'ruta_ids es requerido' });

    // Candidatos: misma categoría que el destino (sin restricción de calificación)
    let candidatos;
    if (categoria_destino) {
      const [rows] = await pool.query(
        'SELECT * FROM lugares WHERE categoria = ?',
        [categoria_destino]
      );
      candidatos = rows;
    } else {
      // Si no hay categoría, usar todos con calificación >= 3.5
      const [rows] = await pool.query('SELECT * FROM lugares WHERE calificacion >= 3.5');
      candidatos = rows;
    }

    // Obtener coordenadas de los nodos de la ruta
    const ph = ruta_ids.map(() => '?').join(',');
    const [nodos] = await pool.query(
      `SELECT id, latitud, longitud FROM lugares WHERE id IN (${ph})`,
      ruta_ids
    );

    const idsRuta = new Set(ruta_ids.map(Number));
    const coordsNodos = nodos.map(n => ({
      lat: parseFloat(n.latitud),
      lng: parseFloat(n.longitud),
    }));

    const recomendaciones = [];
    for (const lugar of candidatos) {
      // Excluir los que ya están en la ruta
      if (idsRuta.has(Number(lugar.id))) continue;

      // Distancia mínima a cualquier nodo de la ruta
      let minDist = Infinity;
      const coordLugar = {
        lat: parseFloat(lugar.latitud),
        lng: parseFloat(lugar.longitud),
      };
      for (const nodo of coordsNodos) {
        const dist = getDistance(coordLugar, nodo);
        if (dist < minDist) minDist = dist;
        if (dist <= radio) break; // ya encontramos uno cercano, basta
      }

      if (minDist <= radio) {
        recomendaciones.push({ ...lugar, distancia_al_camino: minDist });
      }
    }

    // Ordenar: más cercanos primero, luego mejor calificación
    recomendaciones.sort((a, b) =>
      a.distancia_al_camino !== b.distancia_al_camino
        ? a.distancia_al_camino - b.distancia_al_camino
        : parseFloat(b.calificacion) - parseFloat(a.calificacion)
    );

    res.json({
      recomendaciones,
      categoria_filtro: categoria_destino || 'todas',
      total: recomendaciones.length,
    });

  } catch (err) {
    console.error('Error en /api/ruta/recomendaciones:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── POST /api/registro-prueba ─────────────────────────────────────
app.post('/api/registro-prueba', async (req, res) => {
  try {
    const { origen_id, destino_id, distancia, tiempo, recomendaciones } = req.body;
    if (!origen_id || !destino_id || distancia == null || tiempo == null)
      return res.status(400).json({ error: 'Faltan datos de la prueba' });
    await pool.query(
      'INSERT INTO pruebas (origen_id, destino_id, distancia, tiempo, recomendaciones) VALUES (?, ?, ?, ?, ?)',
      [origen_id, destino_id, distancia, tiempo, recomendaciones || 0]
    );
    res.json({ mensaje: 'Prueba registrada correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Iniciar servidor ──────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});