import { fileURLToPath } from 'node:url'
import { defineWorkspace } from 'vitest/config'
import { globbySync } from 'globby'
import fs from 'node:fs'

const pluginsProjects = globbySync('./plugins/*', { onlyDirectories: true })
  .map((dir) => {
    try {
      const pkg = JSON.parse(
        fs.readFileSync(fileURLToPath(new URL(`${dir}/package.json`, import.meta.url)), 'utf-8'),
      )
      return {
        name: pkg.name,
        root: dir,
      }
    } catch (error) {
      console.error(`Error reading package.json from "${dir}"`, error)
      return null
    }
  })
  .filter((v) => v != null)

export default defineWorkspace([
  // you can use a list of glob patterns to define your workspaces
  // Vitest expects a list of config files
  // or directories where there is a config file
  '.',
  // './plugins/*',
  // you can even run the same tests,
  // but with different configs in the same "vitest" process
  // () => ({}),
  ...pluginsProjects.map((project) => ({
    extends: './vitest.config.ts',
    test: {
      ...project,
    },
  })),
])
