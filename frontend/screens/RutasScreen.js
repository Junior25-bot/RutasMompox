import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import API from "../services/api";

export default function RutasScreen({ navigation }) {
  const [lugares, setLugares] = useState([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("Todos");

  useEffect(() => {
    API.get("/api/lugares")
      .then((res) => setLugares(res.data))
      .catch((err) => console.log(err));
  }, []);

  const categorias = ["Todos", "histórico", "religioso", "restaurante", "hospedaje", "plaza", "cultural", "naturaleza", "puente", "comercio"];

  const lugaresFiltrados = categoriaSeleccionada === "Todos"
    ? lugares
    : lugares.filter(lugar => {
        if (!lugar.categoria) return false;
        

        const categoriaBD = lugar.categoria.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        const seleccionadaNormalizada = categoriaSeleccionada.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        
        return categoriaBD === seleccionadaNormalizada;
      });

  return (
    <View style={styles.mainContainer}>
      {/* Barra horizontal deslizable con botones estéticos */}
      <View style={styles.filterWrapper}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.filterScroll}
        >
          {categorias.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.filterButton,
                categoriaSeleccionada === cat && styles.filterButtonActive
              ]}
              onPress={() => setCategoriaSeleccionada(cat)}
            >
              <Text style={[
                styles.filterButtonText,
                categoriaSeleccionada === cat && styles.filterButtonTextActive
              ]}>
                {cat === "Todos" ? "🌍 Todos" : 
                 cat === "histórico" ? "📸 Histórico" : 
                 cat === "religioso" ? "⛪ Religioso" : 
                 cat === "restaurante" ? "🍔 Gastronomía" : 
                 cat === "hospedaje" ? "🏨 Hospedaje" : 
                 cat === "plaza" ? " Fountain Plazas" :
                 cat === "cultural" ? "🎨 Cultural" :
                 cat === "naturaleza" ? "🌿 Naturaleza" :
                 cat === "puente" ? "🌉 Puentes" : "🛒 Comercio"}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Tu lista de tarjetas leyendo los datos de 'lugaresFiltrados' */}
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Lugares de interés</Text>
        <Text style={styles.subtitle}>Explora los sitios más emblemáticos de Mompox</Text>
        
        {lugaresFiltrados.length === 0 ? (
          <Text style={styles.noResults}>No hay lugares registrados en esta categoría</Text>
        ) : (
          lugaresFiltrados.map((lugar) => (
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
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  filterWrapper: {
    backgroundColor: "#ffffff",
    paddingVertical: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 10,
  },
  filterButton: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  filterButtonActive: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
  },
  filterButtonTextActive: {
    color: "#ffffff",
  },
  noResults: {
    textAlign: "center",
    color: "#94a3b8",
    marginTop: 40,
    fontSize: 16,
    fontStyle: "italic",
  },
  container: {
    flex: 1,
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