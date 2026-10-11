import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const sourcePath = path.resolve(__dirname, '../../android/app/src/main/java/com/torserve/pwa/TVPlayer.java')

describe('TVPlayer source contract', () => {
    // A player launched for a result in a NEW task gets its result cancelled at
    // launch: logcat "Activity is launching as a new task, so cancelling activity
    // result." (both TVs, 2026-10-11). play() then resolved at once with
    // position -1 — no resume position was ever saved and Trakt got "stop" at 0%.
    it('launches the player in our task so its result (position) is delivered', () => {
        const source = fs.readFileSync(sourcePath, 'utf8')
        const playMethod = source.match(/public void play\(PluginCall call\) \{[\s\S]*?startActivityForResult\(call, intent, "playerResult"\);[\s\S]*?\n {4}\}/)
        const playListMethod = source.match(/public void playList\(PluginCall call\) \{[\s\S]*?startActivityForResult\(call, intent, "playerResult"\);[\s\S]*?\n {4}\}/)

        for (const method of [playMethod?.[0], playListMethod?.[0]]) {
            expect(method).toBeTruthy()
            expect(method).not.toContain('FLAG_ACTIVITY_NEW_TASK')
            expect(method).toContain('FLAG_ACTIVITY_CLEAR_TOP')
            expect(method).toContain('FLAG_ACTIVITY_SINGLE_TOP')
        }
    })

    it('returns the complete playback result shape when a player returns no data', () => {
        const source = fs.readFileSync(sourcePath, 'utf8')
        const callback = source.match(/private void playerResult\(PluginCall call, ActivityResult result\) \{[\s\S]*?call\.resolve\(ret\);[\s\S]*?\n {4}\}/)
        const noDataBranch = callback?.[0].match(/else \{[\s\S]*?\n {8}\}/)

        expect(noDataBranch?.[0]).toContain('ret.put("position", -1)')
        expect(noDataBranch?.[0]).toContain('ret.put("duration", -1)')
        expect(noDataBranch?.[0]).toContain('ret.put("finished", false)')
    })
})
