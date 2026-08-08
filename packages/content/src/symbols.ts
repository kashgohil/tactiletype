/** Symbol / operator drills for punctuation-heavy typing. */
export const SYMBOL_LINES = [
  'a = b + c; x -= 1; y *= 2; z /= 4; n %= 3;',
  'if (a && b || !c) { return true; } else { return false; }',
  'const fn = (x) => x * 2; arr.map((n) => n + 1);',
  'obj.key = value; map["key"] = 42; list[0] = null;',
  'email@example.com  https://example.com/path?q=1&r=2',
  'user_name-id.v2  /home/user/docs/file_name.txt',
  'price: $19.99  tax: 8.5%  total: $21.69',
  'git commit -m "fix: handle edge case" && git push',
  'SELECT * FROM users WHERE id = 42 AND active = true;',
  // biome-ignore lint/suspicious/noTemplateCurlyInString: literal drill copy — the `${}` is what the user types
  'console.log(`Hello, ${name}!`); // comment here',
  '{ "id": 1, "name": "Ada", "roles": ["admin", "user"] }',
  'regex: /^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$/i',
  'pair: (a, b) => [a, b]; set: {1, 2, 3};',
  'math: (a + b) * (c - d) / e % f == g != h',
  'tags: #todo @user ~draft +priority !urgent',
  'paths: C:\\Users\\Name\\file.txt  ../src/index.ts',
  'ranges: 1..10  a-z  0xFF  3.14e-2  1_000_000',
  'ops: << >> & | ^ ~ += -= *= /= === !== ?? ?.',
  'brackets: (() => { return [1, 2, { a: "b" }]; })();',
  'markdown: **bold** _italic_ `code` [link](url) # heading',
];

export const REAL_WORLD_LINES = [
  'Please send the report to finance@company.com by Friday at 5:00 PM.',
  'Meeting link: https://meet.example.com/abc-defg-hij  passcode: 482910',
  'Ship to: 1600 Amphitheatre Parkway, Mountain View, CA 94043, USA',
  'API key: sk_live_51Hxxxxxxx  webhook: https://api.example.com/hooks/v1',
  'SSH: ssh user@192.168.1.42 -p 2222  scp file.txt user@host:/tmp/',
  'Invoice #INV-2024-0042  due: 2024-08-15  amount: $1,240.00 USD',
  'npm install @tactile/content --save-dev  # or bun add @tactile/content',
  'docker run -p 3001:3001 -e DATABASE_URL=postgres://localhost/tactile api',
  'FROM node:20-alpine  WORKDIR /app  COPY . .  RUN bun install  CMD ["bun", "start"]',
  'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.sig',
];
