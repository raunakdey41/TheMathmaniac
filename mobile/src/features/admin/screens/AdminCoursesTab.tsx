import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, TextInput, ActivityIndicator } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { apiClient } from '../../../core/api/client';
import { useAuthStore } from '../../../core/store/auth';

const SUPERUSER_PHONES = ['+917980357754', '+919831754957'];

export const AdminCoursesTab: React.FC = () => {
  const { user, adminListCourses, adminEnrollStudent, adminAssignTeacher, adminRemoveTeacher, adminDeleteCourse, adminListUsers, isLoading } = useAuthStore();
  const [courses, setCourses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [enrollStudentId, setEnrollStudentId] = useState('');
  const [assignTeacherIds, setAssignTeacherIds] = useState<string[]>([]);
  const [loadingActions, setLoadingActions] = useState({ assignTeacher: false });
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  // Create Course Form State
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [newCourse, setNewCourse] = useState<{
    title: string; description: string; thumbnailUrl: string; price: string; categoryId: string; branch: string; targetClass: string; timeSlots: any[];
    isBundle: boolean; bundleCourseIds: string[];
  }>({
    title: '', description: '', thumbnailUrl: '', price: '', categoryId: '', branch: 'Sodepur', targetClass: '', timeSlots: [], isBundle: false, bundleCourseIds: []
  });

  const [slotDay, setSlotDay] = useState('Mon');
  const [slotTime, setSlotTime] = useState('');

  const handleAddSlot = () => {
    if (!slotTime.trim()) return;
    setNewCourse(prev => ({
      ...prev,
      timeSlots: [...prev.timeSlots, { day: slotDay, time: slotTime.trim() }]
    }));
    setSlotTime('');
  };

  const handleRemoveSlot = (idx: number) => {
    setNewCourse(prev => ({
      ...prev,
      timeSlots: prev.timeSlots.filter((_, i) => i !== idx)
    }));
  };

  const isSuperuser = user && SUPERUSER_PHONES.includes(user.phoneNumber);
  const isCourseCreator = user && user.phoneNumber?.includes('9831754957');

  const loadCourses = async () => {
    const data = await adminListCourses();
    setCourses(data);
  };

  const loadAllUsers = async () => {
    const st = await adminListUsers('', 'STUDENT');
    const te = await adminListUsers('', 'TEACHER');
    setStudents(st);
    setTeachers(te);
  };

  useEffect(() => {
    loadCourses();
    loadAllUsers();
    if (isCourseCreator) {
      apiClient.get('/courses/categories').then(res => {
        if (res.data.success) {
          setCategories(res.data.data);
          if (res.data.data.length > 0) {
            setNewCourse(prev => ({ ...prev, categoryId: res.data.data[0].id }));
          }
        }
      }).catch(console.error);
    }
  }, []);

  const handlePickThumbnail = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'image/*' });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setNewCourse({ ...newCourse, thumbnailUrl: result.assets[0].uri });
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleCreateCourse = async () => {
    if (!newCourse.title || !newCourse.description || !newCourse.price) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }
    const success = await useAuthStore.getState().adminCreateCourse({
      ...newCourse,
      price: parseInt(newCourse.price, 10) * 100, // Convert Rs to Paisa
      timeSlots: newCourse.timeSlots,
      branch: newCourse.branch,
      targetClass: newCourse.targetClass
    });
    if (success) {
      Alert.alert('Success', 'Course created successfully.');
      setNewCourse({ title: '', description: '', thumbnailUrl: '', price: '', categoryId: categories[0]?.id || '', branch: 'Sodepur', targetClass: '', timeSlots: [], isBundle: false, bundleCourseIds: [] });
      setShowCreateForm(false);
      loadCourses();
    } else {
      Alert.alert('Error', useAuthStore.getState().error || 'Failed to create course.');
    }
  };

  const handleEnroll = async (courseId: string) => {
    if (!enrollStudentId.trim()) {
      Alert.alert('Input Error', 'Please enter a Student ID.');
      return;
    }
    const success = await adminEnrollStudent(courseId, enrollStudentId.trim());
    if (success) {
      Alert.alert('Success', 'Student enrolled successfully.');
      setEnrollStudentId('');
      loadCourses();
    } else {
      const errorMsg = useAuthStore.getState().error || 'Failed to enroll student.';
      Alert.alert('Error', errorMsg);
    }
  };

  const handleAssignTeacher = async (courseId: string) => {
    if (assignTeacherIds.length === 0) {
      Alert.alert('Error', 'Please select at least one teacher to assign.');
      return;
    }
    setLoadingActions(prev => ({ ...prev, assignTeacher: true }));
    let successCount = 0;
    for (const tid of assignTeacherIds) {
      const success = await adminAssignTeacher(courseId, tid);
      if (success) successCount++;
    }
    setLoadingActions(prev => ({ ...prev, assignTeacher: false }));
    if (successCount > 0) {
      Alert.alert('Success', `Successfully assigned ${successCount} teacher(s).`);
      setAssignTeacherIds([]);
      loadCourses();
    } else {
      Alert.alert('Error', 'Failed to assign teachers.');
    }
  };

  const handleRemoveTeacher = (courseId: string, teacherId: string) => {
    Alert.alert('Confirm Remove', 'Are you sure you want to remove this teacher from the course?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const success = await adminRemoveTeacher(courseId, teacherId);
          if (success) {
            Alert.alert('Success', 'Teacher removed successfully.');
            loadCourses();
          } else {
            const errorMsg = useAuthStore.getState().error || 'Failed to remove teacher.';
            Alert.alert('Error', errorMsg);
          }
        }
      }
    ]);
  };

  const handleDeleteCourse = (courseId: string) => {
    Alert.alert('Confirm Delete', 'Are you sure you want to permanently remove this course? This will remove all enrollments and materials.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const success = await adminDeleteCourse(courseId);
          if (success) {
            Alert.alert('Success', 'Course deleted successfully.');
            loadCourses();
          } else {
            Alert.alert('Error', useAuthStore.getState().error || 'Failed to delete course.');
          }
        }
      }
    ]);
  };

  if (isLoading && courses.length === 0) {
    return (
      <View className="items-center py-20">
        <ActivityIndicator size="small" color="#2D8C82" />
      </View>
    );
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} className="flex-1" contentContainerStyle={{ paddingBottom: 300 }}>
      {/* Create Course Section (Shubhadeep Biswas Only) */}
      {isCourseCreator && (
        <View className="mb-6">
          <TouchableOpacity
            onPress={() => setShowCreateForm(!showCreateForm)}
            className="bg-blue-600 rounded-2xl py-3 items-center shadow-lg shadow-blue-500/20"
          >
            <Text className="text-white text-xs font-bold uppercase tracking-wider">{showCreateForm ? 'Cancel Course Creation' : '+ Create New Course'}</Text>
          </TouchableOpacity>

          {showCreateForm && (
            <View className="bg-slate-900 border border-slate-800 rounded-3xl p-5 mt-4">
              <Text className="text-slate-100 text-sm font-bold mb-4">Course Details</Text>
              
              <View className="flex-row items-center justify-between mb-4 mt-2">
                <Text className="text-slate-400 text-[10px] font-bold uppercase">Is this a Bundle / Batch?</Text>
                <TouchableOpacity 
                  onPress={() => setNewCourse({...newCourse, isBundle: !newCourse.isBundle})}
                  className={`w-12 h-6 rounded-full justify-center px-1 ${newCourse.isBundle ? 'bg-blue-600' : 'bg-slate-700'}`}
                >
                  <View className={`w-4 h-4 rounded-full bg-white transition-all ${newCourse.isBundle ? 'ml-auto' : ''}`} />
                </TouchableOpacity>
              </View>

              <Text className="text-slate-400 text-[10px] font-bold uppercase mb-2">Title</Text>
              <TextInput className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 text-xs mb-3" placeholder="Course Title" placeholderTextColor="#5C5446" value={newCourse.title} onChangeText={(t) => setNewCourse({...newCourse, title: t})} />

              {!newCourse.isBundle ? (
                <View className="mb-4">
                  <Text className="text-slate-400 text-[10px] font-bold uppercase mb-2">Timings & Time Slots</Text>
                  <View className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                    <View className="flex-row mb-3">
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day => (
                          <TouchableOpacity 
                            key={day} 
                            onPress={() => setSlotDay(day)}
                            className={`px-3 py-1.5 rounded-lg mr-2 ${slotDay === day ? 'bg-blue-600' : 'bg-slate-800'}`}
                          >
                            <Text className={`text-xs font-bold ${slotDay === day ? 'text-white' : 'text-slate-400'}`}>{day}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                    <View className="flex-row">
                      <TextInput className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-xs mr-2" placeholder="e.g. 10:00 AM" placeholderTextColor="#5C5446" value={slotTime} onChangeText={setSlotTime} />
                      <TouchableOpacity onPress={handleAddSlot} className="bg-slate-700 px-4 justify-center rounded-lg">
                        <Text className="text-white text-xs font-bold">Add</Text>
                      </TouchableOpacity>
                    </View>
                    {newCourse.timeSlots.length > 0 && (
                      <View className="mt-3 flex-row flex-wrap gap-2">
                        {newCourse.timeSlots.map((slot, idx) => (
                          <View key={idx} className="bg-blue-900/50 border border-blue-500/30 px-2 py-1 rounded-md flex-row items-center">
                            <Text className="text-blue-300 text-[10px] font-bold">{slot.day} {slot.time}</Text>
                            <TouchableOpacity onPress={() => handleRemoveSlot(idx)} className="ml-2 bg-red-500/20 rounded-full w-4 h-4 items-center justify-center">
                              <Text className="text-red-400 text-[8px] font-black">×</Text>
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              ) : (
                <View className="mb-4">
                  <Text className="text-slate-400 text-[10px] font-bold uppercase mb-2">Select Courses for Bundle</Text>
                  <View style={{ maxHeight: 180 }} className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                    <ScrollView nestedScrollEnabled className="p-2">
                      {courses.filter(c => !c.isBundle).map(courseItem => {
                        const isSelected = newCourse.bundleCourseIds.includes(courseItem.id);
                        return (
                          <TouchableOpacity 
                            key={courseItem.id} 
                            onPress={() => setNewCourse(prev => ({
                              ...prev,
                              bundleCourseIds: isSelected 
                                ? prev.bundleCourseIds.filter(id => id !== courseItem.id) 
                                : [...prev.bundleCourseIds, courseItem.id]
                            }))}
                            className={`p-3 rounded-lg border mb-1 flex-row justify-between items-center ${isSelected ? 'bg-blue-600/20 border-blue-500' : 'bg-slate-900 border-slate-800'}`}
                          >
                            <View>
                              <Text className={`text-xs font-bold ${isSelected ? 'text-blue-400' : 'text-slate-200'}`}>{courseItem.title}</Text>
                            </View>
                            {isSelected && (
                              <View className="bg-blue-500 rounded-full w-4 h-4 items-center justify-center">
                                <Text className="text-white text-[9px] font-black">✓</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                      {courses.filter(c => !c.isBundle).length === 0 && (
                        <Text className="text-slate-500 text-xs text-center py-4">No regular courses available to bundle.</Text>
                      )}
                    </ScrollView>
                  </View>
                </View>
              )}
              
              <Text className="text-slate-400 text-[10px] font-bold uppercase mb-2">Description</Text>
              <TextInput className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 text-xs mb-3" placeholder="Course Description" placeholderTextColor="#5C5446" value={newCourse.description} onChangeText={(t) => setNewCourse({...newCourse, description: t})} multiline />

              <Text className="text-slate-400 text-[10px] font-bold uppercase mb-2">Price (in Rs)</Text>
              <TextInput className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 text-xs mb-3" placeholder="e.g. 500" placeholderTextColor="#5C5446" value={newCourse.price} onChangeText={(t) => setNewCourse({...newCourse, price: t})} keyboardType="number-pad" />

              <Text className="text-slate-400 text-[10px] font-bold uppercase mb-2">Target Class</Text>
              <TextInput className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 text-xs mb-3" placeholder="e.g. 11th" placeholderTextColor="#5C5446" value={newCourse.targetClass} onChangeText={(t) => setNewCourse({...newCourse, targetClass: t})} />

              <Text className="text-slate-400 text-[10px] font-bold uppercase mb-2">Branch</Text>
              <View className="flex-row gap-4 mb-3">
                {['Sodepur', 'Madhyamgram'].map(b => (
                  <TouchableOpacity
                    key={b}
                    onPress={() => setNewCourse({...newCourse, branch: b})}
                    className={`px-4 py-2 rounded-xl border flex-1 items-center ${newCourse.branch === b ? 'bg-blue-600 border-blue-500' : 'bg-slate-950 border-slate-800'}`}
                  >
                    <Text className={`text-xs font-bold ${newCourse.branch === b ? 'text-white' : 'text-slate-400'}`}>{b}</Text>
                  </TouchableOpacity>
                ))}
              </View>


              <Text className="text-slate-400 text-[10px] font-bold uppercase mb-2">Course Image (Optional)</Text>
              <TouchableOpacity 
                onPress={handlePickThumbnail} 
                className="bg-slate-950 border border-slate-800 border-dashed rounded-xl px-4 py-4 mb-3 items-center"
              >
                {newCourse.thumbnailUrl ? (
                  <Text className="text-emerald-400 text-xs font-bold">Image Selected: {newCourse.thumbnailUrl.substring(newCourse.thumbnailUrl.lastIndexOf('/') + 1)}</Text>
                ) : (
                  <Text className="text-slate-400 text-xs font-bold">+ Upload Image</Text>
                )}
              </TouchableOpacity>

              {categories.length > 0 && (
                <View>
                  <Text className="text-slate-400 text-[10px] font-bold uppercase mb-2">Category</Text>
                  <View className="flex-row flex-wrap gap-2 mb-4">
                    {categories.map(cat => (
                      <TouchableOpacity key={cat.id} onPress={() => setNewCourse({...newCourse, categoryId: cat.id})} className={`px-3 py-2 rounded-xl border ${newCourse.categoryId === cat.id ? 'bg-blue-600 border-blue-500' : 'bg-slate-950 border-slate-800'}`}>
                        <Text className={`text-[10px] font-bold ${newCourse.categoryId === cat.id ? 'text-white' : 'text-slate-400'}`}>{cat.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              <TouchableOpacity onPress={handleCreateCourse} className="bg-emerald-600 rounded-2xl py-3.5 items-center mt-2">
                <Text className="text-white text-xs font-bold uppercase tracking-wider">Publish Course</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {courses.length === 0 ? (
        <View className="items-center py-20 bg-slate-900/10 border border-dashed border-slate-800 rounded-2xl">
          <Text className="text-slate-500 font-bold text-sm">No courses found.</Text>
        </View>
      ) : (
        courses.map((course) => (
          <View key={course.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
            <Text className="text-slate-100 text-base font-black mb-1">{course.title}</Text>
            <Text className="text-slate-400 text-xs mb-3">{course.category?.name || 'Uncategorized'}</Text>
            
            <View className="flex-row items-center mb-3">
              <View className="bg-blue-900/20 border border-blue-500/30 px-2.5 py-1 rounded-lg mr-2">
                <Text className="text-blue-400 text-[10px] font-bold">Students: {course._count?.purchases || 0}</Text>
              </View>
              <View className="bg-purple-900/20 border border-purple-500/30 px-2.5 py-1 rounded-lg">
                <Text className="text-purple-400 text-[10px] font-bold">Teachers: {course.teachers?.length || 0}</Text>
              </View>
            </View>

            {/* Teacher List */}
            {course.teachers && course.teachers.length > 0 && (
              <View className="mb-3">
                <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Assigned Teachers</Text>
                {course.teachers.map((t: any) => (
                  <View key={t.userId} className="flex-row justify-between items-center bg-slate-950 p-2 rounded-lg border border-slate-800 mb-1">
                    <View>
                      <Text className="text-slate-300 text-xs font-semibold">{t.user?.name}</Text>
                      <Text className="text-slate-500 text-[10px]">{t.user?.email || 'No email'}</Text>
                    </View>
                    {isSuperuser && (
                      <TouchableOpacity onPress={() => handleRemoveTeacher(course.id, t.userId)} className="bg-red-500/10 px-2 py-1 rounded-md">
                        <Text className="text-red-400 text-[10px] font-bold">Remove</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Student List */}
            {course.purchases && course.purchases.length > 0 && (
              <View className="mb-3">
                <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Enrolled Students</Text>
                {course.purchases.map((p: any) => (
                  <View key={p.id} className="flex-row justify-between items-center bg-slate-950 p-2 rounded-lg border border-slate-800 mb-1">
                    <View>
                      <Text className="text-slate-300 text-xs font-semibold">{p.user?.name}</Text>
                      <Text className="text-slate-500 text-[10px]">{p.user?.email || 'No email'}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Action Buttons */}
            <View className="flex-row gap-2 mt-2 pt-3 border-t border-slate-850">
              <TouchableOpacity
                onPress={() => setSelectedCourseId(selectedCourseId === course.id ? null : course.id)}
                className="flex-1 bg-slate-800 border border-slate-700/50 py-2 rounded-xl items-center"
              >
                <Text className="text-slate-200 text-xs font-bold">{selectedCourseId === course.id ? 'Close Actions' : 'Manage Course'}</Text>
              </TouchableOpacity>
            </View>

            {/* Manage Form */}
            {selectedCourseId === course.id && (
              <View className="mt-4 pt-4 border-t border-slate-800/50">
                
                {/* Enroll Student (Admins & Superusers) */}
                <View className="mb-4">
                  <Text className="text-slate-400 text-[10px] font-bold uppercase mb-2">
                    Enroll Student {course.targetClass ? `(Class ${course.targetClass})` : '(All Classes)'}
                  </Text>
                  
                  <View style={{ maxHeight: 160 }} className="bg-slate-950 border border-slate-800 rounded-xl mb-3 overflow-hidden">
                    <ScrollView nestedScrollEnabled className="p-2">
                      {students.filter(s => !course.targetClass || s.class === course.targetClass).map(student => (
                        <TouchableOpacity 
                          key={student.id} 
                          onPress={() => setEnrollStudentId(student.id)}
                          className={`p-3 rounded-lg border mb-1 flex-row justify-between items-center ${enrollStudentId === student.id ? 'bg-blue-600/20 border-blue-500' : 'bg-slate-900 border-slate-800'}`}
                        >
                          <View>
                            <Text className={`text-xs font-bold ${enrollStudentId === student.id ? 'text-blue-400' : 'text-slate-200'}`}>{student.name}</Text>
                            <Text className={`text-[10px] mt-0.5 ${enrollStudentId === student.id ? 'text-blue-300/70' : 'text-slate-500'}`}>
                              {student.phoneNumber} {student.class ? `| Class ${student.class}` : ''}
                            </Text>
                          </View>
                          {enrollStudentId === student.id && (
                            <View className="bg-blue-500 rounded-full w-4 h-4 items-center justify-center">
                              <Text className="text-white text-[9px] font-black">✓</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      ))}
                      {students.filter(s => !course.targetClass || s.class === course.targetClass).length === 0 && (
                        <Text className="text-slate-500 text-xs text-center py-4">No students found for this class.</Text>
                      )}
                    </ScrollView>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleEnroll(course.id)}
                    className="bg-[#2D8C82] py-3.5 rounded-xl items-center"
                  >
                    <Text className="text-white text-xs font-bold uppercase tracking-wider">Enroll Selected Student</Text>
                  </TouchableOpacity>
                </View>

                {/* Assign Teacher (Superusers Only) */}
                {isSuperuser && (
                  <View className="mb-4">
                    <Text className="text-slate-400 text-[10px] font-bold uppercase mb-2">Assign Teacher</Text>
                    
                    <View style={{ maxHeight: 160 }} className="bg-slate-950 border border-slate-800 rounded-xl mb-3 overflow-hidden">
                      <ScrollView nestedScrollEnabled className="p-2">
                        {teachers.map(teacher => {
                          const isSelected = assignTeacherIds.includes(teacher.id);
                          return (
                            <TouchableOpacity 
                              key={teacher.id} 
                              onPress={() => setAssignTeacherIds(prev => isSelected ? prev.filter(id => id !== teacher.id) : [...prev, teacher.id])}
                              className={`p-3 rounded-lg border mb-1 flex-row justify-between items-center ${isSelected ? 'bg-purple-600/20 border-purple-500' : 'bg-slate-900 border-slate-800'}`}
                            >
                              <View>
                                <Text className={`text-xs font-bold ${isSelected ? 'text-purple-400' : 'text-slate-200'}`}>{teacher.name}</Text>
                                <Text className={`text-[10px] mt-0.5 ${isSelected ? 'text-purple-300/70' : 'text-slate-500'}`}>
                                  {teacher.phoneNumber} {teacher.subjects ? `| Subjects: ${teacher.subjects}` : ''}
                                </Text>
                              </View>
                              {isSelected && (
                                <View className="bg-purple-500 rounded-full w-4 h-4 items-center justify-center">
                                  <Text className="text-white text-[9px] font-black">✓</Text>
                                </View>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                        {teachers.length === 0 && (
                          <Text className="text-slate-500 text-xs text-center py-4">No teachers found.</Text>
                        )}
                      </ScrollView>
                    </View>

                    <TouchableOpacity
                      onPress={() => handleAssignTeacher(course.id)}
                      className="bg-purple-600 py-3.5 rounded-xl items-center"
                    >
                      <Text className="text-white text-xs font-bold uppercase tracking-wider">Assign Selected Teachers</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Delete Course (Superusers Only) */}
                {isSuperuser && (
                  <TouchableOpacity
                    onPress={() => handleDeleteCourse(course.id)}
                    className="bg-red-500/10 border border-red-500/20 py-3 rounded-xl items-center mt-2"
                  >
                    <Text className="text-red-400 text-xs font-bold uppercase tracking-wider">Delete Course</Text>
                  </TouchableOpacity>
                )}

              </View>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
};
