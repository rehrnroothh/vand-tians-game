export interface CardData {
  value: number; // 1=Ace, 2-10, 11=Jack, 12=Queen, 13=King
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
}

export const suitSymbols: Record<CardData['suit'], string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

export const isRedSuit = (suit: CardData['suit']) =>
  suit === 'hearts' || suit === 'diamonds';

export const cardLabel = (value: number): string => {
  switch (value) {
    case 1: return 'A';
    case 11: return 'J';
    case 12: return 'Q';
    case 13: return 'K';
    default: return String(value);
  }
};

export interface Rule {
  title: string;
  description: string;
  emoji: string;
}

export const rules: Record<number, Rule> = {
  1:  { title: 'Vattenfall', description: 'Alla dricker! Den som drog kortet börjar, och nästa person får inte sluta förrän personen innan har slutat.', emoji: '🌊' },
  2:  { title: 'Välj', description: 'Välj en person som ska dricka.', emoji: '👉' },
  3:  { title: 'Tre = Me', description: 'Du dricker själv!', emoji: '🍺' },
  4:  { title: 'Golvet', description: 'Sista personen som rör golvet dricker!', emoji: '👇' },
  5:  { title: 'Tummen', description: 'Du blir Tumme-mästare! Lägg tummen på bordet när du vill — sista personen som gör det dricker.', emoji: '👍' },
  6:  { title: 'Killarna', description: 'Alla killar dricker!', emoji: '🧔' },
  7:  { title: 'Himlen', description: 'Sista personen som pekar uppåt dricker!', emoji: '☝️' },
  8:  { title: 'Kompis', description: 'Välj en dricker-kompis. Ni dricker tillsammans resten av spelet!', emoji: '🤝' },
  9:  { title: 'Rimtid', description: 'Säg ett ord — alla rimmar i tur och ordning. Den som misslyckas dricker!', emoji: '🎤' },
  10: { title: 'Kategori', description: 'Välj en kategori (t.ex. bilmärken). Alla säger ett svar i tur och ordning. Den som misslyckas dricker!', emoji: '📋' },
  11: { title: 'Regel', description: 'Hitta på en ny regel! Den som bryter mot den dricker.', emoji: '📜' },
  12: { title: 'Frågemästare', description: 'Du är Frågemästaren! Den som svarar på dina frågor dricker.', emoji: '❓' },
  13: { title: 'Kungens bägare', description: 'Häll lite av din dryck i koppen i mitten. Den som drar sista kungen dricker hela!', emoji: '👑' },
};

export const createDeck = (): CardData[] => {
  const suits: CardData['suit'][] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const deck: CardData[] = [];
  for (const suit of suits) {
    for (let value = 1; value <= 13; value++) {
      deck.push({ value, suit });
    }
  }
  // Shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};
