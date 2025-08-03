import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db, multiplayerRooms, roomParticipants, testTexts, users } from '@tactile/database';
import { eq, and, desc } from 'drizzle-orm';
import { verify } from 'jsonwebtoken';
import type { JWTPayload } from '@tactile/types';

export const multiplayerRoutes = new Hono<{
  Variables: {
    user: JWTPayload;
    wsHandler: any;
  };
}>();

// Middleware to verify JWT token
const authMiddleware = async (c: any, next: any) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Authorization token required' }, 401);
  }

  const token = authHeader.substring(7);
  try {
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
    const payload = verify(token, jwtSecret) as JWTPayload;
    c.set('user', payload);
    await next();
  } catch (error) {
    return c.json({ error: 'Invalid token' }, 401);
  }
};

// Create room schema
const createRoomSchema = z.object({
  name: z.string().min(1).max(100),
  testTextId: z.string().uuid(),
  maxPlayers: z.number().min(2).max(10).default(10),
});

// Join room schema
const joinRoomSchema = z.object({
  roomId: z.string().uuid(),
});

// Create a new multiplayer room
multiplayerRoutes.post(
  '/rooms',
  authMiddleware,
  zValidator('json', createRoomSchema),
  async (c) => {
    try {
      const user = c.get('user') as JWTPayload;
      const { name, testTextId, maxPlayers } = c.req.valid('json');

      // Verify test text exists
      const testText = await db
        .select()
        .from(testTexts)
        .where(and(eq(testTexts.id, testTextId), eq(testTexts.isActive, true)))
        .limit(1);

      if (testText.length === 0) {
        return c.json({ error: 'Test text not found' }, 404);
      }

      // Create room in database
      const [room] = await db
        .insert(multiplayerRooms)
        .values({
          name,
          hostId: user.userId,
          testTextId,
          maxPlayers,
          status: 'waiting',
        })
        .returning();

      if (!room) {
        return c.json({ error: 'Failed to create room' }, 500);
      }

      // Get WebSocket handler from context (will be set in main server)
      const wsHandler = c.get('wsHandler');
      if (wsHandler) {
        // Create room in WebSocket manager
        wsHandler.createRoom(room.id, name, user.userId, testTextId, maxPlayers);
      }

      const testTextData = testText[0];
      if (!testTextData) {
        return c.json({ error: 'Test text data not found' }, 500);
      }

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
              title: testTextData.title,
              difficulty: testTextData.difficulty,
              wordCount: testTextData.wordCount,
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

// Get all available rooms
multiplayerRoutes.get('/rooms', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '10');
    const offset = (page - 1) * limit;

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
      .where(eq(multiplayerRooms.status, 'waiting'))
      .orderBy(desc(multiplayerRooms.createdAt))
      .limit(limit)
      .offset(offset);

    // Get participant counts for each room
    const roomsWithCounts = await Promise.all(
      rooms.map(async (room) => {
        const participantCount = await db
          .select({ count: roomParticipants.id })
          .from(roomParticipants)
          .where(eq(roomParticipants.roomId, room.id));

        return {
          id: room.id,
          name: room.name,
          host: {
            id: room.hostId,
            username: room.hostUsername,
          },
          testText: {
            id: room.testTextId,
            title: room.testTextTitle,
            difficulty: room.testTextDifficulty,
            wordCount: room.testTextWordCount,
          },
          maxPlayers: room.maxPlayers,
          currentPlayers: participantCount.length,
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

// Get specific room details
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

    // Get participants
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

    // Get live participants from WebSocket if available
    const wsHandler = c.get('wsHandler');
    let liveParticipants = null;
    if (wsHandler) {
      liveParticipants = wsHandler.getRoomParticipants(roomId);
    }

    return c.json({
      data: {
        room: {
          id: room.id,
          name: room.name,
          host: {
            id: room.hostId,
            username: room.hostUsername,
          },
          testText: {
            id: room.testTextId,
            title: room.testTextTitle,
            content: room.testTextContent,
            difficulty: room.testTextDifficulty,
            wordCount: room.testTextWordCount,
          },
          maxPlayers: room.maxPlayers,
          status: room.status,
          startedAt: room.startedAt,
          finishedAt: room.finishedAt,
          createdAt: room.createdAt,
          participants: participants.map(p => ({
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

// Join a room (creates database record)
multiplayerRoutes.post(
  '/rooms/:roomId/join',
  authMiddleware,
  async (c) => {
    try {
      const user = c.get('user') as JWTPayload;
      const roomId = c.req.param('roomId');

      // Check if room exists and is joinable
      const [room] = await db
        .select()
        .from(multiplayerRooms)
        .where(eq(multiplayerRooms.id, roomId))
        .limit(1);

      if (!room) {
        return c.json({ error: 'Room not found' }, 404);
      }

      if (room.status !== 'waiting') {
        return c.json({ error: 'Room is not accepting new players' }, 400);
      }

      // Check if user is already in the room
      const existingParticipant = await db
        .select()
        .from(roomParticipants)
        .where(
          and(
            eq(roomParticipants.roomId, roomId),
            eq(roomParticipants.userId, user.userId)
          )
        )
        .limit(1);

      if (existingParticipant.length > 0) {
        return c.json({ error: 'Already joined this room' }, 400);
      }

      // Check room capacity
      const currentParticipants = await db
        .select()
        .from(roomParticipants)
        .where(eq(roomParticipants.roomId, roomId));

      if (currentParticipants.length >= (room.maxPlayers || 10)) {
        return c.json({ error: 'Room is full' }, 400);
      }

      // Add participant to database
      const [participant] = await db
        .insert(roomParticipants)
        .values({
          roomId,
          userId: user.userId,
        })
        .returning();

      if (!participant) {
        return c.json({ error: 'Failed to join room' }, 500);
      }

      return c.json({
        message: 'Joined room successfully',
        data: {
          participant: {
            id: participant.id,
            roomId: participant.roomId,
            userId: participant.userId,
            joinedAt: participant.joinedAt,
          },
        },
      });
    } catch (error) {
      console.error('Join room error:', error);
      return c.json({ error: 'Failed to join room' }, 500);
    }
  }
);

// Leave a room
multiplayerRoutes.post(
  '/rooms/:roomId/leave',
  authMiddleware,
  async (c) => {
    try {
      const user = c.get('user') as JWTPayload;
      const roomId = c.req.param('roomId');

      // Remove participant from database
      const deletedParticipants = await db
        .delete(roomParticipants)
        .where(
          and(
            eq(roomParticipants.roomId, roomId),
            eq(roomParticipants.userId, user.userId)
          )
        )
        .returning();

      if (deletedParticipants.length === 0) {
        return c.json({ error: 'Not in this room' }, 400);
      }

      return c.json({
        message: 'Left room successfully',
      });
    } catch (error) {
      console.error('Leave room error:', error);
      return c.json({ error: 'Failed to leave room' }, 500);
    }
  }
);

// Get WebSocket connection stats (for debugging)
multiplayerRoutes.get('/stats', async (c) => {
  try {
    const wsHandler = c.get('wsHandler');
    if (!wsHandler) {
      return c.json({ error: 'WebSocket handler not available' }, 503);
    }

    const stats = wsHandler.getStats();
    return c.json({ data: stats });
  } catch (error) {
    console.error('Get stats error:', error);
    return c.json({ error: 'Failed to get stats' }, 500);
  }
});