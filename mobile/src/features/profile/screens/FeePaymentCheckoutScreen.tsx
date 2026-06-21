import React, { useState } from 'react';
import { View, Text, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../../navigation/types';
import { apiClient } from '../../../core/api/client';
import { Button } from '../../../shared/components/Button';

type FeePaymentCheckoutRouteProp = RouteProp<RootStackParamList, 'FeePaymentCheckout'>;
type FeePaymentCheckoutNavigationProp = StackNavigationProp<RootStackParamList, 'FeePaymentCheckout'>;

interface Props {
  route: FeePaymentCheckoutRouteProp;
}

export const FeePaymentCheckoutScreen: React.FC<Props> = ({ route }) => {
  const { feeId, month, amount, orderId } = route.params;
  const navigation = useNavigation<FeePaymentCheckoutNavigationProp>();
  const [loading, setLoading] = useState(false);

  const getMonthNameAndYear = (monthStr: string) => {
    const [year, monthNum] = monthStr.split('-');
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const name = monthNames[parseInt(monthNum, 10) - 1] || 'Month';
    return `${name} ${year}`;
  };

  const simulatePaymentSuccess = async () => {
    try {
      setLoading(true);
      const mockPaymentId = `pay_fee_mock_${Math.random().toString(36).substring(2, 10)}`;
      const mockSignature = `sig_fee_mock_${Math.random().toString(36).substring(2, 15)}`;

      const response = await apiClient.post('/payments/fees/verify', {
        orderId,
        paymentId: mockPaymentId,
        signature: mockSignature,
      });

      if (response.data.success) {
        Alert.alert('Payment Successful!', `Your fee payment for ${getMonthNameAndYear(month)} was received.`, [
          {
            text: 'View Billing History',
            onPress: () => navigation.replace('FeePayment'),
          },
        ]);
      }
    } catch (e: any) {
      console.log('Error verifying fee payment:', e);
      Alert.alert('Verification Failed', e.response?.data?.error || 'Payment signature could not be verified.');
      setLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert('Cancel Payment', 'Are you sure you want to cancel the fee payment checkout?', [
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
        {/* Custom Header */}
        <View className="flex-row items-center justify-between mb-8">
          <TouchableOpacity
            onPress={handleCancel}
            className="w-10 h-10 bg-slate-900 border border-slate-800 rounded-full justify-center items-center active:bg-slate-800"
          >
            <Text className="text-slate-100 text-sm font-bold">◀</Text>
          </TouchableOpacity>
          <Text className="text-slate-100 text-lg font-black">Secure Checkout</Text>
          <View className="w-10" />
        </View>

        {/* Razorpay Sub-Header */}
        <View className="mb-4">
          <Text className="text-slate-500 text-xs text-center font-bold tracking-widest uppercase">
            Razorpay Secure Gateway
          </Text>
        </View>

        {/* Order Details Card */}
        <View className="bg-slate-900 border border-slate-800 rounded-3xl p-6 mb-8 mt-4">
          <Text className="text-primary text-xs font-bold uppercase tracking-widest">Fee Bill Details</Text>
          <Text className="text-slate-100 text-base font-bold mt-4 leading-6">
            Monthly Tuition Fee - {getMonthNameAndYear(month)}
          </Text>

          <View className="flex-row justify-between items-center mt-6 pt-4 border-t border-slate-800">
            <Text className="text-slate-500 text-xs font-semibold">Order ID</Text>
            <Text className="text-slate-500 text-xs font-bold font-mono">{orderId}</Text>
          </View>
          <View className="flex-row justify-between items-center mt-3">
            <Text className="text-slate-500 text-xs font-semibold">Amount Due</Text>
            <Text className="text-primary text-lg font-bold">₹{(amount / 100).toLocaleString('en-IN')}</Text>
          </View>
        </View>

        <Text className="text-slate-500 text-xs text-center leading-5 px-6">
          Please verify your billing details above and select authorize payment to complete your transaction. Secure 256-bit SSL encrypted connection.
        </Text>
      </View>

      {loading ? (
        <View className="items-center py-10">
          <ActivityIndicator size="large" color="#2D8C82" />
          <Text className="text-slate-500 text-xs font-bold mt-4">Authorizing secure transaction...</Text>
        </View>
      ) : (
        <View className="space-y-4">
          <Button title="Authorize Payment" onPress={simulatePaymentSuccess} variant="secondary" />
          <Button title="Cancel Transaction" onPress={handleCancel} variant="outline" className="border-red-500/20" />
        </View>
      )}
    </View>
  );
};
