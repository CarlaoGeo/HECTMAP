import React, { useEffect, useState } from 'react';
import { View, Button, StyleSheet, Alert, BackHandler, Text, ActivityIndicator } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

// ⚠️ Android Client ID da credencial tipo Android do Google Cloud
const ANDROID_CLIENT_ID = '176106761880-mm517m1d9lsvn30p41ab0t6hrmu2uhvd.apps.googleusercontent.com';
const AUTHORIZED_EMAILS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTSDztdOjHGBwv0XTatZbG8CzEXjQ-hydOQkwtuqoCiRZwQlpsj8mV7FLaRwA9KBOfAKp4zcNrilhkY/pub?output=csv';

export default function LoginScreen({ navigation }: { navigation: any }) {
  const [isLoading, setIsLoading] = useState(false);

  // Scheme definido no app.json
  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'com.carlaogeo.hectmap' });

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: ANDROID_CLIENT_ID,
    redirectUri,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      if (authentication?.accessToken) {
        getUserInfo(authentication.accessToken);
      }
    } else if (response?.type === 'error' || response?.type === 'cancel') {
      setIsLoading(false);
      console.log("Resposta do login:", response);
      Alert.alert("Login cancelado", "O processo de login foi cancelado ou falhou.");
    }
  }, [response]);

  const getUserInfo = async (token: string) => {
    setIsLoading(true);
    try {
      const userInfoResponse = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const user = await userInfoResponse.json();
      checkAuthorization(user.email);
    } catch (error) {
      console.error("Erro ao buscar informações do usuário:", error);
      Alert.alert("Erro", "Não foi possível obter os dados do usuário.");
      setIsLoading(false);
    }
  };

  const checkAuthorization = async (email: string) => {
    try {
      const response = await fetch(AUTHORIZED_EMAILS_URL);
      const csvText = await response.text();
      const emails = csvText.split('\n').map(e => e.trim().toLowerCase());

      if (emails.includes(email.toLowerCase())) {
        console.log("Acesso autorizado.");
        navigation.replace('MapScreen'); 
      } else {
        console.log("Acesso negado.");
        Alert.alert(
          'Acesso Negado',
          'Você não tem permissão para usar este aplicativo.',
          [{ text: 'Fechar App', onPress: () => BackHandler.exitApp() }],
          { cancelable: false }
        );
      }
    } catch (error) {
      console.error("Erro ao verificar e-mails autorizados:", error);
      Alert.alert("Erro", "Não foi possível verificar a autorização. Verifique sua conexão e a URL da planilha.");
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {isLoading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <>
          <Text style={styles.title}>HECTMAP</Text>
          <Button
            disabled={!request}
            title="Entrar com o Google"
            onPress={() => promptAsync()}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 20 },
});
