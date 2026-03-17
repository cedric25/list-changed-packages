import { execSync } from 'child_process'
import * as path from 'path'
import * as fs from 'fs'

/**
 * (Script used in CI)
 * List all packages that have at least one changed file compared to origin/main base
 */

/**
 * List all changed files compared to origin/main *as it was before you branched off*
 * Try to be smart and exclude "docs/" and ".md" files
 */
export function getChangedFiles() {
  execSync('git fetch origin main', { stdio: 'ignore' })
  const output = execSync('git diff --name-only $(git merge-base HEAD origin/main)').toString()
  const files = output
    .split('\n')
    .map((f) => f.trim())
    .filter(Boolean)
    .filter((f) => !f.includes('docs/') && !f.endsWith('.md'))
  return files
}

export function isFileInPackage(fileAbsolutePath: string, packageDir: string) {
  const relative = path.relative(packageDir, fileAbsolutePath)
  return !relative.startsWith('..') && !path.isAbsolute(relative)
}

export function findPackages(repoRoot: string) {
  const packages = []
  const stack = [repoRoot]

  while (stack.length) {
    const dir = stack.pop()
    const entries = fs.readdirSync(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.git') {
          stack.push(fullPath)
        }
      } else if (entry.name === 'package.json') {
        const packageJson = JSON.parse(fs.readFileSync(fullPath, 'utf8'))
        packages.push({
          dir: dir,
          packageJson
        })
      }
    }
  }

  return packages
}

export function getChangedPackages() {
  const repoRootPath = process.cwd()
  const changedFilesRelative = getChangedFiles()
  const changedFilesAbsolute = changedFilesRelative.map((f) => path.join(repoRootPath, f))
  const packages = findPackages(repoRootPath)
  const changedPackages = packages.filter((pkg) =>
    changedFilesAbsolute.some((fileAbsolutePath) => isFileInPackage(fileAbsolutePath, pkg.dir))
  )

  const lockFiles = [
    'package-lock.json',
    'npm-shrinkwrap.json',
    'pnpm-lock.yaml',
    'yarn.lock',
    'bun.lockb',
    'bun.lock'
  ]
  const hasLockChanged = changedFilesRelative.some((f) => lockFiles.includes(f))

  return {
    changedPackages: changedPackages
      .map((pkg) => pkg.packageJson.name)
      .filter((pkg) => pkg !== 'monorepo-root'),
    hasLockChanged
  }
}
