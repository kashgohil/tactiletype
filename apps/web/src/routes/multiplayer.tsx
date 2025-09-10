import { createFileRoute } from '@tanstack/react-router';
// import { Multiplayer } from '../pages/Multiplayer';

const ComingSoon: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      <h1 className="text-4xl font-bold mb-4">Hang Tight! Coming Soon!</h1>
      <p className="text-lg text-gray-600">
        We're working hard to bring this feature to you.
      </p>
    </div>
  );
};

export const Route = createFileRoute('/multiplayer')({
  component: ComingSoon,
});
