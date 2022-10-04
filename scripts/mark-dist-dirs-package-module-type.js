import { writeFileSync } from 'fs';

const distDirNameAndPackageFileMappings = {
  '/dist/esm': { type: 'module' },
  '/dist/cjs': { type: 'commonjs' },
};

Object.entries(distDirNameAndPackageFileMappings).forEach(
  ([distDirName, packageFileContents]) => {
    const destPath = new URL(`..${distDirName}/package.json`, import.meta.url);
    const output = JSON.stringify(packageFileContents, undefined, 2);
    writeFileSync(destPath, output);
  }
);
