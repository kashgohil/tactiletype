import { useEffect, useMemo, useState } from 'react';

export function Stopwatch({
  duration,
  onEnd,
  startTime,
}: {
  duration: number;
  onEnd: () => void;
  startTime: number;
}) {
  const [timeLeft, setTimeLeft] = useState(() => {
    const elapsed = (Date.now() - startTime) / 1000;
    return Math.max(0, Math.ceil(duration - elapsed));
  });

  const { hours, minutes, seconds } = useMemo(() => {
    const hours = Math.floor(timeLeft / 3600);
    const mins = Math.floor((timeLeft % 3600) / 60);
    const secs = timeLeft % 60;
    return {
      hours: hours.toString().padStart(2, '0'),
      minutes: mins.toString().padStart(2, '0'),
      seconds: secs.toString().padStart(2, '0'),
    };
  }, [timeLeft]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      if (elapsed >= duration) {
        setTimeLeft(0);
        onEnd();
        clearInterval(intervalId);
        return;
      }
      const remaining = duration - elapsed;
      setTimeLeft(Math.max(0, Math.ceil(remaining)));
    }, 100);

    return () => clearInterval(intervalId);
  }, [duration, onEnd, startTime]);

  return (
    <span className="flex items-center">{`${hours}:${minutes}:${seconds}`}</span>
  );
}
