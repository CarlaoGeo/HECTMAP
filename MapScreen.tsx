import React, { useEffect, useState } from "react";
import { View, Alert } from "react-native";
import { WebView } from "react-native-webview";
import * as Location from 'expo-location';
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

export default function MapScreen() {
  const [location, setLocation] = useState<{latitude:number,longitude:number}|null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Highest, distanceInterval: 1 },
          (loc) => {
            setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
          }
        );
      } else {
        alert('Permissão de localização negada!');
      }
    })();
  }, []);

  const injectedJS = location ? `
    if(!window.gpsMarker){
      window.gpsMarker = L.marker([${location.latitude},${location.longitude}]).addTo(map).bindPopup("Você está aqui").openPopup();
    } else {
      window.gpsMarker.setLatLng([${location.latitude},${location.longitude}]);
    }
    map.setView([${location.latitude},${location.longitude}], 18);
    true;
  ` : '';

  const handleMessage = async (event: any) => {
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
          { text: "salvar no dispositivo",
            onPress: async () => {
              const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
              if (!permissions.granted) {
                Alert.alert("Permissão negada", "Você precisa conceder permissão para salvar o arquivo.");
                return;
              }
              else {
                const MimeType = filename.includes('.kml') ? 'application/vnd.google-earth.kml+xml' : 'text/plain';
                await FileSystem.StorageAccessFramework.createFileAsync(permissions.directoryUri, filename,MimeType)
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
        source={require('./assets/mapa.html')}
        javaScriptEnabled
        domStorageEnabled
        geolocationEnabled={true}
        injectedJavaScript={injectedJS}
        onMessage={handleMessage}
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        style={{ flex: 1 }}
      />
    </View>
  );
}