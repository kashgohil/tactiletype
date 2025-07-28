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
}

export class TypingEngine {
  private text: string;
  private state: TypingState;
  private onStatsUpdate?: (stats: TypingStats) => void;
  private onStateUpdate?: (state: TypingState) => void;

  constructor(text: string, onStatsUpdate?: (stats: TypingStats) => void, onStateUpdate?: (state: TypingState) => void) {
    this.text = text;
    this.onStatsUpdate = onStatsUpdate;
    this.onStateUpdate = onStateUpdate;
    this.state = {
      currentIndex: 0,
      userInput: '',
      errors: new Set(),
      startTime: null,
      endTime: null,
      isComplete: false,
      isStarted: false,
    };
  }

  public handleKeyPress(key: string): void {
    if (this.state.isComplete) return;

    // Start the test on first keypress
    if (!this.state.isStarted) {
      this.state.startTime = Date.now();
      this.state.isStarted = true;
    }

    // Handle backspace
    if (key === 'Backspace') {
      if (this.state.currentIndex > 0) {
        this.state.currentIndex--;
        this.state.userInput = this.state.userInput.slice(0, -1);
        this.state.errors.delete(this.state.currentIndex);
      }
    } 
    // Handle regular characters
    else if (key.length === 1) {
      const expectedChar = this.text[this.state.currentIndex];
      
      // Add character to user input
      this.state.userInput += key;
      
      // Check if character is correct
      if (key !== expectedChar) {
        this.state.errors.add(this.state.currentIndex);
      }
      
      this.state.currentIndex++;
      
      // Check if test is complete
      if (this.state.currentIndex >= this.text.length) {
        this.state.isComplete = true;
        this.state.endTime = Date.now();
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
    const wpm = timeInMinutes > 0 ? Math.round((correctChars / 5) / timeInMinutes) : 0;
    
    // Calculate accuracy
    const accuracy = totalChars > 0 ? Math.round((correctChars / totalChars) * 100) : 100;

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

  public reset(): void {
    this.state = {
      currentIndex: 0,
      userInput: '',
      errors: new Set(),
      startTime: null,
      endTime: null,
      isComplete: false,
      isStarted: false,
    };
    this.onStateUpdate?.(this.state);
    this.onStatsUpdate?.(this.calculateStats());
  }

  public getCharacterStatus(index: number): 'correct' | 'incorrect' | 'current' | 'pending' {
    if (index === this.state.currentIndex && !this.state.isComplete) {
      return 'current';
    } else if (index < this.state.currentIndex) {
      return this.state.errors.has(index) ? 'incorrect' : 'correct';
    } else {
      return 'pending';
    }
  }

  public getProgress(): number {
    return this.text.length > 0 ? (this.state.currentIndex / this.text.length) * 100 : 0;
  }
}

// Utility function to format time
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Utility function to generate random text for testing
export function generateTestText(wordCount: number = 50): string {
  const commonWords = [
    'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
    'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
    'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
    'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their',
    'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go',
    'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him',
    'know', 'take', 'people', 'into', 'year', 'your', 'good', 'some',
    'could', 'them', 'see', 'other', 'than', 'then', 'now', 'look',
    'only', 'come', 'its', 'over', 'think', 'also', 'back', 'after',
    'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way', 'even',
    'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us'
  ];

  const words: string[] = [];
  for (let i = 0; i < wordCount; i++) {
    const randomIndex = Math.floor(Math.random() * commonWords.length);
    words.push(commonWords[randomIndex]);
  }

  return words.join(' ');
}