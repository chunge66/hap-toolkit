/*
 * Copyright (c) 2021, the hapjs-platform Project Contributors
 * SPDX-License-Identifier: Apache-2.0
 */
import { stringifyRequest } from 'loader-utils'
import { parseFragmentsWithCache } from '@hap-toolkit/compiler'
import {
  processStyleFrag,
  processScriptFrag,
  processImportFrag,
  parseImportList
} from './ux-fragment-utils'

module.exports = async function appLoader(source) {
  const codes = []

  const frags = parseFragmentsWithCache(source, this.resourcePath)

  // 处理引入的自定义组件
  const imports = await parseImportList(this, frags.import)
  if (imports.length) {
    codes.push(processImportFrag(this, imports, []))
  }

  const manifestRequest = stringifyRequest(this, './manifest.json')
  codes.push(`
var $app_style$ = ${processStyleFrag(this, frags.style, 'app')}
var $app_script$ = ${processScriptFrag(this, frags.script, 'app')}
$app_define$('@app-application/app', [], function ($app_require$, $app_exports$, $app_module$) {
  ${
    frags.script.length
      ? `
  $app_script$($app_module$, $app_exports$, $app_require$)
  if ($app_exports$.__esModule && $app_exports$.default) {
    $app_module$.exports = $app_exports$.default
  }
  $app_module$.exports.manifest = require(${manifestRequest})
  $app_module$.exports.style = { list: [ $app_style$ ] }
  `
      : ``
  }
})
$app_bootstrap$('@app-application/app', { packagerVersion: QUICKAPP_TOOLKIT_VERSION })
`)
  return codes.join('\n')
}
