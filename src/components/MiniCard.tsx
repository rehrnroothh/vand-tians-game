import { motion } from 'framer-motion';
import type { DragEvent, PointerEvent as ReactPointerEvent } from 'react';
import { Card, cardLabel, suitSymbols, isRedSuit } from '@/lib/gameEngine';

interface MiniCardProps {
  card: Card;
  faceDown?: boolean;
  selected?: boolean;
  disabled?: boolean;
  small?: boolean;
  shadowless?: boolean;
  onClick?: () => void;
  draggable?: boolean;
  onNativeDragStart?: (event: DragEvent<HTMLDivElement>) => void;
  onNativeDragEnd?: (event: DragEvent<HTMLDivElement>) => void;
  onNativeDragOver?: (event: DragEvent<HTMLDivElement>) => void;
  onNativeDrop?: (event: DragEvent<HTMLDivElement>) => void;
  onNativePointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onNativePointerMove?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onNativePointerUp?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onNativePointerCancel?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  swapDropCardId?: string;
  swapDropType?: 'hand' | 'faceUp';
}

const MiniCard = ({
  card,
  faceDown = false,
  selected = false,
  disabled = false,
  small = false,
  shadowless = false,
  onClick,
  draggable = false,
  onNativeDragStart,
  onNativeDragEnd,
  onNativeDragOver,
  onNativeDrop,
  onNativePointerDown,
  onNativePointerMove,
  onNativePointerUp,
  onNativePointerCancel,
  swapDropCardId,
  swapDropType,
}: MiniCardProps) => {
  const w = small ? 'w-12 h-[4.2rem]' : 'w-14 h-20';
  const textSize = small ? 'text-xs' : 'text-sm';
  const symbolSize = small ? 'text-base' : 'text-lg';

  if (faceDown) {
    return (
      <motion.div
        whileHover={!disabled ? { y: -4 } : undefined}
        whileTap={!disabled ? { scale: 0.95 } : undefined}
        className={disabled ? 'opacity-40' : undefined}
      >
        <div
          onClick={disabled ? undefined : onClick}
          draggable={draggable && !disabled}
          onDragStart={onNativeDragStart}
          onDragEnd={onNativeDragEnd}
          onDragOver={onNativeDragOver}
          onDrop={onNativeDrop}
          onPointerDown={onNativePointerDown}
          onPointerMove={onNativePointerMove}
          onPointerUp={onNativePointerUp}
          onPointerCancel={onNativePointerCancel}
          data-swap-card-id={swapDropCardId}
          data-swap-card-type={swapDropType}
          className={`${w} rounded-lg bg-gradient-to-br from-primary/70 to-accent border border-primary/30 flex items-center justify-center cursor-pointer ${shadowless ? '' : 'card-shadow'} select-none touch-manipulation ${disabled ? 'cursor-default' : ''}`}
          style={{ touchAction: onNativePointerDown ? 'none' : undefined }}
        >
          <span className="text-xs font-bold text-primary-foreground/40">?</span>
        </div>
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
      className={selected ? '-translate-y-2' : undefined}
    >
      <div
        onClick={disabled ? undefined : onClick}
        draggable={draggable && !disabled}
        onDragStart={onNativeDragStart}
        onDragEnd={onNativeDragEnd}
        onDragOver={onNativeDragOver}
        onDrop={onNativeDrop}
        onPointerDown={onNativePointerDown}
        onPointerMove={onNativePointerMove}
        onPointerUp={onNativePointerUp}
        onPointerCancel={onNativePointerCancel}
        data-swap-card-id={swapDropCardId}
        data-swap-card-type={swapDropType}
        className={`${w} rounded-lg flex flex-col p-1.5 cursor-pointer ${shadowless ? '' : 'card-shadow'} select-none touch-manipulation transition-all border-2
          ${red ? 'text-card-red' : 'text-background'}
          ${selected ? 'border-primary ring-2 ring-primary/50' : 'border-transparent'}
          ${disabled ? 'opacity-40 cursor-default' : ''}
        `}
        style={{
          backgroundColor: 'hsl(40, 20%, 92%)',
          touchAction: onNativePointerDown ? 'none' : undefined,
        }}
      >
        <div className="flex items-center gap-0.5 leading-none">
          <span className={`${textSize} font-bold`}>{label}</span>
          <span className={`${textSize}`}>{symbol}</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className={symbolSize}>{symbol}</span>
        </div>
      </div>
    </motion.div>
  );
};

export default MiniCard;
