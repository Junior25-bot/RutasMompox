import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import HomeScreen from "../screens/HomeScreen";
import RutasScreen from "../screens/RutasScreen";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="Inicio"
          component={HomeScreen}
        />

        <Stack.Screen
          name="Rutas"
          component={RutasScreen}
          options={{ title: "Lugares" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}