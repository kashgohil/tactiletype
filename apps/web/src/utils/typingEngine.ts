import type {
  DetailedKeystrokeEvent,
  Difficulty,
  TestMode,
  TestType,
} from '@tactile/types';
import { COMMON_WORDS, HARD_WORDS, QUOTES } from './words';

export interface TypingStats {
  wpm: number;
  accuracy: number;
  correctChars: number;
  incorrectChars: number;
  totalChars: number;
  timeElapsed: number;
}

export interface TypingState {
  currentIndex: number;
  userInput: string;
  errors: Set<number>;
  startTime: number | null;
  endTime: number | null;
  isComplete: boolean;
  isStarted: boolean;
  keystrokeEvents: DetailedKeystrokeEvent[];
}

export class TypingEngine {
  private text: string;
  private state: TypingState;
  private onStatsUpdate?: (stats: TypingStats) => void;
  private onStateUpdate?: (state: TypingState) => void;
  private words: string[];

  constructor(
    text: string,
    onStatsUpdate?: (stats: TypingStats) => void,
    onStateUpdate?: (state: TypingState) => void
  ) {
    this.text = text;
    this.onStatsUpdate = onStatsUpdate;
    this.onStateUpdate = onStateUpdate;
    this.words = text.split(' ');
    this.state = {
      currentIndex: 0,
      userInput: '',
      errors: new Set(),
      startTime: null,
      endTime: null,
      isComplete: false,
      isStarted: false,
      keystrokeEvents: [],
    };
  }

  public handleKeyPress(key: string): void {
    if (this.state.isComplete) return;

    // Ignore non-printing keys completely
    if (isNonPrintingKey(key)) {
      return;
    }

    const timestamp = Date.now();

    // Start the test on first keypress (only for printing keys)
    if (!this.state.isStarted) {
      this.state.startTime = timestamp;
      this.state.isStarted = true;
    }

    // Handle backspace
    if (key === 'Backspace') {
      if (this.state.currentIndex > 0) {
        const previousIndex = this.state.currentIndex - 1;
        const expectedChar = this.text[previousIndex];

        // Record backspace keystroke event
        const keystrokeEvent: DetailedKeystrokeEvent = {
          key: 'Backspace',
          timestamp,
          correct: true, // Backspace is always "correct" as an action
          position: previousIndex,
          expectedChar,
          actualChar: 'Backspace',
          isBackspace: true,
          wordIndex: this.getWordIndex(previousIndex),
          characterIndex: this.getCharacterIndexInWord(previousIndex),
        };

        this.state.keystrokeEvents.push(keystrokeEvent);
        this.state.currentIndex--;
        this.state.userInput = this.state.userInput.slice(0, -1);
        this.state.errors.delete(this.state.currentIndex);
      }
    }
    // Handle regular characters
    else if (key.length === 1) {
      const expectedChar = this.text[this.state.currentIndex];
      const isCorrect = key === expectedChar;

      // Record detailed keystroke event
      const keystrokeEvent: DetailedKeystrokeEvent = {
        key,
        timestamp,
        correct: isCorrect,
        position: this.state.currentIndex,
        expectedChar,
        actualChar: key,
        isBackspace: false,
        wordIndex: this.getWordIndex(this.state.currentIndex),
        characterIndex: this.getCharacterIndexInWord(this.state.currentIndex),
      };

      // Add timing data if not the first keystroke
      if (this.state.keystrokeEvents.length > 0) {
        const lastEvent =
          this.state.keystrokeEvents[this.state.keystrokeEvents.length - 1];
        keystrokeEvent.timeSincePrevious = timestamp - lastEvent.timestamp;
      }

      this.state.keystrokeEvents.push(keystrokeEvent);

      // Add character to user input
      this.state.userInput += key;

      // Check if character is correct
      if (!isCorrect) {
        this.state.errors.add(this.state.currentIndex);
      }

      this.state.currentIndex++;

      // Check if test is complete
      if (this.state.currentIndex >= this.text.length) {
        this.state.isComplete = true;
        this.state.endTime = timestamp;
      }
    }

    // Update callbacks
    this.onStateUpdate?.(this.state);
    this.onStatsUpdate?.(this.calculateStats());
  }

