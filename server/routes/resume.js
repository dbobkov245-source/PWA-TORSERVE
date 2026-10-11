/**
 * /api/resume — resume positions shared by every TV on this server.
 * Merge rules live in resumeStore.js; the client applies the same ones.
 */

import express from 'express'
import { asyncRoute } from '../asyncRoute.js'
import { applyResumeChange, listResume, pruneResume } from '../resumeStore.js'

export function createResumeRouter({ db, safeWrite }) {
    const router = express.Router()
    const state = () => (db.data.resume ||= { entries: {}, tombstones: {} })

    router.get('/', (req, res) => {
        res.json(listResume(state()))
    })

    // body: { entry: {...} } or { deletedAt: ms }
    router.post('/:key', asyncRoute(async (req, res) => {
        let changed
        try {
            changed = applyResumeChange(state(), req.params.key, req.body || {})
        } catch (err) {
            return res.status(400).json({ error: err.message })
        }
        if (changed) {
            pruneResume(state())
            await safeWrite(db)
        }
        res.json({ changed })
    }))

    return router
}
