import { jest } from '@jest/globals'

jest.unstable_mockModule('child_process', () => ({
  execSync: jest.fn()
}))
jest.unstable_mockModule('fs', () => ({
  readdirSync: jest.fn(),
  readFileSync: jest.fn()
}))

const { execSync } = await import('child_process')
const { readdirSync, readFileSync } = await import('fs')
const { getChangedFiles, isFileInPackage, findPackages, getChangedPackages } =
  await import('../src/getChangedPackages.js')

describe('getChangedFiles', () => {
  const mockedExecSync = execSync as jest.MockedFunction<typeof execSync>

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return a list of changed files, excluding docs and .md files', () => {
    // Mock the output of git diff --name-only
    const mockOutput = [
      'src/index.ts',
      'package.json',
      'docs/README.md',
      'README.md',
      'src/utils.test.ts',
      'docs/api.txt',
      'src/docs/api.txt',
      'packages/pkg-a/docs/index.html'
    ].join('\n')

    mockedExecSync.mockReturnValue(Buffer.from(mockOutput))

    const files = getChangedFiles()

    expect(files).toEqual(['src/index.ts', 'package.json', 'src/utils.test.ts'])
    expect(mockedExecSync).toHaveBeenCalledWith('git fetch origin main', {
      stdio: 'ignore'
    })
    expect(mockedExecSync).toHaveBeenCalledWith(
      'git diff --name-only $(git merge-base HEAD origin/main)'
    )
  })

  it('should return an empty array if no files are changed', () => {
    mockedExecSync.mockReturnValue(Buffer.from(''))

    const files = getChangedFiles()

    expect(files).toEqual([])
  })

  it('should handle whitespace and empty lines in git output', () => {
    const mockOutput = `
      src/index.ts
      
      package.json
    `
    mockedExecSync.mockReturnValue(Buffer.from(mockOutput))

    const files = getChangedFiles()

    expect(files).toEqual(['src/index.ts', 'package.json'])
  })
})

describe('isFileInPackage', () => {
  it('should return true if the file is within the package directory', () => {
    const packageDir = '/repo/packages/pkg-a'
    const filePath = '/repo/packages/pkg-a/src/index.ts'
    expect(isFileInPackage(filePath, packageDir)).toBe(true)
  })

  it('should return true if the file is the package.json of the package', () => {
    const packageDir = '/repo/packages/pkg-a'
    const filePath = '/repo/packages/pkg-a/package.json'
    expect(isFileInPackage(filePath, packageDir)).toBe(true)
  })

  it('should return false if the file is in a parent directory', () => {
    const packageDir = '/repo/packages/pkg-a'
    const filePath = '/repo/packages/package.json'
    expect(isFileInPackage(filePath, packageDir)).toBe(false)
  })

  it('should return false if the file is in a sibling package directory', () => {
    const packageDir = '/repo/packages/pkg-a'
    const filePath = '/repo/packages/pkg-b/src/index.ts'
    expect(isFileInPackage(filePath, packageDir)).toBe(false)
  })

  it('should return false if the file path is absolute but outside the packageDir', () => {
    // This is a bit tricky depending on OS, but path.relative should handle it.
    const packageDir = '/repo/packages/pkg-a'
    const filePath = '/other/repo/src/index.ts'
    expect(isFileInPackage(filePath, packageDir)).toBe(false)
  })
})

describe('findPackages', () => {
  const mockedReaddirSync = readdirSync as jest.MockedFunction<typeof readdirSync>
  const mockedReadFileSync = readFileSync as jest.MockedFunction<typeof readFileSync>

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should find all package.json files recursively, ignoring node_modules, dist, and .git', () => {
    const repoRoot = '/repo'

    // First call for repoRoot
    mockedReaddirSync.mockReturnValueOnce([
      { name: 'packages', isDirectory: () => true } as any,
      { name: 'node_modules', isDirectory: () => true } as any,
      { name: 'package.json', isDirectory: () => false } as any
    ])

    // Second call for /repo/packages
    mockedReaddirSync.mockReturnValueOnce([
      { name: 'pkg-a', isDirectory: () => true } as any,
      { name: 'pkg-b', isDirectory: () => true } as any
    ])

    // Third call for /repo/packages/pkg-a
    mockedReaddirSync.mockReturnValueOnce([
      { name: 'package.json', isDirectory: () => false } as any,
      { name: 'src', isDirectory: () => true } as any
    ])

    // Fourth call for /repo/packages/pkg-a/src
    mockedReaddirSync.mockReturnValueOnce([])

    // Fifth call for /repo/packages/pkg-b
    mockedReaddirSync.mockReturnValueOnce([
      { name: 'package.json', isDirectory: () => false } as any
    ])

    mockedReadFileSync.mockImplementation((path: any) => {
      if (path === '/repo/package.json') {
        return JSON.stringify({ name: 'monorepo-root' })
      }
      if (path === '/repo/packages/pkg-a/package.json') {
        return JSON.stringify({ name: 'pkg-a' })
      }
      if (path === '/repo/packages/pkg-b/package.json') {
        return JSON.stringify({ name: 'pkg-b' })
      }
      return ''
    })

    const packages = findPackages(repoRoot)

    expect(packages).toHaveLength(3)
    expect(packages).toContainEqual({
      dir: '/repo',
      packageJson: { name: 'monorepo-root' }
    })
    expect(packages).toContainEqual({
      dir: '/repo/packages/pkg-a',
      packageJson: { name: 'pkg-a' }
    })
    expect(packages).toContainEqual({
      dir: '/repo/packages/pkg-b',
      packageJson: { name: 'pkg-b' }
    })

    // Verify exclusions
    expect(mockedReaddirSync).not.toHaveBeenCalledWith(
      expect.stringContaining('node_modules'),
      expect.anything()
    )
  })
})

describe('getChangedPackages - hasLockChanged', () => {
  const mockedExecSync = execSync as jest.MockedFunction<typeof execSync>
  const mockedReaddirSync = readdirSync as jest.MockedFunction<typeof readdirSync>
  const mockedReadFileSync = readFileSync as jest.MockedFunction<typeof readFileSync>

  function setupMinimalRepo(changedFiles: string[]) {
    // git fetch + git diff
    mockedExecSync.mockReturnValueOnce(Buffer.from(''))
    mockedExecSync.mockReturnValueOnce(Buffer.from(changedFiles.join('\n')))

    // Repo with a single root package.json
    mockedReaddirSync.mockReturnValueOnce([
      { name: 'package.json', isDirectory: () => false } as any
    ])
    mockedReadFileSync.mockReturnValue(JSON.stringify({ name: 'monorepo-root' }))
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it.each([
    ['package-lock.json'],
    ['npm-shrinkwrap.json'],
    ['pnpm-lock.yaml'],
    ['yarn.lock'],
    ['bun.lockb'],
    ['bun.lock']
  ])('returns hasLockChanged true when %s changed', (lockFile) => {
    setupMinimalRepo([lockFile, 'src/index.ts'])

    const result = getChangedPackages()

    expect(result.hasLockChanged).toBe(true)
  })

  it('returns hasLockChanged false when no lock file changed', () => {
    setupMinimalRepo(['src/index.ts', 'src/utils.ts'])

    const result = getChangedPackages()

    expect(result.hasLockChanged).toBe(false)
  })

  it('returns hasLockChanged false for nested lock files', () => {
    setupMinimalRepo(['packages/pkg-a/package-lock.json'])

    const result = getChangedPackages()

    expect(result.hasLockChanged).toBe(false)
  })
})