  public calculateStats(): TypingStats {
    const timeElapsed = this.state.startTime
      ? (this.state.endTime || Date.now()) - this.state.startTime
      : 0;

    const timeInMinutes = timeElapsed / 60000;
    const correctChars = this.state.currentIndex - this.state.errors.size;
    const incorrectChars = this.state.errors.size;
    const totalChars = this.state.currentIndex;

    // Calculate WPM (Words Per Minute)
    // Standard: 5 characters = 1 word
    const wpm =
      timeInMinutes > 0 ? Math.round(correctChars / 5 / timeInMinutes) : 0;

    // Calculate accuracy
    const accuracy =
      totalChars > 0 ? Math.round((correctChars / totalChars) * 100) : 100;

    return {
      wpm,
      accuracy,
      correctChars,
      incorrectChars,
      totalChars,
      timeElapsed: Math.round(timeElapsed / 1000), // Convert to seconds
    };
  }

  public getState(): TypingState {
    return { ...this.state };
  }

  public getText(): string {
    return this.text;
  }

  public completeTest(): void {
    if (!this.state.isComplete) {
      this.state.isComplete = true;
      this.state.endTime = Date.now();
      this.onStateUpdate?.(this.state);
      this.onStatsUpdate?.(this.calculateStats());
    }
  }

  public reset(): void {
    this.state = {
      currentIndex: 0,
      userInput: '',
      errors: new Set(),
      startTime: null,
      endTime: null,
      isComplete: false,
      isStarted: false,
      keystrokeEvents: [],
    };
    this.onStateUpdate?.(this.state);
    this.onStatsUpdate?.(this.calculateStats());
  }

  public getCharacterStatus(
    index: number
  ): 'correct' | 'incorrect' | 'current' | 'pending' {
    if (index === this.state.currentIndex && !this.state.isComplete) {
      return 'current';
    } else if (index < this.state.currentIndex) {
      return this.state.errors.has(index) ? 'incorrect' : 'correct';
    } else {
      return 'pending';
    }
  }

  public getKeystrokeEvents(): DetailedKeystrokeEvent[] {
    return [...this.state.keystrokeEvents];
  }

  public getCompletedWords(): number {
    let wordCount = 0;
    let currentIndex = 0;
    while (
      currentIndex + (this.words[wordCount]?.length ?? 0) <=
      this.state.currentIndex
    ) {
      currentIndex += (this.words[wordCount]?.length ?? 0) + 1; // +1 for space
      wordCount++;
    }
    return wordCount;
  }

  private getWordIndex(characterIndex: number): number {
    let currentIndex = 0;
    for (let i = 0; i < this.words.length; i++) {
      const wordLength = this.words[i].length;
      if (characterIndex < currentIndex + wordLength) {
        return i;
      }
      currentIndex += wordLength + 1; // +1 for space
    }
    return this.words.length - 1;
  }

  private getCharacterIndexInWord(characterIndex: number): number {
    let currentIndex = 0;
    for (let i = 0; i < this.words.length; i++) {
      const wordLength = this.words[i].length;
      if (characterIndex < currentIndex + wordLength) {
        return characterIndex - currentIndex;
      }
      currentIndex += wordLength + 1; // +1 for space
    }
    return 0;
  }
}

// Utility function to check if a key is a non-printing key
export function isNonPrintingKey(key: string): boolean {
  const nonPrintingKeys = [
    // Modifier keys
    'Shift',
    'Control',
    'Alt',
    'Meta', // Cmd on Mac, Windows key on Windows
    'CapsLock',
    'NumLock',
    'ScrollLock',

    // Navigation keys
    'Tab',
    'Enter',
    'Escape',
    'ArrowUp',
    'ArrowDown',
    'ArrowLeft',
    'ArrowRight',
    'Home',
    'End',
    'PageUp',
    'PageDown',

    // Edit keys
    'Insert',
    'Delete',

    // Function keys
    'F1',
    'F2',
    'F3',
    'F4',
    'F5',
    'F6',
    'F7',
    'F8',
    'F9',
    'F10',
    'F11',
    'F12',

    // System keys
    'Pause',
    'ContextMenu',
    'PrintScreen',

    // Media keys (if supported)
    'MediaPlayPause',
    'MediaStop',
    'MediaTrackNext',
    'MediaTrackPrevious',
    'VolumeUp',
    'VolumeDown',
    'VolumeMute',
  ];

  return nonPrintingKeys.includes(key);
}

