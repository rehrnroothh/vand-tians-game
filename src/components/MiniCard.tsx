import { motion } from 'framer-motion';
import { Card, cardLabel, suitSymbols, isRedSuit } from '@/lib/gameEngine';

interface MiniCardProps {
  card: Card;
  faceDown?: boolean;
  selected?: boolean;
  disabled?: boolean;
  small?: boolean;
  onClick?: () => void;
}

const MiniCard = ({ card, faceDown = false, selected = false, disabled = false, small = false, onClick }: MiniCardProps) => {
  const w = small ? 'w-12 h-[4.2rem]' : 'w-14 h-20';
  const textSize = small ? 'text-xs' : 'text-sm';
  const symbolSize = small ? 'text-base' : 'text-lg';

  if (faceDown) {
    return (
      <motion.div
        whileHover={!disabled ? { y: -4 } : undefined}
        whileTap={!disabled ? { scale: 0.95 } : undefined}
        onClick={disabled ? undefined : onClick}
        className={`${w} rounded-lg bg-gradient-to-br from-primary/70 to-accent border border-primary/30 flex items-center justify-center cursor-pointer card-shadow select-none ${disabled ? 'opacity-40' : ''}`}
      >
        <span className="text-xs font-bold text-primary-foreground/40">?</span>
      </motion.div>
    );
  }

  const label = cardLabel(card.value);
  const symbol = suitSymbols[card.suit];
  const red = isRedSuit(card.suit);

  return (
    <motion.div
      whileHover={!disabled ? { y: -6 } : undefined}
      whileTap={!disabled ? { scale: 0.95 } : undefined}
      onClick={disabled ? undefined : onClick}
      className={`${w} rounded-lg flex flex-col p-1.5 cursor-pointer card-shadow select-none transition-all border-2
        ${red ? 'text-card-red' : 'text-background'}
        ${selected ? 'border-primary ring-2 ring-primary/50 -translate-y-2' : 'border-transparent'}
        ${disabled ? 'opacity-40 cursor-default' : ''}
      `}
      style={{ backgroundColor: 'hsl(40, 20%, 92%)' }}
    >
      <div className="flex items-center gap-0.5 leading-none">
        <span className={`${textSize} font-bold`}>{label}</span>
        <span className={`${textSize}`}>{symbol}</span>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <span className={symbolSize}>{symbol}</span>
      </div>
    </motion.div>
  );
};

export default MiniCard;
