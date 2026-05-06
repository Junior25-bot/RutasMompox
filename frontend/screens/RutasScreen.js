import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import API from "../services/api";

export default function RutasScreen() {
  const [lugares, setLugares] = useState([]);

  useEffect(() => {
    API.get("/lugares")
      .then((res) => setLugares(res.data))
      .catch((err) => console.log(err));
  }, []);

  return (
    <ScrollView style={styles.container}>
      {lugares.map((lugar) => (
        <View key={lugar.id} style={styles.card}>
          <Text style={styles.title}>{lugar.nombre}</Text>
          <Text>{lugar.descripcion}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 10,
  },
  card: {
    backgroundColor: "#eee",
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
  },
  title: {
    fontWeight: "bold",
    fontSize: 18,
  },
});