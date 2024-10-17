/* eslint-disable no-console */
import fs from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import minimist from 'minimist'
import chalk from 'chalk'
import semver from 'semver'
import enquirer from 'enquirer'
import { execa } from 'execa'
import pSeries from 'p-series'

const { prompt } = enquirer

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const args = minimist(process.argv.slice(2))
const {
  skipBuild,
  tag: optionTag,
  dry: isDryRun,
  skipCleanCheck: skipCleanGitCheck,
  noDepsUpdate,
  noPublish,
  noLockUpdate,
} = args

if (args.h || args.help) {
  console.log(
    `
Usage: node release.mjs [flags]
       node release.mjs [ -h | --help ]

Flags:
  --skipBuild         Skip building packages
  --tag               Publish under a given npm dist tag
  --dry               Dry run
  --skipCleanCheck    Skip checking if the git repo is clean
  --noDepsUpdate      Skip updating dependencies in package.json files
  --noPublish         Skip publishing packages
  --noLockUpdate      Skips updating the lock with "pnpm install"
`.trim(),
  )
  process.exit(0)
}

// const preId =
//   args.preId ||
//   (semver.prerelease(currentVersion) && semver.prerelease(currentVersion)[0])
const EXPECTED_BRANCH = 'main'

/**
 * @param bin {string}
 * @param args {string}
 * @param opts {import('execa').CommonOptions<string>}
 */
const run = (bin, args, opts = {}) =>
  execa(bin, args, { stdio: 'inherit', ...opts })
const dryRun = (bin, args, opts = {}) =>
  console.log(chalk.blue(`[dry-run] ${bin} ${args.join(' ')}`), opts)
const runIfNotDry = isDryRun ? dryRun : run
const step = (msg) => console.log(chalk.cyan(msg))

