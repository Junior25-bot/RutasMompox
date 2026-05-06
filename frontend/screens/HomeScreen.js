import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from "react-native";
import MapView from "react-native-maps";

export default function HomeScreen({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [showHome, setShowHome] = useState(false);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1500,
      useNativeDriver: true,
    }).start(() => {
      setTimeout(() => setShowHome(true), 800);
    });
  }, []);

  // 🌟 SPLASH SCREEN
  if (!showHome) {
    return (
      <View style={styles.splash}>
        <Animated.Text style={[styles.logo, { opacity: fadeAnim }]}>
          RUTAS MOMPOX
        </Animated.Text>
        <Text style={styles.subtitle}>Explora Mompox</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>¡Bienvenido a Rutas Mompox!</Text>

      {/* BOTONES */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate("Rutas")}
      >
        <Text style={styles.buttonText}>📍 Ver lugares</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>🗺️ Crear ruta</Text>
      </TouchableOpacity>

      {/* MAPA */}
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: 9.242,
            longitude: -74.425,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#252424",
  },

  logo: {
    fontSize: 42,
    fontWeight: "bold",
    color: "#fff",
    letterSpacing: 5,
  },

  subtitle: {
    color: "#ccc",
    marginTop: 10,
    fontSize: 14,
  },

  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 15,
  },

  header: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#2c3e50",
  },

  button: {
    backgroundColor: "#2e86de",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },

  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
  },

  mapContainer: {
    flex: 1,
    marginTop: 10,
    borderRadius: 15,
    overflow: "hidden",
  },

  map: {
    flex: 1,
  },
});