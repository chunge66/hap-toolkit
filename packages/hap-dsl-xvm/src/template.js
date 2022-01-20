/*
 * Copyright (c) 2021, the hapjs-platform Project Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

const path = require('path')

module.exports = {
  app: {
    demo: path.resolve(__dirname, '../templates/app/demo'),
    deviceJsonTemplate: path.resolve(__dirname, '../device-json-template')
  }
}
