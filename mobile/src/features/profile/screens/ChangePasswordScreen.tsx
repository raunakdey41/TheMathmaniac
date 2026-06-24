import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../../navigation/types';
import { useAuthStore } from '../../../core/store/auth';

type ChangePasswordNavigationProp = StackNavigationProp<RootStackParamList, 'ChangePassword'>;

export const ChangePasswordScreen: React.FC = () => {
  const navigation = useNavigation<ChangePasswordNavigationProp>();
  const { changePassword } = useAuthStore();
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Invalid Password', 'New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    const success = await changePassword(newPassword);
    setIsSubmitting(false);

    if (success) {
      Alert.alert('Success', 'Your password has been changed successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } else {
      Alert.alert('Error', useAuthStore.getState().error || 'Failed to change password. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-[#FAFBF8] px-6 pt-16"
    >
      <View className="mb-8">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mb-6 w-10 h-10 rounded-full bg-slate-100 items-center justify-center">
          <Text className="text-xl font-bold text-slate-600">←</Text>
        </TouchableOpacity>
        
        <Text className="text-3xl font-black text-slate-900 mb-2">Change Password</Text>
        <Text className="text-slate-500 font-medium">Create a new, secure password for your account.</Text>
      </View>

      <View className="mb-4">
        <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">New Password</Text>
        <TextInput
          className="bg-white border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 text-sm font-semibold shadow-sm shadow-slate-100"
          placeholder="Enter new password"
          placeholderTextColor="#9CA3AF"
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
        />
      </View>

      <View className="mb-8">
        <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Confirm Password</Text>
        <TextInput
          className="bg-white border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 text-sm font-semibold shadow-sm shadow-slate-100"
          placeholder="Re-enter new password"
          placeholderTextColor="#9CA3AF"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
      </View>

      <TouchableOpacity
        onPress={handleSubmit}
        disabled={isSubmitting}
        className={`bg-[#2D8C82] py-4 rounded-2xl items-center shadow-lg shadow-teal-500/20 ${isSubmitting ? 'opacity-70' : ''}`}
      >
        {isSubmitting ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-white text-sm font-bold tracking-wide">Update Password</Text>
        )}
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
};
