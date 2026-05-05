require('dotenv').config();
process.on('unhandledRejection', (reason, promise) => {
  console.error('Error no capturado:', reason);
  process.exit(1);
});
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json()); // para leer JSON en las peticiones

// Configuración de la base de datos
const pool = mysql.createPool({
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: '',        // si tienes contraseña, colócala aquí
  database: 'grafo_mompox',
  waitForConnections: true,
});

// Probar la conexión a la base de datos al iniciar
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Conexión a la base de datos exitosa');
    connection.release();
  } catch (error) {
    console.error('Error al conectar a la base de datos:', error.message);
    process.exit(1);
  }
})();

// Endpoint de prueba
app.get('/', (req, res) => {
  res.send('API de rutas Mompox funcionando 🚀');
});

// Endpoint para obtener todos los lugares
app.get('/api/lugares', async (req, res) => {
  console.log('Solicitud recibida en /api/lugares');
  try {
    const [rows] = await pool.query('SELECT * FROM lugares');
    console.log('Consulta ejecutada, filas obtenidas:', rows.length);
    res.json(rows);
  } catch (error) {
    console.error('Error en la consulta:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

server.on('error', (error) => {
  console.error('Error al iniciar el servidor:', error.message);
  process.exit(1);
});