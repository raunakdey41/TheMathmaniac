import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { apiClient } from '../../../core/api/client';
import { useAuthStore } from '../../../core/store/auth';
import { Button } from '../../../shared/components/Button';

export const AdminRoutineTab: React.FC = () => {
  const { user, adminListUsers } = useAuthStore();
  const isShubhadeep = user?.name?.toLowerCase().includes('shubhadeep');

  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [teachers, setTeachers] = useState<any[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [title, setTitle] = useState('');
  const [campus, setCampus] = useState<'Madhyamgram' | 'Sodepur'>('Madhyamgram');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [className, setClassName] = useState('');
  const [subject, setSubject] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
    if (isShubhadeep) {
      loadTeachers();
    }
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/attendance/teacher/schedule');
      if (res.data.success) {
        setSchedules(res.data.data);
      }
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.error || 'Failed to load routines.');
    } finally {
      setLoading(false);
    }
  };

  const loadTeachers = async () => {
    try {
      const data = await adminListUsers('', 'TEACHER');
      setTeachers(data);
    } catch (e) {
      console.error('Failed to load teachers', e);
    }
  };

  const handleCreate = async () => {
    if (!selectedTeacherId || !title || !date || !startTime || !endTime || !className || !subject) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    // Basic format validation
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      Alert.alert('Format Error', 'Date must be in YYYY-MM-DD format.');
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
      Alert.alert('Format Error', 'Times must be in HH:MM format (24-hour).');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await apiClient.post('/attendance/teacher/schedule', {
        teacherId: selectedTeacherId,
        title,
        campus,
        date,
        startTime,
        endTime,
        className,
        subject
      });

      if (res.data.success) {
        Alert.alert('Success', 'Routine created successfully!');
        // Reset form
        setTitle('');
        setDate('');
        setStartTime('');
        setEndTime('');
        setClassName('');
        setSubject('');
        setSelectedTeacherId('');
        
        loadData(); // refresh list
      }
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.error || 'Failed to create routine.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center py-20">
        <ActivityIndicator size="small" color="#2D8C82" />
      </View>
    );
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
      {/* Create Form - Only visible to Shubhadeep */}
      {isShubhadeep && (
        <View className="bg-slate-900 border border-slate-800 rounded-3xl p-5 mb-6">
          <Text className="text-slate-100 text-base font-bold mb-5">Create New Routine</Text>
          
          <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">Teacher</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
            {teachers.map(t => (
              <TouchableOpacity
                key={t.id}
                onPress={() => setSelectedTeacherId(t.id)}
                className={`mr-2 px-4 py-2.5 rounded-xl border ${
                  selectedTeacherId === t.id ? 'bg-blue-600 border-blue-500' : 'bg-slate-950 border-slate-800'
                }`}
              >
                <Text className={`text-xs font-bold ${selectedTeacherId === t.id ? 'text-white' : 'text-slate-400'}`}>
                  {t.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">Routine Title</Text>
          <TextInput
            className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 text-sm font-semibold mb-4"
            placeholder="e.g. Morning Batch"
            placeholderTextColor="#5C5446"
            value={title}
            onChangeText={setTitle}
          />

          <View className="flex-row gap-3 mb-4">
            <View className="flex-1">
              <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">Class</Text>
              <TextInput
                className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 text-sm font-semibold"
                placeholder="e.g. Class 11"
                placeholderTextColor="#5C5446"
                value={className}
                onChangeText={setClassName}
              />
            </View>
            <View className="flex-1">
              <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">Subject</Text>
              <TextInput
                className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 text-sm font-semibold"
                placeholder="e.g. Physics"
                placeholderTextColor="#5C5446"
                value={subject}
                onChangeText={setSubject}
              />
            </View>
          </View>

          <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">Campus</Text>
          <View className="flex-row bg-slate-950 p-1 rounded-xl mb-4 border border-slate-800">
            {['Madhyamgram', 'Sodepur'].map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => setCampus(c as any)}
                className={`flex-1 py-2.5 rounded-lg items-center ${campus === c ? 'bg-slate-800' : 'bg-transparent'}`}
              >
                <Text className={`font-black text-[10px] uppercase tracking-wider ${campus === c ? 'text-slate-100' : 'text-slate-500'}`}>
                  {c}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">Date</Text>
          <TextInput
            className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 text-sm font-semibold mb-4"
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#5C5446"
            value={date}
            onChangeText={setDate}
          />

          <View className="flex-row gap-3 mb-6">
            <View className="flex-1">
              <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">Start Time</Text>
              <TextInput
                className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 text-sm font-semibold"
                placeholder="HH:MM"
                placeholderTextColor="#5C5446"
                value={startTime}
                onChangeText={setStartTime}
              />
            </View>
            <View className="flex-1">
              <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">End Time</Text>
              <TextInput
                className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 text-sm font-semibold"
                placeholder="HH:MM"
                placeholderTextColor="#5C5446"
                value={endTime}
                onChangeText={setEndTime}
              />
            </View>
          </View>

          <Button title="Create Routine" onPress={handleCreate} loading={isSubmitting} />
        </View>
      )}

      {/* Routine Viewer List */}
      <View>
        <Text className="text-slate-100 text-base font-bold mb-4">Institute Routines</Text>
        {schedules.length === 0 ? (
          <View className="items-center py-10 bg-slate-900/10 border border-dashed border-slate-800 rounded-2xl">
            <Text className="text-slate-500 font-bold text-sm">No routines found.</Text>
          </View>
        ) : (
          schedules.map((schedule) => (
            <View key={schedule.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-3">
              <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1 mr-2">
                  <Text className="text-slate-100 text-sm font-black">{schedule.title}</Text>
                  {schedule.user && (
                    <Text className="text-emerald-400 text-xs mt-1 font-bold">
                      👨‍🏫 {schedule.user.name}
                    </Text>
                  )}
                  <View className="flex-row flex-wrap gap-2 mt-2">
                    {schedule.class && (
                      <View className="bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800">
                        <Text className="text-[10px] text-slate-400 font-medium">Class: {schedule.class}</Text>
                      </View>
                    )}
                    {schedule.subject && (
                      <View className="bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800">
                        <Text className="text-[10px] text-slate-400 font-medium">Subject: {schedule.subject}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View className="px-2.5 py-0.5 rounded-full border bg-blue-900/20 border-blue-500/30">
                  <Text className="text-[8px] font-black uppercase tracking-wider text-blue-400">
                    {schedule.campus}
                  </Text>
                </View>
              </View>

              <View className="flex-row justify-between items-center mt-3 pt-3 border-t border-slate-850">
                <Text className="text-[10px] text-slate-400 font-semibold">📅 {schedule.date}</Text>
                <Text className="text-[10px] text-slate-400 font-semibold">⏱️ {schedule.startTime} - {schedule.endTime}</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};
