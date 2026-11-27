import { allPlays, combosOfShape, rankOf, TWO } from '../shared/rules.js';

const comboCost = (c) => c.top + (rankOf(c.top) === TWO ? 60 : 0);

/**
 * Bot đơn giản nhưng không ngốc:
 * - Được đánh tự do: ưu tiên bỏ bài nhỏ nhất, kèm sảnh/đôi dài nếu có.
 * - Phải đè: chọn bộ nhỏ nhất đè được, hạn chế dùng heo/hàng khi còn nhiều bài.
 * Trả về mảng id lá bài, hoặc null để bỏ lượt.
 */
export function botChoose(hand, prev, opponentsMin = 13, legal = () => true) {
  const plays = allPlays(hand, prev).filter(legal);
  if (!plays.length) return null;

  if (!prev) {
    // Nếu đánh hết được 1 lần thì đánh luôn
    const all = plays.find((p) => p.cards.length === hand.length);
    if (all) return all.cards;
    const lowest = Math.min(...hand);
    const withLowest = plays.filter((p) => p.cards.includes(lowest) && p.type !== 'quad');
    // Ưu tiên sảnh dài > đôi thông > sám > đôi > rác, chứa lá nhỏ nhất
    const score = (p) => {
      const base = { straight: 30, pairseq: 25, triple: 20, pair: 15, single: 10 }[p.type] || 0;
      return base + p.cards.length * 2 - (rankOf(p.top) >= 10 ? 25 : 0);
    };
    withLowest.sort((a, b) => score(b) - score(a));
    // Gần hết bài: đối thủ sắp về thì đánh bài to để chặn
    if (opponentsMin <= 2) {
      const big = [...plays].filter((p) => p.cards.length > opponentsMin || p.type !== 'single');
      if (big.length) return big.sort((a, b) => b.cards.length - a.cards.length)[0].cards;
      return plays.sort((a, b) => b.top - a.top)[0].cards;
    }
    return (withLowest[0] || plays[0]).cards;
  }

  const sameShape = plays.filter((p) => p.type === prev.type && p.len === prev.len);
  const chops = plays.filter((p) => !(p.type === prev.type && p.len === prev.len));
  const prevIsTwo = rankOf(prev.top) === TWO;

  // Chặt heo luôn là sướng
  if (prevIsTwo && chops.length) return chops.sort((a, b) => comboCost(a) - comboCost(b))[0].cards;

  // Tránh phá bộ: ưu tiên lá không nằm trong đôi/sảnh nếu đánh rác
  const pairsCards = new Set(combosOfShape(hand, 'pair', 1).flatMap((c) => c.cards));
  const penalty = (p) => {
    let s = comboCost(p);
    if (p.type === 'single' && pairsCards.has(p.cards[0])) s += 8;
    return s;
  };
  sameShape.sort((a, b) => penalty(a) - penalty(b));
  const best = sameShape[0];
  if (!best) return null;

  const usesTwo = best.cards.some((id) => rankOf(id) === TWO);
  const urgent = opponentsMin <= 3 || hand.length <= 5;
  if (usesTwo && !urgent && Math.random() < 0.55) return null; // giữ heo
  if (rankOf(best.top) >= 11 && !urgent && Math.random() < 0.2) return null;
  return best.cards;
}
