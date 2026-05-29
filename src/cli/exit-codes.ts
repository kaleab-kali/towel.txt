export const cliExitCodes = {
  renderError: 1,
  strictWarnings: 3,
  success: 0,
  usageError: 2
} as const;

export type CliExitCode = (typeof cliExitCodes)[keyof typeof cliExitCodes];
