#!/usr/bin/env python3
"""数学错题本 — 本地服务器"""
import os, socket
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

os.chdir(os.path.dirname(os.path.abspath(__file__)))

def get_ip():
    """获取本机局域网 IP"""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return '127.0.0.1'

class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

IP = get_ip()
PORT = 8888
server = ThreadingHTTPServer(('0.0.0.0', PORT), Handler)

print('=' * 60)
print('  📐 数学错题本 — 服务器已启动')
print('=' * 60)
print()
print('  👉 在电脑浏览器打开:')
print(f'     http://{IP}:{PORT}/launcher.html')
print()
print('  📱 手机扫码后打开上方地址即可')
print()
print('  按 Ctrl+C 停止服务器')
print('=' * 60)

try:
    server.serve_forever()
except KeyboardInterrupt:
    print('\n服务器已停止')
    server.shutdown()
