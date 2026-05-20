import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import API from "../services/api";

export default function RutasScreen({ navigation }) {
  const [lugares, setLugares] = useState([]);

  useEffect(() => {
    API.get("/api/lugares")
      .then((res) => setLugares(res.data))
      .catch((err) => console.log(err));
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Lugares de interés</Text>
      <Text style={styles.subtitle}>Explora los sitios más emblemáticos de Mompox</Text>
      {lugares.map((lugar) => (
        <TouchableOpacity
          key={lugar.id}
          style={styles.card}
          onPress={() => navigation.navigate("LugarDetalle", { lugar })}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardCategory}>{lugar.categoria}</Text>
            <Text style={styles.cardStars}>⭐ {lugar.calificacion}</Text>
          </View>
          <Text style={styles.cardTitle}>{lugar.nombre}</Text>
          <Text style={styles.cardDesc} numberOfLines={2}>{lugar.descripcion}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f8fafc",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 24,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  cardCategory: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2563eb",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  cardStars: {
    fontSize: 12,
    color: "#b45309",
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 8,
  },
  cardDesc: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 20,
  },
});