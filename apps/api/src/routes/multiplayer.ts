import { zValidator } from '@hono/zod-validator';
import { db, multiplayerRooms, roomParticipants, testTexts, users } from '@tactile/database';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { multiplayerHub } from '../websocket/hub';

type Variables = {
  user: {
    userId: string;
    email: string;
    username: string;
  };
};

export const multiplayerRoutes = new Hono<{ Variables: Variables }>();

const createRoomSchema = z.object({
  name: z.string().min(1).max(100),
  testTextId: z.string().uuid().optional(),
  maxPlayers: z.number().min(2).max(10).default(5),
});

// Create room — picks a random active text if none provided
multiplayerRoutes.post(
  '/rooms',
  authMiddleware,
  zValidator('json', createRoomSchema),
  async (c) => {
    try {
      const user = c.get('user');
      const { name, testTextId, maxPlayers } = c.req.valid('json');

      let textId = testTextId;
      let testTextRow: typeof testTexts.$inferSelect | undefined;

      if (textId) {
        const found = await db
          .select()
          .from(testTexts)
          .where(and(eq(testTexts.id, textId), eq(testTexts.isActive, true)))
          .limit(1);
        testTextRow = found[0];
      } else {
        const all = await db.select().from(testTexts).where(eq(testTexts.isActive, true)).limit(50);
        testTextRow = all[Math.floor(Math.random() * all.length)];
        textId = testTextRow?.id;
      }

      if (!testTextRow || !textId) {
        return c.json({ error: 'No test text available — run db:seed' }, 404);
      }

      const [room] = await db
        .insert(multiplayerRooms)
        .values({
          name,
          hostId: user.userId,
          testTextId: textId,
          maxPlayers,
          status: 'waiting',
        })
        .returning();

      if (!room) {
        return c.json({ error: 'Failed to create room' }, 500);
      }

      // Host joins DB as participant
      await db.insert(roomParticipants).values({
        roomId: room.id,
        userId: user.userId,
      });

      multiplayerHub.createRoom(room.id, room.name, user.userId, textId, maxPlayers);

      return c.json({
        message: 'Room created successfully',
        data: {
          room: {
            id: room.id,
            name: room.name,
            hostId: room.hostId,
            testTextId: room.testTextId,
            maxPlayers: room.maxPlayers,
            status: room.status,
            createdAt: room.createdAt,
            testText: {
              title: testTextRow.title,
              difficulty: testTextRow.difficulty,
              wordCount: testTextRow.wordCount,
            },
          },
        },
      });
    } catch (error) {
      console.error('Create room error:', error);
      return c.json({ error: 'Failed to create room' }, 500);
    }
  }
);

multiplayerRoutes.get('/rooms', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1', 10);
    const limit = Math.min(parseInt(c.req.query('limit') || '20', 10), 50);
    const offset = (page - 1) * limit;
    // waiting | active | all — active rooms can be spectated
    const statusFilter = c.req.query('status') || 'waiting';

    const rooms = await db
      .select({
        id: multiplayerRooms.id,
        name: multiplayerRooms.name,
        hostId: multiplayerRooms.hostId,
        hostUsername: users.username,
        testTextId: multiplayerRooms.testTextId,
        testTextTitle: testTexts.title,
        testTextDifficulty: testTexts.difficulty,
        testTextWordCount: testTexts.wordCount,
        maxPlayers: multiplayerRooms.maxPlayers,
        status: multiplayerRooms.status,
        createdAt: multiplayerRooms.createdAt,
      })
      .from(multiplayerRooms)
      .leftJoin(users, eq(multiplayerRooms.hostId, users.id))
      .leftJoin(testTexts, eq(multiplayerRooms.testTextId, testTexts.id))
      .where(
        statusFilter === 'live'
          ? inArray(multiplayerRooms.status, ['waiting', 'active'])
          : statusFilter === 'active'
            ? eq(multiplayerRooms.status, 'active')
            : eq(multiplayerRooms.status, 'waiting')
      )
      .orderBy(desc(multiplayerRooms.createdAt))
      .limit(limit)
      .offset(offset);

    const roomsWithCounts = await Promise.all(
      rooms.map(async (room) => {
        const participants = await db
          .select({ id: roomParticipants.id })
          .from(roomParticipants)
          .where(eq(roomParticipants.roomId, room.id));

        const live = multiplayerHub.getRoomParticipants(room.id);

        return {
          id: room.id,
          name: room.name,
          hostId: room.hostId,
          host: {
            id: room.hostId,
            username: room.hostUsername ?? 'unknown',
          },
          testText: {
            id: room.testTextId,
            title: room.testTextTitle ?? 'Text',
            difficulty: room.testTextDifficulty ?? 'medium',
            wordCount: room.testTextWordCount ?? 0,
          },
          maxPlayers: room.maxPlayers ?? 10,
          currentPlayers: live?.length ?? participants.length,
          status: room.status,
          createdAt: room.createdAt,
        };
      })
    );

    return c.json({
      data: {
        rooms: roomsWithCounts,
        pagination: {
          page,
          limit,
          hasMore: rooms.length === limit,
        },
      },
    });
  } catch (error) {
    console.error('Get rooms error:', error);
    return c.json({ error: 'Failed to fetch rooms' }, 500);
  }
});

