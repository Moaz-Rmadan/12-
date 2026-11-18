export interface AuthErrorContext {
  provider?: 'google' | 'password';
  isStandalonePwa?: boolean;
  isEmbeddedIframe?: boolean;
  hostname?: string;
  ownerEmail?: string;
}

export interface ParsedAuthError {
  code: string;
  message: string;
  canRetryWithRedirect: boolean;
  detailHint?: string;
  unauthorizedHostname?: string;
  isOperationNotAllowed?: boolean;
}

export function extractFirebaseErrorCode(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err && typeof (err as { code?: unknown }).code === 'string') {
    return (err as { code: string }).code;
  }
  const msg = err instanceof Error ? err.message : String(err || '');
  const match = msg.match(/auth\/[a-z0-9-]+/i);
  return match ? match[0].toLowerCase() : 'auth/unknown';
}

export function parseFirebaseAuthError(
  err: unknown,
  context: AuthErrorContext = {}
): ParsedAuthError {
  const code = extractFirebaseErrorCode(err);
  const provider = context.provider || 'password';
  const isEmbedded = Boolean(context.isEmbeddedIframe);
  const hostname = context.hostname || 'localhost';
  const ownerEmail = context.ownerEmail || 'cfo.moaz@gmail.com';

  switch (code) {
    case 'auth/popup-blocked':
      return {
        code,
        message: 'قام المتصفح بحظر النافذة المنبثقة لتسجيل الدخول بحساب جوجل.',
        canRetryWithRedirect: !isEmbedded,
        detailHint: !isEmbedded
          ? 'يمكنك السماح بالنوافذ المنبثقة من شريط العنوان أو الضغط على «المتابعة عبر التوجيه المباشر» أدناه.'
          : 'يرجى السماح بالنوافذ المنبثقة (Pop-ups) لهذا الموقع من إعدادات المتصفح ثم المحاولة مجدداً.',
      };

    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return {
        code,
        message: 'تم إغلاق نافذة تسجيل الدخول بحساب جوجل قبل إتمام العملية.',
        canRetryWithRedirect: false,
        detailHint: 'اضغط على زر «تسجيل الدخول بحساب جوجل» وأكمل اختيار الحساب.',
      };

    case 'auth/unauthorized-domain':
      return {
        code,
        message: `النطاق الحالي (${hostname}) غير مضاف في قائمة النطاقات المصرح بها في Firebase Auth.`,
        canRetryWithRedirect: false,
        unauthorizedHostname: hostname,
        detailHint:
          'أضف هذا النطاق في Firebase Console ← Authentication ← Settings ← Authorized domains، أو افتح التطبيق عبر الرابط الرسمي.',
      };

    case 'auth/operation-not-allowed':
      return {
        code,
        message:
          provider === 'google'
            ? 'تسجيل الدخول عبر Google غير مفعّل حالياً في إعدادات Firebase.'
            : 'الدخول بالبريد وكلمة المرور غير مفعّل في مشروع Firebase. استخدم زر «تسجيل الدخول بحساب جوجل (Google)» للدخول الفوري.',
        canRetryWithRedirect: false,
        isOperationNotAllowed: true,
        detailHint:
          provider === 'google'
            ? 'فعّل مزود Google من Firebase Console ← Authentication ← Sign-in method.'
            : 'لتفعيل الدخول بكلمة مرور: افتح Firebase Console ← Authentication ← Sign-in method وفعّل Email/Password، ثم اربط كلمة مرور لحسابك من «ملف المستخدم».',
      };

    case 'auth/admin-restricted-operation':
      return {
        code,
        message: 'إنشاء الحسابات الجديدة من المتصفح مقيّد في إعدادات أمان Firebase.',
        canRetryWithRedirect: false,
        detailHint:
          'أضف البريد وكلمة المرور من Firebase Console ← Authentication ← Users ← Add user، وسجّل دعوة الصلاحيات من إدارة المستخدمين.',
      };

    case 'auth/user-disabled':
      return {
        code,
        message: 'تم تعطيل هذا الحساب. يرجى التواصل مع مدير النظام.',
        canRetryWithRedirect: false,
      };

    case 'auth/network-request-failed':
      return {
        code,
        message: 'تعذر الاتصال بخوادم المصادقة السحابية. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.',
        canRetryWithRedirect: false,
      };

    case 'auth/too-many-requests':
      return {
        code,
        message: 'تم تقييد تسجيل الدخول مؤقتاً لكثرة المحاولات. انتظر دقيقة ثم حاول مجدداً.',
        canRetryWithRedirect: false,
      };

    case 'auth/account-exists-with-different-credential':
      return {
        code,
        message: 'هذا البريد مسجل بطريقة دخول أخرى. جرّب «تسجيل الدخول بحساب جوجل (Google)».',
        canRetryWithRedirect: false,
      };

    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-email':
      return {
        code,
        message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة أو لم يتم إنشاء كلمة مرور لهذا الحساب.',
        canRetryWithRedirect: false,
        detailHint: `للحسابات المرتبطة بجوجل مثل (${ownerEmail}) أو الحسابات المدعوة، استخدم زر «تسجيل الدخول بحساب جوجل» بالأعلى.`,
      };

    default:
      return {
        code,
        message:
          provider === 'google'
            ? 'تعذر إتمام تسجيل الدخول بحساب جوجل. يرجى المحاولة مرة أخرى.'
            : 'تعذر تسجيل الدخول. يرجى التأكد من البيانات والاتصال بالإنترنت.',
        canRetryWithRedirect: !isEmbedded && provider === 'google',
      };
  }
}
