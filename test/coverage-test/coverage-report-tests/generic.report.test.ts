/*
 * Test cases shared by both coverage providers
*/

import fs from 'node:fs'
import { resolve } from 'pathe'
import { expect, test } from 'vitest'
import libCoverage from 'istanbul-lib-coverage'

import { readCoverageJson } from './utils'

test('html report', async () => {
  const coveragePath = resolve('./coverage/src')
  const files = fs.readdirSync(coveragePath)

  expect(files).toContain('index.html')
  expect(files).toContain('index.mts.html')
  expect(files).toContain('Hello.vue.html')
})

test('lcov report', async () => {
  const coveragePath = resolve('./coverage')
  const files = fs.readdirSync(coveragePath)

  expect(files).toContain('lcov.info')

  const lcovReport = resolve('./coverage/lcov-report')
  const lcovReportFiles = fs.readdirSync(lcovReport)

  expect(lcovReportFiles).toContain('index.html')
})

test('all includes untested files', () => {
  const coveragePath = resolve('./coverage/src')
  const files = fs.readdirSync(coveragePath)

  expect(files).toContain('untested-file.ts.html')

  // Directories starting with dot should be excluded
  expect(files).not.toContain('.should-be-excluded-from-coverage/excluded-from-coverage.ts.html')
  expect(files).not.toContain('.should-be-excluded-from-coverage')
  expect(files).not.toContain('excluded-from-coverage.ts.html')
})

test('files should not contain query parameters', () => {
  const coveragePath = resolve('./coverage/src/Counter')
  const files = fs.readdirSync(coveragePath)

  expect(files).toContain('index.html')
  expect(files).toContain('Counter.vue.html')
  expect(files).toContain('Counter.component.ts.html')
  expect(files).not.toContain('Counter.component.ts?vue&type=script&src=true&lang.ts.html')
})

test('file using import.meta.env is included in report', async () => {
  const coveragePath = resolve('./coverage/src')
  const files = fs.readdirSync(coveragePath)

  expect(files).toContain('importEnv.ts.html')
})

test('files should not contain a setup file', () => {
  const coveragePath = resolve('./coverage')
  const files = fs.readdirSync(coveragePath)

  expect(files).not.toContain('coverage-test')
  expect(files).not.toContain('setup.ts.html')

  const coverageSrcPath = resolve('./coverage/src')
  const srcFiles = fs.readdirSync(coverageSrcPath)

  expect(srcFiles).not.toContain('another-setup.ts.html')
})

test('thresholdAutoUpdate updates thresholds', async () => {
  const configFilename = resolve('./vitest.config.ts')
  const configContents = fs.readFileSync(configFilename, 'utf-8')

  for (const threshold of ['functions', 'branches', 'lines', 'statements']) {
    const match = configContents.match(new RegExp(`${threshold}: (?<coverage>[\\d|\\.]+)`))
    const coverage = match?.groups?.coverage || '0'

    // Configuration has fixed value of 1.01 and 0 set for each threshold
    expect(Number.parseInt(coverage)).toBeGreaterThan(1.01)
  }

  // Update thresholds back to fixed values
  const updatedConfig = configContents
    .replace(/(branches|statements): ([\d|\.])+/g, '$1: 1.01')
    .replace(/(functions|lines): ([\d|\.])+/g, '$1: 0')
  fs.writeFileSync(configFilename, updatedConfig)
})

test('function count is correct', async () => {
  const coverageJson = await readCoverageJson()
  const coverageMap = libCoverage.createCoverageMap(coverageJson as any)
  const fileCoverage = coverageMap.fileCoverageFor('<process-cwd>/src/function-count.ts')

  const { functions } = fileCoverage.toSummary()

  expect(functions.total).toBe(5)
  expect(functions.covered).toBe(3)
})

test('coverage provider does not conflict with built-in reporter\'s outputFile', async () => {
  const coveragePath = resolve('./coverage')
  const files = fs.readdirSync(coveragePath)

  expect(files).toContain('junit.xml')
})

test('virtual files should be excluded', () => {
  const files = fs.readdirSync(resolve('./coverage'))
  const srcFiles = fs.readdirSync(resolve('./coverage/src'))

  for (const file of [...files, ...srcFiles]) {
    expect(file).not.toContain('virtual:')

    // Vitest in node
    expect(file).not.toContain('__x00__')
    expect(file).not.toContain('\0')

    // Vitest browser
    expect(file).not.toContain('\x00')
  }
})

test('multi environment coverage is merged correctly', async () => {
  const coverageJson = await readCoverageJson()
  const coverageMap = libCoverage.createCoverageMap(coverageJson as any)
  const fileCoverage = coverageMap.fileCoverageFor('<process-cwd>/src/multi-environment.ts')
  const lineCoverage = fileCoverage.getLineCoverage()

  // Condition not covered by any test
  expect(lineCoverage[13]).toBe(0)

  // Condition covered by SSR test but not by Web
  expect(lineCoverage[18]).toBe(1)

  // Condition not covered by any test
  expect(lineCoverage[22]).toBe(0)

  // Condition covered by Web test but not by SSR
  expect(lineCoverage[26]).toBe(1)

  // Condition covered by both tests
  expect(lineCoverage[30]).toBe(2)
})
