/**
 * Unit tests for the action's main functionality, src/main.ts
 *
 * To mock dependencies in ESM, you can create fixtures that export mock
 * functions and objects. For example, the core module is mocked in this test,
 * so that the actual '@actions/core' module is not imported.
 */
import { jest } from '@jest/globals'
import * as core from '../__fixtures__/core.js'

const mockGetChangedPackages = jest.fn<() => Promise<string[]>>()

// Mocks should be declared before the module being tested is imported.
jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('../src/getChangedPackages.js', () => ({
  getChangedPackages: mockGetChangedPackages
}))

// The module being tested should be imported dynamically. This ensures that the
// mocks are used in place of any actual dependencies.
const { run } = await import('../src/main.js')

describe('main.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('Gets this repo package as result', async () => {
    mockGetChangedPackages.mockResolvedValue(['package-1', 'package-2'])

    await run()

    expect(core.setOutput).toHaveBeenNthCalledWith(
      1,
      'changed_packages',
      'package-1\npackage-2'
    )
    expect(core.setOutput).toHaveBeenNthCalledWith(
      2,
      'changed_packages_one_line',
      'package-1 package-2'
    )
  })

  it('sets failed if an error occurs', async () => {
    mockGetChangedPackages.mockRejectedValue(new Error('something went wrong'))

    await run()

    expect(core.setFailed).toHaveBeenCalledWith('something went wrong')
  })

  it('handles non-Error objects in catch block', async () => {
    mockGetChangedPackages.mockRejectedValue('not an error object')

    await run()

    expect(core.setFailed).not.toHaveBeenCalled()
  })
})
