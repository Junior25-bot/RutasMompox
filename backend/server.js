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

// ────────────────────────────────────────
// POST /api/ruta
// Recibe: { origen_id, destino_id }
// ────────────────────────────────────────
app.post('/api/ruta', async (req, res) => {
  try {
    const { origen_id, destino_id } = req.body;
    if (!origen_id || !destino_id) {
      return res.status(400).json({ error: 'origen_id y destino_id son requeridos' });
    }

    // Obtener todas las aristas
    const [aristas] = await pool.query(
  'SELECT origen_id, destino_id, peso FROM aristas'
);

const grafo = {};
for (const a of aristas) {
  const orig = a.origen_id.toString();
  const dest = a.destino_id.toString();
  const peso = Number(a.peso);

  if (!grafo[orig]) grafo[orig] = {};
  if (!grafo[dest]) grafo[dest] = {};

  // Agregar en ambos sentidos (grafo no dirigido)
  grafo[orig][dest] = peso;
  grafo[dest][orig] = peso; 
}

    // Ejecutar Dijkstra
    const { distancias, previos } = dijkstra(grafo, origen_id.toString());

    if (distancias[destino_id.toString()] === Infinity) {
      return res.status(404).json({ error: 'No existe ruta entre esos puntos' });
    }

    const rutaIDs = reconstruirRuta(previos, origen_id.toString(), destino_id.toString());
    if (rutaIDs.length === 0) {
      return res.status(404).json({ error: 'No se pudo reconstruir la ruta' });
    }

    // Obtener datos de los lugares de la ruta
    const placeholders = rutaIDs.map(() => '?').join(',');
    const [lugaresRuta] = await pool.query(
      `SELECT id, nombre, latitud, longitud FROM lugares WHERE id IN (${placeholders})`,
      rutaIDs
    );

    // Ordenar según la ruta
    const mapa = {};
    for (const lug of lugaresRuta) {
      mapa[lug.id] = lug;
    }
    const rutaOrdenada = rutaIDs.map(id => mapa[parseInt(id)]).filter(Boolean);

    res.json({
      ruta: rutaOrdenada,
      distancia_total: distancias[destino_id.toString()]
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
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});