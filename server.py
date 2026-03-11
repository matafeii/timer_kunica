"""
Таймер КУНИЦА - Python Server
Сервер для запуска веб-приложения таймера
"""

import http.server
import socketserver
import webbrowser
import os
from pathlib import Path

# Конфигурация сервера
PORT = 8000
DIRECTORY = Path(__file__).parent.absolute()

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIRECTORY), **kwargs)
    
    def end_headers(self):
        # Добавляем заголовки для корректной работы
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

def run_server():
    """Запуск сервера"""
    os.chdir(DIRECTORY)
    
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"""
╔══════════════════════════════════════════════════════════════╗
║                    ТАЙМЕР - КУНИЦА                          ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  🌐 Сервер запущен!                                         ║
║                                                              ║
║  📍 Адрес: http://localhost:{PORT}                          ║
║                                                              ║
║  📁 Файлы проекта:                                          ║
║     - index.html (главная страница)                          ║
║     - style.css (стили)                                      ║
║     - main.js (логика JavaScript)                            ║
║                                                              ║
║  Для остановки сервера нажмите Ctrl+C                        ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
        """)
        
        # Автоматическое открытие в браузере
        webbrowser.open(f"http://localhost:{PORT}")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\n🛑 Сервер остановлен.")
            httpd.server_close()

if __name__ == "__main__":
    run_server()

