import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const playsDirectory = new URL('../public/data/plays/', import.meta.url)
const outputFile = new URL('../public/data/catalog.json', import.meta.url)

const requiredRights = ['status', 'owner', 'licenseReference', 'publicDisplay', 'derivativeVisuals']

async function main() {
  let directories = []
  try {
    directories = await readdir(playsDirectory, { withFileTypes: true })
  } catch {
    console.log('No imported plays found. Create public/data/plays/<play-id>/manifest.json first.')
    return
  }

  const catalog = []
  for (const directory of directories.filter((entry) => entry.isDirectory())) {
    const manifestPath = join(playsDirectory.pathname, directory.name, 'manifest.json')
    let manifestText
    try {
      manifestText = await readFile(manifestPath, 'utf8')
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.warn(`Skipping ${directory.name}: no manifest.json found.`)
        continue
      }
      throw error
    }
    const manifest = JSON.parse(manifestText)
    const missing = ['id', 'team', 'opponent', 'framesUrl', 'rights'].filter((key) => manifest[key] == null)
    const missingRights = requiredRights.filter((key) => manifest.rights?.[key] == null)
    if (missing.length || missingRights.length) {
      throw new Error(`${directory.name}: missing ${[...missing, ...missingRights.map((key) => `rights.${key}`)].join(', ')}`)
    }
    if (manifest.rights.status !== 'cleared' || !manifest.rights.publicDisplay || !manifest.rights.derivativeVisuals) {
      console.warn(`Skipping ${manifest.id}: public display and derivative rights are not cleared.`)
      continue
    }
    catalog.push(manifest)
  }

  await writeFile(outputFile, `${JSON.stringify(catalog, null, 2)}\n`)
  console.log(`Wrote ${catalog.length} cleared plays to ${outputFile.pathname}`)
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
