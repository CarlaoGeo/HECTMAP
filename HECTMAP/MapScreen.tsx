import React, { useEffect, useState, useRef } from "react";
import { View, Alert } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import * as Location from 'expo-location';
import { LocationObjectCoords } from 'expo-location';
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Asset } from "expo-asset";
import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';

// 2. Use o ID de teste durante o desenvolvimento
const adUnitIdInterstitial = __DEV__ ? TestIds.INTERSTITIAL : 'ca-app-pub-2863705568861851/3272044799';

// 3. Cria uma instância do anúncio fora do componente
const interstitial = InterstitialAd.createForAdRequest(adUnitIdInterstitial, {
  requestNonPersonalizedAdsOnly: true,
});

const FIVE_MINUTES_IN_MS = 5 * 60 * 1000;
export default function MapScreen() {
  const [htmlContent, setHtmlContent] = useState("");
  const [location, setLocation] = useState<LocationObjectCoords | null>(null);
  const webViewRef = useRef<WebView | null>(null);
  const [adLoaded, setAdLoaded] = useState(false);
  const [lastAdShownTimestamp, setLastAdShownTimestamp] = useState<number | null>(null);

  // Função para buscar e injetar a localização no estado
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

  // Efeito 1: Carrega o HTML e, em seguida, obtém a localização na montagem do componente.
  // Isso faz com que o pin apareça na primeira vez que a tela é aberta.
  useEffect(() => {
    const setupMapAndLocation = async () => {
      try {
        const asset = Asset.fromModule(require("./assets/mapa.html"));
        await asset.downloadAsync();
        const fileUri = asset.localUri || asset.uri;
        const html = await FileSystem.readAsStringAsync(fileUri);
        setHtmlContent(html);
        
        // Chama a função para obter a localização imediatamente após o HTML ser carregado
        await fetchAndInjectLocation();

      } catch (error) {
        console.error("Erro ao carregar HTML:", error);
        Alert.alert("Erro", "Não foi possível carregar o mapa.");
      }
    };
    setupMapAndLocation();
  }, []);

  // Efeito 2: Monitora a localização e injeta o JavaScript quando ela é atualizada.
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

  
  

  // Efeito para carregar o anúncio e escutar eventos
  useEffect(() => {
    const unsubscribeLoaded = interstitial.addAdEventListener(AdEventType.LOADED, () => {
      console.log('Anúncio intersticial carregado.');
      setAdLoaded(true);
    });

    const unsubscribeClosed = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      console.log('Anúncio intersticial fechado.');
      setAdLoaded(false);
      // Carrega o próximo anúncio para a próxima oportunidade
      interstitial.load();
    });

    // Inicia o carregamento do primeiro anúncio
    interstitial.load();

    // Limpa os listeners quando o componente é desmontado
    return () => {
      unsubscribeLoaded();
      unsubscribeClosed();
    };
  }, []);

  const tryShowInterstitialAd = () => {
    const now = Date.now();
    // Verifica se a hora atual é maior que o timestamp do último anúncio + 5 minutos
    const canShowAd = !lastAdShownTimestamp || (now > lastAdShownTimestamp + FIVE_MINUTES_IN_MS);

    if (adLoaded && canShowAd) {
      console.log('Exibindo anúncio...');
      interstitial.show();
      setLastAdShownTimestamp(now); // Atualiza o timestamp
    } else {
      console.log('Não é hora de mostrar o anúncio ou não está carregado.');
      console.log(`Anúncio carregado: ${adLoaded}`);
      console.log(`Pode mostrar (tempo): ${canShowAd}`);
    }
  };

  // Função que recebe as mensagens do WebView
  const handleMessage = async (event: WebViewMessageEvent) => {
    const message = event.nativeEvent.data;
    if (message === 'ATTEMPT_SHOW_AD') {
      tryShowInterstitialAd();
      return;
    };

    if (message === 'GET_LOCATION') {
      await fetchAndInjectLocation(); // Re-utiliza a função para obter a localização
      return; 
    }

    try {
      const { content, filename } = JSON.parse(message);
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
                await Sharing.shareAsync(fileUri);
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
                const MimeType = filename.includes('.kml') ? 'application/vnd.google-earth.kml+xml' : 'text/plain';
                await FileSystem.StorageAccessFramework.createFileAsync(permissions.directoryUri, filename, MimeType)
                  .then(async (newUri) => {
                    await FileSystem.writeAsStringAsync(newUri, content, { encoding: FileSystem.EncodingType.UTF8 });
                  });
                Alert.alert("Arquivo salvo", `Arquivo salvo em: ${fileUri}`);
              }
            }
          }
        ]
      );
    } catch (e) {
      Alert.alert("Erro", "Não foi possível salvar o arquivo.");
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <WebView
        ref={webViewRef}
        source={{ html: htmlContent }}
        javaScriptEnabled
        domStorageEnabled
        geolocationEnabled={true}
        onMessage={handleMessage}
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        style={{ flex: 1 }}
      />
    </View>
  );
}