async function main() {
  if (!skipCleanGitCheck) {
    const isDirtyGit = !!(
      await run('git', ['status', '--porcelain'], { stdio: 'pipe' })
    ).stdout

    if (isDirtyGit) {
      console.log(chalk.red(`Git repo isn't clean.`))
      return
    }

    const currentBranch = (
      await run('git', ['branch', '--show-current'], { stdio: 'pipe' })
    ).stdout

    if (currentBranch !== EXPECTED_BRANCH) {
      console.log(
        chalk.red(
          `You should be on branch "${EXPECTED_BRANCH}" but are on "${currentBranch}"`,
        ),
      )
      return
    }
  } else {
    console.log(chalk.bold.white(`Skipping git checks...`))
  }

  if (!skipCleanGitCheck) {
    const isOutdatedRE = new RegExp(
      `\\W${EXPECTED_BRANCH}\\W.*(?:fast-forwardable|local out of date)`,
      'i',
    )

    const isOutdatedGit = isOutdatedRE.test(
      (await run('git', ['remote', 'show', 'origin'], { stdio: 'pipe' }))
        .stdout,
    )

    if (isOutdatedGit) {
      console.log(chalk.red(`Git branch is not in sync with remote`))
      return
    }
  }

  const changedPackages = await getChangedPackages(
    // FIXME: uncomment once plugins are ready
    // globby expects `/` even on windows
    // await globby(join(__dirname, '../plugins/*').replace(/\\/g, '/'), {
    //   onlyFiles: false,
    // }),
    // add the root package
    join(__dirname, '..').replace(/\\/g, '/'),
  )
  if (!changedPackages.length) {
    console.log(chalk.red(`No packages have changed since last release`))
    return
  }

  if (isDryRun) {
    console.log(`\n${chalk.bold.blue('This is a dry run')}\n`)
  }

  // NOTE: I'm unsure if this would mess up the changelog
  // const { pickedPackages } = await prompt({
  //   type: 'multiselect',
  //   name: 'pickedPackages',
  //   messages: 'What packages do you want to release?',
  //   choices: changedPackages.map((pkg) => pkg.name),
  // })

  const packagesToRelease = changedPackages
  // const packagesToRelease = changedPackages.filter((pkg) =>
  //   pickedPackages.includes(pkg.name)
  // )

  step(
    `Ready to release ${packagesToRelease
      .map(({ name }) => chalk.bold.white(name))
      .join(', ')}`,
  )

  const pkgWithVersions = await pSeries(
    packagesToRelease.map(({ name, path, pkg }) => async () => {
      let { version } = pkg

      const prerelease = semver.prerelease(version)
      const preId = prerelease && prerelease[0]

      const versionIncrements = [
        'patch',
        'minor',
        'major',
        ...(preId ? ['prepatch', 'preminor', 'premajor', 'prerelease'] : []),
      ]

      const { release } = await prompt({
        type: 'select',
        name: 'release',
        message: `Select release type for ${chalk.bold.white(name)}`,
        choices: versionIncrements
          .map((i) => `${i}: ${name} (${semver.inc(version, i, preId)})`)
          .concat(
            optionTag === 'beta'
              ? [`beta: ${name} (${semver.inc(version, 'prerelease', 'beta')})`]
              : [],
          )
          .concat(['custom']),
      })

      if (release === 'custom') {
        version = (
          await prompt({
            type: 'input',
            name: 'version',
            message: `Input custom version (${chalk.bold.white(name)})`,
            initial: version,
          })
        ).version
      } else {
        version = release.match(/\((.*)\)/)[1]
      }

      if (!semver.valid(version)) {
        throw new Error(`invalid target version: ${version}`)
      }

      return { name, path, version, pkg }
    }),
  )

  const { yes: isReleaseConfirmed } = await prompt({
    type: 'confirm',
    name: 'yes',
    message: `Releasing \n${pkgWithVersions
      .map(
        ({ name, version }) =>
          `  · ${chalk.white(name)}: ${chalk.yellow.bold(`v${version}`)}`,
      )
      .join('\n')}\nConfirm?`,
  })

  if (!isReleaseConfirmed) {
    return
  }

  step('\nUpdating versions in package.json files...')
  await updateVersions(pkgWithVersions)

  if (!noLockUpdate) {
    step('\nUpdating lock...')
    await runIfNotDry(`pnpm`, ['install'])
  }

  step('\nGenerating changelogs...')
  for (const pkg of pkgWithVersions) {
    step(` -> ${pkg.name} (${pkg.path})`)
    await runIfNotDry(`pnpm`, ['run', 'changelog'], { cwd: pkg.path })
    await runIfNotDry(`pnpm`, ['exec', 'prettier', '--write', 'CHANGELOG.md'], {
      cwd: pkg.path,
    })
    // FIXME: is this needed with latest pnpm?
    // await fs.copyFile(
    //   resolve(__dirname, '../LICENSE'),
    //   resolve(pkg.path, 'LICENSE'),
    // )
  }

  const { yes: isChangelogCorrect } = await prompt({
    type: 'confirm',
    name: 'yes',
    message: 'Are the changelogs correct?',
  })

  if (!isChangelogCorrect) {
    return
  }

  step('\nBuilding all packages...')
  if (!skipBuild && !isDryRun) {
    await run('pnpm', ['run', 'build'])
    await run('pnpm', ['run', 'build:plugins'])
  } else {
    console.log(`(skipped)`)
  }

  const { stdout } = await run('git', ['diff'], { stdio: 'pipe' })
  if (stdout) {
    step('\nCommitting changes...')
    await runIfNotDry('git', [
      'add',
      'plugins/*/CHANGELOG.md',
      'plugins/*/package.json',
      'pnpm-lock.yaml',
    ])
    await runIfNotDry('git', [
      'commit',
      '-m',
      `release: ${pkgWithVersions
        .map(({ name, version }) => `${name}@${version}`)
        .join(' ')}`,
    ])
  } else {
    console.log('No changes to commit.')
  }

  step('\nCreating tags...')
  const versionsToPush = []
  for (const pkg of pkgWithVersions) {
    const tagName
      = pkg.name === 'vue-router'
        ? `v${pkg.version}`
        : `${pkg.name}@${pkg.version}`

    versionsToPush.push(`refs/tags/${tagName}`)
    await runIfNotDry('git', ['tag', `${tagName}`])
  }

  if (!noPublish) {
    step('\nPublishing packages...')
    for (const pkg of pkgWithVersions) {
      await publishPackage(pkg)
    }

    step('\nPushing to Github...')
    await runIfNotDry('git', ['push', 'origin', ...versionsToPush])
    await runIfNotDry('git', ['push'])
  } else {
    console.log(chalk.bold.white(`Skipping publishing...`))
  }
}

