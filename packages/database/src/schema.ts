import { relations } from 'drizzle-orm';
import {
  boolean,
  decimal,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

// Users and Authentication
export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    username: varchar('username', { length: 50 }).notNull().unique(),
    passwordHash: varchar('password_hash', { length: 255 }),
    avatarUrl: varchar('avatar_url', { length: 500 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('users_email_idx').on(table.email),
    index('users_username_idx').on(table.username),
  ]
);

export const oauthAccounts = pgTable(
  'oauth_accounts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    provider: varchar('provider', { length: 50 }).notNull(),
    providerId: varchar('provider_id', { length: 255 }).notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('oauth_user_provider_idx').on(table.userId, table.provider)]
);

export const userProfiles = pgTable('user_profiles', {
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .primaryKey(),
  displayName: varchar('display_name', { length: 100 }),
  bio: text('bio'),
  country: varchar('country', { length: 2 }),
  keyboard: varchar('keyboard', { length: 100 }),
  preferredLanguage: varchar('preferred_language', { length: 10 }).default(
    'en'
  ),
  isPublic: boolean('is_public').default(true),
});

// Test Content and Configuration
export const testTexts = pgTable(
  'test_texts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    title: varchar('title', { length: 200 }).notNull(),
    content: text('content').notNull(),
    language: varchar('language', { length: 10 }).default('en'),
    difficulty: varchar('difficulty', { length: 20 }).default('medium'),
    wordCount: integer('word_count').notNull(),
    createdBy: uuid('created_by').references(() => users.id),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('test_texts_lang_diff_idx').on(table.language, table.difficulty),
  ]
);

// Test Results and Statistics
export const testResults = pgTable(
  'test_results',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    testTextId: uuid('test_text_id')
      .references(() => testTexts.id)
      .notNull(),
    wpm: decimal('wpm', { precision: 5, scale: 2 }).notNull(),
    accuracy: decimal('accuracy', { precision: 5, scale: 2 }).notNull(),
    errors: integer('errors').default(0),
    timeTaken: integer('time_taken').notNull(), // in seconds
    keystrokeData: text('keystroke_data'), // JSON string
    completedAt: timestamp('completed_at').defaultNow().notNull(),
  },
  (table) => [
    index('test_results_user_completed_idx').on(
      table.userId,
      table.completedAt
    ),
    index('test_results_wpm_idx').on(table.wpm),
  ]
);

// Multiplayer Features
export const multiplayerRooms = pgTable(
  'multiplayer_rooms',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    hostId: uuid('host_id')
      .references(() => users.id)
      .notNull(),
    testTextId: uuid('test_text_id')
      .references(() => testTexts.id)
      .notNull(),
    maxPlayers: integer('max_players').default(10),
    status: varchar('status', { length: 20 }).default('waiting'), // waiting, active, finished
    startedAt: timestamp('started_at'),
    finishedAt: timestamp('finished_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('rooms_status_idx').on(table.status)]
);

export const roomParticipants = pgTable(
  'room_participants',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    roomId: uuid('room_id')
      .references(() => multiplayerRooms.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
    finishedAt: timestamp('finished_at'),
    finalWpm: decimal('final_wpm', { precision: 5, scale: 2 }),
    finalAccuracy: decimal('final_accuracy', { precision: 5, scale: 2 }),
  },
  (table) => [
    index('room_participants_room_user_idx').on(table.roomId, table.userId),
  ]
);

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  oauthAccounts: many(oauthAccounts),
  profile: one(userProfiles),
  testResults: many(testResults),
  createdTexts: many(testTexts),
  hostedRooms: many(multiplayerRooms),
  roomParticipations: many(roomParticipants),
  keystrokeAnalytics: many(keystrokeAnalytics),
  errorAnalytics: many(errorAnalytics),
  performanceInsights: many(performanceInsights),
  goals: many(userGoals),
  achievements: many(userAchievements),
  recommendations: many(userRecommendations),
  practiceSessions: many(practiceSessions),
}));

export const oauthAccountsRelations = relations(oauthAccounts, ({ one }) => ({
  user: one(users, {
    fields: [oauthAccounts.userId],
    references: [users.id],
  }),
}));

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, {
    fields: [userProfiles.userId],
    references: [users.id],
  }),
}));

export const testTextsRelations = relations(testTexts, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [testTexts.createdBy],
    references: [users.id],
  }),
  testResults: many(testResults),
  multiplayerRooms: many(multiplayerRooms),
}));

