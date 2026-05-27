/**
 * Unified Frontend Routing and Session Token Helpers
 */

/**
 * Formats a secure, token-based session path forRoomPage.
 * 
 * @param {string} token - Cryptographically signed JWT session token
 * @returns {string} Fully structured secure path
 */
export const generateJoinUrl = (token) => {
  if (!token) return '/';
  return `/interview/session?token=${encodeURIComponent(token)}`;
};

/**
 * Validates if a session token string is structurally complete.
 * 
 * @param {string} token - Target token string
 * @returns {boolean} Validity flag
 */
export const validateJoinToken = (token) => {
  if (!token) return false;
  try {
    const parts = token.split('.');
    return parts.length === 3; // Basic structural JWT format validation (header.payload.signature)
  } catch (err) {
    return false;
  }
};

/**
 * Executes a secure redirect replacement to the collaborative room,
 * preventing browser back-button history loops.
 * 
 * @param {function} navigate - React Router's useNavigate dispatcher
 * @param {string} token - Secure session token
 */
export const redirectToInterview = (navigate, token) => {
  if (!token || !navigate) return;
  navigate(generateJoinUrl(token), { replace: true });
};

export default {
  generateJoinUrl,
  validateJoinToken,
  redirectToInterview
};
