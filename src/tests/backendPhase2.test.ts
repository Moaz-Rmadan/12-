import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { validateRequest } from '../../server/validators/validate';
import {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  UnprocessableEntityError,
  InternalServerError,
} from '../../server/errors/app-error';
import { errorHandler } from '../../server/middleware/error-handler';
import {
  logger,
  resolveRequestId,
  sanitizeLogData,
} from '../../server/logging/logger';
import { requestLogger } from '../../server/middleware/request-logger';
import { MemoryIdempotencyStore } from '../../server/idempotency/memory-store';
import {
  createIdempotencyMiddleware,
  calculateRequestHash,
  canonicalJsonStringify,
  isValidIdempotencyKey,
} from '../../server/idempotency/idempotency';
import {
  assertVersionMatch,
  computeNextVersion,
  OptimisticLockManager,
  VersionedEntity,
} from '../../server/concurrency/optimistic-lock';

function createMockHttp(
  headers: Record<string, string> = {},
  body: Record<string, any> = {},
  query: Record<string, any> = {},
  params: Record<string, any> = {}
) {
  let statusCode = 200;
  let responseData: any = null;
  let nextCalled = false;
  let nextError: any = null;
  const responseHeaders: Record<string, string> = {};

  const req: any = {
    headers: { ...headers },
    body: { ...body },
    query: { ...query },
    params: { ...params },
    method: 'POST',
    url: '/api/test-operation',
    baseUrl: '',
    path: '/api/test-operation',
  };

  const res: any = {
    statusCode: 200,
    setHeader(name: string, value: string) {
      responseHeaders[name.toLowerCase()] = value;
      return res;
    },
    getHeader(name: string) {
      return responseHeaders[name.toLowerCase()];
    },
    status(code: number) {
      statusCode = code;
      res.statusCode = code;
      return res;
    },
    json(data: any) {
      responseData = data;
      return res;
    },
    on(_event: string, _callback: Function) {
      return res;
    },
  };

  const next = (err?: any) => {
    nextCalled = true;
    nextError = err ?? null;
  };

  return {
    req,
    res,
    next,
    getStatusCode: () => statusCode,
    getResponseData: () => responseData,
    wasNextCalled: () => nextCalled,
    getNextError: () => nextError,
    getResponseHeaders: () => responseHeaders,
  };
}

