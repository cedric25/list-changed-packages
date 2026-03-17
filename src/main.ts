import * as fs from 'fs'
import { getChangedPackages } from './getChangedPackages.js'

function setOutput(name: string, value: string | boolean): void {
  const outputFile = process.env['GITHUB_OUTPUT'] ?? ''
  if (outputFile) {
    const delimiter = `ghadelimiter_${crypto.randomUUID()}`
    fs.appendFileSync(outputFile, `${name}<<${delimiter}\n${value}\n${delimiter}\n`)
  }
}

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    console.log('::debug::Starting...')

    const { changedPackages, hasLockChanged } = getChangedPackages()

    setOutput('changed_packages', changedPackages.join('\n'))
    setOutput('changed_packages_one_line', changedPackages.join(' '))
    setOutput(
      'pnpm_filters_changed_packages',
      changedPackages.map((packageName) => `--filter ${packageName}`).join(' ')
    )
    setOutput(
      'pnpm_filters_changed_and_down_packages',
      changedPackages.map((packageName) => `--filter ${packageName}...`).join(' ')
    )
    setOutput('has_lock_file_changed', hasLockChanged)
  } catch (error) {
    if (error instanceof Error) {
      console.log(`::error::${error.message}`)
      process.exitCode = 1
    }
  }
}
