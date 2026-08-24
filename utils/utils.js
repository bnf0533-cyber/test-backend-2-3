export function createError(status, message) {
    const err = new Error(message);
    err.status = status;
    return err;
}

export function formatGame(game) {
    if (!game) return null;
    const { _id, ...res } = game;
    return { id: _id.toString(), ...res };
}