export const testResultsRelations = relations(testResults, ({ one, many }) => ({
  user: one(users, { fields: [testResults.userId], references: [users.id] }),
  testText: one(testTexts, {
    fields: [testResults.testTextId],
    references: [testTexts.id],
  }),
  keystrokeAnalytics: one(keystrokeAnalytics),
  errorAnalytics: one(errorAnalytics),
}));

export const multiplayerRoomsRelations = relations(
  multiplayerRooms,
  ({ one, many }) => ({
    host: one(users, {
      fields: [multiplayerRooms.hostId],
      references: [users.id],
    }),
    testText: one(testTexts, {
      fields: [multiplayerRooms.testTextId],
      references: [testTexts.id],
    }),
    participants: many(roomParticipants),
  })
);

// Advanced Analytics Tables for Phase 4

// Detailed keystroke analytics
export const keystrokeAnalytics = pgTable(
  'keystroke_analytics',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    testResultId: uuid('test_result_id')
      .references(() => testResults.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    keystrokeData: text('keystroke_data').notNull(), // JSON array of detailed keystroke events
    averageKeystrokeTime: decimal('avg_keystroke_time', {
      precision: 8,
      scale: 3,
    }), // milliseconds
    keystrokeVariance: decimal('keystroke_variance', {
      precision: 8,
      scale: 3,
    }),
    typingRhythm: decimal('typing_rhythm', { precision: 5, scale: 2 }), // consistency score 0-100
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('keystroke_analytics_user_idx').on(table.userId),
    index('keystroke_analytics_test_result_idx').on(table.testResultId),
  ]
);

// Character-level error analysis
export const errorAnalytics = pgTable(
  'error_analytics',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    testResultId: uuid('test_result_id')
      .references(() => testResults.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    characterErrors: text('character_errors').notNull(), // JSON object mapping characters to error counts
    wordErrors: text('word_errors').notNull(), // JSON object mapping words to error counts
    errorPatterns: text('error_patterns').notNull(), // JSON array of common error patterns
    mostProblematicChars: text('most_problematic_chars'), // JSON array of characters with highest error rates
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('error_analytics_user_idx').on(table.userId),
    index('error_analytics_test_result_idx').on(table.testResultId),
  ]
);

// Performance insights and trends
export const performanceInsights = pgTable(
  'performance_insights',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    timeframe: varchar('timeframe', { length: 20 }).notNull(), // 'daily', 'weekly', 'monthly'
    date: timestamp('date').notNull(),
    avgWpm: decimal('avg_wpm', { precision: 5, scale: 2 }),
    avgAccuracy: decimal('avg_accuracy', { precision: 5, scale: 2 }),
    testCount: integer('test_count').default(0),
    totalTimeSpent: integer('total_time_spent').default(0), // in seconds
    improvementRate: decimal('improvement_rate', { precision: 5, scale: 2 }), // percentage change
    consistencyScore: decimal('consistency_score', { precision: 5, scale: 2 }), // 0-100
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('performance_insights_user_date_idx').on(table.userId, table.date),
    index('performance_insights_timeframe_idx').on(table.timeframe),
  ]
);

// User goals and achievements
export const userGoals = pgTable(
  'user_goals',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    goalType: varchar('goal_type', { length: 50 }).notNull(), // 'wpm', 'accuracy', 'consistency', 'daily_tests'
    targetValue: decimal('target_value', { precision: 8, scale: 2 }).notNull(),
    currentValue: decimal('current_value', { precision: 8, scale: 2 }).default(
      '0'
    ),
    targetDate: timestamp('target_date'),
    isActive: boolean('is_active').default(true),
    isAchieved: boolean('is_achieved').default(false),
    achievedAt: timestamp('achieved_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('user_goals_user_active_idx').on(table.userId, table.isActive),
    index('user_goals_type_idx').on(table.goalType),
  ]
);

// Achievement system
export const achievements = pgTable(
  'achievements',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description').notNull(),
    category: varchar('category', { length: 50 }).notNull(), // 'speed', 'accuracy', 'consistency', 'milestone'
    criteria: text('criteria').notNull(), // JSON object defining achievement criteria
    badgeIcon: varchar('badge_icon', { length: 100 }),
    points: integer('points').default(0),
    rarity: varchar('rarity', { length: 20 }).default('common'), // 'common', 'rare', 'epic', 'legendary'
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('achievements_category_idx').on(table.category),
    index('achievements_rarity_idx').on(table.rarity),
  ]
);

