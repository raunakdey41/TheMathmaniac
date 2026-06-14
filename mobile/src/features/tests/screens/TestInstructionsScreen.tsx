import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../../navigation/types';
import { apiClient } from '../../../core/api/client';
import { Button } from '../../../shared/components/Button';
import { Skeleton } from '../../../shared/components/Skeleton';
import { useActiveTestStore } from '../../../core/store/activeTest';

type TestInstructionsRouteProp = RouteProp<RootStackParamList, 'TestInstructions'>;
type TestInstructionsNavigationProp = StackNavigationProp<RootStackParamList, 'TestInstructions'>;

interface Props {
  route: TestInstructionsRouteProp;
}

export const TestInstructionsScreen: React.FC<Props> = ({ route }) => {
  const { testId } = route.params;
  const navigation = useNavigation<TestInstructionsNavigationProp>();
  const [test, setTest] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const startTestLocal = useActiveTestStore((state) => state.startTest);

  useEffect(() => {
    const fetchInstructions = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get(`/tests/${testId}`);
        setTest(response.data.data);
      } catch (e) {
        console.log('Error pulling instructions:', e);
        Alert.alert('Error', 'Failed to retrieve test details.');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };
    fetchInstructions();
  }, [testId]);

  const handleStart = () => {
    if (!test) return;
    startTestLocal(testId, test.duration);
    navigation.replace('ActiveTest', { testId });
  };

  if (loading) {
    return (
      <View className="flex-1 bg-slate-950 px-6 pt-16">
        <Skeleton height={200} borderRadius={24} />
        <Skeleton height={150} className="mt-8" />
      </View>
    );
  }

  if (!test) return null;

  return (
    <View className="flex-1 bg-slate-950 px-6 pt-16 justify-between pb-12">
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {/* Back Button */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-10 h-10 bg-slate-900 border border-slate-800 rounded-full justify-center items-center mb-6"
        >
          <Text className="text-slate-100 text-lg font-bold">←</Text>
        </TouchableOpacity>

        {/* Banner Details */}
        <Text className="text-blue-400 text-xs font-bold uppercase tracking-widest">Practice Test Session</Text>
        <Text className="text-slate-100 text-2xl font-black mt-2 leading-8">{test.title}</Text>

        {/* Info Grid */}
        <View className="flex-row justify-between bg-slate-900 border border-slate-800 rounded-3xl p-5 mt-6 mb-8">
          <View className="items-center flex-1 border-r border-slate-800">
            <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Duration</Text>
            <Text className="text-slate-100 text-base font-black mt-1">{test.duration} Min</Text>
          </View>
          <View className="items-center flex-1 border-r border-slate-800">
            <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Questions</Text>
            <Text className="text-slate-100 text-base font-black mt-1">{test.questions?.length || 0}</Text>
          </View>
          <View className="items-center flex-1">
            <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Marks</Text>
            <Text className="text-slate-100 text-base font-black mt-1">{test.totalMarks} Pts</Text>
          </View>
        </View>

        {/* Rules */}
        <Text className="text-slate-100 text-base font-bold mb-4">Exam Guidelines</Text>
        <View className="space-y-4">
          <View className="flex-row items-start">
            <Text className="text-blue-400 text-sm font-bold mr-3">1.</Text>
            <Text className="text-slate-400 text-xs leading-5">
              Timer starts automatically when you press the button below.
            </Text>
          </View>
          <View className="flex-row items-start">
            <Text className="text-blue-400 text-sm font-bold mr-3">2.</Text>
            <Text className="text-slate-400 text-xs leading-5">
              Do not close the application or go background. Active tests automatically submit upon exit or when the timer expires.
            </Text>
          </View>
          <View className="flex-row items-start">
            <Text className="text-blue-400 text-sm font-bold mr-3">3.</Text>
            <Text className="text-slate-400 text-xs leading-5">
              Review answers carefully before clicking the Submit button.
            </Text>
          </View>
        </View>
      </ScrollView>

      <Button title="Start Quiz Session" onPress={handleStart} variant="primary" />
    </View>
  );
};
