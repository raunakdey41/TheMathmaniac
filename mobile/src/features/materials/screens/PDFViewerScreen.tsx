import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../../navigation/types';

type PDFViewerRouteProp = RouteProp<RootStackParamList, 'PDFViewer'>;
type PDFViewerNavigationProp = StackNavigationProp<RootStackParamList, 'PDFViewer'>;

interface Props {
  route: PDFViewerRouteProp;
}

export const PDFViewerScreen: React.FC<Props> = ({ route }) => {
  const { title, fileUrl } = route.params;
  const navigation = useNavigation<PDFViewerNavigationProp>();
  const [downloading, setDownloading] = useState(false);

  const simulateDownload = () => {
    setDownloading(true);
    setTimeout(() => {
      setDownloading(false);
      Alert.alert('Download Complete', `${title} has been downloaded to your local device successfully.`);
    }, 1500);
  };

  return (
    <View className="flex-1 bg-slate-950">
      {/* Header */}
      <View className="bg-slate-900 border-b border-slate-800/80 px-6 pt-14 pb-4 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-10 h-10 bg-slate-800 border border-slate-700/60 rounded-full justify-center items-center"
        >
          <Text className="text-white text-lg font-bold">←</Text>
        </TouchableOpacity>
        <Text className="text-white text-base font-bold flex-1 ml-4 text-center" numberOfLines={1}>
          {title}
        </Text>
        <TouchableOpacity onPress={simulateDownload} disabled={downloading}>
          {downloading ? (
            <ActivityIndicator size="small" color="#2563EB" />
          ) : (
            <Text className="text-blue-400 text-sm font-semibold">Save</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Simulated Scrollable PDF Pages */}
      <ScrollView className="flex-1 p-6" showsVerticalScrollIndicator={false}>
        <View className="bg-slate-900 border border-slate-800 rounded-3xl p-8 items-center justify-center min-h-[400px]">
          <Text className="text-4xl">📄</Text>
          <Text className="text-white text-lg font-black mt-4 text-center">Simulated PDF Viewer Canvas</Text>
          <Text className="text-slate-400 text-xs mt-2 text-center leading-5 px-6">
            Loading file stream from: {fileUrl}
          </Text>

          <View className="w-full mt-10 space-y-3">
            <View className="h-4 bg-slate-800 rounded-lg w-full" />
            <View className="h-4 bg-slate-800 rounded-lg w-5/6" />
            <View className="h-4 bg-slate-800 rounded-lg w-full" />
            <View className="h-4 bg-slate-800 rounded-lg w-2/3" />
          </View>
        </View>

        <View className="h-10" />
      </ScrollView>
    </View>
  );
};
