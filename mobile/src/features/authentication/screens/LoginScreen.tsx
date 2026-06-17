import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../../navigation/types';
import { useAuthStore } from '../../../core/store/auth';
import { Button } from '../../../shared/components/Button';

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');

  const { login, isLoading, error } = useAuthStore();

  const handleLoginSubmit = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      Alert.alert('Invalid Input', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!password || password.length < 4) {
      Alert.alert('Invalid Input', 'Please enter your password.');
      return;
    }

    // Prefix country code if not present
    const formattedPhone = phoneNumber.startsWith('+91') ? phoneNumber : `+91${phoneNumber}`;
    const success = await login(formattedPhone, password);
    if (success) {
      navigation.replace('AppTabs', { screen: 'Home' });
    }
  };

  return (
    <ScrollView className="flex-1 bg-slate-950 px-6 pt-16">
      <View className="mb-12">
        <Text className="text-slate-100 text-3xl font-black">Welcome to Mathemaniac</Text>
        <Text className="text-slate-400 text-sm mt-2 font-medium">
          Sign in to your account to continue
        </Text>
      </View>

      {error && (
        <View className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl mb-6">
          <Text className="text-red-400 text-xs font-semibold">{error}</Text>
        </View>
      )}

      {/* Inputs */}
      <View className="mb-8">
        <Text className="text-slate-300 text-xs font-bold uppercase tracking-wider mb-3">
          Mobile Number
        </Text>
        <View className="flex-row items-center bg-slate-800 border border-slate-700/50 rounded-2xl px-4 py-4 mb-6">
          <Text className="text-slate-300 font-semibold mr-2">+91</Text>
          <TextInput
            className="flex-1 text-slate-100 text-base font-semibold"
            placeholder="9831754957"
            placeholderTextColor="#8A8070"
            keyboardType="number-pad"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            maxLength={10}
          />
        </View>

        <Text className="text-slate-300 text-xs font-bold uppercase tracking-wider mb-3">
          Password
        </Text>
        <TextInput
          className="bg-slate-800 border border-slate-700/50 rounded-2xl px-4 py-4 text-slate-100 text-base font-semibold mb-3"
          placeholder="••••••••"
          placeholderTextColor="#8A8070"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity 
          onPress={() => navigation.navigate('ForgotPassword')}
          className="align-self-end items-end mb-8"
        >
          <Text className="text-blue-400 text-sm font-semibold">Forgot Password?</Text>
        </TouchableOpacity>

        <Button
          title="Sign In"
          onPress={handleLoginSubmit}
          loading={isLoading}
          className="mb-8"
        />

        {/* Highlighted registration link */}
        <View className="flex-row justify-center items-center py-4">
          <Text className="text-slate-400 text-sm">New user? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
            <Text className="text-blue-400 text-sm font-black underline">Register here</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};
