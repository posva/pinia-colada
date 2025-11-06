// @ts-check
import { readFileSync } from 'node:fs'
import path from 'node:path'

// Define raw escape codes for colors
const reset = '\x1B[0m'
const red = '\x1B[31m'
const green = '\x1B[32m'
const bgRedWhite = '\x1B[41m\x1B[37m'

const msgPath = path.resolve('.git/COMMIT_EDITMSG')
const msg = readFileSync(msgPath, 'utf-8').trim()

const commitRE =
  /^(?:revert: )?(?:feat|fix|docs|dx|style|refactor|perf|test|workflow|build|ci|chore|types|wip|release)(?:\(.+\))?!?: .{1,50}/

if (!commitRE.test(msg)) {
  console.error(
    `\n` +
      `  ${bgRedWhite} ERROR ${reset} ${red}invalid commit message format.${reset}\n\n` +
      `${msg
        .split('\n')
        .map((line) => `    ${line}`)
        .join('\n')}\n\n` +
      `${red}  Proper commit message format is required for automated changelog generation. Examples:\n\n` +
      `    ${green}feat: add disableRoot option${reset}\n` +
      `    ${green}fix(view): handle keep-alive with aborted navigations (close #28)${reset}\n\n` +
      `${red}  See .github/commit-convention.md for more details.${reset}\n`,
  )
  process.exit(1)
}