/**
 *
 * @param packageList {{ name: string; path: string; version: string, pkg: any }}
 */
async function updateVersions(packageList) {
  return Promise.all(
    packageList.map(({ pkg, version, path, name }) => {
      pkg.version = version
      if (!noDepsUpdate) {
        updateDeps(pkg, 'dependencies', packageList)
        updateDeps(pkg, 'peerDependencies', packageList)
      }
      const content = `${JSON.stringify(pkg, null, 2)}\n`
      return isDryRun
        ? dryRun('write', [name], {
            version: pkg.version,
            dependencies: pkg.dependencies,
            peerDependencies: pkg.peerDependencies,
          })
        : fs.writeFile(join(path, 'package.json'), content)
    }),
  )
}

function updateDeps(pkg, depType, updatedPackages) {
  const deps = pkg[depType]
  if (!deps) return
  step(`Updating ${chalk.bold(depType)} for ${chalk.bold.white(pkg.name)}...`)
  Object.keys(deps).forEach((dep) => {
    const updatedDep = updatedPackages.find((pkg) => pkg.name === dep)
    // avoid updated peer deps that are external like @vue/devtools-api
    if (dep && updatedDep) {
      // skip any workspace reference, pnpm will handle it
      if (deps[dep].startsWith('workspace:')) {
        console.log(
          chalk.yellow.dim(
            `${pkg.name} -> ${depType} -> ${dep}@${deps[dep]} (skipped)`,
          ),
        )
      } else {
        console.log(
          chalk.yellow(
            `${pkg.name} -> ${depType} -> ${dep}@>=${updatedDep.version}`,
          ),
        )
        deps[dep] = `>=${updatedDep.version}`
      }
    }
  })
}

async function publishPackage(pkg) {
  step(`Publishing ${pkg.name}...`)

  try {
    await runIfNotDry(
      'pnpm',
      [
        'publish',
        ...(optionTag ? ['--tag', optionTag] : []),
        ...(skipCleanGitCheck ? ['--no-git-checks'] : []),
        '--access',
        'public',
        // only needed for branches other than main
        '--publish-branch',
        EXPECTED_BRANCH,
      ],
      {
        cwd: pkg.path,
        stdio: 'pipe',
      },
    )
    console.log(
      chalk.green(`Successfully published ${pkg.name}@${pkg.version}`),
    )
  } catch (e) {
    if (e.stderr.match(/previously published/)) {
      console.log(chalk.red(`Skipping already published: ${pkg.name}`))
    } else {
      throw e
    }
  }
}

/**
 * Get the packages that have changed. Based on `lerna changed` but without lerna.
 *
 * @param {string[]} folders
 * @returns {Promise<{ name: string; path: string; pkg: any; version: string }[]} a promise of changed packages
 */
async function getChangedPackages(...folders) {
  let lastTag

  try {
    const { stdout } = await run('git', ['describe', '--tags', '--abbrev=0'], {
      stdio: 'pipe',
    })
    lastTag = stdout
  } catch (_error) {
    console.error(_error)
    // maybe there are no tags
    console.error(`Couldn't get the last tag, using first commit...`)
    const { stdout } = await run(
      'git',
      ['rev-list', '--max-parents=0', 'HEAD'],
      { stdio: 'pipe' },
    )
    lastTag = stdout
  }

  const pkgs = await Promise.all(
    folders.map(async (folder) => {
      if (!(await fs.lstat(folder)).isDirectory()) return null

      const pkg = JSON.parse(await fs.readFile(join(folder, 'package.json')))
      if (!pkg.private) {
        const { stdout: hasChanges } = await run(
          'git',
          [
            'diff',
            lastTag,
            '--',
            // apparently {src,package.json} doesn't work
            join(folder, 'src'),
            // TODO: should not check dev deps and should compare to last tag changes
            join(folder, 'package.json'),
          ],
          { stdio: 'pipe' },
        )

        if (hasChanges) {
          return {
            path: folder,
            name: pkg.name,
            version: pkg.version,
            pkg,
          }
        } else {
          return null
        }
      }
    }),
  )

  return pkgs.filter((p) => p)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
