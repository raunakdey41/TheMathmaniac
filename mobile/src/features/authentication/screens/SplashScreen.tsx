import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../../../core/store/auth';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../../navigation/types';

type SplashScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Splash'>;

interface Props {
  navigation: SplashScreenNavigationProp;
}

export const SplashScreen: React.FC<Props> = ({ navigation }) => {
  const { initializeAuth, isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    const checkAuth = async () => {
      // Small timeout for premium branding feel
      await new Promise((r) => setTimeout(r, 1500));
      await initializeAuth();
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        navigation.replace('AppTabs', { screen: 'Home' });
      } else {
        navigation.replace('Onboarding');
      }
    }
  }, [isAuthenticated, isLoading]);

  return (
    <View className="flex-1 bg-slate-950 justify-center items-center px-6">
      <View className="items-center">
        <View className="w-20 h-20 bg-blue-600 rounded-3xl justify-center items-center shadow-lg shadow-blue-500/30">
          <Text className="text-white text-4xl font-black italic">M</Text>
        </View>
        <Text className="text-slate-100 text-3xl font-bold mt-6 tracking-wide">
          Mathemaniac
        </Text>
        <Text className="text-blue-400 text-sm mt-2 font-medium uppercase tracking-widest">
          Synapse EduTech
        </Text>
      </View>

      <ActivityIndicator size="small" color="#8A2222" className="absolute bottom-16" />
    </View>
  );
};
