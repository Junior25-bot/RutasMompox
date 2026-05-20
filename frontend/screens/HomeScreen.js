import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Image,
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

  if (!showHome) {
    return (
      <View style={styles.splash}>
        <Animated.Text style={[styles.logo, { opacity: fadeAnim }]}>
          RUTAS MOMPOX
        </Animated.Text>
        <Text style={styles.subtitle}>Explora la ciudad colonial</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>¡Bienvenido!</Text>
        <Text style={styles.subHeader}>
          Encuentra la mejor ruta para tus recorridos en Mompox
        </Text>
      </View>

      <View style={styles.cardsContainer}>
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate("Rutas")}
        >
          <View style={styles.cardIcon}>
            <Text style={styles.cardIconText}>📍</Text>
          </View>
          <Text style={styles.cardTitle}>Ver lugares</Text>
          <Text style={styles.cardDescription}>
            Explora sitios de interés, restaurantes y más
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate("MapaRuta")}
        >
          <View style={styles.cardIcon}>
            <Text style={styles.cardIconText}>🗺️</Text>
          </View>
          <Text style={styles.cardTitle}>Crear ruta</Text>
          <Text style={styles.cardDescription}>
            Calcula el camino más corto y recibe recomendaciones
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Sistema Inteligente de Recomendación de Rutas y Lugares
        </Text>
        <Text style={styles.footerSmall}>Universidad de Cartagena - Mompox</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1a2a3a",
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
    backgroundColor: "#f0f4f8",
    justifyContent: "space-between",
  },
  headerContainer: {
    marginTop: 60,
    marginHorizontal: 20,
    marginBottom: 30,
  },
  header: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1e293b",
  },
  subHeader: {
    fontSize: 16,
    color: "#475569",
    marginTop: 8,
  },
  cardsContainer: {
    marginHorizontal: 20,
    flex: 1,
    justifyContent: "center",
    gap: 20,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 24,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    alignItems: "center",
  },
  cardIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#e0f2fe",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  cardIconText: {
    fontSize: 28,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 20,
  },
  footer: {
    alignItems: "center",
    padding: 20,
  },
  footerText: {
    fontSize: 12,
    color: "#94a3b8",
  },
  footerSmall: {
    fontSize: 10,
    color: "#cbd5e1",
    marginTop: 4,
  },
});