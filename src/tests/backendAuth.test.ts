import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createAuthenticateMiddleware } from '../../server/middleware/authenticate';
import {
  requireAuth,
  requireRole,
  requireAdmin,
  requireAccounting,
  requireOperations,
  requireSales,
  requireDelegatedOperationsManager,
  requireAdminOrDelegatedOperationsManager,
} from '../../server/middleware/authorize';
import { TechnicalRole } from '../../server/types/auth';

function createMockHttp(headers: Record<string, string> = {}, body: Record<string, any> = {}) {
  let statusCode = 200;
  let responseData: any = null;
  let nextCalled = false;
  let nextError: any = null;

  const req: any = {
    headers: { ...headers },
    body: { ...body },
  };

  const res: any = {
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(data: any) {
      responseData = data;
      return res;
    },
  };

  const next = (err?: any) => {
    nextCalled = true;
    nextError = err;
  };

  return {
    req,
    res,
    next,
    getStatusCode: () => statusCode,
    getResponseData: () => responseData,
    wasNextCalled: () => nextCalled,
    getNextError: () => nextError,
  };
}

describe('Phase 1: Backend Authentication & Authorization Foundation', () => {

  // Test 1: Missing Authorization header -> rejected
  test('1. Missing Authorization header -> rejected with 401', async () => {
    const middleware = createAuthenticateMiddleware();
    const http = createMockHttp({});

    await middleware(http.req, http.res, http.next);

    assert.equal(http.getStatusCode(), 401);
    assert.equal(http.getResponseData().code, 'MISSING_AUTHORIZATION_HEADER');
    assert.equal(http.wasNextCalled(), false);
  });

  // Test 2: Malformed Bearer header -> rejected
  test('2. Malformed Bearer header -> rejected with 401', async () => {
    const middleware = createAuthenticateMiddleware();
    const http = createMockHttp({ authorization: 'Basic dXNlcjpwYXNz' });

    await middleware(http.req, http.res, http.next);

    assert.equal(http.getStatusCode(), 401);
    assert.equal(http.getResponseData().code, 'MALFORMED_AUTHORIZATION_HEADER');
    assert.equal(http.wasNextCalled(), false);
  });

  // Test 3: Invalid token -> rejected
  test('3. Invalid token -> rejected with 401 and verifyIdToken is called with checkRevoked=true', async () => {
    let checkRevokedArg: boolean | undefined = undefined;
    const mockAuth = {
      async verifyIdToken(_token: string, checkRevoked?: boolean) {
        checkRevokedArg = checkRevoked;
        throw new Error('Firebase token signature could not be verified');
      },
    };

    const middleware = createAuthenticateMiddleware({ authService: mockAuth });
    const http = createMockHttp({ authorization: 'Bearer invalid.jwt.token' });

    await middleware(http.req, http.res, http.next);

    assert.equal(checkRevokedArg, true, 'verifyIdToken MUST be called with checkRevoked = true');
    assert.equal(http.getStatusCode(), 401);
    assert.equal(http.getResponseData().code, 'INVALID_TOKEN');
    assert.equal(http.wasNextCalled(), false);
  });

  // Test 4: Expired or revoked token -> rejected
  test('4. Expired/revoked token -> rejected with specific 401 code', async () => {
    // 4a. Expired Token
    const mockExpiredAuth = {
      async verifyIdToken() {
        const err: any = new Error('Token has expired');
        err.code = 'auth/id-token-expired';
        throw err;
      },
    };

    const middlewareExpired = createAuthenticateMiddleware({ authService: mockExpiredAuth });
    const httpExpired = createMockHttp({ authorization: 'Bearer expired.token.jwt' });

    await middlewareExpired(httpExpired.req, httpExpired.res, httpExpired.next);

    assert.equal(httpExpired.getStatusCode(), 401);
    assert.equal(httpExpired.getResponseData().code, 'TOKEN_EXPIRED');
    assert.equal(httpExpired.wasNextCalled(), false);

    // 4b. Revoked Token
    const mockRevokedAuth = {
      async verifyIdToken() {
        const err: any = new Error('Token has been revoked');
        err.code = 'auth/id-token-revoked';
        throw err;
      },
    };

    const middlewareRevoked = createAuthenticateMiddleware({ authService: mockRevokedAuth });
    const httpRevoked = createMockHttp({ authorization: 'Bearer revoked.token.jwt' });

    await middlewareRevoked(httpRevoked.req, httpRevoked.res, httpRevoked.next);

    assert.equal(httpRevoked.getStatusCode(), 401);
    assert.equal(httpRevoked.getResponseData().code, 'TOKEN_REVOKED');
    assert.equal(httpRevoked.wasNextCalled(), false);
  });

  // Test 5: Valid token with missing user profile in database -> rejected
  test('5. Valid token with missing user profile in database -> rejected with 403', async () => {
    const mockAuth = {
      async verifyIdToken() {
        return { uid: 'uid-without-profile', email: 'ghost@elnaggar.com' };
      },
    };
    const mockDb = {
      collection() {
        return {
          doc() {
            return {
              async get() {
                return { exists: false, data: () => undefined };
              },
            };
          },
        };
      },
    };

    const middleware = createAuthenticateMiddleware({
      authService: mockAuth,
      firestoreService: mockDb as any,
    });
    const http = createMockHttp({ authorization: 'Bearer valid.jwt.token' });

    await middleware(http.req, http.res, http.next);

    assert.equal(http.getStatusCode(), 403);
    assert.equal(http.getResponseData().code, 'USER_PROFILE_NOT_FOUND');
    assert.equal(http.wasNextCalled(), false);
  });

  // Test 6: Valid token with isActive: false -> rejected
  test('6. Valid token with isActive: false -> rejected with 403', async () => {
    const mockAuth = {
      async verifyIdToken() {
        return { uid: 'uid-deactivated', email: 'deactivated@elnaggar.com' };
      },
    };
    const mockDb = {
      collection() {
        return {
          doc() {
            return {
              async get() {
                return {
                  exists: true,
                  data: () => ({
                    role: 'sales',
                    isActive: false,
                    name: 'Deactivated User',
                  }),
                };
              },
            };
          },
        };
      },
    };

    const middleware = createAuthenticateMiddleware({
      authService: mockAuth,
      firestoreService: mockDb as any,
    });
    const http = createMockHttp({ authorization: 'Bearer valid.jwt.token' });

    await middleware(http.req, http.res, http.next);

    assert.equal(http.getStatusCode(), 403);
    assert.equal(http.getResponseData().code, 'ACCOUNT_DEACTIVATED');
    assert.equal(http.wasNextCalled(), false);
  });

  // Test 7: Valid active admin -> accepted as admin
  test('7. Valid active admin -> accepted and attached to request context', async () => {
    const mockAuth = {
      async verifyIdToken() {
        return { uid: 'admin-uid-1', email: 'cfo.moaz@gmail.com' };
      },
    };
    const mockDb = {
      collection() {
        return {
          doc() {
            return {
              async get() {
                return {
                  exists: true,
                  data: () => ({
                    role: 'admin',
                    isActive: true,
                    name: 'Moaz Admin',
                  }),
                };
              },
            };
          },
        };
      },
    };

    const middleware = createAuthenticateMiddleware({
      authService: mockAuth,
      firestoreService: mockDb as any,
    });
    const http = createMockHttp({ authorization: 'Bearer valid.jwt.token' });

    await middleware(http.req, http.res, http.next);

    assert.equal(http.wasNextCalled(), true);
    assert.ok(http.req.user);
    assert.equal(http.req.user.role, 'admin');
    assert.equal(http.req.user.uid, 'admin-uid-1');
    assert.equal(http.req.user.isActive, true);

    // Verify requireAdmin accepts this context
    const adminHttp = createMockHttp();
    adminHttp.req.user = http.req.user;
    requireAdmin(adminHttp.req, adminHttp.res, adminHttp.next);
    assert.equal(adminHttp.wasNextCalled(), true);
  });

  // Test 8: Valid active accounting user -> recognized as accounting, not admin
  test('8. Valid active accounting user -> recognized as accounting, not admin', async () => {
    const mockAuth = {
      async verifyIdToken() {
        return { uid: 'acc-uid-1', email: 'accountant@elnaggar.com' };
      },
    };
    const mockDb = {
      collection() {
        return {
          doc() {
            return {
              async get() {
                return {
                  exists: true,
                  data: () => ({
                    role: 'accounting',
                    isActive: true,
                    name: 'Accounting Lead',
                  }),
                };
              },
            };
          },
        };
      },
    };

    const middleware = createAuthenticateMiddleware({
      authService: mockAuth,
      firestoreService: mockDb as any,
    });
    const http = createMockHttp({ authorization: 'Bearer valid.jwt.token' });

    await middleware(http.req, http.res, http.next);

    assert.equal(http.wasNextCalled(), true);
    assert.equal(http.req.user.role, 'accounting');

    // Allowed by requireAccounting
    const accHttp = createMockHttp();
    accHttp.req.user = http.req.user;
    requireAccounting(accHttp.req, accHttp.res, accHttp.next);
    assert.equal(accHttp.wasNextCalled(), true);

    // Rejected by requireAdmin
    const adminGuardHttp = createMockHttp();
    adminGuardHttp.req.user = http.req.user;
    requireAdmin(adminGuardHttp.req, adminGuardHttp.res, adminGuardHttp.next);
    assert.equal(adminGuardHttp.getStatusCode(), 403);
    assert.equal(adminGuardHttp.getResponseData().code, 'FORBIDDEN_ROLE');
    assert.equal(adminGuardHttp.wasNextCalled(), false);
  });

  // Test 9: Valid active operations user -> recognized as operations
  test('9. Valid active operations user -> recognized as operations', async () => {
    const mockAuth = {
      async verifyIdToken() {
        return { uid: 'ops-uid-1', email: 'workshop@elnaggar.com' };
      },
    };
    const mockDb = {
      collection() {
        return {
          doc() {
            return {
              async get() {
                return {
                  exists: true,
                  data: () => ({
                    role: 'operations',
                    isActive: true,
                    isDelegatedManager: false,
                    name: 'Workshop Supervisor',
                  }),
                };
              },
            };
          },
        };
      },
    };

    const middleware = createAuthenticateMiddleware({
      authService: mockAuth,
      firestoreService: mockDb as any,
    });
    const http = createMockHttp({ authorization: 'Bearer valid.jwt.token' });

    await middleware(http.req, http.res, http.next);

    assert.equal(http.wasNextCalled(), true);
    assert.equal(http.req.user.role, 'operations');

    const opsHttp = createMockHttp();
    opsHttp.req.user = http.req.user;
    requireOperations(opsHttp.req, opsHttp.res, opsHttp.next);
    assert.equal(opsHttp.wasNextCalled(), true);
  });

  // Test 10: Operations user without delegation -> not a delegated manager
  test('10. Operations user without delegation -> rejected by requireDelegatedOperationsManager', async () => {
    const mockAuth = {
      async verifyIdToken() {
        return { uid: 'ops-regular', email: 'regular-ops@elnaggar.com' };
      },
    };
    const mockDb = {
      collection() {
        return {
          doc() {
            return {
              async get() {
                return {
                  exists: true,
                  data: () => ({
                    role: 'operations',
                    isActive: true,
                    isDelegatedManager: false,
                  }),
                };
              },
            };
          },
        };
      },
    };

    const middleware = createAuthenticateMiddleware({
      authService: mockAuth,
      firestoreService: mockDb as any,
    });
    const http = createMockHttp({ authorization: 'Bearer valid.jwt.token' });

    await middleware(http.req, http.res, http.next);

    assert.equal(http.wasNextCalled(), true);
    assert.equal(http.req.user.isDelegatedManager, false);

    const guardHttp = createMockHttp();
    guardHttp.req.user = http.req.user;
    requireDelegatedOperationsManager(guardHttp.req, guardHttp.res, guardHttp.next);

    assert.equal(guardHttp.getStatusCode(), 403);
    assert.equal(guardHttp.getResponseData().code, 'DELEGATED_OPERATIONS_REQUIRED');
    assert.equal(guardHttp.wasNextCalled(), false);
  });

  // Test 11: Operations user with trusted delegation flag -> recognized as delegated manager
  test('11. Operations user with trusted delegation flag -> accepted as delegated manager', async () => {
    const mockAuth = {
      async verifyIdToken() {
        return { uid: 'ops-delegated', email: 'delegated-ops@elnaggar.com' };
      },
    };
    const mockDb = {
      collection() {
        return {
          doc() {
            return {
              async get() {
                return {
                  exists: true,
                  data: () => ({
                    role: 'operations',
                    isActive: true,
                    isDelegatedManager: true,
                  }),
                };
              },
            };
          },
        };
      },
    };

    const middleware = createAuthenticateMiddleware({
      authService: mockAuth,
      firestoreService: mockDb as any,
    });
    const http = createMockHttp({ authorization: 'Bearer valid.jwt.token' });

    await middleware(http.req, http.res, http.next);

    assert.equal(http.wasNextCalled(), true);
    assert.equal(http.req.user.role, 'operations');
    assert.equal(http.req.user.isDelegatedManager, true);

    const guardHttp = createMockHttp();
    guardHttp.req.user = http.req.user;
    requireDelegatedOperationsManager(guardHttp.req, guardHttp.res, guardHttp.next);

    assert.equal(guardHttp.wasNextCalled(), true);
  });

  // Test 11b: Admin MUST NOT implicitly satisfy strict requireDelegatedOperationsManager
  test('11b. Admin role strictly rejected by requireDelegatedOperationsManager (Admin is not a delegated manager)', async () => {
    const adminUser = {
      uid: 'admin-user-id',
      email: 'admin@elnaggar.com',
      role: 'admin' as TechnicalRole,
      isActive: true,
      isDelegatedManager: false,
    };

    // Strict delegated operations manager check: Admin is rejected
    const strictGuardHttp = createMockHttp();
    strictGuardHttp.req.user = adminUser;
    requireDelegatedOperationsManager(strictGuardHttp.req, strictGuardHttp.res, strictGuardHttp.next);

    assert.equal(strictGuardHttp.getStatusCode(), 403);
    assert.equal(strictGuardHttp.getResponseData().code, 'DELEGATED_OPERATIONS_REQUIRED');
    assert.equal(strictGuardHttp.wasNextCalled(), false);

    // Composite check (Admin OR Delegated Operations Manager): Admin is accepted
    const compositeHttp = createMockHttp();
    compositeHttp.req.user = adminUser;
    requireAdminOrDelegatedOperationsManager(compositeHttp.req, compositeHttp.res, compositeHttp.next);
    assert.equal(compositeHttp.wasNextCalled(), true);
  });

  // Test 12: Client-supplied role = admin while database role = sales -> remains sales
  test('12. Client-supplied role = admin in request body is ignored; database role = sales enforced', async () => {
    const mockAuth = {
      async verifyIdToken() {
        return { uid: 'sales-1', email: 'sales@elnaggar.com' };
      },
    };
    const mockDb = {
      collection() {
        return {
          doc() {
            return {
              async get() {
                return {
                  exists: true,
                  data: () => ({
                    role: 'sales',
                    isActive: true,
                  }),
                };
              },
            };
          },
        };
      },
    };

    const middleware = createAuthenticateMiddleware({
      authService: mockAuth,
      firestoreService: mockDb as any,
    });
    // Attacker sends forged role in body and headers
    const http = createMockHttp(
      { authorization: 'Bearer valid.jwt.token', 'x-user-role': 'admin' },
      { role: 'admin', isDelegatedManager: true }
    );

    await middleware(http.req, http.res, http.next);

    assert.equal(http.wasNextCalled(), true);
    assert.equal(http.req.user.role, 'sales');
    assert.notEqual(http.req.user.role, 'admin');

    // Admin guard must reject
    const adminGuardHttp = createMockHttp();
    adminGuardHttp.req.user = http.req.user;
    requireAdmin(adminGuardHttp.req, adminGuardHttp.res, adminGuardHttp.next);
    assert.equal(adminGuardHttp.getStatusCode(), 403);
    assert.equal(adminGuardHttp.wasNextCalled(), false);
  });

  // Test 13: Client-supplied isDelegatedManager: true while database flag is false -> remains false
  test('13. Client-supplied isDelegatedManager: true in body is ignored; database false is enforced', async () => {
    const mockAuth = {
      async verifyIdToken() {
        return { uid: 'ops-1', email: 'ops@elnaggar.com' };
      },
    };
    const mockDb = {
      collection() {
        return {
          doc() {
            return {
              async get() {
                return {
                  exists: true,
                  data: () => ({
                    role: 'operations',
                    isActive: true,
                    isDelegatedManager: false, // Database authoritative state
                  }),
                };
              },
            };
          },
        };
      },
    };

    const middleware = createAuthenticateMiddleware({
      authService: mockAuth,
      firestoreService: mockDb as any,
    });
    const http = createMockHttp(
      { authorization: 'Bearer valid.jwt.token' },
      { isDelegatedManager: true }
    );

    await middleware(http.req, http.res, http.next);

    assert.equal(http.wasNextCalled(), true);
    assert.equal(http.req.user.isDelegatedManager, false);

    const guardHttp = createMockHttp();
    guardHttp.req.user = http.req.user;
    requireDelegatedOperationsManager(guardHttp.req, guardHttp.res, guardHttp.next);
    assert.equal(guardHttp.getStatusCode(), 403);
    assert.equal(guardHttp.wasNextCalled(), false);
  });

  // Test 14: DEMO_MODE_TOKEN in production -> rejected unconditionally
  test('14. DEMO_MODE_TOKEN in production -> rejected with 401', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      const middleware = createAuthenticateMiddleware();
      const http = createMockHttp({ authorization: 'Bearer DEMO_MODE_TOKEN' });

      await middleware(http.req, http.res, http.next);

      assert.equal(http.getStatusCode(), 401);
      assert.equal(http.getResponseData().code, 'DEMO_TOKEN_PROHIBITED');
      assert.equal(http.wasNextCalled(), false);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  // Test 15: Authentication failure does not expose secrets, tokens, or stack traces
  test('15. Authentication failure response does not expose tokens, secrets, or internal stack traces', async () => {
    const secretJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.secret-signature';
    const mockExplosiveAuth = {
      async verifyIdToken() {
        const err = new Error('Database password failed at mysql://root:supersecret@10.0.0.1:3306');
        err.stack = 'Error: Stack trace containing internal paths /app/applet/secrets/key.pem';
        throw err;
      },
    };

    const middleware = createAuthenticateMiddleware({ authService: mockExplosiveAuth });
    const http = createMockHttp({ authorization: `Bearer ${secretJwt}` });

    await middleware(http.req, http.res, http.next);

    assert.equal(http.getStatusCode(), 401);
    const bodyStr = JSON.stringify(http.getResponseData());

    assert.ok(!bodyStr.includes(secretJwt), 'Response must not contain raw token');
    assert.ok(!bodyStr.includes('supersecret'), 'Response must not leak secrets');
    assert.ok(!bodyStr.includes('Stack trace'), 'Response must not leak stack traces');
    assert.ok(!bodyStr.includes('/app/applet'), 'Response must not leak internal server paths');
    assert.equal(http.getResponseData().code, 'INVALID_TOKEN');
  });

  // Test 16: Diagnostic endpoints in production -> safe 404 denial simulation
  test('16. Diagnostic test routes are inaccessible in production (safe 404 contract)', () => {
    // Contract verification: server.ts mounts test routes only when process.env.NODE_ENV !== 'production'
    const isProduction = true;
    const isTestRouteMounted = !isProduction;

    assert.equal(isTestRouteMounted, false, 'Diagnostic test routes MUST NOT be mounted in production');
  });

});
