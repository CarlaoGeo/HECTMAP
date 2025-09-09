import React, { useEffect, useState, useRef, useCallback } from "react";
import { View, Alert, BackHandler, StyleSheet, Pressable, Text } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import * as Location from 'expo-location';
import { LocationObjectCoords } from 'expo-location';
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Asset } from "expo-asset";
import mobileAds, { BannerAd, BannerAdSize, TestIds } from "react-native-google-mobile-ads";
import { useFocusEffect, useNavigation } from '@react-navigation/native';
//import * as NavigationBar from 'expo-navigation-bar';

export default function MapScreen() {
  const [htmlContent, setHtmlContent] = useState("");
  const [location, setLocation] = useState<LocationObjectCoords | null>(null);
  const webViewRef = useRef<WebView | null>(null);
  const [adsInitialized, setAdsInitialized] = useState(false);
  const [showBanner, setShowBanner] = useState(true); // Inicia como true para carregar o primeiro anúncio
  const [showCloseButton, setShowCloseButton] = useState(false);
  const navigation = useNavigation();
  const closeButtonTimerRef = useRef<NodeJS.Timeout | null>(null);



  // --- CÓDIGO PARA BLOQUEAR O GESTO E BOTÃO DE VOLTAR ---
  // Este hook é executado sempre que a tela entra em foco.
  useFocusEffect(
    useCallback(() => {
      //NavigationBar.setVisibilityAsync("hidden");
      //NavigationBar.setBehaviorAsync("inset-swipe");
      // Lógica para o botão de voltar do Android
      const onBackPress = () => {
        // Retornar 'true' impede que o evento de voltar padrão aconteça.
        return true;
      };
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      // Nova lógica para desativar o gesto de deslizar
      navigation.setOptions({ gestureEnabled: false });

      // A função retornada aqui é a de "limpeza", que será executada quando a tela perder o foco.
      return () => {
        subscription.remove();
        // Restaura o gesto para que funcione em outras telas
        navigation.setOptions({ gestureEnabled: true });
      };
    }, [navigation]) // Adiciona navigation como dependência
  );
  // --- FIM DO CÓDIGO ---


  const fetchAndInjectLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permissão de localização negada!");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      if (loc) {
        console.log("Localização obtida com sucesso:", loc.coords);
        setLocation(loc.coords);
      } else {
        console.log("Não foi possível obter a localização. Retornou nulo.");
      }
    } catch (error) {
      console.log("Erro ao obter a localização:", error);
      Alert.alert("Erro", "Não foi possível obter sua localização.");
    }
  };

  useEffect(() => {
    const setupMapAndLocation = async () => {
      try {
        const asset = Asset.fromModule(require("./assets/mapa.html"));
        await asset.downloadAsync();
        const fileUri = asset.localUri || asset.uri;
        const html = await FileSystem.readAsStringAsync(fileUri);
        setHtmlContent(html);
        
        await fetchAndInjectLocation();

      } catch (error) {
        console.error("Erro ao carregar HTML:", error);
        Alert.alert("Erro", "Não foi possível carregar o mapa.");
      }
    };
    setupMapAndLocation();
  }, []);

  useEffect(() => {
    if (location && webViewRef.current) {
      const jsCode = `
        var locationData = { latitude: ${location.latitude}, longitude: ${location.longitude} };
        
        function updateGpsMarker() {
            if (typeof map !== 'undefined' && typeof L !== 'undefined') {
                if(!window.gpsMarker){
                    window.gpsMarker = L.marker([locationData.latitude, locationData.longitude])
                                     .addTo(map)
                                     .bindPopup("Você está aqui").openPopup();
                } else {
                    window.gpsMarker.setLatLng([locationData.latitude, locationData.longitude]);
                }
                map.setView([locationData.latitude, locationData.longitude], 18);
            }
        }
        
        updateGpsMarker();
        
        if (typeof map === 'undefined') {
            var checkMapReady = setInterval(function() {
                if (typeof map !== 'undefined') {
                    updateGpsMarker();
                    clearInterval(checkMapReady);
                }
            }, 500);
        }

        true;
      `;
      webViewRef.current.injectJavaScript(jsCode);
    }
  }, [location]);

  const handleMessage = async (event: WebViewMessageEvent) => {
    const message = event.nativeEvent.data;
   
    if (message === 'GET_LOCATION') {
      await fetchAndInjectLocation();
      return; 
    }

    try {
      const { content, filename, contentType } = JSON.parse(message);
      const fileUri = FileSystem.documentDirectory + filename;
      await FileSystem.writeAsStringAsync(fileUri, content, { encoding: FileSystem.EncodingType.UTF8 });
      
      Alert.alert(
        "Sucesso",
        `Arquivo salvo como: ${filename}`,
        [
          {
            text: "Compartilhar",
            onPress: async () => {
              if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(fileUri, { mimeType: contentType || 'application/octet-stream' });
              } else {
                Alert.alert("Compartilhamento não disponível neste dispositivo.");
              }
            }
          },
          { 
            text: "Salvar no dispositivo",
            onPress: async () => {
              const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
              if (!permissions.granted) {
                Alert.alert("Permissão negada", "Você precisa conceder permissão para salvar o arquivo.");
                return;
              } else {
                const MimeType = contentType || 'application/octet-stream';
                await FileSystem.StorageAccessFramework.createFileAsync(permissions.directoryUri, filename, MimeType)
                  .then(async (newUri) => {
                    await FileSystem.writeAsStringAsync(newUri, content, { encoding: FileSystem.EncodingType.UTF8 });
                    Alert.alert("Arquivo salvo", `O arquivo foi salvo com sucesso.`);
                  })
                  .catch(e => {
                      Alert.alert("Erro ao salvar", "Não foi possível salvar o arquivo no local escolhido.");
                  });
              }
            }
          },
          { text: "Fechar",
            onPress: () => { /* apenas fecha o alerta */
            }
          }
        ]
      );
    } catch (e) {
      console.error("Erro ao processar mensagem do WebView:", e);
      Alert.alert("Erro", "Não foi possível salvar o arquivo.");
    }
  };

