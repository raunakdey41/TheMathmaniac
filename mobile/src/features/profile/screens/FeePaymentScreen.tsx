import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, Alert, ActivityIndicator, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../../navigation/types';
import { apiClient } from '../../../core/api/client';
import { Button } from '../../../shared/components/Button';
import { Skeleton } from '../../../shared/components/Skeleton';
import { useAuthStore } from '../../../core/store/auth';

type FeePaymentScreenNavigationProp = StackNavigationProp<RootStackParamList, 'FeePayment'>;

interface FeeRecord {
  id: string;
  month: string;
  amount: number;
  fine: number;
  totalAmount: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  paidAt: string | null;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
}

export const FeePaymentScreen: React.FC = () => {
  const navigation = useNavigation<FeePaymentScreenNavigationProp>();
  const { user } = useAuthStore();
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkoutLoadingId, setCheckoutLoadingId] = useState<string | null>(null);
  const [selectedReceiptFee, setSelectedReceiptFee] = useState<FeeRecord | null>(null);

  const fetchFees = async () => {
    try {
      const response = await apiClient.get('/payments/fees');
      if (response.data.success) {
        setFees(response.data.data);
      }
    } catch (e: any) {
      console.log('Error fetching student fees:', e);
      Alert.alert('Error', 'Unable to retrieve fee payment history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFees();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFees();
    setRefreshing(false);
  };

  const getMonthNameAndYear = (monthStr: string) => {
    const [year, monthNum] = monthStr.split('-');
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const name = monthNames[parseInt(monthNum, 10) - 1] || 'Month';
    return `${name} ${year}`;
  };

  const handlePayFee = async (fee: FeeRecord) => {
    try {
      setCheckoutLoadingId(fee.id);
      const response = await apiClient.post('/payments/fees/order', {
        feeId: fee.id,
      });

      if (response.data.success) {
        const orderData = response.data.data;
        // Navigate to simulated checkout
        navigation.navigate('FeePaymentCheckout', {
          feeId: fee.id,
          month: fee.month,
          amount: orderData.amount,
          orderId: orderData.orderId,
        });
      }
    } catch (e: any) {
      console.log('Error creating fee payment order:', e);
      Alert.alert('Checkout Failed', e.response?.data?.error || 'Unable to initialize transaction.');
    } finally {
      setCheckoutLoadingId(null);
    }
  };

  // Calculate total outstanding balance
  const outstandingBalance = fees
    .filter(f => f.status === 'PENDING')
    .reduce((sum, f) => sum + f.totalAmount, 0);

  const formatAmount = (amt: number) => {
    return `₹${(amt / 100).toLocaleString('en-IN')}`;
  };

  return (
    <View className="flex-1 bg-slate-950 px-5 pt-14">
      {/* Custom Header */}
      <View className="flex-row items-center justify-between mb-6">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-10 h-10 bg-slate-900 border border-slate-800 rounded-full justify-center items-center active:bg-slate-800"
        >
          <Text className="text-slate-100 text-sm font-bold">◀</Text>
        </TouchableOpacity>
        <Text className="text-slate-100 text-lg font-black">Fee Billings & Payments</Text>
        <View className="w-10" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2D8C82" />}
      >
        {loading ? (
          <View className="space-y-6">
            <Skeleton height={120} borderRadius={24} />
            <Skeleton height={150} borderRadius={24} />
            <Skeleton height={150} borderRadius={24} />
          </View>
        ) : (
          <View className="pb-24">
            {/* Total Balance Card */}
            <View className="bg-slate-900 border border-slate-800 rounded-3xl p-5 mb-6">
              <Text className="text-slate-500 text-[10px] font-black uppercase tracking-wider">
                Total Outstanding Balance
              </Text>
              <Text className="text-slate-100 text-3xl font-black mt-2">
                {formatAmount(outstandingBalance)}
              </Text>
              <Text className="text-slate-500 text-[10px] mt-2 font-medium">
                Note: Monthly fees must be paid by the 10th of every month. Late payments incur a fine of ₹50.
              </Text>
            </View>

            {/* List of Billings */}
            <Text className="text-slate-100 text-base font-bold mb-4">Billing History</Text>

            {fees.length === 0 ? (
              <View className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 items-center">
                <Text className="text-slate-500 text-sm font-semibold">No billing history found.</Text>
              </View>
            ) : (
              fees.map((fee) => {
                const isOverdue = fee.status === 'PENDING' && fee.fine > 0;
                
                return (
                  <View
                    key={fee.id}
                    className="bg-slate-900 border border-slate-800 rounded-3xl p-5 mb-4"
                  >
                    <View className="flex-row justify-between items-start">
                      <View>
                        <Text className="text-slate-100 text-base font-black">
                          {getMonthNameAndYear(fee.month)}
                        </Text>
                        <Text className="text-slate-500 text-[10px] mt-1 font-semibold">
                          Due Date: 10th of {getMonthNameAndYear(fee.month).split(' ')[0]}
                        </Text>
                      </View>
                      
                      {fee.status === 'SUCCESS' ? (
                        <View className="bg-green-100 px-3 py-1 rounded-full border border-green-200">
                          <Text className="text-green-700 text-[9px] font-bold uppercase tracking-wider">
                            Paid
                          </Text>
                        </View>
                      ) : isOverdue ? (
                        <View className="bg-red-100 px-3 py-1 rounded-full border border-red-200">
                          <Text className="text-red-700 text-[9px] font-bold uppercase tracking-wider">
                            Overdue
                          </Text>
                        </View>
                      ) : (
                        <View className="bg-amber-100 px-3 py-1 rounded-full border border-amber-200">
                          <Text className="text-amber-700 text-[9px] font-bold uppercase tracking-wider">
                            Pending
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Breakdown */}
                    <View className="mt-4 pt-4 border-t border-slate-800/80 space-y-2">
                      <View className="flex-row justify-between items-center">
                        <Text className="text-slate-500 text-xs font-semibold">Monthly Tuition Fee</Text>
                        <Text className="text-slate-500 text-xs font-bold">{formatAmount(fee.amount)}</Text>
                      </View>
                      {fee.fine > 0 && (
                        <View className="flex-row justify-between items-center">
                          <Text className="text-red-600 text-xs font-semibold">Late Fine Penalty</Text>
                          <Text className="text-red-600 text-xs font-bold">+{formatAmount(fee.fine)}</Text>
                        </View>
                      )}
                      <View className="flex-row justify-between items-center pt-2 border-t border-slate-800/50">
                        <Text className="text-slate-400 text-xs font-bold">Total Amount</Text>
                        <Text className="text-slate-100 text-sm font-black">{formatAmount(fee.totalAmount)}</Text>
                      </View>
                    </View>

                    {/* Paid details or Action button */}
                    {fee.status === 'SUCCESS' ? (
                      <View className="mt-4 pt-3 border-t border-slate-800/50 space-y-3">
                        <View className="flex-row justify-between items-center flex-wrap gap-y-1">
                          <Text className="text-slate-500 text-[9px] font-semibold">
                            Paid: {fee.paidAt ? new Date(fee.paidAt).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            }) : 'N/A'}
                          </Text>
                          <Text className="text-slate-500 text-[8px] font-mono" numberOfLines={1}>
                            Ref: {fee.razorpayPaymentId || 'N/A'}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => setSelectedReceiptFee(fee)}
                          className="bg-slate-800 border border-slate-700/60 rounded-2xl py-2.5 px-4 flex-row justify-center items-center active:bg-slate-700"
                        >
                          <Text className="text-slate-100 text-[10.5px] font-black uppercase tracking-wider">📄 View Payment Receipt</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View className="mt-5">
                        {checkoutLoadingId === fee.id ? (
                          <ActivityIndicator size="small" color="#2D8C82" />
                        ) : (
                          <Button
                            title="Pay Fee Securely"
                            onPress={() => handlePayFee(fee)}
                            variant={isOverdue ? 'secondary' : 'primary'}
                          />
                        )}
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* Payment Receipt Modal */}
      <Modal
        visible={selectedReceiptFee !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedReceiptFee(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(2, 6, 23, 0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl p-6 relative overflow-hidden shadow-2xl">
            {/* Stamp watermark */}
            <View 
              style={{ position: 'absolute', top: 12, right: -12, transform: [{ rotate: '25deg' }] }} 
              className="border-2 border-emerald-500/30 rounded-xl px-4 py-1.5"
            >
              <Text className="text-emerald-600 font-black text-sm uppercase tracking-widest">SUCCESSFUL</Text>
            </View>

            {/* Receipt Header */}
            <View className="items-center pb-4 border-b border-slate-800">
              <Text className="text-slate-100 text-base font-black uppercase tracking-wider text-center">The Mathemaniac Institute</Text>
              <Text className="text-slate-500 text-[10px] font-bold uppercase mt-1">Official Fee Payment Receipt</Text>
            </View>

            {/* Receipt Details */}
            {selectedReceiptFee && (
              <View className="mt-4 space-y-4">
                <View className="space-y-2">
                  <View className="flex-row justify-between">
                    <Text className="text-slate-500 text-[9px] font-bold uppercase tracking-wider">Student Name</Text>
                    <Text className="text-slate-500 text-[10px] font-bold">{user?.name || 'Student'}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-slate-500 text-[9px] font-bold uppercase tracking-wider">Billing Period</Text>
                    <Text className="text-slate-100 text-xs font-black">{getMonthNameAndYear(selectedReceiptFee.month)}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-slate-500 text-[9px] font-bold uppercase tracking-wider">Payment Date</Text>
                    <Text className="text-slate-500 text-[10px] font-bold">
                      {selectedReceiptFee.paidAt ? new Date(selectedReceiptFee.paidAt).toLocaleString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 'N/A'}
                    </Text>
                  </View>
                </View>

                {/* Amount breakdown block */}
                <View className="bg-slate-950/60 rounded-2xl p-4 space-y-2 border border-slate-800">
                  <View className="flex-row justify-between items-center">
                    <Text className="text-slate-500 text-xs font-semibold">Tuition Fee</Text>
                    <Text className="text-slate-500 text-xs font-bold">{formatAmount(selectedReceiptFee.amount)}</Text>
                  </View>
                  {selectedReceiptFee.fine > 0 && (
                    <View className="flex-row justify-between items-center">
                      <Text className="text-red-600 text-xs font-semibold">Overdue Fine</Text>
                      <Text className="text-red-600 text-xs font-bold">+{formatAmount(selectedReceiptFee.fine)}</Text>
                    </View>
                  )}
                  <View className="border-t border-slate-800 pt-2.5 mt-1 flex-row justify-between items-center">
                    <Text className="text-slate-400 text-xs font-black">Net Total Paid</Text>
                    <Text className="text-primary text-base font-black">{formatAmount(selectedReceiptFee.totalAmount)}</Text>
                  </View>
                </View>

                {/* Reference details */}
                <View className="space-y-1.5 pt-2 border-t border-slate-800">
                  <View className="flex-row justify-between items-center">
                    <Text className="text-slate-500 text-[9px] font-bold uppercase tracking-wider">Payment Method</Text>
                    <Text className="text-slate-500 text-[9px] font-semibold">Online Payment</Text>
                  </View>
                  <View className="flex-row justify-between items-center">
                    <Text className="text-slate-500 text-[9px] font-bold uppercase tracking-wider">Transaction ID</Text>
                    <Text className="text-slate-500 text-[8.5px] font-mono" numberOfLines={1}>{selectedReceiptFee.razorpayPaymentId || 'N/A'}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Footer Notice */}
            <View className="mt-6 pt-4 border-t border-slate-800 items-center">
              <Text className="text-slate-600 text-[8px] text-center font-semibold uppercase tracking-wider">
                This is a secure system-generated receipt.
              </Text>
            </View>

            {/* Close Button */}
            <TouchableOpacity
              onPress={() => setSelectedReceiptFee(null)}
              className="mt-5 bg-primary rounded-2xl py-3 items-center active:opacity-90"
            >
              <Text className="text-white text-xs font-black uppercase tracking-wider">Close Receipt</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};
