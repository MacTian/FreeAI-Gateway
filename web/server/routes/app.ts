import { Router } from 'express'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

export const appRouter = Router()

const __dirname = dirname(fileURLToPath(import.meta.url))

appRouter.get('/app/version', (_req, res) => {
  try {
    const pkg = JSON.parse(readFileSync(join(__dirname, '../../../package.json'), 'utf-8'))
    res.json({ version: pkg.version })
  } catch {
    res.json({ version: '1.0.0' })
  }
})
