import { Link } from '@tanstack/react-router';
import {
  ChartPie,
  Crown,
  Gamepad2,
  Keyboard,
  LogIn,
  Palette,
  User,
} from 'lucide-react';
import React from 'react';
import { useAuth } from '../../contexts';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

export const Navbar: React.FC = () => {
  const { user } = useAuth();

  return (
    <nav className="p-4 w-full sticky top-0">
      <div className="container mx-auto p-4 bg-accent/30 rounded-lg backdrop-blur-3xl">
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
            <Tooltip>
              <TooltipTrigger asChild>
                <Link to="/test">
                  <Button variant="link" size="icon">
                    <Palette />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>Theme</TooltipContent>
            </Tooltip>
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
