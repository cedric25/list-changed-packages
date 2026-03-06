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

    const changedPackages = await getChangedPackages()

    core.setOutput('changed_packages', changedPackages.join('\n'))
    core.setOutput('changed_packages_one_line', changedPackages.join(' '))
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}
