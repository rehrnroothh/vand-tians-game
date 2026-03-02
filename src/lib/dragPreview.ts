import type { DragEvent } from 'react';
import { cardLabel, isRedSuit, type Card, suitSymbols } from '@/lib/gameEngine';

const CARD_WIDTH = 56;
const CARD_HEIGHT = 80;

const applyCardBaseStyles = (element: HTMLDivElement) => {
  element.style.width = `${CARD_WIDTH}px`;
  element.style.height = `${CARD_HEIGHT}px`;
  element.style.borderRadius = '0.5rem';
  element.style.boxSizing = 'border-box';
  element.style.userSelect = 'none';
  element.style.webkitUserSelect = 'none';
};

const createFaceDownPreview = () => {
  const preview = document.createElement('div');
  applyCardBaseStyles(preview);
  preview.style.display = 'flex';
  preview.style.alignItems = 'center';
  preview.style.justifyContent = 'center';
  preview.style.border = '1px solid rgba(225, 94, 94, 0.35)';
  preview.style.background = 'linear-gradient(135deg, rgba(225, 94, 94, 0.88), rgba(138, 28, 28, 0.92))';

  const questionMark = document.createElement('span');
  questionMark.textContent = '?';
  questionMark.style.fontFamily = 'system-ui, sans-serif';
  questionMark.style.fontSize = '0.75rem';
  questionMark.style.fontWeight = '700';
  questionMark.style.color = 'rgba(12, 14, 20, 0.42)';
  preview.appendChild(questionMark);

  return preview;
};

const createFaceUpPreview = (card: Card) => {
  const preview = document.createElement('div');
  applyCardBaseStyles(preview);
  preview.style.display = 'flex';
  preview.style.flexDirection = 'column';
  preview.style.padding = '0.35rem';
  preview.style.border = '2px solid transparent';
  preview.style.backgroundColor = 'hsl(40 20% 92%)';
  preview.style.fontFamily = 'system-ui, sans-serif';
  preview.style.color = isRedSuit(card.suit) ? 'hsl(0 65% 45%)' : 'hsl(222 30% 8%)';

  const corner = document.createElement('div');
  corner.style.display = 'flex';
  corner.style.gap = '0.15rem';
  corner.style.alignItems = 'center';
  corner.style.lineHeight = '1';

  const value = document.createElement('span');
  value.textContent = cardLabel(card.value);
  value.style.fontSize = '0.8rem';
  value.style.fontWeight = '700';

  const suit = document.createElement('span');
  suit.textContent = suitSymbols[card.suit];
  suit.style.fontSize = '0.8rem';

  corner.append(value, suit);

  const center = document.createElement('div');
  center.style.flex = '1';
  center.style.display = 'flex';
  center.style.alignItems = 'center';
  center.style.justifyContent = 'center';

  const centerSuit = document.createElement('span');
  centerSuit.textContent = suitSymbols[card.suit];
  centerSuit.style.fontSize = '1.1rem';

  center.appendChild(centerSuit);
  preview.append(corner, center);

  return preview;
};

export const setCardDragPreview = (
  event: DragEvent<HTMLDivElement>,
  card: Card | undefined,
  count: number,
  faceDown = false,
) => {
  if (typeof document === 'undefined' || !event.dataTransfer) {
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.top = '-9999px';
  wrapper.style.left = '-9999px';
  wrapper.style.pointerEvents = 'none';
  wrapper.style.width = `${CARD_WIDTH + 8}px`;
  wrapper.style.height = `${CARD_HEIGHT + 8}px`;

  const mainLayer = faceDown || !card ? createFaceDownPreview() : createFaceUpPreview(card);
  mainLayer.style.position = 'absolute';
  mainLayer.style.left = '0';
  mainLayer.style.top = '0';
  wrapper.appendChild(mainLayer);

  if (count > 1) {
    const badge = document.createElement('div');
    badge.textContent = String(count);
    badge.style.position = 'absolute';
    badge.style.right = '-2px';
    badge.style.top = '-3px';
    badge.style.minWidth = '20px';
    badge.style.height = '20px';
    badge.style.padding = '0 5px';
    badge.style.borderRadius = '999px';
    badge.style.display = 'flex';
    badge.style.alignItems = 'center';
    badge.style.justifyContent = 'center';
    badge.style.backgroundColor = 'hsl(0 72% 55%)';
    badge.style.color = 'hsl(222 30% 8%)';
    badge.style.fontFamily = 'system-ui, sans-serif';
    badge.style.fontSize = '0.65rem';
    badge.style.fontWeight = '700';
    badge.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.22)';
    wrapper.appendChild(badge);
  }

  document.body.appendChild(wrapper);
  event.dataTransfer.setDragImage(wrapper, 24, 36);

  window.setTimeout(() => {
    wrapper.remove();
  }, 0);
};
