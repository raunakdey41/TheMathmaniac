import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';
import { styled } from 'nativewind';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  className?: string;
  style?: any;
}

const BaseButton: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  className = '',
  style,
}) => {
  const isDark = true; // Premium Dark Theme defaults

  // Tailwind styling mappings
  let containerStyles = 'flex-row items-center justify-center py-4 px-6 rounded-2xl active:opacity-80 transition-all ';
  let textStyles = 'font-semibold text-base ';

  switch (variant) {
    case 'primary':
      containerStyles += 'bg-blue-600';
      textStyles += 'text-white';
      break;
    case 'secondary':
      containerStyles += 'bg-emerald-500';
      textStyles += 'text-slate-100'; // Maps to dark text #15100A
      break;
    case 'outline':
      containerStyles += 'border border-slate-700 bg-transparent';
      textStyles += 'text-slate-400'; // Maps to dark brown text #342C1C
      break;
    case 'danger':
      containerStyles += 'bg-red-500';
      textStyles += 'text-white';
      break;
  }

  if (disabled || loading) {
    containerStyles += ' opacity-50';
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      className={`${containerStyles} ${className}`}
      style={style}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'secondary' ? '#0F172A' : '#FFFFFF'} />
      ) : (
        <View className="flex-row items-center justify-center">
          {icon && <View className="mr-2">{icon}</View>}
          <Text className={textStyles}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

export const Button = styled(BaseButton);

