// App.tsx
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity, SafeAreaView } from "react-native";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator, CardStyleInterpolators } from "@react-navigation/stack";
import MapScreen from "./MapScreen";
import mobileAds, { BannerAd, BannerAdSize, TestIds } from "react-native-google-mobile-ads";

const Stack = createStackNavigator();

function HomeScreen({ navigation }: any) {
  const [adsInitialized, setAdsInitialized] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // Inicializa o SDK do Google Mobile Ads
    mobileAds()
      .initialize()
      .then(adapterStatuses => {
        console.log("SDK do Google Mobile Ads inicializado com sucesso!", adapterStatuses);
        setAdsInitialized(true);
        setShowBanner(true);
      })
      .catch(error => console.error("Falha ao inicializar o SDK de anúncios:", error));
  }, []);

  const handleAdFailed = (error: any) => {
    console.log("Falha ao carregar banner:", error);
    if (retryCount < 3) {
      setRetryCount(retryCount + 1);
      setTimeout(() => setShowBanner(true), 2000); // tenta novamente após 2s
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ flex: 1 }}>
        {/* Conteúdo central */}
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

        {/* Banner fixo no final da tela */}
        {adsInitialized && showBanner ? (
          <BannerAd
            unitId={TestIds.BANNER} // ID de teste
            size={BannerAdSize.LARGE_BANNER}
            requestOptions={{ requestNonPersonalizedAdsOnly: true }}
            onAdLoaded={() => console.log("Banner carregado com sucesso!")}
            onAdFailedToLoad={handleAdFailed}
          />
        ) : (
          // Placeholder quando o banner não carrega
          <View style={styles.placeholderBanner}>
            <Text style={{ color: "#008cffff" }}>CARREGANDO ANúNCIO</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

export default function App() {
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
    backgroundColor: "#008cffff",
  },
  contentContainer: {
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
  button: {
    backgroundColor: "#00ffddff",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginTop: 20,
  },
  buttonText: {
    color: "#000000ff",
    fontSize: 18,
    fontWeight: "bold",
  },
  placeholderBanner: {
    width: 320,
    height: 50,
    backgroundColor: "#ccc",
    marginBottom: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
