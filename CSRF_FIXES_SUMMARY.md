# CSRF Token Fixes - Summary

## Issues Fixed

### 1. ✅ "ERR_HTTP_HEADERS_SENT" Error
**Problem:** When CSRF validation failed, the error handler tried to send response headers after `res.render()` had already sent them.

**Root Cause:** The middleware had an early `next()` call that allowed requests through without validation, then manual validation in routes tried to send error responses.

**Solution:** 
- Fixed middleware to validate BEFORE calling `next()`
- Removed manual CSRF validation from preview routes
- Use middleware only for CSRF checking

**Files Changed:**
- `src/middleware/csrf.js` - Fixed validation logic
- `src/routes/admin.js` - Removed duplicate manual validation

### 2. ✅ Token Mismatch: "received: 'cf6ab1ec...', expected: 'b9ea9ac6...'"
**Problem:** CSRF tokens were different between login and request, causing validation to always fail.

**Root Cause:** `SESSION_SECRET` environment variable was not configured. Without it:
- Session encryption key regenerates on each server restart
- Tokens created before restart don't decrypt after restart
- Each GET/POST creates new tokens that don't match

**Solution:**
- Added `SESSION_SECRET` to `.env` file with 256-bit random value
- Server now maintains consistent session encryption across restarts

**Command to generate SESSION_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. ✅ Inconsistent CSRF Token Locations
**Problem:** Middleware only checked for token in `req.body._csrf`, missing other common locations.

**Solution:** Updated middleware to check multiple locations in order:
1. `req.body._csrf` - HTML form submit
2. `req.headers['x-csrf-token']` - AJAX header (recommended)
3. `req.headers['x-csrftoken']` - Alternative header
4. `req.body.csrfToken` - JSON body field

**Files Changed:**
- `src/middleware/csrf.js` - Multiple location checking
- `src/public/js/form-preview.js` - Send token via X-CSRF-Token header

## Testing Results

### Login Flow
```
✓ GET /admin/login → Returns CSRF token in form
✓ POST /admin/login → Validates token correctly
✓ Session cookie preserved across requests
```

### API Endpoints
```
✓ POST /admin/api/presells/preview → Returns 200 with HTML
✓ POST /admin/api/presells/:id/preview → Returns 200 with HTML
✓ No more "ERR_HTTP_HEADERS_SENT" errors
```

## Production Deployment Checklist

- [x] Add `SESSION_SECRET` to `.env`
- [x] Set `NODE_ENV=production` for secure cookies
- [x] Ensure HTTPS is active (or reverse proxy with X-Forwarded-Proto)
- [x] Test CSRF with valid token (should work)
- [x] Test CSRF with invalid token (should return 403)
- [ ] If multiple server instances: Implement Redis session store
- [ ] Monitor logs for any remaining CSRF issues

## Files Modified

| File | Changes | Reason |
|------|---------|--------|
| `src/middleware/csrf.js` | Check multiple token locations, validate before next() | Fix token mismatch, prevent headers-sent error |
| `src/routes/admin.js` | Add verifyCsrf middleware, remove manual checks | Eliminate double validation |
| `src/public/js/form-preview.js` | Send token via X-CSRF-Token header | Support AJAX CSRF validation |
| `.env` | Add SESSION_SECRET | Fix token encryption consistency |
| `scripts/check-session.js` | New diagnostic script | Help troubleshoot session issues |

## How CSRF Protection Works Now

### Request Flow:
1. **GET request** (form page)
   - `attachCsrf` middleware generates/retrieves session CSRF token
   - Token rendered in hidden form input with name="_csrf"
   - Token also available in `res.locals.csrfToken`

2. **POST request** (form submission or AJAX)
   - Client sends token via:
     - Form body field `_csrf`, OR
     - HTTP header `X-CSRF-Token`, OR
     - JSON body field `csrfToken`
   - `verifyCsrf` middleware validates token matches `req.session.csrfToken`
   - If invalid → return 403 Forbidden
   - If valid → proceed to route handler

### Session Persistence:
- `SESSION_SECRET` is used to encrypt/decrypt session data
- Same SECRET across server restarts ensures tokens remain valid
- Without SECRET: Each restart creates new encryption key → tokens invalid

## Security Notes

- ✅ CSRF tokens are 48-character hex strings (192 bits)
- ✅ Tokens are unique per session
- ✅ Tokens are regenerated on login
- ✅ X-CSRF-Token header is preferred for AJAX (harder to forge)
- ✅ SameSite cookie flag enforced in production (NODE_ENV=production)
- ⚠️ HTTPS is required in production (secure flag on cookies)

## Troubleshooting

If you still see CSRF errors after these fixes:

1. **Check SESSION_SECRET is set:**
   ```bash
   node scripts/check-session.js
   ```

2. **Verify token is being sent:**
   - Open browser DevTools → Network tab
   - Check POST request includes `_csrf` in body or `X-CSRF-Token` in headers

3. **Check session cookie:**
   - Browser DevTools → Application → Cookies
   - Verify `presell.sid` cookie exists and is preserved across requests

4. **Review logs:**
   - CSRF validation logs to console with token mismatch details
   - Check "received" vs "expected" tokens

## References

- [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [Express session middleware](https://github.com/expressjs/session)
- [SameSite cookie flag](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite)
