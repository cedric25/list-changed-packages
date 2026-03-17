/**
 * Unit tests for the action's main functionality, src/main.ts
 */
import { jest } from '@jest/globals'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

const mockGetChangedPackages =
  jest.fn<() => { changedPackages: string[]; hasLockChanged: boolean }>()

jest.unstable_mockModule('../src/getChangedPackages.js', () => ({
  getChangedPackages: mockGetChangedPackages
}))

const { run } = await import('../src/main.js')

function readOutputFile(filePath: string): Record<string, string> {
  const content = fs.readFileSync(filePath, 'utf8')
  const outputs: Record<string, string> = {}
  const regex = /^(.+?)<<ghadelimiter_[^\n]+\n([\s\S]*?)\nghadelimiter_/gm
  let match
  while ((match = regex.exec(content)) !== null) {
    outputs[match[1]] = match[2]
  }
  return outputs
}

describe('main.ts', () => {
  let outputFile: string

  beforeEach(() => {
    jest.clearAllMocks()
    outputFile = path.join(os.tmpdir(), `test-output-${Date.now()}`)
    fs.writeFileSync(outputFile, '')
    process.env['GITHUB_OUTPUT'] = outputFile
    process.exitCode = 0
  })

  afterEach(() => {
    fs.unlinkSync(outputFile)
    delete process.env['GITHUB_OUTPUT']
    process.exitCode = 0
  })

  it('Gets this repo package as result', async () => {
    mockGetChangedPackages.mockReturnValue({
      changedPackages: ['package-1', 'package-2'],
      hasLockChanged: false
    })

    await run()

    const outputs = readOutputFile(outputFile)
    expect(outputs['changed_packages']).toBe('package-1\npackage-2')
    expect(outputs['changed_packages_one_line']).toBe('package-1 package-2')
    expect(outputs['pnpm_filters_changed_packages']).toBe(
      '--filter package-1 --filter package-2'
    )
    expect(outputs['pnpm_filters_changed_and_down_packages']).toBe(
      '--filter package-1... --filter package-2...'
    )
    expect(outputs['has_lock_file_changed']).toBe('false')
  })

  it('sets has_lock_file_changed to true when package-lock.json changed', async () => {
    mockGetChangedPackages.mockReturnValue({
      changedPackages: ['package-1'],
      hasLockChanged: true
    })

    await run()

    const outputs = readOutputFile(outputFile)
    expect(outputs['has_lock_file_changed']).toBe('true')
  })

  it('sets failed if an error occurs', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    mockGetChangedPackages.mockImplementation(() => {
      throw new Error('something went wrong')
    })

    await run()

    expect(consoleSpy).toHaveBeenCalledWith('::error::something went wrong')
    expect(process.exitCode).toBe(1)
    consoleSpy.mockRestore()
  })

  it('handles non-Error objects in catch block', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    mockGetChangedPackages.mockImplementation(() => {
      throw 'not an error object'
    })

    await run()

    expect(consoleSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('::error::')
    )
    consoleSpy.mockRestore()
  })
})
