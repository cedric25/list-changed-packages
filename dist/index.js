import * as fs from 'fs';
import { execSync } from 'child_process';
import * as path from 'path';

/**
 * (Script used in CI)
 * List all packages that have at least one changed file compared to origin/main base
 */
/**
 * List all changed files compared to origin/main *as it was before you branched off*
 * Try to be smart and exclude "docs/" and ".md" files
 */
function getChangedFiles() {
    execSync('git fetch origin main', { stdio: 'ignore' });
    const output = execSync('git diff --name-only $(git merge-base HEAD origin/main)').toString();
    const files = output
        .split('\n')
        .map((f) => f.trim())
        .filter(Boolean)
        .filter((f) => !f.includes('docs/') && !f.endsWith('.md'));
    return files;
}
function isFileInPackage(fileAbsolutePath, packageDir) {
    const relative = path.relative(packageDir, fileAbsolutePath);
    return !relative.startsWith('..') && !path.isAbsolute(relative);
}
function findPackages(repoRoot) {
    const packages = [];
    const stack = [repoRoot];
    while (stack.length) {
        const dir = stack.pop();
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.git') {
                    stack.push(fullPath);
                }
            }
            else if (entry.name === 'package.json') {
                const packageJson = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
                packages.push({
                    dir: dir,
                    packageJson
                });
            }
        }
    }
    return packages;
}
function getChangedPackages() {
    const repoRootPath = process.cwd();
    const changedFilesRelative = getChangedFiles();
    const changedFilesAbsolute = changedFilesRelative.map((f) => path.join(repoRootPath, f));
    const packages = findPackages(repoRootPath);
    const changedPackages = packages.filter((pkg) => changedFilesAbsolute.some((fileAbsolutePath) => isFileInPackage(fileAbsolutePath, pkg.dir)));
    const lockFiles = [
        'package-lock.json',
        'npm-shrinkwrap.json',
        'pnpm-lock.yaml',
        'yarn.lock',
        'bun.lockb',
        'bun.lock'
    ];
    const hasLockChanged = changedFilesRelative.some((f) => lockFiles.includes(f));
    return {
        changedPackages: changedPackages
            .map((pkg) => pkg.packageJson.name)
            .filter((pkg) => pkg !== 'monorepo-root'),
        hasLockChanged
    };
}

function setOutput(name, value) {
    const outputFile = process.env['GITHUB_OUTPUT'] ?? '';
    if (outputFile) {
        const delimiter = `ghadelimiter_${crypto.randomUUID()}`;
        fs.appendFileSync(outputFile, `${name}<<${delimiter}\n${value}\n${delimiter}\n`);
    }
}
/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
async function run() {
    try {
        console.log('::debug::Starting...');
        const { changedPackages, hasLockChanged } = getChangedPackages();
        setOutput('changed_packages', changedPackages.join('\n'));
        setOutput('changed_packages_one_line', changedPackages.join(' '));
        setOutput('pnpm_filters_changed_packages', changedPackages.map((packageName) => `--filter ${packageName}`).join(' '));
        setOutput('pnpm_filters_changed_and_down_packages', changedPackages.map((packageName) => `--filter ${packageName}...`).join(' '));
        setOutput('has_lock_file_changed', hasLockChanged);
    }
    catch (error) {
        if (error instanceof Error) {
            console.log(`::error::${error.message}`);
            process.exitCode = 1;
        }
    }
}

/**
 * The entrypoint for the action. This file simply imports and runs the action's
 * main logic.
 */
/* istanbul ignore next */
run();
//# sourceMappingURL=index.js.map
