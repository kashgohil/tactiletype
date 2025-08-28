import { useEffect, useMemo, useState } from 'react';

export function Stopwatch({
  duration,
  onEnd,
}: {
  duration: number;
  onEnd: () => void;
}) {
  const [timeLeft, setTimeLeft] = useState(duration);

  useEffect(() => {
    setTimeLeft(duration);
  }, [duration]);

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
      setTimeLeft((timeLeft) => {
        if (!timeLeft) {
          clearInterval(intervalId);
          onEnd();
          return 0;
        }
        return timeLeft - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [onEnd]);

  return (
    <span className="flex items-center">{`${hours}:${minutes}:${seconds}`}</span>
  );
}
