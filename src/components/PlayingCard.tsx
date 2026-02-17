import { motion } from 'framer-motion';
import { CardData, cardLabel, suitSymbols, isRedSuit } from '@/lib/gameRules';

interface PlayingCardProps {
  card: CardData;
  isFlipped: boolean;
  onFlip: () => void;
}

const PlayingCard = ({ card, isFlipped, onFlip }: PlayingCardProps) => {
  const label = cardLabel(card.value);
  const symbol = suitSymbols[card.suit];
  const red = isRedSuit(card.suit);

  return (
    <div className="perspective-[800px] w-56 h-80 cursor-pointer" onClick={onFlip}>
      <motion.div
        className="relative w-full h-full"
        initial={false}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Back */}
        <div
          className="absolute inset-0 rounded-2xl card-shadow flex items-center justify-center"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="w-full h-full rounded-2xl bg-gradient-to-br from-primary/80 to-accent border-2 border-primary/40 flex items-center justify-center">
            <div className="w-[85%] h-[90%] rounded-xl border-2 border-primary-foreground/20 flex items-center justify-center">
              <span className="text-4xl font-bold text-primary-foreground/60 tracking-tighter">VT</span>
            </div>
          </div>
        </div>

        {/* Front */}
        <div
          className="absolute inset-0 rounded-2xl card-shadow"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <div className={`w-full h-full rounded-2xl bg-foreground flex flex-col p-4 ${red ? 'text-card-red' : 'text-background'}`}>
            <div className="flex justify-between items-start">
              <div className="flex flex-col items-center leading-none">
                <span className="text-2xl font-bold">{label}</span>
                <span className="text-xl">{symbol}</span>
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <span className="text-7xl">{symbol}</span>
            </div>
            <div className="flex justify-end">
              <div className="flex flex-col items-center leading-none rotate-180">
                <span className="text-2xl font-bold">{label}</span>
                <span className="text-xl">{symbol}</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PlayingCard;
