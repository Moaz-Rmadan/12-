import { doc, runTransaction } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Atomic Order Number Generation
 * Uses Firestore transaction to safely increment sequence counter
 * Prevents concurrent duplicate order numbers (e.g. JO-2026-0101)
 */
export async function generateNextOrderNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const counterRef = doc(db, 'order_counters', `job_orders_${currentYear}`);

  try {
    const nextSeq = await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      let seq = 101; // Start sequence at 101 for the year

      if (counterDoc.exists()) {
        const data = counterDoc.data();
        seq = (data.last_sequence || 100) + 1;
      }

      transaction.set(
        counterRef,
        {
          year: currentYear,
          last_sequence: seq,
          updated_at: new Date().toISOString(),
        },
        { merge: true }
      );

      return seq;
    });

    return `JO-${currentYear}-${String(nextSeq).padStart(4, '0')}`;
  } catch (error) {
    console.warn('[Order Number Service]: Fallback timestamp-based generation due to:', error);
    const fallbackSeq = Math.floor(1000 + Math.random() * 9000);
    return `JO-${currentYear}-${fallbackSeq}`;
  }
}
