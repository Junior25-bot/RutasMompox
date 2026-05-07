// Clase para representar la red de Mompox (Matemáticas Discretas)
class Grafo {
    constructor() {
        this.listaAdyacencia = {}; 
    }

    // Agrega un lugar (Vértice)
    agregarLugar(id) {
        if (!this.listaAdyacencia[id]) {
            this.listaAdyacencia[id] = [];
        }
    }

    // Conecta dos lugares (Arista con peso/distancia)
    conectarLugares(origen, destino, peso) {
        this.listaAdyacencia[origen].push({ nodo: destino, peso: parseFloat(peso) });
        this.listaAdyacencia[destino].push({ nodo: origen, peso: parseFloat(peso) });
    }
}

module.exports = Grafo;