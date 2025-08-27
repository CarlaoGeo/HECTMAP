// App.tsx
import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator, CardStyleInterpolators } from "@react-navigation/stack";
import MapScreen from "./MapScreen"; // Importa o MapScreen

const Stack = createStackNavigator();

// Tela inicial
function HomeScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <Image
        source={require("./assets/logo.png")}
        
        style={styles.logo}
        resizeMode="contain"
      />
      

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate("Map")}
      >
        <Text style={styles.buttonText}>Abrir Mapa</Text>
      </TouchableOpacity>

      <StatusBar style="auto" />
    </View>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          gestureEnabled: true,
          
          cardStyleInterpolator: CardStyleInterpolators.forFadeFromCenter, // fade
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Map" component={MapScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#00ffaaff",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    color: "#000000ff",
    fontWeight: "bold",
    marginBottom: 40,
  },
  button: {
    backgroundColor: "#d9ff00ff",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
  },
  buttonText: {
    color: "#eeeeeeff",
    fontSize: 18,
    fontWeight: "bold",
  },
});


