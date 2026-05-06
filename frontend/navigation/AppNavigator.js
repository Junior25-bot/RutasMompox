import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import HomeScreen from "../screens/HomeScreen";
import RutasScreen from "../screens/RutasScreen";
import MapaRutaScreen from "../screens/MapaRutaScreen";   // ← nueva importación

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="Inicio"
          component={HomeScreen}
          options={{ title: "Rutas Mompox" }}   // opcional, para que el header muestre el nombre
        />

        <Stack.Screen
          name="Rutas"
          component={RutasScreen}
          options={{ title: "Lugares" }}
        />

        {/* Nueva pantalla de creación de rutas */}
        <Stack.Screen
          name="MapaRuta"
          component={MapaRutaScreen}
          options={{ title: "Crear Ruta" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}