/*
 * Copyright (c) 2021, the hapjs-platform Project Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import expParser from './lib/expression'
import textParser from './lib/text'
import parseFilter from './lib/filter-parser'

// 去除字符串头部空格或指定字符
function trimhtml(str) {
  // 2个空格以上, 仅保留一个空格
  str = str.replace(/^\s\s+/, ' ')

  if (str.length <= 1) {
    return str
  }

  const startSpace = str.charAt(0) === ' ' ? 1 : 0
  const oldLength = str.length
  str = str.trim()

  // 尾部多余1个空格
  if (oldLength - str.length - startSpace >= 1) {
    str = str + ' '
  }

  return (startSpace ? ' ' : '') + str
}

/**
 * 表达式转换
 * @param expContent
 * @param toFunc
 * @returns {*}
 */
function transExpr(expContent, toFunc) {
  let ret
  const trimExpContent = expContent.trim()
  if (!textParser.isExpr(trimExpContent)) {
    ret = trimhtml(expContent)
  } else {
    ret = []
    const tokens = textParser.parseText(trimExpContent)
    const isSingle = tokens.length === 1
    tokens.forEach(function(token) {
      if (token.tag) {
        let res = expParser.parseExpression(parseFilter(token.value))
        if (!isSingle) {
          res = '(' + res + ')'
        }
        ret.push(res)
      } else {
        ret.push("'" + token.value + "'")
      }
    })
    // 确保多个插值表达式相邻时，是字符串拼接，而不是数值相加，例如：{{number1}}{{number2}}
    if (!isSingle) {
      ret.unshift("''")
    }
    ret = ret.join(' + ')
    if (toFunc !== false) {
      try {
        /* eslint-disable no-eval */
        ret = eval('(function () {return ' + ret + '})')
        /* eslint-enable no-eval */
      } catch (err) {
        err.isExpressionError = true
        err.expression = trimExpContent
        throw err
      }
    }
  }
  return ret
}

transExpr.isExpr = textParser.isExpr
transExpr.singleExpr = textParser.singleExpr
transExpr.removeExprffix = textParser.removeExprffix
transExpr.addExprffix = textParser.addExprffix

module.exports = transExpr
