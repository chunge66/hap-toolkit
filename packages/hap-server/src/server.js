/*
 * Copyright (c) 2021, the hapjs-platform Project Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import http from 'http'
import Koa from 'koa'
import opn from 'opn'
import portfinder from 'portfinder'
import { outputQRCodeOnTerminal, getIPv4IPAddress, colorconsole } from '@hap-toolkit/shared-utils'
import { clearProjectRecord } from '@hap-toolkit/shared-utils/lib/record-client'
import globalConfig from '@hap-toolkit/shared-utils/config'

let server = null
export async function launch(conf, moduler) {
  return new Promise(async resolve => {
    try {
      const app = new Koa()
      let serverPort = globalConfig.server.port
      // 如果设置的端口被占用，则自动递增获取可用端口
      serverPort = await portfinder.getPortPromise({
        port: serverPort
      })
      Object.assign(conf.defaults, { serverPort })
      // 暴露环境配置
      app.context.conf = conf

      // 清空调试设备记录
      const { clearRecords, openBrowser } = conf.options
      if (clearRecords) {
        const { clientRecordPath } = globalConfig
        clearProjectRecord(clientRecordPath)
      }

      for (let i = 0, len = moduler.moduleList.length; i < len; i++) {
        const moduleItem = moduler.moduleList[i]
        if (typeof moduleItem.hash.applyRouter === 'function') {
          app.use(moduleItem.hash.applyRouter(app).routes())
        }
      }

      server = http.Server(app.callback())
      // 绑定HTTP服务器
      app.server = server

      for (let i = 0, len = moduler.moduleList.length; i < len; i++) {
        const moduleItem = moduler.moduleList[i]
        if (typeof moduleItem.hash.beforeStart === 'function') {
          await moduleItem.hash.beforeStart(server, app)
        }
      }

      server.listen(serverPort, () => {
        const localUrl = `http://localhost:${serverPort}`
        const ip = getIPv4IPAddress()
        if (!ip) {
          colorconsole.warn(`### App Server ### 本机IP地址为空，无法通过WIFI调试`)
          resolve({
            launchServerError: null,
            server,
            address: localUrl,
            previewAddress: localUrl + '/previewAddress'
          })
          return
        }
        const lanUrl = `http://${ip}:${serverPort}`
        colorconsole.info(`### App Server ### 服务器地址: ${localUrl}, ${lanUrl}`)
        colorconsole.info(`### App Server ### 请确保手机与App Server处于相同网段`)
        // 输出二维码地址
        outputQRCodeOnTerminal(lanUrl)
        // 在浏览器中打开二维码页面
        if (openBrowser) {
          opn(lanUrl)
        }
        resolve({
          launchServerError: null,
          server,
          address: lanUrl,
          previewAddress: localUrl + '/preview'
        })
      })

      app.on('error', (err, context) => {
        colorconsole.error(`### App Server ### 服务器错误: ${err.message}`)
        const errMsg = `出错了!HTTP error code: ${err.status}, 出错信息: ${err.message}`
        if (context) {
          context.body = errMsg
        }
        resolve({ launchServerError: err, server })
      })

      server.on('error', err => {
        colorconsole.error(`### App Server ### 服务器错误: ${err.message}`)
        if (err.code === 'EADDRINUSE') {
          colorconsole.error(`### App Server ### 服务器错误:端口 ${serverPort} 被占用, 请检查`)
        }
        resolve({ launchServerError: err, server })
      })

      process.on('SIGINT', () => {
        colorconsole.info(`### App Server ### SIGINT信号`)
        colorconsole.info(`### App Server ### 退出server进程 pid: ${process.pid}`)
        process.exit()
      })

      process.on('uncaughtException', err => {
        colorconsole.error(`### App Server ### 未定义的异常, 出错信息: ${err.message}`)
        console.error(err)
      })

      process.on('unhandledRejection', (reason, p) => {
        colorconsole.error(`### App Server ### 未处理的 rejection, 出错信息: ${reason}`)
        p.catch(err => {
          console.error(err)
        })
      })
    } catch (err) {
      colorconsole.error(`### App Server ### 服务器启动失败: ${err.message}`)
      resolve({ launchServerError: err, server: null })
      throw err
    }
  })
}

export function stop() {
  return new Promise(resolve => {
    if (!server) {
      resolve({ stopServerError: 'no server' })
      return
    }
    try {
      server.close(data => {
        resolve({ stopServerError: data })
      })
    } catch (err) {
      colorconsole.error(`### App Server ### 服务器关闭失败: ${err.message}`)
      resolve({ stopServerError: err })
      throw err
    }
  })
}
