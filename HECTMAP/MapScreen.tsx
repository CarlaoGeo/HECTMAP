import React, { useEffect, useState, useRef } from "react";
import { View, Alert } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import * as Location from 'expo-location';
import { LocationObjectCoords } from 'expo-location';
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Asset } from "expo-asset";

export default function MapScreen() {
  const [htmlContent, setHtmlContent] = useState("");
  const [location, setLocation] = useState<LocationObjectCoords | null>(null);
  const webViewRef = useRef<WebView | null>(null);

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

  return (
    <View style={{ flex: 1 }}>
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
    </View>
  );
}
