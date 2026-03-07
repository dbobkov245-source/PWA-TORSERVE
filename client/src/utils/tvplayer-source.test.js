import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const sourcePath = path.resolve(__dirname, '../../android/app/src/main/java/com/torserve/pwa/TVPlayer.java')

describe('TVPlayer source contract', () => {
    it('keeps NEW_TASK flag in both play and playList intents', () => {
        const source = fs.readFileSync(sourcePath, 'utf8')
        const playMethod = source.match(/public void play\(PluginCall call\) \{[\s\S]*?startActivityForResult\(call, intent, "playerResult"\);[\s\S]*?\n    \}/)
        const playListMethod = source.match(/public void playList\(PluginCall call\) \{[\s\S]*?startActivityForResult\(call, intent, "playerResult"\);[\s\S]*?\n    \}/)

        expect(playMethod?.[0]).toContain('FLAG_ACTIVITY_NEW_TASK')
        expect(playListMethod?.[0]).toContain('FLAG_ACTIVITY_NEW_TASK')
    })
})
