/** Short code snippets for developer typing practice (Phase C starter + Phase F expand). */
export const CODE_SNIPPETS: Array<{
  title: string;
  language: string;
  content: string;
}> = [
  {
    title: 'JS sum function',
    language: 'js',
    content: `function sum(a, b) {
  return a + b;
}

const total = sum(2, 3);
console.log(total);`,
  },
  {
    title: 'JS array map',
    language: 'js',
    content: `const nums = [1, 2, 3, 4, 5];
const doubled = nums.map((n) => n * 2);
const even = doubled.filter((n) => n % 2 === 0);
console.log(even.join(", "));`,
  },
  {
    title: 'JS async fetch',
    language: 'js',
    content: `async function loadUser(id) {
  const res = await fetch(\`/api/users/\${id}\`);
  if (!res.ok) throw new Error("Failed to load");
  return res.json();
}`,
  },
  {
    title: 'Python hello',
    language: 'python',
    content: `def greet(name: str) -> str:
    return f"Hello, {name}!"

if __name__ == "__main__":
    print(greet("world"))`,
  },
  {
    title: 'Python list comp',
    language: 'python',
    content: `squares = [n * n for n in range(10) if n % 2 == 0]
lookup = {n: n * n for n in squares}
print(sum(lookup.values()))`,
  },
  {
    title: 'SQL select',
    language: 'sql',
    content: `SELECT u.id, u.username, COUNT(t.id) AS tests
FROM users u
LEFT JOIN completed_tests t ON t.user_id = u.id
WHERE u.created_at > NOW() - INTERVAL '30 days'
GROUP BY u.id
ORDER BY tests DESC
LIMIT 20;`,
  },
  {
    title: 'Shell pipeline',
    language: 'shell',
    content: `#!/usr/bin/env bash
set -euo pipefail
find . -name "*.ts" | xargs wc -l | sort -n | tail -20`,
  },
  {
    title: 'TS interface',
    language: 'ts',
    content: `interface User {
  id: string;
  email: string;
  username: string;
}

function displayName(user: User): string {
  return user.username || user.email.split("@")[0];
}`,
  },
  {
    title: 'React effect',
    language: 'tsx',
    content: `useEffect(() => {
  let cancelled = false;
  loadStats().then((data) => {
    if (!cancelled) setStats(data);
  });
  return () => {
    cancelled = true;
  };
}, [userId]);`,
  },
  {
    title: 'CSS flex card',
    language: 'css',
    content: `.card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 0.75rem;
  background: color-mix(in oklab, var(--accent) 10%, transparent);
}`,
  },
  {
    title: 'Go HTTP handler',
    language: 'go',
    content: `func handleHealth(w http.ResponseWriter, r *http.Request) {
  w.Header().Set("Content-Type", "application/json")
  json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}`,
  },
  {
    title: 'Rust match result',
    language: 'rust',
    content: `match parse_config(&path) {
  Ok(cfg) => run(cfg),
  Err(e) => eprintln!("config error: {e}"),
}`,
  },
  {
    title: 'SQL upsert',
    language: 'sql',
    content: `INSERT INTO user_stats (user_id, best_wpm, updated_at)
VALUES ($1, $2, NOW())
ON CONFLICT (user_id) DO UPDATE
SET best_wpm = GREATEST(user_stats.best_wpm, EXCLUDED.best_wpm),
    updated_at = NOW();`,
  },
  {
    title: 'Bash retry loop',
    language: 'shell',
    content: `for i in {1..5}; do
  curl -fsS "$URL" && break
  sleep $((i * 2))
done`,
  },
];
