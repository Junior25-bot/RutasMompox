require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const { Heap } = require('heap-js');
const { getDistance } = require('geolib');

const app = express();
app.use(cors());
app.use(express.json());

// ────────────────────────────────────────
// Conexión a la base de datos
// ────────────────────────────────────────
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'grafo_mompox',
  waitForConnections: true,
});

// ────────────────────────────────────────
// Prueba de conexión al iniciar
// ────────────────────────────────────────
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

// ────────────────────────────────────────
// Endpoint de prueba
// ────────────────────────────────────────
app.get('/', (req, res) => res.send('API de rutas Mompox funcionando 🚀'));

// ────────────────────────────────────────
// Obtener todos los lugares (ya funciona)
// ────────────────────────────────────────
app.get('/api/lugares', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM lugares');
    console.log(`📦 /api/lugares → ${rows.length} lugares`);
    res.json(rows);
  } catch (err) {
    console.error('Error en /api/lugares:', err.message);
    res.status(500).json({ error: err.message });
  }
});



// ────────────────────────────────────────
// Obtener todas las aristas
// ────────────────────────────────────────
app.get('/api/aristas', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM aristas');
    console.log(`📦 /api/aristas → ${rows.length} aristas`);
    res.json(rows);
  } catch (err) {
    console.error('Error en /api/aristas:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ────────────────────────────────────────
// Algoritmo de Dijkstra
// ────────────────────────────────────────
function dijkstra(grafo, inicioId) {
  const distancias = {};
  const previos = {};
  const visitados = new Set();
  const cola = new Heap((a, b) => a.distancia - b.distancia);

  for (const nodo of Object.keys(grafo)) {
    distancias[nodo] = Infinity;
  }
  distancias[inicioId] = 0;
  cola.push({ id: inicioId, distancia: 0 });

  while (cola.length) {
    const { id: actual } = cola.pop();
    if (visitados.has(actual)) continue;
    visitados.add(actual);

    for (const vecino in grafo[actual]) {
      const peso = grafo[actual][vecino];
      const nuevaDist = distancias[actual] + peso;
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
  const ruta = [finId];
  let actual = finId;
  while (actual != inicioId) {
    actual = previos[actual];
    if (!actual) return [];
    ruta.unshift(actual);
  }
  return ruta;
}
const axios = require('axios');
// ────────────────────────────────────────
// POST /api/ruta
// Recibe: { origen_id, destino_id }
// ────────────────────────────────────────
// ────────────────────────────────────────
// POST /api/ruta (versión con OSRM: calles reales + distancia precisa + tiempo)
// ────────────────────────────────────────
app.post('/api/ruta', async (req, res) => {
  try {
    const { origen_id, destino_id } = req.body;
    if (!origen_id || !destino_id) {
      return res.status(400).json({ error: 'origen_id y destino_id son requeridos' });
    }

    // 1. Obtener coordenadas de origen y destino
    const [lugares] = await pool.query(
      'SELECT id, nombre, latitud, longitud FROM lugares WHERE id IN (?, ?)',
      [origen_id, destino_id]
    );

    if (lugares.length !== 2) {
      return res.status(404).json({ error: 'No se encontraron los lugares especificados' });
    }

    const origen = lugares.find(l => l.id == origen_id);
    const destino = lugares.find(l => l.id == destino_id);

    // 2. Consultar a OSRM (API gratuita, sin key) para obtener ruta caminando por calles reales
    // OSRM espera coordenadas en formato: longitud,latitud
    const url = `https://router.project-osrm.org/route/v1/foot/${origen.longitud},${origen.latitud};${destino.longitud},${destino.latitud}?overview=full&geometries=geojson`;

    let rutaCallejera = null;
    let distanciaRealMetros = 0;
    let tiempoEstimadoSegundos = 0;

    try {
      const osrmResponse = await axios.get(url);
      if (osrmResponse.data && osrmResponse.data.routes && osrmResponse.data.routes.length > 0) {
        const route = osrmResponse.data.routes[0];
        distanciaRealMetros = route.distance; // metros reales por calles
        tiempoEstimadoSegundos = route.duration; // segundos caminando
        rutaCallejera = route.geometry.coordinates; // array de [longitud, latitud]
      }
    } catch (osrmError) {
      console.log('OSRM falló, usando línea recta como respaldo:', osrmError.message);
    }

    // 3. Construir la polilínea (de calles o línea recta como respaldo)
    let puntos = [];

    if (rutaCallejera && rutaCallejera.length > 0) {
      // OSRM devuelve [longitud, latitud] → convertir a {latitude, longitude}
      puntos = rutaCallejera.map(coord => ({
        latitude: coord[1],
        longitude: coord[0]
      }));
    } else {
      // Respaldo: línea recta simple
      puntos = [
        { latitude: parseFloat(origen.latitud), longitude: parseFloat(origen.longitud) },
        { latitude: parseFloat(destino.latitud), longitude: parseFloat(destino.longitud) }
      ];
      // Calcular distancia en línea recta como último recurso
      const R = 6371000;
      const dLat = (destino.latitud - origen.latitud) * Math.PI / 180;
      const dLon = (destino.longitud - origen.longitud) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 +
                Math.cos(origen.latitud * Math.PI / 180) * Math.cos(destino.latitud * Math.PI / 180) *
                Math.sin(dLon / 2) ** 2;
      distanciaRealMetros = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      tiempoEstimadoSegundos = distanciaRealMetros / 1.4; // velocidad media caminando
    }

    // 4. Obtener recomendaciones cercanas a la ruta (usando el endpoint de recomendaciones)
    // Simplemente devolvemos los IDs de todos los lugares como referencia
    const [todosLugares] = await pool.query('SELECT id FROM lugares WHERE id NOT IN (?, ?)', [origen_id, destino_id]);
    const idsRuta = [Number(origen_id), ...todosLugares.map(l => l.id).slice(0, 3), Number(destino_id)];

    // 5. Obtener datos completos de los lugares en la ruta
    const [lugaresRuta] = await pool.query(
      'SELECT id, nombre, latitud, longitud, categoria FROM lugares WHERE id IN (?, ?)',
      [origen_id, destino_id]
    );

    res.json({
      ruta: lugaresRuta,
      distancia_total: Math.round(distanciaRealMetros),
      tiempo_estimado: Math.round(tiempoEstimadoSegundos / 60 * 10) / 10, // minutos con 1 decimal
      puntos_ruta: puntos,
      ids_ruta: idsRuta
    });

  } catch (err) {
    console.error('Error en /api/ruta:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ────────────────────────────────────────
// POST /api/ruta/recomendaciones
// Recibe: { ruta_ids, radio }
// ────────────────────────────────────────
app.post('/api/ruta/recomendaciones', async (req, res) => {
  try {
    const { ruta_ids, radio = 200 } = req.body;
    if (!ruta_ids || !Array.isArray(ruta_ids) || ruta_ids.length === 0) {
      return res.status(400).json({ error: 'ruta_ids es requerido' });
    }

    // Obtener coordenadas de todos los lugares
    const [todosLugares] = await pool.query(
      'SELECT id, nombre, latitud, longitud, categoria, descripcion, calificacion FROM lugares'
    );

    const mapaTodos = {};
    todosLugares.forEach(l => { mapaTodos[l.id] = l; });

    // Coordenadas de los lugares que están en la ruta
    const lugaresRuta = ruta_ids.map(id => mapaTodos[id]).filter(Boolean);
    if (lugaresRuta.length === 0) {
      return res.json({ recomendaciones: [] });
    }

    const puntosRuta = lugaresRuta.map(l => ({ lat: l.latitud, lng: l.longitud }));
    const idsRuta = new Set(ruta_ids.map(Number));
    const recomendaciones = [];

    for (const lugar of todosLugares) {
      if (idsRuta.has(lugar.id)) continue;

      let minDist = Infinity;
      for (const punto of puntosRuta) {
        const d = getDistance(
          { lat: lugar.latitud, lng: lugar.longitud },
          punto
        );
        if (d < minDist) minDist = d;
        if (d <= radio) break;
      }

      if (minDist <= radio) {
        recomendaciones.push({
          ...lugar,
          distancia_al_camino: minDist
        });
      }
    }

    recomendaciones.sort((a, b) => a.distancia_al_camino - b.distancia_al_camino);
    res.json({ recomendaciones });
  } catch (err) {
    console.error('Error en /api/ruta/recomendaciones:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ────────────────────────────────────────
// Iniciar servidor
// ────────────────────────────────────────
const PORT = process.env.PORT || 3001;
// Endpoint para registrar automáticamente las pruebas de eficiencia
app.post('/api/registro-prueba', async (req, res) => {
  try {
    const { origen_id, destino_id, distancia, tiempo, recomendaciones } = req.body;
    if (!origen_id || !destino_id || distancia == null || tiempo == null) {
      return res.status(400).json({ error: 'Faltan datos de la prueba' });
    }
    await pool.query(
      'INSERT INTO pruebas (origen_id, destino_id, distancia, tiempo, recomendaciones) VALUES (?, ?, ?, ?, ?)',
      [origen_id, destino_id, distancia, tiempo, recomendaciones || 0]
    );
    res.json({ mensaje: 'Prueba registrada correctamente' });
  } catch (error) {
    console.error('Error al registrar prueba:', error.message);
    res.status(500).json({ error: 'Error al registrar la prueba' });
  }
});
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});