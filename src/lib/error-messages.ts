/**
 * Maps Firebase Auth error codes to user-friendly error messages.
 */
export const getAuthErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case 'auth/user-not-found':
      return 'No account found with this email address. Please check your email or sign up.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again or reset your password.';
    case 'auth/email-already-in-use':
      return 'An account already exists with this email address.';
    case 'auth/invalid-email':
      return 'The email address is not valid. Please enter a correct email.';
    case 'auth/weak-password':
      return 'The password is too weak. Please use at least 6 characters.';
    case 'auth/too-many-requests':
      return 'Too many unsuccessful attempts. Access to this account has been temporarily disabled. Please try again later.';
    case 'auth/operation-not-allowed':
      return 'Email/password accounts are not enabled. Please contact support.';
    case 'auth/popup-closed-by-user':
      return 'The login popup was closed before completion. Please try again.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/network-request-failed':
      return 'A network error occurred. Please check your internet connection.';
    case 'auth/invalid-credential':
      return 'Invalid login credentials. Please check your email and password.';
    case 'auth/internal-error':
      return 'An internal error occurred. Please try again later.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
};
