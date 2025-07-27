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
}));

export const testResultsRelations = relations(testResults, ({ one }) => ({
  user: one(users, { fields: [testResults.userId], references: [users.id] }),
  testText: one(testTexts, {
    fields: [testResults.testTextId],
    references: [testTexts.id],
  }),
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
