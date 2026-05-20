import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Picker } from '@react-native-picker/picker';
import API from '../services/api';

export default function MapaRutaScreen({ route }) {
  const [lugares, setLugares] = useState([]);
  const [origen, setOrigen] = useState(null);
  const [destino, setDestino] = useState(null);
  const [ruta, setRuta] = useState(null);
  const [recomendaciones, setRecomendaciones] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [panelExpandido, setPanelExpandido] = useState(true);

  // Si se recibe un destino por parámetro (desde LugarDetalle), lo pre-seleccionamos
  const destinoInicial = route?.params?.destinoInicial;
  const origenCoords = route?.params?.origenCoords;

  useEffect(() => {
    API.get('/api/lugares')
      .then((res) => {
        setLugares(res.data);
        if (destinoInicial) {
          setDestino(destinoInicial.id);
          // Si también tenemos coordenadas de origen, podemos iniciar el cálculo automáticamente
        }
      })
      .catch(() => Alert.alert('Error', 'No se pudieron cargar los lugares'));
  }, [destinoInicial]);

  // Si se recibió origenCoords, crear un marcador temporal de "Mi ubicación"
  const miUbicacion = origenCoords ? {
    id: 'mi-ubicacion',
    nombre: 'Mi ubicación',
    latitud: origenCoords.latitude,
    longitud: origenCoords.longitude,
    categoria: 'Tú',
  } : null;

  const calcularRuta = async () => {
    if (!origen || !destino) {
      Alert.alert('Atención', 'Selecciona origen y destino');
      return;
    }
    setCargando(true);
    try {
      let origen_id = Number(origen);
      let destino_id = Number(destino);

      // Si el origen es "mi-ubicacion", necesitamos usar las coordenadas directamente
      // (El backend actual espera IDs de la BD, así que por ahora solo usamos IDs existentes)
      const resRuta = await API.post('/api/ruta', {
        origen_id: origen_id,
        destino_id: destino_id,
      });

      const { ruta: lugaresRuta, distancia_total, tiempo_estimado, puntos_ruta, ids_ruta } = resRuta.data;

      if (puntos_ruta && puntos_ruta.length > 0) {
        setRuta({
          puntos: puntos_ruta,
          ids: ids_ruta || lugaresRuta.map(l => l.id),
          distancia: distancia_total,
          tiempo: tiempo_estimado
        });
      } else {
        const puntos = lugaresRuta
          .filter(l => l.latitud != null && l.longitud != null)
          .map(l => ({
            latitude: parseFloat(l.latitud),
            longitude: parseFloat(l.longitud),
          }));
        setRuta({ puntos, ids: lugaresRuta.map(l => l.id), distancia: distancia_total, tiempo: tiempo_estimado });
      }

      const ids = lugaresRuta.map(l => l.id);
      const resRec = await API.post('/api/ruta/recomendaciones', {
        ruta_ids: ids,
        radio: 200,
      });
      setRecomendaciones(resRec.data.recomendaciones);
      setPanelExpandido(true);
    } catch (error) {
      console.log('Error:', error.response?.status, error.response?.data);
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
          latitude: origenCoords?.latitude || 9.2419,
          longitude: origenCoords?.longitude || -74.4216,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }}
      >
        {/* Marcador de "Mi ubicación" si existe */}
        {miUbicacion && (
          <Marker
            coordinate={{
              latitude: miUbicacion.latitud,
              longitude: miUbicacion.longitud,
            }}
            title="Mi ubicación"
            pinColor="green"
          />
        )}

        {/* Lugares normales */}
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
              pinColor={ruta?.ids?.includes(lugar.id) ? '#2563eb' : '#94a3b8'}
            />
          ))}

        {ruta && ruta.puntos?.length > 0 && (
          <Polyline
            coordinates={ruta.puntos}
            strokeColor="#2563eb"
            strokeWidth={4}
          />
        )}

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
              pinColor="#10b981"
            />
          ))}
      </MapView>

      {/* Panel de selección */}
      <View style={styles.controlPanel}>
        <Text style={styles.panelTitle}>Planifica tu recorrido</Text>
        <View style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>Origen</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={origen}
              onValueChange={setOrigen}
              style={styles.picker}
            >
              <Picker.Item label="Selecciona origen..." value={null} />
              {miUbicacion && (
                <Picker.Item label="📍 Mi ubicación" value="mi-ubicacion" />
              )}
              {lugares.map((l) => (
                <Picker.Item key={l.id} label={l.nombre} value={l.id} />
              ))}
            </Picker>
          </View>
        </View>
        <View style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>Destino</Text>
          <View style={styles.pickerWrapper}>
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
          </View>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={calcularRuta}
          disabled={cargando}
        >
          {cargando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Calcular ruta óptima</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Resultados minimizables */}
      {ruta && (
        <View style={[styles.resultPanel, !panelExpandido && styles.resultPanelMini]}>
          <TouchableOpacity
            style={styles.togglePanel}
            onPress={() => setPanelExpandido(!panelExpandido)}
          >
            <Text style={styles.togglePanelText}>
              {panelExpandido ? '▼ Minimizar' : '▲ Ver resultados'}
            </Text>
          </TouchableOpacity>

          {panelExpandido ? (
            <>
              <View style={styles.statsContainer}>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{ruta.distancia.toFixed(0)} m</Text>
                  <Text style={styles.statLabel}>Distancia</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>⏱ {ruta.tiempo} min</Text>
                  <Text style={styles.statLabel}>Tiempo aprox.</Text>
                </View>
              </View>

              <Text style={styles.recoTitle}>Lugares recomendados cercanos</Text>
              <ScrollView style={styles.recoScroll} horizontal showsHorizontalScrollIndicator={false}>
                {recomendaciones.length === 0 ? (
                  <Text style={styles.noReco}>No hay lugares cercanos</Text>
                ) : (
                  recomendaciones.map((rec) => (
                    <View key={rec.id} style={styles.recoCard}>
                      <Text style={styles.recoName}>{rec.nombre}</Text>
                      <Text style={styles.recoCat}>{rec.categoria}</Text>
                      <Text style={styles.recoDist}>A {rec.distancia_al_camino}m</Text>
                      <Text style={styles.recoStars}>⭐ {rec.calificacion}</Text>
                    </View>
                  ))
                )}
              </ScrollView>
            </>
          ) : (
            <View style={styles.miniStats}>
              <Text style={styles.miniDistance}>{ruta.distancia.toFixed(0)} m</Text>
              <Text style={styles.miniTime}>⏱ {ruta.tiempo} min</Text>
            </View>
          )}
        </View>
      )}

      {/* Leyenda */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#94a3b8' }]} />
          <Text style={styles.legendText}>Lugares</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#2563eb' }]} />
          <Text style={styles.legendText}>Ruta</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
          <Text style={styles.legendText}>Recomendaciones</Text>
        </View>
        {miUbicacion && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: 'green' }]} />
            <Text style={styles.legendText}>Mi ubicación</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  controlPanel: {
    position: 'absolute',
    top: 50,
    left: 10,
    right: 10,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
    textAlign: 'center',
  },
  pickerContainer: { marginBottom: 12 },
  pickerLabel: { fontSize: 14, color: '#64748b', marginBottom: 4 },
  pickerWrapper: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    overflow: 'hidden',
  },
  picker: { height: 50, width: '100%', color: '#0f172a' },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  resultPanel: {
    position: 'absolute',
    bottom: 20,
    left: 10,
    right: 10,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  resultPanelMini: {
    padding: 12,
  },
  togglePanel: {
    alignItems: 'center',
    marginBottom: 8,
  },
  togglePanelText: {
    color: '#2563eb',
    fontWeight: '600',
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: 'bold', color: '#2563eb' },
  statLabel: { fontSize: 12, color: '#64748b' },
  recoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  recoScroll: { maxHeight: 100, marginBottom: 8 },
  noReco: { color: '#94a3b8', fontStyle: 'italic' },
  recoCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 12,
    marginRight: 10,
    width: 150,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  recoName: { fontWeight: 'bold', fontSize: 14, color: '#065f46', marginBottom: 4 },
  recoCat: { fontSize: 12, color: '#047857' },
  recoDist: { fontSize: 11, color: '#64748b', marginTop: 4 },
  recoStars: { fontSize: 11, color: '#b45309', marginTop: 2 },
  miniStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  miniDistance: { fontSize: 16, fontWeight: 'bold', color: '#2563eb' },
  miniTime: { fontSize: 16, color: '#475569' },
  legend: {
    position: 'absolute',
    bottom: 20,
    right: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
    padding: 10,
    gap: 8,
    elevation: 2,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { fontSize: 11, color: '#475569' },
});