// User types
export interface User {
  id: string;
  email: string;
  username: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  userId: string;
  displayName?: string;
  bio?: string;
  country?: string;
  keyboard?: string;
  preferredLanguage: string;
  isPublic: boolean;
}

export interface UserWithProfile extends User {
  profile?: UserProfile;
}

// Authentication types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  username: string;
  exp: number;
}

// Test types
export interface TestText {
  id: string;
  title: string;
  content: string;
  language: string;
  difficulty: 'easy' | 'medium' | 'hard';
  wordCount: number;
  createdAt: string;
}

export interface TestResult {
  id: string;
  userId: string;
  testTextId: string;
  wpm: number;
  accuracy: number;
  errors: number;
  timeTaken: number;
  keystrokeData?: string;
  completedAt: string;
}

export interface TestResultWithText extends TestResult {
  testText: Pick<TestText, 'title' | 'language' | 'difficulty'>;
}

export interface SubmitResultRequest {
  testTextId: string;
  wpm: number;
  accuracy: number;
  errors: number;
  timeTaken: number;
  keystrokeData?: string;
}

// Statistics types
export interface UserStats {
  totalTests: number;
  avgWpm: number;
  bestWpm: number;
  avgAccuracy: number;
  bestAccuracy: number;
  totalErrors: number;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  bestWpm: number;
  avgWpm: number;
  avgAccuracy: number;
  testCount: number;
}

// Typing engine types
export interface KeystrokeEvent {
  key: string;
  timestamp: number;
  correct: boolean;
  position: number;
}

export interface TypingMetrics {
  wpm: number;
  accuracy: number;
  errors: number;
  progress: number;
  timeElapsed: number;
}

// Multiplayer types
export interface MultiplayerRoom {
  id: string;
  name: string;
  hostId: string;
  testTextId: string;
  maxPlayers: number;
  status: 'waiting' | 'active' | 'finished';
  startedAt?: string;
  finishedAt?: string;
  createdAt: string;
}

export interface RoomParticipant {
  id: string;
  roomId: string;
  userId: string;
  joinedAt: string;
  finishedAt?: string;
  finalWpm?: number;
  finalAccuracy?: number;
}

// WebSocket types
export interface WSMessage {
  type: string;
  data?: any;
  timestamp: number;
}

export interface TypingProgress {
  userId: string;
  progress: number;
  wpm: number;
  accuracy: number;
  errors: number;
  timestamp: number;
}

// Multiplayer WebSocket message types
export type WSMessageType =
  | 'ping'
  | 'pong'
  | 'authenticate'
  | 'authenticated'
  | 'join_room'
  | 'leave_room'
  | 'room_joined'
  | 'room_left'
  | 'room_updated'
  | 'participant_joined'
  | 'participant_left'
  | 'start_race'
  | 'race_countdown'
  | 'race_started'
  | 'race_finished'
  | 'typing_progress'
  | 'participant_finished'
  | 'connected'
  | 'error';

export type Difficulty = 'easy' | 'medium' | 'hard';
export type TestType = 'text' | 'punctuation' | 'numbers' | 'quotes';
export type TestMode = 'timer' | 'words';

export interface JoinRoomMessage extends WSMessage {
  type: 'join_room';
  data: {
    roomId: string;
    userId: string;
    username: string;
  };
}

export interface TypingProgressMessage extends WSMessage {
  type: 'typing_progress';
  data: {
    roomId: string;
    userId: string;
    progress: number;
    wpm: number;
    accuracy: number;
    errors: number;
  };
}

export interface RoomUpdatedMessage extends WSMessage {
  type: 'room_updated';
  data: {
    room: {
      id: string;
      name: string;
      status: string;
      participants: Array<{
        userId: string;
        username: string;
        progress: number;
        wpm: number;
        accuracy: number;
        errors: number;
        finished: boolean;
      }>;
    };
  };
}

export interface CountdownMessage extends WSMessage {
  type: 'race_countdown';
  data: {
    roomId: string;
    countdown: number;
  };
}

export interface RaceStartedMessage extends WSMessage {
  type: 'race_started';
  data: {
    roomId: string;
    startTime: number;
  };
}

export interface MultiplayerRoomWithDetails extends MultiplayerRoom {
  host: {
    id: string;
    username: string;
  };
  testText: {
    id: string;
    title: string;
    difficulty: string;
    wordCount: number;
  };
  currentPlayers: number;
}

