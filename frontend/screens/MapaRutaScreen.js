import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Button,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Picker } from '@react-native-picker/picker';
import API from '../services/api';

export default function MapaRutaScreen() {
  const [lugares, setLugares] = useState([]);
  const [origen, setOrigen] = useState(null);
  const [destino, setDestino] = useState(null);
  const [ruta, setRuta] = useState(null);
  const [recomendaciones, setRecomendaciones] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [aristas, setAristas] = useState([]);

  // 1. Cargar lugares desde el backend
 useEffect(() => {
  API.get('/api/lugares')
    .then((res) => setLugares(res.data))
    .catch((err) => {
      console.log('Error al cargar lugares:', err.message);
      Alert.alert('Error', 'No se pudieron cargar los lugares');
    });
  API.get('/api/aristas')
    .then((res) => setAristas(res.data))
    .catch((err) => console.log('No se pudieron cargar aristas:', err.message));
}, []);

  // 2. Calcular ruta y pedir recomendaciones
 const calcularRuta = async () => {
  if (!origen || !destino) {
    Alert.alert('Atención', 'Selecciona origen y destino');
    return;
  }
  setCargando(true);
  try {
    console.log('Enviando origen:', origen, typeof origen, 'destino:', destino, typeof destino);
    const resRuta = await API.post('/api/ruta', {
      origen_id: Number(origen),
      destino_id: Number(destino),
    });

    const { ruta: lugaresRuta, distancia_total, tiempo_estimado, puntos_ruta, ids_ruta } = resRuta.data;

    // Usar puntos_ruta de OSRM (calles reales) si existen
    if (puntos_ruta && puntos_ruta.length > 0) {
      setRuta({
        puntos: puntos_ruta,
        ids: ids_ruta || lugaresRuta.map(l => l.id),
        distancia: distancia_total,
        tiempo: tiempo_estimado
      });
    } else {
      // Respaldo con los lugares de la ruta
      const puntos = lugaresRuta
        .filter(l => l.latitud != null && l.longitud != null)
        .map(l => ({
          latitude: parseFloat(l.latitud),
          longitude: parseFloat(l.longitud),
        }));
      setRuta({ puntos, ids: lugaresRuta.map(l => l.id), distancia: distancia_total, tiempo: tiempo_estimado });
    }

    // Recomendaciones cercanas
    const ids = lugaresRuta.map(l => l.id);
    const resRec = await API.post('/api/ruta/recomendaciones', {
      ruta_ids: ids,
      radio: 200,
    });
    setRecomendaciones(resRec.data.recomendaciones);
  } catch (error) {
    console.log('Error detalle:', error.response?.status, error.response?.data);
    const mensajeServidor = error.response?.data?.error || error.message;
    Alert.alert('Error', `No se pudo calcular la ruta: ${mensajeServidor}`);
  } finally {
    setCargando(false);
  }
};

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
       initialRegion={{
  latitude: 9.2419,
  longitude: -74.4216,
  latitudeDelta: 0.003,
  longitudeDelta: 0.003,
}}
      >
        {/* Marcadores de todos los lugares */}
        {lugares
          .filter(l => l.latitud != null && l.longitud != null)
          .map((lugar) => (
            <Marker
              key={lugar.id}
              coordinate={{
                latitude: parseFloat(lugar.latitud),
                longitude: parseFloat(lugar.longitud),
              }}
              title={lugar.nombre}
              description={lugar.categoria}
              pinColor={ruta?.ids?.includes(lugar.id) ? 'blue' : '#2e86de'}
            />
          ))}

        {/* Línea de la ruta */}
        {ruta && ruta.puntos?.length > 0 && (
          <Polyline
            coordinates={ruta.puntos}
            strokeColor="#2e86de"
            strokeWidth={4}
          />
        )}
        {/* Marcadores de recomendaciones */}
        {recomendaciones
          .filter(rec => rec.latitud != null && rec.longitud != null)
          .map((rec) => (
            <Marker
              key={`rec-${rec.id}`}
              coordinate={{
                latitude: parseFloat(rec.latitud),
                longitude: parseFloat(rec.longitud),
              }}
              title={rec.nombre}
              description={`${rec.categoria} – A ${rec.distancia_al_camino}m`}
              pinColor="green"
            />
          ))}
      </MapView>

      {/* Panel de selección */}
      <View style={styles.controles}>
        <Picker
          selectedValue={origen}
          onValueChange={setOrigen}
          style={styles.picker}
        >
          <Picker.Item label="Selecciona origen..." value={null} />
          {lugares.map((l) => (
            <Picker.Item key={l.id} label={l.nombre} value={l.id} />
          ))}
        </Picker>

        <Picker
          selectedValue={destino}
          onValueChange={setDestino}
          style={styles.picker}
        >
          <Picker.Item label="Selecciona destino..." value={null} />
          {lugares.map((l) => (
            <Picker.Item key={`dest-${l.id}`} label={l.nombre} value={l.id} />
          ))}
        </Picker>

        {cargando ? (
          <ActivityIndicator size="large" color="#2e86de" />
        ) : (
          <Button
            title="Calcular ruta"
            color="#2e86de"
            onPress={calcularRuta}
          />
        )}
      </View>

      {/* Panel de recomendaciones */}
      {ruta && (
        <View style={styles.panel}>
          <Text style={styles.distancia}>
            Distancia: {ruta.distancia.toFixed(0)} m  |  ⏱ {ruta.tiempo} min
          </Text>
          <ScrollView style={{ maxHeight: 120 }}>
            {recomendaciones.length === 0 ? (
              <Text style={{ textAlign: 'center' }}>
                No hay lugares cercanos a la ruta
              </Text>
            ) : (
              recomendaciones.map((rec) => (
                <View key={rec.id} style={styles.recCard}>
                  <Text style={{ fontWeight: 'bold', fontSize: 16 }}>
                    {rec.nombre}
                  </Text>
                  <Text>
                    {rec.categoria} – ⭐{rec.calificacion}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#555' }}>
                    A {rec.distancia_al_camino}m del camino
                  </Text>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  controles: {
    position: 'absolute',
    top: 50,
    left: 10,
    right: 10,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  picker: {
    height: 50,
    width: '100%',
    marginBottom: 5,
    color: '#2c3e50',
  },
  panel: {
    position: 'absolute',
    bottom: 20,
    left: 10,
    right: 10,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  distancia: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#2e86de',
  },
  recCard: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
  },
});