/** Express 4 does not forward rejected promises from async handlers. */
export const asyncRoute = handler => (req, res, next) =>
    Promise.resolve().then(() => handler(req, res, next)).catch(next)
