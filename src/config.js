/**
 * @param {{
 *  fetch: (
 *    {
 *      type: "doc" | "json" | "text",
 *      id: string,
 *      output: string,
 *      auth?: string
 *    } |
 *    {
 *      type: "sheet",
 *      id: string,
 *      sheetId: string,
 *      output: string,
 *      auth?: string
 *    }
 *  )[],
 *  deployment: {
 *    region: string,
 *    bucket: string,
 *    key: string,
 *    build: string,
 *    profile?: string,
 *    distribution?: string | null | false
 *  } | {
 *    build: string,
 *    branch?: string,
 *    url?: string
 *  }
 * }} configuration
 */
export function defineConfig(configuration) {
  return configuration;
}