// User achievements (junction table)
export const userAchievements = pgTable(
  'user_achievements',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    achievementId: uuid('achievement_id')
      .references(() => achievements.id, { onDelete: 'cascade' })
      .notNull(),
    unlockedAt: timestamp('unlocked_at').defaultNow().notNull(),
    progress: decimal('progress', { precision: 5, scale: 2 }).default('0'), // 0-100 for partial progress
  },
  (table) => [
    index('user_achievements_user_idx').on(table.userId),
    index('user_achievements_achievement_idx').on(table.achievementId),
    index('user_achievements_user_achievement_idx').on(
      table.userId,
      table.achievementId
    ),
  ]
);

// Personalized recommendations
export const userRecommendations = pgTable(
  'user_recommendations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    type: varchar('type', { length: 50 }).notNull(), // 'practice_focus', 'goal_suggestion', 'improvement_tip'
    title: varchar('title', { length: 200 }).notNull(),
    description: text('description').notNull(),
    actionData: text('action_data'), // JSON object with recommendation-specific data
    priority: integer('priority').default(1), // 1-5, higher is more important
    isRead: boolean('is_read').default(false),
    isApplied: boolean('is_applied').default(false),
    validUntil: timestamp('valid_until'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('user_recommendations_user_idx').on(table.userId),
    index('user_recommendations_type_idx').on(table.type),
    index('user_recommendations_priority_idx').on(table.priority),
  ]
);

// Practice sessions for focused improvement
export const practiceSessions = pgTable(
  'practice_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    focusArea: varchar('focus_area', { length: 50 }).notNull(), // 'speed', 'accuracy', 'specific_chars', 'words'
    targetContent: text('target_content'), // specific characters, words, or patterns to practice
    sessionData: text('session_data').notNull(), // JSON object with session configuration and results
    duration: integer('duration').notNull(), // in seconds
    improvementScore: decimal('improvement_score', { precision: 5, scale: 2 }), // 0-100
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('practice_sessions_user_idx').on(table.userId),
    index('practice_sessions_focus_idx').on(table.focusArea),
    index('practice_sessions_created_idx').on(table.createdAt),
  ]
);

// Analytics Relations
export const keystrokeAnalyticsRelations = relations(
  keystrokeAnalytics,
  ({ one }) => ({
    testResult: one(testResults, {
      fields: [keystrokeAnalytics.testResultId],
      references: [testResults.id],
    }),
    user: one(users, {
      fields: [keystrokeAnalytics.userId],
      references: [users.id],
    }),
  })
);

export const errorAnalyticsRelations = relations(errorAnalytics, ({ one }) => ({
  testResult: one(testResults, {
    fields: [errorAnalytics.testResultId],
    references: [testResults.id],
  }),
  user: one(users, {
    fields: [errorAnalytics.userId],
    references: [users.id],
  }),
}));

export const performanceInsightsRelations = relations(
  performanceInsights,
  ({ one }) => ({
    user: one(users, {
      fields: [performanceInsights.userId],
      references: [users.id],
    }),
  })
);

export const userGoalsRelations = relations(userGoals, ({ one }) => ({
  user: one(users, {
    fields: [userGoals.userId],
    references: [users.id],
  }),
}));

export const achievementsRelations = relations(achievements, ({ many }) => ({
  userAchievements: many(userAchievements),
}));

export const userAchievementsRelations = relations(
  userAchievements,
  ({ one }) => ({
    user: one(users, {
      fields: [userAchievements.userId],
      references: [users.id],
    }),
    achievement: one(achievements, {
      fields: [userAchievements.achievementId],
      references: [achievements.id],
    }),
  })
);

export const userRecommendationsRelations = relations(
  userRecommendations,
  ({ one }) => ({
    user: one(users, {
      fields: [userRecommendations.userId],
      references: [users.id],
    }),
  })
);

export const practiceSessionsRelations = relations(
  practiceSessions,
  ({ one }) => ({
    user: one(users, {
      fields: [practiceSessions.userId],
      references: [users.id],
    }),
  })
);

export const roomParticipantsRelations = relations(
  roomParticipants,
  ({ one }) => ({
    room: one(multiplayerRooms, {
      fields: [roomParticipants.roomId],
      references: [multiplayerRooms.id],
    }),
    user: one(users, {
      fields: [roomParticipants.userId],
      references: [users.id],
    }),
  })
);
