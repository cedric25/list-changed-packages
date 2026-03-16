import * as core from '@actions/core'
import { getChangedPackages } from './getChangedPackages.js'

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    core.debug('Starting...')

    const { changedPackages, hasLockChanged } = getChangedPackages()

    core.setOutput('changed_packages', changedPackages.join('\n'))
    core.setOutput('changed_packages_one_line', changedPackages.join(' '))
    core.setOutput(
      'pnpm_filters_changed_packages',
      changedPackages.map((packageName) => `--filter ${packageName}`).join(' ')
    )
    core.setOutput(
      'pnpm_filters_changed_and_down_packages',
      changedPackages
        .map((packageName) => `--filter ${packageName}...`)
        .join(' ')
    )
    core.setOutput('has_lock_file_changed', hasLockChanged)
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}
