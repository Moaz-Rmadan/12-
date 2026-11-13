import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  salesJobOrderCreateSchema,
  salesJobOrderUpdateSchema,
  jobOrderIdParamSchema,
  APPROVED_TECHNICAL_ROLES,
  APPROVED_ORDER_STATUSES,
} from '../../server/validators/job-orders';
import {
  generateOrderNumberInTransaction,
  generateNextOrderNumber,
  formatOrderNumber,
  ORDER_COUNTERS_COLLECTION,
  BASE_STARTING_SEQUENCE,
} from '../../server/services/order-number.service';
import {
  buildSanitizedAuditPayload,
  recordAuditEventInTransaction,
  recordAuditEvent,
  AUDIT_LOGS_COLLECTION,
} from '../../server/services/audit.service';
import {
  FirestoreIdempotencyStore,
  IDEMPOTENCY_COLLECTION,
} from '../../server/idempotency/firestore-store';
import { AuthenticatedUser } from '../../server/types/auth';
import { AppError, InternalServerError, ValidationError } from '../../server/errors/app-error';

/**
 * =============================================================================
 * IN-MEMORY FIRESTORE MOCK TEST DOUBLE (ZERO PRODUCTION CONNECTION)
 * =============================================================================
 * Emulates the Firestore Admin SDK interface required by OrderNumberService,
 * AuditService, and FirestoreIdempotencyStore without touching production database.
 */
