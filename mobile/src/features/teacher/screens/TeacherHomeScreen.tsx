import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useAuthStore } from '../../../core/store/auth';
import { apiClient } from '../../../core/api/client';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../../navigation/types';
import { Timetable, TimeSlot, RoutineSession } from '../../../shared/components/Timetable';

type TeacherHomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'TeacherAttendanceTracking' | 'SuperuserReports'>;

const SUPERUSER_PHONES = ['+917980357754', '+919831754957'];

const MOCK_SESSIONS: RoutineSession[] = [
  {
    id: 's1',
    dayOfWeek: 'Monday',
    startTime: '04:30 PM',
    endTime: '06:30 PM',
    courseName: 'Mathematics',
    batchName: 'Class 10',
    location: 'Sodepur',
    color: '#3CA79B'
  },
  {
    id: 's2',
    dayOfWeek: 'Monday',
    startTime: '06:00 PM',
    endTime: '09:00 PM',
    courseName: 'Physics',
    batchName: 'Class 11',
    location: 'Madhyamgram',
    color: '#D97706'
  },
  {
    id: 's3',
    dayOfWeek: 'Tuesday',
    startTime: '10:00 AM',
    endTime: '12:00 PM',
    courseName: 'Chemistry',
    batchName: 'Batch A',
    location: 'Sodepur',
    color: '#2563EB'
  },
  {
    id: 's4',
    dayOfWeek: 'Thursday',
    startTime: '01:00 PM',
    endTime: '03:30 PM',
    courseName: 'Biology',
    batchName: 'Batch C',
    location: 'Madhyamgram',
    color: '#10B981'
  },
  {
    id: 's5',
    dayOfWeek: 'Friday',
    startTime: '11:00 AM',
    endTime: '01:30 PM',
    courseName: 'Mathematics',
    batchName: 'Batch D',
    location: 'Sodepur',
    color: '#8B5CF6'
  }
];

export const TeacherHomeScreen: React.FC = () => {
  const { user } = useAuthStore();
  const navigation = useNavigation<TeacherHomeScreenNavigationProp>();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    totalStudents: number;
    totalCourses: number;
    totalTests: number;
    totalMaterials: number;
  } | null>(null);

  const isSuperuser = user && SUPERUSER_PHONES.includes(user.phoneNumber);

  const loadStats = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/profile');
      if (res.data.success) {
        setStats(res.data.data.stats);
      }
    } catch (e) {
      console.log('Error pulling teacher stats:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  return (
    <View className="flex-1 bg-slate-950">
      {/* Header */}
      <View className="bg-slate-900 border-b border-slate-800/80 px-6 pt-14 pb-4 flex-row justify-between items-center">
        <View>
          <Text className="text-slate-500 text-xs font-semibold tracking-widest uppercase">
            Mathemaniac Faculty
          </Text>
          <Text className="text-slate-100 text-lg font-black mt-0.5">
            Hey, {user?.name || 'Instructor'}! 👨‍🏫
          </Text>
        </View>
        <View className="w-10 h-10 bg-slate-800 border border-slate-700/60 rounded-full justify-center items-center">
          <Text className="text-lg">👨‍🏫</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5 pt-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2D8C82" />}
      >
        {loading && !refreshing ? (
          <View className="flex-1 justify-center items-center py-20">
            <ActivityIndicator size="large" color="#2D8C82" />
          </View>
        ) : (
          <View className="pb-12">
            {/* Welcome Card */}
            <View className="bg-blue-600/95 border border-blue-500 rounded-3xl p-5 mb-6">
              <Text className="text-blue-200 text-xs font-bold uppercase tracking-widest">
                ⚡ Welcome, Instructor
              </Text>
              <Text className="text-white text-lg font-black mt-2 leading-6">
                Mathemaniac Faculty Control Panel
              </Text>
              <Text className="text-blue-100 text-xs mt-1 font-medium">
                Access and manage your courses, study materials, tests, and attendance tracking dynamically.
              </Text>
            </View>

            {/* Timetable Component directly embedded */}
            <View className="mb-6">
              <Timetable 
                title="Timetable"
                sessions={MOCK_SESSIONS}
                onSessionPress={(session) => {
                  console.log('Pressed session:', session);
                }}
              />
            </View>

            {/* Geofenced Attendance Card */}
            <View className="bg-slate-900 border border-slate-800 rounded-3xl p-5 mb-6">
              <View className="flex-row justify-between items-center">
                <View className="flex-1 mr-4">
                  <Text className="text-slate-100 text-sm font-bold">📍 Geofenced Attendance</Text>
                  <Text className="text-slate-500 text-[10px] mt-1 leading-4 font-semibold">
                    Clock in, track distance status, and log attendance matching your active schedules.
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => navigation.navigate('TeacherAttendanceTracking')}
                  className="bg-[#2D8C82] border border-[#3CA79B] px-4 py-2.5 rounded-2xl active:opacity-90 shadow-md shadow-teal-500/10"
                >
                  <Text className="text-white text-xs font-extrabold uppercase tracking-wider">Start Tracking</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Superuser Controls Card */}
            {isSuperuser && (
              <View className="bg-slate-900 border border-amber-500/30 rounded-3xl p-5 mb-6">
                <View className="flex-row justify-between items-center">
                  <View className="flex-1 mr-4">
                    <View className="flex-row items-center">
                      <View className="bg-amber-500/10 px-2 py-0.5 rounded-full mr-2">
                        <Text className="text-amber-400 text-[9px] font-extrabold uppercase tracking-widest">
                          Superuser
                        </Text>
                      </View>
                      <Text className="text-slate-100 text-sm font-bold">🔑 System Reports</Text>
                    </View>
                    <Text className="text-slate-500 text-[10px] mt-2 leading-4 font-semibold">
                      Access cryptographic daily attendance logs, view generated PDFs, and force system compilation.
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('SuperuserReports')}
                    className="bg-amber-500 border border-amber-600 px-4 py-2.5 rounded-2xl active:opacity-90 shadow-md shadow-amber-500/10"
                  >
                    <Text className="text-slate-950 text-xs font-extrabold uppercase tracking-wider">View Reports</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Quick Statistics Grid */}
            <Text className="text-slate-100 text-base font-bold mb-3">Academic Stats Overview</Text>
            <View className="flex-row flex-wrap justify-between mb-6">
              <View className="w-[47%] bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
                <Text className="text-slate-500 text-[9px] font-black uppercase tracking-wider">My Students</Text>
                <Text className="text-slate-100 text-2xl font-black mt-2">{stats?.totalStudents ?? 0}</Text>
              </View>
              <View className="w-[47%] bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
                <Text className="text-slate-500 text-[9px] font-black uppercase tracking-wider">Active Batches</Text>
                <Text className="text-slate-100 text-2xl font-black mt-2">{stats?.totalCourses ?? 0}</Text>
              </View>
              <View className="w-[47%] bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
                <Text className="text-slate-500 text-[9px] font-black uppercase tracking-wider">Quizzes Created</Text>
                <Text className="text-emerald-400 text-2xl font-black mt-2">{stats?.totalTests ?? 0}</Text>
              </View>
              <View className="w-[47%] bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
                <Text className="text-slate-500 text-[9px] font-black uppercase tracking-wider">Resources Shared</Text>
                <Text className="text-slate-100 text-2xl font-black mt-2">{stats?.totalMaterials ?? 0}</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

