// App.tsx
import React, { useEffect } from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity, SafeAreaView } from "react-native";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator, CardStyleInterpolators } from "@react-navigation/stack";
import MapScreen from "../HECTMAP/MapScreen";

// Importe os componentes de anúncios
import mobileAds, { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

// Use o ID de teste durante o desenvolvimento!
const adUnitIdBanner = __DEV__ ? TestIds.BANNER : 'ca-app-pub-2863705568861851/6038928496';

const Stack = createStackNavigator();

// Tela inicial
function HomeScreen({ navigation }: any) {
  return (
    // SafeAreaView garante que o conteúdo não fique sob a barra de status ou notch
    <SafeAreaView style={styles.container}>
      {/* Container para o Anúncio Banner no Topo */}
      <View style={styles.adContainer}>
        <BannerAd
          unitId={adUnitIdBanner}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          requestOptions={{
            requestNonPersonalizedAdsOnly: true, // Opcional: para conformidade com GDPR
          }}
        />
      </View>

      <View style={styles.contentContainer}>
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
    </SafeAreaView>
  );
}

export default function App() {
  // Inicializa o SDK do Google Mobile Ads assim que o app abre
  useEffect(() => {
    mobileAds()
      .initialize()
      .then(adapterStatuses => {
        console.log('SDK de anúncios inicializado!', adapterStatuses);
      });
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          gestureEnabled: true,
          cardStyleInterpolator: CardStyleInterpolators.forFadeFromCenter,
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
  },
  adContainer: {
    // Container para o anúncio, alinhado no topo
    alignItems: 'center',
    width: '100%',
    paddingTop: 10, // Um respiro no topo
  },
  contentContainer: {
    // O conteúdo original da sua tela
    flex: 1,
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
    backgroundColor: "#00f7ffff",
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