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

  useEffect(() => {
    const setupMap = async () => {
      try {
        const asset = Asset.fromModule(require("./assets/mapa.html"));
        await asset.downloadAsync();
        const fileUri = asset.localUri || asset.uri;
        const html = await FileSystem.readAsStringAsync(fileUri);
        setHtmlContent(html);
      } catch (error) {
        console.error("Erro ao carregar HTML:", error);
        Alert.alert("Erro", "Não foi possível carregar o mapa.");
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permissão de localização negada!");
        return;
      }
      console.log("Permissão de localização concedida.");

      try {
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
    setupMap();
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

  // Use WebViewMessageEvent to type the event parameter
  const handleMessage = async (event: WebViewMessageEvent) => {
    try {
      const { content, filename } = JSON.parse(event.nativeEvent.data);
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