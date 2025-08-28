import { Link } from '@tanstack/react-router';

export function Footer() {
  return (
    <div className="fixed bottom-0 left-0 p-2 backdrop-blur-3xl w-full bg-accent/30">
      <div className="flex items-center justify-between gap-4 text-center container mx-auto text-sm">
        <p>
          &copy; {new Date().getFullYear()} tactiletype. All rights reserved.
        </p>
        <Link to="/terms" className="underline">
          Terms
        </Link>
      </div>
    </div>
  );
}
