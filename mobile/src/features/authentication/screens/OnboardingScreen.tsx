import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, Dimensions } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../../navigation/types';
import { Button } from '../../../shared/components/Button';

type OnboardingScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Onboarding'>;

interface Props {
  navigation: OnboardingScreenNavigationProp;
}

const { width } = Dimensions.get('window');

const slides = [
  {
    title: 'Learn Math, Mathemaniac Style',
    description: 'Instant, bite-sized lessons, formula sheets, and mock tests at your fingertips. No bloat, just speed.',
    icon: '⚡',
    color: 'text-blue-500',
  },
  {
    title: 'Premium Video Learning',
    description: 'Interactive chapter markers, playback speeds, and auto-resume. Designed for short attention spans.',
    icon: '🎬',
    color: 'text-emerald-400',
  },
  {
    title: 'Gamified Practice Quizzes',
    description: 'Solve single correct, multi-correct, and numericals. View instant leaderboard standings.',
    icon: '🏆',
    color: 'text-amber-400',
  },
];

export const OnboardingScreen: React.FC<Props> = ({ navigation }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      navigation.replace('Login');
    }
  };

  const handleSkip = () => {
    navigation.replace('Login');
  };

  return (
    <View className="flex-1 bg-slate-950 justify-between px-6 pt-16 pb-12">
      {/* Header Skip */}
      <View className="flex-row justify-end">
        <TouchableOpacity onPress={handleSkip}>
          <Text className="text-slate-400 text-sm font-medium">Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Main Slide Carousel Content */}
      <View className="items-center my-auto">
        <Text className="text-8xl mb-8">{slides[currentSlide].icon}</Text>
        <Text className="text-slate-100 text-2xl font-bold text-center px-4">
          {slides[currentSlide].title}
        </Text>
        <Text className="text-slate-400 text-sm text-center mt-4 px-6 leading-6">
          {slides[currentSlide].description}
        </Text>
      </View>

      {/* Slide Indicators & Buttons */}
      <View className="w-full">
        {/* Indicators */}
        <View className="flex-row justify-center mb-8">
          {slides.map((_, index) => (
            <View
              key={index}
              className={`h-2 rounded-full mx-1 ${
                index === currentSlide ? 'w-6 bg-blue-600' : 'w-2 bg-slate-700'
              }`}
            />
          ))}
        </View>

        {/* Action Button */}
        <Button
          title={currentSlide === slides.length - 1 ? 'Get Started' : 'Next'}
          onPress={handleNext}
          variant="primary"
        />
      </View>
    </View>
  );
};
