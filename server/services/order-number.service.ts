import admin from 'firebase-admin';
import { getFirebaseFirestore } from '../lib/firebase-admin';
import { InternalServerError, ConflictError } from '../errors/app-error';

/**
 * =============================================================================
 * AL-NAJJAR DESIGN — ATOMIC ORDER NUMBER GENERATOR (PHASE 3.1)
 * =============================================================================
 * Backend-Authoritative Sequence Generator using Firestore Admin SDK Transactions.
 *
 * Requirements & Boundaries:
 * 1. Collection: 'order_counters'
 * 2. Document: `job_orders_${year}` (e.g. `job_orders_2026`)
 * 3. Base Sequence: Starts at 101 for the year (padding 4 digits: JO-2026-0101)
 * 4. Atomic Increment: (last_sequence || 100) + 1 inside a Firestore transaction.
 * 5. Strict Zero-Random-Fallback: Never generate random fallback numbers on failure.
 *    Any failure bubbles up cleanly as an AppError.
 * 6. Malformed Counter Guard: Rejects corrupted counters (NaN, negative, non-integer).
 * 7. Transaction Integration: Can be executed standalone or embedded within a larger
 *    parent Firestore transaction.
 */

export interface OrderNumberResult {
  orderNumber: string;
  sequence: number;
  year: number;
}

export interface OrderCounterDocument {
  year: number;
  last_sequence: number;
  updated_at: admin.firestore.FieldValue | string;
  created_at?: admin.firestore.FieldValue | string;
}

export const ORDER_COUNTERS_COLLECTION = 'order_counters';
export const BASE_STARTING_SEQUENCE = 101;

/**
 * Format sequence integer into canonical AL-NAJJAR DESIGN order number
 * Format: JO-YYYY-XXXX (e.g. JO-2026-0101, JO-2026-1050)
 */
export function formatOrderNumber(year: number, sequence: number): string {
  return `JO-${year}-${String(sequence).padStart(4, '0')}`;
}

/**
 * Compute the next sequence number inside an active Firestore Transaction
 *
 * @param transaction Active Firestore Admin Transaction
 * @param firestore Optional Firestore instance (defaults to getFirebaseFirestore())
 * @param targetYear Optional year override (defaults to current calendar year)
 */
export async function generateOrderNumberInTransaction(
  transaction: admin.firestore.Transaction,
  firestore?: admin.firestore.Firestore,
  targetYear?: number
): Promise<OrderNumberResult> {
  const db = firestore || getFirebaseFirestore();
  const year = targetYear || new Date().getFullYear();
  const counterDocId = `job_orders_${year}`;
  const counterRef = db.collection(ORDER_COUNTERS_COLLECTION).doc(counterDocId);

  const snapshot = await transaction.get(counterRef);
  let nextSeq: number;

  if (!snapshot.exists) {
    // Fresh counter document for this year: start sequence at 101
    nextSeq = BASE_STARTING_SEQUENCE;
    const initialData: OrderCounterDocument = {
      year,
      last_sequence: nextSeq,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    };
    transaction.set(counterRef, initialData);
  } else {
    const data = snapshot.data();
    if (!data || typeof data.last_sequence !== 'number' || isNaN(data.last_sequence)) {
      throw new InternalServerError(
        `بيانات عداد أوامر الشغل للسنة ${year} تالفة أو غير صالحة (Counter document is malformed or corrupted)`,
        { counterDocId, rawData: data },
        'MALFORMED_COUNTER_DOCUMENT'
      );
    }

    if (data.last_sequence < 100 || !Number.isInteger(data.last_sequence)) {
      throw new InternalServerError(
        `تسلسل عداد أوامر الشغل غير صالح (Counter sequence value is negative or non-integer)`,
        { counterDocId, last_sequence: data.last_sequence },
        'INVALID_COUNTER_SEQUENCE'
      );
    }

    nextSeq = data.last_sequence + 1;

    transaction.update(counterRef, {
      last_sequence: nextSeq,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  return {
    orderNumber: formatOrderNumber(year, nextSeq),
    sequence: nextSeq,
    year,
  };
}

/**
 * Standalone Order Number Generator
 * Wraps generation in an isolated Firestore runTransaction call.
 *
 * @param firestore Optional Firestore instance (defaults to getFirebaseFirestore())
 * @param targetYear Optional year override (defaults to current calendar year)
 */
export async function generateNextOrderNumber(
  firestore?: admin.firestore.Firestore,
  targetYear?: number
): Promise<OrderNumberResult> {
  const db = firestore || getFirebaseFirestore();
  const year = targetYear || new Date().getFullYear();

  try {
    return await db.runTransaction(async (transaction) => {
      return await generateOrderNumberInTransaction(transaction, db, year);
    });
  } catch (error) {
    if (error instanceof InternalServerError || error instanceof ConflictError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    console.error('[OrderNumberService] Atomic generation failed:', message);
    throw new InternalServerError(
      'فشل توليد رقم أمر الشغل التسلسلي على الخادم (Failed to atomically generate order number)',
      { error: message, year },
      'ORDER_NUMBER_GENERATION_FAILED'
    );
  }
}