// Utility function to format time
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Helper function to get word list based on difficulty
function getWordListForDifficulty(difficulty: Difficulty): string[] {
  switch (difficulty) {
    case 'easy':
      return COMMON_WORDS.slice(0, Math.floor(COMMON_WORDS.length * 0.5)); // Use simpler half of common words
    case 'hard':
      return [...COMMON_WORDS, ...HARD_WORDS]; // Mix common and hard words
    case 'medium':
    default:
      return COMMON_WORDS; // Use all common words
  }
}

// Utility function to generate random text for testing
export function generateTestText(
  wordCount: number = 50,
  difficulty: Difficulty = 'medium'
): string {
  const words: string[] = [];
  const wordList = getWordListForDifficulty(difficulty);

  for (let i = 0; i < wordCount; i++) {
    const randomIndex = Math.floor(Math.random() * wordList.length);
    words.push(wordList[randomIndex]);
  }

  return words.join(' ');
}

// Generate text with punctuation scattered throughout
export function generatePunctuationText(
  wordCount: number = 50,
  difficulty: Difficulty = 'medium'
): string {
  const wordList = getWordListForDifficulty(difficulty);
  const sentences: string[] = [];
  let remainingWords = wordCount;

  while (remainingWords > 0) {
    // Determine sentence length (3-15 words for natural variation)
    const sentenceLength = Math.min(
      Math.floor(Math.random() * 13) + 3,
      remainingWords
    );
    remainingWords -= sentenceLength;

    const sentenceWords: string[] = [];

    // Generate words for this sentence
    for (let i = 0; i < sentenceLength; i++) {
      const randomIndex = Math.floor(Math.random() * wordList.length);
      let word = wordList[randomIndex];

      // Capitalize first word of sentence
      if (i === 0) {
        word = word.charAt(0).toUpperCase() + word.slice(1);
      }

      // Add commas appropriately (not on first or last word)
      if (i > 0 && i < sentenceLength - 1 && Math.random() < 0.15) {
        word += ',';
      }

      sentenceWords.push(word);
    }

    // Add sentence-ending punctuation
    const lastWordIndex = sentenceWords.length - 1;
    let endingPunct = '.';
    const rand = Math.random();
    if (rand < 0.1) {
      endingPunct = '!';
    } else if (rand < 0.2) {
      endingPunct = '?';
    }

    sentenceWords[lastWordIndex] += endingPunct;
    sentences.push(sentenceWords.join(' '));
  }

  return sentences.join(' ');
}