// API Response types
export interface ApiResponse<T = any> {
  message?: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Configuration types
export interface TestConfiguration {
  timeLimit?: number;
  wordLimit?: number;
  language: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

// Error types
export interface ApiError {
  message: string;
  code?: string;
  status: number;
}

// Phase 4: Advanced Analytics Types

// Keystroke analytics
export interface KeystrokeAnalytics {
  id: string;
  testResultId: string;
  userId: string;
  keystrokeData: KeystrokeEvent[];
  averageKeystrokeTime: number;
  keystrokeVariance: number;
  typingRhythm: number;
  createdAt: string;
}

// Enhanced keystroke event with timing data
export interface DetailedKeystrokeEvent extends KeystrokeEvent {
  timeSincePrevious?: number;
  expectedChar: string;
  actualChar: string;
  isBackspace: boolean;
  wordIndex: number;
  characterIndex: number;
}

// Error analytics
export interface ErrorAnalytics {
  id: string;
  testResultId: string;
  userId: string;
  characterErrors: Record<string, number>;
  wordErrors: Record<string, number>;
  errorPatterns: ErrorPattern[];
  mostProblematicChars: string[];
  createdAt: string;
}

export interface ErrorPattern {
  pattern: string;
  frequency: number;
  context: string;
  suggestions: string[];
}

// Performance insights
export interface PerformanceInsights {
  id: string;
  userId: string;
  timeframe: 'daily' | 'weekly' | 'monthly';
  date: string;
  avgWpm: number;
  avgAccuracy: number;
  testCount: number;
  totalTimeSpent: number;
  improvementRate: number;
  consistencyScore: number;
  createdAt: string;
  updatedAt: string;
}

// User goals
export interface UserGoal {
  id: string;
  userId: string;
  goalType: 'wpm' | 'accuracy' | 'consistency' | 'daily_tests';
  targetValue: number;
  currentValue: number;
  targetDate?: string;
  isActive: boolean;
  isAchieved: boolean;
  achievedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Achievements
export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: 'speed' | 'accuracy' | 'consistency' | 'milestone';
  criteria: AchievementCriteria;
  badgeIcon?: string;
  points: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  isActive: boolean;
  createdAt: string;
}

export interface AchievementCriteria {
  type: string;
  value: number;
  comparison: 'gte' | 'lte' | 'eq';
  timeframe?: string;
  additionalConditions?: Record<string, any>;
}

export interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  unlockedAt: string;
  progress: number;
  achievement?: Achievement;
}

// Recommendations
export interface UserRecommendation {
  id: string;
  userId: string;
  type: 'practice_focus' | 'goal_suggestion' | 'improvement_tip';
  title: string;
  description: string;
  actionData?: Record<string, any>;
  priority: number;
  isRead: boolean;
  isApplied: boolean;
  validUntil?: string;
  createdAt: string;
}

// Practice sessions
export interface PracticeSession {
  id: string;
  userId: string;
  focusArea: 'speed' | 'accuracy' | 'specific_chars' | 'words';
  targetContent?: string;
  sessionData: PracticeSessionData;
  duration: number;
  improvementScore: number;
  createdAt: string;
}

export interface PracticeSessionData {
  exercises: PracticeExercise[];
  results: PracticeResult[];
  configuration: PracticeConfiguration;
}

export interface PracticeExercise {
  type: string;
  content: string;
  targetMetric: string;
  difficulty: number;
}

export interface PracticeResult {
  exerciseIndex: number;
  wpm: number;
  accuracy: number;
  errors: number;
  timeTaken: number;
  improvement: number;
}

export interface PracticeConfiguration {
  duration: number;
  focusChars?: string[];
  focusWords?: string[];
  difficultyLevel: number;
  adaptiveDifficulty: boolean;
}

// Analytics dashboard types
export interface AnalyticsDashboard {
  overview: AnalyticsOverview;
  progressCharts: ProgressChart[];
  errorAnalysis: ErrorAnalysisSummary;
  recommendations: UserRecommendation[];
  achievements: UserAchievement[];
  goals: UserGoal[];
}

export interface AnalyticsOverview {
  totalTests: number;
  totalTimeSpent: number;
  averageWpm: number;
  averageAccuracy: number;
  improvementRate: number;
  consistencyScore: number;
  currentStreak: number;
  longestStreak: number;
}

export interface ProgressChart {
  type: 'wpm' | 'accuracy' | 'consistency' | 'time_spent';
  timeframe: 'daily' | 'weekly' | 'monthly';
  data: ChartDataPoint[];
  trend: 'improving' | 'declining' | 'stable';
  trendPercentage: number;
}

export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface ErrorAnalysisSummary {
  mostProblematicChars: CharacterError[];
  mostProblematicWords: WordError[];
  commonPatterns: ErrorPattern[];
  improvementAreas: string[];
}

export interface CharacterError {
  character: string;
  errorCount: number;
  errorRate: number;
  suggestions: string[];
}

export interface WordError {
  word: string;
  errorCount: number;
  errorRate: number;
  commonMistakes: string[];
}

// Heatmap data for character-level accuracy
export interface AccuracyHeatmap {
  characters: HeatmapCell[];
  maxValue: number;
  minValue: number;
}

export interface HeatmapCell {
  character: string;
  accuracy: number;
  frequency: number;
  color: string;
}

// Advanced statistics
export interface AdvancedStats {
  keystrokeAnalytics: KeystrokeStats;
  rhythmAnalysis: TypingRhythm;
  errorPatterns: ErrorPattern[];
  performanceTrends: PerformanceTrend[];
  personalBests: PersonalBest[];
}

export interface KeystrokeStats {
  averageTime: number;
  variance: number;
  fastestKeys: KeySpeed[];
  slowestKeys: KeySpeed[];
  mostAccurateKeys: KeyAccuracy[];
  leastAccurateKeys: KeyAccuracy[];
}

export interface KeySpeed {
  key: string;
  averageTime: number;
  frequency: number;
}

export interface KeyAccuracy {
  key: string;
  accuracy: number;
  frequency: number;
}

export interface TypingRhythm {
  consistency: number;
  burstTyping: boolean;
  averageBurstLength: number;
  pauseFrequency: number;
  rhythmScore: number;
}

export interface PerformanceTrend {
  metric: string;
  timeframe: string;
  trend: 'up' | 'down' | 'stable';
  changePercentage: number;
  dataPoints: number;
}

export interface PersonalBest {
  metric: string;
  value: number;
  achievedAt: string;
  testId: string;
  context: string;
}
