import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, Alert, Image } from 'react-native';
import { useAuthStore } from '../../../core/store/auth';
import { apiClient } from '../../../core/api/client';
import { Skeleton } from '../../../shared/components/Skeleton';
import { Button } from '../../../shared/components/Button';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../../navigation/types';

type ProfileHomeNavigationProp = StackNavigationProp<RootStackParamList, 'AppTabs'>;

export const ProfileHomeScreen: React.FC = () => {
  const navigation = useNavigation<ProfileHomeNavigationProp>();
  const { logout } = useAuthStore();
  const [profileData, setProfileData] = useState<{
    profile: any;
    stats: {
      purchasedCoursesCount: number;
      completedLecturesCount: number;
      testsAttemptedCount: number;
      averageTestAccuracy: number;
    };
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/profile');
      setProfileData(response.data.data);
    } catch (e) {
      console.log('Error pulling profile data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProfile();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert('Confirm Logout', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        onPress: async () => {
          await logout();
          navigation.replace('Login');
        },
        style: 'destructive',
      },
    ]);
  };

  return (
    <View className="flex-1 bg-slate-950 px-5 pt-14">
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8A2222" />}
      >
        {loading ? (
          <View className="space-y-6">
            <Skeleton height={100} borderRadius={24} />
            <Skeleton height={200} borderRadius={24} />
          </View>
        ) : profileData ? (
          <View className="pb-24">
            {/* User Details */}
            <View className="bg-slate-900 border border-slate-800 rounded-3xl p-5 mb-6 flex-row items-center">
              <View className="w-16 h-16 bg-blue-600 rounded-full justify-center items-center shadow-lg shadow-blue-500/20 mr-4">
                <Text className="text-white text-2xl font-black">
                  {profileData.profile.name.charAt(0)}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-slate-100 text-lg font-black">{profileData.profile.name}</Text>
                <Text className="text-slate-400 text-xs mt-1">{profileData.profile.phoneNumber}</Text>
                <Text className="text-slate-500 text-xs mt-0.5" numberOfLines={1}>
                  {profileData.profile.email}
                </Text>
              </View>
            </View>

            {/* Performance Analytics Grid */}
            <Text className="text-slate-100 text-base font-bold mb-4">Performance Analytics</Text>
            <View className="flex-row flex-wrap justify-between mb-8">
              {/* Box 1 */}
              <View className="w-[47%] bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
                <Text className="text-slate-500 text-[9px] font-black uppercase tracking-wider">
                  Programs Unlocked
                </Text>
                <Text className="text-slate-100 text-2xl font-black mt-2">
                  {profileData.stats.purchasedCoursesCount}
                </Text>
              </View>
              {/* Box 2 */}
              <View className="w-[47%] bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
                <Text className="text-slate-500 text-[9px] font-black uppercase tracking-wider">
                  Videos Completed
                </Text>
                <Text className="text-slate-100 text-2xl font-black mt-2">
                  {profileData.stats.completedLecturesCount}
                </Text>
              </View>
              {/* Box 3 */}
              <View className="w-[47%] bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
                <Text className="text-slate-500 text-[9px] font-black uppercase tracking-wider">
                  Tests Attempted
                </Text>
                <Text className="text-slate-100 text-2xl font-black mt-2">
                  {profileData.stats.testsAttemptedCount}
                </Text>
              </View>
              {/* Box 4 */}
              <View className="w-[47%] bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
                <Text className="text-slate-500 text-[9px] font-black uppercase tracking-wider">
                  Avg Accuracy
                </Text>
                <Text className="text-emerald-400 text-2xl font-black mt-2">
                  {profileData.stats.averageTestAccuracy}%
                </Text>
              </View>
            </View>

            {/* Subscriptions Status */}
            <View className="bg-slate-900 border border-slate-800 rounded-3xl p-5 mb-8">
              <Text className="text-slate-100 text-sm font-bold">Academic Institution Status</Text>
              <View className="flex-row items-center justify-between mt-4">
                <View>
                  <Text className="text-slate-300 text-xs font-semibold">The Mathemaniac</Text>
                  <Text className="text-slate-500 text-[10px] mt-0.5">Madhyamgram Branch Student</Text>
                </View>
                <View className="bg-blue-600/20 px-3 py-1 rounded-full border border-blue-500/20">
                  <Text className="text-blue-400 text-[10px] font-bold uppercase tracking-wider">
                    Enrolled
                  </Text>
                </View>
              </View>
            </View>

            {/* Logout */}
            <Button title="Sign Out of Session" onPress={handleLogout} variant="danger" />
          </View>
        ) : (
          <View className="items-center py-20">
            <Text className="text-slate-400 font-bold">Failed to load details.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};
