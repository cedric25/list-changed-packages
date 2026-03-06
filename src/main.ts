import * as core from '@actions/core'

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    core.debug('Starting...')

    core.setOutput('changed_packages', '@me-corp/ui-kit')
    core.setOutput('changed_packages_one_line', '@me-corp/ui-kit')
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}
