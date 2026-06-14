import { create } from 'zustand';

export interface AnswerItem {
  questionId: string;
  optionId?: string;
  optionIds?: string[];
  numericalAnswer?: string;
}

interface TestState {
  testId: string | null;
  duration: number; // minutes
  timeLeft: number; // seconds
  answers: Record<string, AnswerItem>; // questionId -> Answer
  isTestActive: boolean;

  startTest: (testId: string, durationMinutes: number) => void;
  selectSingleOption: (questionId: string, optionId: string) => void;
  selectMultipleOptions: (questionId: string, optionIds: string[]) => void;
  setNumericalAnswer: (questionId: string, value: string) => void;
  tickTimer: () => void;
  submitTestLocal: () => AnswerItem[];
  clearTest: () => void;
}

export const useActiveTestStore = create<TestState>((set, get) => ({
  testId: null,
  duration: 0,
  timeLeft: 0,
  answers: {},
  isTestActive: false,

  startTest: (testId: string, durationMinutes: number) => {
    set({
      testId,
      duration: durationMinutes,
      timeLeft: durationMinutes * 60,
      answers: {},
      isTestActive: true,
    });
  },

  selectSingleOption: (questionId: string, optionId: string) => {
    set((state) => ({
      answers: {
        ...state.answers,
        [questionId]: { questionId, optionId },
      },
    }));
  },

  selectMultipleOptions: (questionId: string, optionIds: string[]) => {
    set((state) => ({
      answers: {
        ...state.answers,
        [questionId]: { questionId, optionIds },
      },
    }));
  },

  setNumericalAnswer: (questionId: string, value: string) => {
    set((state) => ({
      answers: {
        ...state.answers,
        [questionId]: { questionId, numericalAnswer: value },
      },
    }));
  },

  tickTimer: () => {
    set((state) => {
      const newTime = state.timeLeft - 1;
      if (newTime <= 0) {
        return {
          timeLeft: 0,
          isTestActive: false,
        };
      }
      return { timeLeft: newTime };
    });
  },

  submitTestLocal: () => {
    const { answers } = get();
    return Object.values(answers);
  },

  clearTest: () => {
    set({
      testId: null,
      duration: 0,
      timeLeft: 0,
      answers: {},
      isTestActive: false,
    });
  },
}));