// Generate text with numbers scattered throughout
export function generateNumbersText(
  wordCount: number = 50,
  difficulty: Difficulty = 'medium'
): string {
  const wordList = getWordListForDifficulty(difficulty);
  const sentences: string[] = [];
  let remainingWords = wordCount;

  while (remainingWords > 0) {
    // Determine sentence length (3-15 words for natural variation)
    const sentenceLength = Math.min(
      Math.floor(Math.random() * 13) + 3,
      remainingWords
    );
    remainingWords -= sentenceLength;

    const sentenceWords: string[] = [];

    // Generate words for this sentence
    for (let i = 0; i < sentenceLength; i++) {
      let word: string;

      // Decide whether to use a number (25% chance, but only in appropriate positions)
      if (i > 0 && i < sentenceLength - 1 && Math.random() < 0.25) {
        // Generate different types of numbers based on context
        const numberType = Math.random();

        if (numberType < 0.3) {
          // Small numbers (1-99)
          word = Math.floor(Math.random() * 99) + 1 + '';
        } else if (numberType < 0.5) {
          // Years (1900-2024)
          word = Math.floor(Math.random() * 125) + 1900 + '';
        } else if (numberType < 0.7) {
          // Prices ($1.00-$999.99)
          const dollars = Math.floor(Math.random() * 999) + 1;
          const cents = Math.floor(Math.random() * 100);
          word = '$' + dollars + '.' + cents.toString().padStart(2, '0');
        } else if (numberType < 0.85) {
          // Phone numbers (simple format)
          const area = Math.floor(Math.random() * 900) + 100;
          const exchange = Math.floor(Math.random() * 900) + 100;
          const number = Math.floor(Math.random() * 9000) + 1000;
          word = area + '-' + exchange + '-' + number;
        } else {
          // Regular numbers (1-4 digits)
          const numDigits = Math.floor(Math.random() * 4) + 1;
          let number = '';
          for (let j = 0; j < numDigits; j++) {
            number += Math.floor(Math.random() * 10).toString();
          }
          word = number;
        }
      } else {
        const randomIndex = Math.floor(Math.random() * wordList.length);
        word = wordList[randomIndex];

        // Capitalize first word of sentence
        if (i === 0) {
          word = word.charAt(0).toUpperCase() + word.slice(1);
        }
      }

      // Add commas appropriately (not on numbers or first/last word)
      if (
        i > 0 &&
        i < sentenceLength - 1 &&
        !word.includes('$') &&
        !word.includes('-') &&
        !/^\d+$/.test(word) &&
        Math.random() < 0.15
      ) {
        word += ',';
      }

      sentenceWords.push(word);
    }

    // Add sentence-ending punctuation
    const lastWordIndex = sentenceWords.length - 1;
    let endingPunct = '.';
    const rand = Math.random();
    if (rand < 0.1) {
      endingPunct = '!';
    } else if (rand < 0.2) {
      endingPunct = '?';
    }

    sentenceWords[lastWordIndex] += endingPunct;
    sentences.push(sentenceWords.join(' '));
  }

  return sentences.join(' ');
}

// Generate simple lowercase text
export function generateSimpleText(
  wordCount: number = 50,
  difficulty: Difficulty = 'medium'
): string {
  const words: string[] = [];
  const wordList = getWordListForDifficulty(difficulty);

  for (let i = 0; i < wordCount; i++) {
    const randomIndex = Math.floor(Math.random() * wordList.length);
    words.push(wordList[randomIndex].toLowerCase());
  }

  return words.join(' ');
}

// Get a random quote with at least 50 words
export function getRandomQuote(): string {
  // Filter quotes that have at least 50 words
  const longQuotes = QUOTES.filter((quote) => quote.split(' ').length >= 50);

  if (longQuotes.length > 0) {
    const randomIndex = Math.floor(Math.random() * longQuotes.length);
    return longQuotes[randomIndex];
  } else {
    // Fallback to any quote if no long ones exist
    const randomIndex = Math.floor(Math.random() * QUOTES.length);
    return QUOTES[randomIndex];
  }
}

// Main function to initialize text based on type, mode, and difficulty
export function initializeText(
  currentType: TestType,
  currentMode: TestMode,
  timerDuration: number = 60,
  wordsCount: number = 50,
  difficulty: Difficulty = 'medium'
): string {
  // For quotes, ignore currentMode and return a quote
  if (currentType === 'quotes') {
    return getRandomQuote();
  }

  let wordCount: number;

  // Determine word count based on mode
  if (currentMode === 'timer') {
    // Estimate words based on timer duration (assuming ~200 WPM average)
    const estimatedWords = Math.ceil((timerDuration * 200) / 60);
    wordCount = Math.max(estimatedWords, 25); // Minimum 25 words
  } else {
    // Words mode - use exact word count
    wordCount = wordsCount;
  }

  // Generate text based on type and difficulty
  switch (currentType) {
    case 'punctuation':
      return generatePunctuationText(wordCount, difficulty);
    case 'numbers':
      return generateNumbersText(wordCount, difficulty);
    case 'text':
    default:
      return generateSimpleText(wordCount, difficulty);
  }
}
