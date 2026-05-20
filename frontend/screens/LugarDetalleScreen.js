import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import API from '../services/api';

export default function LugarDetalleScreen({ route, navigation }) {
  const { lugar } = route.params;
  const [userLocation, setUserLocation] = useState(null);
  const [cargandoUbicacion, setCargandoUbicacion] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'No se pudo obtener tu ubicación');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setUserLocation(loc.coords);
    })();
  }, []);

  const handleComoLlegar = () => {
    if (!userLocation) {
      Alert.alert('Ubicación no disponible', 'Espera a que se obtenga tu ubicación o inténtalo de nuevo.');
      return;
    }
    // Navegar a MapaRutaScreen pasando el destino y la ubicación actual
    navigation.navigate('MapaRuta', {
      destinoInicial: lugar,
      origenCoords: {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
      },
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.categoria}>{lugar.categoria}</Text>
        <Text style={styles.calificacion}>⭐ {lugar.calificacion}</Text>
      </View>
      <Text style={styles.nombre}>{lugar.nombre}</Text>
      <Text style={styles.descripcion}>{lugar.descripcion}</Text>

      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>Ubicación</Text>
        <Text style={styles.infoText}>Lat: {lugar.latitud}</Text>
        <Text style={styles.infoText}>Lng: {lugar.longitud}</Text>
      </View>

      <TouchableOpacity
        style={styles.botonRuta}
        onPress={handleComoLlegar}
        disabled={cargandoUbicacion}
      >
        {cargandoUbicacion ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.botonRutaText}>📍 Cómo llegar desde mi ubicación</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoria: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  calificacion: {
    fontSize: 14,
    color: '#b45309',
  },
  nombre: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 16,
  },
  descripcion: {
    fontSize: 16,
    color: '#334155',
    lineHeight: 24,
    marginBottom: 24,
  },
  infoContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    elevation: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 4,
  },
  botonRuta: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  botonRutaText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});