function createMockFirestore() {
  const collections = new Map<string, Map<string, any>>();

  function getCol(colName: string): Map<string, any> {
    if (!collections.has(colName)) {
      collections.set(colName, new Map<string, any>());
    }
    return collections.get(colName)!;
  }

  const mockDb: any = {
    collection: (colName: string) => {
      return {
        doc: (docId?: string) => {
          const id = docId || `mock-doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          return {
            id,
            get: async () => {
              const col = getCol(colName);
              const exists = col.has(id);
              return {
                id,
                exists,
                data: () => (exists ? JSON.parse(JSON.stringify(col.get(id))) : undefined),
              };
            },
            set: async (data: any, options?: any) => {
              const col = getCol(colName);
              if (options?.merge && col.has(id)) {
                col.set(id, { ...col.get(id), ...data });
              } else {
                col.set(id, { ...data });
              }
            },
            update: async (data: any) => {
              const col = getCol(colName);
              if (!col.has(id)) {
                throw new Error(`Document ${id} does not exist`);
              }
              col.set(id, { ...col.get(id), ...data });
            },
          };
        },
      };
    },

    runTransaction: (() => {
      let transactionQueue = Promise.resolve();
      return async (updateFunction: (transaction: any) => Promise<any>) => {
        const prev = transactionQueue;
        let release: () => void;
        transactionQueue = new Promise<void>((resolve) => {
          release = resolve;
        });

        await prev;
        try {
          const transaction: any = {
            get: async (docRef: any) => docRef.get(),
            set: (docRef: any, data: any, options?: any) => {
              docRef.set(data, options);
              return transaction;
            },
            update: (docRef: any, data: any) => {
              docRef.update(data);
              return transaction;
            },
          };

          return await updateFunction(transaction);
        } finally {
          release!();
        }
      };
    })(),

    _dump: () => collections,
    _clear: () => collections.clear(),
  };

  return mockDb;
}

// =============================================================================
// PHASE 3.1 TEST SUITE
// =============================================================================
describe('Phase 3.1: Backend Infrastructure & Persistence Foundations', () => {
  // ---------------------------------------------------------------------------
  // 1. Component A: Strict Job Order Zod Schemas
  // ---------------------------------------------------------------------------
  describe('1. Component A: Job Order Zod Schemas', () => {
    test('1.1 Technical roles and approved statuses match exact contract', () => {
      assert.deepEqual([...APPROVED_TECHNICAL_ROLES], ['admin', 'accounting', 'operations', 'sales']);
      assert.deepEqual([...APPROVED_ORDER_STATUSES], ['Draft', 'قيد التشغيل', 'تم التنفيذ', 'تسليم']);
    });

    test('1.2 Sales create schema accepts valid approved fields', () => {
      const validPayload = {
        customer_id: 'cust-12345',
        room_model_code: 'RM-BED-LUX-01',
        contract_date: '2026-11-15',
        delivery_date: '2026-12-20',
        general_specs: 'غرفة نوم رئيسية خشب زان أحمر مع دهان بولي يوريثان',
      };

      const result = salesJobOrderCreateSchema.safeParse(validPayload);
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.customer_id, 'cust-12345');
        assert.equal(result.data.room_model_code, 'RM-BED-LUX-01');
      }
    });

    test('1.3 Sales create schema rejects missing required fields', () => {
      const invalidPayload = {
        customer_id: 'cust-12345',
        // missing room_model_code, contract_date, delivery_date, general_specs
      };

      const result = salesJobOrderCreateSchema.safeParse(invalidPayload);
      assert.equal(result.success, false);
      if (!result.success) {
        const paths = result.error.issues.map((i) => i.path[0]);
        assert.ok(paths.includes('room_model_code'));
        assert.ok(paths.includes('contract_date'));
        assert.ok(paths.includes('delivery_date'));
        assert.ok(paths.includes('general_specs'));
      }
    });

    test('1.4 Sales create schema rejects invalid date format', () => {
      const invalidDatePayload = {
        customer_id: 'cust-12345',
        room_model_code: 'RM-BED-LUX-01',
        contract_date: '15/11/2026', // wrong format (must be YYYY-MM-DD)
        delivery_date: '2026-12-20',
        general_specs: 'مواصفات عامة',
      };

      const result = salesJobOrderCreateSchema.safeParse(invalidDatePayload);
      assert.equal(result.success, false);
    });

    test('1.5 Sales create schema strictly rejects status injection (Privilege Escalation Guard)', () => {
      const attackerPayload = {
        customer_id: 'cust-12345',
        room_model_code: 'RM-BED-LUX-01',
        contract_date: '2026-11-15',
        delivery_date: '2026-12-20',
        general_specs: 'مواصفات عامة',
        status: 'قيد التشغيل', // ATTACK: attempting to bypass Draft
      };

      const result = salesJobOrderCreateSchema.safeParse(attackerPayload);
      assert.equal(result.success, false);
      if (!result.success) {
        const issue = result.error.issues.find((i) => (i as any).keys?.includes('status') || i.path.includes('status'));
        assert.ok(issue, 'Must flag status as unrecognized/forbidden key');
      }
    });

    test('1.6 Sales create schema strictly rejects financial fields (total_price, deposit_paid)', () => {
      const attackerPayload = {
        customer_id: 'cust-12345',
        room_model_code: 'RM-BED-LUX-01',
        contract_date: '2026-11-15',
        delivery_date: '2026-12-20',
        general_specs: 'مواصفات عامة',
        total_price: 150000, // FORBIDDEN to sales
        deposit_paid: 50000, // FORBIDDEN to sales
      };

      const result = salesJobOrderCreateSchema.safeParse(attackerPayload);
      assert.equal(result.success, false);
    });

    test('1.7 Sales create schema strictly rejects backend-controlled fields (order_number, version, current_stage)', () => {
      const attackerPayload = {
        customer_id: 'cust-12345',
        room_model_code: 'RM-BED-LUX-01',
        contract_date: '2026-11-15',
        delivery_date: '2026-12-20',
        general_specs: 'مواصفات عامة',
        order_number: 'JO-2026-9999', // Backend-controlled
        version: 5,                   // Backend-controlled
        current_stage: 'تنجيد',       // Backend-controlled
      };

      const result = salesJobOrderCreateSchema.safeParse(attackerPayload);
      assert.equal(result.success, false);
    });

    test('1.8 Sales update schema accepts valid fields with expectedVersion', () => {
      const validUpdate = {
        expectedVersion: 1,
        room_model_code: 'RM-BED-LUX-02',
        general_specs: 'تعديل في لون القماش حسب طلب العميل',
        delivery_date: '2026-12-25',
      };

      const result = salesJobOrderUpdateSchema.safeParse(validUpdate);
      assert.equal(result.success, true);
    });

    test('1.9 Sales update schema rejects when no updatable fields provided', () => {
      const emptyUpdate = {
        expectedVersion: 1,
        // no other fields
      };

      const result = salesJobOrderUpdateSchema.safeParse(emptyUpdate);
      assert.equal(result.success, false);
    });

    test('1.10 Sales update schema strictly rejects financial or status alterations', () => {
      const maliciousUpdate = {
        expectedVersion: 1,
        delivery_date: '2026-12-25',
        total_price: 100000, // FORBIDDEN
        status: 'تسليم',    // FORBIDDEN
      };

      const result = salesJobOrderUpdateSchema.safeParse(maliciousUpdate);
      assert.equal(result.success, false);
    });

    test('1.11 Job order ID param schema validates clean ID and rejects special chars', () => {
      assert.equal(jobOrderIdParamSchema.safeParse({ id: 'ord-12345' }).success, true);
      assert.equal(jobOrderIdParamSchema.safeParse({ id: 'ord_2026_test' }).success, true);
      assert.equal(jobOrderIdParamSchema.safeParse({ id: 'ab' }).success, false); // too short
      assert.equal(jobOrderIdParamSchema.safeParse({ id: 'ord;DROP TABLE;' }).success, false); // injection chars
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Component B: Atomic Order Number Generator
  // ---------------------------------------------------------------------------
  describe('2. Component B: Atomic Order Number Generator Service', () => {
    test('2.1 Generates base sequence JO-YYYY-0101 on fresh counter', async () => {
      const mockDb = createMockFirestore();
      const result = await generateNextOrderNumber(mockDb, 2026);

      assert.equal(result.sequence, 101);
      assert.equal(result.year, 2026);
      assert.equal(result.orderNumber, 'JO-2026-0101');

      // Verify stored document in order_counters
      const snap = await mockDb.collection(ORDER_COUNTERS_COLLECTION).doc('job_orders_2026').get();
      assert.equal(snap.exists, true);
      assert.equal(snap.data().last_sequence, 101);
      assert.equal(snap.data().year, 2026);
    });

    test('2.2 Atomically increments existing sequence sequentially', async () => {
      const mockDb = createMockFirestore();

      const first = await generateNextOrderNumber(mockDb, 2026);
      assert.equal(first.orderNumber, 'JO-2026-0101');
      assert.equal(first.sequence, 101);

      const second = await generateNextOrderNumber(mockDb, 2026);
      assert.equal(second.orderNumber, 'JO-2026-0102');
      assert.equal(second.sequence, 102);

      const third = await generateNextOrderNumber(mockDb, 2026);
      assert.equal(third.orderNumber, 'JO-2026-0103');
      assert.equal(third.sequence, 103);
    });

    test('2.3 Concurrent requests generate unique, strictly non-duplicate sequences', async () => {
      const mockDb = createMockFirestore();
      const concurrentCount = 10;

      const promises = Array.from({ length: concurrentCount }, () =>
        generateNextOrderNumber(mockDb, 2026)
      );

      const results = await Promise.all(promises);
      const generatedNumbers = results.map((r) => r.orderNumber);
      const uniqueNumbers = new Set(generatedNumbers);

      assert.equal(uniqueNumbers.size, concurrentCount, 'All generated numbers must be distinct');
      assert.ok(generatedNumbers.includes('JO-2026-0101'));
      assert.ok(generatedNumbers.includes('JO-2026-0110'));
    });

    test('2.4 Rejects malformed counter document (Zero-Random-Fallback Guarantee)', async () => {
      const mockDb = createMockFirestore();
      // Corrupt counter document with string sequence
      await mockDb.collection(ORDER_COUNTERS_COLLECTION).doc('job_orders_2026').set({
        year: 2026,
        last_sequence: 'CORRUPTED_VALUE',
      });

      await assert.rejects(
        async () => {
          await generateNextOrderNumber(mockDb, 2026);
        },
        (err: any) => {
          assert.ok(err instanceof InternalServerError);
          assert.equal(err.code, 'MALFORMED_COUNTER_DOCUMENT');
          return true;
        }
      );
    });

    test('2.5 Rejects negative or non-integer counter sequence', async () => {
      const mockDb = createMockFirestore();
      await mockDb.collection(ORDER_COUNTERS_COLLECTION).doc('job_orders_2026').set({
        year: 2026,
        last_sequence: -50,
      });

      await assert.rejects(
        async () => {
          await generateNextOrderNumber(mockDb, 2026);
        },
        (err: any) => {
          assert.ok(err instanceof InternalServerError);
          assert.equal(err.code, 'INVALID_COUNTER_SEQUENCE');
          return true;
        }
      );
    });

    test('2.6 Integrates inside an active parent transaction', async () => {
      const mockDb = createMockFirestore();

      const result = await mockDb.runTransaction(async (transaction: any) => {
        // Child operation within parent transaction
        return await generateOrderNumberInTransaction(transaction, mockDb, 2027);
      });

      assert.equal(result.orderNumber, 'JO-2027-0101');
      assert.equal(result.year, 2027);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Component C: Server-Side Audit Service
  // ---------------------------------------------------------------------------
  describe('3. Component C: Server-Side Audit Service', () => {
    const mockActor: AuthenticatedUser = {
      uid: 'user-admin-1',
      email: 'cfo.moaz@gmail.com',
      role: 'admin',
      isActive: true,
      isDelegatedManager: false,
    };

    test('3.1 Builds sanitized payload using trusted actor credentials', () => {
      const payload = buildSanitizedAuditPayload({
        actor: mockActor,
        action: 'ORDER_CREATE',
        entityType: 'job_order',
        entityId: 'ord-1001',
        before: null,
        after: {
          order_number: 'JO-2026-0101',
          room_model_code: 'RM-BED-01',
          secret_key: 'SUPER_SECRET_TOKEN', // Must be redacted
        },
        reason: 'New contract signed by client',
      });

      assert.equal(payload.user_uid, 'user-admin-1');
      assert.equal(payload.user_email, 'cfo.moaz@gmail.com');
      assert.equal(payload.user_role, 'admin');
      assert.equal(payload.action, 'ORDER_CREATE');
      assert.equal(payload.entity_type, 'job_order');
      assert.equal(payload.entity_id, 'ord-1001');
      assert.equal(payload.after?.secret_key, '[REDACTED]', 'Sensitive key must be deeply redacted');
      assert.equal(payload.after?.room_model_code, 'RM-BED-01');
    });

    test('3.2 Rejects audit event if actor identity is missing or incomplete', () => {
      assert.throws(
        () => {
          buildSanitizedAuditPayload({
            actor: null as any,
            action: 'ORDER_UPDATE',
            entityType: 'job_order',
            entityId: 'ord-1001',
          });
        },
        (err: any) => {
          assert.ok(err instanceof ValidationError);
          assert.equal(err.code, 'MISSING_AUDIT_ACTOR');
          return true;
        }
      );
    });

    test('3.3 Rejects audit event if action or entityId is empty', () => {
      assert.throws(
        () => {
          buildSanitizedAuditPayload({
            actor: mockActor,
            action: '',
            entityType: 'job_order',
            entityId: 'ord-1001',
          });
        },
        (err: any) => {
          assert.ok(err instanceof ValidationError);
          assert.equal(err.code, 'MISSING_AUDIT_ACTION');
          return true;
        }
      );

      assert.throws(
        () => {
          buildSanitizedAuditPayload({
            actor: mockActor,
            action: 'ORDER_DELETE',
            entityType: 'job_order',
            entityId: '',
          });
        },
        (err: any) => {
          assert.ok(err instanceof ValidationError);
          assert.equal(err.code, 'MISSING_AUDIT_ENTITY_ID');
          return true;
        }
      );
    });

    test('3.4 Records standalone audit event to audit_logs collection', async () => {
      const mockDb = createMockFirestore();

      const docId = await recordAuditEvent(
        {
          actor: mockActor,
          action: 'STATUS_TRANSITION',
          entityType: 'job_order',
          entityId: 'ord-1001',
          before: { status: 'Draft' },
          after: { status: 'قيد التشغيل' },
          approvalReference: 'APPROVED_BY_ADMIN',
        },
        mockDb
      );

      assert.ok(docId.length > 0);
      const snap = await mockDb.collection(AUDIT_LOGS_COLLECTION).doc(docId).get();
      assert.equal(snap.exists, true);
      assert.equal(snap.data().action, 'STATUS_TRANSITION');
      assert.equal(snap.data().user_uid, 'user-admin-1');
      assert.equal(snap.data().approval_reference, 'APPROVED_BY_ADMIN');
    });

    test('3.5 Records audit event atomically inside an ongoing Firestore transaction', async () => {
      const mockDb = createMockFirestore();

      await mockDb.runTransaction(async (transaction: any) => {
        const auditRef = recordAuditEventInTransaction(
          transaction,
          {
            actor: mockActor,
            action: 'DRAFT_APPROVAL',
            entityType: 'job_order',
            entityId: 'ord-2002',
            before: { status: 'Draft' },
            after: { status: 'قيد التشغيل' },
          },
          mockDb
        );

        assert.ok(auditRef.id);
      });

      // Verify that audit log was saved in the collection
      const allAuditDocs = mockDb._dump().get(AUDIT_LOGS_COLLECTION);
      assert.equal(allAuditDocs?.size, 1);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Component D: Persistent Firestore Idempotency Store
  // ---------------------------------------------------------------------------
  describe('4. Component D: Persistent Firestore Idempotency Store', () => {
    test('4.1 Builds safe deterministic SHA-256 document ID hiding raw tokens', () => {
      const mockDb = createMockFirestore();
      const store = new FirestoreIdempotencyStore(mockDb);

      const docId1 = store.buildDocumentId('req-key-12345', 'user-uid-abc');
      const docId2 = store.buildDocumentId('req-key-12345', 'user-uid-abc');
      const docIdDifferentUser = store.buildDocumentId('req-key-12345', 'user-uid-xyz');

      // Deterministic: same key + scope yields exact same hash
      assert.equal(docId1, docId2);
      assert.equal(docId1.length, 64, 'Document ID must be a 64-char hex SHA-256');
      assert.notEqual(docId1, docIdDifferentUser, 'Different users have different doc IDs');
      assert.ok(!docId1.includes('user-uid-abc'), 'Raw user token must not be in doc ID');
    });

    test('4.2 createInProgress() successfully reserves new key', async () => {
      const mockDb = createMockFirestore();
      const store = new FirestoreIdempotencyStore(mockDb);

      const reservation = await store.createInProgress('key-alpha-1', 'scope-user-1', 'hash-xyz');
      assert.equal(reservation.success, true);
      assert.equal(reservation.existingRecord, undefined);

      // Verify stored record
      const record = await store.get('key-alpha-1', 'scope-user-1');
      assert.ok(record);
      assert.equal(record?.status, 'IN_PROGRESS');
      assert.equal(record?.requestHash, 'hash-xyz');
    });

    test('4.3 createInProgress() rejects duplicate concurrent attempt and returns existing record', async () => {
      const mockDb = createMockFirestore();
      const store = new FirestoreIdempotencyStore(mockDb);

      // First reservation
      const first = await store.createInProgress('key-dup-1', 'scope-user-1', 'hash-111');
      assert.equal(first.success, true);

      // Concurrent duplicate reservation
      const second = await store.createInProgress('key-dup-1', 'scope-user-1', 'hash-111');
      assert.equal(second.success, false);
      assert.ok(second.existingRecord);
      assert.equal(second.existingRecord?.status, 'IN_PROGRESS');
      assert.equal(second.existingRecord?.requestHash, 'hash-111');
    });

    test('4.4 complete() transitions status to COMPLETED and stores sanitized response', async () => {
      const mockDb = createMockFirestore();
      const store = new FirestoreIdempotencyStore(mockDb);

      await store.createInProgress('key-complete-1', 'scope-user-1', 'hash-222');

      const responsePayload = {
        orderId: 'ord-12345',
        orderNumber: 'JO-2026-0101',
        token: 'SECRET_CLIENT_TOKEN', // Must be sanitized
      };

      await store.complete('key-complete-1', 'scope-user-1', 201, responsePayload);

      const completedRecord = await store.get('key-complete-1', 'scope-user-1');
      assert.ok(completedRecord);
      assert.equal(completedRecord?.status, 'COMPLETED');
      assert.equal(completedRecord?.statusCode, 201);
      assert.equal(completedRecord?.responseBody?.orderNumber, 'JO-2026-0101');
      assert.equal(completedRecord?.responseBody?.token, '[REDACTED]', 'Stored response must be sanitized');
    });

    test('4.5 Different users using the same key do NOT collide (Scoped User Isolation)', async () => {
      const mockDb = createMockFirestore();
      const store = new FirestoreIdempotencyStore(mockDb);
      const sharedKey = 'identical-client-uuid-777';

      // User A creates reservation
      const resA = await store.createInProgress(sharedKey, 'user-A', 'hash-A');
      assert.equal(resA.success, true);

      // User B creates reservation with same key -> MUST SUCCEED (Different scope)
      const resB = await store.createInProgress(sharedKey, 'user-B', 'hash-B');
      assert.equal(resB.success, true);

      const recA = await store.get(sharedKey, 'user-A');
      const recB = await store.get(sharedKey, 'user-B');

      assert.equal(recA?.requestHash, 'hash-A');
      assert.equal(recB?.requestHash, 'hash-B');
    });

    test('4.6 No automatic TTL or deletion policy is active (MGMT-DEC-12 Verified)', async () => {
      const mockDb = createMockFirestore();
      const store = new FirestoreIdempotencyStore(mockDb);

      await store.createInProgress('key-ttl-test', 'user-1', 'hash-333');
      await store.complete('key-ttl-test', 'user-1', 200, { ok: true });

      // Directly verify document stored in collection
      const docId = store.buildDocumentId('key-ttl-test', 'user-1');
      const snap = await mockDb.collection(IDEMPOTENCY_COLLECTION).doc(docId).get();

      assert.equal(snap.exists, true);
      const data = snap.data();
      assert.equal(data.ttl, undefined, 'No TTL field should exist');
      assert.equal(data.expireAt, undefined, 'No expireAt field should exist');
      assert.equal(data.expiresAt, undefined, 'No expiresAt field should exist');
    });
  });
});