describe('Phase 2: Backend Engineering Foundation', () => {

  // ===========================================================================
  // 1. Zod Validation Foundation
  // ===========================================================================
  describe('1. Zod Request Validation Foundation', () => {
    const testBodySchema = z
      .object({
        name: z.string().min(2),
        quantity: z.number().int().positive(),
        notes: z.string().optional(),
      })
      .strict(); // Rejects unknown or unauthorized fields

    const testQuerySchema = z.object({
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().max(100).default(20),
    });

    const testParamsSchema = z.object({
      id: z.string().regex(/^ord-[0-9]+$/, 'ID must match ord-number pattern'),
    });

    test('1.1 Valid input passes validation and calls next()', async () => {
      const validator = validateRequest({ body: testBodySchema });
      const http = createMockHttp({}, { name: 'Living Room Couch', quantity: 2 });

      await validator(http.req, http.res, http.next);

      assert.equal(http.wasNextCalled(), true);
      assert.equal(http.getNextError(), null);
      assert.equal(http.req.body.name, 'Living Room Couch');
      assert.equal(http.req.body.quantity, 2);
    });

    test('1.2 Missing required fields triggers ValidationError (400)', async () => {
      const validator = validateRequest({ body: testBodySchema });
      const http = createMockHttp({}, { name: 'Incomplete' }); // missing quantity

      await validator(http.req, http.res, http.next);

      assert.equal(http.wasNextCalled(), true);
      const err = http.getNextError();
      assert.ok(err instanceof ValidationError);
      assert.equal(err.statusCode, 400);
      assert.equal(err.code, 'VALIDATION_ERROR');
    });

    test('1.3 Wrong field type triggers ValidationError', async () => {
      const validator = validateRequest({ body: testBodySchema });
      const http = createMockHttp({}, { name: 'Valid', quantity: 'not-a-number' });

      await validator(http.req, http.res, http.next);

      assert.equal(http.wasNextCalled(), true);
      const err = http.getNextError();
      assert.ok(err instanceof ValidationError);
      assert.equal(err.statusCode, 400);
    });

    test('1.4 Strict schema rejects unknown or unauthorized fields (Privilege Escalation Guard)', async () => {
      const validator = validateRequest({ body: testBodySchema });
      // Attacker attempts to sneak in role escalation
      const http = createMockHttp({}, {
        name: 'Valid Name',
        quantity: 1,
        role: 'admin',
        isDelegatedManager: true,
      });

      await validator(http.req, http.res, http.next);

      assert.equal(http.wasNextCalled(), true);
      const err = http.getNextError();
      assert.ok(err instanceof ValidationError);
      assert.equal(err.statusCode, 400);
      assert.ok(err.message.includes('unrecognized or unauthorized fields'));
    });

    test('1.5 Malformed query parameters trigger validation failure', async () => {
      const validator = validateRequest({ query: testQuerySchema });
      const http = createMockHttp({}, {}, { page: '-5', limit: '500' }); // invalid negative page, limit > 100

      await validator(http.req, http.res, http.next);

      assert.equal(http.wasNextCalled(), true);
      const err = http.getNextError();
      assert.ok(err instanceof ValidationError);
      assert.equal(err.statusCode, 400);
    });

    test('1.6 Malformed route parameters trigger validation failure', async () => {
      const validator = validateRequest({ params: testParamsSchema });
      const http = createMockHttp({}, {}, {}, { id: 'invalid-injection-id' });

      await validator(http.req, http.res, http.next);

      assert.equal(http.wasNextCalled(), true);
      const err = http.getNextError();
      assert.ok(err instanceof ValidationError);
      assert.equal(err.statusCode, 400);
    });
  });

  // ===========================================================================
  // 2. Centralized Error Handling Architecture
  // ===========================================================================
  describe('2. Centralized Error Handling Architecture', () => {
    test('2.1 Handles ValidationError with 400 status and structured details', () => {
      const http = createMockHttp();
      const err = new ValidationError('Invalid input data', [{ path: 'email', message: 'Invalid email' }]);

      errorHandler(err, http.req, http.res, http.next);

      assert.equal(http.getStatusCode(), 400);
      const data = http.getResponseData();
      assert.equal(data.code, 'VALIDATION_ERROR');
      assert.equal(data.error, 'Bad Request');
      assert.equal(data.message, 'Invalid input data');
      assert.ok(Array.isArray(data.details));
    });

    test('2.2 Handles UnauthorizedError with 401 status', () => {
      const http = createMockHttp();
      const err = new UnauthorizedError('TOKEN_EXPIRED', 'Token has expired');

      errorHandler(err, http.req, http.res, http.next);

      assert.equal(http.getStatusCode(), 401);
      assert.equal(http.getResponseData().code, 'TOKEN_EXPIRED');
      assert.equal(http.getResponseData().error, 'Unauthorized');
    });

    test('2.3 Handles ForbiddenError with 403 status', () => {
      const http = createMockHttp();
      const err = new ForbiddenError('FORBIDDEN_ROLE', 'Access denied for your role');

      errorHandler(err, http.req, http.res, http.next);

      assert.equal(http.getStatusCode(), 403);
      assert.equal(http.getResponseData().code, 'FORBIDDEN_ROLE');
      assert.equal(http.getResponseData().error, 'Forbidden');
    });

    test('2.4 Handles ConflictError with 409 status', () => {
      const http = createMockHttp();
      const err = new ConflictError('VERSION_CONFLICT', 'Concurrent update detected');

      errorHandler(err, http.req, http.res, http.next);

      assert.equal(http.getStatusCode(), 409);
      assert.equal(http.getResponseData().code, 'VERSION_CONFLICT');
      assert.equal(http.getResponseData().error, 'Conflict');
    });

    test('2.5 Handles unexpected exceptions safely as 500 without leaking stack traces in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        const http = createMockHttp();
        const err = new Error('Database password failed at mysql://root:secret@10.0.0.1:3306');
        err.stack = 'Error: Stack trace with secrets /secrets/key.pem';

        errorHandler(err, http.req, http.res, http.next);

        assert.equal(http.getStatusCode(), 500);
        const data = http.getResponseData();
        assert.equal(data.code, 'INTERNAL_SERVER_ERROR');
        assert.equal(data.error, 'Internal Server Error');
        assert.ok(!data.stack, 'Stack trace MUST NOT be present in production response');
        assert.ok(!JSON.stringify(data).includes('secret'), 'Secrets MUST NOT be present in response');
        assert.ok(!JSON.stringify(data).includes('mysql://'), 'Database details MUST NOT leak');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  // ===========================================================================
  // 3. Structured Request and Application Logging
  // ===========================================================================
  describe('3. Structured Request and Application Logging', () => {
    test('3.1 resolveRequestId validates safe client ID or generates UUIDv4', () => {
      const validClientId = 'custom-trace-id-12345';
      assert.equal(resolveRequestId(validClientId), 'custom-trace-id-12345');

      // Malicious or malformed client request ID (e.g. injection attempt) -> replaced by safe UUID
      const maliciousId = 'invalid; DROP TABLE users; --';
      const safeId = resolveRequestId(maliciousId);
      assert.notEqual(safeId, maliciousId);
      assert.match(safeId, /^[0-9a-f-]{36}$/);

      // Missing -> generates valid UUIDv4
      const generated = resolveRequestId(undefined);
      assert.match(generated, /^[0-9a-f-]{36}$/);
    });

    test('3.2 sanitizeLogData redacts sensitive fields recursively', () => {
      const payload = {
        name: 'Workshop Order',
        password: 'super-secret-password',
        authorization: 'Bearer eyJhbGciOiJIUzI1NiIsIn...',
        apiKey: 'AIzaSyExampleKey123',
        nested: {
          token: 'sensitive-token',
          safeField: 'safeValue',
        },
      };

      const sanitized = sanitizeLogData(payload);

      assert.equal(sanitized.password, '[REDACTED]');
      assert.equal(sanitized.authorization, '[REDACTED]');
      assert.equal(sanitized.apiKey, '[REDACTED]');
      assert.equal(sanitized.nested.token, '[REDACTED]');
      assert.equal(sanitized.nested.safeField, 'safeValue');
      assert.equal(sanitized.name, 'Workshop Order');
    });

    test('3.3 requestLogger assigns req.id and sets X-Request-Id header', () => {
      const http = createMockHttp({ 'x-request-id': 'client-trace-9999' });

      requestLogger(http.req, http.res, http.next);

      assert.equal(http.wasNextCalled(), true);
      assert.equal(http.req.id, 'client-trace-9999');
      assert.equal(http.res.getHeader('x-request-id'), 'client-trace-9999');
    });
  });

  // ===========================================================================
  // 4. Idempotency Foundation
  // ===========================================================================
  describe('4. Idempotency Foundation', () => {
    test('4.1 canonicalJsonStringify produces stable deterministic JSON regardless of key order', () => {
      const objA = { z: 1, a: 2, m: { y: 10, b: 20 } };
      const objB = { a: 2, m: { b: 20, y: 10 }, z: 1 };

      assert.equal(canonicalJsonStringify(objA), canonicalJsonStringify(objB));
      assert.equal(
        calculateRequestHash('POST', '/api/orders', objA),
        calculateRequestHash('POST', '/api/orders', objB)
      );
    });

    test('4.2 First request passes through and captures completed response in store', async () => {
      const store = new MemoryIdempotencyStore();
      const middleware = createIdempotencyMiddleware({ store, required: true });

      const http = createMockHttp(
        { 'idempotency-key': 'order-create-uuid-001' },
        { room_model_code: 'RM-BED-01', delivery_date: '2026-12-01' }
      );
      http.req.user = { uid: 'sales-user-1' };

      await middleware(http.req, http.res, http.next);

      assert.equal(http.wasNextCalled(), true);

      // Simulate route handler sending successful response
      http.res.status(201).json({ id: 'ord-101', status: 'Draft' });

      // Verify store recorded COMPLETED record
      const record = await store.get(
        'order-create-uuid-001',
        'sales-user-1::POST::/api/test-operation'
      );
      assert.ok(record);
      assert.equal(record.status, 'COMPLETED');
      assert.equal(record.statusCode, 201);
      assert.equal(record.responseBody.id, 'ord-101');
    });

    test('4.3 Duplicate completed request replays cached response with X-Idempotent-Replay header', async () => {
      const store = new MemoryIdempotencyStore();
      const middleware = createIdempotencyMiddleware({ store, required: true });
      const payload = { room_model_code: 'RM-BED-01' };

      // Pre-seed a completed record in store
      const hash = calculateRequestHash('POST', '/api/test-operation', payload);
      await store.createInProgress('key-12345678', 'user-1::POST::/api/test-operation', hash);
      await store.complete('key-12345678', 'user-1::POST::/api/test-operation', 201, {
        order_number: 'JO-2026-0101',
      });

      const http = createMockHttp({ 'idempotency-key': 'key-12345678' }, payload);
      http.req.user = { uid: 'user-1' };

      await middleware(http.req, http.res, http.next);

      // Must NOT call next() because response was replayed directly from cache
      assert.equal(http.wasNextCalled(), false);
      assert.equal(http.getStatusCode(), 201);
      assert.equal(http.getResponseData().order_number, 'JO-2026-0101');
      assert.equal(http.res.getHeader('x-idempotent-replay'), 'true');
    });

    test('4.4 Same key with different payload triggers UnprocessableEntityError (422)', async () => {
      const store = new MemoryIdempotencyStore();
      const middleware = createIdempotencyMiddleware({ store, required: true });

      const originalPayload = { specs: 'Specs A' };
      const alteredPayload = { specs: 'Specs B' };

      const hash = calculateRequestHash('POST', '/api/test-operation', originalPayload);
      await store.createInProgress('key-mismatch-1', 'user-1::POST::/api/test-operation', hash);
      await store.complete('key-mismatch-1', 'user-1::POST::/api/test-operation', 200, { ok: true });

      const http = createMockHttp({ 'idempotency-key': 'key-mismatch-1' }, alteredPayload);
      http.req.user = { uid: 'user-1' };

      await middleware(http.req, http.res, http.next);

      assert.equal(http.wasNextCalled(), true);
      const err = http.getNextError();
      assert.ok(err instanceof UnprocessableEntityError);
      assert.equal(err.statusCode, 422);
      assert.equal(err.code, 'IDEMPOTENCY_PAYLOAD_MISMATCH');
    });

    test('4.5 In-progress request triggers ConflictError (409)', async () => {
      const store = new MemoryIdempotencyStore();
      const middleware = createIdempotencyMiddleware({ store, required: true });
      const payload = { test: true };

      const hash = calculateRequestHash('POST', '/api/test-operation', payload);
      // Simulate ongoing operation (status stays IN_PROGRESS)
      await store.createInProgress('key-in-flight-1', 'user-1::POST::/api/test-operation', hash);

      const http = createMockHttp({ 'idempotency-key': 'key-in-flight-1' }, payload);
      http.req.user = { uid: 'user-1' };

      await middleware(http.req, http.res, http.next);

      assert.equal(http.wasNextCalled(), true);
      const err = http.getNextError();
      assert.ok(err instanceof ConflictError);
      assert.equal(err.statusCode, 409);
      assert.equal(err.code, 'IDEMPOTENCY_IN_PROGRESS');
    });

    test('4.6 Different users using the same key do NOT conflict (Scoped per user)', async () => {
      const store = new MemoryIdempotencyStore();
      const middleware = createIdempotencyMiddleware({ store, required: true });
      const sharedKey = 'common-key-12345';

      // User A submits
      const httpA = createMockHttp({ 'idempotency-key': sharedKey }, { item: 'A' });
      httpA.req.user = { uid: 'user-A' };
      await middleware(httpA.req, httpA.res, httpA.next);
      assert.equal(httpA.wasNextCalled(), true);
      httpA.res.status(200).json({ createdBy: 'user-A' });

      // User B submits identical key with own payload
      const httpB = createMockHttp({ 'idempotency-key': sharedKey }, { item: 'B' });
      httpB.req.user = { uid: 'user-B' };
      await middleware(httpB.req, httpB.res, httpB.next);
      // User B must NOT conflict with User A
      assert.equal(httpB.wasNextCalled(), true);
      assert.equal(httpB.getNextError(), null);
    });

    test('4.7 Malformed idempotency key triggers ValidationError (400)', async () => {
      const store = new MemoryIdempotencyStore();
      const middleware = createIdempotencyMiddleware({ store });
      const http = createMockHttp({ 'idempotency-key': 'short' }); // under 8 chars

      await middleware(http.req, http.res, http.next);

      assert.equal(http.wasNextCalled(), true);
      const err = http.getNextError();
      assert.ok(err instanceof ValidationError);
      assert.equal(err.statusCode, 400);
    });
  });

  // ===========================================================================
  // 5. Concurrency and Version Control Primitives
  // ===========================================================================
  describe('5. Concurrency and Version Control Primitives', () => {
    test('5.1 assertVersionMatch succeeds when versions match', () => {
      assert.doesNotThrow(() => {
        assertVersionMatch(2, 2, 'JobOrder');
      });
    });

    test('5.2 assertVersionMatch throws ConflictError (409) on stale version', () => {
      assert.throws(
        () => {
          assertVersionMatch(3, 2, 'JobOrder');
        },
        (err: any) => {
          return err instanceof ConflictError && err.statusCode === 409 && err.code === 'VERSION_CONFLICT';
        }
      );
    });

    test('5.3 computeNextVersion increments monotonically', () => {
      assert.equal(computeNextVersion(1), 2);
      assert.equal(computeNextVersion(5), 6);
    });

    test('5.4 OptimisticLockManager executes atomic update and rejects concurrent stale update', () => {
      interface TestJobOrder extends VersionedEntity {
        specs: string;
      }

      const manager = new OptimisticLockManager<TestJobOrder>();
      manager.set({ id: 'ord-1', version: 1, specs: 'Initial Specs' });

      // First updater has version 1 -> Succeeds, moves to version 2
      const result1 = manager.atomicUpdate('ord-1', 1, (current) => ({
        specs: 'Updated by Worker 1',
      }));

      assert.equal(result1.success, true);
      assert.equal(result1.entity?.version, 2);
      assert.equal(result1.entity?.specs, 'Updated by Worker 1');

      // Concurrent updater also thought version was 1 -> Fails with VERSION_CONFLICT
      const result2 = manager.atomicUpdate('ord-1', 1, (current) => ({
        specs: 'Overwritten by Worker 2 (Stale)',
      }));

      assert.equal(result2.success, false);
      assert.ok(result2.error instanceof ConflictError);
      assert.equal(result2.error?.code, 'VERSION_CONFLICT');

      // Verify that database state was NOT modified by the failed concurrent update
      const stored = manager.get('ord-1');
      assert.equal(stored?.version, 2);
      assert.equal(stored?.specs, 'Updated by Worker 1');
    });
  });

});
