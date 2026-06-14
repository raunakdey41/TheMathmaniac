import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../../navigation/types';
import { Button } from '../../../shared/components/Button';
import { MathRenderer, hasMathExpressions } from '../../../shared/components/MathRenderer';

type TestResultRouteProp = RouteProp<RootStackParamList, 'TestResult'>;
type TestResultNavigationProp = StackNavigationProp<RootStackParamList, 'TestResult'>;

interface Props {
  route: TestResultRouteProp;
}

export const TestResultScreen: React.FC<Props> = ({ route }) => {
  const { resultData } = route.params; // { score, totalMarks, accuracy, rank, feedback }
  const navigation = useNavigation<TestResultNavigationProp>();

  return (
    <View className="flex-1 bg-slate-950 px-5 pt-14 justify-between pb-8">
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {/* Duolingo style Congratulatory Header */}
        <View className="items-center py-8">
          <Text className="text-6xl">🎉</Text>
          <Text className="text-slate-100 text-2xl font-black mt-4 text-center">Test Completed!</Text>
          <Text className="text-slate-400 text-xs mt-2 text-center">Your results have been logged successfully.</Text>
        </View>

        {/* Accuracy and Score Rings Grid */}
        <View className="bg-slate-900 border border-slate-800 rounded-3xl p-5 mb-8 flex-row justify-around">
          <View className="items-center">
            <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Rank</Text>
            <Text className="text-emerald-400 text-2xl font-black mt-1">#{resultData.rank}</Text>
          </View>
          <View className="items-center">
            <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Accuracy</Text>
            <Text className="text-blue-400 text-2xl font-black mt-1">{Math.round(resultData.accuracy)}%</Text>
          </View>
          <View className="items-center">
            <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Score</Text>
            <Text className="text-slate-100 text-2xl font-black mt-1">
              {resultData.score}/{resultData.totalMarks}
            </Text>
          </View>
        </View>

        {/* Detailed Solutions Review */}
        <Text className="text-slate-100 text-base font-bold mb-4">Questions Review</Text>
        {resultData.feedback.map((item: any, idx: number) => (
          <View
            key={idx}
            className={`border rounded-2xl p-4 mb-4 ${
              item.isCorrect ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'
            }`}
          >
            <View className="flex-row justify-between items-baseline mb-2">
              <Text className="text-[10px] font-bold text-slate-500 uppercase">QUESTION {idx + 1}</Text>
              <Text className={`text-xs font-bold ${item.isCorrect ? 'text-green-600' : 'text-red-400'}`}>
                {item.isCorrect ? 'Correct (+10)' : 'Incorrect (+0)'}
              </Text>
            </View>

            {hasMathExpressions(item.text) ? (
              <MathRenderer
                text={item.text}
                isDarkText={true}
                style={{ marginTop: 4 }}
              />
            ) : (
              <Text className="text-slate-200 text-sm font-semibold mt-1 leading-5">{item.text}</Text>
            )}

            <View className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
              <View className="flex-row">
                <Text className="text-slate-400 text-xs font-medium mr-2">Your Answer:</Text>
                <Text className={`text-xs font-semibold ${item.isCorrect ? 'text-green-600' : 'text-red-400'}`}>
                  {item.userAnswer || '(Skipped)'}
                </Text>
              </View>
              {!item.isCorrect && (
                <View className="flex-row items-center">
                  <Text className="text-slate-400 text-xs font-medium mr-2">Correct Answer:</Text>
                  {hasMathExpressions(item.correctAnswer) ? (
                    <MathRenderer
                      text={item.correctAnswer}
                      isDarkText={true}
                      style={{ flex: 1 }}
                    />
                  ) : (
                    <Text className="text-green-600 text-xs font-semibold">{item.correctAnswer}</Text>
                  )}
                </View>
              )}
              <View className="mt-2 bg-slate-950/40 p-3 rounded-xl border border-slate-800/40">
                <Text className="text-blue-400 text-[10px] font-bold uppercase tracking-wider mb-1">Explanation</Text>
                {hasMathExpressions(item.explanation) ? (
                  <MathRenderer
                    text={item.explanation}
                    isDarkText={true}
                    style={{ marginTop: 4 }}
                  />
                ) : (
                  <Text className="text-slate-400 text-xs leading-5">{item.explanation}</Text>
                )}
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      <Button
        title="Back to Dashboard"
        onPress={() => navigation.replace('AppTabs', { screen: 'Home' })}
        variant="primary"
        className="mt-6"
      />
    </View>
  );
};
