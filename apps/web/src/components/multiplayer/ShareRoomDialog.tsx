import type React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RoomLinkField } from './RoomLink';

/**
 * Shown the moment a room exists.
 *
 * Creating a room used to drop the host straight into it, which is the one
 * screen where the link is least discoverable - a room with nobody in it and
 * no obvious way to invite anyone. Handing over the link first makes the
 * invite the default next step and keeps entering the room a deliberate one.
 */
export const ShareRoomDialog: React.FC<{
  roomId: string | null;
  onOpenChange: (open: boolean) => void;
  onEnterRoom: () => void;
}> = ({ roomId, onOpenChange, onEnterRoom }) => (
  <Dialog open={roomId !== null} onOpenChange={onOpenChange}>
    <DialogContent data-theme-surface className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Room created</DialogTitle>
        <DialogDescription>
          Send this link to whoever you want in the race. They will need an account to join.
        </DialogDescription>
      </DialogHeader>

      {roomId && <RoomLinkField roomId={roomId} />}

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
          Stay here
        </Button>
        <Button type="button" onClick={onEnterRoom}>
          Open room
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
