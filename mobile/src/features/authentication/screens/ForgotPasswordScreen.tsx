import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../../navigation/types';
import { useAuthStore } from '../../../core/store/auth';
import { Button } from '../../../shared/components/Button';

type ForgotPasswordScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ForgotPassword'>;

interface Props {
  navigation: ForgotPasswordScreenNavigationProp;
}

export const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [timer, setTimer] = useState(30);

  const { sendForgotPasswordOtp, resetPassword, isLoading, error } = useAuthStore();

  useEffect(() => {
    let interval: any;
    if (otpSent && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpSent, timer]);

  const handleRequestOtp = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      Alert.alert('Invalid Input', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    const formattedPhone = phoneNumber.startsWith('+91') ? phoneNumber : `+91${phoneNumber}`;
    const success = await sendForgotPasswordOtp(formattedPhone);
    if (success) {
      setOtpSent(true);
      setTimer(30);
      Alert.alert('OTP Sent', 'A 6-digit password reset code has been sent to your phone.');
    }
  };

  const handleResetSubmit = async () => {
    if (code.length < 6) {
      Alert.alert('Invalid Input', 'Please enter the 6-digit verification code.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Invalid Input', 'New password must be at least 6 characters long.');
      return;
    }

    const formattedPhone = phoneNumber.startsWith('+91') ? phoneNumber : `+91${phoneNumber}`;
    const success = await resetPassword(formattedPhone, code, newPassword);
    if (success) {
      Alert.alert('Success', 'Your password has been successfully reset. Please log in.', [
        { text: 'OK', onPress: () => navigation.replace('Login') }
      ]);
    }
  };

  const handleResend = async () => {
    if (timer === 0) {
      const formattedPhone = phoneNumber.startsWith('+91') ? phoneNumber : `+91${phoneNumber}`;
      const success = await sendForgotPasswordOtp(formattedPhone);
      if (success) {
        setTimer(30);
        Alert.alert('OTP Resent', 'Verification code has been resent to your mobile number.');
      }
    }
  };

  return (
    <ScrollView className="flex-1 bg-slate-950 px-6 pt-16">
      <View className="mb-12">
        <Text className="text-slate-100 text-3xl font-black">Reset Password</Text>
        <Text className="text-slate-400 text-sm mt-2 font-medium">
          {otpSent ? 'Enter the verification code and set your new password' : 'Enter your mobile number to receive a verification code'}
        </Text>
      </View>

      {error && (
        <View className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl mb-6">
          <Text className="text-red-400 text-xs font-semibold">{error}</Text>
        </View>
      )}

      {!otpSent ? (
        // Step 1: Request OTP
        <View className="mb-8">
          <Text className="text-slate-300 text-xs font-bold uppercase tracking-wider mb-3">
            Mobile Number
          </Text>
          <View className="flex-row items-center bg-slate-800 border border-slate-700/50 rounded-2xl px-4 py-4 mb-8">
            <Text className="text-slate-300 font-semibold mr-2">+91</Text>
            <TextInput
              className="flex-1 text-slate-100 text-base font-semibold"
              placeholder="7980357754"
              placeholderTextColor="#8A8070"
              keyboardType="number-pad"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              maxLength={10}
            />
          </View>

          <Button
            title="Send Verification Code"
            onPress={handleRequestOtp}
            loading={isLoading}
            className="mb-8"
          />

          <TouchableOpacity onPress={() => navigation.navigate('Login')} className="py-4 items-center">
            <Text className="text-blue-400 text-sm font-semibold">Back to Login</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // Step 2: Enter OTP & New Password
        <View className="mb-8">
          <Text className="text-slate-300 text-xs font-bold uppercase tracking-wider mb-3">
            Verification Code
          </Text>
          <TextInput
            className="bg-slate-800 border border-slate-700/50 rounded-2xl px-4 py-4 text-slate-100 text-center text-xl font-bold tracking-widest mb-6"
            placeholder="123456"
            placeholderTextColor="#8A8070"
            keyboardType="number-pad"
            maxLength={6}
            value={code}
            onChangeText={setCode}
          />

          <Text className="text-slate-300 text-xs font-bold uppercase tracking-wider mb-3">
            New Password
          </Text>
          <TextInput
            className="bg-slate-800 border border-slate-700/50 rounded-2xl px-4 py-4 text-slate-100 text-base font-semibold mb-6"
            placeholder="•••••••• (Min 6 chars)"
            placeholderTextColor="#8A8070"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
          />

          <View className="flex-row justify-between items-center px-2 mb-8">
            <Text className="text-slate-500 text-sm">Didn't receive the code?</Text>
            <TouchableOpacity onPress={handleResend} disabled={timer > 0}>
              <Text
                className={`text-sm font-semibold ${
                  timer > 0 ? 'text-slate-600' : 'text-blue-400'
                }`}
              >
                {timer > 0 ? `Resend in ${timer}s` : 'Resend Code'}
              </Text>
            </TouchableOpacity>
          </View>

          <Button
            title="Update Password & Log In"
            onPress={handleResetSubmit}
            loading={isLoading}
            className="mb-8"
          />

          <TouchableOpacity onPress={() => setOtpSent(false)} className="py-4 items-center">
            <Text className="text-slate-400 text-sm font-semibold">Change phone number</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};
