import React, { useState } from 'react';
import { View, Text, Alert, ActivityIndicator } from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../../navigation/types';
import { apiClient } from '../../../core/api/client';
import { Button } from '../../../shared/components/Button';

type PurchaseWebviewRouteProp = RouteProp<RootStackParamList, 'PurchaseWebview'>;
type PurchaseWebviewNavigationProp = StackNavigationProp<RootStackParamList, 'PurchaseWebview'>;

interface Props {
  route: PurchaseWebviewRouteProp;
}

export const PurchaseWebviewScreen: React.FC<Props> = ({ route }) => {
  const { courseId, orderId, amount, title } = route.params;
  const navigation = useNavigation<PurchaseWebviewNavigationProp>();
  const [loading, setLoading] = useState(false);

  const simulatePaymentSuccess = async () => {
    try {
      setLoading(true);
      const mockPaymentId = `pay_mock_${Math.random().toString(36).substring(2, 10)}`;
      const mockSignature = `sig_mock_${Math.random().toString(36).substring(2, 15)}`;

      const response = await apiClient.post('/payments/verify', {
        orderId,
        paymentId: mockPaymentId,
        signature: mockSignature,
      });

      if (response.data.success) {
        Alert.alert('Payment Successful!', `You have unlocked the ${title} program.`, [
          {
            text: 'Start Learning',
            onPress: () => navigation.replace('CourseDetails', { courseId }),
          },
        ]);
      }
    } catch (e: any) {
      Alert.alert('Verification Failed', e.response?.data?.error || 'Payment signature could not be verified.');
      setLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert('Cancel Payment', 'Are you sure you want to cancel the checkout?', [
      { text: 'No' },
      {
        text: 'Yes, Cancel',
        onPress: () => navigation.goBack(),
        style: 'destructive',
      },
    ]);
  };

  return (
    <View className="flex-1 bg-slate-950 justify-between p-6 pt-16">
      <View>
        {/* Header */}
        <View className="mb-8">
          <Text className="text-white text-2xl font-black text-center">Secure Gateway</Text>
          <Text className="text-slate-400 text-xs mt-2 text-center font-bold tracking-widest uppercase">
            Razorpay Secure Checkout
          </Text>
        </View>

        {/* Order Details Card */}
        <View className="bg-slate-900 border border-slate-800 rounded-3xl p-6 mb-8 mt-6">
          <Text className="text-blue-400 text-xs font-bold uppercase tracking-widest">Order Details</Text>
          <Text className="text-white text-base font-bold mt-4 leading-6">{title}</Text>

          <View className="flex-row justify-between items-center mt-6 pt-4 border-t border-slate-800">
            <Text className="text-slate-400 text-xs font-semibold">Order ID</Text>
            <Text className="text-slate-200 text-xs font-bold font-mono">{orderId}</Text>
          </View>
          <View className="flex-row justify-between items-center mt-3">
            <Text className="text-slate-400 text-xs font-semibold">Amount Due</Text>
            <Text className="text-white text-lg font-bold">₹{(amount / 100).toLocaleString('en-IN')}</Text>
          </View>
        </View>

        <Text className="text-slate-500 text-xs text-center leading-5 px-6">
          This is a simulated Razorpay interface confirming sandbox credentials. Press the button below to simulate transaction approval.
        </Text>
      </View>

      {loading ? (
        <View className="items-center py-10">
          <ActivityIndicator size="large" color="#2D8C82" />
          <Text className="text-slate-400 text-xs font-bold mt-4">Verifying secure signatures...</Text>
        </View>
      ) : (
        <View className="space-y-4">
          <Button title="Simulate Payment Success" onPress={simulatePaymentSuccess} variant="secondary" />
          <Button title="Cancel Checkout" onPress={handleCancel} variant="outline" className="border-red-500/20" />
        </View>
      )}
    </View>
  );
};
