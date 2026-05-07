require('dotenv').config();
process.on('unhandledRejection', (reason, promise) => {
  console.error('Error no capturado:', reason);
  process.exit(1);
});

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const obtenerRedMompox = require('./utils/cargarGrafo'); 

const app = express();
app.use(cors());
app.use(express.json());

// Configuración de la base de datos (usando las variables de tu .env)
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'grafo_mompox',
  waitForConnections: true,
});

// Variable global para mantener el grafo en memoria
let grafoMompox = null;

// Probar conexión y CARGAR EL GRAFO al iniciar
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Conexión a la base de datos exitosa');
    connection.release();

    // Cargamos la estructura de Matemáticas Discretas
    grafoMompox = await obtenerRedMompox(); 
    console.log('📍 Red de Mompox convertida a Grafo exitosamente');
    
  } catch (error) {
    console.error('❌ Error inicial:', error.message);
    process.exit(1);
  }
})();

app.get('/', (req, res) => {
  res.send('API de rutas Mompox funcionando 🚀');
});

// Endpoint para ver los lugares (Datos crudos)
app.get('/api/lugares', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM lugares');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// NUEVO: Endpoint para ver el Grafo (Estructura lógica)
app.get('/api/grafo', (req, res) => {
  if (!grafoMompox) {
    return res.status(500).json({ error: "El grafo aún no se ha cargado" });
  }
  // Mostramos la lista de adyacencia (Nodos y sus conexiones)
  res.json(grafoMompox.listaAdyacencia);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});