//LÓGICA DOS ANÚNCIOS ---
  useEffect(() => {
      mobileAds()
        .initialize()
        .then(adapterStatuses => {
          console.log("SDK do Google Mobile Ads inicializado com sucesso!", adapterStatuses);
          setAdsInitialized(true);
        })
        .catch(error => console.error("Falha ao inicializar o SDK de anúncios:", error));

      const adInterval = setInterval(() => {
          console.log("3 minutos se passaram. Tentando reexibir o anúncio.");
          setShowCloseButton(false);
          setShowBanner(true); 
      }, 180000); // 5 minutos = 300 * 1000 ms

      return () => {
          clearInterval(adInterval);
          if (closeButtonTimerRef.current) {
              clearTimeout(closeButtonTimerRef.current);
          }
      };
  }, []);

  const handleAdLoaded = () => {
    console.log("Banner carregado com sucesso!");
    if (closeButtonTimerRef.current) {
        clearTimeout(closeButtonTimerRef.current);
    }
    closeButtonTimerRef.current = setTimeout(() => {
        setShowCloseButton(true);
    }, 5000); // 5 segundos
  };

  const handleAdFailed = (error: any) => {
    console.log("Falha ao carregar banner. Próxima tentativa em 3 minutos.", error);
    setShowBanner(false);
  };

  const handleCloseAd = () => {
      setShowBanner(false);
  };
  // --- FIM DA LÓGICA DOS ANÚNCIOS ---



  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: htmlContent, baseUrl: '' }}
        javaScriptEnabled
        domStorageEnabled
        geolocationEnabled={true}
        onMessage={handleMessage}
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        originWhitelist={['*']}
        style={{ flex: 1 }}
        />
        
      {adsInitialized && showBanner && (
        <View style={styles.adContainer}>
            <BannerAd
              unitId={TestIds.BANNER}
              size={BannerAdSize.LARGE_BANNER}
              requestOptions={{ requestNonPersonalizedAdsOnly: true }}
              onAdLoaded={handleAdLoaded}
              onAdFailedToLoad={handleAdFailed}
            />
            {showCloseButton && (
                <Pressable style={styles.closeButton} onPress={handleCloseAd}>
                    <Text style={styles.closeButtonText}>X</Text>
                </Pressable>
            )}
        </View>
       )}
    </View>
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    adContainer: {
        position: 'relative',
        alignItems: 'center',
    },
    closeButton: {
        position: 'absolute',
        top: 2,
        right: 2,
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 15,
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    closeButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    }
});

