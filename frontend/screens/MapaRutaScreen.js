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

  // 1. Obtener todos los lugares desde el backend
  useEffect(() => {
    API.get('/lugares')
      .then((res) => setLugares(res.data))
      .catch(() => Alert.alert('Error', 'No se pudieron cargar los lugares'));
  }, []);

  // 2. Calcular la ruta y luego pedir recomendaciones
  const calcularRuta = async () => {
    if (!origen || !destino) {
      Alert.alert('Atención', 'Selecciona origen y destino');
      return;
    }
    setCargando(true);
    try {
      // 2a. Calcular la ruta más corta
      const resRuta = await API.post('/ruta', {
        origen_id: origen,
        destino_id: destino,
      });
      const { ruta: lugaresRuta, distancia_total } = resRuta.data;

      // Preparar datos para dibujar en el mapa
      const puntos = lugaresRuta.map((l) => ({
        latitude: l.latitud,
        longitude: l.longitud,
      }));
      const ids = lugaresRuta.map((l) => l.id);
      setRuta({ puntos, ids, distancia: distancia_total });

      // 2b. Obtener recomendaciones de lugares cercanos a la ruta
      const resRec = await API.post('/ruta/recomendaciones', {
        ruta_ids: ids,
        radio: 200, // metros de desvío máximo
      });
      setRecomendaciones(resRec.data.recomendaciones);
    } catch (error) {
      Alert.alert('Error', 'No se pudo calcular la ruta');
    } finally {
      setCargando(false);
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 9.241,
          longitude: -74.422,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        {/* Mostrar todos los lugares como marcadores */}
        {lugares.map((lugar) => (
          <Marker
            key={lugar.id}
            coordinate={{
              latitude: lugar.latitud,
              longitude: lugar.longitud,
            }}
            title={lugar.nombre}
            description={lugar.categoria}
            pinColor={ruta?.ids?.includes(lugar.id) ? 'blue' : '#2e86de'}
          />
        ))}

        {/* Dibujar la línea de la ruta */}
        {ruta && (
          <Polyline
            coordinates={ruta.puntos}
            strokeColor="#2e86de"
            strokeWidth={4}
          />
        )}

        {/* Mostrar recomendaciones (POI) en verde */}
        {recomendaciones.map((rec) => (
          <Marker
            key={`rec-${rec.id}`}
            coordinate={{
              latitude: rec.latitud,
              longitude: rec.longitud,
            }}
            title={rec.nombre}
            description={`${rec.categoria} – A ${rec.distancia_al_camino}m`}
            pinColor="green"
          />
        ))}
      </MapView>

      {/* Panel flotante superior: selección de origen/destino */}
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
            <Picker.Item key={l.id} label={l.nombre} value={l.id} />
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

      {/* Panel inferior: recomendaciones */}
      {ruta && (
        <View style={styles.panel}>
          <Text style={styles.distancia}>
            Distancia total: {ruta.distancia.toFixed(0)} m
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