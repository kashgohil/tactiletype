import { Link } from '@tanstack/react-router';
import {
  Calendar,
  ChartPie,
  Crown,
  Dumbbell,
  Gamepad2,
  Joystick,
  Keyboard,
  LogIn,
  Settings2,
  User,
} from 'lucide-react';
import React from 'react';
import { useAuth } from '../../contexts';
import { ThemePicker } from '../ThemePicker';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

export const Navbar: React.FC = () => {
  const { user } = useAuth();

  return (
    <nav
      data-theme-surface
      className="w-full shrink-0 sticky top-0 z-50 h-[var(--height-nav)] bg-surface-accent border-b border-line"
    >
      <div className="h-full w-full max-w-shell mx-auto px-8 flex flex-col justify-center">
        <div className="flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold flex items-center gap-2">
            <img
              src="/tactiletype-256x256.png"
              alt="TactileType"
              height={36}
              width={36}
            />
            tactiletype
          </Link>

          <div className="flex items-center">
            <ThemePicker />
            <Tooltip>
              <TooltipTrigger asChild>
                <Link to="/test">
                  <Button variant="link" size="icon">
                    <Keyboard />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>Test</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link to="/play">
                  <Button variant="link" size="icon">
                    <Joystick />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>Play modes</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link to="/practice">
                  <Button variant="link" size="icon">
                    <Dumbbell />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>Practice</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link to="/daily">
                  <Button variant="link" size="icon">
                    <Calendar />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>Daily</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link to="/leaderboard">
                  <Button variant="link" size="icon">
                    <Crown />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>Leaderboard</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link to="/multiplayer">
                  <Button variant="link" size="icon">
                    <Gamepad2 />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>Multiplayer</TooltipContent>
            </Tooltip>
            {user && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link to="/analytics">
                    <Button variant="link" size="icon">
                      <ChartPie />
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>Analytics</TooltipContent>
              </Tooltip>
            )}
            {user && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link to="/profile">
                    <Button variant="link" size="icon">
                      <User />
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>Profile</TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Link to="/settings">
                  <Button variant="link" size="icon">
                    <Settings2 />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>Settings</TooltipContent>
            </Tooltip>
            {!user && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link to="/login">
                    <Button variant="link" size="icon">
                      <LogIn />
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>Login</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
