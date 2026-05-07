const mysql = require('mysql2/promise');
const Grafo = require('./grafo');
require('dotenv').config();

async function obtenerRedMompox() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME
    });

    const mompoxMap = new Grafo();

    // 1. Cargamos los lugares (Vértices)
    const [lugares] = await connection.execute('SELECT id FROM lugares');
    lugares.forEach(lugar => mompoxMap.agregarLugar(lugar.id));

    // 2. Cargamos las conexiones (Aristas)
    const [aristas] = await connection.execute('SELECT origen_id, destino_id, peso FROM aristas');
    aristas.forEach(arista => {
        mompoxMap.conectarLugares(arista.origen_id, arista.destino_id, arista.peso);
    });

    await connection.end();
    console.log("¡Grafo de Mompox cargado con éxito en memoria!");
    return mompoxMap;
}

module.exports = obtenerRedMompox;