import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import HomeScreen from "../screens/HomeScreen";
import RutasScreen from "../screens/RutasScreen";
import MapaRutaScreen from "../screens/MapaRutaScreen";
import LugarDetalleScreen from "../screens/LugarDetalleScreen";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="Inicio"
          component={HomeScreen}
          options={{ title: "Rutas Mompox" }}
        />
        <Stack.Screen
          name="Rutas"
          component={RutasScreen}
          options={{ title: "Lugares" }}
        />
        <Stack.Screen
          name="MapaRuta"
          component={MapaRutaScreen}
          options={{ title: "Crear Ruta" }}
        />
        <Stack.Screen
          name="LugarDetalle"
          component={LugarDetalleScreen}
          options={{ title: "Detalle del lugar" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}