multiplayerRoutes.get('/rooms/:roomId', async (c) => {
  try {
    const roomId = c.req.param('roomId');

    const [room] = await db
      .select({
        id: multiplayerRooms.id,
        name: multiplayerRooms.name,
        hostId: multiplayerRooms.hostId,
        hostUsername: users.username,
        testTextId: multiplayerRooms.testTextId,
        testTextTitle: testTexts.title,
        testTextContent: testTexts.content,
        testTextDifficulty: testTexts.difficulty,
        testTextWordCount: testTexts.wordCount,
        maxPlayers: multiplayerRooms.maxPlayers,
        status: multiplayerRooms.status,
        startedAt: multiplayerRooms.startedAt,
        finishedAt: multiplayerRooms.finishedAt,
        createdAt: multiplayerRooms.createdAt,
      })
      .from(multiplayerRooms)
      .leftJoin(users, eq(multiplayerRooms.hostId, users.id))
      .leftJoin(testTexts, eq(multiplayerRooms.testTextId, testTexts.id))
      .where(eq(multiplayerRooms.id, roomId))
      .limit(1);

    if (!room) {
      return c.json({ error: 'Room not found' }, 404);
    }

    const participants = await db
      .select({
        id: roomParticipants.id,
        userId: roomParticipants.userId,
        username: users.username,
        joinedAt: roomParticipants.joinedAt,
        finishedAt: roomParticipants.finishedAt,
        finalWpm: roomParticipants.finalWpm,
        finalAccuracy: roomParticipants.finalAccuracy,
      })
      .from(roomParticipants)
      .leftJoin(users, eq(roomParticipants.userId, users.id))
      .where(eq(roomParticipants.roomId, roomId));

    const liveParticipants = multiplayerHub.getRoomParticipants(roomId);

    return c.json({
      data: {
        room: {
          id: room.id,
          name: room.name,
          hostId: room.hostId,
          host: {
            id: room.hostId,
            username: room.hostUsername ?? 'unknown',
          },
          testText: {
            id: room.testTextId,
            title: room.testTextTitle ?? 'Text',
            content: room.testTextContent ?? '',
            difficulty: room.testTextDifficulty ?? 'medium',
            wordCount: room.testTextWordCount ?? 0,
          },
          maxPlayers: room.maxPlayers,
          status: room.status,
          startedAt: room.startedAt,
          finishedAt: room.finishedAt,
          createdAt: room.createdAt,
          participants: participants.map((p) => ({
            id: p.id,
            userId: p.userId,
            username: p.username,
            joinedAt: p.joinedAt,
            finishedAt: p.finishedAt,
            finalWpm: p.finalWpm ? parseFloat(p.finalWpm) : null,
            finalAccuracy: p.finalAccuracy ? parseFloat(p.finalAccuracy) : null,
          })),
          liveParticipants,
        },
      },
    });
  } catch (error) {
    console.error('Get room error:', error);
    return c.json({ error: 'Failed to fetch room' }, 500);
  }
});

multiplayerRoutes.post('/rooms/:roomId/join', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const roomId = c.req.param('roomId');
    const body = await c.req.json().catch(() => ({}));
    const spectate = !!(body as { spectate?: boolean }).spectate;

    const [room] = await db
      .select()
      .from(multiplayerRooms)
      .where(eq(multiplayerRooms.id, roomId))
      .limit(1);

    if (!room) {
      return c.json({ error: 'Room not found' }, 404);
    }

    // Spectators can join active/finished rooms; racers only waiting
    if (!spectate && room.status !== 'waiting') {
      return c.json(
        {
          error: 'Race already in progress — join as spectator',
          canSpectate: true,
        },
        400
      );
    }

    if (!spectate) {
      const existing = await db
        .select()
        .from(roomParticipants)
        .where(and(eq(roomParticipants.roomId, roomId), eq(roomParticipants.userId, user.userId)))
        .limit(1);

      if (existing.length === 0) {
        const current = await db
          .select()
          .from(roomParticipants)
          .where(eq(roomParticipants.roomId, roomId));

        if (current.length >= (room.maxPlayers || 10)) {
          return c.json({ error: 'Room is full' }, 400);
        }

        await db.insert(roomParticipants).values({
          roomId,
          userId: user.userId,
        });
      }
    }

    multiplayerHub.createRoom(
      room.id,
      room.name,
      room.hostId,
      room.testTextId,
      room.maxPlayers ?? 10
    );

    return c.json({
      message: spectate ? 'Spectating room' : 'Joined room successfully',
      role: spectate ? 'spectator' : 'racer',
    });
  } catch (error) {
    console.error('Join room error:', error);
    return c.json({ error: 'Failed to join room' }, 500);
  }
});

multiplayerRoutes.post('/rooms/:roomId/leave', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const roomId = c.req.param('roomId');

    await db
      .delete(roomParticipants)
      .where(and(eq(roomParticipants.roomId, roomId), eq(roomParticipants.userId, user.userId)));

    return c.json({ message: 'Left room' });
  } catch (error) {
    console.error('Leave room error:', error);
    return c.json({ error: 'Failed to leave room' }, 500);
  }
});

multiplayerRoutes.get('/stats', async (c) => {
  return c.json({ data: multiplayerHub.getStats() });
});
