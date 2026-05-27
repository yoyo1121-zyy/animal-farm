#!/usr/bin/env python3
"""
抓大鹅小游戏 - HTML5版本 启动脚本
运行此脚本启动本地服务器进行游戏测试
"""

import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 8000

def start_server():
    # 切换到脚本所在目录
    os.chdir(os.path.dirname(os.path.abspath(__file__)))

    # 创建请求处理器
    handler = http.server.SimpleHTTPRequestHandler

    # 启动服务器
    with socketserver.TCPServer(("", PORT), handler) as httpd:
        print(f"""
╔══════════════════════════════════════════════════════════╗
║          抓大鹅小游戏 - HTML5版本                         ║
╠══════════════════════════════════════════════════════════╣
║  服务器已启动！                                           ║
║                                                           ║
║  访问地址: http://localhost:{PORT}                        ║
║                                                           ║
║  按 Ctrl+C 停止服务器                                      ║
╚══════════════════════════════════════════════════════════╝
        """.format(PORT=PORT))

        # 自动打开浏览器
        try:
            webbrowser.open(f'http://localhost:{PORT}')
        except:
            pass

        # 运行服务器
        httpd.serve_forever()

if __name__ == '__main__':
    try:
        start_server()
    except KeyboardInterrupt:
        print('\n服务器已停止')
        sys.exit(0)
