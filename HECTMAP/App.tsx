import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';

// Importa as telas que farão parte da navegação
import LoginScreen from './LoginScreen';
import MapScreen from './MapScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      {/* O Stack.Navigator é o container que gerencia as telas.
        initialRouteName="Login" define que a primeira tela a ser exibida é a LoginScreen.
      */}
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerShown: false, // Esconde o cabeçalho em todas as telas
        }}
      >
        {/* Define a rota "Login" que renderiza o componente LoginScreen */}
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
        />
        
        {/* Define a rota "MapScreen" que renderiza o componente MapScreen */}
        <Stack.Screen 
          name="MapScreen" 
          component={MapScreen} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

