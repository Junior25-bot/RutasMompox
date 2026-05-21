import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator,
  Animated, Platform,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Picker } from '@react-native-picker/picker';
import * as Location from 'expo-location';
import API from '../services/api';

// ── Configuración visual por categoría ───────────────────────────
const EMOJI = {
  restaurante: '🍽️', hospedaje: '🏨', religioso: '⛪',
  cultural: '🏛️', histórico: '🏺', plaza: '🌳',
  comercio: '🛍️', naturaleza: '🌿', puerto: '⚓',
};
const COLOR = {
  restaurante: '#f97316', hospedaje: '#8b5cf6', religioso: '#eab308',
  cultural: '##3b82f6', histórico: '#6b7280', plaza: '#16a34a',
  comercio: '#ec4899', naturaleza: '#10b981', puerto: '#0ea5e9',
};
const LABEL_CATEGORIA = {
  restaurante: 'restaurantes', hospedaje: 'hospedajes', religioso: 'iglesias y templos',
  cultural: 'lugares culturales', histórico: 'sitios históricos', plaza: 'plazas',
  comercio: 'tiendas y comercios', naturaleza: 'espacios naturales', puerto: 'puertos y muelles',
};

export default function MapaRutaScreen({ route }) {
  const mapRef = useRef(null);
  // Panel inferior: altura animada (1 = expandido, 0 = colapsado)
  const panelAnim = useRef(new Animated.Value(1)).current;
  const [panelAbierto, setPanelAbierto] = useState(true);

  const [lugares, setLugares] = useState([]);
  const [origen, setOrigen] = useState(null);
  const [destino, setDestino] = useState(null);
  const [ruta, setRuta] = useState(null);          // { puntos, ids, distancia, tiempo }
  const [recomendaciones, setRecomendaciones] = useState([]);
  const [catDestino, setCatDestino] = useState(null);
  const [aristas, setAristas] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [miUbicacionGPS, setMiUbicacionGPS] = useState(null);   // coords GPS reales
  const [cargandoGPS, setCargandoGPS] = useState(false);

  const destinoInicial = route?.params?.destinoInicial;
  const origenCoords   = route?.params?.origenCoords;  // viene de LugarDetalleScreen

  useEffect(() => {
    API.get('/api/lugares')
      .then(res => {
        setLugares(res.data);
        if (destinoInicial) setDestino(destinoInicial.id);
      })
      .catch(() => Alert.alert('Error', 'No se pudieron cargar los lugares'));
    API.get('/api/aristas')
      .then(res => setAristas(res.data))
      .catch(err => console.log('Aristas:', err.message));

    // Si venimos desde LugarDetalle con coords ya listas, usarlas directamente
    if (origenCoords) {
      setMiUbicacionGPS(origenCoords);
      setOrigen('mi-ubicacion');
    }
  }, [destinoInicial]);

  // Solicitar ubicación GPS al pulsar el botón en el Picker
  const obtenerUbicacion = async () => {
    setCargandoGPS(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Activa los permisos de ubicación en ajustes para usar esta función.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setMiUbicacionGPS({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      setOrigen('mi-ubicacion');
      Alert.alert('✅ Ubicación obtenida', 'Tu posición actual fue establecida como origen.');
    } catch (e) {
      Alert.alert('Error', 'No se pudo obtener tu ubicación. Verifica que el GPS esté activado.');
    } finally {
      setCargandoGPS(false);
    }
  };

  // Objeto unificado de "mi ubicación" (viene de GPS o de params)
  const miUbicacion = miUbicacionGPS ? {
    id: 'mi-ubicacion', nombre: 'Mi ubicación',
    latitud: miUbicacionGPS.latitude, longitud: miUbicacionGPS.longitude,
  } : null;

  // ── Toggle panel ─────────────────────────────────────────────────
  const togglePanel = () => {
    const toValue = panelAbierto ? 0 : 1;
    Animated.spring(panelAnim, { toValue, useNativeDriver: false, friction: 9, tension: 60 }).start();
    setPanelAbierto(!panelAbierto);
  };

  const panelMaxHeight = panelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 400],
  });
  const panelOpacity = panelAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.7, 1],
  });

  // ── Calcular ruta ────────────────────────────────────────────────
  const calcularRuta = async () => {
    if (!origen || !destino) { Alert.alert('Atención', 'Selecciona origen y destino'); return; }

    if (origen === 'mi-ubicacion' && !miUbicacionGPS) {
      Alert.alert('Sin ubicación', 'Pulsa el botón 📡 GPS para obtener tu posición primero.');
      return;
    }

    setCargando(true);
    setRuta(null);
    setRecomendaciones([]);

    try {
      const destino_id = Number(destino);

      // Construir el body según si el origen es GPS o un lugar de la BD
      const bodyRuta = origen === 'mi-ubicacion'
        ? { origen_coords: { lat: miUbicacionGPS.latitude, lon: miUbicacionGPS.longitude }, destino_id }
        : { origen_id: Number(origen), destino_id };

      // 1. Calcular ruta
      const resRuta = await API.post('/api/ruta', bodyRuta);
      const { ruta: lugaresRuta, ids_ruta, distancia_total, tiempo_estimado, puntos_ruta, origen_usado } = resRuta.data;

      const puntos = puntos_ruta?.length > 0
        ? puntos_ruta
        : lugaresRuta.map(l => ({ latitude: parseFloat(l.latitud), longitude: parseFloat(l.longitud) }));

      setRuta({ puntos, ids: ids_ruta, distancia: distancia_total, tiempo: tiempo_estimado });

      // Si vino de GPS, informar qué nodo usó el grafo como ancla
      if (origen === 'mi-ubicacion' && origen_usado) {
        Alert.alert(
          '📍 Ruta desde tu ubicación',
          `Calculada desde tu posición GPS hasta "${lugaresRuta[lugaresRuta.length - 1]?.nombre}".\nNodo de entrada al grafo: "${origen_usado.nombre}".`
        );
      }

      if (mapRef.current && puntos.length > 0) {
        mapRef.current.fitToCoordinates(puntos, {
          edgePadding: { top: 60, right: 40, bottom: 420, left: 40 },
          animated: true,
        });
      }

      // 2. Categoría del destino para recomendaciones
      const lugarDestino = lugares.find(l => l.id === destino_id);
      const categoria = lugarDestino?.categoria || null;
      setCatDestino(categoria);

      // 3. Recomendaciones de la misma categoría, cercanas a la ruta
      const resRec = await API.post('/api/ruta/recomendaciones', {
        ruta_ids: ids_ruta,
        radio: 500,
        categoria_destino: categoria,
      });
      setRecomendaciones(resRec.data.recomendaciones || []);

      // 4. Registrar prueba
      API.post('/api/registro-prueba', {
        origen_id: origen === 'mi-ubicacion' ? null : Number(origen),
        destino_id,
        distancia: distancia_total,
        tiempo: tiempo_estimado,
        recomendaciones: resRec.data.recomendaciones?.length || 0,
      }).catch(() => {});

      if (!panelAbierto) togglePanel();

    } catch (error) {
      console.log('Error ruta:', error.response?.data || error.message);
      Alert.alert('Error', error.response?.data?.error || 'No se pudo calcular la ruta');
    } finally {
      setCargando(false);
    }
  };

  const colorPin = (lugar) => {
    if (ruta?.ids?.includes(lugar.id)) return '#2563eb';
    return COLOR[lugar.categoria] || '#94a3b8';
  };

  return (
    <View style={styles.container}>

      {/* ── MAPA ── */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        initialRegion={{ latitude: 9.2400, longitude: -74.4260, latitudeDelta: 0.014, longitudeDelta: 0.014 }}
      >
        {miUbicacion && (
          <Marker coordinate={{ latitude: miUbicacion.latitud, longitude: miUbicacion.longitud }}
            title="Mi ubicación" pinColor="green" />
        )}

        {/* Aristas del grafo (red de conexiones) */}
        {aristas.map((ar, i) => {
          const o = lugares.find(l => l.id === ar.origen_id);
          const d = lugares.find(l => l.id === ar.destino_id);
          if (!o || !d) return null;
          return (
            <Polyline key={`a${i}`}
              coordinates={[
                { latitude: parseFloat(o.latitud), longitude: parseFloat(o.longitud) },
                { latitude: parseFloat(d.latitud), longitude: parseFloat(d.longitud) },
              ]}
              strokeColor="rgba(148,163,184,0.18)" strokeWidth={1} />
          );
        })}

        {/* Marcadores de todos los lugares */}
        {lugares.filter(l => l.latitud && l.longitud).map(lugar => (
          <Marker key={lugar.id}
            coordinate={{ latitude: parseFloat(lugar.latitud), longitude: parseFloat(lugar.longitud) }}
            title={`${EMOJI[lugar.categoria] || '📍'} ${lugar.nombre}`}
            description={`${lugar.categoria} · ⭐ ${lugar.calificacion}`}
            pinColor={colorPin(lugar)}
          />
        ))}

        {/* Polilínea de la ruta calculada */}
        {ruta?.puntos?.length > 0 && (
          <Polyline coordinates={ruta.puntos} strokeColor="#2563eb" strokeWidth={4} />
        )}

        {/* Marcadores de recomendaciones (misma categoría) */}
        {recomendaciones.filter(r => r.latitud && r.longitud).map(rec => (
          <Marker key={`rec-${rec.id}`}
            coordinate={{ latitude: parseFloat(rec.latitud), longitude: parseFloat(rec.longitud) }}
            title={`${EMOJI[rec.categoria] || '📍'} ${rec.nombre}`}
            description={`${rec.categoria} · ${rec.distancia_al_camino}m de la ruta · ⭐ ${rec.calificacion}`}
            pinColor="#f97316"
          />
        ))}
      </MapView>

      {/* ── BOTÓN FAB: abrir/cerrar panel ── */}
      <TouchableOpacity
        style={[styles.fab, panelAbierto && styles.fabOpen]}
        onPress={togglePanel}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>{panelAbierto ? '✕' : '🗺️'}</Text>
        {!panelAbierto && <Text style={styles.fabLabel}>Planificar</Text>}
      </TouchableOpacity>

      {/* ── LEYENDA ── */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#94a3b8' }]} />
          <Text style={styles.legendText}>Lugares</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#2563eb' }]} />
          <Text style={styles.legendText}>Ruta</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#f97316' }]} />
          <Text style={styles.legendText}>Similares</Text>
        </View>
      </View>

      {/* ── PANEL INFERIOR ANIMADO ── */}
      <View style={styles.bottomSheetWrapper}>
        {/* Pestaña siempre visible con las stats (cuando hay ruta) */}
        {ruta && (
          <TouchableOpacity style={styles.statsTab} onPress={togglePanel} activeOpacity={0.9}>
            <View style={styles.statsTabContent}>
              <Text style={styles.statsTabText}>📏 {ruta.distancia} m</Text>
              <Text style={styles.statsTabSep}>·</Text>
              <Text style={styles.statsTabText}>⏱ {ruta.tiempo} min</Text>
              {recomendaciones.length > 0 && (
                <>
                  <Text style={styles.statsTabSep}>·</Text>
                  <Text style={styles.statsTabReco}>
                    {EMOJI[catDestino] || '📍'} {recomendaciones.length} similares
                  </Text>
                </>
              )}
            </View>
            <Text style={styles.statsTabChevron}>{panelAbierto ? '▾' : '▴'}</Text>
          </TouchableOpacity>
        )}

        {/* Cuerpo del panel (animado) */}
        <Animated.View style={[styles.bottomSheet, { maxHeight: panelMaxHeight, opacity: panelOpacity }]}>
          <View style={styles.handle} />

          {/* Selectores origen / destino */}
          <View style={styles.selectorsRow}>
            <View style={styles.selectorBlock}>
              <View style={styles.selectorLabelRow}>
                <Text style={styles.selectorLabel}>📍 Origen</Text>
                <TouchableOpacity
                  style={styles.gpsBtn}
                  onPress={obtenerUbicacion}
                  disabled={cargandoGPS}
                >
                  {cargandoGPS
                    ? <ActivityIndicator size={11} color="#fff" />
                    : <Text style={styles.gpsBtnText}>📡 GPS</Text>}
                </TouchableOpacity>
              </View>
              <View style={styles.pickerWrap}>
                <Picker selectedValue={origen} onValueChange={setOrigen} style={styles.picker}>
                  <Picker.Item label="Seleccionar..." value={null} />
                  {miUbicacion
                    ? <Picker.Item label="📍 Mi ubicación (GPS)" value="mi-ubicacion" />
                    : <Picker.Item label="📡 Usar mi ubicación..." value="pedir-gps" enabled={false} />
                  }
                  {lugares.map(l => (
                    <Picker.Item key={l.id}
                      label={`${EMOJI[l.categoria] || ''} ${l.nombre}`} value={l.id} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.selectorBlock}>
              <Text style={styles.selectorLabel}>🏁 Destino</Text>
              <View style={styles.pickerWrap}>
                <Picker selectedValue={destino} onValueChange={setDestino} style={styles.picker}>
                  <Picker.Item label="Seleccionar..." value={null} />
                  {lugares.map(l => (
                    <Picker.Item key={`d${l.id}`}
                      label={`${EMOJI[l.categoria] || ''} ${l.nombre}`} value={l.id} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>

          {/* Botón calcular */}
          <TouchableOpacity style={styles.button} onPress={calcularRuta} disabled={cargando}>
            {cargando
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>Calcular ruta óptima</Text>}
          </TouchableOpacity>

          {/* Recomendaciones por categoría */}
          {ruta && (
            <>
              {recomendaciones.length > 0 ? (
                <>
                  <Text style={styles.recoTitle}>
                    {EMOJI[catDestino] || '📍'} Otros {LABEL_CATEGORIA[catDestino] || 'lugares'} cerca de tu ruta
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recoScroll}>
                    {recomendaciones.map(rec => (
                      <View key={rec.id}
                        style={[styles.recoCard, { borderColor: COLOR[rec.categoria] || '#e2e8f0' }]}>
                        <Text style={styles.recoEmoji}>{EMOJI[rec.categoria] || '📍'}</Text>
                        <Text style={styles.recoName} numberOfLines={2}>{rec.nombre}</Text>
                        <Text style={[styles.recoCat, { color: COLOR[rec.categoria] || '#64748b' }]}>
                          {rec.categoria}
                        </Text>
                        <Text style={styles.recoDist}>📍 A {rec.distancia_al_camino}m</Text>
                        <Text style={styles.recoStars}>⭐ {rec.calificacion}</Text>
                      </View>
                    ))}
                  </ScrollView>
                </>
              ) : (
                <Text style={styles.noReco}>
                  No hay {LABEL_CATEGORIA[catDestino] || 'lugares similares'} dentro de 500m de esta ruta
                </Text>
              )}
            </>
          )}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // ── FAB ──────────────────────────────
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 20,
    backgroundColor: '#2563eb',
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  fabOpen: { backgroundColor: '#dc2626' },
  fabText: { fontSize: 16, color: '#fff' },
  fabLabel: { fontSize: 13, fontWeight: '700', color: '#fff' },

  // ── Leyenda ──────────────────────────
  legend: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 16,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.93)',
    borderRadius: 10,
    padding: 10,
    gap: 6,
    elevation: 4,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 11, height: 11, borderRadius: 6 },
  legendText: { fontSize: 11, color: '#475569' },

  // ── Panel inferior ────────────────────
  bottomSheetWrapper: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
  },

  // Pestaña siempre visible con stats
  statsTab: {
    backgroundColor: '#eff6ff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#bfdbfe',
  },
  statsTabContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  statsTabText: { fontSize: 14, fontWeight: 'bold', color: '#1d4ed8' },
  statsTabSep: { fontSize: 14, color: '#93c5fd' },
  statsTabReco: { fontSize: 13, fontWeight: '600', color: '#f97316' },
  statsTabChevron: { fontSize: 18, color: '#2563eb', marginLeft: 8 },

  // Panel animado
  bottomSheet: {
    backgroundColor: '#fff',
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 28 : 14,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -3 },
  },
  handle: {
    width: 40, height: 4, backgroundColor: '#cbd5e1',
    borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 10,
  },

  selectorsRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  selectorBlock: { flex: 1 },
  selectorLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  selectorLabel: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  gpsBtn: {
    backgroundColor: '#2563eb', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
    flexDirection: 'row', alignItems: 'center', gap: 3,
  },
  gpsBtnText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  pickerWrap: { backgroundColor: '#f1f5f9', borderRadius: 10, overflow: 'hidden' },
  picker: { height: 44, color: '#0f172a' },

  button: {
    backgroundColor: '#2563eb', borderRadius: 12,
    paddingVertical: 13, alignItems: 'center', marginBottom: 10,
  },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },

  // Recomendaciones
  recoTitle: { fontSize: 13, fontWeight: '700', color: '#1e293b', marginBottom: 8 },
  recoScroll: { marginBottom: 4 },
  noReco: { color: '#94a3b8', fontStyle: 'italic', fontSize: 12, marginBottom: 6 },
  recoCard: {
    backgroundColor: '#fafafa', borderRadius: 12,
    padding: 10, marginRight: 8, width: 138, borderWidth: 1.5,
  },
  recoEmoji: { fontSize: 20, marginBottom: 3 },
  recoName: { fontWeight: 'bold', fontSize: 12, color: '#1e293b', marginBottom: 2 },
  recoCat: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  recoDist: { fontSize: 10, color: '#64748b', marginTop: 4 },
  recoStars: { fontSize: 10, color: '#b45309', marginTop: 2 },
});